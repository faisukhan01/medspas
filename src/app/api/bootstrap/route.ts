import { NextResponse } from "next/server";
import { getDb, getDbMode } from "@/lib/db";
import { route } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** One-shot reference payload the SPA needs on boot (minimizes round trips). */
export const GET = route(async () => {
  const db = await getDb();
  const tenant = await db.tenant.findFirst();
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 500 });

  const [user, branches, staff, services, categories, plans, consentTemplates, stats] =
    await Promise.all([
      getCurrentUser(db),
      db.branch.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      db.user.findMany({ where: { isActive: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
      db.service.findMany({ where: { isActive: true }, include: { categoryRef: true }, orderBy: { name: "asc" } }),
      db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } }),
      db.membershipPlan.findMany({ where: { isActive: true } }),
      db.consentFormTemplate.findMany({ where: { isActive: true } }),
      Promise.all([
        db.patient.count(),
        db.appointment.count(),
        db.lead.count(),
        db.product.count(),
      ]),
    ]);

  return NextResponse.json({
    dbMode: getDbMode(),
    tenant: { ...tenant, trialEndsAt: undefined },
    user: user ? { ...user, passwordHash: undefined } : null,
    branches,
    staff: staff.map((s) => ({ ...s, passwordHash: undefined })),
    services,
    categories,
    plans,
    consentTemplates: consentTemplates.map((c) => ({ id: c.id, title: c.title, version: c.version })),
    counts: { patients: stats[0], appointments: stats[1], leads: stats[2], products: stats[3] },
  });
});
