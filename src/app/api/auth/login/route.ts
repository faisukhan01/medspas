import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad } from "@/lib/api";
import { checkPassword, createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { DEMO_PASSWORD } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email) return bad("Email is required");

  const user = await db.user.findFirst({ where: { email } });
  if (!user || !user.isActive) return bad("No active account with that email", 401);

  // Demo gate: seeded scrypt hash OR the published demo password
  if (!checkPassword(password, user.passwordHash) && password !== DEMO_PASSWORD) {
    return bad("Invalid password — demo accounts use 'demo1234'", 401);
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await db.auditLog.create({
    data: { tenantId: user.tenantId, userId: user.id, action: "LOGIN", entity: "User",
      entityId: user.id, details: "Successful demo login", ipAddress: "demo" },
  });

  const res = NextResponse.json({ user: { ...user, passwordHash: undefined } });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.email), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
