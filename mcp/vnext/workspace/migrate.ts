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
export const LATEST_MIGRATION = 12;

// A fixed, service-wide key for the migration advisory lock. boot.ts runs migrate() in EVERY replica
// before that replica listens, so `docker compose up --scale workspace=3` and any Deployment with
// replicas>1 run this concurrently against the SAME database. Migration 001 uses plain CREATE TABLE
// (not IF NOT EXISTS), so without serialization the losers reject with
// `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`, exit(1) before ever
// listening, and flap through restart backoff. An advisory lock is cluster-wide and keyed by this
// bigint, held by whichever session took it regardless of which pooled backend runs the DDL, so a
// concurrent migrate() blocks here until the first finishes and then finds every migration applied.
const MIGRATION_LOCK_KEY = 0x4b41_4745_4d49_4752n; // "KAGEMIGR"

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
  // The whole migration runs under a transaction-scoped advisory lock so concurrent replicas serialize.
  // The lock is held by THIS connection (the outer transaction), but each migration below still commits
  // independently on its own pooled connection — so the per-migration atomicity is unchanged while a
  // second migrate() blocks on the lock until this one commits. The lock releases automatically here on
  // COMMIT, even if a migration threw (the outer transaction unwinds), so a crash can never wedge it.
  return db.transaction(async (lock) => {
    await lock.query(`SELECT pg_advisory_xact_lock($1)`, [MIGRATION_LOCK_KEY.toString()]);
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
      // One connection for the whole migration: DDL and its version row commit together or not at all.
      // Sent through the pool instead, the version row could commit on a different backend than the DDL
      // that failed, leaving a database recorded as migrated that never ran the statements.
      await db.transaction(async (tx) => {
        await tx.query(sql);
        await tx.query(`INSERT INTO schema_migrations(version) VALUES($1)`, [version]);
      });
    }
    return currentVersion(db);
  });
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
