"use client";

// ── AI Growth Center — five specialist agents, Content Studio, loyalty worklist ──
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck, Check, Copy, Globe2, Heart, Loader2, PhoneCall, Sparkles, Zap,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../store";
import {
  api, post, PageHeader, SectionCard, Avatar, Money, Loading, ErrorNote, EmptyState, timeAgo,
} from "../ui";
import { AI_AGENTS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// AI_AGENTS.icon stores a string name — map to real lucide components here.
const AGENT_ICONS: Record<string, LucideIcon> = {
  DISCOVERY: Globe2, FRONT_DESK: PhoneCall, BOOKING: CalendarCheck, ENGAGEMENT: Zap, LOYALTY: Heart,
};

type StudioAgent = "DISCOVERY" | "ENGAGEMENT" | "LOYALTY";
type StudioFormat = "blog" | "email" | "sms" | "instagram" | "gbp";
type StudioTone = "warm and premium" | "playful" | "clinical and expert" | "luxury minimal";

const STUDIO_AGENTS: { value: StudioAgent; label: string }[] = [
  { value: "DISCOVERY", label: "Discovery Agent" },
  { value: "ENGAGEMENT", label: "Engagement Agent" },
  { value: "LOYALTY", label: "Loyalty Agent" },
];

const FORMATS: { value: StudioFormat; label: string }[] = [
  { value: "blog", label: "Blog post" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "instagram", label: "Instagram caption" },
  { value: "gbp", label: "Google Business post" },
];

const TONES: { value: StudioTone; label: string }[] = [
  { value: "warm and premium", label: "Warm and premium" },
  { value: "playful", label: "Playful" },
  { value: "clinical and expert", label: "Clinical and expert" },
  { value: "luxury minimal", label: "Luxury minimal" },
];

interface ChurnPatient {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string;
  lastVisitAt: string | null;
  lifetimeValue: number;
  branch: { currency: string } | null;
}

/** Subtle fade-up used across sections. */
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: "easeOut" as const },
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-stone-600">{label}</label>
      {children}
    </div>
  );
}

const selectCls = "w-full rounded-lg border-stone-200 bg-white text-sm text-stone-700 focus-visible:ring-emerald-600/30";

export default function AiGrowthView() {
  const currency = useApp((s) => s.boot?.tenant.currency ?? "USD");

  // ── Loyalty worklist ──
  const [worklist, setWorklist] = useState<ChurnPatient[] | null>(null);
  const [wlError, setWlError] = useState<unknown>(null);

  // ── Content Studio ──
  const [agent, setAgent] = useState<StudioAgent>("DISCOVERY");
  const [format, setFormat] = useState<StudioFormat>("email");
  const [tone, setTone] = useState<StudioTone>("warm and premium");
  const [audience, setAudience] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [genError, setGenError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    api<{ patients: ChurnPatient[] }>("/api/patients?status=CHURN_RISK&pageSize=5")
      .then((d) => setWorklist([...d.patients].sort((a, b) =>
        (a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : Infinity) -
        (b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : Infinity))))
      .catch(setWlError);
  }, []);

  async function generate() {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    setOutput("");
    setSaveState(null);
    try {
      const res = await post<{ content: string; fallback?: boolean }>("/api/ai/generate", {
        agent, format, tone, audience: audience.trim(), topic: topic.trim(),
      });
      setOutput(res.content);
      setUsedFallback(Boolean(res.fallback));
    } catch (err) {
      setGenError(err);
    } finally {
      setGenerating(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  async function saveDraft() {
    if (!output.trim() || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const subjectLine = /^Subject:\s*(.+)$/m.exec(output)?.[1];
      const res = await post<{ campaign: { id: string; name: string } }>("/api/campaigns", {
        name: topic.trim().slice(0, 40),
        type: format === "email" ? "EMAIL" : format === "sms" ? "SMS" : "PROMO",
        segment: audience.trim() || undefined,
        subject: subjectLine?.slice(0, 120),
        content: output,
        aiGenerated: true,
      });
      setSaveState({ ok: true, msg: `Draft “${res.campaign.name}” saved to Marketing` });
    } catch (err) {
      setSaveState({ ok: false, msg: err instanceof Error ? err.message : "Could not save draft" });
    } finally {
      setSaving(false);
    }
  }

  /** Loyalty worklist → prefill the Content Studio. */
  function draftWinBack(p: ChurnPatient) {
    setAgent("LOYALTY");
    setTopic(`Win-back offer for ${p.firstName} ${p.lastName} — inactive patient`);
    setSaveState(null);
    document.getElementById("content-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const smsOverLimit = format === "sms" && output.length > 300;

  return (
    <div>
      <PageHeader
        title="AI Growth Center"
        subtitle="Five specialised agents working your growth 24/7"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            <Sparkles className="size-3.5" /> Autonomous · always on
          </span>
        }
      />

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {AI_AGENTS.map((a, i) => {
          const Icon = AGENT_ICONS[a.id] ?? Sparkles;
          return (
            <motion.div
              key={a.id}
              {...fade(i * 0.06)}
              className="flex flex-col rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="size-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${a.color}14`, color: a.color }}>
                  <Icon className="size-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-stone-800">{a.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{a.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.skills.map((s) => (
                  <span key={s} className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] text-stone-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-3">
                {a.id === "FRONT_DESK" && (
                  <button
                    onClick={() => useApp.getState().setConciergeOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100 transition-colors"
                  >
                    <PhoneCall className="size-3.5" /> Try live
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Content Studio */}
      <motion.div {...fade(0.1)} className="mt-4 scroll-mt-6" id="content-studio">
        <SectionCard
          title="Content Studio"
          subtitle="Brief an agent — it writes, you approve and ship"
        >
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Brief form */}
            <div className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Agent">
                  <Select value={agent} onValueChange={(v) => setAgent(v as StudioAgent)}>
                    <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STUDIO_AGENTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Format">
                  <Select value={format} onValueChange={(v) => setFormat(v as StudioFormat)}>
                    <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tone">
                  <Select value={tone} onValueChange={(v) => setTone(v as StudioTone)}>
                    <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Audience">
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. VIP members, lapsed 90d+"
                    className="h-9 rounded-lg border-stone-200 bg-white focus-visible:ring-emerald-600/30"
                  />
                </Field>
              </div>
              <Field label="Topic / campaign brief">
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  placeholder="Autumn skin-renewal push — 20% off HydraFacial for members who haven't visited since summer…"
                  className="rounded-lg border-stone-200 bg-white text-sm focus-visible:ring-emerald-600/30"
                />
              </Field>
              <button
                onClick={generate}
                disabled={!topic.trim() || generating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Writing…" : "Generate with AI"}
              </button>
              {genError ? <ErrorNote error={genError} /> : null}
            </div>

            {/* Output preview */}
            <div className="flex flex-col rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 min-h-[280px]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <Sparkles className="size-3.5 text-amber-500" />
                  {STUDIO_AGENTS.find((a) => a.value === agent)?.label} · {FORMATS.find((f) => f.value === format)?.label} draft
                </p>
                {format === "sms" && output.length > 0 && (
                  <span className={`text-[11px] font-medium ${smsOverLimit ? "text-rose-600" : "text-stone-400"}`}>
                    {output.length} / 300 chars
                  </span>
                )}
              </div>

              <div className="flex-1">
                {generating ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-stone-400">
                    <Loader2 className="size-6 animate-spin text-emerald-700" />
                    <p className="text-xs">Your agent is writing…</p>
                  </div>
                ) : output ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{output}</p>
                ) : (
                  <EmptyState
                    icon={<Sparkles className="size-5" />}
                    title="Nothing drafted yet"
                    description="Write a brief on the left, or pull a churn-risk patient from the worklist below."
                  />
                )}
                {usedFallback && output && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Model unavailable — served from the offline template. Edit before sending.
                  </p>
                )}
              </div>

              {output && (
                <div className="mt-4 flex items-center gap-2 border-t border-stone-200 pt-3">
                  {format !== "sms" && <span className="text-[11px] text-stone-400 mr-auto">{output.length} chars</span>}
                  {format === "sms" && <span className="text-[11px] text-stone-400 mr-auto">SMS draft</span>}
                  <button
                    onClick={copyOutput}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-emerald-600/40 transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-700" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Save as campaign draft
                  </button>
                </div>
              )}

              {saveState && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  saveState.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  {saveState.ok ? <Check className="size-3.5 shrink-0" /> : <span className="shrink-0">✕</span>}
                  <span className="font-medium">{saveState.msg}</span>
                  {saveState.ok && (
                    <button
                      onClick={() => useApp.getState().setView("marketing")}
                      className="ml-auto rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-800 transition-colors"
                    >
                      Open Marketing
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Loyalty worklist */}
      <motion.div {...fade(0.15)} className="mt-4">
        <SectionCard
          title="Loyalty worklist"
          subtitle="Churn-risk patients — longest inactivity first"
        >
          {wlError ? (
            <ErrorNote error={wlError} />
          ) : !worklist ? (
            <Loading label="Finding at-risk patients" rows={3} />
          ) : worklist.length === 0 ? (
            <EmptyState
              icon={<Heart className="size-5" />}
              title="No churn-risk patients"
              description="Everyone is active — the Loyalty Agent will keep watching."
            />
          ) : (
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto auralis-scroll">
              {worklist.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <Avatar name={`${p.firstName} ${p.lastName}`} color={p.avatarColor} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-stone-500">
                      {p.lastVisitAt ? `Last visit ${timeAgo(p.lastVisitAt)}` : "No visits recorded"}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <Money amount={p.lifetimeValue} currency={p.branch?.currency ?? currency} className="text-sm font-semibold text-stone-700" />
                    <p className="text-[10px] text-stone-400">lifetime value</p>
                  </div>
                  <button
                    onClick={() => draftWinBack(p)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <Sparkles className="size-3.5" /> Draft win-back
                  </button>
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
