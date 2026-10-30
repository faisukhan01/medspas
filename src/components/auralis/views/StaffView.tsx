"use client";

// ═══════════════════════════════════════════════════════════════
//  Staff & Providers — directory, role groups, performance, roster
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, CircleDollarSign, Sparkles, Star, Stethoscope, UserPlus, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { useApp } from "../store";
import {
  api, post, patch, PageHeader, StatCard, Avatar, Money, Loading, ErrorNote, EmptyState,
} from "../ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface StaffPerf {
  appointments30d: number; completed30d: number; revenue30d: number; commission30d: number; noShows: number;
}
interface StaffRow {
  id: string; name: string; email: string; role: string; title: string | null;
  branchId: string | null; avatarColor: string; specialties: string | null;
  qualifications: string | null; commissionRate: number; rating: number; isActive: boolean;
  branch?: { id: string; name: string; code: string } | null;
  perf: StaffPerf;
}

const ROLE_GROUPS: { key: string; label: string; blurb: string; roles: string[]; icon: typeof Users }[] = [
  { key: "leadership", label: "Leadership", blurb: "Owners & administrators", roles: ["OWNER", "ADMIN"], icon: Sparkles },
  { key: "managers", label: "Branch management", blurb: "Running day-to-day operations", roles: ["MANAGER"], icon: Building2 },
  { key: "medical", label: "Medical team", blurb: "Providers delivering treatments", roles: ["PROVIDER"], icon: Stethoscope },
  { key: "frontdesk", label: "Front desk", blurb: "Reception & patient experience", roles: ["RECEPTIONIST"], icon: Users },
  { key: "growth", label: "Growth", blurb: "Marketing & acquisition", roles: ["MARKETER"], icon: UserPlus },
];

const emptyForm = {
  name: "", email: "", role: "PROVIDER", title: "", branchId: "", specialties: "", commissionRate: "10",
};

export default function StaffView() {
  const { boot } = useApp();
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const baseCurrency = boot?.tenant?.currency ?? boot?.branches[0]?.currency ?? "USD";
  const branchById = useMemo(() => new Map((boot?.branches ?? []).map((b) => [b.id, b])), [boot]);

  const load = useCallback(() => {
    api<{ staff: StaffRow[] }>("/api/staff")
      .then((d) => setStaff(d.staff))
      .catch(setError);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = staff ?? [];
    const providers = list.filter((s) => s.role === "PROVIDER");
    const revenue = list.reduce((sum, s) => sum + (s.perf?.revenue30d ?? 0), 0);
    const rated = list.filter((s) => s.rating > 0);
    const avgRating = rated.length ? rated.reduce((sum, s) => sum + s.rating, 0) / rated.length : 0;
    return { total: list.length, providers: providers.length, revenue, avgRating };
  }, [staff]);

  const grouped = useMemo(() => {
    const list = staff ?? [];
    return ROLE_GROUPS.map((g) => ({ ...g, members: list.filter((s) => g.roles.includes(s.role)) }))
      .filter((g) => g.members.length > 0);
  }, [staff]);

  const toggleActive = useCallback(async (s: StaffRow) => {
    const next = !s.isActive;
    setStaff((prev) => prev?.map((r) => (r.id === s.id ? { ...r, isActive: next } : r)) ?? prev);
    try {
      await patch("/api/staff", { id: s.id, isActive: next });
    } catch {
      setStaff((prev) => prev?.map((r) => (r.id === s.id ? { ...r, isActive: !next } : r)) ?? prev);
    }
  }, []);

  const submitNewStaff = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required."); return; }
    setSaving(true); setFormError(null);
    try {
      await post("/api/staff", {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        title: form.title.trim() || undefined,
        branchId: form.branchId || undefined,
        specialties: form.specialties.trim() || undefined,
        commissionRate: Number(form.commissionRate) || 0,
      });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create staff member.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  if (error) return <div className="p-6"><ErrorNote error={error} /></div>;
  if (!staff) return <div className="p-6 pt-10"><Loading label="Loading the team" rows={5} /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Staff & Providers"
        subtitle="Your people across every location — roles, specialties, ratings and 30-day performance."
        actions={
          <button
            onClick={() => { setForm(emptyForm); setFormError(null); setDialogOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors"
          >
            <UserPlus className="size-4" /> Add staff
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total staff" value={stats.total} sub={`${grouped.length} role groups`} icon={<Users className="size-4" />} accent="#047857" />
        <StatCard label="Providers" value={stats.providers} sub="Delivering treatments" icon={<Stethoscope className="size-4" />} accent="#0d9488" />
        <StatCard label="Revenue · 30 days" value={<Money amount={stats.revenue} currency={baseCurrency} />}
          sub="Attributed to providers" icon={<CircleDollarSign className="size-4" />} accent="#b45309" />
        <StatCard label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(2) : "—"} sub="Out of 5 · patient reviews"
          icon={<Star className="size-4" />} accent="#d97706" />
      </div>

      {staff.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <EmptyState icon={<Users className="size-5" />} title="No staff yet"
            description="Add your first team member to start assigning providers to appointments."
            action={<button onClick={() => setDialogOpen(true)} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors">Add staff</button>} />
        </div>
      )}

      {grouped.map((group) => (
        <section key={group.key} className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-7 rounded-lg bg-emerald-700/10 text-emerald-800 grid place-items-center">
              <group.icon className="size-4" />
            </span>
            <h2 className="font-display text-base font-semibold text-stone-800">{group.label}</h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">{group.members.length}</span>
            <p className="hidden sm:block text-xs text-stone-400 ml-1">{group.blurb}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.members.map((s, i) => {
              const isProvider = s.role === "PROVIDER";
              const currency = (s.branchId ? branchById.get(s.branchId)?.currency : null) ?? baseCurrency;
              const specialties = (s.specialties ?? "").split(",").map((t) => t.trim()).filter(Boolean);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                  className={cn(
                    "rounded-2xl border border-stone-200/80 bg-white shadow-sm p-4 md:p-5 hover:shadow-md transition-shadow",
                    !s.isActive && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} color={s.avatarColor} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-900 truncate">{s.name}</p>
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 shrink-0">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />{s.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{s.title ?? s.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="rounded-full bg-emerald-700/10 border border-emerald-700/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </span>
                        {s.branch && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                            <Building2 className="size-3" />{s.branch.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s)} aria-label={`Toggle ${s.name} active`} />
                      <span className={cn("text-[9px] font-medium uppercase tracking-wide", s.isActive ? "text-emerald-700" : "text-stone-400")}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {specialties.map((sp) => (
                        <span key={sp} className="rounded-full bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-medium text-amber-800">{sp}</span>
                      ))}
                    </div>
                  )}

                  {isProvider && s.perf && (
                    <div className="grid grid-cols-3 gap-2 border-t border-stone-100 mt-3.5 pt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-stone-400">30d appts</p>
                        <p className="text-sm font-semibold text-stone-800">{s.perf.appointments30d}<span className="text-[10px] font-normal text-stone-400"> ({s.perf.completed30d} done)</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-stone-400">30d revenue</p>
                        <p className="text-sm font-semibold text-stone-800"><Money amount={s.perf.revenue30d} currency={currency} /></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-stone-400">Commission</p>
                        <p className="text-sm font-semibold text-emerald-800"><Money amount={s.perf.commission30d} currency={currency} /></p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Add staff dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add staff member</DialogTitle>
            <DialogDescription>Creates a login with the demo password. They can be toggled inactive any time.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="st-name" className="text-xs text-stone-600">Full name *</Label>
                <Input id="st-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Doe" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-email" className="text-xs text-stone-600">Email *</Label>
                <Input id="st-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@clinic.com" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-stone-600">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="w-full border-stone-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "SUPER_ADMIN").map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-title" className="text-xs text-stone-600">Title</Label>
                <Input id="st-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Aesthetic Nurse Practitioner" className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-stone-600">Home branch</Label>
                <Select value={form.branchId || "none"} onValueChange={(v) => setForm({ ...form, branchId: v === "none" ? "" : v })}>
                  <SelectTrigger className="w-full border-stone-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {(boot?.branches ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} · {b.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-comm" className="text-xs text-stone-600">Commission rate (%)</Label>
                <Input id="st-comm" type="number" min={0} max={100} value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className="border-stone-200 focus-visible:ring-emerald-600/30" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="st-spec" className="text-xs text-stone-600">Specialties <span className="text-stone-400">(comma-separated)</span></Label>
              <Input id="st-spec" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Botox, Fillers, Laser" className="border-stone-200 focus-visible:ring-emerald-600/30" />
            </div>

            {formError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
          </div>

          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
            <button
              onClick={submitNewStaff}
              disabled={saving}
              className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create staff member"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </motion.div>
  );
}
