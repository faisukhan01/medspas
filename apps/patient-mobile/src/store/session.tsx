// ── In-memory session (demo) ────────────────────────────────────────────────
// Guest browsing + email-only patient sign-in. Intentionally not persisted —
// a production build would store a device token (SecureStore) backed by
// OTP / magic-link auth on the server.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { PatientIdentity } from "@/lib/types";

interface SessionValue {
  /** true once the provider has mounted and routing gates can act */
  hydrated: boolean;
  patient: PatientIdentity | null;
  isGuest: boolean;
  login: (email: string) => Promise<void>;
  enterGuest: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<PatientIdentity | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Ready after first commit so routing gates never act before mount.
  useEffect(() => {
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      throw new ApiError("That doesn't look like an email — try again", 400);
    }
    try {
      const { patient: found } = await api.patientLogin(trimmed);
      setIsGuest(false);
      setPatient(found);
    } catch (err) {
      // Surface the API's friendly message (e.g. unknown email → 404 copy).
      if (err instanceof ApiError) throw err;
      throw new ApiError("Sign-in failed — please try again", 0);
    }
  }, []);

  const enterGuest = useCallback(() => {
    setPatient(null);
    setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    setPatient(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ hydrated, patient, isGuest, login, enterGuest, logout }),
    [hydrated, patient, isGuest, login, enterGuest, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Patient's csv tags as an array, e.g. ["VIP", "Member"]. */
export function usePatientTags(): string[] {
  const { patient } = useSession();
  if (!patient?.tags) return [];
  return patient.tags.split(",").map((t) => t.trim()).filter(Boolean);
}
