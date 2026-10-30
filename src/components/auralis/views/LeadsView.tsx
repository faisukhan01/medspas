"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Lead Pipeline — kanban across LEAD_STATUSES with AI scoring & quick logging
//  Data: GET /api/leads · POST /api/leads · PATCH /api/leads/[id]
//        POST /api/ai/lead-score
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleArrowRight, CircleCheck,
  Loader2, Mail, MessageSquare, Phone, Plus, Sparkles, StickyNote, Target,
  TrendingUp, UserCheck, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useApp, type Staff } from "../store";
import {
  Avatar, EmptyState, ErrorNote, Loading, Money, PageHeader, ProgressRing,
  StatCard, api, formatDate, post, patch, timeAgo,
} from "../ui";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ── shapes ───────────────────────────────────────────────────────────────────

interface LeadActivityRow {
  id: string;
  type: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  score: number;
  interest: string | null;
  estimatedValue: number;
  assignedToId: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string;
  branchId: string | null;
  assignedTo: { id: string; name: string; avatarColor: string } | null;
  branch: { id: string; name: string; code: string } | null;
  activities: LeadActivityRow[];
}

interface LeadsData {
  leads: LeadRow[];
  byStatus: Record<string, number>;
  pipelineValue: number;
  avgScore: number;
}

interface AiScoreResult {
  score: number;
  tier: string;
  reasoning: string;
  recommendedAction: string;
  suggestedMessage: string;
  blended?: boolean;
  fallback?: boolean;
}

type LogType = "CALL" | "SMS" | "EMAIL";

// ── small local helpers ──────────────────────────────────────────────────────

const ACTIVITY_META: Record<string, { icon: LucideIcon; className: string }> = {
  CALL: { icon: Phone, className: "bg-emerald-100 text-emerald-700" },
  SMS: { icon: MessageSquare, className: "bg-teal-100 text-teal-700" },
  EMAIL: { icon: Mail, className: "bg-amber-100 text-amber-700" },
  NOTE: { icon: StickyNote, className: "bg-stone-100 text-stone-600" },
  STATUS_CHANGE: { icon: CircleArrowRight, className: "bg-violet-100 text-violet-700" },
  AI: { icon: Sparkles, className: "bg-amber-100 text-amber-700" },
};

type Tier = "HOT" | "WARM" | "COOL";

function tierOf(score: number): Tier {
  return score >= 75 ? "HOT" : score >= 55 ? "WARM" : "COOL";
}

const TIER_CHIP_CLASS: Record<Tier, string> = {
  HOT: "border-rose-500 bg-rose-500 text-white",
  WARM: "border-amber-200 bg-amber-100 text-amber-800",
  COOL: "border-stone-200 bg-stone-100 text-stone-600",
};

const TIER_COLOR: Record<Tier, string> = {
  HOT: "#e11d48",
  WARM: "#b45309",
  COOL: "#78716c",
};

function ScoreChip({ score }: { score: number }) {
  const tier = tierOf(score);
  return (
    <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", TIER_CHIP_CLASS[tier])}>
      {tier} {score}
    </span>
  );
}

function LeadStatusChip({ status }: { status: string }) {
  const meta = LEAD_STATUS_META[status];
  const accent = meta?.accent ?? "#78716c";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: `${accent}40`, backgroundColor: `${accent}14`, color: accent }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />
      {meta?.label ?? status.replace(/_/g, " ")}
    </span>
  );
}

function creatorName(id: string | null | undefined, staff: Staff[] | undefined): string {
  if (!id || id === "SYSTEM") return "System";
  if (id === "AI_AGENT") return "AI Agent";
  return staff?.find((u) => u.id === id)?.name ?? "Team";
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{children}</p>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200/80 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <div className="mt-0.5 truncate text-sm text-stone-800">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-stone-600">{label}</Label>
      {children}
    </div>
  );
}

const EMPTY_FORM = {
  name: "", email: "", phone: "", source: "WEBSITE", interest: "",
  estimatedValue: "", assignedToId: "none",
};

// ── view ─────────────────────────────────────────────────────────────────────

export default function LeadsView() {
  const { boot, branchFilter } = useApp();

  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // new-lead dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);

  // detail sheet
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [logContent, setLogContent] = useState("");
  const [logging, setLogging] = useState<LogType | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [ai, setAi] = useState<AiScoreResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const currency = boot?.tenant?.currency ?? "USD";

  const load = useCallback(() => {
    setLoading(true);
    api<LeadsData>(`/api/leads?branchId=${branchFilter}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [branchFilter]);

  useEffect(() => { load(); }, [load]);

  const leads = useMemo(() => data?.leads ?? [], [data]);

  const groups = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    for (const s of LEAD_STATUSES) g[s] = [];
    for (const l of leads) (g[l.status] ?? (g[l.status] = [])).push(l);
    return g;
  }, [leads]);

  // recomputed client-side so optimistic stage moves keep stats honest
  const pipelineValue = useMemo(
    () => leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).reduce((sum, l) => sum + l.estimatedValue, 0),
    [leads],
  );
  const activeCount = useMemo(() => leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).length, [leads]);
  const convertedCount = useMemo(() => leads.filter((l) => l.status === "CONVERTED").length, [leads]);
  const avgScore = useMemo(
    () => (leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0),
    [leads],
  );

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);

  const applyLead = useCallback((lead: LeadRow) => {
    setData((prev) => (prev ? { ...prev, leads: prev.leads.map((l) => (l.id === lead.id ? lead : l)) } : prev));
  }, []);

  // ── stage move (optimistic) ──
  const moveLead = useCallback(async (lead: LeadRow, dir: -1 | 1) => {
    const idx = LEAD_STATUSES.indexOf(lead.status as (typeof LEAD_STATUSES)[number]);
    const target = LEAD_STATUSES[idx + dir];
    if (!target || moving === lead.id) return;
    const snapshot = lead.status;
    applyLead({ ...lead, status: target });
    setMoving(lead.id);
    setActionError(null);
    try {
      const res = await patch<{ lead: LeadRow }>(`/api/leads/${lead.id}`, { status: target });
      applyLead(res.lead);
    } catch (e) {
      applyLead({ ...lead, status: snapshot }); // revert
      setActionError(e);
    } finally {
      setMoving(null);
    }
  }, [applyLead, moving]);

  // ── quick activity log ──
  const logActivity = useCallback(async (type: LogType) => {
    if (!selectedLead || !logContent.trim()) return;
    setLogging(type);
    setActionError(null);
    try {
      const res = await patch<{ lead: LeadRow }>(`/api/leads/${selectedLead.id}`, {
        activity: { type, content: logContent.trim() },
      });
      applyLead(res.lead);
      setLogContent("");
      setFlash(type === "CALL" ? "Call logged" : type === "SMS" ? "SMS logged" : "Email logged");
    } catch (e) {
      setActionError(e);
    } finally {
      setLogging(null);
    }
  }, [selectedLead, logContent, applyLead]);

  // ── AI scoring ──
  const runAiScore = useCallback(async () => {
    if (!selectedLead) return;
    setAiLoading(true);
    setAi(null);
    setActionError(null);
    try {
      const res = await post<AiScoreResult>("/api/ai/lead-score", {
        name: selectedLead.name,
        source: selectedLead.source,
        interest: selectedLead.interest ?? "",
        estimatedValue: selectedLead.estimatedValue,
        status: selectedLead.status,
      });
      setAi(res);
    } catch (e) {
      setActionError(e);
    } finally {
      setAiLoading(false);
    }
  }, [selectedLead]);

  const closeSheet = (open: boolean) => {
    if (!open) {
      setSelectedId(null);
      setAi(null);
      setLogContent("");
      setFlash(null);
      setActionError(null);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  };

  const submitLead = async () => {
    if (!form.name.trim()) {
      setFormError(new Error("Lead name is required."));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await post<{ lead: LeadRow }>("/api/leads", {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source,
        interest: form.interest.trim() || null,
        estimatedValue: Number(form.estimatedValue) || 0,
        assignedToId: form.assignedToId === "none" ? null : form.assignedToId,
      });
      setAddOpen(false);
      load(); // refresh pipeline (new lead lands in "New")
    } catch (e) {
      setFormError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Lead Pipeline"
        subtitle="Speed-to-lead wins treatments — move every enquiry through the funnel in minutes, not days."
        actions={
          <Button onClick={openAdd} className="rounded-full">
            <Plus className="size-4" /> New lead
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Pipeline value" value={<Money amount={pipelineValue} currency={currency} />} sub="Open opportunities" icon={<TrendingUp className="size-4" />} accent="#047857" />
        <StatCard label="Active leads" value={activeCount} sub={`${leads.length} total captured`} icon={<Users className="size-4" />} accent="#0d9488" />
        <StatCard label="Avg AI score" value={`${avgScore}/100`} sub="AI + heuristic blend" icon={<Target className="size-4" />} accent="#b45309" />
        <StatCard label="Converted" value={convertedCount} sub="Became paying patients" icon={<UserCheck className="size-4" />} accent="#7c3aed" />
      </div>

      {error ? (
        <div className="mt-4"><ErrorNote error={error} /></div>
      ) : loading && !data ? (
        <div className="mt-6"><Loading label="Loading pipeline" rows={6} /></div>
      ) : leads.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <EmptyState
            icon={<Users className="size-5" />}
            title="No leads yet"
            description="Capture enquiries from the website, Instagram or the AI front desk — they land here instantly."
            action={<Button onClick={openAdd} className="rounded-full"><Plus className="size-4" /> New lead</Button>}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto auralis-scroll pb-2">
          <div className="flex min-w-max gap-3">
            {LEAD_STATUSES.map((status) => {
              const meta = LEAD_STATUS_META[status];
              const group = groups[status] ?? [];
              return (
                <div key={status} className="flex w-64 min-w-64 shrink-0 flex-col rounded-2xl border border-stone-200/80 bg-stone-50/70 p-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta?.accent ?? "#78716c" }} />
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-stone-800">{meta?.label ?? status}</p>
                    <span className="rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-stone-500">{group.length}</span>
                  </div>
                  <p className="px-1 pb-2 pt-0.5 text-[10px] leading-snug text-stone-400">{meta?.description}</p>
                  <div className="max-h-96 min-h-16 flex-1 space-y-2 overflow-y-auto auralis-scroll pr-0.5">
                    {group.length === 0 ? (
                      <p className="py-8 text-center text-xs text-stone-400">No leads here</p>
                    ) : (
                      group.map((l) => {
                        const idx = LEAD_STATUSES.indexOf(l.status as (typeof LEAD_STATUSES)[number]);
                        return (
                          <div
                            key={l.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedId(l.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(l.id); } }}
                            className="group cursor-pointer rounded-xl border border-stone-200/80 bg-white p-3 shadow-sm transition-all hover:border-emerald-600/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{l.name}</p>
                              <ScoreChip score={l.score} />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-stone-500">{l.interest ?? "General enquiry"}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="truncate rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                                {LEAD_SOURCE_LABELS[l.source] ?? l.source}
                              </span>
                              <Money amount={l.estimatedValue} currency={currency} className="ml-auto shrink-0 text-xs font-semibold text-stone-700" />
                            </div>
                            <div className="mt-2.5 flex items-center gap-1.5 border-t border-stone-100 pt-2">
                              {l.assignedTo ? (
                                <Avatar name={l.assignedTo.name} color={l.assignedTo.avatarColor} size={20} />
                              ) : (
                                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-stone-300 text-[8px] text-stone-300">?</span>
                              )}
                              <span className="min-w-0 flex-1 truncate text-[11px] text-stone-500">{l.assignedTo?.name ?? "Unassigned"}</span>
                              <span className="shrink-0 text-[11px] text-stone-400">{timeAgo(l.createdAt)}</span>
                              <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                                <button
                                  aria-label="Move stage back"
                                  disabled={idx === 0 || moving === l.id}
                                  onClick={(e) => { e.stopPropagation(); moveLead(l, -1); }}
                                  className="rounded-md p-1 text-stone-300 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                                >
                                  <ChevronLeft className="size-3.5" />
                                </button>
                                <button
                                  aria-label="Move stage forward"
                                  disabled={idx === LEAD_STATUSES.length - 1 || moving === l.id}
                                  onClick={(e) => { e.stopPropagation(); moveLead(l, 1); }}
                                  className="rounded-md p-1 text-stone-300 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                                >
                                  <ChevronRight className="size-3.5" />
                                </button>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {actionError ? (
        <div className="mt-3"><ErrorNote error={actionError} /></div>
      ) : null}

      {/* New lead dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl border-stone-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-stone-900">New lead</DialogTitle>
            <DialogDescription>Capture the enquiry now — the Engagement Agent will chase the follow-up.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Name *">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jordan Blake" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jordan@example.com" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger className="h-9 w-full border-stone-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estimated value ($)">
                <Input type="number" min={0} step={50} value={form.estimatedValue} onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))} placeholder="800" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
            </div>
            <Field label="Interest">
              <Input value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} placeholder="e.g. Botox, laser hair removal" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
            </Field>
            <Field label="Assign to">
              <Select value={form.assignedToId} onValueChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}>
                <SelectTrigger className="h-9 w-full border-stone-200"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(boot?.staff ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {formError ? <ErrorNote error={formError} /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submitLead} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {saving ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead detail sheet */}
      <Sheet open={selectedId !== null} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          {!selectedLead ? (
            <div className="p-6 pt-10"><Loading label="Opening lead" rows={4} /></div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto auralis-scroll">
              {/* header */}
              <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur">
                <div className="flex items-start gap-3 pr-8">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="font-display text-lg font-semibold text-stone-900">{selectedLead.name}</SheetTitle>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <LeadStatusChip status={selectedLead.status} />
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                        {LEAD_SOURCE_LABELS[selectedLead.source] ?? selectedLead.source}
                      </span>
                      {selectedLead.branch && (
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                          {selectedLead.branch.code}
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400">Added {timeAgo(selectedLead.createdAt)}</span>
                    </div>
                  </div>
                  <ProgressRing value={selectedLead.score} size={56} color={TIER_COLOR[tierOf(selectedLead.score)]} label={String(selectedLead.score)} />
                </div>
                <SheetDescription className="sr-only">Lead detail and activity</SheetDescription>
              </div>

              <div className="space-y-5 px-5 py-4">
                {selectedLead.status === "LOST" && selectedLead.lostReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                    <span className="font-semibold">Lost reason:</span> {selectedLead.lostReason}
                  </div>
                )}

                {/* contact + qualification */}
                <section>
                  <SectionLabel>Details</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoRow label="Email">{selectedLead.email ?? "—"}</InfoRow>
                    <InfoRow label="Phone">{selectedLead.phone ?? "—"}</InfoRow>
                    <InfoRow label="Interest">{selectedLead.interest ?? "General enquiry"}</InfoRow>
                    <InfoRow label="Estimated value">
                      <Money amount={selectedLead.estimatedValue} currency={currency} />
                    </InfoRow>
                    <InfoRow label="Assigned to">
                      {selectedLead.assignedTo ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={selectedLead.assignedTo.name} color={selectedLead.assignedTo.avatarColor} size={18} />
                          {selectedLead.assignedTo.name}
                        </span>
                      ) : "Unassigned"}
                    </InfoRow>
                    <InfoRow label="Next follow-up">
                      {selectedLead.nextFollowUpAt ? (
                        <span className={cn(new Date(selectedLead.nextFollowUpAt) < new Date() && "font-medium text-amber-700")}>
                          {formatDate(selectedLead.nextFollowUpAt, { month: "short", day: "numeric" })}
                          {new Date(selectedLead.nextFollowUpAt) < new Date() ? " · overdue" : ""}
                        </span>
                      ) : "—"}
                    </InfoRow>
                  </div>
                </section>

                {/* move stage */}
                <section>
                  <SectionLabel>Move stage</SectionLabel>
                  {(() => {
                    const idx = LEAD_STATUSES.indexOf(selectedLead.status as (typeof LEAD_STATUSES)[number]);
                    const prev = idx > 0 ? LEAD_STATUSES[idx - 1] : null;
                    const next = idx < LEAD_STATUSES.length - 1 ? LEAD_STATUSES[idx + 1] : null;
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!prev || moving === selectedLead.id}
                          onClick={() => moveLead(selectedLead, -1)}
                          className="border-stone-200"
                        >
                          <ArrowLeft className="size-3.5" /> {prev ? LEAD_STATUS_META[prev]?.label ?? prev : "Start of funnel"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!next || moving === selectedLead.id}
                          onClick={() => moveLead(selectedLead, 1)}
                          className="border-stone-200"
                        >
                          {next ? LEAD_STATUS_META[next]?.label ?? next : "End of funnel"} <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })()}
                  {moving === selectedLead.id && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-stone-400">
                      <Loader2 className="size-3 animate-spin" /> Moving…
                    </p>
                  )}
                </section>

                {/* quick log */}
                <section>
                  <SectionLabel>Log activity</SectionLabel>
                  <Textarea
                    value={logContent}
                    onChange={(e) => { setLogContent(e.target.value); setFlash(null); }}
                    rows={2}
                    placeholder="What happened on this touchpoint?"
                    className="border-stone-200 text-sm focus-visible:ring-emerald-600/30"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(["CALL", "SMS", "EMAIL"] as LogType[]).map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        size="sm"
                        disabled={!logContent.trim() || logging !== null}
                        onClick={() => logActivity(t)}
                        className="border-stone-200"
                      >
                        {t === "CALL" && <Phone className="size-3.5" />}
                        {t === "SMS" && <MessageSquare className="size-3.5" />}
                        {t === "EMAIL" && <Mail className="size-3.5" />}
                        {t === "CALL" ? "Log call" : t === "SMS" ? "Log SMS" : "Log email"}
                      </Button>
                    ))}
                    {logging && (
                      <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                        <Loader2 className="size-3 animate-spin" /> Saving…
                      </span>
                    )}
                    {flash && !logging && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CircleCheck className="size-3.5" /> {flash}
                      </span>
                    )}
                  </div>
                  {!logContent.trim() && !logging && (
                    <p className="mt-1.5 text-[11px] text-stone-400">Write a note above, then log the touchpoint.</p>
                  )}
                </section>

                {/* AI score */}
                <section>
                  <SectionLabel>AI engagement score</SectionLabel>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAiScore}
                    disabled={aiLoading}
                    className="border-emerald-600/30 text-emerald-800 hover:bg-emerald-50"
                  >
                    {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {aiLoading ? "Scoring…" : "AI score this lead"}
                  </Button>
                  {ai && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <ProgressRing value={ai.score} size={52} color={TIER_COLOR[tierOf(ai.score)]} label={String(ai.score)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <ScoreChip score={ai.score} />
                            <span className="text-[11px] text-amber-700">
                              {ai.blended ? "AI + heuristic blend" : ai.fallback ? "Heuristic (offline)" : "AI judgement"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-stone-700">{ai.reasoning}</p>
                          <p className="mt-1 text-xs text-amber-900"><span className="font-semibold">Next:</span> {ai.recommendedAction}</p>
                        </div>
                      </div>
                      {ai.suggestedMessage && (
                        <div className="mt-3 rounded-xl border border-amber-200/70 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Suggested opener</p>
                          <p className="mt-1 text-sm leading-relaxed text-stone-700">{ai.suggestedMessage}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
                            onClick={() => { setLogContent(ai.suggestedMessage); setFlash(null); }}
                          >
                            <MessageSquare className="size-3.5" /> Use message
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* activity timeline */}
                <section>
                  <SectionLabel>Recent activity</SectionLabel>
                  {selectedLead.activities.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-xs text-stone-400">No activity yet</p>
                  ) : (
                    <div className="max-h-64 space-y-2.5 overflow-y-auto auralis-scroll pr-1">
                      {selectedLead.activities.map((a) => {
                        const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.NOTE;
                        const Icon = meta.icon;
                        return (
                          <div key={a.id} className="flex gap-2.5">
                            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", meta.className)}>
                              <Icon className="size-3.5" />
                            </span>
                            <div className="min-w-0 flex-1 rounded-xl border border-stone-200/80 bg-white px-3 py-2">
                              <p className="text-sm leading-snug text-stone-700">{a.content}</p>
                              <p className="mt-0.5 text-[11px] text-stone-400">
                                {creatorName(a.createdBy, boot?.staff)} · {timeAgo(a.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="h-2" />
    </motion.div>
  );
}
