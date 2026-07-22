// Canonical repository-model schema. These tables live in the SAME Phase A database
// (.agent_memory/daemon/vnext/local.db) and are applied through the SAME migration ledger as
// migration 004 (see ../storage/migrations.ts). Foreign keys are ON at runtime (database.ts), so
// insert order matters: entities -> evidence -> claims -> claim_evidence / relations / review_items.
//
// The SQL is defined here so the model layer owns its own schema; migrations.ts imports it verbatim
// as MIGRATION_004 rather than duplicating the DDL.

export const REPOSITORY_MODEL_TABLES = [
  "entities",
  "claims",
  "evidence",
  "claim_evidence",
  "relations",
  "episodes",
  "review_items",
  "compiler_checkpoints",
] as const;

export type RepositoryModelTable = (typeof REPOSITORY_MODEL_TABLES)[number];

export const REPOSITORY_MODEL_SCHEMA_SQL = `
CREATE TABLE entities (
  entity_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(repository_id, kind, slug)
);
CREATE TABLE claims (
  claim_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  claim_kind TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  impact_class TEXT NOT NULL,
  valid_from_commit TEXT,
  valid_to_commit TEXT,
  supersedes_claim_id TEXT REFERENCES claims(claim_id),
  review_policy TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE evidence (
  evidence_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  commit_hash TEXT,
  path TEXT,
  symbol TEXT,
  line_start INTEGER,
  line_end INTEGER,
  verification_method TEXT NOT NULL,
  verification_state TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  UNIQUE(repository_id, source_type, source_uri, source_fingerprint)
);
CREATE TABLE claim_evidence (
  claim_id TEXT NOT NULL REFERENCES claims(claim_id),
  evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id),
  stance TEXT NOT NULL CHECK(stance IN ('supports','contradicts')),
  PRIMARY KEY(claim_id, evidence_id)
);
CREATE TABLE relations (
  relation_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  relation_type TEXT NOT NULL,
  to_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  evidence_id TEXT REFERENCES evidence(evidence_id),
  created_at TEXT NOT NULL,
  UNIQUE(from_entity_id, relation_type, to_entity_id, evidence_id)
);
CREATE TABLE episodes (
  episode_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  task_id TEXT,
  episode_type TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  event_ids_json TEXT NOT NULL,
  outcome TEXT NOT NULL
);
CREATE TABLE review_items (
  review_item_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  claim_id TEXT NOT NULL REFERENCES claims(claim_id),
  reason TEXT NOT NULL,
  required_role TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_to TEXT,
  decided_by TEXT,
  decided_at TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE compiler_checkpoints (
  compiler_name TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  last_event_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(compiler_name, repository_id)
);
`;
