/* ═══════════════════════════════════════════════════════════════════════════
   Auralis — DateTime format normalizer for Turso
   ─────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS
   PrismaClient without a driver adapter stores SQLite DateTime as INTEGER ms.
   The runtime app uses @prisma/adapter-libsql, which writes and compares
   DateTime as TEXT in the form "2026-10-30T09:00:00.000+00:00".
   Rows written by one path are INVISIBLE to date-filtered queries through
   the other (SQLite orders all INTEGERs before all TEXTs, so
   `startsAt >= <iso-text>` never matches an INTEGER row).

   WHAT THIS DOES
   Reads the DATETIME columns out of db/ddl.sql (single source of truth) and
   rewrites every INTEGER-ms value to the adapter's exact TEXT format with
   one bulk UPDATE per column (SQLite strftime, one HTTP round-trip each).

   USAGE  bun scripts/convert-datetime-turso.ts
   ═══════════════════════════════════════════════════════════════════════════ */
import { createClient, type InValue } from "@libsql/client";
import { readFileSync } from "fs";

const remoteUrl = process.env.TURSO_DATABASE_URL?.replace("libsql://", "https://");
const token = process.env.TURSO_AUTH_TOKEN;
if (!remoteUrl || !token) { console.error("Missing Turso env vars (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)"); process.exit(1); }
const remote = createClient({ url: remoteUrl, authToken: token });

// ── 1 · parse db/ddl.sql → { table: [datetimeColumns] } ────────────────────
function datetimeColumnsFromDdl(): Record<string, string[]> {
  const ddl = readFileSync("db/ddl.sql", "utf8");
  const out: Record<string, string[]> = {};
  const tableRe = /CREATE TABLE "?(\w+)"? \(([\s\S]*?)\n\);/g;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(ddl))) {
    const table = m[1];
    const cols: string[] = [];
    for (const line of m[2].split("\n")) {
      const cm = line.trim().match(/^"?(\w+)"?\s+DATETIME/i);
      if (cm) cols.push(cm[1]);
    }
    if (cols.length) out[table] = cols;
  }
  return out;
}

async function main() {
  const map = datetimeColumnsFromDdl();
  const tables = Object.keys(map);
  console.log(`📋 Found ${tables.length} tables with DATETIME columns in db/ddl.sql`);

  let converted = 0;
  for (const table of tables) {
    for (const col of map[table]) {
      // only touch integer-ms rows; idempotent by design
      const res = await remote.execute({
        sql: `UPDATE "${table}"
              SET "${col}" = strftime('%Y-%m-%dT%H:%M:%S', "${col}" / 1000, 'unixepoch') || '.000+00:00'
              WHERE typeof("${col}") = 'integer' AND "${col}" IS NOT NULL`,
      });
      if (res.rowsAffected > 0) {
        converted += res.rowsAffected;
        console.log(`   ✓ ${table}.${col}: ${res.rowsAffected} values → TEXT ISO`);
      }
    }
  }
  console.log(`\n✅ Converted ${converted} DateTime values to adapter-compatible TEXT format`);

  // ── sanity probe: how many appointments fall in the runtime ±window now ──
  const now = Date.now();
  const probe = await remote.execute({
    sql: `SELECT COUNT(*) n FROM Appointment WHERE startsAt >= ? AND startsAt <= ?`,
    args: [new Date(now - 7 * 86400000).toISOString(), new Date(now + 21 * 86400000).toISOString()] as InValue[],
  });
  console.log(`🔎 Appointments within runtime ±window (raw probe): ${probe.rows[0].n}`);
}

main().catch((e) => { console.error("❌ Conversion failed:", e); process.exit(1); });
