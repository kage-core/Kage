import type { LocalDatabase } from "./database.js";

const CURRENT_SCHEMA_VERSION = 1;

const MIGRATION_LEDGER_SCHEMA = `
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

const MIGRATION_001 = `
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  agent_surface TEXT NOT NULL,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT
);
CREATE TABLE evidence_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL
);
CREATE TABLE context_deliveries (
  delivery_id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  injection_location TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  added_bytes INTEGER NOT NULL CHECK (
    typeof(added_bytes) = 'integer' AND added_bytes BETWEEN 0 AND 9007199254740991
  ),
  added_tokens INTEGER CHECK (
    added_tokens IS NULL OR (
      typeof(added_tokens) = 'integer' AND added_tokens BETWEEN 0 AND 9007199254740991
    )
  ),
  measurement_quality TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE transformation_receipts (
  receipt_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT,
  mode TEXT NOT NULL,
  measurement_quality TEXT NOT NULL,
  before_input_bytes INTEGER NOT NULL CHECK (
    typeof(before_input_bytes) = 'integer' AND before_input_bytes BETWEEN 0 AND 9007199254740991
  ),
  after_input_bytes INTEGER NOT NULL CHECK (
    typeof(after_input_bytes) = 'integer' AND after_input_bytes BETWEEN 0 AND 9007199254740991
  ),
  before_input_tokens INTEGER CHECK (
    before_input_tokens IS NULL OR (
      typeof(before_input_tokens) = 'integer' AND before_input_tokens BETWEEN 0 AND 9007199254740991
    )
  ),
  after_input_tokens INTEGER CHECK (
    after_input_tokens IS NULL OR (
      typeof(after_input_tokens) = 'integer' AND after_input_tokens BETWEEN 0 AND 9007199254740991
    )
  ),
  output_tokens INTEGER CHECK (
    output_tokens IS NULL OR (
      typeof(output_tokens) = 'integer' AND output_tokens BETWEEN 0 AND 9007199254740991
    )
  ),
  kage_processing_cost_usd REAL CHECK (
    kage_processing_cost_usd IS NULL OR (
      typeof(kage_processing_cost_usd) IN ('integer', 'real') AND
      kage_processing_cost_usd BETWEEN 0 AND 1.7976931348623157e308
    )
  ),
  provider_input_cost_before_usd REAL CHECK (
    provider_input_cost_before_usd IS NULL OR (
      typeof(provider_input_cost_before_usd) IN ('integer', 'real') AND
      provider_input_cost_before_usd BETWEEN 0 AND 1.7976931348623157e308
    )
  ),
  provider_input_cost_after_usd REAL CHECK (
    provider_input_cost_after_usd IS NULL OR (
      typeof(provider_input_cost_after_usd) IN ('integer', 'real') AND
      provider_input_cost_after_usd BETWEEN 0 AND 1.7976931348623157e308
    )
  ),
  latency_ms REAL NOT NULL CHECK (
    typeof(latency_ms) IN ('integer', 'real') AND latency_ms BETWEEN 0 AND 1.7976931348623157e308
  ),
  transformations_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

interface SchemaObjectRow {
  type: string;
}

interface TableColumnRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

function ensureCompatibleMigrationLedger(db: LocalDatabase): void {
  const object = db
    .prepare("SELECT type FROM sqlite_master WHERE name = ?")
    .get("schema_migrations") as SchemaObjectRow | undefined;

  if (!object) {
    db.exec(MIGRATION_LEDGER_SCHEMA);
  } else if (object.type !== "table") {
    throw new Error("Kage vNext schema_migrations ledger is incompatible: expected a table.");
  }

  const columns = db.prepare("PRAGMA table_info(schema_migrations)").all() as unknown as TableColumnRow[];
  const compatible =
    columns.length === 2 &&
    columns[0].name === "version" &&
    columns[0].type.toUpperCase() === "INTEGER" &&
    columns[0].notnull === 0 &&
    columns[0].pk === 1 &&
    columns[1].name === "applied_at" &&
    columns[1].type.toUpperCase() === "TEXT" &&
    columns[1].notnull === 1 &&
    columns[1].pk === 0;

  if (!compatible) {
    throw new Error("Kage vNext schema_migrations ledger is incompatible with the expected schema.");
  }
}

export function migrateLocalDatabase(db: LocalDatabase): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    ensureCompatibleMigrationLedger(db);

    const versionStatement = db.prepare("SELECT version FROM schema_migrations ORDER BY version");
    versionStatement.setReadBigInts(true);
    const versions = versionStatement.all() as unknown as Array<{ version: bigint }>;
    const currentSchemaVersion = BigInt(CURRENT_SCHEMA_VERSION);
    const invalidVersion = versions.find(({ version }) => version < 1n);
    if (invalidVersion) {
      throw new Error(
        `Kage vNext schema_migrations ledger is incompatible: invalid version ${String(invalidVersion.version)}.`,
      );
    }

    const futureVersion = versions.find(({ version }) => version > currentSchemaVersion);
    if (futureVersion) {
      throw new Error(
        `Kage vNext database schema version ${futureVersion.version} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`,
      );
    }

    const applied = versions.some(({ version }) => version === currentSchemaVersion);
    if (!applied) {
      db.exec(MIGRATION_001);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        CURRENT_SCHEMA_VERSION,
        new Date().toISOString(),
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
