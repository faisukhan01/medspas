// ── Formatting helpers: currency (£/$), dates, times, initials ──────────────
// Prices are stored in USD across the backend. UK branches charge GBP at the
// same 0.79 rate the appointments API applies server-side, so what the patient
// sees always matches what the server books.

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

/** "$220" / "£174" — whole numbers stay whole, cents show when present. */
export function money(amount: number, currency = "USD"): string {
  const symbol = currencySymbol(currency);
  const value = convertFromUsd(amount, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
  return `${symbol}${formatted}`;
}

/** Already-stored amounts (invoices, LTV, plan prices) — no conversion. */
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

/** Billing cycle label: MONTHLY → "/mo" */
export function cycleSuffix(billingCycle: string): string {
  switch (billingCycle) {
    case "MONTHLY":
      return "/mo";
    case "QUARTERLY":
      return "/qtr";
    case "ANNUAL":
      return "/yr";
    default:
      return `/${billingCycle.toLowerCase()}`;
  }
}

/** csv tags → labels */
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
