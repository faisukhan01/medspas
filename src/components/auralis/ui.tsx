"use client";

// ── Auralis shared UI kit — every view composes from these primitives ───────
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney as fm, initials } from "@/lib/format";
import type { ReactNode } from "react";

export { formatMoney, formatDate, formatTime, formatDateTime, timeAgo, initials, pct } from "@/lib/format";
export { api, post, patch, del } from "./client";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent = "#047857", className }: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string; className?: string;
}) {
  return (
    <Card className={cn("border-stone-200/80 shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
            <p className="mt-1.5 text-xl md:text-2xl font-semibold text-stone-900 truncate">{value}</p>
            {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
          </div>
          {icon && (
            <div className="shrink-0 size-9 md:size-10 rounded-xl grid place-items-center" style={{ backgroundColor: `${accent}14`, color: accent }}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ meta, value }: { meta?: { label: string; className: string }; value: string }) {
  if (!meta) return <Badge variant="outline" className="text-xs">{value.replace(/_/g, " ")}</Badge>;
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.className)}>{meta.label}</span>;
}

export function SectionCard({ title, subtitle, actions, children, className, contentClassName }: {
  title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string; contentClassName?: string;
}) {
  return (
    <Card className={cn("border-stone-200/80 shadow-sm", className)}>
      {(title || actions) && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-semibold text-stone-800">{title}</CardTitle>}
              {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </CardHeader>
      )}
      <CardContent className={contentClassName ?? "pt-0 pb-4 px-4"}>{children}</CardContent>
    </Card>
  );
}

export function Avatar({ name, color, size = 36, className }: { name: string; color?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={cn("rounded-full grid place-items-center text-white font-semibold shrink-0", className)}
      style={{ width: size, height: size, backgroundColor: color ?? "#57534e", fontSize: size * 0.36 }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="size-12 rounded-2xl bg-stone-100 text-stone-400 grid place-items-center mb-3">{icon}</div>}
      <p className="font-medium text-stone-700">{title}</p>
      {description && <p className="text-sm text-stone-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400 animate-pulse">{label}…</p>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function Money({ amount, currency = "USD", className }: { amount: number | null | undefined; currency?: string; className?: string }) {
  return <span className={className}>{fm(amount, currency)}</span>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="h-9 w-full sm:w-64 bg-white border-stone-200 focus-visible:ring-emerald-600/30"
    />
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">
      {error instanceof Error ? error.message : "Something went wrong"}
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 5, color = "#047857", label }: {
  value: number; size?: number; stroke?: number; color?: string; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (clamped / 100) * c} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <span className="absolute text-[11px] font-semibold text-stone-700">{label ?? `${clamped}%`}</span>
    </div>
  );
}
