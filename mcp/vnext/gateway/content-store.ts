import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";

import { contentObjectPaths } from "../runtime/paths.js";

// The reversibility contract for Phase D.
//
// Every lossy transform in the gateway pipeline stores its exact pre-compression bytes here BEFORE
// it compresses, and embeds the returned `retrieval_id` next to the compressed output. Retrieval
// re-hashes the stored body and refuses to return anything whose fingerprint disagrees with its id,
// so a corrupted or tampered object surfaces as an error instead of silently-wrong "originals".
//
// This module is pure `node:fs` + `node:crypto` on purpose: it must load and run on Node 18, unlike
// the receipt sink which needs node:sqlite (22.5+). Never add a top-level node:sqlite import here.

export const RETRIEVAL_ID_PREFIX = "kage-content:";
const SHA256_HEX = /^[0-9a-f]{64}$/;
export const DEFAULT_RETENTION_DAYS = 7;

export type PrivacyClass = "local_raw";

export interface StoredContentMetadata {
  retrieval_id: string;
  sha256: string;
  byte_length: number;
  media_type: string;
  task_id: string;
  privacy_class: PrivacyClass;
  created_at: string;
  expires_at: string;
}

export interface StoredContent {
  metadata: StoredContentMetadata;
  body: Buffer;
}

export interface PutContentInput {
  media_type: string;
  task_id: string;
}

export interface ContentStoreOptions {
  root: string;
  now?: () => Date;
  retentionDays?: number;
}

export interface GcOptions {
  // Retrieval ids that an active task receipt still depends on. GC never deletes these even after
  // their retention deadline — the raw evidence outlives its default window while a task references
  // it. Approved evidence is promoted through the repository-model evidence policy, not by extending
  // raw retention here.
  activeReferences?: ReadonlySet<string>;
}

function sha256Hex(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

function retrievalIdFor(sha256: string): string {
  return `${RETRIEVAL_ID_PREFIX}${sha256}`;
}

function shaFromRetrievalId(retrievalId: string): string {
  if (!retrievalId.startsWith(RETRIEVAL_ID_PREFIX)) {
    throw new Error(`Invalid retrieval id "${retrievalId}": expected "${RETRIEVAL_ID_PREFIX}<sha256>".`);
  }
  const sha = retrievalId.slice(RETRIEVAL_ID_PREFIX.length);
  if (!SHA256_HEX.test(sha)) {
    throw new Error(`Invalid retrieval id "${retrievalId}": fingerprint is not a 64-character SHA-256 hex.`);
  }
  return sha;
}

// Write-then-atomic-rename with mode 0600 so a reader never observes a partially written object and
// the object is never group/other-readable.
function writeFileAtomic(path: string, body: Buffer): void {
  const tempPath = `${path}.tmp-${randomBytes(6).toString("hex")}`;
  const fd = openSync(tempPath, "wx", 0o600);
  try {
    writeSync(fd, body);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tempPath, path);
}

export class ContentStore {
  private readonly root: string;
  private readonly now: () => Date;
  private readonly retentionDays: number;

  constructor(options: ContentStoreOptions) {
    this.root = options.root;
    this.now = options.now ?? (() => new Date());
    this.retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  put(body: Buffer, input: PutContentInput): StoredContentMetadata {
    const sha256 = sha256Hex(body);
    const { shardDirectory, objectPath, metadataPath } = contentObjectPaths(this.root, sha256);

    // Content-addressed and idempotent: identical bytes map to one object. If it already exists,
    // return the metadata written the first time so the created_at/expires_at deadline is stable
    // (a re-put must not resurrect an expiring object's deadline).
    if (existsSync(metadataPath)) {
      return this.readMetadata(metadataPath, sha256);
    }

    mkdirSync(shardDirectory, { recursive: true, mode: 0o700 });

    const created = this.now();
    const expires = new Date(created.getTime() + this.retentionDays * 24 * 60 * 60 * 1000);
    const metadata: StoredContentMetadata = {
      retrieval_id: retrievalIdFor(sha256),
      sha256,
      byte_length: body.byteLength,
      media_type: input.media_type,
      task_id: input.task_id,
      privacy_class: "local_raw",
      created_at: created.toISOString(),
      expires_at: expires.toISOString(),
    };

    writeFileAtomic(objectPath, body);
    writeFileAtomic(metadataPath, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, "utf8"));
    return metadata;
  }

  get(retrievalId: string): StoredContent {
    const sha256 = shaFromRetrievalId(retrievalId);
    const { objectPath, metadataPath } = contentObjectPaths(this.root, sha256);
    if (!existsSync(objectPath) || !existsSync(metadataPath)) {
      throw new Error(`Content ${retrievalId} not found.`);
    }
    const body = readFileSync(objectPath);
    const actual = sha256Hex(body);
    if (actual !== sha256) {
      throw new Error(`Content ${retrievalId} failed retrieval: fingerprint mismatch (stored ${actual}).`);
    }
    return { metadata: this.readMetadata(metadataPath, sha256), body };
  }

  has(retrievalId: string): boolean {
    const sha256 = shaFromRetrievalId(retrievalId);
    const { objectPath, metadataPath } = contentObjectPaths(this.root, sha256);
    return existsSync(objectPath) && existsSync(metadataPath);
  }

  gc(options: GcOptions = {}): number {
    const active = options.activeReferences ?? new Set<string>();
    const nowMs = this.now().getTime();
    const sha256Root = join(this.root, "sha256");
    if (!existsSync(sha256Root)) return 0;

    let removed = 0;
    for (const shard of readdirSync(sha256Root)) {
      const shardDirectory = join(sha256Root, shard);
      let entries: string[];
      try {
        entries = readdirSync(shardDirectory);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!SHA256_HEX.test(entry)) continue; // skip metadata + temp files
        const sha256 = entry;
        const { objectPath, metadataPath } = contentObjectPaths(this.root, sha256);
        let metadata: StoredContentMetadata;
        try {
          metadata = this.readMetadata(metadataPath, sha256);
        } catch {
          continue; // do not delete objects we cannot account for
        }
        if (active.has(metadata.retrieval_id)) continue;
        if (Date.parse(metadata.expires_at) > nowMs) continue;
        rmSync(objectPath, { force: true });
        rmSync(metadataPath, { force: true });
        removed += 1;
      }
    }
    return removed;
  }

  private readMetadata(metadataPath: string, sha256: string): StoredContentMetadata {
    const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as StoredContentMetadata;
    if (parsed.sha256 !== sha256) {
      throw new Error(`Metadata for ${retrievalIdFor(sha256)} is inconsistent: records ${parsed.sha256}.`);
    }
    return parsed;
  }
}
