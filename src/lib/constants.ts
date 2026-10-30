// ═════════════════════════════════════════════════════════════════
//  Auralis — shared domain constants (statuses, roles, labels, nav)
//  SQLite has no native enums — string unions are enforced here.
// ═════════════════════════════════════════════════════════════════

export const ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "RECEPTIONIST", "PROVIDER", "MARKETER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", OWNER: "Owner", ADMIN: "Administrator", MANAGER: "Branch Manager",
  RECEPTIONIST: "Receptionist", PROVIDER: "Provider", MARKETER: "Marketing",
};

export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CHECKED_IN: { label: "Checked in", className: "bg-teal-100 text-teal-800 border-teal-200" },
  IN_PROGRESS: { label: "In progress", className: "bg-violet-100 text-violet-800 border-violet-200" },
  COMPLETED: { label: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-700 border-rose-200" },
  NO_SHOW: { label: "No-show", className: "bg-red-100 text-red-800 border-red-200" },
};

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONSULT_BOOKED", "CONVERTED", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_META: Record<string, { label: string; description: string; accent: string }> = {
  NEW: { label: "New", description: "Needs first contact", accent: "#b45309" },
  CONTACTED: { label: "Contacted", description: "Reached out, awaiting reply", accent: "#0d9488" },
  QUALIFIED: { label: "Qualified", description: "Budget + timeline confirmed", accent: "#7c3aed" },
  CONSULT_BOOKED: { label: "Consult booked", description: "Consultation on calendar", accent: "#047857" },
  CONVERTED: { label: "Converted", description: "Became a paying patient", accent: "#166534" },
  LOST: { label: "Lost", description: "Closed — nurture later", accent: "#78716c" },
};

export const LEAD_SOURCES = ["WEBSITE", "INSTAGRAM", "GOOGLE_ADS", "FACEBOOK", "REFERRAL", "WALK_IN", "AI_AGENT", "EVENT", "PRINT"] as const;
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website", INSTAGRAM: "Instagram", GOOGLE_ADS: "Google Ads", FACEBOOK: "Facebook",
  REFERRAL: "Referral", WALK_IN: "Walk-in", AI_AGENT: "AI Agent", EVENT: "Event", PRINT: "Print",
};

export const CAMPAIGN_TYPES = ["SMS", "EMAIL", "PROMO", "WIN_BACK", "REFERRAL", "BIRTHDAY", "REBOOK"] as const;
export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  SMS: "SMS", EMAIL: "Email", PROMO: "Promotion", WIN_BACK: "Win-back",
  REFERRAL: "Referral", BIRTHDAY: "Birthday", REBOOK: "Rebook",
};
export const CAMPAIGN_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-stone-100 text-stone-700 border-stone-200" },
  SCHEDULED: { label: "Scheduled", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { label: "Completed", className: "bg-teal-100 text-teal-800 border-teal-200" },
};

export const INVOICE_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-stone-100 text-stone-700 border-stone-200" },
  UNPAID: { label: "Unpaid", className: "bg-amber-100 text-amber-800 border-amber-200" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REFUNDED: { label: "Refunded", className: "bg-rose-100 text-rose-700 border-rose-200" },
  PARTIALLY_REFUNDED: { label: "Part refunded", className: "bg-orange-100 text-orange-800 border-orange-200" },
};

export const PATIENT_STATUS_META: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  INACTIVE: { label: "Inactive", className: "bg-stone-100 text-stone-700 border-stone-200" },
  CHURN_RISK: { label: "Churn risk", className: "bg-red-100 text-red-800 border-red-200" },
};

export const AI_AGENTS = [
  { id: "DISCOVERY", name: "Discovery Agent", icon: "Globe", color: "#047857",
    tagline: "Local SEO, Google Business Profile, blogs & social content",
    skills: ["Local SEO audits", "GBP management", "Blog generation", "Competitor insights", "Review generation"] },
  { id: "FRONT_DESK", name: "AI Front Desk", icon: "PhoneCall", color: "#0d9488",
    tagline: "24/7 receptionist — calls, SMS, FAQs, human handoff",
    skills: ["Call answering", "Voice booking", "SMS conversations", "Missed-call recovery", "Staff handoff"] },
  { id: "BOOKING", name: "Booking Agent", icon: "CalendarCheck", color: "#b45309",
    tagline: "Books, confirms and protects the calendar",
    skills: ["Availability checks", "Conflict prevention", "Deposit handling", "Abandoned booking recovery", "Confirmations"] },
  { id: "ENGAGEMENT", name: "Engagement Agent", icon: "Zap", color: "#7c3aed",
    tagline: "Follows up every lead in minutes, not days",
    skills: ["Lead follow-ups", "Outbound messages", "Qualification", "Consult follow-ups", "Inactive recovery"] },
  { id: "LOYALTY", name: "Loyalty Agent", icon: "Heart", color: "#be185d",
    tagline: "Keeps patients coming back and spend growing",
    skills: ["Rebooking reminders", "Birthday campaigns", "Win-back offers", "Satisfaction surveys", "Churn-risk alerts"] },
] as const;

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles?: Role[];
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "appointments", label: "Appointments", icon: "CalendarDays" },
  { id: "patients", label: "Patients & EMR", icon: "Users" },
  { id: "leads", label: "Lead Pipeline", icon: "Filter" },
  { id: "ai-growth", label: "AI Growth Center", icon: "Sparkles", badge: "AI" },
  { id: "marketing", label: "Marketing", icon: "Megaphone" },
  { id: "billing", label: "Payments", icon: "CreditCard" },
  { id: "inventory", label: "Inventory", icon: "Package" },
  { id: "staff", label: "Staff & Providers", icon: "Stethoscope" },
  { id: "locations", label: "Locations", icon: "MapPin" },
  { id: "analytics", label: "Analytics", icon: "BarChart3" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export const SERVICE_CATEGORIES_ICONS: Record<string, string> = {
  Injectables: "💉", "Laser & Light": "🔦", "Facials & Skin": "🧖",
  "Body Contouring": "💪", "Wellness & IV": "🌿", "Hair Restoration": "💇",
};

export const DEMO_ACCOUNTS = [
  { email: "owner@auralis.demo", name: "Amara Okafor", role: "Owner — full access", },
  { email: "admin@auralis.demo", name: "Sophie Turner", role: "Administrator" },
  { email: "reception@auralis.demo", name: "Ella Brooks", role: "Front desk" },
  { email: "priya@auralis.demo", name: "Dr. Priya Nair", role: "Provider (NP)" },
  { email: "marketing@auralis.demo", name: "Noah Bennett", role: "Growth marketing" },
];
export const DEMO_PASSWORD = "demo1234";
