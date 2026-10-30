// ── Typed fetch client for the Auralis web API ──────────────────────────────
import type {
  AppointmentsPayload,
  Appointment,
  BookingInput,
  BootstrapPayload,
  ChatTurn,
  PatientIdentity,
  PatientProfile,
  PatientRecordPayload,
  StaffPayload,
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

// ── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  bootstrap: () => request<BootstrapPayload>("/api/bootstrap"),

  staff: () => request<StaffPayload>("/api/staff"),

  /** All appointments for a patient inside a wide window. */
  appointments: (patientId: string, fromIso: string, toIso: string) =>
    request<AppointmentsPayload>(
      `/api/appointments?patientId=${encodeURIComponent(patientId)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
    ),

  createAppointment: (input: BookingInput) =>
    request<{ appointment: Appointment }>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  cancelAppointment: (id: string) =>
    request<{ appointment: Appointment }>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED", cancellationReason: "Cancelled by patient" }),
    }),

  /** Demo-grade email-only sign-in (404 → friendly error from the route). */
  patientLogin: (email: string) =>
    request<{ patient: PatientIdentity }>("/api/auth/patient", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  patientProfile: (patientId: string) =>
    request<PatientProfile>(`/api/auth/patient?id=${encodeURIComponent(patientId)}`),

  /** Full record subset (memberships, packages, invoices, stats) from the EMR route. */
  patientRecord: (patientId: string) =>
    request<PatientRecordPayload>(`/api/patients/${encodeURIComponent(patientId)}`),

  aiChat: (message: string, history: ChatTurn[]) =>
    request<{ reply: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};

// ── Tiny session cache for the reference payload ────────────────────────────
// Home, service detail, booking and profile all need /api/bootstrap — fetch it
// once per app run and share the promise.

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

let staffPromise: Promise<StaffPayload> | null = null;

export function loadStaff(force = false): Promise<StaffPayload> {
  if (force || !staffPromise) {
    staffPromise = api.staff().catch((err) => {
      staffPromise = null;
      throw err;
    });
  }
  return staffPromise;
}
