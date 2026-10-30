import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Marketing hub: campaigns + reviews + referrals + recent comms + segment sizes. */
export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const d30 = new Date(Date.now() - 30 * 86400000);

  const [campaigns, reviews, referrals, messages, patients] = await Promise.all([
    db.campaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.review.findMany({
      where: { tenantId },
      include: { branch: { select: { name: true, code: true } }, patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.referral.findMany({
      where: { tenantId },
      include: { referrer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.messageLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.patient.findMany({
      where: { tenantId },
      select: { id: true, tags: true, status: true, lastVisitAt: true, marketingOptIn: true, country: true },
    }),
  ]);

  // audience segments (live sizes for the campaign builder)
  const segments = {
    all: patients.filter((p) => p.marketingOptIn).length,
    vip: patients.filter((p) => (p.tags ?? "").includes("VIP")).length,
    members: patients.filter((p) => (p.tags ?? "").includes("Member")).length,
    inactive90: patients.filter((p) => p.lastVisitAt && p.lastVisitAt < d30 && p.lastVisitAt < new Date(Date.now() - 90 * 86400000)).length,
    churnRisk: patients.filter((p) => p.status === "CHURN_RISK").length,
    us: patients.filter((p) => p.country === "US").length,
    uk: patients.filter((p) => p.country === "UK").length,
  };

  const reviewStats = {
    avg: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0,
    total: reviews.length,
    needResponse: reviews.filter((r) => r.status === "NEW" || r.status === "FLAGGED").length,
    byPlatform: ["GOOGLE", "INTERNAL", "TRUSTPILOT", "YELP"].map((p) => ({
      platform: p, count: reviews.filter((r) => r.platform === p).length,
    })),
  };

  return NextResponse.json({ campaigns, reviews, referrals, messages, segments, reviewStats });
});
