import type { LocalDatabase } from "./database.js";

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  agent_surface TEXT NOT NULL,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT
);
CREATE TABLE IF NOT EXISTS evidence_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS context_deliveries (
  delivery_id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  injection_location TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  added_bytes INTEGER NOT NULL,
  added_tokens INTEGER,
  measurement_quality TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transformation_receipts (
  receipt_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT,
  mode TEXT NOT NULL,
  measurement_quality TEXT NOT NULL,
  before_input_bytes INTEGER NOT NULL,
  after_input_bytes INTEGER NOT NULL,
  before_input_tokens INTEGER,
  after_input_tokens INTEGER,
  output_tokens INTEGER,
  kage_processing_cost_usd REAL,
  provider_input_cost_before_usd REAL,
  provider_input_cost_after_usd REAL,
  latency_ms REAL NOT NULL,
  transformations_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export function migrateLocalDatabase(db: LocalDatabase): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(1);
    if (!applied) {
      db.exec(MIGRATION_001);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        1,
        new Date().toISOString(),
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
