import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const status = sp.get("status");
  const branchId = sp.get("branchId");
  const page = Math.max(parseInt(sp.get("page") ?? "1"), 1);
  const pageSize = Math.min(parseInt(sp.get("pageSize") ?? "20"), 100);

  const where: Record<string, unknown> = {
    tenantId,
    ...(status && status !== "all" ? { status } : {}),
    ...(branchId && branchId !== "all" ? { branchId } : {}),
  };

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true, currency: true } },
        _count: { select: { appointments: true, treatments: true, memberships: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.patient.count({ where }),
  ]);

  const search = q.toLowerCase();
  const filtered = search
    ? patients.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search) ||
        (p.email ?? "").toLowerCase().includes(search) ||
        (p.phone ?? "").includes(search) ||
        (p.tags ?? "").toLowerCase().includes(search))
    : patients;

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  return NextResponse.json({ patients: paged, total: filtered.length, page, pageSize });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.firstName || !body?.lastName) return bad("firstName and lastName are required");

  const patient = await db.patient.create({
    data: {
      tenantId,
      branchId: body.branchId || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      dob: body.dob ? new Date(body.dob) : null,
      gender: body.gender || null,
      country: body.country || "US",
      city: body.city || null,
      address: body.address || null,
      allergies: body.allergies || null,
      medications: body.medications || null,
      medicalHistory: body.medicalHistory || null,
      skinType: body.skinType || null,
      source: body.source || "WALK_IN",
      tags: body.tags || null,
      marketingOptIn: body.marketingOptIn ?? true,
      avatarColor: ["#047857", "#0d9488", "#b45309", "#be185d", "#7c3aed", "#0891b2"][Math.floor(Math.random() * 6)],
    },
    include: { branch: { select: { id: true, name: true, code: true } } },
  });

  await db.auditLog.create({ data: { tenantId, action: "CREATE_PATIENT", entity: "Patient",
    entityId: patient.id, details: `${patient.firstName} ${patient.lastName}` } });
  await db.notification.create({ data: { tenantId, title: "New patient registered",
    body: `${patient.firstName} ${patient.lastName} joined via ${patient.source ?? "manual entry"}`, type: "INFO" } });

  return NextResponse.json({ patient }, { status: 201 });
});
