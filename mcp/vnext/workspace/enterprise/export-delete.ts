// Workspace export and irreversible deletion.
//
// THE PROMISE THIS FILE IMPLEMENTS. `workspace_export` is typed as the literal `true` in the billing
// types: a customer can always take their data out, whatever their subscription says. Deletion is the
// other half of the same promise — when they leave, the data actually goes.
//
// THE ORDER OF OPERATIONS IS THE SAFETY PROPERTY, and it is deliberate:
//   1. Verify the confirming principal is an OWNER of this workspace and re-authenticated RECENTLY.
//      A stolen long-lived session must not be able to delete a company's knowledge base. The
//      re-authentication instant is read from the SESSION ROW this server wrote when the credential was
//      presented — never from the request. An instant the caller supplies is a value the caller controls,
//      and a check whose input the attacker writes is not a check.
//   1b. Verify the blobs can actually be removed. A tenant with object keys and no configured object
//      store cannot be deleted: the alternative is a "deleted" tenant whose evidence blobs are still in
//      a bucket while the terminal ledger says they were removed.
//   2. Write an ENCRYPTED export first. If deletion is going to be irreversible, the customer holds a
//      copy before anything is removed — and if the export fails, nothing is deleted.
//   3. Record a TERMINAL row in `workspace_deletions`, which has no foreign key to `workspaces` on
//      purpose so it survives the tenant it describes. That row is the evidence the deletion happened,
//      who confirmed it, and the checksum of what they were given.
//   4. Delete object storage keys. Blobs are outside the database and cannot participate in its
//      transaction, so they go BEFORE it: a crash here leaves rows pointing at deleted objects (visible,
//      fixable) rather than objects nobody has a record of (invisible, permanent).
//   5. Delete every relational row in ONE transaction, in foreign-key-safe order, so the tenant either
//      disappears entirely or not at all.
//
// AN EXPORT IS A DELIVERABLE, NOT A PATH. `registerExportDownload` mints a hashed, expiring ticket for
// each export, and the ticket — not a session — is what the download route authenticates. That matters
// most in the one case where it is hardest: after an irreversible deletion the customer has no
// workspace, no principal, and no session left to authenticate with, so a session-authenticated download
// would hand them a file they could never fetch.
//
// WHAT AN EXPORT DELIBERATELY OMITS. Session tokens, SCIM token hashes, and in-flight OIDC PKCE
// verifiers are NOT exported. They are credentials, not customer data; putting them in a file the
// customer downloads would hand an attacker who obtained that file a set of live secrets.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "../db.js";
import { LATEST_MIGRATION } from "../migrate.js";

/** Object storage seam. Blob storage is a deployment concern; this service only needs to remove keys. */
export interface ObjectStore {
  deleteKeys(keys: readonly string[]): Promise<number>;
}

export type WorkspaceDeletionErrorCode =
  | "unknown_workspace"
  | "owner_required"
  | "reauthentication_required"
  | "object_store_required";

export class WorkspaceDeletionError extends Error {
  constructor(
    readonly code: WorkspaceDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDeletionError";
  }
}

/**
 * How recently the confirming owner must have re-authenticated, measured against
 * `workspace_sessions.reauthenticated_at` — a column only this server writes. Deleting a workspace is
 * the single most destructive act in the product, so an ordinary live session is not enough authority on
 * its own: the owner must have presented their credential within this window.
 */
export const REAUTHENTICATION_WINDOW_MS = 5 * 60 * 1000;

/** How long a download ticket stays valid. Long enough to survive a failed download and a support ping. */
export const EXPORT_DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EXPORT_MAGIC = Buffer.from("KAGEEXP1", "utf8");
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Tenant tables an export carries, in a stable order. Credential tables are deliberately absent — see
 * the header. Every one of these is read with `WHERE workspace_id = $1`, so an export is single-tenant
 * by construction rather than by a filter somebody has to remember to add.
 */
const EXPORTED_TABLES: readonly string[] = [
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
  "workspace_subscriptions",
  "workspace_billing_credits",
  "workspace_retention_policies",
];

/**
 * Deletion order. Children before parents so no foreign key is ever violated mid-transaction; the
 * `workspaces` row is last, which means a partially-applied delete is impossible — the transaction that
 * removes the tenant's identity is the same one that removed its contents.
 */
const DELETION_ORDER: readonly string[] = [
  "workspace_sessions",
  "oidc_login_requests",
  "workspace_scim_tokens",
  "workspace_oidc_providers",
  "workspace_retention_policies",
  "workspace_retention_runs",
  "workspace_owners",
  "workspace_task_outcomes",
  "workspace_entities",
  "workspace_claims",
  "workspace_relations",
  "workspace_evidence",
  "workspace_review_decisions",
  "workspace_measurements",
  "workspace_claim_conflicts",
  "sync_batches",
  "github_installation_repositories",
  "github_deliveries",
  "github_installations",
  "workspace_billing_credits",
  "workspace_subscriptions",
  "audit_events",
  "workspace_principals",
  "repositories",
  "workspaces",
];

/** Derive a 32-byte AES key from caller-supplied material. A raw 32-byte buffer is used as-is. */
function exportKey(material: Buffer | string): Buffer {
  if (Buffer.isBuffer(material) && material.length === 32) return material;
  return createHash("sha256")
    .update(Buffer.isBuffer(material) ? material : Buffer.from(material, "utf8"))
    .digest();
}

export interface WorkspaceExportManifest {
  workspace_id: string;
  workspace_slug: string | null;
  created_at: string;
  /** The Postgres migration version the export was taken at, so a restore can refuse a mismatch. */
  schema_version: number;
  tables: Record<string, number>;
  excluded_tables: string[];
}

export interface WorkspaceExportResult {
  workspace_id: string;
  export_path: string;
  sha256: string;
  byte_size: number;
  schema_version: number;
  manifest: WorkspaceExportManifest;
}

/**
 * Write an encrypted, single-tenant export. AES-256-GCM: the auth tag means a tampered file fails to
 * open rather than opening with silently altered contents.
 */
export async function exportWorkspace(
  db: Db,
  workspaceId: string,
  options: { directory: string; encryption_key: Buffer | string; now?: () => Date },
): Promise<WorkspaceExportResult> {
  const workspace = await db.query<{ slug: string }>(
    `SELECT slug FROM workspaces WHERE workspace_id = $1`,
    [workspaceId],
  );
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const table of EXPORTED_TABLES) {
    const { rows } = await db.query(`SELECT * FROM ${table} WHERE workspace_id = $1`, [workspaceId]);
    data[table] = rows;
    counts[table] = rows.length;
  }
  const manifest: WorkspaceExportManifest = {
    workspace_id: workspaceId,
    workspace_slug: workspace.rows[0]?.slug ?? null,
    created_at: (options.now?.() ?? new Date()).toISOString(),
    schema_version: LATEST_MIGRATION,
    tables: counts,
    excluded_tables: [
      "workspace_sessions",
      "workspace_scim_tokens",
      "oidc_login_requests",
      // Download tickets are credentials for the very file being written; exporting them into it would
      // make the file its own key.
      "workspace_exports",
    ],
  };

  const plaintext = gzipSync(Buffer.from(JSON.stringify({ manifest, data }), "utf8"));
  const key = exportKey(options.encryption_key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const file = Buffer.concat([EXPORT_MAGIC, iv, tag, ciphertext]);

  // 0700: an export is the whole tenant in one file. Nobody else on the host reads it.
  mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  const exportPath = join(options.directory, `kage-workspace-${workspaceId}-${Date.now()}.kexp`);
  writeFileSync(exportPath, file, { mode: 0o600 });
  return {
    workspace_id: workspaceId,
    export_path: exportPath,
    sha256: createHash("sha256").update(file).digest("hex"),
    byte_size: file.length,
    schema_version: LATEST_MIGRATION,
    manifest,
  };
}

/** Open an export. A wrong key or a tampered file fails here rather than yielding partial data. */
export async function readWorkspaceExport(
  path: string,
  encryptionKey: Buffer | string,
): Promise<{ manifest: WorkspaceExportManifest; data: Record<string, unknown[]> }> {
  const file = readFileSync(path);
  if (!file.subarray(0, EXPORT_MAGIC.length).equals(EXPORT_MAGIC)) {
    throw new Error("failed to decrypt workspace export: not a Kage export file");
  }
  const iv = file.subarray(EXPORT_MAGIC.length, EXPORT_MAGIC.length + IV_BYTES);
  const tag = file.subarray(EXPORT_MAGIC.length + IV_BYTES, EXPORT_MAGIC.length + IV_BYTES + TAG_BYTES);
  const ciphertext = file.subarray(EXPORT_MAGIC.length + IV_BYTES + TAG_BYTES);
  try {
    const decipher = createDecipheriv("aes-256-gcm", exportKey(encryptionKey), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(gunzipSync(plaintext).toString("utf8")) as {
      manifest: WorkspaceExportManifest;
      data: Record<string, unknown[]>;
    };
  } catch (error) {
    throw new Error(`failed to decrypt workspace export: ${(error as Error).message}`);
  }
}

/** True while the workspace row still exists. False the moment the deletion transaction commits. */
export async function workspaceExists(db: Db, workspaceId: string): Promise<boolean> {
  const { rows } = await db.query(`SELECT 1 FROM workspaces WHERE workspace_id = $1`, [workspaceId]);
  return rows.length > 0;
}

/** Every object-storage key this tenant references. The deletion path removes exactly these. */
export async function objectKeysForWorkspace(db: Db, workspaceId: string): Promise<string[]> {
  const { rows } = await db.query<{ object_key: string }>(
    `SELECT object_key FROM workspace_evidence
      WHERE workspace_id = $1 AND object_key IS NOT NULL
      ORDER BY object_key`,
    [workspaceId],
  );
  return rows.map((row) => row.object_key);
}

export interface DeleteWorkspaceOptions {
  /** The principal confirming the deletion. Must be an active OWNER of this workspace. */
  confirmed_by: string;
  /**
   * The session that requested the deletion. Its `reauthenticated_at` — written by this server when the
   * credential was presented — is the only accepted proof of recent re-authentication. There is
   * deliberately no way to pass the instant itself.
   */
  session_id: string;
  directory: string;
  encryption_key: Buffer | string;
  object_store?: ObjectStore;
  now?: () => number;
}

export interface DeleteWorkspaceResult {
  workspace_id: string;
  deletion_id: string;
  export_path: string;
  export_sha256: string;
  /** How many object keys this tenant HAD. */
  object_keys_total: number;
  /** How many the object store REPORTED removing. These two are not the same number, and never merged. */
  object_keys_deleted: number;
  rows_deleted: number;
  /** The one-time ticket for fetching the export after the tenant (and every session) is gone. */
  download: ExportDownloadTicket;
}

export interface ExportDownloadTicket {
  export_id: string;
  /** The raw ticket. Returned once, to the authenticated requester; only its hash is stored. */
  token: string;
  expires_at: string;
}

/**
 * Record an export as a fetchable object and mint its download ticket.
 *
 * The ticket is what makes an export a deliverable rather than a path on our disk. It is stored hashed
 * (SHA-256, like session and SCIM tokens) and it is bound to ONE export row, so it grants exactly one
 * tenant's one file and nothing else. `workspace_exports` has no foreign key to `workspaces` on purpose:
 * the export a deletion produced must remain fetchable after the tenant row is gone, which is the only
 * moment the customer genuinely cannot authenticate any other way.
 */
export async function registerExportDownload(
  db: Db,
  input: {
    workspace_id: string;
    workspace_slug: string | null;
    kind: "export" | "deletion";
    export_path: string;
    sha256: string;
    byte_size: number;
    ttlMs?: number;
    now?: () => number;
  },
): Promise<ExportDownloadTicket> {
  const exportId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const nowMs = input.now?.() ?? Date.now();
  const expiresAt = new Date(nowMs + (input.ttlMs ?? EXPORT_DOWNLOAD_TTL_MS));
  await db.query(
    `INSERT INTO workspace_exports(export_id, workspace_id, workspace_slug, kind, export_path, sha256,
                                   byte_size, download_token_hash, expires_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      exportId,
      input.workspace_id,
      input.workspace_slug,
      input.kind,
      input.export_path,
      input.sha256,
      input.byte_size,
      createHash("sha256").update(token).digest("hex"),
      expiresAt.toISOString(),
    ],
  );
  return { export_id: exportId, token, expires_at: expiresAt.toISOString() };
}

export interface ResolvedExportDownload {
  export_id: string;
  workspace_id: string;
  export_path: string;
  sha256: string;
  byte_size: number;
}

/**
 * Resolve a download ticket to the file it grants, or null.
 *
 * Null covers every failure — unknown export, wrong ticket, expired ticket — so a caller probing ids
 * learns nothing from the answer. The stored hash is compared in CONSTANT TIME against the hash of what
 * was presented, and the row is looked up by export id rather than by the token hash so that a mismatch
 * cannot be distinguished from a miss by timing the index probe either.
 */
export async function resolveExportDownload(
  db: Db,
  exportId: string,
  token: string | undefined,
): Promise<ResolvedExportDownload | null> {
  if (!token) return null;
  // A non-uuid id would make Postgres raise rather than return no rows; treat it as a miss.
  if (!/^[0-9a-fA-F-]{36}$/.test(exportId)) return null;
  const { rows } = await db.query<{
    export_id: string;
    workspace_id: string;
    export_path: string;
    sha256: string;
    byte_size: string | number;
    download_token_hash: string;
    expired: boolean;
  }>(
    `SELECT export_id, workspace_id, export_path, sha256, byte_size, download_token_hash,
            expires_at <= now() AS expired
       FROM workspace_exports
      WHERE export_id = $1`,
    [exportId],
  );
  const row = rows[0];
  if (!row || row.expired) return null;
  const stored = Buffer.from(row.download_token_hash, "utf8");
  const presented = Buffer.from(createHash("sha256").update(token).digest("hex"), "utf8");
  if (stored.length !== presented.length || !timingSafeEqual(stored, presented)) return null;
  await db.query(
    `UPDATE workspace_exports SET last_downloaded_at = now(), download_count = download_count + 1
      WHERE export_id = $1`,
    [exportId],
  );
  return {
    export_id: row.export_id,
    workspace_id: row.workspace_id,
    export_path: row.export_path,
    sha256: row.sha256,
    byte_size: Number(row.byte_size),
  };
}

/** Irreversibly delete a workspace, after exporting it. See the file header for why this order. */
export async function deleteWorkspace(
  db: Db,
  workspaceId: string,
  options: DeleteWorkspaceOptions,
): Promise<DeleteWorkspaceResult> {
  const nowMs = options.now?.() ?? Date.now();

  const workspace = await db.query<{ slug: string }>(
    `SELECT slug FROM workspaces WHERE workspace_id = $1`,
    [workspaceId],
  );
  if (workspace.rows.length === 0) {
    throw new WorkspaceDeletionError("unknown_workspace", `no such workspace ${workspaceId}`);
  }

  // 1. Authority. The role is read from the database inside this tenant — never from a request claim.
  const confirmer = await db.query<{ role: string }>(
    `SELECT role FROM workspace_principals
      WHERE workspace_id = $1 AND principal_id = $2 AND active`,
    [workspaceId, options.confirmed_by],
  );
  if (confirmer.rows[0]?.role !== "owner") {
    throw new WorkspaceDeletionError(
      "owner_required",
      "only an active workspace owner may confirm a deletion",
    );
  }
  // The re-authentication instant comes from the SESSION ROW, matched to this tenant AND this owner, and
  // only while the session is live. A NULL (a session minted before migration 012) fails the check:
  // "never corroborated" must not read as "corroborated long ago is fine".
  const session = await db.query<{ reauthenticated_at: Date | string | null }>(
    `SELECT reauthenticated_at FROM workspace_sessions
      WHERE workspace_id = $1 AND session_id = $2 AND principal_id = $3
        AND revoked_at IS NULL AND expires_at > now()`,
    [workspaceId, options.session_id, options.confirmed_by],
  );
  const recordedReauth = session.rows[0]?.reauthenticated_at ?? null;
  const reauthAt = recordedReauth === null ? Number.NaN : new Date(recordedReauth).getTime();
  if (!Number.isFinite(reauthAt) || nowMs - reauthAt > REAUTHENTICATION_WINDOW_MS) {
    throw new WorkspaceDeletionError(
      "reauthentication_required",
      `the confirming owner must have re-authenticated within the last ${
        REAUTHENTICATION_WINDOW_MS / 60000
      } minutes`,
    );
  }

  // Blobs, before anything is written. A tenant whose evidence lives in a bucket this deployment cannot
  // reach must not be "deleted": the rows would go, the blobs would stay, and the terminal ledger would
  // record a removal that never happened. Refusing here leaves the tenant completely intact.
  const keys = await objectKeysForWorkspace(db, workspaceId);
  if (keys.length > 0 && !options.object_store) {
    throw new WorkspaceDeletionError(
      "object_store_required",
      `this workspace references ${keys.length} object-storage keys and no object store is configured; ` +
        "deleting the database rows would leave those blobs behind",
    );
  }

  // 2. Export BEFORE anything is removed. A failure here aborts with the tenant fully intact.
  const exported = await exportWorkspace(db, workspaceId, {
    directory: options.directory,
    encryption_key: options.encryption_key,
  });

  // 2b. The export is registered as a fetchable object BEFORE the tenant goes, because afterwards there
  // is no session, no principal, and no workspace left to authorise a download with.
  const download = await registerExportDownload(db, {
    workspace_id: workspaceId,
    workspace_slug: workspace.rows[0].slug,
    kind: "deletion",
    export_path: exported.export_path,
    sha256: exported.sha256,
    byte_size: exported.byte_size,
    now: () => nowMs,
  });

  // 3. The terminal record, outside the tenant partition, committed before the data goes.
  const deletionId = randomUUID();
  await db.query(
    `INSERT INTO workspace_deletions(deletion_id, workspace_id, workspace_slug, confirmed_by,
                                     reauthenticated_at, export_path, export_sha256, export_bytes,
                                     object_keys_total)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      deletionId,
      workspaceId,
      workspace.rows[0].slug,
      options.confirmed_by,
      new Date(reauthAt).toISOString(),
      exported.export_path,
      exported.sha256,
      exported.byte_size,
      keys.length,
    ],
  );

  // 4. Object storage, before the database — see the header for why this direction. The count recorded
  // is what the store REPORTED removing, never how many we asked it to remove: this ledger is the
  // compliance record that outlives the tenant, and it is worth nothing if it rounds up.
  const objectKeysDeleted =
    keys.length > 0 && options.object_store ? await options.object_store.deleteKeys(keys) : 0;

  // 5. One transaction for every relational row: the tenant goes entirely, or not at all.
  const rowsDeleted = await db.transaction(async (tx) => {
    // The audit purge flag is transaction-local and dies with this transaction.
    await tx.query(`SELECT set_config('kage.retention_purge', 'on', true)`);
    // Provider bookkeeping outlives the tenant deliberately: keeping the Stripe event ledger (with its
    // tenant reference cleared) means a webhook redelivered after the deletion is still recognised as
    // already-applied instead of being processed a second time against a recreated workspace.
    await tx.query(`UPDATE billing_events SET workspace_id = NULL WHERE workspace_id = $1`, [workspaceId]);
    let total = 0;
    for (const table of DELETION_ORDER) {
      const result = await tx.query(`DELETE FROM ${table} WHERE workspace_id = $1`, [workspaceId]);
      total += result.rowCount;
    }
    return total;
  });

  await db.query(
    `UPDATE workspace_deletions SET completed_at = now(), object_keys_deleted = $2, rows_deleted = $3
      WHERE deletion_id = $1`,
    [deletionId, objectKeysDeleted, rowsDeleted],
  );

  return {
    workspace_id: workspaceId,
    deletion_id: deletionId,
    export_path: exported.export_path,
    export_sha256: exported.sha256,
    object_keys_total: keys.length,
    object_keys_deleted: objectKeysDeleted,
    rows_deleted: rowsDeleted,
    download,
  };
}
