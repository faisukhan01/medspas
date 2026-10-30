"use client";

// ── Marketing & Outreach — campaigns, reputation, referrals, comms ────────────
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle, ArrowRight, Bot, CalendarClock, CornerUpLeft, Loader2, Mail,
  Megaphone, MessageSquare, MessageSquareWarning, Phone, Rocket, Sparkles, Star,
  Users, type LucideIcon,
} from "lucide-react";
import { useApp } from "../store";
import {
  api, patch, PageHeader, StatCard, SectionCard, StatusBadge, Avatar, Money,
  Loading, ErrorNote, EmptyState, formatDateTime, timeAgo,
} from "../ui";
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_META } from "@/lib/constants";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── local status metas (no shared constants for these entities yet) ──────────
const REVIEW_STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-amber-100 text-amber-800 border-amber-200" },
  PUBLISHED: { label: "Published", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  FLAGGED: { label: "Flagged", className: "bg-rose-100 text-rose-700 border-rose-200" },
  RESPONDED: { label: "Responded", className: "bg-teal-100 text-teal-800 border-teal-200" },
};

const REFERRAL_STATUS_META: Record<string, { label: string; className: string }> = {
  INVITED: { label: "Invited", className: "bg-amber-100 text-amber-800 border-amber-200" },
  VISITED: { label: "Visited", className: "bg-teal-100 text-teal-800 border-teal-200" },
  CONVERTED: { label: "Converted", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REWARDED: { label: "Rewarded", className: "bg-stone-100 text-stone-700 border-stone-200" },
};

const PLATFORM_LABELS: Record<string, string> = {
  GOOGLE: "Google", INTERNAL: "On-site", TRUSTPILOT: "Trustpilot", YELP: "Yelp",
};

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  SMS: MessageSquare, EMAIL: Mail, CALL: Phone, CHAT: Bot,
};
const CHANNEL_COLORS: Record<string, string> = {
  SMS: "#047857", EMAIL: "#b45309", CALL: "#0d9488", CHAT: "#7c3aed",
};

interface Campaign {
  id: string; name: string; type: string; segment: string | null; subject: string | null;
  status: string; scheduledAt: string | null; aiGenerated: boolean;
  sentCount: number; openedCount: number; clickedCount: number; convertedCount: number;
  revenue: number; createdAt: string;
}
interface Review {
  id: string; rating: number; comment: string | null; platform: string; status: string;
  response: string | null; createdAt: string;
  branch: { name: string; code: string } | null;
  patient: { firstName: string; lastName: string } | null;
}
interface Referral {
  id: string; referredName: string; status: string; rewardAmount: number; createdAt: string;
  referrer: { firstName: string; lastName: string } | null;
}
interface Message {
  id: string; channel: string; direction: string; body: string; status: string; createdAt: string;
}
interface MarketingData {
  campaigns: Campaign[];
  reviews: Review[];
  referrals: Referral[];
  messages: Message[];
  segments: { all: number; vip: number; members: number; inactive90: number; churnRisk: number; us: number; uk: number };
  reviewStats: { avg: number; total: number; needResponse: number; byPlatform: { platform: string; count: number }[] };
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: "easeOut" as const },
});

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200")} />
      ))}
    </div>
  );
}

export default function MarketingView() {
  const { setView } = useApp();
  const currency = useApp((s) => s.boot?.tenant.currency ?? "USD");
  const [data, setData] = useState<MarketingData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api<MarketingData>("/api/marketing").then(setData).catch(setError);
  }, []);

  /** Optimistically flip a DRAFT campaign to ACTIVE, then sync from the API. */
  async function activate(id: string) {
    if (!data || activating) return;
    const prev = data;
    setData({ ...data, campaigns: data.campaigns.map((c) => (c.id === id ? { ...c, status: "ACTIVE" } : c)) });
    setActivating(id);
    setActionError(null);
    try {
      await patch("/api/campaigns", { id, status: "ACTIVE" });
      setData(await api<MarketingData>("/api/marketing"));
    } catch {
      setData(prev);
      setActionError("Could not activate the campaign — please try again.");
    } finally {
      setActivating(null);
    }
  }

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!data) return <div className="p-6 pt-10"><Loading label="Loading marketing hub" rows={6} /></div>;

  const campaignRevenue = data.campaigns.reduce((s, c) => s + c.revenue, 0);
  const activeCount = data.campaigns.filter((c) => c.status === "ACTIVE").length;

  const segmentChips = [
    { label: "All opt-in", count: data.segments.all, cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    { label: "VIP", count: data.segments.vip, cls: "border-amber-200 bg-amber-50 text-amber-800" },
    { label: "Members", count: data.segments.members, cls: "border-teal-200 bg-teal-50 text-teal-800" },
    { label: "Inactive 90d", count: data.segments.inactive90, cls: "border-stone-200 bg-stone-50 text-stone-600" },
    { label: "Churn risk", count: data.segments.churnRisk, cls: "border-rose-200 bg-rose-50 text-rose-700" },
    { label: "🇺🇸 US", count: data.segments.us, cls: "border-stone-200 bg-stone-50 text-stone-600" },
    { label: "🇬🇧 UK", count: data.segments.uk, cls: "border-stone-200 bg-stone-50 text-stone-600" },
  ];

  const tabCls = "rounded-full data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm text-stone-500 px-4";

  return (
    <div>
      <PageHeader
        title="Marketing & Outreach"
        subtitle="Campaigns, reputation and patient conversations — all channels in one place."
        actions={
          <button
            onClick={() => setView("ai-growth")}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:border-emerald-600/40 transition-colors"
          >
            <Sparkles className="size-4 text-amber-500" /> Create with AI
          </button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Campaign revenue" value={<Money amount={campaignRevenue} currency={currency} />}
          sub={`${data.campaigns.length} campaigns · ${activeCount} active`} icon={<Megaphone className="size-4" />} accent="#047857" />
        <StatCard label="Avg review rating" value={<span className="inline-flex items-center gap-1.5">{data.reviewStats.avg}<Star className="size-4 fill-amber-400 text-amber-400" /></span>}
          sub={`${data.reviewStats.total} reviews across platforms`} icon={<Star className="size-4" />} accent="#d97706" />
        <StatCard label="Need a response" value={data.reviewStats.needResponse}
          sub="New or flagged reviews waiting" icon={<MessageSquareWarning className="size-4" />} accent="#be123c" />
        <StatCard label="Reachable audience" value={data.segments.all}
          sub="Patients opted into marketing" icon={<Users className="size-4" />} accent="#0d9488" />
      </div>

      {/* Tabs */}
      <motion.div {...fade(0.08)} className="mt-4">
        <Tabs defaultValue="campaigns">
          <TabsList className="rounded-full border border-stone-200/80 bg-stone-100 p-1 h-10">
            <TabsTrigger value="campaigns" className={tabCls}>Campaigns</TabsTrigger>
            <TabsTrigger value="reviews" className={tabCls}>Reviews</TabsTrigger>
            <TabsTrigger value="referrals" className={tabCls}>Referrals</TabsTrigger>
            <TabsTrigger value="messages" className={tabCls}>Messages</TabsTrigger>
          </TabsList>

          {/* ── Campaigns ── */}
          <TabsContent value="campaigns" className="mt-3">
            {actionError && <div className="mb-3"><ErrorNote error={new Error(actionError)} /></div>}
            {data.campaigns.length === 0 ? (
              <SectionCard>
                <EmptyState
                  icon={<Megaphone className="size-5" />}
                  title="No campaigns yet"
                  description="Draft your first campaign in the AI Growth Center's Content Studio."
                  action={
                    <button onClick={() => setView("ai-growth")} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors">
                      Open Content Studio
                    </button>
                  }
                />
              </SectionCard>
            ) : (
              <div className="grid xl:grid-cols-2 gap-3 max-h-[36rem] overflow-y-auto auralis-scroll pr-1">
                {data.campaigns.map((c, i) => {
                  const funnel = [
                    { label: "Sent", value: c.sentCount },
                    { label: "Opened", value: c.openedCount },
                    { label: "Clicked", value: c.clickedCount },
                    { label: "Converted", value: c.convertedCount },
                  ];
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                      className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-stone-800 truncate max-w-56">{c.name}</p>
                            {c.aiGenerated && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                <Sparkles className="size-2.5" /> AI
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-stone-500">
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-medium text-stone-600">
                              {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                            </span>
                            {c.segment && (
                              <span className="inline-flex items-center gap-1"><Users className="size-3" />{c.segment}</span>
                            )}
                            {c.scheduledAt && (
                              <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{formatDateTime(c.scheduledAt)}</span>
                            )}
                          </div>
                          {c.subject && <p className="mt-1.5 text-xs italic text-stone-400 truncate">“{c.subject}”</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge meta={CAMPAIGN_STATUS_META[c.status]} value={c.status} />
                          {c.status === "DRAFT" && (
                            <button
                              onClick={() => activate(c.id)}
                              disabled={activating === c.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            >
                              {activating === c.id ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
                              Activate
                            </button>
                          )}
                        </div>
                      </div>

                      {/* funnel metrics */}
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        {funnel.map((f, fi) => (
                          <div key={f.label}>
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[10px] uppercase tracking-wide text-stone-400">{f.label}</span>
                              <span className="text-xs font-semibold text-stone-700">{f.value}</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct(f.value, c.sentCount)}%`, backgroundColor: `rgba(4, 120, 87, ${0.35 + fi * 0.2})` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[9px] text-stone-400">{pct(f.value, c.sentCount)}%</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                        <span className="text-[11px] text-stone-400">Created {timeAgo(c.createdAt)}</span>
                        <div className="text-right">
                          <Money amount={c.revenue} currency={currency} className="text-sm font-semibold text-emerald-800" />
                          <p className="text-[10px] text-stone-400">attributed revenue</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Reviews ── */}
          <TabsContent value="reviews" className="mt-3">
            {data.reviews.length === 0 ? (
              <SectionCard>
                <EmptyState icon={<Star className="size-5" />} title="No reviews yet" description="Reviews from Google, Yelp, Trustpilot and on-site forms will land here." />
              </SectionCard>
            ) : (
              <div className="grid lg:grid-cols-2 gap-3 max-h-[36rem] overflow-y-auto auralis-scroll pr-1">
                {data.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Stars rating={r.rating} />
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                          {PLATFORM_LABELS[r.platform] ?? r.platform}
                        </span>
                      </div>
                      <StatusBadge meta={REVIEW_STATUS_META[r.status]} value={r.status} />
                    </div>
                    {r.comment && <p className="mt-2.5 text-sm leading-relaxed text-stone-700">{r.comment}</p>}
                    {r.response && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          <CornerUpLeft className="size-3" /> Clinic response
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-emerald-900">{r.response}</p>
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-stone-400">
                      <span className="font-medium text-stone-600">
                        {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "Anonymous"}
                      </span>
                      {r.branch && <><span>·</span><span>{r.branch.name}</span></>}
                      <span className="ml-auto">{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Referrals ── */}
          <TabsContent value="referrals" className="mt-3">
            <SectionCard>
              {data.referrals.length === 0 ? (
                <EmptyState icon={<ArrowRight className="size-5" />} title="No referrals yet" description="Patient-to-friend referrals will appear here with their reward status." />
              ) : (
                <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto auralis-scroll">
                  {data.referrals.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-3">
                      <Avatar name={r.referrer ? `${r.referrer.firstName} ${r.referrer.lastName}` : "Auralis"} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {r.referrer ? `${r.referrer.firstName} ${r.referrer.lastName}` : "Someone"}
                          <ArrowRight className="mx-1.5 inline size-3 text-stone-400" />
                          {r.referredName}
                        </p>
                        <p className="text-xs text-stone-500">Referred {timeAgo(r.createdAt)}</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        {r.rewardAmount > 0 ? (
                          <>
                            <Money amount={r.rewardAmount} currency={currency} className="text-xs font-semibold text-stone-700" />
                            <p className="text-[10px] text-stone-400">reward</p>
                          </>
                        ) : (
                          <span className="text-[10px] text-stone-400">No reward yet</span>
                        )}
                      </div>
                      <StatusBadge meta={REFERRAL_STATUS_META[r.status]} value={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </TabsContent>

          {/* ── Messages ── */}
          <TabsContent value="messages" className="mt-3">
            <SectionCard subtitle="Latest inbound and outbound conversations across all channels">
              {data.messages.length === 0 ? (
                <EmptyState icon={<Bot className="size-5" />} title="No messages yet" description="SMS, email, call and chat activity will appear here." />
              ) : (
                <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto auralis-scroll">
                  {data.messages.map((m) => {
                    const Icon = CHANNEL_ICONS[m.channel] ?? MessageSquare;
                    const outbound = m.direction === "OUTBOUND";
                    return (
                      <div key={m.id} className="flex items-start gap-3 py-3">
                        <div
                          className="size-8 rounded-xl grid place-items-center shrink-0"
                          style={{ backgroundColor: `${CHANNEL_COLORS[m.channel] ?? "#57534e"}14`, color: CHANNEL_COLORS[m.channel] ?? "#57534e" }}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              outbound ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/70 text-stone-600",
                            )}>
                              {outbound ? "OUT" : "IN"}
                            </span>
                            <span className="text-xs font-medium text-stone-700">{m.channel}</span>
                            <span className="text-[11px] text-stone-400">{m.status} · {timeAgo(m.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-stone-600 line-clamp-2">{m.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Segments strip */}
      <motion.div {...fade(0.12)} className="mt-4">
        <SectionCard title="Audience segments" subtitle="Live opt-in counts for campaign targeting">
          <div className="flex flex-wrap gap-2">
            {segmentChips.map((s) => (
              <span key={s.label} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs", s.cls)}>
                {s.label}
                <span className="font-semibold">{s.count}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-400">
              <AlertCircle className="size-3" /> Always honour opt-out
            </span>
          </div>
        </SectionCard>
      </motion.div>

      <div className="h-2" />
    </div>
  );
}
