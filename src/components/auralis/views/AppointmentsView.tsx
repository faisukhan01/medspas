"use client";

// ═════════════════════════════════════════════════════════════════════════════
//  Auralis — Appointments module
//  Day timeline with provider lanes · Week board · Status workflow · Booking
// ═════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format as fmtDate, startOfDay, startOfWeek } from "date-fns";
import {
  Ban, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, DollarSign, Loader2, Search, User, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "../store";
import {
  api, post, patch, PageHeader, SectionCard, StatusBadge, Avatar, Money,
  Loading, ErrorNote, EmptyState, formatTime, formatDate,
} from "../ui";
import { APPOINTMENT_STATUS_META, APPOINTMENT_STATUSES } from "@/lib/constants";

// status → hex accent for calendar blocks
const STATUS_HEX: Record<string, string> = {
  PENDING: "#d97706", CONFIRMED: "#047857", CHECKED_IN: "#0d9488", IN_PROGRESS: "#7c3aed",
  COMPLETED: "#78716c", CANCELLED: "#e11d48", NO_SHOW: "#dc2626",
};
const NEXT_ACTION: Record<string, { next: string; label: string } | undefined> = {
  PENDING: { next: "CONFIRMED", label: "Confirm appointment" },
  CONFIRMED: { next: "CHECKED_IN", label: "Check in patient" },
  CHECKED_IN: { next: "IN_PROGRESS", label: "Start treatment" },
  IN_PROGRESS: { next: "COMPLETED", label: "Complete visit" },
};

interface Appt {
  id: string; startsAt: string; endsAt: string; status: string; source: string;
  price: number; depositAmount: number; depositPaid: boolean; notes: string | null;
  cancellationReason: string | null;
  patient: { id: string; firstName: string; lastName: string; avatarColor: string; phone?: string };
  provider: { id: string; name: string; avatarColor: string; title?: string | null };
  service: { id: string; name: string; emoji: string; category?: string; durationMin: number; price: number };
  branch: { id: string; name: string; code: string; currency: string; timezone?: string };
}
interface PatientLite { id: string; firstName: string; lastName: string; avatarColor: string; phone: string | null; email: string | null }

const DAY_START = 7 * 60;   // 07:00
const DAY_END = 21 * 60;    // 21:00
const PX_PER_MIN = 1.15;

export default function AppointmentsView() {
  const { boot, branchFilter } = useApp();
  const { toast } = useToast();

  const [mode, setMode] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [appts, setAppts] = useState<Appt[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [mutating, setMutating] = useState<string | null>(null);

  // dialogs
  const [selected, setSelected] = useState<Appt | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [patients, setPatients] = useState<PatientLite[] | null>(null);

  const range = useMemo<{ from: Date; to: Date; label: string }>(() => {
    if (mode === "day") {
      return { from: startOfDay(anchor), to: endOfDay(anchor), label: fmtDate(anchor, "EEEE, MMMM d, yyyy") };
    }
    const wkStart = startOfWeek(anchor, { weekStartsOn: 1 });
    const wkEnd = endOfDay(addDays(wkStart, 6));
    return { from: wkStart, to: wkEnd, label: `${fmtDate(wkStart, "MMM d")} – ${fmtDate(wkEnd, "MMM d, yyyy")}` };
  }, [mode, anchor]);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      branchId: branchFilter, from: range.from.toISOString(), to: range.to.toISOString(),
      ...(providerFilter !== "all" ? { providerId: providerFilter } : {}),
    });
    setError(null);
    api<{ appointments: Appt[] }>(`/api/appointments?${params}`)
      .then((d) => setAppts(d.appointments))
      .catch(setError);
  }, [branchFilter, range, providerFilter]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!appts) return [];
    const needle = q.trim().toLowerCase();
    return appts.filter((a) =>
      statusFilter === "all" || a.status === statusFilter
        ? !needle ||
          `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase().includes(needle) ||
          a.service.name.toLowerCase().includes(needle) ||
          a.provider.name.toLowerCase().includes(needle)
        : false);
  }, [appts, statusFilter, q]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of appts ?? []) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [appts]);

  // ── mutations ───────────────────────────────────────────────────────────
  async function advance(a: Appt) {
    const action = NEXT_ACTION[a.status];
    if (!action) return;
    setMutating(a.id);
    try {
      await patch(`/api/appointments/${a.id}`, { status: action.next });
      toast({ title: action.label === "Complete visit" ? "Visit completed" : `${action.label} ✓`, description: `${a.patient.firstName} ${a.patient.lastName} · ${a.service.name}` });
      setSelected(null); load();
    } catch (e) {
      toast({ title: "Could not update", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally { setMutating(null); }
  }
  async function cancelAppt(reason: string) {
    if (!selected) return;
    setMutating(selected.id);
    try {
      await patch(`/api/appointments/${selected.id}`, { status: "CANCELLED", cancellationReason: reason || "Cancelled by staff" });
      toast({ title: "Appointment cancelled", description: "Patient will be notified to rebook." });
      setSelected(null); load();
    } catch (e) {
      toast({ title: "Could not cancel", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally { setMutating(null); }
  }
  async function toggleDeposit(a: Appt) {
    setMutating(a.id);
    try {
      await patch(`/api/appointments/${a.id}`, { depositPaid: !a.depositPaid });
      toast({ title: a.depositPaid ? "Deposit marked unpaid" : "Deposit marked paid", description: `${a.patient.firstName} ${a.patient.lastName}` });
      setSelected(null); load();
    } finally { setMutating(null); }
  }

  // ── day-view lanes (providers that have bookings today) ─────────────────
  const lanes = useMemo(() => {
    const map = new Map<string, { provider: Appt["provider"]; items: Appt[] }>();
    for (const a of filtered) {
      if (!map.has(a.provider.id)) map.set(a.provider.id, { provider: a.provider, items: [] });
      map.get(a.provider.id)!.items.push(a);
    }
    return [...map.values()].map((l) => ({ ...l, items: l.items.sort((x, y) => +new Date(x.startsAt) - +new Date(y.startsAt)) }));
  }, [filtered]);

  const weekDays = useMemo(() => {
    const wk = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  }, [anchor]);

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Drag-free, conflict-proof scheduling across every provider and location."
        actions={
          <>
            <div className="flex rounded-full border border-stone-200 bg-white p-0.5">
              {(["day", "week"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${mode === m ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-800"}`}>
                  {m === "day" ? "Day" : "Week"}
                </button>
              ))}
            </div>
            <Button onClick={() => { setPatients(null); setBookOpen(true); }}
              className="rounded-full bg-emerald-700 hover:bg-emerald-800 gap-1.5 h-9">
              <CalendarPlus className="size-4" /> New appointment
            </Button>
          </>
        }
      />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center rounded-full border border-stone-200 bg-white">
          <button onClick={() => setAnchor((d) => addDays(d, mode === "day" ? -1 : -7))} className="p-2 text-stone-500 hover:text-stone-900" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-full">{mode === "day" ? "Today" : "This week"}</button>
          <button onClick={() => setAnchor((d) => addDays(d, mode === "day" ? 1 : 7))} className="p-2 text-stone-500 hover:text-stone-900" aria-label="Next"><ChevronRight className="size-4" /></button>
        </div>
        <p className="text-sm font-medium text-stone-700">{range.label}</p>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Patient, service, provider…"
            className="h-8.5 pl-8 w-full sm:w-56 rounded-full bg-white border-stone-200 text-xs" />
        </div>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-xs text-stone-700">
          <option value="all">All providers</option>
          {(boot?.staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* status chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="All" count={appts?.length ?? 0} hex="#44403c" />
        {APPOINTMENT_STATUSES.map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            label={APPOINTMENT_STATUS_META[s].label} count={statusCounts[s] ?? 0} hex={STATUS_HEX[s]} />
        ))}
      </div>

      {error && <ErrorNote error={error} />}
      {!appts && !error && <SectionCard><Loading label="Loading the calendar" rows={5} /></SectionCard>}

      {appts && (
        mode === "day" ? <DayTimeline lanes={lanes} onOpen={setSelected} isToday={range.from.toDateString() === new Date().toDateString()} /> :
        <WeekBoard days={weekDays} appts={filtered} onOpen={setSelected} branchFilter={branchFilter} bootBranches={boot?.branches ?? []} />
      )}

      {selected && (
        <AppointmentDialog appt={selected} onClose={() => setSelected(null)}
          onAdvance={() => advance(selected)} onDeposit={() => toggleDeposit(selected)} onCancel={cancelAppt}
          busy={mutating === selected.id} />
      )}

      <BookingDialog open={bookOpen} onOpenChange={setBookOpen}
        patients={patients} setPatients={setPatients}
        branches={boot?.branches ?? []} services={boot?.services ?? []} staff={boot?.staff ?? []}
        defaultBranchId={branchFilter !== "all" ? branchFilter : boot?.branches[0]?.id}
        defaultDate={mode === "day" ? anchor : new Date()}
        onBooked={(msg) => { toast(msg); setBookOpen(false); load(); }} />
    </div>
  );
}

/* ── chips ─────────────────────────────────────────────────────────────────── */
function Chip({ label, count, active, onClick, hex }: { label: string; count: number; active: boolean; onClick: () => void; hex: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? "text-white border-transparent" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}
      style={active ? { backgroundColor: hex } : undefined}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: active ? "rgba(255,255,255,.85)" : hex }} />
      {label}<span className={active ? "opacity-80" : "text-stone-400"}>{count}</span>
    </button>
  );
}

/* ── day timeline ──────────────────────────────────────────────────────────── */
function DayTimeline({ lanes, onOpen, isToday }: { lanes: { provider: Appt["provider"]; items: Appt[] }[]; onOpen: (a: Appt) => void; isToday: boolean }) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  if (lanes.length === 0)
    return (
      <SectionCard>
        <EmptyState icon={<CalendarDays className="size-5" />} title="Nothing on the calendar"
          description="No appointments match this filter for the selected day." />
      </SectionCard>
    );

  return (
    <SectionCard title="Provider schedule" subtitle="Timeline · 7:00 AM – 9:00 PM" contentClassName="p-0! overflow-hidden">
      <div className="overflow-x-auto auralis-scroll">
        <div className="min-w-max">
          {/* lane headers */}
          <div className="flex border-b border-stone-100 bg-stone-50/60 sticky top-0 z-10">
            <div className="w-14 shrink-0" />
            {lanes.map((l) => (
              <div key={l.provider.id} className="flex items-center gap-2 px-3 py-2.5 min-w-56 border-l border-stone-100">
                <Avatar name={l.provider.name} color={l.provider.avatarColor} size={26} />
                <div>
                  <p className="text-xs font-semibold text-stone-700 leading-tight">{l.provider.name}</p>
                  <p className="text-[10px] text-stone-400">{l.items.length} appt{l.items.length === 1 ? "" : "s"}</p>
                </div>
              </div>
            ))}
          </div>

          {/* grid body */}
          <div className="flex relative">
            {/* hour gutter */}
            <div className="w-14 shrink-0 relative" style={{ height: (DAY_END - DAY_START) * PX_PER_MIN }}>
              {hours.map((m) => (
                <div key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-stone-400" style={{ top: (m - DAY_START) * PX_PER_MIN }}>
                  {fmtTimeLabel(m)}
                </div>
              ))}
            </div>
            {/* lanes */}
            {lanes.map((l) => (
              <div key={l.provider.id} className="relative min-w-56 border-l border-stone-100" style={{ height: (DAY_END - DAY_START) * PX_PER_MIN }}>
                {hours.map((m) => (
                  <div key={m} className="absolute left-0 right-0 border-t border-stone-100/80" style={{ top: (m - DAY_START) * PX_PER_MIN }} />
                ))}
                {l.items.map((a) => {
                  const s = new Date(a.startsAt);
                  const e = new Date(a.endsAt);
                  const sMin = s.getHours() * 60 + s.getMinutes();
                  const eMin = e.getHours() * 60 + e.getMinutes();
                  const top = Math.max(0, (sMin - DAY_START) * PX_PER_MIN);
                  const height = Math.max(30, Math.min((eMin - sMin) * PX_PER_MIN, (DAY_END - DAY_START) * PX_PER_MIN - top));
                  const hex = STATUS_HEX[a.status] ?? "#78716c";
                  const done = a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "NO_SHOW";
                  return (
                    <button key={a.id} onClick={() => onOpen(a)}
                      className="absolute left-1.5 right-1.5 rounded-lg border px-2 py-1.5 text-left overflow-hidden transition-all hover:shadow-md hover:z-10 bg-white"
                      style={{ top, height, borderColor: `${hex}55`, borderLeft: `3px solid ${hex}`, opacity: done ? 0.62 : 1 }}>
                      <p className="text-[10px] font-semibold truncate" style={{ color: hex }}>{formatTime(a.startsAt)} – {formatTime(a.endsAt)}</p>
                      <p className="text-xs font-semibold text-stone-800 truncate leading-tight">{a.patient.firstName} {a.patient.lastName}</p>
                      <p className="text-[10px] text-stone-500 truncate">{a.service.emoji} {a.service.name}</p>
                      {height > 68 && <p className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1"><Money amount={a.price} currency={a.branch.currency} />{a.depositPaid ? " · deposit ✓" : ""}</p>}
                    </button>
                  );
                })}
                {/* now line */}
                {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowMin - DAY_START) * PX_PER_MIN }}>
                    <div className="h-px bg-rose-500/70" />
                    <div className="size-1.5 rounded-full bg-rose-500 -translate-y-[3px] -translate-x-0.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function fmtTimeLabel(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/* ── week board ────────────────────────────────────────────────────────────── */
function WeekBoard({ days, appts, onOpen, branchFilter, bootBranches }: {
  days: Date[]; appts: Appt[]; onOpen: (a: Appt) => void; branchFilter: string;
  bootBranches: { id: string; name: string; code: string }[];
}) {
  const branchName = (id: string) => bootBranches.find((b) => b.id === id)?.code ?? "";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {days.map((d) => {
        const items = appts.filter((a) => new Date(a.startsAt).toDateString() === d.toDateString())
          .sort((x, y) => +new Date(x.startsAt) - +new Date(y.startsAt));
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div key={d.toISOString()} className={`rounded-2xl border bg-white min-h-52 ${isToday ? "border-emerald-600/40 shadow-sm" : "border-stone-200/80"}`}>
            <div className={`px-3 py-2.5 border-b rounded-t-2xl ${isToday ? "border-emerald-100 bg-emerald-50/60" : "border-stone-100 bg-stone-50/50"}`}>
              <p className={`text-xs font-semibold ${isToday ? "text-emerald-800" : "text-stone-600"}`}>{fmtDate(d, "EEE, MMM d")}</p>
              <p className="text-[10px] text-stone-400">{items.length} appointment{items.length === 1 ? "" : "s"}</p>
            </div>
            <div className="p-2 space-y-1.5 max-h-105 overflow-y-auto auralis-scroll">
              {items.length === 0 && <p className="text-[11px] text-stone-300 text-center py-6">No bookings</p>}
              {items.map((a) => {
                const hex = STATUS_HEX[a.status] ?? "#78716c";
                return (
                  <button key={a.id} onClick={() => onOpen(a)}
                    className="w-full text-left rounded-lg border border-stone-100 bg-stone-50/60 px-2.5 py-2 hover:border-stone-300 hover:bg-white transition-colors"
                    style={{ borderLeft: `3px solid ${hex}` }}>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-stone-500">{formatTime(a.startsAt)}</p>
                      <span className="text-[9px] text-stone-400">{branchFilter === "all" ? branchName(a.branch.id) : ""}</span>
                    </div>
                    <p className="text-xs font-semibold text-stone-800 truncate">{a.patient.firstName} {a.patient.lastName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{a.service.emoji} {a.service.name}</p>
                    <p className="text-[10px] truncate" style={{ color: hex }}>{APPOINTMENT_STATUS_META[a.status]?.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── appointment detail dialog ─────────────────────────────────────────────── */
function AppointmentDialog({ appt, onClose, onAdvance, onDeposit, onCancel, busy }: {
  appt: Appt; onClose: () => void; onAdvance: () => void; onDeposit: () => void; onCancel: (reason: string) => void; busy: boolean;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");
  const action = NEXT_ACTION[appt.status];
  const meta = APPOINTMENT_STATUS_META[appt.status];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Avatar name={`${appt.patient.firstName} ${appt.patient.lastName}`} color={appt.patient.avatarColor} size={36} />
            <span>{appt.patient.firstName} {appt.patient.lastName}</span>
            <StatusBadge meta={meta} value={appt.status} />
          </DialogTitle>
          <DialogDescription>{appt.service.emoji} {appt.service.name} · {formatDate(appt.startsAt, "EEEE, MMMM d")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 text-sm">
          <Row icon={<Clock className="size-3.5" />} label="Time" value={`${formatTime(appt.startsAt)} – ${formatTime(appt.endsAt)} (${appt.service.durationMin ?? 60} min)`} />
          <Row icon={<User className="size-3.5" />} label="Provider" value={appt.provider.name} />
          <Row icon={<CalendarDays className="size-3.5" />} label="Location" value={`${appt.branch.name} (${appt.branch.code})`} />
          <Row icon={<DollarSign className="size-3.5" />} label="Price" value={<Money amount={appt.price} currency={appt.branch.currency} />} />
          <Row icon={<DollarSign className="size-3.5" />} label="Deposit" value={
            <span className={appt.depositPaid ? "text-emerald-700 font-medium" : "text-amber-700"}>{appt.depositPaid ? "Paid ✓" : <Money amount={appt.depositAmount} currency={appt.branch.currency} />}</span>} />
          {appt.source && <Row icon={<CheckCircle2 className="size-3.5" />} label="Booked via" value={appt.source.replace(/_/g, " ").toLowerCase()} />}
          {appt.notes && <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-xs text-stone-600">📝 {appt.notes}</div>}
          {appt.cancellationReason && <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-600">Cancelled: {appt.cancellationReason}</div>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {action && (
            <Button disabled={busy} onClick={onAdvance}
              className="w-full rounded-full bg-emerald-700 hover:bg-emerald-800 gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} {action.label}
            </Button>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" disabled={busy} onClick={onDeposit} className="flex-1 rounded-full text-xs">
              {appt.depositPaid ? "Unmark deposit" : "Mark deposit paid"}
            </Button>
            {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
              <Button variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}
                className="flex-1 rounded-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5">
                <Ban className="size-3.5" /> Cancel visit
              </Button>
            )}
          </div>
          {confirmCancel && (
            <div className="w-full rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason (optional)"
                className="h-8 text-xs bg-white" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full" onClick={() => setConfirmCancel(false)}>Keep</Button>
                <Button size="sm" disabled={busy} onClick={() => onCancel(reason)}
                  className="h-7 text-xs rounded-full bg-rose-600 hover:bg-rose-700">Confirm cancellation</Button>
              </div>
            </div>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full rounded-full text-xs text-stone-400">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-stone-400 text-xs">{icon}{label}</span>
      <span className="text-stone-800 font-medium text-xs text-right">{value}</span>
    </div>
  );
}

/* ── booking dialog ────────────────────────────────────────────────────────── */
function BookingDialog({ open, onOpenChange, patients, setPatients, branches, services, staff, defaultBranchId, defaultDate, onBooked }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  patients: PatientLite[] | null; setPatients: (p: PatientLite[]) => void;
  branches: { id: string; name: string; code: string; currency: string }[];
  services: { id: string; name: string; emoji: string; durationMin: number; price: number; isActive: boolean }[];
  staff: { id: string; name: string; role: string; title: string | null; isActive: boolean }[];
  defaultBranchId?: string; defaultDate: Date;
  onBooked: (msg: { title: string; description: string }) => void;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(fmtDate(defaultDate, "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [pSearch, setPSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !patients) {
      api<{ patients: PatientLite[] }>("/api/patients?pageSize=200")
        .then((d) => setPatients(d.patients))
        .catch(() => setPatients([]));
    }
  }, [open, patients, setPatients]);

  const providers = staff.filter((s) => s.role === "PROVIDER" || s.role === "ADMIN" || s.role === "MANAGER");
  const filteredPatients = (patients ?? []).filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(pSearch.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(pSearch.toLowerCase()));

  async function submit() {
    setFormError(null);
    if (!branchId || !patientId || !providerId || !serviceId || !date || !time) {
      setFormError("Please complete every field before booking."); return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`);
      await post("/api/appointments", { branchId, patientId, providerId, serviceId, startsAt: startsAt.toISOString(), notes: notes || undefined, source: "STAFF_APP" });
      const p = patients?.find((x) => x.id === patientId);
      const s = services.find((x) => x.id === serviceId);
      onBooked({ title: "Appointment booked ✓", description: `${p?.firstName ?? "Patient"} → ${s?.name ?? "service"} at ${fmtTimeLabel(new Date(`${date}T${time}:00`).getHours() * 60)}` });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Booking failed");
    } finally { setSaving(false); }
  }

  const svc = services.find((s) => s.id === serviceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto auralis-scroll">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>Conflict protection is automatic — overlapping provider slots are rejected.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Location">
            <Select value={branchId} onChange={setBranchId} placeholder="Choose location">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </Select>
          </Field>

          <Field label="Patient">
            <Input value={pSearch} onChange={(e) => setPSearch(e.target.value)} placeholder="Search patients…" className="h-9 mb-1.5" />
            <div className="max-h-36 overflow-y-auto auralis-scroll rounded-xl border border-stone-200 divide-y divide-stone-100">
              {!patients && <p className="text-xs text-stone-400 p-3 animate-pulse">Loading patients…</p>}
              {patients && filteredPatients.length === 0 && <p className="text-xs text-stone-400 p-3">No patients match “{pSearch}”.</p>}
              {filteredPatients.slice(0, 40).map((p) => (
                <button key={p.id} type="button" onClick={() => setPatientId(p.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${patientId === p.id ? "bg-emerald-50" : "hover:bg-stone-50"}`}>
                  <Avatar name={`${p.firstName} ${p.lastName}`} color={p.avatarColor} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-stone-800 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-[10px] text-stone-400 truncate">{p.phone ?? p.email ?? "—"}</p>
                  </div>
                  {patientId === p.id && <CheckCircle2 className="size-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <Select value={serviceId} onChange={setServiceId} placeholder="Choose service">
                {services.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </Select>
            </Field>
            <Field label="Provider">
              <Select value={providerId} onChange={setProviderId} placeholder="Choose provider">
                {providers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.title ? ` · ${s.title}` : ""}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></Field>
            <Field label="Start time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" /></Field>
          </div>

          {svc && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-100 px-3.5 py-2.5 text-xs">
              <span className="text-emerald-800 font-medium">⏱ {svc.durationMin} min treatment</span>
              <span className="text-emerald-800 font-semibold">${svc.price}</span>
            </div>
          )}

          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the provider should know…" className="min-h-16 text-xs" />
          </Field>

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <X className="size-3.5 mt-0.5 shrink-0" /> {formError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-sm">Cancel</Button>
          <Button disabled={saving} onClick={submit} className="rounded-full bg-emerald-700 hover:bg-emerald-800 gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />} Book appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30">
      <option value="">{placeholder ?? "Select…"}</option>
      {children}
    </select>
  );
}
