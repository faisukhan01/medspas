import { NextResponse } from "next/server";
import { getDb, getDbMode } from "@/lib/db";
import { route } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const [tenantCount, apptCount] = await Promise.all([
    db.tenant.count(),
    db.appointment.count(),
  ]);
  return NextResponse.json({
    status: "ok",
    service: "auralis-api",
    version: "1.0.0",
    dbMode: getDbMode(),
    tenants: tenantCount,
    appointments: apptCount,
    time: new Date().toISOString(),
  });
});
