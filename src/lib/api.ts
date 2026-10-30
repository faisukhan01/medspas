// ── API route helpers: tenant resolution + uniform JSON responses ───────────
import { NextResponse } from "next/server";
import type { AuralisDB } from "./db";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolve the active demo tenant (single-tenant demo, multi-tenant ready). */
export async function getTenantId(db: AuralisDB): Promise<string> {
  const tenant = await db.tenant.findFirst({ select: { id: true } });
  if (!tenant) throw new Error("No tenant provisioned");
  return tenant.id;
}

/** Wrap a handler with error handling → never leak stack traces to clients. */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] handler error:", err);
      return bad(err instanceof Error ? err.message : "Internal server error", 500);
    }
  };
}

export function parseDate(v: string | null, fallback?: Date): Date {
  if (!v) return fallback ?? new Date();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback ?? new Date() : d;
}
