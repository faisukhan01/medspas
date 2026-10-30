import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").toLowerCase();
  const category = sp.get("category");
  const lowOnly = sp.get("lowOnly") === "1";

  const [products, purchaseOrders] = await Promise.all([
    db.product.findMany({
      where: { tenantId, ...(category && category !== "all" ? { category } : {}) },
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { name: "asc" },
    }),
    db.purchaseOrder.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
  const lowStock = products.filter((p) => p.stockQty <= p.lowStockThreshold);
  const inventoryValue = products.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
  const retailValue = products.reduce((s, p) => s + (p.retailPrice || p.costPrice) * p.stockQty, 0);

  return NextResponse.json({
    products: lowOnly ? lowStock : filtered,
    purchaseOrders,
    lowStock,
    inventoryValue: Math.round(inventoryValue),
    retailValue: Math.round(retailValue),
    categories: [...new Set(products.map((p) => p.category))],
    expiringSoon: products.filter((p) => p.expiryAt && p.expiryAt < new Date(Date.now() + 60 * 86400000)),
  });
});

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.sku) return bad("name and sku are required");

  const product = await db.product.create({
    data: {
      tenantId, name: body.name, sku: body.sku,
      category: body.category || "Consumables", supplier: body.supplier || null,
      costPrice: Number(body.costPrice) || 0, retailPrice: Number(body.retailPrice) || 0,
      stockQty: Number(body.stockQty) || 0, lowStockThreshold: Number(body.lowStockThreshold) || 10,
      lotNumber: body.lotNumber || null,
      expiryAt: body.expiryAt ? new Date(body.expiryAt) : null,
      branchId: body.branchId || null,
    },
  });
  await db.auditLog.create({ data: { tenantId, action: "CREATE_PRODUCT", entity: "Product", entityId: product.id, details: `${product.name} x${product.stockQty}` } });
  return NextResponse.json({ product }, { status: 201 });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  if (!body?.id) return bad("id is required");

  const product = await db.product.findFirst({ where: { id: body.id, tenantId } });
  if (!product) return bad("Product not found", 404);

  if (body.adjustStock !== undefined) {
    const delta = Number(body.adjustStock);
    const updated = await db.product.update({ where: { id: product.id }, data: { stockQty: { increment: delta } } });
    await db.auditLog.create({ data: { tenantId, action: "ADJUST_STOCK", entity: "Product", entityId: product.id, details: `${delta > 0 ? "+" : ""}${delta} → ${updated.stockQty}` } });
    if (updated.stockQty <= updated.lowStockThreshold) {
      await db.notification.create({ data: { tenantId, title: "Low stock alert",
        body: `${updated.name} is at ${updated.stockQty} units (threshold ${updated.lowStockThreshold}).`, type: "ALERT" } });
    }
    return NextResponse.json({ product: updated });
  }

  const allowed = ["name", "costPrice", "retailPrice", "lowStockThreshold", "supplier", "isActive", "lotNumber"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const updated = await db.product.update({ where: { id: product.id }, data });
  return NextResponse.json({ product: updated });
});
