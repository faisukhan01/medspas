import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Aggregated KPIs powering the main dashboard (branch-filterable). */
export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const branchId = req.nextUrl.searchParams.get("branchId") ?? "all";

  const branchWhere = branchId !== "all" ? { branchId } : {};
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

  const [appts, payments, leads, newPatients, totalPatients] = await Promise.all([
    db.appointment.findMany({
      where: { tenantId, ...branchWhere, startsAt: { gte: d30, lte: new Date(now.getTime() + 14 * 86400000) } },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, avatarColor: true, tags: true } },
        provider: { select: { id: true, name: true, avatarColor: true, title: true } },
        service: { select: { id: true, name: true, emoji: true, category: true } },
        branch: { select: { id: true, name: true, code: true, currency: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.payment.findMany({
      where: { tenantId, ...branchWhere, createdAt: { gte: d30 }, status: { in: ["SUCCEEDED", "REFUNDED"] } },
      select: { amount: true, type: true, createdAt: true, method: true },
    }),
    db.lead.findMany({ where: { tenantId, ...branchWhere }, select: { status: true, score: true, source: true, estimatedValue: true } }),
    db.patient.count({ where: { tenantId, ...branchWhere, createdAt: { gte: d30 } } }),
    db.patient.count({ where: { tenantId, ...branchWhere } }),
  ]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const todaysAppts = appts.filter((a) => a.startsAt >= startOfToday && a.startsAt <= endOfToday && !["CANCELLED", "NO_SHOW"].includes(a.status));
  const revenue30 = payments.filter((p) => p.type !== "REFUND").reduce((s, p) => s + p.amount, 0);
  const refunds30 = payments.filter((p) => p.type === "REFUND").reduce((s, p) => s + p.amount, 0);
  const revenue7 = payments.filter((p) => p.type !== "REFUND" && p.createdAt >= d7).reduce((s, p) => s + p.amount, 0);

  const past30 = appts.filter((a) => a.startsAt < now && a.startsAt >= d30);
  const noShows = past30.filter((a) => a.status === "NO_SHOW").length;
  const completed30 = past30.filter((a) => a.status === "COMPLETED").length;
  const converted = leads.filter((l) => l.status === "CONVERTED").length;
  const activeLeads = leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).length;

  // ── Revenue series (last 30 days) ─────────────────────────────────────────
  const series: { date: string; revenue: number; bookings: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const key = day.toISOString().slice(0, 10);
    const revenue = payments.filter((p) => p.type !== "REFUND" && p.createdAt.toISOString().slice(0, 10) === key).reduce((s, p) => s + p.amount, 0);
    const bookings = appts.filter((a) => a.startsAt.toISOString().slice(0, 10) === key && a.status !== "CANCELLED").length;
    series.push({ date: key, revenue: Math.round(revenue), bookings });
  }

  // ── Upcoming (next 8 from now) ────────────────────────────────────────────
  const upcoming = appts
    .filter((a) => a.startsAt >= now && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(a.status))
    .slice(0, 8)
    .map((a) => ({
      id: a.id, startsAt: a.startsAt, status: a.status, price: a.price,
      patient: a.patient, provider: a.provider, service: a.service, branch: a.branch, source: a.source,
    }));

  // ── Top services (30d completed revenue) ──────────────────────────────────
  const svcMap = new Map<string, { name: string; emoji: string; category: string | null; revenue: number; count: number }>();
  for (const a of past30.filter((x) => x.status === "COMPLETED")) {
    const cur = svcMap.get(a.serviceId) ?? { name: a.service.name, emoji: a.service.emoji, category: a.service.category, revenue: 0, count: 0 };
    cur.revenue += a.price; cur.count += 1;
    svcMap.set(a.serviceId, cur);
  }
  const topServices = [...svcMap.values()].sort((x, y) => y.revenue - x.revenue).slice(0, 6);

  // ── Staff performance (30d) ───────────────────────────────────────────────
  const staffMap = new Map<string, { id: string; name: string; color: string; title: string | null; appts: number; revenue: number; completed: number }>();
  for (const a of past30) {
    const cur = staffMap.get(a.providerId) ?? { id: a.providerId, name: a.provider.name, color: a.provider.avatarColor, title: a.provider.title, appts: 0, revenue: 0, completed: 0 };
    cur.appts += 1;
    if (a.status === "COMPLETED") { cur.revenue += a.price; cur.completed += 1; }
    staffMap.set(a.providerId, cur);
  }
  const staffPerf = [...staffMap.values()].sort((x, y) => y.revenue - x.revenue);

  // ── Branch performance (30d) ──────────────────────────────────────────────
  const branchMap = new Map<string, { id: string; name: string; code: string; currency: string; revenue: number; appts: number }>();
  for (const a of past30) {
    const cur = branchMap.get(a.branchId) ?? { id: a.branchId, name: a.branch.name, code: a.branch.code, currency: a.branch.currency, revenue: 0, appts: 0 };
    cur.appts += 1;
    if (a.status === "COMPLETED") cur.revenue += a.price;
    branchMap.set(a.branchId, cur);
  }
  const branchPerf = [...branchMap.values()].sort((x, y) => y.revenue - x.revenue);

  // ── Lead funnel ───────────────────────────────────────────────────────────
  const funnel = ["NEW", "CONTACTED", "QUALIFIED", "CONSULT_BOOKED", "CONVERTED"].map((s) => ({
    status: s, count: leads.filter((l) => l.status === s).length,
  }));

  const returning = await db.patient.count({
    where: { tenantId, ...branchWhere, visitCount: { gte: 2 } },
  });

  return NextResponse.json({
    kpis: {
      todayAppointments: todaysAppts.length,
      revenue30: Math.round(revenue30),
      revenue7: Math.round(revenue7),
      refunds30: Math.round(refunds30),
      newPatients30: newPatients,
      totalPatients,
      returningPatients: returning,
      returningRate: totalPatients ? Math.round((returning / totalPatients) * 100) : 0,
      activeLeads,
      conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
      noShowRate: past30.length ? Math.round((noShows / past30.length) * 100) : 0,
      completed30,
    },
    revenueSeries: series,
    upcoming,
    topServices,
    staffPerf,
    branchPerf,
    leadFunnel: funnel,
    leadSources: ["WEBSITE", "INSTAGRAM", "GOOGLE_ADS", "REFERRAL", "AI_AGENT", "WALK_IN"].map((s) => ({
      source: s, count: leads.filter((l) => l.source === s).length,
    })),
  });
});
