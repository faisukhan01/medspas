import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const [services, categories] = await Promise.all([
    db.service.findMany({
      where: { tenantId },
      include: { categoryRef: true, _count: { select: { appointments: true } } },
      orderBy: { name: "asc" },
    }),
    db.serviceCategory.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } }),
  ]);
  return NextResponse.json({ services, categories });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name) return bad("name is required");

  const service = await db.service.create({
    data: {
      tenantId, name: body.name, description: body.description || null,
      categoryId: body.categoryId || null, category: body.category || null,
      durationMin: Number(body.durationMin) || 60,
      price: Number(body.price) || 0,
      depositAmount: Number(body.depositAmount) || 0,
      requiresConsultation: !!body.requiresConsultation,
      emoji: body.emoji || "💠",
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "CREATE_SERVICE", entity: "Service", entityId: service.id, details: service.name } });
  return NextResponse.json({ service }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  if (!body?.id) return bad("id is required");
  const allowed = ["name", "description", "price", "durationMin", "depositAmount", "isActive", "requiresConsultation", "categoryId", "emoji"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const service = await db.service.update({ where: { id: body.id }, data });
  return NextResponse.json({ service });
});
