import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const branchId = sp.get("branchId");

  const leads = await db.lead.findMany({
    where: {
      tenantId,
      ...(status && status !== "all" ? { status } : {}),
      ...(branchId && branchId !== "all" ? { branchId } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      branch: { select: { id: true, name: true, code: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });

  const byStatus: Record<string, number> = {};
  for (const l of leads) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  const pipelineValue = leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).reduce((s, l) => s + l.estimatedValue, 0);
  const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;

  return NextResponse.json({ leads, byStatus, pipelineValue, avgScore });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name) return bad("Lead name is required");

  const lead = await db.lead.create({
    data: {
      tenantId,
      branchId: body.branchId || null,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      source: body.source || "WEBSITE",
      interest: body.interest || null,
      estimatedValue: Number(body.estimatedValue) || 0,
      assignedToId: body.assignedToId || null,
      notes: body.notes || null,
      status: "NEW",
      score: Math.min(Math.max(Number(body.score) || 50, 0), 100),
    },
    include: { assignedTo: { select: { id: true, name: true, avatarColor: true } } },
  });

  await db.leadActivity.create({ data: { leadId: lead.id, type: "NOTE",
    content: `Lead captured via ${lead.source}.`, createdBy: "SYSTEM" } });
  await db.notification.create({ data: { tenantId, title: "New lead captured",
    body: `${lead.name} — ${lead.interest ?? "general enquiry"} (score ${lead.score})`, type: "LEAD" } });

  return NextResponse.json({ lead }, { status: 201 });
});
