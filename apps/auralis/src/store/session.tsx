// ── Unified session store (staff + patient, persisted) ──────────────────────
// One app, two worlds. Each role keeps its own persisted session so the app
// reopens straight into wherever you left off:
//   • staff   → AsyncStorage "auralis.staff.session.v1"   (user + branchId)
//   • patient → AsyncStorage "auralis.patient.session.v1" (identity)
// The web backend keeps the matching httpOnly session cookie for staff; the
// patient flow stays demo-grade (email = identity) until OTP lands.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "@/lib/api";
import type { PatientIdentity, PatientSignupInput, StaffUser } from "@/lib/types";

const STAFF_KEY = "auralis.staff.session.v1";
const PATIENT_KEY = "auralis.patient.session.v1";

interface StaffPersisted {
  user: StaffUser;
  branchId: string | null;
}

interface AuralisSessionValue {
  /** true once AsyncStorage has been read — routing gates wait for this. */
  hydrated: boolean;
  // staff world
  staffUser: StaffUser | null;
  branchId: string | null;
  staffLogin: (email: string, password: string) => Promise<void>;
  setBranchId: (branchId: string) => void;
  staffLogout: () => void;
  // patient world
  patient: PatientIdentity | null;
  isGuest: boolean;
  patientLogin: (email: string) => Promise<void>;
  patientSignup: (input: PatientSignupInput) => Promise<void>;
  enterGuest: () => void;
  patientLogout: () => void;
}

const SessionContext = createContext<AuralisSessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientIdentity | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const staffRef = useRef<StaffUser | null>(null);

  useEffect(() => {
    staffRef.current = staffUser;
  }, [staffUser]);

  // Restore both persisted sessions once on boot.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [staffRaw, patientRaw] = await Promise.all([
          AsyncStorage.getItem(STAFF_KEY),
          AsyncStorage.getItem(PATIENT_KEY),
        ]);
        if (!alive) return;
        if (staffRaw) {
          const parsed = JSON.parse(staffRaw) as StaffPersisted | null;
          if (parsed?.user?.id) {
            setStaffUser(parsed.user);
            setBranchIdState(parsed.branchId ?? parsed.user.branchId ?? null);
          }
        }
        if (patientRaw) {
          const parsed = JSON.parse(patientRaw) as { patient: PatientIdentity | null } | null;
          if (parsed?.patient?.id) setPatient(parsed.patient);
        }
      } catch {
        // Corrupt storage — start signed out rather than blocking the app.
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistStaff = useCallback((next: StaffPersisted | null) => {
    if (next) void AsyncStorage.setItem(STAFF_KEY, JSON.stringify(next));
    else void AsyncStorage.removeItem(STAFF_KEY);
  }, []);

  const persistPatient = useCallback((next: PatientIdentity | null) => {
    if (next) void AsyncStorage.setItem(PATIENT_KEY, JSON.stringify({ patient: next }));
    else void AsyncStorage.removeItem(PATIENT_KEY);
  }, []);

  // ── staff ──────────────────────────────────────────────────────────────────
  const staffLogin = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        throw new ApiError("That doesn't look like an email — try again", 400);
      }
      if (!password) throw new ApiError("Enter your password to continue", 400);
      try {
        const { user: found } = await api.login(trimmed, password);
        const nextBranch = found.branchId ?? null;
        setStaffUser(found);
        setBranchIdState(nextBranch);
        persistStaff({ user: found, branchId: nextBranch });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError("Sign-in failed — please try again", 0);
      }
    },
    [persistStaff]
  );

  const setBranchId = useCallback(
    (id: string) => {
      setBranchIdState(id);
      if (staffRef.current) persistStaff({ user: staffRef.current, branchId: id });
    },
    [persistStaff]
  );

  const staffLogout = useCallback(() => {
    setStaffUser(null);
    setBranchIdState(null);
    persistStaff(null);
  }, [persistStaff]);

  // ── patient ────────────────────────────────────────────────────────────────
  const patientLogin = useCallback(
    async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        throw new ApiError("That doesn't look like an email — try again", 400);
      }
      try {
        const { patient: found } = await api.patientLogin(trimmed);
        setIsGuest(false);
        setPatient(found);
        persistPatient(found);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError("Sign-in failed — please try again", 0);
      }
    },
    [persistPatient]
  );

  const patientSignup = useCallback(
    async (input: PatientSignupInput) => {
      const email = input.email.trim().toLowerCase();
      if (!input.firstName.trim() || !input.lastName.trim()) {
        throw new ApiError("Tell us your first and last name", 400);
      }
      if (!email || !email.includes("@")) {
        throw new ApiError("Enter a valid email address", 400);
      }
      try {
        const { patient: created } = await api.patientSignup({
          ...input,
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
        });
        setIsGuest(false);
        setPatient(created);
        persistPatient(created);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError("Couldn't create your profile — please try again", 0);
      }
    },
    [persistPatient]
  );

  const enterGuest = useCallback(() => {
    setPatient(null);
    setIsGuest(true);
    persistPatient(null);
  }, [persistPatient]);

  const patientLogout = useCallback(() => {
    setPatient(null);
    setIsGuest(false);
    persistPatient(null);
  }, [persistPatient]);

  const value = useMemo<AuralisSessionValue>(
    () => ({
      hydrated, staffUser, branchId, staffLogin, setBranchId, staffLogout,
      patient, isGuest, patientLogin, patientSignup, enterGuest, patientLogout,
    }),
    [hydrated, staffUser, branchId, staffLogin, setBranchId, staffLogout,
     patient, isGuest, patientLogin, patientSignup, enterGuest, patientLogout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Full store — used by the role-aware entry + welcome flow. */
export function useAuralisSession(): AuralisSessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAuralisSession must be used inside <SessionProvider>");
  return ctx;
}

/** Staff-world slice — screens import it as `useSession`. */
export function useStaffSession() {
  const { hydrated, staffUser, branchId, staffLogin, setBranchId, staffLogout } = useAuralisSession();
  return useMemo(
    () => ({ hydrated, user: staffUser, branchId, login: staffLogin, setBranchId, logout: staffLogout }),
    [hydrated, staffUser, branchId, staffLogin, setBranchId, staffLogout]
  );
}

/** Patient-world slice — screens import it as `useSession`. */
export function usePatientSession() {
  const { hydrated, patient, isGuest, patientLogin, patientSignup, enterGuest, patientLogout } = useAuralisSession();
  return useMemo(
    () => ({ hydrated, patient, isGuest, login: patientLogin, signup: patientSignup, enterGuest, logout: patientLogout }),
    [hydrated, patient, isGuest, patientLogin, patientSignup, enterGuest, patientLogout]
  );
}

/** Patient's csv tags as an array, e.g. ["VIP", "Member"]. */
export function usePatientTags(): string[] {
  const { patient } = usePatientSession();
  if (!patient?.tags) return [];
  return patient.tags.split(",").map((t) => t.trim()).filter(Boolean);
}
