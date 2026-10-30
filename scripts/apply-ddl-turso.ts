// Applies db/ddl.sql to the remote Turso (libSQL) database over Hrana/HTTP.
// Usage: bun scripts/apply-ddl-turso.ts
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const url = process.env.TURSO_DATABASE_URL?.replace("libsql://", "https://");
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken: token });
const ddl = readFileSync("db/ddl.sql", "utf-8");

try {
  await client.executeMultiple(ddl);
  console.log("✅ DDL applied to Turso successfully");
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already exists")) {
    console.log("⚠️ Tables already exist on Turso — skipping (OK)");
  } else {
    console.error("❌ DDL apply failed:", msg);
    process.exit(1);
  }
}

// Sanity check: list tables
const res = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name"
);
console.log(`📊 Turso now has ${res.rows.length} tables:`);
console.log(res.rows.map((r) => r.name).join(", "));
