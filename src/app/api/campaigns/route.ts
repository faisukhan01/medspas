import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const campaigns = await db.campaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.content) return bad("Campaign name and content are required");

  const campaign = await db.campaign.create({
    data: {
      tenantId,
      name: String(body.name).slice(0, 120),
      type: body.type || "PROMO",
      segment: body.segment || null,
      subject: body.subject || null,
      content: String(body.content),
      status: "DRAFT",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      aiGenerated: body.aiGenerated ?? false,
    },
  });

  await db.auditLog.create({
    data: {
      tenantId,
      action: "CREATE_CAMPAIGN",
      entity: "Campaign",
      entityId: campaign.id,
      details: `${campaign.name} (${campaign.type}${campaign.aiGenerated ? " · AI generated" : ""})`,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.id) return bad("Campaign id is required");

  const existing = await db.campaign.findFirst({ where: { id: String(body.id), tenantId } });
  if (!existing) return bad("Campaign not found", 404);

  const data: { status?: string; scheduledAt?: Date | null } = {};
  if (body.status) data.status = String(body.status);
  if ("scheduledAt" in body) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const campaign = await db.campaign.update({ where: { id: existing.id }, data });

  await db.auditLog.create({
    data: {
      tenantId,
      action: "UPDATE_CAMPAIGN",
      entity: "Campaign",
      entityId: campaign.id,
      details: `${campaign.name} → ${campaign.status}`,
    },
  });

  return NextResponse.json({ campaign });
});
