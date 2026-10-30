// ── Typed fetch client for the Auralis web API (staff app) ──────────────────
// Auth uses the web backend's signed session cookie (auralis_session), set by
// POST /api/auth/login and replayed by the native fetch cookie store.
import type {
  Appointment,
  AppointmentPatch,
  AppointmentsPayload,
  BookingInput,
  BootstrapPayload,
  BranchesPayload,
  PatientDetailPayload,
  PatientsPayload,
  StaffUser,
} from "./types";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "include", // keep + replay the auralis_session cookie
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the clinic network — check your connection", 0);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// ── Query-string helper (skips empty values) ─────────────────────────────────
type QueryValue = string | number | undefined;

export function qs(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface AppointmentQuery {
  branchId?: string;
  providerId?: string;
  patientId?: string;
  from?: string; // ISO
  to?: string; // ISO
  take?: number;
}

export interface PatientQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  branchId?: string;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  /** POST /api/auth/login → sets the session cookie + returns the user. */
  login: (email: string, password: string) =>
    request<{ user: StaffUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** GET /api/auth/me → current session user (401 when signed out). */
  me: () => request<{ user: StaffUser }>("/api/auth/me"),

  /** GET /api/bootstrap → tenant, branches, services, categories. */
  bootstrap: () => request<BootstrapPayload>("/api/bootstrap"),

  /** GET /api/branches → branches with rooms + 30-day performance. */
  branches: () => request<BranchesPayload>("/api/branches"),

  /** GET /api/appointments?branchId=&providerId=&from=&to= — day/week lists. */
  appointments: (query: AppointmentQuery = {}) =>
    request<AppointmentsPayload>(
      `/api/appointments${qs({
        branchId: query.branchId,
        providerId: query.providerId,
        patientId: query.patientId,
        from: query.from,
        to: query.to,
        take: query.take,
      })}`
    ),

  /** POST /api/appointments → 201 { appointment } (409 on slot conflict). */
  createAppointment: (input: BookingInput) =>
    request<{ appointment: Appointment }>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** PATCH /api/appointments/[id] → status moves, notes, deposits, moves. */
  updateAppointment: (id: string, patch: AppointmentPatch) =>
    request<{ appointment: Appointment }>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  /** GET /api/patients?q=&page=&pageSize= — paginated, searchable directory. */
  patients: (query: PatientQuery = {}) =>
    request<PatientsPayload>(
      `/api/patients${qs({
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
        branchId: query.branchId,
      })}`
    ),

  /** GET /api/patients/[id] — 360° EMR payload. */
  patient: (id: string) =>
    request<PatientDetailPayload>(`/api/patients/${encodeURIComponent(id)}`),
};

// ── Tiny session cache for the reference payload ────────────────────────────
// Booking (services + branch hours) needs /api/bootstrap — fetch it once per
// app run and share the promise.

let bootstrapPromise: Promise<BootstrapPayload> | null = null;

export function loadBootstrap(force = false): Promise<BootstrapPayload> {
  if (force || !bootstrapPromise) {
    bootstrapPromise = api.bootstrap().catch((err) => {
      bootstrapPromise = null; // allow retry on next mount
      throw err;
    });
  }
  return bootstrapPromise;
}
