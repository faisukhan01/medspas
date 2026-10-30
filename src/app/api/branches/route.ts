import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Branches with 30-day performance summary (revenue, appointments, utilization). */
export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const d30 = new Date(Date.now() - 30 * 86400000);

  const [branches, rooms, appts, patientCounts] = await Promise.all([
    db.branch.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    db.room.findMany({ include: { branch: { select: { name: true } } } }),
    db.appointment.findMany({
      where: { tenantId, startsAt: { gte: d30 } },
      select: { branchId: true, status: true, price: true },
    }),
    db.patient.groupBy({ by: ["branchId"], _count: { id: true }, where: { tenantId } }),
  ]);

  const enriched = branches.map((b) => {
    const mine = appts.filter((a) => a.branchId === b.id);
    const completed = mine.filter((a) => a.status === "COMPLETED");
    return {
      ...b,
      rooms: rooms.filter((r) => r.branchId === b.id).map((r) => ({ id: r.id, name: r.name, type: r.type })),
      perf: {
        revenue30d: Math.round(completed.reduce((s, a) => s + a.price, 0)),
        appointments30d: mine.length,
        noShowRate: mine.length ? Math.round((mine.filter((a) => a.status === "NO_SHOW").length / mine.length) * 100) : 0,
        patients: patientCounts.find((p) => p.branchId === b.id)?._count.id ?? 0,
      },
    };
  });

  return NextResponse.json({ branches: enriched });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.code) return bad("name and code are required");

  const branch = await db.branch.create({
    data: {
      tenantId, name: body.name, code: body.code,
      country: body.country || "US", currency: body.currency || "USD",
      timezone: body.timezone || "America/New_York",
      address: body.address || null, city: body.city || null, state: body.state || null,
      postalCode: body.postalCode || null, phone: body.phone || null, email: body.email || null,
      taxRate: Number(body.taxRate) || 0,
      openTime: body.openTime || "09:00", closeTime: body.closeTime || "19:00",
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "CREATE_BRANCH", entity: "Branch", entityId: branch.id, details: branch.name } });
  return NextResponse.json({ branch }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  if (!body?.id) return bad("id is required");
  const allowed = ["name", "address", "city", "phone", "email", "openTime", "closeTime", "isActive", "taxRate"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const branch = await db.branch.update({ where: { id: body.id }, data });
  return NextResponse.json({ branch });
});
