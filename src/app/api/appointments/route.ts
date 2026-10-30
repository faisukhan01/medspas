import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId, parseDate } from "@/lib/api";

export const dynamic = "force-dynamic";

const INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, avatarColor: true, phone: true, email: true, tags: true } },
  provider: { select: { id: true, name: true, avatarColor: true, title: true, specialties: true } },
  service: { select: { id: true, name: true, emoji: true, category: true, durationMin: true, price: true } },
  branch: { select: { id: true, name: true, code: true, currency: true, timezone: true } },
};

export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const providerId = sp.get("providerId");
  const patientId = sp.get("patientId");
  const status = sp.get("status");
  const q = sp.get("q");
  const from = parseDate(sp.get("from"), new Date(Date.now() - 7 * 86400000));
  const to = parseDate(sp.get("to"), new Date(Date.now() + 21 * 86400000));
  const take = Math.min(parseInt(sp.get("take") ?? "300"), 500);

  const where: Record<string, unknown> = {
    tenantId,
    startsAt: { gte: from, lte: to },
    ...(branchId && branchId !== "all" ? { branchId } : {}),
    ...(providerId && providerId !== "all" ? { providerId } : {}),
    ...(patientId ? { patientId } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where,
      include: INCLUDE,
      orderBy: { startsAt: "asc" },
      take,
      ...(q ? {} : {}),
    }),
    db.appointment.count({ where }),
  ]);

  const filtered = q
    ? appointments.filter((a) =>
        `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
        a.service.name.toLowerCase().includes(q.toLowerCase()))
    : appointments;

  return NextResponse.json({ appointments: filtered, total });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON body");

  const { branchId, patientId, providerId, serviceId, startsAt, notes, source } = body;
  if (!branchId || !patientId || !providerId || !serviceId || !startsAt)
    return bad("branchId, patientId, providerId, serviceId and startsAt are required");

  const service = await db.service.findUnique({ where: { id: serviceId } });
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!service || !branch) return bad("Service or branch not found", 404);

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + (service.durationMin ?? 60) * 60000);
  const price = branch.currency === "GBP" ? Math.round(service.price * 0.79) : service.price;

  // Conflict prevention: overlapping appointment for same provider
  const conflicts = await db.appointment.findMany({
    where: {
      providerId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      startsAt: { lt: end }, endsAt: { gt: start },
    },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (conflicts.length) {
    return bad("Provider is already booked in that time window — pick another slot", 409);
  }

  const appt = await db.appointment.create({
    data: {
      tenantId, branchId, patientId, providerId, serviceId,
      roomId: body.roomId ?? null,
      startsAt: start, endsAt: end,
      status: body.status ?? "CONFIRMED",
      source: source ?? "STAFF_APP",
      price, depositAmount: branch.currency === "GBP" ? Math.round(service.depositAmount * 0.79) : service.depositAmount,
      depositPaid: !!body.depositPaid,
      notes: notes ?? null,
    },
    include: INCLUDE,
  });

  await db.notification.create({ data: { tenantId, title: "New appointment booked",
    body: `${appt.patient.firstName} ${appt.patient.lastName} → ${service.name} with ${appt.provider.name} at ${appt.branch.name}`,
    type: "APPOINTMENT" } });
  await db.auditLog.create({ data: { tenantId, action: "CREATE_APPOINTMENT", entity: "Appointment",
    entityId: appt.id, details: `${service.name} · ${start.toISOString()}` } });

  return NextResponse.json({ appointment: appt }, { status: 201 });
});
