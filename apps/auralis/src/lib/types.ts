// ── Payload contracts shared by the staff app ───────────────────────────────
// Shapes mirror the Auralis web API (see /api/auth/login, /api/bootstrap,
// /api/appointments, /api/patients, /api/branches). Fields the UI renders are
// typed; extra server fields are intentionally omitted.

/** Signed-in staff member (GET /api/auth/login → { user }, GET /api/auth/me). */
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string; // OWNER | ADMIN | MANAGER | RECEPTIONIST | PROVIDER | ...
  title: string | null;
  specialties?: string | null; // csv
  qualifications?: string | null; // csv
  avatarColor: string;
  rating?: number;
  branchId: string | null;
  isActive?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string; // "NYC-1", "LDN-1"
  country: string; // "US" | "UK"
  currency: string; // "USD" | "GBP"
  timezone?: string;
  city: string | null;
  address?: string | null;
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  phone: string | null;
}

/** GET /api/branches enriches each branch with rooms + 30-day performance. */
export interface BranchDetail extends Branch {
  isActive?: boolean;
  rooms?: { id: string; name: string; type: string }[];
  perf?: {
    revenue30d: number;
    appointments30d: number;
    noShowRate: number;
    patients: number;
  };
}

export interface BranchesPayload {
  branches: BranchDetail[];
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  emoji: string;
  category: string;
  price: number; // stored in USD; converted per branch currency at booking time
  currency?: string;
  durationMin: number;
  depositAmount?: number;
  requiresConsultation?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  colorHex?: string;
  icon?: string | null;
}

/** GET /api/bootstrap — reference data shared by both apps. */
export interface BootstrapPayload {
  tenant: { id?: string; name: string; logoEmoji?: string; currency: string };
  user?: StaffUser | null;
  branches: Branch[];
  staff?: StaffUser[];
  services: Service[];
  categories: ServiceCategory[];
  plans: MembershipPlan[];
}

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface AppointmentPatient {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string;
  phone?: string | null;
  email?: string | null;
  tags?: string | null;
}

export interface Appointment {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  status: AppointmentStatus;
  price: number; // already in branch currency (converted server-side at booking)
  source?: string; // ONLINE | PHONE | WALK_IN | AI_AGENT | STAFF_APP
  notes: string | null;
  depositPaid?: boolean;
  depositAmount?: number;
  cancellationReason?: string | null;
  patient: AppointmentPatient;
  provider: { id?: string; name: string; avatarColor: string; title?: string | null; specialties?: string | null };
  service: { id?: string; name: string; emoji: string; category?: string; durationMin?: number; price?: number };
  branch: { id?: string; name: string; code: string; currency: string; timezone?: string };
}

export interface AppointmentsPayload {
  appointments: Appointment[];
  total?: number;
}

/** PATCH /api/appointments/[id] — partial update body. */
export interface AppointmentPatch {
  status?: AppointmentStatus;
  notes?: string | null;
  depositPaid?: boolean;
  startsAt?: string;
  cancellationReason?: string;
}

/** POST /api/appointments — create a booking (staff app source tag). */
export interface BookingInput {
  branchId: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  startsAt: string; // ISO
  source: "ONLINE" | "PHONE" | "WALK_IN" | "AI_AGENT" | "STAFF_APP";
  notes?: string;
  depositPaid?: boolean;
}

/** Row of GET /api/patients (paginated directory). */
export interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarColor: string;
  tags: string | null; // csv: "VIP,Member"
  status: string; // ACTIVE | INACTIVE | CHURN_RISK
  lifetimeValue?: number;
  visitCount?: number;
  noShowCount?: number;
  lastVisitAt?: string | null;
  branch: { id: string; name: string; code: string; currency: string } | null;
  _count?: { appointments: number; treatments: number; memberships: number };
}

export interface PatientsPayload {
  patients: PatientListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Full patient record from GET /api/patients/[id] (subset the app renders). */
export interface PatientFull {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
  avatarColor: string;
  tags: string | null;
  status?: string;
  allergies?: string | null;
  medications?: string | null;
  emergencyContact?: string | null;
  lifetimeValue?: number;
  visitCount?: number;
  noShowCount?: number;
  lastVisitAt?: string | null;
  joinedAt?: string;
  branch?: { id: string; name: string; code: string; currency: string } | null;
}

export interface InvoiceSummary {
  id: string;
  number: string; // "INV-2025-0001"
  total: number;
  currency: string;
  status: string; // PAID | UNPAID | REFUNDED | ...
  paidAt: string | null;
  createdAt: string;
}

export interface PatientDetailPayload {
  patient: PatientFull;
  appointments: Appointment[]; // latest 15, newest first
  upcoming: Appointment[]; // active + in the future
  lastVisit: Appointment | null;
  invoices: InvoiceSummary[]; // latest 10, newest first
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    noShows: number;
    lifetimeValue: number;
    activeMembership: string | null;
  };
}

// ── Patient-app contracts (merged from the patient client) ──────────────────

export interface Tenant {
  name: string;
  logoEmoji: string;
  currency: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string; // MONTHLY | QUARTERLY | ANNUAL
  benefits: string | null; // csv
}

export interface StaffMember {
  id: string;
  name: string;
  role: string; // PROVIDER | ADMIN | ...
  title: string | null;
  avatarColor: string;
  specialties: string | null; // csv
  branchId: string | null;
  rating: number | null;
  isActive: boolean;
}

export interface StaffPayload {
  staff: StaffMember[];
}

/** Returned by POST /api/auth/patient (+ /signup) — stored in the session. */
export interface PatientIdentity {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarColor: string;
  branchId: string | null;
  tags: string | null; // csv: "VIP,Member"
}

export interface PatientMembership {
  id: string;
  status: string; // ACTIVE | PAUSED | CANCELLED | PAST_DUE
  renewsAt: string | null;
  pricePaid: number | null;
  plan: MembershipPlan;
}

export interface PatientPackage {
  id: string;
  name: string;
  sessionsTotal: number;
  sessionsUsed: number;
  expiresAt: string | null;
  price: number | null;
}

export interface PatientProfile {
  patient: PatientIdentity & {
    branch: Pick<Branch, "id" | "name" | "code" | "currency" | "city"> | null;
  };
  stats: {
    upcomingAppointments: number;
    lifetimeValue: number;
    visitCount: number;
  };
  memberships: PatientMembership[];
  packages: PatientPackage[];
}

/** Subset of the full EMR payload from GET /api/patients/[id] used by Perks. */
export interface PatientRecordPayload {
  memberships: PatientMembership[];
  packages: PatientPackage[];
  invoices: PatientInvoice[];
  stats: {
    lifetimeValue: number;
    visitCount: number;
  };
}

export interface PatientInvoice {
  id?: string;
  number: string;
  total: number;
  currency: string;
  status: string; // PAID | DUE | VOID...
  paidAt: string | null;
}

export interface PatientSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  branchId?: string | null;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface UiMessage extends ChatTurn {
  id: string;
  pending?: boolean;
}
