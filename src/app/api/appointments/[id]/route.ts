import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const user = await getCurrentUser(db);

  const existing = await db.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Appointment not found", 404);

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.roomId !== undefined) data.roomId = body.roomId;
  if (body.depositPaid !== undefined) data.depositPaid = body.depositPaid;
  if (body.startsAt) {
    const start = new Date(body.startsAt);
    const svc = await db.service.findUnique({ where: { id: existing.serviceId } });
    data.startsAt = start;
    data.endsAt = new Date(start.getTime() + (svc?.durationMin ?? 60) * 60000);
    if (body.providerId) data.providerId = body.providerId;
  }
  if (body.cancellationReason) data.cancellationReason = body.cancellationReason;

  const appt = await db.appointment.update({
    where: { id },
    data,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
      provider: { select: { id: true, name: true, avatarColor: true } },
      service: { select: { id: true, name: true, emoji: true } },
      branch: { select: { id: true, name: true, code: true, currency: true } },
    },
  });

  if (body.status && body.status !== existing.status) {
    await db.notification.create({ data: { tenantId, title: "Appointment updated",
      body: `${appt.patient.firstName} ${appt.patient.lastName} · ${appt.service.name} → ${body.status.replace("_", " ")}`,
      type: "APPOINTMENT" } });
    await db.auditLog.create({ data: { tenantId, userId: user?.id, action: "UPDATE_APPOINTMENT",
      entity: "Appointment", entityId: id, details: `status ${existing.status} → ${body.status}` } });
  }
  if (body.startsAt) {
    await db.auditLog.create({ data: { tenantId, userId: user?.id, action: "RESCHEDULE_APPOINTMENT",
      entity: "Appointment", entityId: id, details: `moved to ${body.startsAt}` } });
  }

  return NextResponse.json({ appointment: appt });
});

export const DELETE = route(async (_req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;
  const existing = await db.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Appointment not found", 404);

  const appt = await db.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancellationReason: "Cancelled by staff" },
  });
  await db.auditLog.create({ data: { tenantId, action: "CANCEL_APPOINTMENT", entity: "Appointment",
    entityId: id, details: appt.cancellationReason ?? "" } });
  return NextResponse.json({ appointment: appt });
});
