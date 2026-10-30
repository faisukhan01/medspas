"use client";

// ═══════════════════════════════════════════════════════════════
//  Inventory — stock levels, lot/expiry, adjustments, purchase orders
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Boxes, CalendarDays, Minus, Package, PackagePlus, Plus, ShoppingCart, ToggleLeft, TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "../store";
import {
  api, post, patch, PageHeader, StatCard, Money, Loading, ErrorNote, EmptyState, formatDate,
} from "../ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductRow {
  id: string; name: string; sku: string; category: string; supplier: string | null;
  costPrice: number; retailPrice: number; stockQty: number; lowStockThreshold: number;
  lotNumber: string | null; expiryAt: string | null; unit: string;
  branch?: { name: string; code: string } | null;
}
interface PurchaseOrderRow {
  id: string; supplier: string; total: number; status: string;
  orderedAt: string | null; receivedAt: string | null;
}
interface InventoryData {
  products: ProductRow[]; purchaseOrders: PurchaseOrderRow[]; lowStock: ProductRow[];
  inventoryValue: number; retailValue: number; categories: string[]; expiringSoon: ProductRow[];
}

const CATEGORIES = ["Injectables", "Consumables", "Retail", "Equipment"] as const;

const PO_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-stone-100 text-stone-700 border-stone-200" },
  ORDERED: { label: "Ordered", className: "bg-amber-100 text-amber-800 border-amber-200" },
  RECEIVED: { label: "Received", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

const CATEGORY_CHIP: Record<string, string> = {
  Injectables: "bg-rose-50 border-rose-200/70 text-rose-800",
  Consumables: "bg-teal-50 border-teal-200/70 text-teal-800",
  Retail: "bg-amber-50 border-amber-200/70 text-amber-800",
  Equipment: "bg-stone-100 border-stone-200 text-stone-600",
};

const emptyForm = {
  name: "", sku: "", category: "Consumables", supplier: "",
  costPrice: "", retailPrice: "", stockQty: "0", lowStockThreshold: "10",
  lotNumber: "", expiryAt: "",
};

function stockTone(qty: number, threshold: number): string {
  if (qty <= threshold) return "#e11d48";
  if (qty <= threshold * 1.5) return "#d97706";
  return "#047857";
}

export default function InventoryView() {
  const { boot } = useApp();
  const [data, setData] = useState<InventoryData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tenantCurrency = boot?.tenant?.currency ?? boot?.branches[0]?.currency ?? "USD";

  const load = useCallback(() => {
    api<InventoryData>("/api/inventory").then(setData).catch(setError);
  }, []);

  useEffect(() => { load(); }, [load]);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return lowOnly ? list.filter((p) => p.stockQty <= p.lowStockThreshold) : list;
  }, [data, lowOnly]);

  const expiringIds = useMemo(() => new Set((data?.expiringSoon ?? []).map((p) => p.id)), [data]);

  const adjustStock = useCallback(async (p: ProductRow, delta: number) => {
    // optimistic
    setData((prev) => prev
      ? {
          ...prev,
          products: prev.products.map((r) => (r.id === p.id ? { ...r, stockQty: Math.max(0, r.stockQty + delta) } : r)),
        }
      : prev);
    try {
      await patch("/api/inventory", { id: p.id, adjustStock: delta });
      load(); // re-sync alerts/values with server truth
    } catch {
      load();
    }
  }, [load]);

  const submitProduct = useCallback(async () => {
    if (!form.name.trim() || !form.sku.trim()) { setFormError("Name and SKU are required."); return; }
    setSaving(true); setFormError(null);
    try {
      await post("/api/inventory", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        supplier: form.supplier.trim() || undefined,
        costPrice: Number(form.costPrice) || 0,
        retailPrice: Number(form.retailPrice) || 0,
        stockQty: Number(form.stockQty) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 10,
        lotNumber: form.lotNumber.trim() || undefined,
        expiryAt: form.expiryAt || undefined,
      });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create product.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!data) return <div className="p-6 pt-10"><Loading label="Counting the stock room" rows={6} /></div>;

  const alertCritical = data.lowStock.some((p) => p.stockQty === 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Inventory"
        subtitle="Injectables, consumables, retail and equipment — with lot tracking and expiry alerts."
        actions={
          <>
            <button
              onClick={() => setLowOnly((v) => !v)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                lowOnly ? "border-amber-500 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-600 hover:border-emerald-600/40")}
            >
              <ToggleLeft className="size-4" /> Low stock only
            </button>
            <button
              onClick={() => { setForm(emptyForm); setFormError(null); setDialogOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors"
            >
              <Plus className="size-4" /> Add product
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Inventory value" value={<Money amount={data.inventoryValue} currency={tenantCurrency} />}
          sub="At cost price" icon={<Boxes className="size-4" />} accent="#047857" />
        <StatCard label="Retail value" value={<Money amount={data.retailValue} currency={tenantCurrency} />}
          sub="If sold at shelf price" icon={<ShoppingCart className="size-4" />} accent="#0d9488" />
        <StatCard label="Low stock items" value={data.lowStock.length}
          sub={data.lowStock.length > 0 ? "At or below threshold" : "All comfortably stocked"}
          icon={<TriangleAlert className="size-4" />} accent={data.lowStock.length > 0 ? "#e11d48" : "#57534e"} />
        <StatCard label="Expiring ≤ 60 days" value={data.expiringSoon.length}
          sub={data.expiringSoon.length > 0 ? "Check lot numbers below" : "Nothing expiring soon"}
          icon={<CalendarDays className="size-4" />} accent={data.expiringSoon.length > 0 ? "#d97706" : "#57534e"} />
      </div>

      {/* Alerts panel */}
      {data.lowStock.length > 0 && (
        <div className={cn("mt-4 rounded-2xl border px-4 md:px-5 py-4 flex items-start gap-3",
          alertCritical ? "border-rose-200 bg-rose-50/70" : "border-amber-200 bg-amber-50/70")}>
          <AlertTriangle className={cn("size-5 mt-0.5 shrink-0", alertCritical ? "text-rose-600" : "text-amber-600")} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", alertCritical ? "text-rose-900" : "text-amber-900")}>
              {alertCritical ? "Stock-out — reorder immediately" : "Low stock — time to reorder"}
            </p>
            <ul className="mt-1.5 space-y-0.5 max-h-36 overflow-y-auto auralis-scroll">
              {data.lowStock.map((p) => (
                <li key={p.id} className={cn("text-xs", alertCritical ? "text-rose-800/90" : "text-amber-800/90")}>
                  <span className="font-medium">{p.name}</span> — {p.stockQty} left (threshold {p.lowStockThreshold})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Product table */}
      <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        {products.length === 0 ? (
          <EmptyState icon={<Package className="size-5" />} title={lowOnly ? "Nothing is low on stock" : "No products yet"}
            description={lowOnly ? "Every item is above its low-stock threshold." : "Add your first product to start tracking stock."} />
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto auralis-scroll">
            {products.map((p) => {
              const max = Math.max(p.lowStockThreshold * 3, 1);
              const barPct = Math.min((p.stockQty / max) * 100, 100);
              const tone = stockTone(p.stockQty, p.lowStockThreshold);
              const expiring = expiringIds.has(p.id);
              return (
                <div key={p.id} className="flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                  {/* name + sku */}
                  <div className="min-w-40 flex-1 basis-40">
                    <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                    <p className="font-mono text-[10px] text-stone-400">{p.sku}</p>
                  </div>
                  {/* category */}
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0", CATEGORY_CHIP[p.category] ?? CATEGORY_CHIP.Equipment)}>
                    {p.category}
                  </span>
                  {/* supplier */}
                  <p className="hidden md:block w-32 text-xs text-stone-500 truncate shrink-0">{p.supplier ?? "—"}</p>
                  {/* prices */}
                  <div className="hidden xl:flex w-32 shrink-0 text-xs">
                    <span className="text-stone-400">Cost</span>
                    <Money amount={p.costPrice} currency={tenantCurrency} className="ml-auto font-medium text-stone-600" />
                    <span className="mx-1.5 text-stone-300">·</span>
                    <span className="text-stone-400">Ret</span>
                    <Money amount={p.retailPrice} currency={tenantCurrency} className="ml-1 font-medium text-stone-700" />
                  </div>
                  {/* stock bar */}
                  <div className="w-36 shrink-0">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-semibold" style={{ color: tone }}>{p.stockQty} {p.unit}</span>
                      <span className="text-stone-400">min {p.lowStockThreshold}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: tone }} />
                    </div>
                  </div>
                  {/* lot + expiry */}
                  <div className="hidden lg:block w-36 shrink-0 text-[10px] text-stone-400">
                    <p>Lot <span className="font-mono text-stone-500">{p.lotNumber ?? "—"}</span></p>
                    <p className={cn(expiring && "text-rose-600 font-medium")}>
                      Exp {p.expiryAt ? formatDate(p.expiryAt, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  {/* adjust */}
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <button onClick={() => adjustStock(p, -1)} disabled={p.stockQty <= 0}
                      className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors disabled:opacity-40"
                      aria-label={`Remove one ${p.name}`}>
                      <Minus className="size-3.5" />
                    </button>
                    <button onClick={() => adjustStock(p, 1)}
                      className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                      aria-label={`Add one ${p.name}`}>
                      <Plus className="size-3.5" />
                    </button>
                    <button onClick={() => adjustStock(p, 10)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-700/20 transition-colors">
                      <PackagePlus className="size-3.5" /> Receive 10
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase orders */}
      <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <h2 className="font-display text-base font-semibold text-stone-800">Purchase orders</h2>
            <p className="text-xs text-stone-500 mt-0.5">Supplier orders and delivery status</p>
          </div>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">{data.purchaseOrders.length}</span>
        </div>
        {data.purchaseOrders.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="size-5" />} title="No purchase orders" description="Orders raised to suppliers will appear here." />
        ) : (
          <div className="divide-y divide-stone-100 mt-2 max-h-64 overflow-y-auto auralis-scroll">
            {data.purchaseOrders.map((po) => {
              const meta = PO_STATUS_META[po.status] ?? PO_STATUS_META.DRAFT;
              return (
                <div key={po.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-stone-50/60 transition-colors">
                  <p className="text-sm font-medium text-stone-800 min-w-36 flex-1">{po.supplier}</p>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.className)}>{meta.label}</span>
                  <Money amount={po.total} currency={tenantCurrency} className="text-sm font-semibold text-stone-700 w-20 text-right" />
                  <p className="hidden sm:block w-40 text-right text-[10px] text-stone-400">
                    {po.orderedAt ? `Ordered ${formatDate(po.orderedAt)}` : "Not ordered"}
                    {po.receivedAt ? ` · Received ${formatDate(po.receivedAt)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto auralis-scroll">
          <DialogHeader>
            <DialogTitle className="font-display">Add product</DialogTitle>
            <DialogDescription>Stock, lot number and expiry feed the low-stock and expiry alerts.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pr-name" className="text-xs text-stone-600">Name *</Label>
                <Input id="pr-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Botulax 100u" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pr-sku" className="text-xs text-stone-600">SKU *</Label>
                <Input id="pr-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="INJ-BTX-100" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-stone-600">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="w-full border-stone-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pr-supplier" className="text-xs text-stone-600">Supplier</Label>
                <Input id="pr-supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Aesthetics Wholesale" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pr-cost" className="text-xs text-stone-600">Cost price</Label>
                <Input id="pr-cost" type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pr-retail" className="text-xs text-stone-600">Retail price</Label>
                <Input id="pr-retail" type="number" min={0} step="0.01" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                  className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pr-qty" className="text-xs text-stone-600">Stock quantity</Label>
                <Input id="pr-qty" type="number" min={0} value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                  className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pr-threshold" className="text-xs text-stone-600">Low stock threshold</Label>
                <Input id="pr-threshold" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pr-lot" className="text-xs text-stone-600">Lot number</Label>
                <Input id="pr-lot" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                  placeholder="L-2025-0142" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pr-expiry" className="text-xs text-stone-600">Expiry date</Label>
                <Input id="pr-expiry" type="date" value={form.expiryAt} onChange={(e) => setForm({ ...form, expiryAt: e.target.value })}
                  className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            {formError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
          </div>

          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={submitProduct} disabled={saving}
              className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors disabled:opacity-50">
              {saving ? "Adding…" : "Add product"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </motion.div>
  );
}
