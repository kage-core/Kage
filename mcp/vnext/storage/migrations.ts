import type { LocalDatabase } from "./database.js";

const CURRENT_SCHEMA_VERSION = 3;

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

// Storage schema is NOT the wire protocol. Protocol v1 is frozen and `ContextDelivery` gains no
// field — but the local store is Kage's own, and without a recorded composition latency the Phase A
// context latency percentiles are structurally null forever, which makes the phase's own completion
// gate ("measurement-quality counts and latency percentiles") impossible to meet by construction.
//
// NULLABLE, deliberately: an attempt that never composed a capsule (a failed-open) has no latency
// at all, and a 0 there would be an invented measurement.
const MIGRATION_002 = `
ALTER TABLE context_deliveries ADD COLUMN composition_latency_ms REAL CHECK (
  composition_latency_ms IS NULL OR (
    typeof(composition_latency_ms) IN ('integer', 'real') AND
    composition_latency_ms BETWEEN 0 AND 1.7976931348623157e308
  )
);
`;

// Same reasoning as migration 002: protocol v1 is frozen and `ContextDelivery` gains no field, but
// the store is Kage's own. Without a provider recorded on the delivery, attachment can only ever be
// reported OVERALL — the report cannot say which provider Kage attached context for, and the
// per-provider audit surfaces (which every other measurement already has) have a permanent hole.
//
// NULLABLE, deliberately: only the PROXY knows the provider (it holds the gateway). The Claude hook
// injects into the agent's turn from IDE events and never sees which model/API the agent calls, so
// its deliveries record NULL — an honest "unknown", never a guessed "anthropic". A TEXT column with
// no CHECK: any provider string the gateways use is legal, and null is legal.
const MIGRATION_003 = `
ALTER TABLE context_deliveries ADD COLUMN provider TEXT;
`;

const MIGRATIONS: Readonly<Record<number, string>> = {
  1: MIGRATION_001,
  2: MIGRATION_002,
  3: MIGRATION_003,
};

interface SchemaObjectRow {
  type: string;
}

interface TableColumnRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

interface IndexListRow {
  name: string;
  unique: number;
  partial: number;
}

interface IndexColumnRow {
  name: string | null;
}

type ExpectedColumn = readonly [name: string, type: string, notnull: number, pk: number];

const V1_TABLE_COLUMNS: Readonly<Record<string, readonly ExpectedColumn[]>> = {
  tasks: [
    ["task_id", "TEXT", 0, 1],
    ["session_id", "TEXT", 1, 0],
    ["repository_id", "TEXT", 1, 0],
    ["agent_surface", "TEXT", 1, 0],
    ["user_id", "TEXT", 0, 0],
    ["started_at", "TEXT", 1, 0],
    ["ended_at", "TEXT", 0, 0],
    ["outcome", "TEXT", 0, 0],
  ],
  evidence_events: [
    ["event_id", "TEXT", 0, 1],
    ["event_type", "TEXT", 1, 0],
    ["occurred_at", "TEXT", 1, 0],
    ["repository_id", "TEXT", 1, 0],
    ["task_id", "TEXT", 1, 0],
    ["privacy_class", "TEXT", 1, 0],
    ["source_fingerprint", "TEXT", 1, 0],
    ["payload_json", "TEXT", 1, 0],
  ],
  context_deliveries: [
    ["delivery_id", "TEXT", 0, 1],
    ["capsule_id", "TEXT", 1, 0],
    ["task_id", "TEXT", 1, 0],
    ["adapter_id", "TEXT", 1, 0],
    ["injection_location", "TEXT", 1, 0],
    ["delivered_at", "TEXT", 1, 0],
    ["added_bytes", "INTEGER", 1, 0],
    ["added_tokens", "INTEGER", 0, 0],
    ["measurement_quality", "TEXT", 1, 0],
    ["status", "TEXT", 1, 0],
    ["reason", "TEXT", 1, 0],
  ],
  transformation_receipts: [
    ["receipt_id", "TEXT", 0, 1],
    ["task_id", "TEXT", 1, 0],
    ["request_id", "TEXT", 1, 0],
    ["provider", "TEXT", 1, 0],
    ["model", "TEXT", 0, 0],
    ["mode", "TEXT", 1, 0],
    ["measurement_quality", "TEXT", 1, 0],
    ["before_input_bytes", "INTEGER", 1, 0],
    ["after_input_bytes", "INTEGER", 1, 0],
    ["before_input_tokens", "INTEGER", 0, 0],
    ["after_input_tokens", "INTEGER", 0, 0],
    ["output_tokens", "INTEGER", 0, 0],
    ["kage_processing_cost_usd", "REAL", 0, 0],
    ["provider_input_cost_before_usd", "REAL", 0, 0],
    ["provider_input_cost_after_usd", "REAL", 0, 0],
    ["latency_ms", "REAL", 1, 0],
    ["transformations_json", "TEXT", 1, 0],
    ["created_at", "TEXT", 1, 0],
  ],
};

// Migrations 002 and 003 each append exactly one column to exactly one table (context_deliveries).
// Everything else is byte-identical to version 1, so the validator is expressed as "version 1, plus
// these", in the order the ALTERs applied them: latency (002), then provider (003).
const V2_DELIVERY_LATENCY_COLUMN: ExpectedColumn = ["composition_latency_ms", "REAL", 0, 0];
const V3_DELIVERY_PROVIDER_COLUMN: ExpectedColumn = ["provider", "TEXT", 0, 0];

function expectedColumns(version: number): Readonly<Record<string, readonly ExpectedColumn[]>> {
  if (version < 2) return V1_TABLE_COLUMNS;
  const contextDeliveries = [...V1_TABLE_COLUMNS.context_deliveries, V2_DELIVERY_LATENCY_COLUMN];
  if (version >= 3) contextDeliveries.push(V3_DELIVERY_PROVIDER_COLUMN);
  return {
    ...V1_TABLE_COLUMNS,
    context_deliveries: contextDeliveries,
  };
}

const V1_UNIQUE_KEYS = [
  ["evidence_events", "source_fingerprint"],
  ["transformation_receipts", "request_id"],
] as const;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function validateSchema(db: LocalDatabase, version: number): void {
  for (const [table, columns] of Object.entries(expectedColumns(version))) {
    const object = db
      .prepare("SELECT type FROM sqlite_master WHERE name = ?")
      .get(table) as SchemaObjectRow | undefined;
    if (!object) {
      throw new Error(
        `Kage vNext database schema version ${version} is incompatible: required table "${table}" is missing.`,
      );
    }
    if (object.type !== "table") {
      throw new Error(
        `Kage vNext database schema version ${version} is incompatible: required object "${table}" must be a table.`,
      );
    }

    const actualColumns = db
      .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
      .all() as unknown as TableColumnRow[];
    const columnsMatch =
      actualColumns.length === columns.length &&
      columns.every(
        ([name, type, notnull, pk], index) =>
          actualColumns[index].name === name &&
          actualColumns[index].type.toUpperCase() === type &&
          actualColumns[index].notnull === notnull &&
          actualColumns[index].pk === pk,
      );
    if (!columnsMatch) {
      throw new Error(
        `Kage vNext database schema version ${version} is incompatible: table "${table}" columns do not match the required ordered schema.`,
      );
    }
  }

  for (const [table, column] of V1_UNIQUE_KEYS) {
    const indexes = db
      .prepare(`PRAGMA index_list(${quoteIdentifier(table)})`)
      .all() as unknown as IndexListRow[];
    const hasRequiredUniqueKey = indexes.some((index) => {
      if (index.unique !== 1 || index.partial !== 0) return false;
      const columns = db
        .prepare(`PRAGMA index_info(${quoteIdentifier(index.name)})`)
        .all() as unknown as IndexColumnRow[];
      return columns.length === 1 && columns[0].name === column;
    });
    if (!hasRequiredUniqueKey) {
      throw new Error(
        `Kage vNext database schema version ${version} is incompatible: table "${table}" column "${column}" must have a unique index.`,
      );
    }
  }
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

    const applied = new Set(versions.map(({ version }) => Number(version)));
    const record = db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)");
    for (let version = 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
      if (applied.has(version)) continue;
      // A migration only ever runs against the schema it was written for. A ledger that claims
      // version N while the tables of version N are absent is corruption, not an upgrade path, and
      // it is reported as the incompatibility it is rather than papered over with an ALTER.
      if (version > 1) validateSchema(db, version - 1);
      db.exec(MIGRATIONS[version]);
      record.run(version, new Date().toISOString());
    }

    validateSchema(db, CURRENT_SCHEMA_VERSION);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
