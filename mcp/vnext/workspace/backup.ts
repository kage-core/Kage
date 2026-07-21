// Whole-instance backup and restore for the Kage workspace service.
//
// HOW THIS DIFFERS FROM AN EXPORT, AND WHY BOTH EXIST. `enterprise/export-delete.ts` writes a
// SINGLE-TENANT export: a customer's own data, for the customer. This file writes an OPERATOR's backup:
// every tenant, taken by whoever runs the service, to bring the service back after losing the database.
// They are deliberately not the same artifact — a customer must never receive a file containing another
// tenant's rows, and an operator restoring from a disaster must not have to stitch tenants together.
//
// WHAT IS AND IS NOT IN THE FILE.
//   - IN: every operational table, including the ledgers that make replay safe — `sync_batches` (a
//     redelivered sync batch must still be recognised as already applied) and `github_deliveries` (a
//     redelivered webhook must not be processed twice). A restored instance that forgot these would
//     double-apply everything queued during the outage.
//   - IN: `workspace_scim_tokens` (hashes) and `workspace_oidc_providers`, because a restored instance
//     whose directory integration is dead has not actually been restored.
//   - OUT: `workspace_sessions` and `oidc_login_requests`. A restore is a new trust boundary: live
//     sessions and in-flight logins do not survive it. That is fail-closed on purpose — everyone signs
//     in again, which is the correct posture after a database has been rebuilt from a file on disk.
//   - OUT: object-storage BLOBS. They are not in the database and are not copied here. What IS carried
//     is the MANIFEST of keys the restored rows will expect, so an operator can verify the bucket
//     instead of discovering months later that evidence blobs were never part of the backup plan. The
//     manifest reports `object_bytes_included: 0` so this can never be misread.
//
// INTEGRITY. The file is AES-256-GCM encrypted; the auth tag means a tampered file fails to open rather
// than opening with altered contents — that is the real integrity guarantee. Two weaker, operator-facing
// checks sit on top: the SHA-256 of the whole file (what a backup catalogue records, verified before
// decryption so restoring the wrong object stops immediately) and a SHA-256 over the payload recorded
// inside the manifest.
//
// SCHEMA COMPATIBILITY. The manifest records the migration version the backup was taken at. A restore
// into this build refuses anything else: a NEWER version outright (this build does not have the
// migrations that produced those rows), an OLDER version unless the operator states an explicit
// migration plan, which is their assertion that they have checked the intervening migrations against
// this data. Silently loading a mismatched dump is how a restore becomes a corruption.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db.js";
import { LATEST_MIGRATION, currentVersion, migrate } from "./migrate.js";

export const BACKUP_FORMAT = "kage-workspace-backup/1";

const BACKUP_MAGIC = Buffer.from("KAGEBAK1", "utf8");
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type BackupErrorCode =
  | "unreadable"
  | "checksum_mismatch"
  | "sha256_mismatch"
  | "schema_newer_than_build"
  | "target_schema_newer"
  | "migration_plan_required"
  | "target_not_empty"
  | "weak_key";

export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BackupError";
  }
}

/**
 * Every operational table, in an order safe for INSERT: a parent always precedes its children, so a
 * restore never violates a foreign key mid-transaction.
 */
export const BACKUP_TABLES: readonly string[] = [
  "workspaces",
  "repositories",
  "workspace_principals",
  "workspace_entities",
  "workspace_claims",
  "workspace_relations",
  "workspace_evidence",
  "workspace_review_decisions",
  "workspace_measurements",
  "workspace_claim_conflicts",
  "workspace_task_outcomes",
  "workspace_owners",
  "audit_events",
  "sync_batches",
  "github_installations",
  "github_installation_repositories",
  "github_deliveries",
  "workspace_subscriptions",
  "billing_events",
  "workspace_billing_credits",
  "workspace_retention_policies",
  "workspace_retention_runs",
  "workspace_oidc_providers",
  "workspace_scim_tokens",
  "workspace_deletions",
  "workspace_exports",
];

/** Deliberately absent from every backup. See the header: a restore is a new trust boundary. */
export const EXCLUDED_TABLES: readonly string[] = ["workspace_sessions", "oidc_login_requests"];

/**
 * Sequences a restore must fast-forward. Restored rows carry their original values, so a sequence left
 * at 1 hands the next insert a value that is already taken.
 *   - audit_events.audit_seq orders the append-only log; a collision is a failed insert.
 *   - workspace_sync_seq IS the pull cursor. Restarting it silently makes connected daemons skip
 *     changes, which is worse than an error because nothing fails.
 */
const SEQUENCE_OWNERS: ReadonlyArray<{ sequence: string; sources: ReadonlyArray<[string, string]> }> = [
  { sequence: "audit_events_audit_seq_seq", sources: [["audit_events", "audit_seq"]] },
  {
    sequence: "workspace_sync_seq",
    sources: [
      ["workspace_claims", "sync_seq"],
      ["workspace_entities", "sync_seq"],
    ],
  },
];

export interface ObjectManifestEntry {
  workspace_id: string;
  repository_id: string;
  evidence_id: string;
  object_key: string;
  privacy_class: string;
}

export interface BackupManifest {
  format: string;
  /** The application version that wrote the file. Informational: compatibility is decided by schema. */
  app_version: string;
  schema_version: number;
  created_at: string;
  tables: Record<string, number>;
  excluded_tables: string[];
  /** Object-storage keys the restored rows will expect. The blobs themselves are NOT in this file. */
  object_manifest: ObjectManifestEntry[];
  /** Always 0. Stated explicitly so "the backup has the evidence" can never be assumed. */
  object_bytes_included: 0;
  /** SHA-256 over the canonical JSON of the table data, recorded inside the encrypted payload. */
  payload_sha256: string;
}

export type BackupData = Record<string, unknown[]>;

export interface BackupResult {
  backup_path: string;
  /** SHA-256 of the file as written. This is what a backup catalogue should record. */
  sha256: string;
  byte_size: number;
  manifest: BackupManifest;
}

/**
 * Resolve backup key material to a real 32-byte AES key, or REFUSE.
 *
 * A `.kbk` is a whole-instance, every-tenant artifact: every claim, the full audit log, subscriptions,
 * and the SCIM/OIDC credential rows. Its confidentiality is exactly the strength of this key. The old
 * behaviour silently hashed anything that was not already a 32-byte base64 string with a single unsalted
 * SHA-256 pass — so an operator who set KAGE_BACKUP_KEY to a passphrase got a key an attacker who
 * obtains one file can brute-force offline at raw-hash GPU speed, with no warning and no test covering
 * it. We refuse instead: only 32 raw bytes, or a 32-byte key encoded as base64 or hex, is accepted.
 * Deriving a key from a passphrase would need a salted KDF (scrypt/PBKDF2) with the salt stored in the
 * file; until that exists, refusing is the honest posture for an artifact of this blast radius.
 */
function backupKey(material: Buffer | string): Buffer {
  if (Buffer.isBuffer(material)) {
    if (material.length === 32) return material;
    throw new BackupError(
      "weak_key",
      `backup key must be exactly 32 bytes; received ${material.length}. Generate one with ` +
        `\`openssl rand -base64 32\`.`,
    );
  }
  const text = material.trim();
  const base64 = Buffer.from(text, "base64");
  if (base64.length === 32 && base64.toString("base64").replace(/=+$/, "") === text.replace(/=+$/, "")) {
    return base64;
  }
  if (/^[0-9a-fA-F]{64}$/.test(text)) {
    return Buffer.from(text, "hex");
  }
  throw new BackupError(
    "weak_key",
    "backup key must be 32 bytes, supplied as base64 (`openssl rand -base64 32`) or 64 hex chars. A " +
      "passphrase is refused rather than silently hashed into a weak, unsalted key — a .kbk holds every " +
      "tenant's data.",
  );
}

function payloadChecksum(data: BackupData): string {
  const canonical = JSON.stringify(
    Object.fromEntries([...Object.keys(data)].sort().map((table) => [table, data[table]])),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Read this package's version without importing JSON (which would need a resolution-mode assertion). */
function appVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Encrypt and write a backup file. Exported so a test (or a future re-encryption tool) can produce a
 * well-formed file with a specific manifest; the payload checksum is always recomputed here, so a
 * hand-built manifest cannot claim a checksum its data does not have.
 */
export function writeBackupFile(
  path: string,
  manifest: BackupManifest,
  data: BackupData,
  encryptionKey: Buffer | string,
): { sha256: string; byte_size: number; manifest: BackupManifest } {
  const stamped: BackupManifest = { ...manifest, payload_sha256: payloadChecksum(data) };
  const plaintext = gzipSync(Buffer.from(JSON.stringify({ manifest: stamped, data }), "utf8"));
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", backupKey(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const file = Buffer.concat([BACKUP_MAGIC, iv, cipher.getAuthTag(), ciphertext]);
  writeFileSync(path, file, { mode: 0o600 });
  return {
    sha256: createHash("sha256").update(file).digest("hex"),
    byte_size: file.length,
    manifest: stamped,
  };
}

/** Take a whole-instance backup: every operational table, encrypted, checksummed, version-stamped. */
export async function createBackup(
  db: Db,
  options: {
    directory: string;
    encryption_key: Buffer | string;
    app_version?: string;
    now?: () => Date;
    file_name?: string;
  },
): Promise<BackupResult> {
  // Refuse a weak key BEFORE dumping any tenant data, so a bad KAGE_BACKUP_KEY fails fast and cheap
  // rather than after reading every table.
  backupKey(options.encryption_key);
  const schemaVersion = await currentVersion(db);
  const data: BackupData = {};
  const counts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const { rows } = await db.query(`SELECT * FROM ${table}`);
    data[table] = rows;
    counts[table] = rows.length;
  }
  const { rows: objectRows } = await db.query<ObjectManifestEntry>(
    `SELECT workspace_id, repository_id, evidence_id, object_key, privacy_class
       FROM workspace_evidence WHERE object_key IS NOT NULL ORDER BY object_key`,
  );

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    app_version: options.app_version ?? appVersion(),
    schema_version: schemaVersion,
    created_at: (options.now?.() ?? new Date()).toISOString(),
    tables: counts,
    excluded_tables: [...EXCLUDED_TABLES],
    object_manifest: objectRows,
    object_bytes_included: 0,
    payload_sha256: "",
  };

  // 0700: a whole-instance backup is every tenant in one file. Nobody else on the host reads it.
  mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  const name = options.file_name ?? `kage-workspace-${Date.now()}.kbk`;
  const path = name.startsWith("/") ? name : join(options.directory, name);
  const written = writeBackupFile(path, manifest, data, options.encryption_key);
  return {
    backup_path: path,
    sha256: written.sha256,
    byte_size: written.byte_size,
    manifest: written.manifest,
  };
}

export interface OpenedBackup {
  manifest: BackupManifest;
  data: BackupData;
  sha256: string;
  byte_size: number;
}

/** Open and authenticate a backup. A wrong key or any tampering fails here, before a single row is read. */
export async function readBackup(
  path: string,
  encryptionKey: Buffer | string,
  options: { expect_sha256?: string } = {},
): Promise<OpenedBackup> {
  const file = readFileSync(path);
  const sha256 = createHash("sha256").update(file).digest("hex");
  if (options.expect_sha256 && options.expect_sha256 !== sha256) {
    throw new BackupError(
      "sha256_mismatch",
      `backup file hash ${sha256} does not match the expected ${options.expect_sha256}`,
    );
  }
  if (!file.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new BackupError("unreadable", "not a Kage workspace backup file");
  }
  const iv = file.subarray(BACKUP_MAGIC.length, BACKUP_MAGIC.length + IV_BYTES);
  const tag = file.subarray(BACKUP_MAGIC.length + IV_BYTES, BACKUP_MAGIC.length + IV_BYTES + TAG_BYTES);
  const ciphertext = file.subarray(BACKUP_MAGIC.length + IV_BYTES + TAG_BYTES);
  // Resolve the key BEFORE the decrypt try/catch: a weak-key refusal must surface as `weak_key`, not be
  // swallowed into the generic `unreadable` that a wrong-but-valid key or a tampered file produces.
  const key = backupKey(encryptionKey);
  let parsed: { manifest: BackupManifest; data: BackupData };
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    parsed = JSON.parse(gunzipSync(plaintext).toString("utf8")) as {
      manifest: BackupManifest;
      data: BackupData;
    };
  } catch (error) {
    throw new BackupError("unreadable", `failed to open workspace backup: ${(error as Error).message}`);
  }
  const checksum = payloadChecksum(parsed.data);
  if (checksum !== parsed.manifest.payload_sha256) {
    throw new BackupError(
      "checksum_mismatch",
      `backup payload checksum ${checksum} does not match the manifest's ${parsed.manifest.payload_sha256}`,
    );
  }
  return { manifest: parsed.manifest, data: parsed.data, sha256, byte_size: file.length };
}

export interface VerifiedBackup {
  manifest: BackupManifest;
  sha256: string;
  byte_size: number;
  sha256_verified: boolean;
  rows: number;
}

/** Open a backup and report what it contains, without touching any database. */
export async function verifyBackup(
  path: string,
  encryptionKey: Buffer | string,
  options: { expect_sha256?: string } = {},
): Promise<VerifiedBackup> {
  const opened = await readBackup(path, encryptionKey, options);
  const rows = Object.values(opened.data).reduce((total, table) => total + table.length, 0);
  return {
    manifest: opened.manifest,
    sha256: opened.sha256,
    byte_size: opened.byte_size,
    sha256_verified: Boolean(options.expect_sha256),
    rows,
  };
}

export interface RestoreOptions {
  /**
   * The operator's explicit statement that they intend to load a backup taken at a different schema
   * version into this build, having checked the intervening migrations. `from` must equal the backup's
   * recorded version and `to` this build's — an approximate plan is not a plan.
   */
  migration_plan?: { from: number; to: number };
  /** Restore into a database that already has rows. Off by default: the normal case is a rebuild. */
  allow_nonempty?: boolean;
  expect_sha256?: string;
}

export interface RestoreResult {
  schema_version: number;
  tables: Record<string, number>;
  rows_restored: number;
  /** Object-storage keys the restored rows reference. The operator must confirm the bucket has them. */
  object_keys_expected: number;
  sequences_advanced: string[];
}

/** Load a backup into a database, refusing every mismatch rather than half-restoring. */
export async function restoreBackup(
  db: Db,
  path: string,
  encryptionKey: Buffer | string,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const opened = await readBackup(path, encryptionKey, { expect_sha256: options.expect_sha256 });
  const backupVersion = opened.manifest.schema_version;

  if (backupVersion > LATEST_MIGRATION) {
    throw new BackupError(
      "schema_newer_than_build",
      `this backup was taken at schema version ${backupVersion}; this build ships migrations up to ` +
        `${LATEST_MIGRATION} and does not have the migrations that produced it. No migration plan can ` +
        `bridge that: deploy the newer build and restore there.`,
    );
  }
  if (backupVersion !== LATEST_MIGRATION) {
    const plan = options.migration_plan;
    if (!plan || plan.from !== backupVersion || plan.to !== LATEST_MIGRATION) {
      throw new BackupError(
        "migration_plan_required",
        `this backup was taken at schema version ${backupVersion} and this build is at ` +
          `${LATEST_MIGRATION}. Restoring across versions requires an explicit migration plan ` +
          `{ from: ${backupVersion}, to: ${LATEST_MIGRATION} } stating that the intervening migrations ` +
          `have been checked against this data.`,
      );
    }
  }

  // Bring the target up to this build's schema. An empty database is the normal restore target, so this
  // is what makes "restore into a fresh database" a one-step operation.
  const targetBefore = await currentVersion(db);
  if (targetBefore > LATEST_MIGRATION) {
    throw new BackupError(
      "target_schema_newer",
      `the target database is at schema version ${targetBefore}, newer than this build's ${LATEST_MIGRATION}`,
    );
  }
  const targetVersion = await migrate(db);

  if (!options.allow_nonempty) {
    for (const table of BACKUP_TABLES) {
      const { rows } = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
      if (Number.parseInt(rows[0].count, 10) > 0) {
        throw new BackupError(
          "target_not_empty",
          `the target database already has rows in ${table}. Restore into an empty database, or pass ` +
            `allow_nonempty to state that merging into existing data is intended.`,
        );
      }
    }
  }

  const counts: Record<string, number> = {};
  let rowsRestored = 0;
  const sequencesAdvanced: string[] = [];

  // ONE transaction for the whole load: a restore either happened or it did not. A half-loaded database
  // that looks alive is the worst possible outcome of a disaster recovery.
  await db.transaction(async (tx) => {
    for (const table of BACKUP_TABLES) {
      const rows = (opened.data[table] ?? []) as Array<Record<string, unknown>>;
      counts[table] = rows.length;
      if (rows.length === 0) continue;
      const types = await columnTypes(tx, table);
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const quoted = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
        await tx.query(
          `INSERT INTO ${table}(${quoted}) VALUES(${placeholders})`,
          columns.map((column) => normalize(row[column], types.get(column))),
        );
        rowsRestored += 1;
      }
    }
    for (const { sequence, sources } of SEQUENCE_OWNERS) {
      const maxima: number[] = [];
      for (const [table, column] of sources) {
        const { rows } = await tx.query<{ max: string }>(
          `SELECT COALESCE(MAX(${column}), 0)::text AS max FROM ${table}`,
        );
        maxima.push(Number.parseInt(rows[0].max, 10));
      }
      const highest = Math.max(0, ...maxima);
      if (highest > 0) {
        await tx.query(`SELECT setval($1::regclass, $2::bigint, true)`, [sequence, String(highest)]);
        sequencesAdvanced.push(sequence);
      }
    }
  });

  return {
    schema_version: targetVersion,
    tables: counts,
    rows_restored: rowsRestored,
    object_keys_expected: opened.manifest.object_manifest.length,
    sequences_advanced: sequencesAdvanced,
  };
}

/** The declared Postgres type of every column of `table`, keyed by column name. */
async function columnTypes(db: Db, table: string): Promise<Map<string, string>> {
  const { rows } = await db.query<{ column_name: string; udt_name: string }>(
    `SELECT column_name, udt_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return new Map(rows.map((row) => [row.column_name, row.udt_name]));
}

/**
 * JSON round-tripping erases the difference between a `jsonb` array and a real Postgres `text[]`: both
 * come back as a JS array, and the driver serializes a JS array into an ARRAY literal (`{a,b}`), which a
 * jsonb column rejects. So the column's declared type decides — a jsonb/json value is re-serialized as
 * JSON, an array column is handed to the driver as an array, and everything else passes through.
 */
function normalize(value: unknown, udtName: string | undefined): unknown {
  if (value === null || value === undefined) return null;
  if (udtName === "json" || udtName === "jsonb") return JSON.stringify(value);
  // udt_name for an array type is the element type prefixed with an underscore (text[] -> _text).
  if (udtName?.startsWith("_")) return value;
  if (typeof value === "object" && !(value instanceof Date)) return JSON.stringify(value);
  return value;
}
