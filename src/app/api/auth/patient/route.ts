import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * PATIENT APP AUTH (demo-grade) ──────────────────────────────────────────────
 * ⚠️  This is intentionally lightweight for the demo: identifying a patient by
 *     email alone (no password / OTP). Production MUST replace this with
 *     OTP codes or magic-link email verification before exposing real records.
 *     The audit trail below is already shaped so a future OTP flow can reuse it.
 *
 *  POST { email }  → { patient }   404 if unknown email
 *  GET  ?id={id}   → lightweight profile (patient + upcoming count + memberships
 *                    w/ plan + packages) — mirrors subsets of /api/patients/[id]
 */

const PATIENT_FIELDS = {
  id: true, firstName: true, lastName: true, email: true,
  avatarColor: true, branchId: true, tags: true,
} as const;

/** Case-insensitive email lookup that works on both SQLite and libSQL/Turso
 *  (Prisma's `mode: "insensitive"` is unsupported on the sqlite provider). */
async function findPatientByEmail(db: Awaited<ReturnType<typeof getDb>>, tenantId: string, email: string) {
  const candidates = await db.patient.findMany({
    where: { tenantId, email: { not: null } },
    select: PATIENT_FIELDS,
  });
  return candidates.find((p) => p.email?.trim().toLowerCase() === email) ?? null;
}

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email) return bad("Email is required");

  const patient = await findPatientByEmail(db, tenantId, email);
  if (!patient) {
    return bad("No patient found with that email — try ava.thompson@example.com", 404);
  }

  await db.auditLog.create({
    data: { tenantId, action: "PATIENT_APP_LOGIN", entity: "Patient",
      entityId: patient.id, details: "Patient app demo sign-in", ipAddress: "demo" },
  });

  return NextResponse.json({ patient });
});

export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id query param is required");

  const patient = await db.patient.findFirst({
    where: { id, tenantId },
    select: { ...PATIENT_FIELDS, lifetimeValue: true, visitCount: true,
      branch: { select: { id: true, name: true, code: true, currency: true, city: true } } },
  });
  if (!patient) return bad("Patient not found", 404);

  const now = new Date();
  const [upcomingAppointments, memberships, packages] = await Promise.all([
    db.appointment.count({
      where: { patientId: id, tenantId, startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] } },
    }),
    db.membership.findMany({
      where: { patientId: id },
      include: { plan: { select: { id: true, name: true, price: true, currency: true, billingCycle: true, benefits: true } } },
      orderBy: { startedAt: "desc" },
    }),
    db.patientPackage.findMany({
      where: { patientId: id },
      orderBy: { purchasedAt: "desc" },
      select: { id: true, name: true, sessionsTotal: true, sessionsUsed: true, expiresAt: true, price: true },
    }),
  ]);

  return NextResponse.json({
    patient: {
      id: patient.id, firstName: patient.firstName, lastName: patient.lastName,
      email: patient.email, avatarColor: patient.avatarColor,
      branchId: patient.branchId, tags: patient.tags, branch: patient.branch,
    },
    stats: { upcomingAppointments, lifetimeValue: patient.lifetimeValue, visitCount: patient.visitCount },
    memberships: memberships.map((m) => ({
      id: m.id, status: m.status, renewsAt: m.renewsAt, pricePaid: m.pricePaid,
      plan: m.plan,
    })),
    packages,
  });
});
