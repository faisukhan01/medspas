import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * PATIENT APP SELF SIGN-UP ───────────────────────────────────────────────────
 * Patients create their own profile straight from the mobile app. Demo-grade:
 * no password — the email is the identity. Production should add OTP /
 * magic-link verification before exposing real clinical records.
 *
 * POST { firstName, lastName, email, phone?, branchId? }
 *   → 201 { patient }   (same shape as POST /api/auth/patient)
 *   → 409 when the email already belongs to a patient
 */

const AVATAR_COLORS = ["#0d9488", "#b45309", "#7c3aed", "#be185d", "#1d4ed8", "#047857", "#a16207", "#9f1239"];

const PATIENT_FIELDS = {
  id: true, firstName: true, lastName: true, email: true,
  avatarColor: true, branchId: true, tags: true,
} as const;

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim() || null;
  const branchId = String(body.branchId ?? "").trim() || null;

  if (!firstName || !lastName) return bad("First and last name are required");
  if (!email || !email.includes("@") || email.length < 5) {
    return bad("Enter a valid email address");
  }

  // Case-insensitive uniqueness on both SQLite and Turso.
  const candidates = await db.patient.findMany({
    where: { tenantId, email: { not: null } },
    select: PATIENT_FIELDS,
  });
  const existing = candidates.find((p) => p.email?.trim().toLowerCase() === email);
  if (existing) {
    return bad("That email already has an Auralis profile — sign in instead", 409);
  }

  // Validate branch when provided (ignore unknown ids gracefully).
  let branch: { id: string } | null = null;
  if (branchId) {
    branch = await db.branch.findFirst({ where: { id: branchId, tenantId }, select: { id: true } });
  }

  const patient = await db.patient.create({
    data: {
      tenantId,
      firstName,
      lastName,
      email,
      phone,
      branchId: branch?.id ?? null,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
      source: "MOBILE_APP",
      tags: "App",
      status: "ACTIVE",
      marketingOptIn: true,
      country: "US",
    },
    select: PATIENT_FIELDS,
  });

  await db.auditLog.create({
    data: { tenantId, action: "PATIENT_APP_SIGNUP", entity: "Patient",
      entityId: patient.id, details: `Self sign-up from mobile app (${email})`, ipAddress: "demo" },
  });

  return NextResponse.json({ patient }, { status: 201 });
});
