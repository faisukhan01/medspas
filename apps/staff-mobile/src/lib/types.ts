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
  emoji: string;
  category: string;
  price: number; // stored in USD; converted per branch currency at booking time
  currency?: string;
  durationMin: number;
  depositAmount?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  colorHex?: string;
}

/** GET /api/bootstrap — reference data (subset the staff app consumes). */
export interface BootstrapPayload {
  tenant: { id?: string; name: string; logoEmoji?: string; currency: string };
  user?: StaffUser | null;
  branches: Branch[];
  staff?: StaffUser[];
  services: Service[];
  categories: ServiceCategory[];
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
