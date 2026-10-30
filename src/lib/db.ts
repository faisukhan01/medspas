// ═════════════════════════════════════════════════════════════════════════
//  Auralis runtime database client
//  • Production path: Turso cloud (libSQL) via Prisma driver adapter
//  • Fallback path  : local SQLite file (offline / network degraded)
//  Selection happens once, via a fast health probe with a short timeout.
//
//  Usage in route handlers:
//    import { getDb } from "@/lib/db";
//    export async function GET() { const db = await getDb(); ... }
// ═════════════════════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/client";

export type AuralisDB = PrismaClient;

const globalForDb = globalThis as unknown as {
  auralisDb?: AuralisDB;
  auralisDbPromise?: Promise<AuralisDB>;
  auralisDbMode?: "TURSO" | "LOCAL";
};

export function getDbMode(): "TURSO" | "LOCAL" {
  return globalForDb.auralisDbMode ?? "LOCAL";
}

async function createDb(): Promise<AuralisDB> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    try {
      const [{ createClient }, { PrismaLibSQL }] = await Promise.all([
        import("@libsql/client"),
        import("@prisma/adapter-libsql"),
      ]);
      const httpUrl = tursoUrl.replace("libsql://", "https://");
      const libsql = createClient({ url: httpUrl, authToken: tursoToken });

      // Health probe — if Turso is unreachable, fall back gracefully.
      await Promise.race([
        libsql.execute("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("turso probe timeout")), 4000)
        ),
      ]);

      const adapter = new PrismaLibSQL(libsql as never);
      const client = new PrismaClient({ adapter } as never);
      // Verify Prisma can round-trip through the adapter before committing to it
      await Promise.race([
        client.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("prisma adapter probe timeout")), 6000)
        ),
      ]);
      globalForDb.auralisDbMode = "TURSO";
      console.log("[db] ✅ Connected to Turso cloud:", httpUrl);
      return client;
    } catch (err) {
      console.warn(
        "[db] ⚠️ Turso unreachable — using local SQLite fallback:",
        err instanceof Error ? err.message : err
      );
    }
  }

  globalForDb.auralisDbMode = "LOCAL";
  const client = new PrismaClient();
  console.log("[db] Using local SQLite database");
  return client;
}

/** Await this once per request handler to get the initialized Prisma client. */
export async function getDb(): Promise<AuralisDB> {
  if (!globalForDb.auralisDbPromise) {
    globalForDb.auralisDbPromise = createDb().then((db) => {
      globalForDb.auralisDb = db;
      return db;
    });
  }
  return globalForDb.auralisDbPromise;
}

export default getDb;
