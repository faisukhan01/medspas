// ── lightweight signed-cookie session (demo-grade; swap for NextAuth in prod)
import { createHmac, timingSafeEqual, scryptSync } from "crypto";
import { cookies } from "next/headers";
import type { AuralisDB } from "./db";

const SECRET = process.env.AUTH_SECRET || "auralis-dev-secret";
export const SESSION_COOKIE = "auralis_session";

interface SessionPayload {
  userId: string;
  email: string;
  iat: number;
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = { userId, email, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

export function hashPasswordDemo(password: string): string {
  return scryptSync(password, "auralis-static-demo-salt", 32).toString("hex");
}

export function checkPassword(password: string, hash: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(hashPasswordDemo(password)), Buffer.from(hash));
  } catch {
    return false;
  }
}

/**
 * Current user from session cookie; falls back to the tenant owner so the
 * demo stays fully explorable without logging in first.
 */
export async function getCurrentUser(db: AuralisDB) {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (session) {
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user && user.isActive) return user;
  }
  return db.user.findFirst({ where: { role: "OWNER" } });
}
