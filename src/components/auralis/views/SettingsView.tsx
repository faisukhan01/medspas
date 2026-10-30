"use client";

// ═══════════════════════════════════════════════════════════════
//  Settings — tenant, booking policy, compliance, personas, integrations
// ═══════════════════════════════════════════════════════════════
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Database, Globe, Info, Loader2, LogIn, Mail, PhoneCall, RefreshCcw,
  ScrollText, ShieldCheck, Star, UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { useApp } from "../store";
import { post, PageHeader, SectionCard, Loading } from "../ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const INTEGRATIONS = [
  { name: "Stripe", blurb: "Card payments, deposits & POS settlements", icon: CreditCard, tone: "text-emerald-700 bg-emerald-50" },
  { name: "Twilio", blurb: "SMS blasts, AI voice calls & verification", icon: PhoneCall, tone: "text-teal-700 bg-teal-50" },
  { name: "Resend", blurb: "Transactional email & campaign delivery", icon: Mail, tone: "text-amber-700 bg-amber-50" },
  { name: "Google", blurb: "Reviews, Business Profile & booking links", icon: Star, tone: "text-stone-600 bg-stone-100" },
] as const;

const BOOKING_POLICIES = [
  { label: "Deposits over $300 / £240", note: "Card hold required at booking for high-value treatments" },
  { label: "24h cancellation window", note: "Late cancellations inside 24h forfeit the deposit" },
  { label: "$50 no-show fee", note: "Charged automatically when a confirmed visit is missed" },
  { label: "Online booking", note: "Patients self-book via the public booking page" },
  { label: "AI booking agent", note: "Front-desk AI books and confirms around the clock" },
] as const;

export default function SettingsView() {
  const { boot } = useApp();
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const switchIdentity = useCallback(async (email: string) => {
    setSigningIn(email);
    setSwitchError(null);
    try {
      await post("/api/auth/me", { email });
      window.location.reload();
    } catch (e) {
      setSigningIn(null);
      setSwitchError(e instanceof Error ? e.message : "Could not switch identity.");
    }
  }, []);

  if (!boot) return <div className="p-6 pt-10"><Loading label="Loading settings" rows={4} /></div>;

  const countries = [...new Set(boot.branches.map((b) => (b.country === "UK" || b.country === "GB" ? "🇬🇧 UK" : "🇺🇸 US")))];
  const turso = boot.dbMode === "TURSO";
  const currentEmail = boot.user?.email;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Settings"
        subtitle="Tenant configuration, policies, compliance posture and demo controls for Auralis OS."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* ── Business ── */}
        <SectionCard title="Business" subtitle="Tenant & platform">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-2xl bg-emerald-700/10 grid place-items-center text-xl shrink-0">{boot.tenant.logoEmoji}</span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-stone-900 truncate">{boot.tenant.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="rounded-full bg-emerald-700/10 border border-emerald-700/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  {boot.tenant.plan} plan
                </span>
                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {boot.tenant.status}
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-stone-500">Countries</dt>
              <dd className="font-medium text-stone-700">{countries.length > 0 ? countries.join(" · ") : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-stone-500">Base currency</dt>
              <dd className="font-medium text-stone-700">{boot.tenant.currency === "GBP" ? "£ GBP" : "$ USD"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-stone-500">Branches</dt>
              <dd className="font-medium text-stone-700">{boot.branches.length}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2.5">
            <p className="text-xs font-semibold text-stone-700">Auralis OS v1.0</p>
            <p className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
              <span className={cn("size-2 rounded-full", turso ? "bg-emerald-500" : "bg-amber-500")} />
              <Database className="size-3 text-stone-400" />
              {turso ? "Turso cloud" : "Local fallback"}
              <span className="text-stone-400">· {boot.counts.patients} patients · {boot.counts.appointments} appointments</span>
            </p>
          </div>
        </SectionCard>

        {/* ── Booking policy ── */}
        <SectionCard title="Booking policy" subtitle="Group-wide defaults (read-only in demo)">
          <ul className="space-y-3.5">
            {BOOKING_POLICIES.map((p) => (
              <li key={p.label} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800">{p.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{p.note}</p>
                </div>
                <Switch checked disabled aria-label={p.label} className="mt-0.5 shrink-0" />
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* ── Compliance ── */}
        <SectionCard title="Compliance" subtitle="Posture & data handling">
          <ul className="space-y-3.5">
            <li className="flex items-start gap-3">
              <span className="size-8 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"><ShieldCheck className="size-4" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-800">HIPAA mode</p>
                  <Switch checked disabled aria-label="HIPAA mode" className="scale-75" />
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">Architecture ready — verify BAAs before production</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="size-8 rounded-xl bg-amber-50 text-amber-700 grid place-items-center shrink-0"><Globe className="size-4" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-800">UK GDPR mode</p>
                  <Switch checked disabled aria-label="UK GDPR mode" className="scale-75" />
                </div>
                <p className="text-xs text-stone-500 mt-0.5">PECR consent enforced for SMS & email marketing; UK branches keep EU/UK data residency.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="size-8 rounded-xl bg-stone-100 text-stone-600 grid place-items-center shrink-0"><ScrollText className="size-4" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-800">Audit trail</p>
                  <Switch checked disabled aria-label="Audit trail" className="scale-75" />
                </div>
                <p className="text-xs text-stone-500 mt-0.5">Every create, update and mutation is written to the audit log.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5">
              <Info className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800/90">
                <strong className="font-semibold">Demo data:</strong> all patients, staff, invoices and records in this workspace are fictional and generated for demonstration only.
              </p>
            </li>
          </ul>
        </SectionCard>

        {/* ── Demo personas ── */}
        <SectionCard title="Demo personas" subtitle="Switch identity to preview any role instantly">
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((acct) => {
              const isCurrent = currentEmail === acct.email;
              const busy = signingIn === acct.email;
              return (
                <li key={acct.email}
                  className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                    isCurrent ? "border-emerald-600/30 bg-emerald-50/60" : "border-stone-200/80 bg-white hover:border-emerald-600/30")}>
                  <span className={cn("size-8 rounded-xl grid place-items-center shrink-0", isCurrent ? "bg-emerald-700/10 text-emerald-800" : "bg-stone-100 text-stone-500")}>
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate flex items-center gap-1.5">
                      {acct.name}
                      {isCurrent && <span className="rounded-full bg-emerald-700 text-white px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide">Current</span>}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{acct.role} · <span className="font-mono">{acct.email}</span></p>
                  </div>
                  <button
                    onClick={() => switchIdentity(acct.email)}
                    disabled={signingIn !== null}
                    className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                      isCurrent ? "border-stone-200 text-stone-400" : "border-emerald-700/30 text-emerald-800 hover:bg-emerald-700 hover:text-white hover:border-emerald-700",
                      signingIn !== null && !busy && "opacity-50")}
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <LogIn className="size-3.5" />}
                    {isCurrent ? "Current" : "Sign in as"}
                  </button>
                </li>
              );
            })}
          </ul>
          {switchError && <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{switchError}</p>}
        </SectionCard>

        {/* ── Integrations ── */}
        <SectionCard title="Integrations" subtitle="Connectors ship enabled in production tenants">
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {INTEGRATIONS.map((int) => (
              <li key={int.name} className="rounded-xl border border-stone-200/80 bg-white px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn("size-8 rounded-xl grid place-items-center shrink-0", int.tone)}>
                    <int.icon className="size-4" />
                  </span>
                  <p className="text-sm font-medium text-stone-800">{int.name}</p>
                </div>
                <p className="text-[11px] text-stone-500 mt-2 min-h-8">{int.blurb}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-stone-400">Not connected in demo</span>
                  <button disabled className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-medium text-stone-400 cursor-not-allowed">
                    Connect
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* ── Danger zone ── */}
        <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-rose-900">Danger zone</h2>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Resetting re-seeds the entire demo tenant server-side via <span className="font-mono">prisma/seed.ts</span> — every patient, invoice and appointment returns to its seeded state.
              </p>
            </div>
            <button
              onClick={() => setResetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
            >
              <RefreshCcw className="size-4" /> Reset demo data
            </button>
          </div>
        </div>
      </div>

      {/* Reset confirm dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Reset demo data?</DialogTitle>
            <DialogDescription>
              This wipes the demo tenant and re-runs the seed script server-side. All changes made in this session —
              new staff, invoices, stock adjustments, identity switches — are discarded and the original fictional dataset is restored.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 flex items-start gap-2.5">
            <Info className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800/90">
              Disabled in this demo build — data resets are performed by running <span className="font-mono font-semibold">npx prisma db seed</span> on the server, never from the browser.
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setResetOpen(false)}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Keep my data</button>
            <button disabled
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm cursor-not-allowed opacity-60"
              title="Server-side re-seed only — run prisma/seed.ts">
              Reset everything
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </motion.div>
  );
}
