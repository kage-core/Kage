// Ordered, idempotent Postgres migrations for the Kage workspace service.
//
// This is SEPARATE from the local node:sqlite storage migrations (which stay at their own version):
// the workspace is a distinct Postgres datastore. Each `NNN_*.sql` file under `migrations/` is applied
// once, inside a transaction, and recorded in `schema_migrations`; re-running is a no-op. The current
// version is what `/v1/health` reports.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db.js";

/** Highest migration version shipped in this build; `migrate()` brings a database up to it. */
export const LATEST_MIGRATION = 5;

// The .sql files live in the source tree next to this module. When running from `dist/`, the compiled
// `migrate.js` is at `mcp/dist/vnext/workspace/`, so the source `migrations/` dir is three levels up.
// Try a dist-adjacent copy first (in case a build step copies them), then fall back to the source path.
function migrationsDir(): string {
  const candidates = [
    join(__dirname, "migrations"),
    join(__dirname, "..", "..", "..", "vnext", "workspace", "migrations"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function migrationFiles(): Array<{ version: number; file: string; dir: string }> {
  const dir = migrationsDir();
  return readdirSync(dir)
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .map((file) => ({ version: Number.parseInt(file.split("_")[0], 10), file, dir }))
    .sort((a, b) => a.version - b.version);
}

/** Apply every not-yet-applied migration in order. Returns the resulting schema version. */
export async function migrate(db: Db): Promise<number> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version INTEGER PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await db.query<{ version: number }>(`SELECT version FROM schema_migrations`);
  const applied = new Set(rows.map((row) => row.version));
  for (const { version, file, dir } of migrationFiles()) {
    if (applied.has(version)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query(`INSERT INTO schema_migrations(version) VALUES($1)`, [version]);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
  return currentVersion(db);
}

/** The highest applied migration version, or 0 if the schema has never been migrated. */
export async function currentVersion(db: Db): Promise<number> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version INTEGER PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await db.query<{ max: number | null }>(
    `SELECT MAX(version) AS max FROM schema_migrations`,
  );
  return rows[0]?.max ?? 0;
}
