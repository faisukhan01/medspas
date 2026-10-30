import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Deep analytics: monthly revenue, retention, no-show trend, marketing ROI, service mix. */
export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const months = Math.min(parseInt(req.nextUrl.searchParams.get("months") ?? "6"), 12);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [appts, payments, campaigns, patients, leads] = await Promise.all([
    db.appointment.findMany({
      where: { tenantId, startsAt: { gte: start } },
      select: { startsAt: true, status: true, price: true, branchId: true, serviceId: true, service: { select: { name: true, category: true, emoji: true } }, branch: { select: { name: true, code: true, currency: true } }, patientId: true },
    }),
    db.payment.findMany({
      where: { tenantId, createdAt: { gte: start }, status: { in: ["SUCCEEDED", "REFUNDED"] } },
      select: { amount: true, type: true, createdAt: true, method: true },
    }),
    db.campaign.findMany({ where: { tenantId }, select: { name: true, type: true, sentCount: true, revenue: true, convertedCount: true, status: true } }),
    db.patient.findMany({ where: { tenantId }, select: { id: true, visitCount: true, lifetimeValue: true, createdAt: true, status: true } }),
    db.lead.findMany({ where: { tenantId }, select: { status: true, createdAt: true, estimatedValue: true } }),
  ]);

  // ── Monthly series ────────────────────────────────────────────────────────
  const monthly: { month: string; label: string; revenue: number; appointments: number; noShows: number; newPatients: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthAppts = appts.filter((a) => a.startsAt.toISOString().slice(0, 7) === key);
    monthly.push({
      month: key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round(payments.filter((p) => p.type !== "REFUND" && p.createdAt.toISOString().slice(0, 7) === key).reduce((s, p) => s + p.amount, 0)),
      appointments: monthAppts.filter((a) => a.status !== "CANCELLED").length,
      noShows: monthAppts.filter((a) => a.status === "NO_SHOW").length,
      newPatients: patients.filter((p) => p.createdAt.toISOString().slice(0, 7) === key).length,
    });
  }

  // ── Branch comparison ─────────────────────────────────────────────────────
  const branchMap = new Map<string, { name: string; code: string; currency: string; revenue: number; appts: number; noShows: number }>();
  for (const a of appts) {
    const cur = branchMap.get(a.branchId) ?? { name: a.branch.name, code: a.branch.code, currency: a.branch.currency, revenue: 0, appts: 0, noShows: 0 };
    cur.appts++;
    if (a.status === "COMPLETED") cur.revenue += a.price;
    if (a.status === "NO_SHOW") cur.noShows++;
    branchMap.set(a.branchId, cur);
  }

  // ── Service mix ───────────────────────────────────────────────────────────
  const catMap = new Map<string, { category: string; revenue: number; count: number }>();
  for (const a of appts.filter((x) => x.status === "COMPLETED")) {
    const key = a.service.category ?? "Other";
    const cur = catMap.get(key) ?? { category: key, revenue: 0, count: 0 };
    cur.revenue += a.price; cur.count++;
    catMap.set(key, cur);
  }

  // ── Retention & LTV ───────────────────────────────────────────────────────
  const returning = patients.filter((p) => p.visitCount >= 2).length;
  const retentionRate = patients.length ? Math.round((returning / patients.length) * 100) : 0;
  const avgLtv = patients.length ? Math.round(patients.reduce((s, p) => s + p.lifetimeValue, 0) / patients.length) : 0;

  // ── Marketing ROI (synthetic cost model: SMS ~$0.05, email ~$0.012 /msg) ──
  const marketing = campaigns.filter((c) => c.status !== "DRAFT").map((c) => {
    const cost = Math.round(c.sentCount * (c.type === "SMS" || c.type === "REBOOK" ? 0.05 : 0.012));
    return { name: c.name, type: c.type, sent: c.sentCount, converted: c.convertedCount, revenue: Math.round(c.revenue), cost, roi: cost ? Math.round(((c.revenue - cost) / cost) * 100) : 0 };
  });
  const mktRevenue = marketing.reduce((s, m) => s + m.revenue, 0);
  const mktCost = marketing.reduce((s, m) => s + m.cost, 0);

  // ── Payment method mix ────────────────────────────────────────────────────
  const methodMap = new Map<string, number>();
  for (const p of payments.filter((x) => x.type !== "REFUND")) {
    methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + p.amount);
  }

  return NextResponse.json({
    monthly,
    branches: [...branchMap.values()].sort((a, b) => b.revenue - a.revenue),
    serviceMix: [...catMap.values()].sort((a, b) => b.revenue - a.revenue),
    retention: {
      rate: retentionRate,
      returning,
      total: patients.length,
      avgLtv,
      churnRisk: patients.filter((p) => p.status === "CHURN_RISK").length,
    },
    marketing: { campaigns: marketing, totalRevenue: mktRevenue, totalCost: mktCost, roi: mktCost ? Math.round(((mktRevenue - mktCost) / mktCost) * 100) : 0 },
    noShowTrend: monthly.map((m) => ({ month: m.label, monthKey: m.month, rate: m.appointments ? Math.round((m.noShows / m.appointments) * 100) : 0 })),
    paymentMethods: [...methodMap.entries()].map(([method, amount]) => ({ method, amount: Math.round(amount) })),
    leadVelocity: leads.filter((l) => l.createdAt >= start).length,
    pipelineValue: leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).reduce((s, l) => s + l.estimatedValue, 0),
  });
});
