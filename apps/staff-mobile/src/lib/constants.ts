// ── Staff app domain constants (mirrors src/lib/constants.ts on the web) ────
import type { AppointmentStatus } from "./types";

export const BRAND_COLOR = "#047857"; // emerald-700

/** Status → hex per the Auralis design spec (used by pills, bars, accents). */
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "#d97706",
  CONFIRMED: "#047857",
  CHECKED_IN: "#0d9488",
  IN_PROGRESS: "#7c3aed",
  COMPLETED: "#78716c",
  CANCELLED: "#e11d48",
  NO_SHOW: "#dc2626",
};

/** Staff-facing labels — internal states, no patient-friendly softening. */
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export interface StatusAction {
  label: string;
  target: AppointmentStatus;
  destructive?: boolean;
}

/** Allowed lifecycle moves per current status (Confirm → Check in → Start → Complete). */
export const NEXT_ACTIONS: Record<AppointmentStatus, StatusAction[]> = {
  PENDING: [
    { label: "Confirm", target: "CONFIRMED" },
    { label: "Cancel…", target: "CANCELLED", destructive: true },
  ],
  CONFIRMED: [
    { label: "Check in", target: "CHECKED_IN" },
    { label: "Cancel…", target: "CANCELLED", destructive: true },
  ],
  CHECKED_IN: [{ label: "Start treatment", target: "IN_PROGRESS" }],
  IN_PROGRESS: [{ label: "Complete visit", target: "COMPLETED" }],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  ADMIN: "Administrator",
  MANAGER: "Branch Manager",
  RECEPTIONIST: "Receptionist",
  PROVIDER: "Provider",
  MARKETER: "Marketing",
};

/** Mirrors DEMO_ACCOUNTS in the web backend — password for all: demo1234. */
export const DEMO_ACCOUNTS = [
  { email: "owner@auralis.demo", name: "Amara Okafor", role: "Owner — full access" },
  { email: "admin@auralis.demo", name: "Sophie Turner", role: "Administrator" },
  { email: "reception@auralis.demo", name: "Ella Brooks", role: "Front desk" },
  { email: "priya@auralis.demo", name: "Dr. Priya Nair", role: "Provider (NP)" },
  { email: "marketing@auralis.demo", name: "Noah Bennett", role: "Growth marketing" },
];

export const DEMO_PASSWORD = "demo1234";
