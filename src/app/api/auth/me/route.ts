import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad } from "@/lib/api";
import { createSessionToken, getCurrentUser, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (!user) return bad("Not authenticated", 401);
  return NextResponse.json({ user: { ...user, passwordHash: undefined } });
});

/** Switch demo identity without password (fast role preview). */
export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const { email } = await req.json().catch(() => ({ email: "" }));
  const user = await db.user.findFirst({ where: { email: String(email).toLowerCase() } });
  if (!user) return bad("Unknown demo account", 404);
  const res = NextResponse.json({ user: { ...user, passwordHash: undefined } });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.email), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
