/* Syncs the locally-seeded SQLite database to the remote Turso cloud DB.
   Strategy: read raw rows from local file → batched INSERTs via libSQL
   batch() (pipelined, one HTTP round-trip per chunk). Idempotent: wipes
   remote child→parent first. Usage: bun scripts/sync-to-turso.ts */
import { createClient } from "@libsql/client";

const remoteUrl = process.env.TURSO_DATABASE_URL?.replace("libsql://", "https://");
const token = process.env.TURSO_AUTH_TOKEN;
if (!remoteUrl || !token) { console.error("Missing Turso env vars"); process.exit(1); }

const local = createClient({ url: "file:/home/z/my-project/db/custom.db" });
const remote = createClient({ url: remoteUrl, authToken: token });

// parent → child order for INSERT; reverse for DELETE
const tableOrder = [
  "Tenant","Branch","User","StaffSchedule","ServiceCategory","Service","Room","Patient",
  "ConsentFormTemplate","SignedConsent","ClinicalNote","TreatmentRecord","Appointment",
  "WaitlistEntry","Lead","LeadActivity","Campaign","MessageLog","MembershipPlan","Membership",
  "ServicePackage","PatientPackage","GiftCard","Invoice","Payment","Product","PurchaseOrder",
  "Review","Referral","AuditLog","Notification","SupportTicket","AiInteraction","Setting",
];

const CHUNK = 40;

async function main() {
  // 1) wipe remote (children first)
  await remote.execute("PRAGMA foreign_keys = OFF");
  for (const t of [...tableOrder].reverse()) {
    await remote.execute(`DELETE FROM "${t}"`);
  }
  console.log("🧹 Remote tables cleared");

  // 2) copy
  let totalRows = 0;
  for (const t of tableOrder) {
    const res = await local.execute(`SELECT * FROM "${t}"`);
    if (res.rows.length === 0) { console.log(`   · ${t}: 0 rows`); continue; }
    const cols = res.columns;
    const placeholders = cols.map(() => "?").join(",");
    let batch: InValue[][] = [];
    const stmts: string[] = [];
    for (const row of res.rows) {
      batch.push(cols.map((c) => row[c] as InValue));
      if (batch.length >= CHUNK) {
        stmts.push(`INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${batch.map(() => `(${placeholders})`).join(",")}`);
        await remote.execute({ sql: stmts[stmts.length - 1], args: batch.flat() });
        totalRows += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      const sql = `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${batch.map(() => `(${placeholders})`).join(",")}`;
      await remote.execute({ sql, args: batch.flat() });
      totalRows += batch.length;
    }
    console.log(`   ✓ ${t}: ${res.rows.length} rows`);
  }
  await remote.execute("PRAGMA foreign_keys = ON");

  // 3) verify
  const counts = await remote.execute(`SELECT
    (SELECT COUNT(*) FROM Tenant) tenants,
    (SELECT COUNT(*) FROM Branch) branches,
    (SELECT COUNT(*) FROM User) users,
    (SELECT COUNT(*) FROM Patient) patients,
    (SELECT COUNT(*) FROM Appointment) appointments,
    (SELECT COUNT(*) FROM Invoice) invoices,
    (SELECT COUNT(*) FROM Lead) leads`);
  console.log(`\n✅ Sync complete — ${totalRows} rows total`);
  console.log("   Remote counts:", counts.rows[0]);
}

type InValue = string | number | bigint | ArrayBuffer | null;
main().catch((e) => { console.error("❌ Sync failed:", e); process.exit(1); });
