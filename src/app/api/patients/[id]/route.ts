import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Full 360° patient profile — the EMR payload (appointments, EMR, consents, billing). */
export const GET = route(async (_req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;

  const patient = await db.patient.findFirst({
    where: { id, tenantId },
    include: { branch: { select: { id: true, name: true, code: true, currency: true } } },
  });
  if (!patient) return bad("Patient not found", 404);

  const [appointments, treatments, notes, consents, invoices, memberships, packages, reviews] =
    await Promise.all([
      db.appointment.findMany({
        where: { patientId: id },
        include: {
          provider: { select: { id: true, name: true, avatarColor: true } },
          service: { select: { id: true, name: true, emoji: true, category: true } },
          branch: { select: { id: true, name: true, code: true, currency: true } },
        },
        orderBy: { startsAt: "desc" },
        take: 15,
      }),
      db.treatmentRecord.findMany({
        where: { patientId: id },
        include: { provider: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { performedAt: "desc" },
        take: 12,
      }),
      db.clinicalNote.findMany({
        where: { patientId: id },
        include: { author: { select: { id: true, name: true, avatarColor: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      db.signedConsent.findMany({
        where: { patientId: id },
        include: { form: { select: { id: true, title: true, version: true } } },
        orderBy: { signedAt: "desc" },
      }),
      db.invoice.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.membership.findMany({ where: { patientId: id }, include: { plan: true } }),
      db.patientPackage.findMany({ where: { patientId: id }, orderBy: { purchasedAt: "desc" } }),
      db.review.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const upcoming = appointments.filter((a) => new Date(a.startsAt) >= new Date() && !["CANCELLED", "NO_SHOW"].includes(a.status));
  const lastVisit = appointments.find((a) => a.status === "COMPLETED");

  return NextResponse.json({
    patient,
    appointments, upcoming, lastVisit,
    treatments, notes, consents, invoices, memberships, packages, reviews,
    stats: {
      totalAppointments: await db.appointment.count({ where: { patientId: id } }),
      completedAppointments: await db.appointment.count({ where: { patientId: id, status: "COMPLETED" } }),
      noShows: patient.noShowCount,
      lifetimeValue: patient.lifetimeValue,
      activeMembership: memberships.find((m) => m.status === "ACTIVE")?.plan.name ?? null,
    },
  });
});

export const PATCH = route(async (req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const allowed = ["firstName", "lastName", "email", "phone", "gender", "city", "address",
    "allergies", "medications", "medicalHistory", "skinType", "status", "tags",
    "marketingOptIn", "consentsSigned", "branchId", "source", "emergencyContact", "pregnancyStatus"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  if (body.dob) data.dob = new Date(body.dob);

  const patient = await db.patient.update({ where: { id }, data });
  await db.auditLog.create({ data: { tenantId, action: "UPDATE_PATIENT", entity: "Patient",
    entityId: id, details: `fields: ${Object.keys(data).join(", ")}` } });
  return NextResponse.json({ patient });
});
