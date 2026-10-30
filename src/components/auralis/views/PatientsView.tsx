"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  Patients & EMR — patient CRM grid + 360° EMR side sheet
//  Data: GET /api/patients (list) · GET /api/patients/[id] (EMR payload)
//        POST /api/patients (create)
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck, CalendarDays, CircleAlert, CircleCheck, Crown, FileSignature, FileText,
  HeartPulse, History, Loader2, Mail, MapPin, Phone, Plus, Receipt, Stethoscope,
  TriangleAlert, UserPlus, Users,
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
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "../store";
import {
  Avatar, EmptyState, ErrorNote, Loading, Money, PageHeader, SearchInput,
  StatCard, StatusBadge, api, formatDate, formatDateTime, post, timeAgo,
} from "../ui";
import {
  APPOINTMENT_STATUS_META, INVOICE_STATUS_META, LEAD_SOURCES, LEAD_SOURCE_LABELS,
  PATIENT_STATUS_META,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ── shapes ───────────────────────────────────────────────────────────────────

interface PatientBranch { id: string; name: string; code: string; currency: string }

interface PatientCore {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  city: string | null;
  country: string;
  avatarColor: string;
  source: string | null;
  tags: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  medications: string | null;
  skinType: string | null;
  emergencyContact: string | null;
  status: string;
  consentsSigned: boolean;
  marketingOptIn: boolean;
  lifetimeValue: number;
  visitCount: number;
  noShowCount: number;
  joinedAt: string;
  lastVisitAt: string | null;
  branchId: string | null;
}

interface PatientListRow extends PatientCore {
  branch: PatientBranch | null;
  _count?: { appointments: number; treatments: number; memberships: number };
}

interface CreatedPatient extends PatientCore {
  branch: { id: string; name: string; code: string } | null;
}

interface AppointmentRow {
  id: string;
  startsAt: string;
  status: string;
  price: number;
  provider: { id: string; name: string; avatarColor: string };
  service: { id: string; name: string; emoji: string; category: string | null };
  branch: { id: string; name: string; code: string; currency: string };
}

interface TreatmentRow {
  id: string;
  serviceName: string;
  performedAt: string;
  areaTreated: string | null;
  unitsUsed: number | null;
  notes: string | null;
  followUpDays: number | null;
  provider: { id: string; name: string; avatarColor: string };
}

interface NoteRow {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatarColor: string; title: string | null };
}

interface ConsentRow {
  id: string;
  signedAt: string;
  signatureData: string | null;
  form: { id: string; title: string; version: number };
}

interface InvoiceRow {
  id: string;
  number: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PatientDetail {
  patient: PatientCore & { branch: PatientBranch | null };
  appointments: AppointmentRow[];
  upcoming: AppointmentRow[];
  lastVisit: AppointmentRow | null;
  treatments: TreatmentRow[];
  notes: NoteRow[];
  consents: ConsentRow[];
  invoices: InvoiceRow[];
  memberships: { id: string; status: string; plan: { id: string; name: string; price: number; currency: string } }[];
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    noShows: number;
    lifetimeValue: number;
    activeMembership: string | null;
  };
}

interface PatientsResp { patients: PatientListRow[]; total: number; page: number; pageSize: number }

// ── small local helpers ──────────────────────────────────────────────────────

const SKIN_TYPES = ["Fitzpatrick I", "Fitzpatrick II", "Fitzpatrick III", "Fitzpatrick IV", "Fitzpatrick V", "Fitzpatrick VI"];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "CHURN_RISK", label: "Churn risk" },
] as const;

const NOTE_TYPE_CLASS: Record<string, string> = {
  INTAKE: "bg-stone-100 text-stone-600 border-stone-200",
  CONSULT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST_TREATMENT: "bg-teal-100 text-teal-800 border-teal-200",
  ADMIN: "bg-amber-100 text-amber-800 border-amber-200",
};

function hasTag(tags: string | null, tag: string): boolean {
  return (tags ?? "").split(",").some((t) => t.trim().toLowerCase() === tag);
}

function tagClass(tag: string): string {
  const t = tag.trim().toLowerCase();
  if (t === "vip") return "border-amber-200 bg-amber-100 text-amber-800";
  if (t === "member") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  return "border-stone-200 bg-stone-100 text-stone-600";
}

function TagRow({ tags }: { tags: string | null }) {
  const list = (tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  if (list.length === 0) return <span className="text-[11px] text-stone-300">No tags</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((t) => (
        <span key={t} className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", tagClass(t))}>{t}</span>
      ))}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
      {icon}
      {children}
    </p>
  );
}

function StatChip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-stone-800">{children}</p>
    </div>
  );
}

function MedField({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  return (
    <div className="rounded-xl border border-stone-200/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      {value ? (
        <p className="mt-1 text-sm text-stone-800">{value}</p>
      ) : (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-400">
          <CircleCheck className="size-3.5 shrink-0 text-emerald-500" />
          {empty}
        </p>
      )}
    </div>
  );
}

function Signature({ value }: { value: string | null }) {
  if (!value) return <span className="shrink-0 text-[11px] italic text-stone-300">no signature</span>;
  if (value.startsWith("data:image")) {
    return (
      <img src={value} alt="Signature" className="h-9 w-24 shrink-0 rounded-md border border-stone-100 object-contain" />
    );
  }
  return <span className="shrink-0 font-serif text-sm italic text-stone-600">{value}</span>;
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
  firstName: "", lastName: "", email: "", phone: "", branchId: "none",
  allergies: "", medications: "", skinType: "none", source: "WEBSITE",
};

// ── view ─────────────────────────────────────────────────────────────────────

export default function PatientsView() {
  const { boot, branchFilter } = useApp();

  const [rows, setRows] = useState<PatientListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // list filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // add-patient dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);

  // EMR sheet
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);

  const currency = boot?.tenant?.currency ?? "USD";

  const load = useCallback(() => {
    setLoading(true);
    api<PatientsResp>(`/api/patients?pageSize=100&branchId=${branchFilter}`)
      .then((d) => {
        setRows(d.patients);
        setTotal(d.total);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [branchFilter]);

  useEffect(() => { load(); }, [load]);

  // fetch EMR payload whenever the sheet opens for a patient
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setDetail(null);
    setDetailError(null);
    api<PatientDetail>(`/api/patients/${selectedId}`)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) setDetailError(e); });
    return () => { alive = false; };
  }, [selectedId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [`${p.firstName} ${p.lastName}`, p.email ?? "", p.phone ?? "", p.tags ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, statusFilter]);

  const members = useMemo(() => rows.filter((p) => hasTag(p.tags, "member")).length, [rows]);
  const vips = useMemo(() => rows.filter((p) => hasTag(p.tags, "vip")).length, [rows]);
  const churn = useMemo(() => rows.filter((p) => p.status === "CHURN_RISK").length, [rows]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  };

  const submitPatient = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError(new Error("First name and last name are required."));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await post<{ patient: CreatedPatient }>("/api/patients", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        branchId: form.branchId === "none" ? null : form.branchId,
        allergies: form.allergies.trim() || null,
        medications: form.medications.trim() || null,
        skinType: form.skinType === "none" ? null : form.skinType,
        source: form.source,
      });
      // normalise the created row to the list shape (POST include omits branch.currency)
      const cur = boot?.branches.find((b) => b.id === res.patient.branchId)?.currency ?? currency;
      const row: PatientListRow = {
        ...res.patient,
        branch: res.patient.branch ? { ...res.patient.branch, currency: cur } : null,
      };
      setRows((prev) => [row, ...prev]);
      setTotal((t) => t + 1);
      setAddOpen(false);
    } catch (e) {
      setFormError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Patients & EMR"
        subtitle="Your full patient book — profiles, medical records, treatment history and consents in one place."
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone, tag…" />
            <div className="flex items-center gap-0.5 rounded-full border border-stone-200 bg-white p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === f.value ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-800",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button onClick={openAdd} className="rounded-full">
              <Plus className="size-4" /> Add patient
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total patients" value={total} sub={`${rows.length} loaded in this view`} icon={<Users className="size-4" />} accent="#047857" />
        <StatCard label="Members" value={members} sub="Active membership tag" icon={<BadgeCheck className="size-4" />} accent="#0d9488" />
        <StatCard label="VIPs" value={vips} sub="White-glove segment" icon={<Crown className="size-4" />} accent="#b45309" />
        <StatCard label="Churn risk" value={churn} sub="Needs a win-back touch" icon={<TriangleAlert className="size-4" />} accent="#be123c" />
      </div>

      {/* Grid */}
      {error ? (
        <div className="mt-4"><ErrorNote error={error} /></div>
      ) : loading && rows.length === 0 ? (
        <div className="mt-6"><Loading label="Loading patient records" rows={6} /></div>
      ) : visible.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <EmptyState
            icon={<Users className="size-5" />}
            title={rows.length === 0 ? "No patients yet" : "No patients match your filters"}
            description={rows.length === 0 ? "Add your first patient to start building charts and treatment history." : "Try a different search term or status filter."}
            action={rows.length === 0 ? <Button onClick={openAdd} className="rounded-full"><Plus className="size-4" /> Add patient</Button> : undefined}
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {visible.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(p.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.id); } }}
              className="cursor-pointer rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-px hover:border-emerald-600/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
            >
              <div className="flex items-start gap-3">
                <Avatar name={`${p.firstName} ${p.lastName}`} color={p.avatarColor} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-stone-900">{p.firstName} {p.lastName}</p>
                    <StatusBadge meta={PATIENT_STATUS_META[p.status]} value={p.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-stone-500">
                    <Mail className="size-3 shrink-0 text-stone-400" />{p.email ?? "No email"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-stone-500">
                    <Phone className="size-3 shrink-0 text-stone-400" />{p.phone ?? "No phone"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {p.branch?.code ?? "—"}
                </span>
                <TagRow tags={p.tags} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Lifetime value</p>
                  <Money amount={p.lifetimeValue} currency={p.branch?.currency ?? currency} className="text-sm font-semibold text-emerald-900" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Visits</p>
                  <p className="text-sm font-semibold text-stone-700">{p.visitCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > rows.length && rows.length > 0 && (
        <p className="mt-3 text-center text-xs text-stone-400">
          Showing the {rows.length} most recent of {total} patients — refine your search to narrow the list.
        </p>
      )}

      {/* Add patient dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl border-stone-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-stone-900">Add patient</DialogTitle>
            <DialogDescription>Create a patient record — medical details can be completed later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name *">
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Jane" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
              <Field label="Last name *">
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Doe" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Branch">
                <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
                  <SelectTrigger className="h-9 w-full border-stone-200"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {(boot?.branches ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Skin type (Fitzpatrick)">
                <Select value={form.skinType} onValueChange={(v) => setForm((f) => ({ ...f, skinType: v }))}>
                  <SelectTrigger className="h-9 w-full border-stone-200"><SelectValue placeholder="Not assessed" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assessed</SelectItem>
                    {SKIN_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <Field label="Allergies">
                <Input value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Latex, Penicillin" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
              </Field>
            </div>
            <Field label="Medications">
              <Input value={form.medications} onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))} placeholder="e.g. Sertraline 50mg" className="h-9 border-stone-200 focus-visible:ring-emerald-600/30" />
            </Field>
            {formError ? <ErrorNote error={formError} /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submitPatient} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {saving ? "Saving…" : "Create patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient EMR sheet */}
      <Sheet open={selectedId !== null} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
          {detailError ? (
            <div className="p-6"><ErrorNote error={detailError} /></div>
          ) : !detail ? (
            <div className="p-6 pt-10"><Loading label="Opening EMR" rows={6} /></div>
          ) : (
            (() => {
              const p = detail.patient;
              const s = detail.stats;
              const fullName = `${p.firstName} ${p.lastName}`;
              return (
                <>
                  <SheetHeader className="border-b border-stone-100 px-5 pb-4 pt-5">
                    <div className="flex items-start gap-4 pr-8">
                      <Avatar name={fullName} color={p.avatarColor} size={56} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <SheetTitle className="font-display text-xl font-semibold text-stone-900">{fullName}</SheetTitle>
                          <StatusBadge meta={PATIENT_STATUS_META[p.status]} value={p.status} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-stone-500">{p.branch?.code ?? "—"}</span>
                          <span className="truncate">{p.branch?.name ?? "No branch"}</span>
                          <span>Joined {formatDate(p.joinedAt, { month: "long", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <div className="mt-2"><TagRow tags={p.tags} /></div>
                      </div>
                    </div>
                    <SheetDescription className="sr-only">Patient EMR profile</SheetDescription>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatChip label="Lifetime value">
                        <Money amount={s.lifetimeValue} currency={p.branch?.currency ?? currency} />
                      </StatChip>
                      <StatChip label="Visits">{p.visitCount}</StatChip>
                      <StatChip label="No-shows">{p.noShowCount}</StatChip>
                      <StatChip label="Membership">{s.activeMembership ?? "None"}</StatChip>
                    </div>
                  </SheetHeader>

                  <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
                    <TabsList className="mx-4 mt-3 h-auto w-fit justify-start rounded-xl bg-stone-100 p-1">
                      <TabsTrigger value="overview" className="px-3 text-xs">Overview</TabsTrigger>
                      <TabsTrigger value="medical" className="px-3 text-xs">Medical</TabsTrigger>
                      <TabsTrigger value="treatments" className="px-3 text-xs">Treatments</TabsTrigger>
                      <TabsTrigger value="notes" className="px-3 text-xs">Notes</TabsTrigger>
                      <TabsTrigger value="consents" className="px-3 text-xs">Consents</TabsTrigger>
                    </TabsList>

                    {/* ── Overview ── */}
                    <TabsContent value="overview" className="mt-0 min-h-0 flex-1 overflow-y-auto auralis-scroll px-4 pb-5 pt-3">
                      <div className="space-y-5">
                        <section>
                          <SectionLabel icon={<UserPlus className="size-3" />}>Contact</SectionLabel>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 px-3 py-2.5">
                              <Mail className="size-4 shrink-0 text-stone-400" />
                              <span className="truncate text-sm text-stone-700">{p.email ?? "No email on file"}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 px-3 py-2.5">
                              <Phone className="size-4 shrink-0 text-stone-400" />
                              <span className="truncate text-sm text-stone-700">{p.phone ?? "No phone on file"}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 px-3 py-2.5">
                              <MapPin className="size-4 shrink-0 text-stone-400" />
                              <span className="truncate text-sm text-stone-700">{[p.city, p.country].filter(Boolean).join(", ") || "Location unknown"}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 px-3 py-2.5">
                              <UserPlus className="size-4 shrink-0 text-stone-400" />
                              <span className="truncate text-sm text-stone-700">{p.source ?? "Unknown source"}</span>
                            </div>
                          </div>
                        </section>

                        <section>
                          <SectionLabel icon={<CalendarDays className="size-3" />}>Upcoming appointments</SectionLabel>
                          {detail.upcoming.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">No upcoming appointments</p>
                          ) : (
                            <div className="space-y-2">
                              {detail.upcoming.slice(0, 5).map((a) => (
                                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white px-3 py-2.5">
                                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-base">{a.service.emoji}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-stone-800">{a.service.name}</p>
                                    <p className="truncate text-xs text-stone-500">{a.provider.name} · {a.branch.code}</p>
                                  </div>
                                  <div className="hidden shrink-0 text-right sm:block">
                                    <p className="text-xs font-medium text-stone-700">{formatDateTime(a.startsAt)}</p>
                                  </div>
                                  <StatusBadge meta={APPOINTMENT_STATUS_META[a.status]} value={a.status} />
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section>
                          <SectionLabel icon={<History className="size-3" />}>Last visit</SectionLabel>
                          {detail.lastVisit ? (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-600/20 bg-emerald-50/50 px-3 py-2.5">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-base">{detail.lastVisit.service.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-stone-800">{detail.lastVisit.service.name}</p>
                                <p className="truncate text-xs text-stone-500">with {detail.lastVisit.provider.name} · {formatDate(detail.lastVisit.startsAt, { month: "long", day: "numeric", year: "numeric" })}</p>
                              </div>
                              <Money amount={detail.lastVisit.price} currency={detail.lastVisit.branch.currency} className="shrink-0 text-sm font-semibold text-stone-700" />
                            </div>
                          ) : (
                            <p className="rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">No completed visits yet</p>
                          )}
                        </section>

                        <section>
                          <SectionLabel icon={<Receipt className="size-3" />}>Recent invoices</SectionLabel>
                          {detail.invoices.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">No invoices yet</p>
                          ) : (
                            <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto auralis-scroll rounded-xl border border-stone-200/80">
                              {detail.invoices.map((inv) => (
                                <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                                  <Receipt className="size-4 shrink-0 text-stone-300" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-stone-800">{inv.number}</p>
                                    <p className="text-[11px] text-stone-400">{formatDate(inv.createdAt)}</p>
                                  </div>
                                  <Money amount={inv.total} currency={inv.currency} className="shrink-0 text-sm font-semibold text-stone-700" />
                                  <StatusBadge meta={INVOICE_STATUS_META[inv.status]} value={inv.status} />
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    </TabsContent>

                    {/* ── Medical ── */}
                    <TabsContent value="medical" className="mt-0 min-h-0 flex-1 overflow-y-auto auralis-scroll px-4 pb-5 pt-3">
                      <div className="space-y-3">
                        <SectionLabel icon={<HeartPulse className="size-3" />}>Medical record</SectionLabel>
                        {p.allergies ? (
                          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" />
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Allergies</p>
                              <p className="mt-0.5 text-sm text-rose-900">{p.allergies}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-stone-50/60 px-4 py-3">
                            <CircleCheck className="size-4 shrink-0 text-emerald-600" />
                            <p className="text-sm text-stone-500">No known allergies</p>
                          </div>
                        )}
                        <MedField label="Medications" value={p.medications} empty="No medications on file" />
                        <MedField label="Medical history" value={p.medicalHistory} empty="No medical history recorded" />
                        <MedField label="Skin type (Fitzpatrick)" value={p.skinType} empty="Not assessed" />
                        <MedField label="Emergency contact" value={p.emergencyContact} empty="None provided" />
                        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 px-4 py-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Marketing opt-in</p>
                            <p className="mt-0.5 text-sm text-stone-700">{p.marketingOptIn ? "Opted in to campaigns" : "Not opted in"}</p>
                          </div>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", p.marketingOptIn ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-stone-200 bg-stone-100 text-stone-500")}>
                            {p.marketingOptIn ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Treatments ── */}
                    <TabsContent value="treatments" className="mt-0 min-h-0 flex-1 overflow-y-auto auralis-scroll px-4 pb-5 pt-3">
                      {detail.treatments.length === 0 ? (
                        <EmptyState icon={<Stethoscope className="size-5" />} title="No treatments recorded" description="Completed procedures will build up this clinical timeline." />
                      ) : (
                        <div className="max-h-96 space-y-2.5 overflow-y-auto auralis-scroll pr-1">
                          {detail.treatments.map((t) => (
                            <div key={t.id} className="rounded-xl border border-stone-200/80 bg-white p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-stone-800">{t.serviceName}</p>
                                {t.followUpDays != null && (
                                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                    Follow-up · {t.followUpDays}d
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Avatar name={t.provider.name} color={t.provider.avatarColor} size={18} />
                                  {t.provider.name}
                                </span>
                                <span>{formatDate(t.performedAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                                {t.areaTreated && <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-600">{t.areaTreated}</span>}
                                {t.unitsUsed != null && <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-600">{t.unitsUsed} units</span>}
                              </div>
                              {t.notes && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">{t.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Notes ── */}
                    <TabsContent value="notes" className="mt-0 min-h-0 flex-1 overflow-y-auto auralis-scroll px-4 pb-5 pt-3">
                      {detail.notes.length === 0 ? (
                        <EmptyState icon={<FileText className="size-5" />} title="No clinical notes yet" description="Consultation and intake notes will appear here." />
                      ) : (
                        <div className="max-h-96 space-y-2.5 overflow-y-auto auralis-scroll pr-1">
                          {detail.notes.map((n) => (
                            <div key={n.id} className="flex gap-3 rounded-xl border border-stone-200/80 bg-white p-3">
                              <Avatar name={n.author.name} color={n.author.avatarColor} size={32} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-stone-800">{n.author.name}</p>
                                  {n.author.title && <span className="text-[11px] text-stone-400">{n.author.title}</span>}
                                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", NOTE_TYPE_CLASS[n.type] ?? "border-stone-200 bg-stone-100 text-stone-600")}>
                                    {n.type.replace(/_/g, " ").toLowerCase()}
                                  </span>
                                  <span className="ml-auto shrink-0 text-[11px] text-stone-400">{timeAgo(n.createdAt)}</span>
                                </div>
                                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{n.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Consents ── */}
                    <TabsContent value="consents" className="mt-0 min-h-0 flex-1 overflow-y-auto auralis-scroll px-4 pb-5 pt-3">
                      <div className="mb-3">
                        {p.consentsSigned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            <CircleCheck className="size-3.5" /> All consents signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            <CircleAlert className="size-3.5" /> Consents incomplete
                          </span>
                        )}
                      </div>
                      {detail.consents.length === 0 ? (
                        <EmptyState icon={<FileSignature className="size-5" />} title="No signed consents" description="Signed consent forms will be archived here." />
                      ) : (
                        <div className="space-y-2">
                          {detail.consents.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white px-3 py-2.5">
                              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-100">
                                <FileSignature className="size-4 text-stone-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-stone-800">
                                  {c.form.title} <span className="text-[10px] font-semibold text-stone-400">v{c.form.version}</span>
                                </p>
                                <p className="text-[11px] text-stone-400">Signed {formatDate(c.signedAt, { month: "short", day: "numeric", year: "numeric" })}</p>
                              </div>
                              <Signature value={c.signatureData} />
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              );
            })()
          )}
        </SheetContent>
      </Sheet>

      <div className="h-2" />
    </motion.div>
  );
}
