import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Staff directory + 30-day performance (appointments, revenue, utilization). */
export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);

  const staff = await db.user.findMany({
    where: { tenantId },
    include: { branch: { select: { id: true, name: true, code: true } }, schedules: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const d30 = new Date(Date.now() - 30 * 86400000);
  const appts = await db.appointment.findMany({
    where: { tenantId, startsAt: { gte: d30 } },
    select: { providerId: true, status: true, price: true },
  });

  const perf = staff.map((s) => {
    const mine = appts.filter((a) => a.providerId === s.id);
    const completed = mine.filter((a) => a.status === "COMPLETED");
    return {
      ...s,
      passwordHash: undefined,
      perf: {
        appointments30d: mine.length,
        completed30d: completed.length,
        revenue30d: Math.round(completed.reduce((sum, a) => sum + a.price, 0)),
        commission30d: Math.round(completed.reduce((sum, a) => sum + a.price, 0) * (s.commissionRate / 100)),
        noShows: mine.filter((a) => a.status === "NO_SHOW").length,
      },
    };
  });

  return NextResponse.json({ staff: perf });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) return bad("name and email are required");

  const staff = await db.user.create({
    data: {
      tenantId, name: body.name, email: String(body.email).toLowerCase(),
      branchId: body.branchId || null, phone: body.phone || null,
      role: body.role || "PROVIDER", title: body.title || null,
      specialties: body.specialties || null, qualifications: body.qualifications || null,
      commissionRate: Number(body.commissionRate) || 0,
      passwordHash: "imported", isActive: true,
      avatarColor: ["#047857", "#0d9488", "#b45309", "#be185d", "#7c3aed"][Math.floor(Math.random() * 5)],
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "CREATE_STAFF", entity: "User", entityId: staff.id, details: `${staff.name} (${staff.role})` } });
  return NextResponse.json({ staff: { ...staff, passwordHash: undefined } }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  if (!body?.id) return bad("id is required");

  const allowed = ["name", "role", "title", "specialties", "qualifications", "commissionRate", "isActive", "branchId", "phone", "bio"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  const staff = await db.user.update({ where: { id: body.id }, data });
  await db.auditLog.create({ data: { tenantId, action: "UPDATE_STAFF", entity: "User", entityId: body.id, details: Object.keys(data).join(", ") } });
  return NextResponse.json({ staff: { ...staff, passwordHash: undefined } });
});
