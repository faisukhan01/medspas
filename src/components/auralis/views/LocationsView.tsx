"use client";

// ═══════════════════════════════════════════════════════════════
//  Locations — dual-region (US + UK) branch directory & performance
// ═══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Armchair, Clock, Mail, MapPin, Phone, Syringe, Users, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, PageHeader, StatCard, Money, Loading, ErrorNote, EmptyState, pct } from "../ui";

interface RoomRow { id: string; name: string; type: string }
interface BranchPerf { revenue30d: number; appointments30d: number; noShowRate: number; patients: number }
interface BranchRow {
  id: string; name: string; code: string; country: string; currency: string; timezone: string;
  city: string | null; address: string | null; phone: string | null; email: string | null;
  openTime: string; closeTime: string; taxRate: number; isActive: boolean;
  rooms: RoomRow[]; perf: BranchPerf;
}

const ROOM_TYPE_META: Record<string, { icon: typeof Zap; className: string }> = {
  LASER: { icon: Zap, className: "bg-amber-50 border-amber-200/70 text-amber-800" },
  CONSULT: { icon: Users, className: "bg-teal-50 border-teal-200/70 text-teal-800" },
  INJECTABLES: { icon: Syringe, className: "bg-rose-50 border-rose-200/70 text-rose-800" },
  TREATMENT: { icon: Armchair, className: "bg-stone-100 border-stone-200 text-stone-600" },
};

const flagFor = (country: string, currency: string) =>
  country === "UK" || country === "GB" || currency === "GBP" ? "🇬🇧" : "🇺🇸";

function NoShowChip({ rate }: { rate: number }) {
  const tone = rate > 10
    ? "bg-rose-100 text-rose-700 border-rose-200"
    : rate > 5
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-emerald-100 text-emerald-800 border-emerald-200";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", tone)}>{rate}% no-show</span>;
}

export default function LocationsView() {
  const [branches, setBranches] = useState<BranchRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    api<{ branches: BranchRow[] }>("/api/branches")
      .then((d) => setBranches(d.branches))
      .catch(setError);
  }, []);

  const summary = useMemo(() => {
    const list = branches ?? [];
    const isUK = (b: BranchRow) => b.currency === "GBP" || b.country === "UK" || b.country === "GB";
    const us = list.filter((b) => !isUK(b));
    const uk = list.filter(isUK);
    return {
      us: { count: us.length, revenue: us.reduce((s, b) => s + b.perf.revenue30d, 0) },
      uk: { count: uk.length, revenue: uk.reduce((s, b) => s + b.perf.revenue30d, 0) },
      topRevenue: Math.max(...list.map((b) => b.perf.revenue30d), 1),
    };
  }, [branches]);

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!branches) return <div className="p-6 pt-10"><Loading label="Loading locations" rows={4} /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Locations"
        subtitle="A dual-region group — US clinics settle in USD with sales tax, UK clinics in GBP with 20% VAT."
      />

      {/* Country summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-2xl">
        <StatCard
          label="🇺🇸 United States"
          value={`${summary.us.count} branch${summary.us.count === 1 ? "" : "es"}`}
          sub={<span>Combined 30d revenue <strong className="text-stone-700"><Money amount={summary.us.revenue} currency="USD" /></strong></span>}
          icon={<MapPin className="size-4" />} accent="#047857"
        />
        <StatCard
          label="🇬🇧 United Kingdom"
          value={`${summary.uk.count} branch${summary.uk.count === 1 ? "" : "es"}`}
          sub={<span>Combined 30d revenue <strong className="text-stone-700"><Money amount={summary.uk.revenue} currency="GBP" /></strong></span>}
          icon={<MapPin className="size-4" />} accent="#b45309"
        />
      </div>

      {branches.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <EmptyState icon={<MapPin className="size-5" />} title="No locations yet"
            description="Branches appear here as soon as they are created." />
        </div>
      )}

      {/* Branch cards */}
      <div className="grid gap-4 mt-4 lg:grid-cols-2 2xl:grid-cols-3">
        {branches.map((b, i) => {
          const flag = flagFor(b.country, b.currency);
          const isUK = b.currency === "GBP";
          const taxLabel = isUK ? `VAT ${b.taxRate}%` : `Sales tax ${b.taxRate}%`;
          const share = pct(b.perf.revenue30d, summary.topRevenue);
          return (
            <motion.article
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.06, 0.24) }}
              className="rounded-2xl border border-stone-200/80 bg-white shadow-sm hover:shadow-md transition-shadow p-5"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <span className="size-10 rounded-xl bg-emerald-700/10 text-emerald-800 grid place-items-center shrink-0">
                  <MapPin className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg leading-none">{flag}</span>
                    <h3 className="font-display text-base font-semibold text-stone-900 truncate">{b.name}</h3>
                    <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">{b.code}</span>
                    {!b.isActive && <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">Inactive</span>}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {b.city ?? "—"}{b.address ? ` · ${b.address}` : ""}
                  </p>
                </div>
              </div>

              {/* Contact + hours */}
              <div className="mt-3 grid gap-1.5 text-xs text-stone-600">
                <p className="flex items-center gap-1.5"><Phone className="size-3.5 text-stone-400" />{b.phone ?? "—"}</p>
                <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 text-stone-400 shrink-0" /><span className="truncate">{b.email ?? "—"}</span></p>
                <p className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-stone-400" />
                  {b.openTime}–{b.closeTime}
                  <span className="text-stone-400">· {b.timezone}</span>
                </p>
              </div>

              {/* Currency / tax / patients */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                  {isUK ? "£ GBP" : "$ USD"}
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  isUK ? "bg-amber-50 border-amber-200/70 text-amber-800" : "bg-emerald-50 border-emerald-200/70 text-emerald-800")}>
                  {taxLabel}
                </span>
                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {b.perf.patients} patients
                </span>
              </div>

              {/* Rooms */}
              {b.rooms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {b.rooms.map((r) => {
                    const meta = ROOM_TYPE_META[r.type] ?? ROOM_TYPE_META.TREATMENT;
                    const Icon = meta.icon;
                    return (
                      <span key={r.id} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.className)}>
                        <Icon className="size-3" />{r.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Performance */}
              <div className="border-t border-stone-100 mt-4 pt-3.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-stone-400">Revenue · 30d</p>
                    <p className="text-lg font-semibold text-stone-900 leading-tight"><Money amount={b.perf.revenue30d} currency={b.currency} /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-stone-400">Appointments</p>
                    <p className="text-sm font-semibold text-stone-700">{b.perf.appointments30d}</p>
                  </div>
                  <NoShowChip rate={b.perf.noShowRate} />
                </div>

                {/* Revenue share vs top branch */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                    <span>Share of top branch</span>
                    <span>{share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", share >= 100 ? "bg-amber-500" : "bg-emerald-600")}
                      style={{ width: `${Math.max(share, 3)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="h-2" />
    </motion.div>
  );
}
