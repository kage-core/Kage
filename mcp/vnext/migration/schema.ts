// Legacy-packet migration bookkeeping schema (Phase B, migration 005).
//
// Importing the pre-existing `.agent_memory` packet store into the repository model is a one-way,
// non-destructive operation: packet files are NEVER deleted. This table records exactly what each
// legacy packet became — the entity/claim it mapped to, its disposition, the source fingerprint the
// mapping was made against (so `apply` can refuse a plan whose packets drifted), and the ORIGINAL
// packet JSON verbatim so the import is losslessly reversible. The DDL lives here so the migration
// layer owns its own schema; storage/migrations.ts imports it verbatim as MIGRATION_005 rather than
// duplicating the SQL.

export const LEGACY_PACKET_MIGRATIONS_TABLE = "legacy_packet_migrations" as const;

export const LEGACY_PACKET_MIGRATIONS_SCHEMA_SQL = `
CREATE TABLE legacy_packet_migrations (
  legacy_packet_id TEXT PRIMARY KEY,
  source_fingerprint TEXT NOT NULL,
  entity_id TEXT REFERENCES entities(entity_id),
  claim_id TEXT REFERENCES claims(claim_id),
  disposition TEXT NOT NULL,
  original_packet_json TEXT NOT NULL,
  migrated_at TEXT NOT NULL
);
`;
