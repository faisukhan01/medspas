// ── Session store (persisted) ───────────────────────────────────────────────
// Holds the signed-in staff user and the active branch id. Both are persisted
// to AsyncStorage so the app reopens straight into "My day" — the web backend
// keeps the matching httpOnly session cookie (auralis_session) for 7 days.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "@/lib/api";
import type { StaffUser } from "@/lib/types";

const STORAGE_KEY = "auralis.staff.session.v1";

interface PersistedSession {
  user: StaffUser;
  branchId: string | null;
}

interface SessionValue {
  /** true once AsyncStorage has been read — routing gates wait for this. */
  hydrated: boolean;
  user: StaffUser | null;
  /** Active branch — drives branchId query params across every screen. */
  branchId: string | null;
  login: (email: string, password: string) => Promise<void>;
  setBranchId: (branchId: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const userRef = useRef<StaffUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Restore the persisted session once on boot.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !alive) return;
        const parsed = JSON.parse(raw) as PersistedSession | null;
        if (parsed?.user?.id) {
          setUser(parsed.user);
          setBranchIdState(parsed.branchId ?? parsed.user.branchId ?? null);
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

  const persist = useCallback((next: PersistedSession | null) => {
    if (next) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else void AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) {
        throw new ApiError("That doesn't look like an email — try again", 400);
      }
      if (!password) {
        throw new ApiError("Enter your password to continue", 400);
      }
      try {
        const { user: found } = await api.login(trimmed, password);
        const nextBranch = found.branchId ?? null;
        setUser(found);
        setBranchIdState(nextBranch);
        persist({ user: found, branchId: nextBranch });
      } catch (err) {
        // Surface the API's message (e.g. invalid password → 401 copy).
        if (err instanceof ApiError) throw err;
        throw new ApiError("Sign-in failed — please try again", 0);
      }
    },
    [persist]
  );

  const setBranchId = useCallback(
    (id: string) => {
      setBranchIdState(id);
      if (userRef.current) persist({ user: userRef.current, branchId: id });
    },
    [persist]
  );

  const logout = useCallback(() => {
    setUser(null);
    setBranchIdState(null);
    persist(null);
  }, [persist]);

  const value = useMemo<SessionValue>(
    () => ({ hydrated, user, branchId, login, setBranchId, logout }),
    [hydrated, user, branchId, login, setBranchId, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
