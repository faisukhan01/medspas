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
  const user = await getCurrentUser(db);
  const body = await req.json().catch(() => ({}));

  const existing = await db.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Lead not found", 404);

  const data: Record<string, unknown> = {};
  for (const k of ["status", "score", "interest", "estimatedValue", "assignedToId", "lostReason", "notes", "source", "email", "phone", "name"] as const)
    if (k in body) data[k] = body[k];
  if (body.status) data.lastContactAt = new Date();
  if (body.nextFollowUpAt) data.nextFollowUpAt = new Date(body.nextFollowUpAt);

  const lead = await db.lead.update({
    where: { id },
    data,
    include: { assignedTo: { select: { id: true, name: true, avatarColor: true } }, activities: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  if (body.status && body.status !== existing.status) {
    await db.leadActivity.create({ data: { leadId: id, type: "STATUS_CHANGE",
      content: `${existing.status} → ${body.status}`, createdBy: user?.id ?? "SYSTEM" } });
    if (body.status === "CONVERTED") {
      await db.notification.create({ data: { tenantId, title: "🎉 Lead converted",
        body: `${lead.name} is now a patient (${lead.interest ?? "treatment"}).`, type: "LEAD" } });
    }
  }
  if (body.activity) {
    await db.leadActivity.create({ data: { leadId: id, type: body.activity.type ?? "NOTE",
      content: String(body.activity.content ?? ""), createdBy: user?.id ?? "SYSTEM" } });
    if (["CALL", "SMS", "EMAIL"].includes(body.activity.type)) {
      await db.messageLog.create({ data: { tenantId, channel: body.activity.type, direction: "OUTBOUND",
        leadId: id, body: String(body.activity.content ?? ""), status: "SENT" } });
    }
  }

  return NextResponse.json({ lead });
});

export const DELETE = route(async (_req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;
  const existing = await db.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Lead not found", 404);
  await db.lead.update({ where: { id }, data: { status: "LOST", lostReason: existing.lostReason ?? "Removed manually" } });
  return NextResponse.json({ ok: true });
});
