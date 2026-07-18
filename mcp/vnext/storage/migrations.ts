import type { LocalDatabase } from "./database.js";
import { REPOSITORY_MODEL_SCHEMA_SQL } from "../repo-model/schema.js";
import { LEGACY_PACKET_MIGRATIONS_SCHEMA_SQL } from "../migration/schema.js";

const CURRENT_SCHEMA_VERSION = 5;

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

// Phase B, migration 004: the canonical repository model (entities / claims / evidence /
// claim_evidence / relations / episodes / review_items / compiler_checkpoints). This does NOT touch
// the frozen protocol v1 wire messages — it extends Kage's own local store with new tables. The DDL
// is owned by the model layer (repo-model/schema.ts) and imported verbatim so there is a single
// source of truth for the schema.
const MIGRATION_004 = REPOSITORY_MODEL_SCHEMA_SQL;

// Phase B, migration 005: the legacy-packet migration ledger. Non-destructive import bookkeeping —
// it references entities/claims from migration 004 and does not touch the frozen protocol v1 wire
// messages. The DDL is owned by the migration layer (migration/schema.ts) and imported verbatim so
// there is a single source of truth for the schema.
const MIGRATION_005 = LEGACY_PACKET_MIGRATIONS_SCHEMA_SQL;

const MIGRATIONS: Readonly<Record<number, string>> = {
  1: MIGRATION_001,
  2: MIGRATION_002,
  3: MIGRATION_003,
  4: MIGRATION_004,
  5: MIGRATION_005,
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

// Migration 004 (Phase B) adds the eight repository-model tables. The tuples below are transcribed
// verbatim from `PRAGMA table_info` after applying the DDL — NOT hand-guessed — because the validator
// demands an exact match on count, order, name, type, notnull, and pk. Two SQLite subtleties are
// baked in: a `TEXT PRIMARY KEY` reports pk=1 with notnull=0 (SQLite does not imply NOT NULL for a
// non-INTEGER primary key), and a COMPOSITE primary key reports pk as the 1-based position within the
// key (claim_evidence -> claim_id pk=1, evidence_id pk=2; compiler_checkpoints likewise).
const ENTITIES_COLUMNS: readonly ExpectedColumn[] = [
  ["entity_id", "TEXT", 0, 1],
  ["repository_id", "TEXT", 1, 0],
  ["kind", "TEXT", 1, 0],
  ["canonical_name", "TEXT", 1, 0],
  ["slug", "TEXT", 1, 0],
  ["summary", "TEXT", 1, 0],
  ["status", "TEXT", 1, 0],
  ["created_at", "TEXT", 1, 0],
  ["updated_at", "TEXT", 1, 0],
];
const CLAIMS_COLUMNS: readonly ExpectedColumn[] = [
  ["claim_id", "TEXT", 0, 1],
  ["entity_id", "TEXT", 1, 0],
  ["claim_kind", "TEXT", 1, 0],
  ["normalized_content", "TEXT", 1, 0],
  ["trust_state", "TEXT", 1, 0],
  ["confidence", "REAL", 1, 0],
  ["impact_class", "TEXT", 1, 0],
  ["valid_from_commit", "TEXT", 0, 0],
  ["valid_to_commit", "TEXT", 0, 0],
  ["supersedes_claim_id", "TEXT", 0, 0],
  ["review_policy", "TEXT", 1, 0],
  ["created_by", "TEXT", 1, 0],
  ["created_at", "TEXT", 1, 0],
  ["updated_at", "TEXT", 1, 0],
];
const EVIDENCE_COLUMNS: readonly ExpectedColumn[] = [
  ["evidence_id", "TEXT", 0, 1],
  ["repository_id", "TEXT", 1, 0],
  ["source_type", "TEXT", 1, 0],
  ["source_uri", "TEXT", 1, 0],
  ["source_fingerprint", "TEXT", 1, 0],
  ["commit_hash", "TEXT", 0, 0],
  ["path", "TEXT", 0, 0],
  ["symbol", "TEXT", 0, 0],
  ["line_start", "INTEGER", 0, 0],
  ["line_end", "INTEGER", 0, 0],
  ["verification_method", "TEXT", 1, 0],
  ["verification_state", "TEXT", 1, 0],
  ["privacy_class", "TEXT", 1, 0],
  ["observed_at", "TEXT", 1, 0],
];
const CLAIM_EVIDENCE_COLUMNS: readonly ExpectedColumn[] = [
  ["claim_id", "TEXT", 1, 1],
  ["evidence_id", "TEXT", 1, 2],
  ["stance", "TEXT", 1, 0],
];
const RELATIONS_COLUMNS: readonly ExpectedColumn[] = [
  ["relation_id", "TEXT", 0, 1],
  ["repository_id", "TEXT", 1, 0],
  ["from_entity_id", "TEXT", 1, 0],
  ["relation_type", "TEXT", 1, 0],
  ["to_entity_id", "TEXT", 1, 0],
  ["evidence_id", "TEXT", 0, 0],
  ["created_at", "TEXT", 1, 0],
];
const EPISODES_COLUMNS: readonly ExpectedColumn[] = [
  ["episode_id", "TEXT", 0, 1],
  ["repository_id", "TEXT", 1, 0],
  ["task_id", "TEXT", 0, 0],
  ["episode_type", "TEXT", 1, 0],
  ["title", "TEXT", 1, 0],
  ["started_at", "TEXT", 1, 0],
  ["ended_at", "TEXT", 1, 0],
  ["event_ids_json", "TEXT", 1, 0],
  ["outcome", "TEXT", 1, 0],
];
const REVIEW_ITEMS_COLUMNS: readonly ExpectedColumn[] = [
  ["review_item_id", "TEXT", 0, 1],
  ["repository_id", "TEXT", 1, 0],
  ["claim_id", "TEXT", 1, 0],
  ["reason", "TEXT", 1, 0],
  ["required_role", "TEXT", 1, 0],
  ["status", "TEXT", 1, 0],
  ["assigned_to", "TEXT", 0, 0],
  ["decided_by", "TEXT", 0, 0],
  ["decided_at", "TEXT", 0, 0],
  ["decision_note", "TEXT", 0, 0],
  ["created_at", "TEXT", 1, 0],
];
const COMPILER_CHECKPOINTS_COLUMNS: readonly ExpectedColumn[] = [
  ["compiler_name", "TEXT", 1, 1],
  ["repository_id", "TEXT", 1, 2],
  ["last_event_id", "TEXT", 0, 0],
  ["updated_at", "TEXT", 1, 0],
];

const REPO_MODEL_COLUMNS: Readonly<Record<string, readonly ExpectedColumn[]>> = {
  entities: ENTITIES_COLUMNS,
  claims: CLAIMS_COLUMNS,
  evidence: EVIDENCE_COLUMNS,
  claim_evidence: CLAIM_EVIDENCE_COLUMNS,
  relations: RELATIONS_COLUMNS,
  episodes: EPISODES_COLUMNS,
  review_items: REVIEW_ITEMS_COLUMNS,
  compiler_checkpoints: COMPILER_CHECKPOINTS_COLUMNS,
};

// Migration 005 (Phase B) adds the single legacy_packet_migrations table. Transcribed verbatim from
// `PRAGMA table_info` after applying the DDL: a `TEXT PRIMARY KEY` reports pk=1 with notnull=0, and
// the two nullable foreign keys (entity_id, claim_id) report notnull=0.
const LEGACY_PACKET_MIGRATIONS_COLUMNS: readonly ExpectedColumn[] = [
  ["legacy_packet_id", "TEXT", 0, 1],
  ["source_fingerprint", "TEXT", 1, 0],
  ["entity_id", "TEXT", 0, 0],
  ["claim_id", "TEXT", 0, 0],
  ["disposition", "TEXT", 1, 0],
  ["original_packet_json", "TEXT", 1, 0],
  ["migrated_at", "TEXT", 1, 0],
];

const MIGRATION_LEDGER_COLUMNS: Readonly<Record<string, readonly ExpectedColumn[]>> = {
  legacy_packet_migrations: LEGACY_PACKET_MIGRATIONS_COLUMNS,
};

function expectedColumns(version: number): Readonly<Record<string, readonly ExpectedColumn[]>> {
  if (version < 2) return V1_TABLE_COLUMNS;
  const contextDeliveries = [...V1_TABLE_COLUMNS.context_deliveries, V2_DELIVERY_LATENCY_COLUMN];
  if (version >= 3) contextDeliveries.push(V3_DELIVERY_PROVIDER_COLUMN);
  const base = {
    ...V1_TABLE_COLUMNS,
    context_deliveries: contextDeliveries,
  };
  // The repository-model tables only exist from version 4 onward. This gating is load-bearing: the
  // runner calls validateSchema(db, version - 1) BEFORE applying migration 004, and version 3 has no
  // repo-model tables, so expectedColumns(3) must not mention them.
  if (version < 4) return base;
  const withRepoModel = { ...base, ...REPO_MODEL_COLUMNS };
  // The legacy migration ledger only exists from version 5 onward. Same gating discipline: the runner
  // validates version 4 BEFORE applying migration 005, and version 4 has no legacy ledger table.
  if (version < 5) return withRepoModel;
  return { ...withRepoModel, ...MIGRATION_LEDGER_COLUMNS };
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
