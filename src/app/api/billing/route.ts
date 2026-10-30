import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Billing hub: invoices + payments + memberships + gift cards + revenue stats. */
export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const status = req.nextUrl.searchParams.get("status");

  const d30 = new Date(Date.now() - 30 * 86400000);
  const [invoices, payments, plans, giftCards, packages] = await Promise.all([
    db.invoice.findMany({
      where: { tenantId, ...(status && status !== "all" ? { status } : {}) },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
        branch: { select: { id: true, name: true, code: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { invoice: { select: { number: true } } },
    }),
    db.membershipPlan.findMany({ where: { tenantId } }),
    db.giftCard.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.patientPackage.findMany({ orderBy: { purchasedAt: "desc" }, take: 20 }),
  ]);

  // membership joins need tenant scoping via patient — do a scoped fetch
  const scopedMemberships = await db.membership.findMany({
    where: { patient: { tenantId } },
    include: { plan: true, patient: { select: { id: true, firstName: true, lastName: true, avatarColor: true } } },
    orderBy: { startedAt: "desc" },
    take: 40,
  });

  const paid = payments.filter((p) => p.type === "PAYMENT" && p.status === "SUCCEEDED");
  const refunds = payments.filter((p) => p.type === "REFUND");
  const mrr = scopedMemberships.filter((m) => m.status === "ACTIVE" && m.plan.billingCycle === "MONTHLY")
    .reduce((s, m) => s + m.plan.price, 0);
  const unpaid = invoices.filter((i) => i.status === "UNPAID").reduce((s, i) => s + i.total, 0);

  return NextResponse.json({
    invoices,
    payments,
    memberships: scopedMemberships,
    plans,
    giftCards,
    packages,
    stats: {
      revenue30d: Math.round(paid.filter((p) => p.createdAt >= d30).reduce((s, p) => s + p.amount, 0)),
      refunds30d: Math.round(refunds.filter((p) => p.createdAt >= d30).reduce((s, p) => s + p.amount, 0)),
      mrr: Math.round(mrr),
      activeMembers: scopedMemberships.filter((m) => m.status === "ACTIVE").length,
      outstanding: Math.round(unpaid),
      giftCardLiability: Math.round(giftCards.filter((g) => g.status === "ACTIVE").reduce((s, g) => s + g.balance, 0)),
    },
  });
});

/** Create a manual invoice (POS-style sale) */
export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.patientId || !Array.isArray(body.items)) return bad("patientId and items[] are required");

  const patient = await db.patient.findUnique({ where: { id: body.patientId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const branch = body.branchId
    ? await db.branch.findUnique({ where: { id: body.branchId } })
    : await db.branch.findFirst({ where: { id: patient.branchId ?? "" } });
  const currency = branch?.currency ?? "USD";
  const taxRate = branch?.taxRate ?? 0;

  const subtotal = body.items.reduce((s: number, it: { unitPrice: number; qty: number }) => s + it.unitPrice * (it.qty || 1), 0);
  const discount = Number(body.discount) || 0;
  const tax = Math.round((subtotal - discount) * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;

  const count = await db.invoice.count({ where: { tenantId } });
  const invoice = await db.invoice.create({
    data: {
      tenantId, branchId: branch?.id ?? (patient.branchId as string), patientId: patient.id,
      number: `INV-2025-${String(count + 451).padStart(4, "0")}`,
      items: JSON.stringify(body.items), subtotal, discount, tax, total, currency,
      status: body.markPaid ? "PAID" : "UNPAID",
      method: body.method || "CARD",
      paidAt: body.markPaid ? new Date() : null,
    },
    include: { patient: { select: { firstName: true, lastName: true } }, branch: { select: { name: true } } },
  });

  if (body.markPaid) {
    await db.payment.create({ data: { tenantId, invoiceId: invoice.id, amount: total, currency,
      type: "PAYMENT", method: invoice.method ?? "CARD", status: "SUCCEEDED",
      transactionRef: `pos_${Date.now().toString(36)}` } });
    await db.patient.update({ where: { id: patient.id }, data: { lifetimeValue: { increment: total } } });
  }
  await db.auditLog.create({ data: { tenantId, action: "CREATE_INVOICE", entity: "Invoice", entityId: invoice.id, details: `${invoice.number} · ${total} ${currency}` } });

  return NextResponse.json({ invoice }, { status: 201 });
});
