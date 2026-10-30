import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Refund or mark paid — the two billing mutations the POS needs. */
export const PATCH = route(async (req: NextRequest, { params }: Params) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const invoice = await db.invoice.findFirst({ where: { id, tenantId } });
  if (!invoice) return bad("Invoice not found", 404);

  if (body.action === "refund") {
    const amount = Math.min(Number(body.amount) || invoice.total, invoice.total);
    await db.payment.create({ data: { tenantId, invoiceId: id, amount, currency: invoice.currency,
      type: "REFUND", method: invoice.method ?? "CARD", status: "REFUNDED",
      transactionRef: `re_${Date.now().toString(36)}` } });
    const updated = await db.invoice.update({ where: { id },
      data: { status: amount >= invoice.total ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    await db.auditLog.create({ data: { tenantId, action: "REFUND", entity: "Invoice", entityId: id,
      details: `${amount} ${invoice.currency} refunded` } });
    await db.notification.create({ data: { tenantId, title: "Refund issued",
      body: `${invoice.number} — ${amount} ${invoice.currency} refunded to patient.`, type: "PAYMENT" } });
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "markPaid") {
    const updated = await db.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), method: body.method ?? invoice.method ?? "CARD" } });
    await db.payment.create({ data: { tenantId, invoiceId: id, amount: invoice.total, currency: invoice.currency,
      type: "PAYMENT", method: updated.method ?? "CARD", status: "SUCCEEDED", transactionRef: `pay_${Date.now().toString(36)}` } });
    return NextResponse.json({ invoice: updated });
  }

  return bad("Unknown action — use 'refund' or 'markPaid'");
});
