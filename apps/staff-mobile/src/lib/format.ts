// ── Formatting helpers: currency, dates, times, initials ────────────────────
// Two money modes, matching the backend:
//   • money()      — USD-stored amounts (service prices) shown in branch currency
//                    at the same 0.79 GBP rate the appointments API applies.
//   • moneyExact() — amounts already stored in branch currency (appointment
//                    prices, invoices, lifetime value) — no conversion.

const GBP_RATE = 0.79;

export function currencySymbol(currency: string): string {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
    default:
      return "$";
  }
}

/** Convert a USD-stored amount into the branch's currency. */
export function convertFromUsd(amountUsd: number, currency: string): number {
  return currency === "GBP" ? Math.round(amountUsd * GBP_RATE) : Math.round(amountUsd);
}

/** "$220" / "£174" — USD-stored amounts converted for display. */
export function money(amountUsd: number, currency = "USD"): string {
  const symbol = currencySymbol(currency);
  const value = convertFromUsd(amountUsd, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
  return `${symbol}${formatted}`;
}

/** Already-stored amounts (appointment price, invoices, LTV) — no conversion. */
export function moneyExact(amount: number, currency = "USD"): string {
  const symbol = currencySymbol(currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/** "Tue, 14 May" */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** "Tuesday 14 May 2025" */
export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "2:30 PM" */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "Tue 14 May · 2:30 PM" */
export function formatDateTime(iso: string | Date): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** "just now" · "5m ago" · "3h ago" · "2d ago" · "14 May" */
export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** "Ava Thompson" → "AT" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** "US" → 🇺🇸, "UK"/"GB" → 🇬🇧 */
export function flagFor(country: string): string {
  switch (country.toUpperCase()) {
    case "US":
    case "USA":
      return "🇺🇸";
    case "UK":
    case "GB":
      return "🇬🇧";
    default:
      return "📍";
  }
}

/** csv tags → labels: "VIP,Member" → ["VIP", "Member"] */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function csvList(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Day helpers (local time) ────────────────────────────────────────────────

/** Stable local-time key for a day: "2025-05-14". */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

export function isToday(d: Date): boolean {
  return dateKey(d) === dateKey(new Date());
}

/** Hourly "HH:00" slots between branch hours, e.g. 09:00–17:00. */
export function timeSlots(open = "09:00", close = "17:00"): string[] {
  const openHour = Number.parseInt(open.split(":")[0] ?? "9", 10);
  const closeHour = Number.parseInt(close.split(":")[0] ?? "17", 10);
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots.length ? slots : ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
}
