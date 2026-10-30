"use client";

import { useEffect, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, CalendarCheck, DollarSign, Filter, Sparkles, TrendingUp, UserPlus,
} from "lucide-react";
import { useApp } from "../store";
import { api, PageHeader, StatCard, SectionCard, StatusBadge, Avatar, Money, Loading, ErrorNote, formatTime, formatDate } from "../ui";
import { APPOINTMENT_STATUS_META, LEAD_STATUS_META } from "@/lib/constants";
import { pct } from "@/lib/format";

interface DashboardData {
  kpis: {
    todayAppointments: number; revenue30: number; revenue7: number; refunds30: number;
    newPatients30: number; totalPatients: number; returningPatients: number; returningRate: number;
    activeLeads: number; conversionRate: number; noShowRate: number; completed30: number;
  };
  revenueSeries: { date: string; revenue: number; bookings: number }[];
  upcoming: {
    id: string; startsAt: string; status: string; price: number; source: string;
    patient: { id: string; firstName: string; lastName: string; avatarColor: string };
    provider: { id: string; name: string; avatarColor: string };
    service: { id: string; name: string; emoji: string };
    branch: { id: string; name: string; code: string; currency: string };
  }[];
  topServices: { name: string; emoji: string; category: string | null; revenue: number; count: number }[];
  staffPerf: { id: string; name: string; color: string; title: string | null; appts: number; revenue: number; completed: number }[];
  branchPerf: { id: string; name: string; code: string; currency: string; revenue: number; appts: number }[];
  leadFunnel: { status: string; count: number }[];
  leadSources: { source: string; count: number }[];
}

export default function DashboardView() {
  const { boot, branchFilter, setView } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<unknown>(null);
  // Tracks which branch slice is loaded — switching branches shows the
  // skeleton without a synchronous setState inside the effect.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DashboardData>(`/api/dashboard?branchId=${branchFilter}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedFor(branchFilter);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setLoadedFor(branchFilter);
      });
    return () => {
      cancelled = true;
    };
  }, [branchFilter]);

  if (loadedFor !== branchFilter) {
    return <div className="p-6 pt-10"><Loading label="Crunching 30 days of clinic data" rows={6} /></div>;
  }
  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!data) return <div className="p-6 pt-10"><Loading label="Crunching 30 days of clinic data" rows={6} /></div>;

  const k = data.kpis;
  const funnelMax = Math.max(...data.leadFunnel.map((f) => f.count), 1);
  const series = data.revenueSeries.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${boot?.user?.name.split(" ")[0]}`}
        subtitle="Here's what's happening across your medspa group today."
        actions={
          <button onClick={() => setView("appointments")} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:border-emerald-600/40 transition-colors">
            <CalendarCheck className="size-4 text-emerald-700" /> Open calendar
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Revenue · 30 days" value={<Money amount={k.revenue30} currency={boot?.branches[0]?.currency ?? "USD"} />}
          sub={`$${Math.round(k.revenue30 / 30).toLocaleString()} daily average`} icon={<DollarSign className="size-4" />} accent="#047857" />
        <StatCard label="Today's appointments" value={k.todayAppointments}
          sub={`${k.completed30} completed in 30d`} icon={<CalendarCheck className="size-4" />} accent="#0d9488" />
        <StatCard label="New patients · 30d" value={k.newPatients30}
          sub={`${k.totalPatients} total · ${k.returningRate}% returning`} icon={<UserPlus className="size-4" />} accent="#b45309" />
        <StatCard label="Lead conversion" value={`${k.conversionRate}%`}
          sub={`${k.activeLeads} active in pipeline`} icon={<Filter className="size-4" />} accent="#7c3aed" />
      </div>

      {/* Revenue + funnel */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <SectionCard title="Revenue & bookings" subtitle="Last 30 days" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047857" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
                  formatter={(value: number, name: string) => [name === "revenue" ? `$${value.toLocaleString()}` : value, name]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#047857" strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Lead funnel" subtitle="Pipeline by stage" actions={
          <button onClick={() => setView("leads")} className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1">
            Pipeline <ArrowUpRight className="size-3" />
          </button>
        }>
          <div className="space-y-2.5 mt-1">
            {data.leadFunnel.map((f) => {
              const meta = LEAD_STATUS_META[f.status];
              return (
                <div key={f.status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-stone-600 font-medium">{meta?.label ?? f.status}</span>
                    <span className="text-stone-400">{f.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(f.count / funnelMax) * 100}%`, backgroundColor: meta?.accent ?? "#047857" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Upcoming + staff/branch */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <SectionCard title="Upcoming appointments" subtitle="Next 8 on the calendar" className="lg:col-span-2">
          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto auralis-scroll">
            {data.upcoming.length === 0 && <p className="text-sm text-stone-400 py-6 text-center">No upcoming appointments in this view.</p>}
            {data.upcoming.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="w-16 shrink-0 text-center">
                  <p className="text-sm font-semibold text-stone-800">{formatTime(a.startsAt)}</p>
                  <p className="text-[10px] text-stone-400">{formatDate(a.startsAt)}</p>
                </div>
                <Avatar name={`${a.patient.firstName} ${a.patient.lastName}`} color={a.patient.avatarColor} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{a.patient.firstName} {a.patient.lastName}</p>
                  <p className="text-xs text-stone-500 truncate">{a.service.emoji} {a.service.name} · {a.provider.name}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <Money amount={a.price} currency={a.branch.currency} className="text-sm font-semibold text-stone-700" />
                  <p className="text-[10px] text-stone-400">{a.branch.code}</p>
                </div>
                <StatusBadge meta={APPOINTMENT_STATUS_META[a.status]} value={a.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Staff performance" subtitle="30-day revenue by provider">
            <div className="space-y-2.5">
              {data.staffPerf.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.name} color={s.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{s.name}</p>
                    <div className="h-1.5 rounded-full bg-stone-100 mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-700" style={{ width: `${pct(s.revenue, data.staffPerf[0]?.revenue || 1)}%` }} />
                    </div>
                  </div>
                  <Money amount={s.revenue} className="text-xs font-semibold text-stone-600" />
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Branch comparison" subtitle="30-day revenue">
            <div className="space-y-2.5">
              {data.branchPerf.map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">{b.code}</span>
                    <span className="text-sm text-stone-700 truncate max-w-36">{b.name}</span>
                  </div>
                  <div className="text-right">
                    <Money amount={b.revenue} currency={b.currency} className="text-sm font-semibold text-stone-700" />
                    <p className="text-[10px] text-stone-400">{b.appts} appts</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Top services */}
      <SectionCard title="Top treatments" subtitle="30-day revenue by service" className="mt-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.topServices.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-4 py-3">
              <span className="text-xl">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 truncate">{s.name}</p>
                <p className="text-xs text-stone-500">{s.count} treatments</p>
              </div>
              <Money amount={s.revenue} className="text-sm font-semibold text-emerald-800" />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* AI insight strip */}
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 flex items-start gap-3">
        <Sparkles className="size-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">AI insight</p>
          <p className="text-amber-800/90 mt-0.5">
            No-show rate is <strong>{k.noShowRate}%</strong> this month. The Loyalty Agent has drafted win-back SMS for
            {" "}{data.leadSources.find((s) => s.source === "AI_AGENT")?.count ?? 0}+ AI-captured leads — open the <button className="underline underline-offset-2 font-medium" onClick={() => setView("ai-growth")}>AI Growth Center</button> to review and send.
          </p>
        </div>
        <TrendingUp className="size-4 text-amber-500 ml-auto shrink-0 mt-1" />
      </div>
      <div className="h-2" />
    </div>
  );
}
