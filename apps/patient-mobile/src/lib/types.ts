// ── Payload contracts shared by the patient app ─────────────────────────────
// Shapes mirror the Auralis web API (see /api/bootstrap, /api/appointments,
// /api/staff and the patient-app auth route).

export interface Tenant {
  name: string;
  logoEmoji: string;
  currency: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  country: string; // "US" | "UK"
  currency: string; // "USD" | "GBP"
  city: string | null;
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  phone: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  category: string;
  price: number; // stored in USD; convert per branch currency
  currency: string;
  durationMin: number;
  depositAmount: number;
  requiresConsultation: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  colorHex: string;
  icon: string | null;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string; // MONTHLY | QUARTERLY | ANNUAL
  benefits: string | null; // csv
}

export interface BootstrapPayload {
  tenant: Tenant;
  branches: Branch[];
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

export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  price: number;
  source: string;
  notes: string | null;
  provider: { name: string; avatarColor: string; title: string | null };
  service: { name: string; emoji: string; category: string };
  branch: { name: string; code: string; currency: string };
}

export interface AppointmentsPayload {
  appointments: Appointment[];
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

/** Returned by POST /api/auth/patient and stored in the in-memory session. */
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

export interface BookingInput {
  branchId: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  startsAt: string; // ISO
  source: "ONLINE";
  notes?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface UiMessage extends ChatTurn {
  id: string;
  pending?: boolean;
}
