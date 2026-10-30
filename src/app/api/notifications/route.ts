import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, getTenantId } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const [notifications, unread] = await Promise.all([
    db.notification.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.notification.count({ where: { tenantId, isRead: false } }),
  ]);
  return NextResponse.json({ notifications, unread });
});

export const PATCH = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  if (body.id) {
    await db.notification.update({ where: { id: body.id }, data: { isRead: true } });
  } else {
    await db.notification.updateMany({ where: { tenantId, isRead: false }, data: { isRead: true } });
  }
  const unread = await db.notification.count({ where: { tenantId, isRead: false } });
  return NextResponse.json({ ok: true, unread });
});
