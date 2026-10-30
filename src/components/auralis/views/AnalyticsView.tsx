"use client";

// ── Analytics & Reporting — revenue, retention, marketing ROI, ops tables ─────
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Target, TrendingUp, Wallet } from "lucide-react";
import { useApp } from "../store";
import {
  api, PageHeader, StatCard, SectionCard, Money, Loading, ErrorNote, ProgressRing,
} from "../ui";
import { CAMPAIGN_TYPE_LABELS, SERVICE_CATEGORIES_ICONS } from "@/lib/constants";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnalyticsData {
  monthly: { month: string; label: string; revenue: number; appointments: number; noShows: number; newPatients: number }[];
  branches: { name: string; code: string; currency: string; revenue: number; appts: number; noShows: number }[];
  serviceMix: { category: string; revenue: number; count: number }[];
  retention: { rate: number; returning: number; total: number; avgLtv: number; churnRisk: number };
  marketing: {
    campaigns: { name: string; type: string; sent: number; converted: number; revenue: number; cost: number; roi: number }[];
    totalRevenue: number; totalCost: number; roi: number;
  };
  noShowTrend: { month: string; monthKey: string; rate: number }[];
  paymentMethods: { method: string; amount: number }[];
  leadVelocity: number;
  pipelineValue: number;
}

const METHOD_LABELS: Record<string, string> = {
  CARD: "Credit / debit card", STRIPE: "Stripe checkout", CASH: "Cash",
  APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", GIFT_CARD: "Gift card", BANK: "Bank transfer",
};

const tooltipStyle = { borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 };

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: "easeOut" as const },
});

function roiChipCls(roi: number): string {
  if (roi > 300) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (roi > 100) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-600 border-stone-200";
}

export default function AnalyticsView() {
  const currency = useApp((s) => s.boot?.tenant.currency ?? "USD");
  const [months, setMonths] = useState("6");
  const [loaded, setLoaded] = useState<{ months: string; data: AnalyticsData | null }>({ months: "6", data: null });
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    api<AnalyticsData>(`/api/analytics?months=${months}`)
      .then((d) => { if (!cancelled) setLoaded({ months, data: d }); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [months]);

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  // Show the loading skeleton whenever the rendered range is not the loaded one.
  const data = loaded.months === months ? loaded.data : null;
  if (!data) return <div className="p-6 pt-10"><Loading label={`Crunching ${months} months of data`} rows={6} /></div>;

  const branchTotal = data.branches.reduce((s, b) => s + b.revenue, 0);
  const maxCatRevenue = Math.max(...data.serviceMix.map((c) => c.revenue), 1);
  const pmTotal = data.paymentMethods.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Analytics & Reporting"
        subtitle="Revenue, retention and marketing performance across the group."
        actions={
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger size="sm" className="w-36 rounded-full border-stone-200 bg-white text-sm text-stone-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Avg patient LTV" value={<Money amount={data.retention.avgLtv} currency={currency} />}
          sub={`${data.retention.total} patients analysed`} icon={<Wallet className="size-4" />} accent="#047857" />
        <StatCard label="Retention rate" value={`${data.retention.rate}%`}
          sub={`${data.retention.returning} of ${data.retention.total} returned`}
          icon={<ProgressRing value={data.retention.rate} size={40} stroke={4} />} accent="#0d9488" />
        <StatCard label="Pipeline value" value={<Money amount={data.pipelineValue} currency={currency} />}
          sub={`${data.leadVelocity} new leads in period`} icon={<TrendingUp className="size-4" />} accent="#b45309" />
        <StatCard label="Marketing ROI" value={`${data.marketing.roi}%`}
          sub={<><Money amount={data.marketing.totalCost} currency={currency} /> spend → <Money amount={data.marketing.totalRevenue} currency={currency} /></>}
          icon={<Target className="size-4" />} accent="#d97706" />
      </div>

      {/* Revenue + no-show charts */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <motion.div {...fade(0.05)} className="lg:col-span-2">
          <SectionCard title="Monthly revenue" subtitle={`Collected revenue · last ${months} months`}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#047857" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div {...fade(0.08)}>
          <SectionCard title="No-show rate" subtitle="Missed appointments per month">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.noShowTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, "No-show rate"]} />
                  <Line type="monotone" dataKey="rate" stroke="#d97706" strokeWidth={2}
                    dot={{ r: 3, fill: "#d97706", strokeWidth: 0 }} activeDot={{ r: 4, fill: "#b45309" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Service mix + branch comparison */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <motion.div {...fade(0.1)}>
          <SectionCard title="Service mix" subtitle="Revenue by treatment category">
            {data.serviceMix.length === 0 ? (
              <p className="text-sm text-stone-400 py-6 text-center">No completed treatments in this period.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto auralis-scroll">
                {data.serviceMix.map((s) => (
                  <div key={s.category}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="text-stone-600 font-medium truncate">
                        {SERVICE_CATEGORIES_ICONS[s.category] ?? "✦"} {s.category}
                      </span>
                      <span className="text-stone-400 shrink-0">
                        {s.count} visits · <Money amount={s.revenue} currency={currency} />
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                        style={{ width: `${pct(s.revenue, maxCatRevenue)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>

        <motion.div {...fade(0.12)}>
          <SectionCard title="Branch comparison" subtitle={`Revenue and activity · last ${months} months`}>
            {data.branches.length === 0 ? (
              <p className="text-sm text-stone-400 py-6 text-center">No appointment activity in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-200">
                      <th className="py-2 font-medium">Branch</th>
                      <th className="py-2 font-medium text-right">Revenue</th>
                      <th className="py-2 font-medium text-right">Appts</th>
                      <th className="py-2 font-medium text-right">No-shows</th>
                      <th className="py-2 pl-4 font-medium w-36">Revenue share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.branches.map((b) => (
                      <tr key={b.code}>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">{b.code}</span>
                            <span className="text-stone-800 font-medium truncate max-w-36">{b.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <Money amount={b.revenue} currency={b.currency} className="font-semibold text-stone-700" />
                        </td>
                        <td className="py-2.5 text-right text-stone-600">{b.appts}</td>
                        <td className="py-2.5 text-right text-stone-600">
                          {b.noShows} <span className="text-[10px] text-stone-400">({pct(b.noShows, b.appts)}%)</span>
                        </td>
                        <td className="py-2.5 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                                style={{ width: `${pct(b.revenue, branchTotal)}%` }} />
                            </div>
                            <span className="text-[10px] text-stone-400 w-8 text-right">{pct(b.revenue, branchTotal)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </motion.div>
      </div>

      {/* Marketing performance */}
      <motion.div {...fade(0.14)} className="mt-4">
        <SectionCard title="Marketing performance" subtitle="Campaign ROI · delivery cost modelled per message">
          {data.marketing.campaigns.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">No sent campaigns in this period yet.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto auralis-scroll">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-200">
                    <th className="py-2 font-medium">Campaign</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium text-right">Sent</th>
                    <th className="py-2 font-medium text-right">Converted</th>
                    <th className="py-2 font-medium text-right">Revenue</th>
                    <th className="py-2 font-medium text-right">Cost</th>
                    <th className="py-2 font-medium text-right">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.marketing.campaigns.map((c, i) => (
                    <tr key={`${c.name}-${i}`} className="hover:bg-stone-50/60">
                      <td className="py-2.5 font-medium text-stone-800 max-w-56 truncate">{c.name}</td>
                      <td className="py-2.5">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                          {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-stone-600">{c.sent}</td>
                      <td className="py-2.5 text-right text-stone-600">{c.converted}</td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <Money amount={c.revenue} currency={currency} className="font-semibold text-emerald-800" />
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap text-stone-500">
                        <Money amount={c.cost} currency={currency} />
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", roiChipCls(c.roi))}>
                          {c.roi > 0 ? "+" : ""}{c.roi}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Payment methods */}
      <motion.div {...fade(0.16)} className="mt-4">
        <SectionCard title="Payment methods" subtitle={`Collected revenue by method · last ${months} months`}>
          {data.paymentMethods.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">No payments recorded in this period.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {data.paymentMethods.map((p) => (
                <div key={p.method}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-medium text-stone-600 truncate">{METHOD_LABELS[p.method] ?? p.method}</span>
                    <span className="text-stone-400 shrink-0">
                      <Money amount={p.amount} currency={currency} /> · {pct(p.amount, pmTotal)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-600 transition-all duration-700"
                      style={{ width: `${pct(p.amount, pmTotal)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      <div className="h-2" />
    </div>
  );
}
