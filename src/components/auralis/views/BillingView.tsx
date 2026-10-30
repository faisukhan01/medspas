"use client";

// ═══════════════════════════════════════════════════════════════
//  Payments & Billing — POS, invoices, payments, memberships, gift cards
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, CreditCard, Gem,
  Gift, MoreVertical, Plus, Receipt, Repeat, Search, ShoppingCart, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INVOICE_STATUS_META } from "@/lib/constants";
import { useApp } from "../store";
import {
  api, post, patch, PageHeader, StatCard, Avatar, StatusBadge, Money, Loading, ErrorNote,
  EmptyState, formatMoney, formatDate, timeAgo,
} from "../ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PatientLite {
  id: string; firstName: string; lastName: string; avatarColor: string;
  branch?: { id: string; name: string; code: string; currency: string } | null;
}
interface InvoiceRow {
  id: string; number: string; subtotal: number; discount: number; tax: number; total: number;
  currency: string; status: string; method: string | null; paidAt: string | null; createdAt: string;
  patient: { id: string; firstName: string; lastName: string; avatarColor: string };
  branch: { id: string; name: string; code: string; currency: string };
}
interface PaymentRow {
  id: string; amount: number; currency: string; type: string; method: string;
  status: string; transactionRef: string | null; createdAt: string;
  invoice: { number: string } | null;
}
interface MembershipRow {
  id: string; planId: string; status: string; renewsAt: string | null; startedAt: string;
  plan: { id: string; name: string; price: number; currency: string; billingCycle: string };
  patient: { id: string; firstName: string; lastName: string; avatarColor: string };
}
interface PlanRow { id: string; name: string; price: number; currency: string; billingCycle: string; benefits: string | null }
interface GiftCardRow { id: string; code: string; balance: number; initialAmount: number; currency: string; status: string; expiryAt: string | null }
interface BillingData {
  invoices: InvoiceRow[]; payments: PaymentRow[]; memberships: MembershipRow[]; plans: PlanRow[]; giftCards: GiftCardRow[];
  stats: { revenue30d: number; refunds30d: number; mrr: number; activeMembers: number; outstanding: number; giftCardLiability: number };
}

const PAYMENT_TYPE_META: Record<string, { icon: typeof Clock; className: string }> = {
  PAYMENT: { icon: ArrowDownCircle, className: "text-emerald-600 bg-emerald-50" },
  REFUND: { icon: ArrowUpCircle, className: "text-rose-600 bg-rose-50" },
  DEPOSIT: { icon: Clock, className: "text-amber-600 bg-amber-50" },
  SUBSCRIPTION: { icon: Repeat, className: "text-teal-700 bg-teal-50" },
};

const METHOD_META: Record<string, string> = {
  CARD: "bg-emerald-50 border-emerald-200/70 text-emerald-800",
  STRIPE: "bg-violet-50 border-violet-200/70 text-violet-800",
  CASH: "bg-stone-100 border-stone-200 text-stone-600",
  GIFT_CARD: "bg-teal-50 border-teal-200/70 text-teal-800",
  MEMBERSHIP: "bg-teal-50 border-teal-200/70 text-teal-800",
  BANK_TRANSFER: "bg-stone-100 border-stone-200 text-stone-600",
};

const GIFT_STATUS_META: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REDEEMED: "bg-stone-100 text-stone-600 border-stone-200",
  EXPIRED: "bg-rose-100 text-rose-700 border-rose-200",
};

const MEMBER_STATUS_META: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PAUSED: "bg-amber-100 text-amber-800 border-amber-200",
  CANCELLED: "bg-stone-100 text-stone-600 border-stone-200",
  PAST_DUE: "bg-rose-100 text-rose-700 border-rose-200",
};

const CYCLE_SUFFIX: Record<string, string> = { MONTHLY: "/mo", QUARTERLY: "/qtr", ANNUAL: "/yr" };

type PosItem = { name: string; unitPrice: string; qty: string };

export default function BillingView() {
  const { boot } = useApp();
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const tenantCurrency = boot?.tenant?.currency ?? boot?.branches[0]?.currency ?? "USD";

  const load = useCallback(() => {
    api<BillingData>("/api/billing").then(setData).catch(setError);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showFlash = useCallback((tone: "ok" | "err", text: string) => {
    setFlash({ tone, text });
    window.setTimeout(() => setFlash(null), 4500);
  }, []);

  // ── POS dialog state ───────────────────────────────────────────
  const [posOpen, setPosOpen] = useState(false);
  const [patients, setPatients] = useState<PatientLite[] | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [posPatientId, setPosPatientId] = useState("");
  const [posItems, setPosItems] = useState<PosItem[]>([{ name: "", unitPrice: "", qty: "1" }]);
  const [posDiscount, setPosDiscount] = useState("0");
  const [posBranchId, setPosBranchId] = useState("");
  const [posMarkPaid, setPosMarkPaid] = useState(true);
  const [posMethod, setPosMethod] = useState("CARD");
  const [posSaving, setPosSaving] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [posSuccess, setPosSuccess] = useState<{ number: string; total: number; currency: string } | null>(null);

  // ── invoice row actions ────────────────────────────────────────
  const [invFilter, setInvFilter] = useState<"all" | "UNPAID" | "REFUNDED">("all");
  const [refundTarget, setRefundTarget] = useState<InvoiceRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);

  const openPos = useCallback(() => {
    setPosOpen(true);
    setPosSuccess(null);
    setPosError(null);
    if (patients === null) {
      api<{ patients: PatientLite[] }>("/api/patients?pageSize=100")
        .then((d) => setPatients(d.patients))
        .catch((e) => setPosError(e instanceof Error ? e.message : "Could not load patients"));
    }
  }, [patients]);

  const selectedPatient = useMemo(
    () => (patients ?? []).find((p) => p.id === posPatientId) ?? null,
    [patients, posPatientId],
  );

  const posBranch = useMemo(() => {
    const all = boot?.branches ?? [];
    return all.find((b) => b.id === posBranchId)
      ?? all.find((b) => b.id === selectedPatient?.branch?.id)
      ?? all[0]
      ?? null;
  }, [boot, posBranchId, selectedPatient]);

  const posTotals = useMemo(() => {
    const subtotal = posItems.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.qty) || 0), 0);
    const discount = Math.min(Number(posDiscount) || 0, subtotal);
    const taxRate = posBranch?.taxRate ?? 0;
    const tax = Math.round((subtotal - discount) * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal - discount + tax) * 100) / 100;
    return { subtotal, discount, taxRate, tax, total };
  }, [posItems, posDiscount, posBranch]);

  const submitPos = useCallback(async () => {
    if (!posPatientId) { setPosError("Choose a patient for this sale."); return; }
    const items = posItems
      .filter((it) => it.name.trim() && Number(it.unitPrice) > 0)
      .map((it) => ({ name: it.name.trim(), unitPrice: Number(it.unitPrice), qty: Number(it.qty) || 1 }));
    if (items.length === 0) { setPosError("Add at least one line item with a name and price."); return; }
    setPosSaving(true); setPosError(null);
    try {
      const res = await post<{ invoice: InvoiceRow }>("/api/billing", {
        patientId: posPatientId,
        items,
        discount: Number(posDiscount) || 0,
        branchId: posBranch?.id || undefined,
        markPaid: posMarkPaid,
        method: posMethod,
      });
      setPosSuccess({ number: res.invoice.number, total: res.invoice.total, currency: res.invoice.currency });
      load();
    } catch (e) {
      setPosError(e instanceof Error ? e.message : "Could not create the sale.");
    } finally {
      setPosSaving(false);
    }
  }, [posPatientId, posItems, posDiscount, posBranch, posMarkPaid, posMethod, load]);

  const markPaid = useCallback(async (inv: InvoiceRow) => {
    try {
      await patch(`/api/invoices/${inv.id}`, { action: "markPaid" });
      showFlash("ok", `${inv.number} marked as paid · ${formatMoney(inv.total, inv.currency)}`);
      load();
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : "Could not mark paid");
    }
  }, [load, showFlash]);

  const submitRefund = useCallback(async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await patch(`/api/invoices/${refundTarget.id}`, { action: "refund", amount: Number(refundAmount) || refundTarget.total });
      showFlash("ok", `${refundTarget.number} refunded · ${formatMoney(Number(refundAmount) || refundTarget.total, refundTarget.currency)}`);
      setRefundTarget(null);
      load();
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefunding(false);
    }
  }, [refundTarget, refundAmount, load, showFlash]);

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!data) return <div className="p-6 pt-10"><Loading label="Balancing the books" rows={6} /></div>;

  const s = data.stats;
  const filteredInvoices = data.invoices.filter((inv) =>
    invFilter === "all" ? true : invFilter === "UNPAID" ? inv.status === "UNPAID" : inv.status === "REFUNDED" || inv.status === "PARTIALLY_REFUNDED");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Payments & Billing"
        subtitle="Point-of-sale, invoices, memberships and gift cards — across both currencies."
        actions={
          <button
            onClick={openPos}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors"
          >
            <ShoppingCart className="size-4" /> New sale (POS)
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Revenue · 30 days" value={<Money amount={s.revenue30d} currency={tenantCurrency} />}
          sub={`Refunds ${formatMoney(s.refunds30d, tenantCurrency)}`} icon={<CreditCard className="size-4" />} accent="#047857" />
        <StatCard label="MRR" value={<Money amount={s.mrr} currency={tenantCurrency} />}
          sub={`Glow Club · ${s.activeMembers} active members`} icon={<Gem className="size-4" />} accent="#d97706" />
        <StatCard label="Outstanding" value={<Money amount={s.outstanding} currency={tenantCurrency} />}
          sub={s.outstanding > 0 ? "Unpaid invoices to chase" : "All invoices settled"}
          icon={<AlertCircle className="size-4" />} accent={s.outstanding > 0 ? "#e11d48" : "#57534e"} />
        <StatCard label="Gift card liability" value={<Money amount={s.giftCardLiability} currency={tenantCurrency} />}
          sub="Unredeemed balances" icon={<Gift className="size-4" />} accent="#0d9488" />
      </div>

      {flash && (
        <div className={cn("mt-4 rounded-xl border px-4 py-2.5 text-sm flex items-center gap-2",
          flash.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700")}>
          {flash.tone === "ok" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
          {flash.text}
        </div>
      )}

      <Tabs defaultValue="invoices" className="mt-5">
        <TabsList className="bg-stone-100 rounded-full p-1 h-9">
          <TabsTrigger value="invoices" className="rounded-full px-4 text-sm">Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-full px-4 text-sm">Payments</TabsTrigger>
          <TabsTrigger value="memberships" className="rounded-full px-4 text-sm">Memberships</TabsTrigger>
          <TabsTrigger value="giftcards" className="rounded-full px-4 text-sm">Gift cards</TabsTrigger>
        </TabsList>

        {/* ── Invoices ── */}
        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
              {([["all", "All"], ["UNPAID", "Unpaid"], ["REFUNDED", "Refunded"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setInvFilter(key)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    invFilter === key ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-emerald-600/40")}>
                  {label}
                </button>
              ))}
              <span className="ml-auto text-xs text-stone-400">{filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"}</span>
            </div>

            {filteredInvoices.length === 0 ? (
              <EmptyState icon={<Receipt className="size-5" />} title="No invoices in this view"
                description="Create a sale from the POS to see invoices here." />
            ) : (
              <div className="divide-y divide-stone-100 mt-2 max-h-96 overflow-y-auto auralis-scroll">
                {filteredInvoices.map((inv) => {
                  const hasActions = inv.status === "UNPAID" || inv.status === "PAID";
                  return (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                      <div className="w-28 shrink-0">
                        <p className="font-mono text-xs font-semibold text-stone-800">{inv.number}</p>
                        <p className="text-[10px] text-stone-400">{formatDate(inv.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar name={`${inv.patient.firstName} ${inv.patient.lastName}`} color={inv.patient.avatarColor} size={30} />
                        <p className="text-sm text-stone-700 truncate">{inv.patient.firstName} {inv.patient.lastName}</p>
                      </div>
                      <span className="hidden md:inline rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 shrink-0">{inv.branch.code}</span>
                      <Money amount={inv.total} currency={inv.currency} className="text-sm font-semibold text-stone-800 w-20 text-right shrink-0" />
                      <StatusBadge meta={INVOICE_STATUS_META[inv.status]} value={inv.status} />
                      <span className="hidden lg:block w-16 text-[10px] text-stone-400 shrink-0">
                        {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : ""}
                      </span>
                      {hasActions ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors" aria-label={`Actions for ${inv.number}`}>
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {inv.status === "UNPAID" && (
                              <DropdownMenuItem onClick={() => markPaid(inv)} className="text-emerald-800 focus:text-emerald-900">
                                <CheckCircle2 className="size-4" /> Mark paid
                              </DropdownMenuItem>
                            )}
                            {inv.status === "PAID" && (
                              <DropdownMenuItem onClick={() => { setRefundTarget(inv); setRefundAmount(String(inv.total)); }} className="text-rose-700 focus:text-rose-800">
                                <ArrowUpCircle className="size-4" /> Refund…
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="w-7" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="mt-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            {data.payments.length === 0 ? (
              <EmptyState icon={<CreditCard className="size-5" />} title="No payments yet" description="Card, cash and Stripe payments will appear here." />
            ) : (
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto auralis-scroll">
                {data.payments.map((p) => {
                  const meta = PAYMENT_TYPE_META[p.type] ?? { icon: CreditCard, className: "text-stone-500 bg-stone-100" };
                  const Icon = meta.icon;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                      <span className={cn("size-9 rounded-xl grid place-items-center shrink-0", meta.className)}>
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-800 capitalize">{p.type.toLowerCase()}</p>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", METHOD_META[p.method] ?? METHOD_META.CASH)}>
                            {p.method.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate">
                          {p.invoice?.number ? `${p.invoice.number} · ` : ""}<span className="font-mono">{p.transactionRef ?? "—"}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Money amount={p.amount} currency={p.currency} className={cn("text-sm font-semibold", p.type === "REFUND" ? "text-rose-700" : "text-stone-800")} />
                        <p className="text-[10px] text-stone-400">{timeAgo(p.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Memberships ── */}
        <TabsContent value="memberships" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.plans.map((plan) => {
              const count = data.memberships.filter((m) => m.planId === plan.id && m.status === "ACTIVE").length;
              return (
                <div key={plan.id} className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-stone-900 truncate">{plan.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {formatMoney(plan.price, plan.currency)}<span className="text-stone-400">{CYCLE_SUFFIX[plan.billingCycle] ?? ""}</span>
                      </p>
                    </div>
                    <Gem className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-emerald-800">{count} active member{count === 1 ? "" : "s"}</p>
                </div>
              );
            })}
            {data.plans.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
                <EmptyState icon={<Gem className="size-5" />} title="No membership plans" description="Plans configured on the tenant show up here." />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            {data.memberships.length === 0 ? (
              <EmptyState icon={<Repeat className="size-5" />} title="No members yet" description="Memberships sold to patients appear here." />
            ) : (
              <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto auralis-scroll">
                {data.memberships.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                    <Avatar name={`${m.patient.firstName} ${m.patient.lastName}`} color={m.patient.avatarColor} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 truncate">{m.patient.firstName} {m.patient.lastName}</p>
                      <p className="text-xs text-stone-500 truncate">{m.plan.name}</p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      MEMBER_STATUS_META[m.status] ?? MEMBER_STATUS_META.CANCELLED)}>
                      {m.status.replace(/_/g, " ")}
                    </span>
                    <span className="hidden sm:block w-24 text-right text-[10px] text-stone-400 shrink-0">
                      {m.renewsAt ? `Renews ${formatDate(m.renewsAt)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Gift cards ── */}
        <TabsContent value="giftcards" className="mt-4">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.giftCards.map((g) => {
              const usedPct = g.initialAmount > 0 ? Math.round(((g.initialAmount - g.balance) / g.initialAmount) * 100) : 0;
              return (
                <div key={g.id} className="rounded-2xl border border-stone-200/80 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-stone-800 tracking-wide">{g.code}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", GIFT_STATUS_META[g.status] ?? GIFT_STATUS_META.REDEEMED)}>
                      {g.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-stone-400">Balance</p>
                      <p className="text-lg font-semibold text-stone-900 leading-tight">{formatMoney(g.balance, g.currency)}</p>
                    </div>
                    <p className="text-[10px] text-stone-400">of {formatMoney(g.initialAmount, g.currency)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${Math.max(100 - usedPct, 2)}%` }} />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2">
                    {g.expiryAt ? `Expires ${formatDate(g.expiryAt, { month: "short", day: "numeric", year: "numeric" })}` : "No expiry"}
                  </p>
                </div>
              );
            })}
            {data.giftCards.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
                <EmptyState icon={<Gift className="size-5" />} title="No gift cards yet" description="Sold gift cards and their balances appear here." />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── POS dialog ── */}
      <Dialog open={posOpen} onOpenChange={(o) => { setPosOpen(o); if (!o) setPosError(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto auralis-scroll">
          <DialogHeader>
            <DialogTitle className="font-display">New sale (POS)</DialogTitle>
            <DialogDescription>Create a manual invoice — optionally take payment immediately.</DialogDescription>
          </DialogHeader>

          {posSuccess ? (
            <div className="py-6 flex flex-col items-center text-center gap-2">
              <span className="size-12 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center"><CheckCircle2 className="size-6" /></span>
              <p className="font-medium text-stone-800">Sale complete</p>
              <p className="text-sm text-stone-500">
                Invoice <span className="font-mono font-semibold text-stone-700">{posSuccess.number}</span> for{" "}
                <strong>{formatMoney(posSuccess.total, posSuccess.currency)}</strong> created{posMarkPaid ? " and paid" : " — awaiting payment"}.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setPosSuccess(null); setPosItems([{ name: "", unitPrice: "", qty: "1" }]); setPosPatientId(""); setPosDiscount("0"); }}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Another sale</button>
                <button onClick={() => setPosOpen(false)}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors">Done</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-1">
                {/* patient picker */}
                <div className="grid gap-1.5">
                  <Label className="text-xs text-stone-600">Patient *</Label>
                  <div className="relative">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <Input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Filter patients…"
                      className="h-9 pl-8 border-stone-200 focus-visible:ring-emerald-600/30" />
                  </div>
                  {patients === null ? (
                    <p className="text-xs text-stone-400 py-1.5 animate-pulse">Loading patients…</p>
                  ) : (
                    <Select value={posPatientId} onValueChange={(v) => {
                      setPosPatientId(v);
                      const p = patients.find((x) => x.id === v);
                      if (p?.branch?.id) setPosBranchId(p.branch.id);
                    }}>
                      <SelectTrigger className="w-full border-stone-200"><SelectValue placeholder="Choose patient" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {patients
                          .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
                          .slice(0, 60)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}{p.branch ? ` · ${p.branch.code}` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* line items */}
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-stone-600">Line items *</Label>
                    <button onClick={() => setPosItems([...posItems, { name: "", unitPrice: "", qty: "1" }])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                      <Plus className="size-3.5" /> Add item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {posItems.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={it.name} onChange={(e) => setPosItems(posItems.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                          placeholder="Treatment or product" className="flex-1 h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
                        <Input type="number" min={0} step="0.01" value={it.unitPrice}
                          onChange={(e) => setPosItems(posItems.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)))}
                          placeholder="Price" className="w-24 h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
                        <Input type="number" min={1} value={it.qty}
                          onChange={(e) => setPosItems(posItems.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                          className="w-16 h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
                        <button onClick={() => setPosItems(posItems.length > 1 ? posItems.filter((_, i) => i !== idx) : [{ name: "", unitPrice: "", qty: "1" }])}
                          className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors" aria-label="Remove item">
                          {posItems.length > 1 ? <Trash2 className="size-4" /> : <X className="size-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pos-discount" className="text-xs text-stone-600">Discount</Label>
                    <Input id="pos-discount" type="number" min={0} value={posDiscount} onChange={(e) => setPosDiscount(e.target.value)}
                      className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-stone-600">Branch</Label>
                    <Select value={posBranch?.id ?? ""} onValueChange={setPosBranchId}>
                      <SelectTrigger className="w-full border-stone-200"><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {(boot?.branches ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name} · {b.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-200/80 bg-stone-50/60 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={posMarkPaid} onCheckedChange={setPosMarkPaid} id="pos-paid" />
                    <Label htmlFor="pos-paid" className="text-xs text-stone-700">Mark as paid</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-stone-500">Method</Label>
                    <Select value={posMethod} onValueChange={setPosMethod}>
                      <SelectTrigger className="h-8 w-32 border-stone-200 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["CARD", "CASH", "STRIPE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* totals preview */}
                <div className="rounded-xl border border-stone-200/80 px-3.5 py-3 text-sm">
                  <div className="flex justify-between text-stone-500 text-xs"><span>Subtotal</span><span>{formatMoney(posTotals.subtotal, posBranch?.currency ?? tenantCurrency)}</span></div>
                  <div className="flex justify-between text-stone-500 text-xs mt-1"><span>Discount</span><span>−{formatMoney(posTotals.discount, posBranch?.currency ?? tenantCurrency)}</span></div>
                  <div className="flex justify-between text-stone-500 text-xs mt-1">
                    <span>{(posBranch?.currency ?? "USD") === "GBP" ? "VAT" : "Sales tax"} {posTotals.taxRate}%</span>
                    <span>{formatMoney(posTotals.tax, posBranch?.currency ?? tenantCurrency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-stone-900 mt-2 pt-2 border-t border-stone-100">
                    <span>Total</span><span>{formatMoney(posTotals.total, posBranch?.currency ?? tenantCurrency)}</span>
                  </div>
                </div>

                {posError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{posError}</p>}
              </div>

              <DialogFooter>
                <button onClick={() => setPosOpen(false)} className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
                <button onClick={submitPos} disabled={posSaving}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors disabled:opacity-50">
                  {posSaving ? "Creating…" : "Create invoice"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Refund dialog ── */}
      <Dialog open={refundTarget !== null} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Refund invoice</DialogTitle>
            <DialogDescription>
              {refundTarget?.number} · {refundTarget ? formatMoney(refundTarget.total, refundTarget.currency) : ""} — issue a full or partial refund.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-1">
            <Label htmlFor="refund-amount" className="text-xs text-stone-600">Refund amount ({refundTarget?.currency ?? "USD"})</Label>
            <Input id="refund-amount" type="number" min={0} step="0.01" value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)} className="border-stone-200 focus-visible:ring-emerald-600/30" />
          </div>
          <DialogFooter>
            <button onClick={() => setRefundTarget(null)} className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={submitRefund} disabled={refunding}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50">
              {refunding ? "Refunding…" : "Issue refund"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </motion.div>
  );
}
