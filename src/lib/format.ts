// ── shared formatting helpers (safe for client & server) ────────────────────

export function formatMoney(amount: number | null | undefined, currency = "USD"): string {
  const v = amount ?? 0;
  return new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "en-US", {
    style: "currency", currency, maximumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v);
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts);
}

export function formatTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return `${formatDate(d)} · ${formatTime(d)}`;
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}
