import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../../type-guards.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import type { LocalDatabase } from "./database.js";
import { DeliveryStore, type StoredContextDelivery } from "./delivery-store.js";

// Why a spool at all, rather than one more authenticated POST to the runtime:
//
//   1. A FAILED-OPEN CANNOT BE POSTED. The delivery Kage most needs to record is the one where the
//      daemon was unreachable. There is no endpoint to tell about that; the endpoint is the thing
//      that failed. Only a local file can hold that fact.
//   2. A delivery write must never be felt in a session. Appending one small 0600 file inside the
//      runtime's own 0700 directory costs no round trip and cannot fail a hook.
//   3. The proxy and the shell hook have no SQLite handle (and, on Node 18, no node:sqlite at all).
//      They can always write a file.
//
// One file per delivery, written to a temp name and renamed into place, so a reader only ever sees
// a complete record and no two writers can interleave into the same file.
const SPOOL_DIRECTORY = "deliveries";

// A hook whose daemon is dead records a failed-open on every prompt, forever. That is the truth,
// but it must not become an unbounded directory: past this many pending files Kage stops spooling
// rather than let measurement eat the disk. A live daemon drains this to zero continuously.
export const DELIVERY_SPOOL_MAX_FILES = 2_000;

export function deliverySpoolDirectory(projectDir: string): string {
  return join(resolveRuntimePaths(projectDir).runtimeDirectory, SPOOL_DIRECTORY);
}

/**
 * Write one delivery to the spool. Returns false — NEVER throws — when it could not be written: a
 * lost measurement is a gap in a report, while a thrown error would be a broken agent session, and
 * Kage's first promise is that it cannot break the session.
 */
export function spoolContextDelivery(projectDir: string, delivery: StoredContextDelivery): boolean {
  try {
    const directory = deliverySpoolDirectory(projectDir);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (readdirSync(directory).length >= DELIVERY_SPOOL_MAX_FILES) return false;

    const id = randomUUID();
    const temporary = join(directory, `.${id}.tmp`);
    const final = join(directory, `${id}.json`);
    const descriptor = openSync(temporary, "wx", 0o600);
    try {
      writeSync(descriptor, JSON.stringify(delivery));
    } finally {
      closeSync(descriptor);
    }
    renameSync(temporary, final);
    return true;
  } catch {
    return false;
  }
}

// The spool file is a local file in a directory the runtime owns, but it is still parsed as
// untrusted input: a record that does not project cleanly onto a StoredContextDelivery — or that
// claims an attachment it could not have made (see validateContextDelivery) — is dropped, never
// coerced into the nearest legal row.
function projectDelivery(value: unknown): StoredContextDelivery | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = {
    delivery_id: value.delivery_id,
    capsule_id: value.capsule_id,
    task_id: value.task_id,
    adapter_id: value.adapter_id,
    injection_location: value.injection_location,
    delivered_at: value.delivered_at,
    added_bytes: value.added_bytes,
    added_tokens: value.added_tokens === undefined ? null : value.added_tokens,
    measurement_quality: value.measurement_quality,
    status: value.status,
    reason: value.reason,
    composition_latency_ms:
      value.composition_latency_ms === undefined ? null : value.composition_latency_ms,
    // A spooled record from before the provider column, or from the hook, simply has no provider —
    // stored as null, never coerced into a guessed one.
    provider: value.provider === undefined ? null : value.provider,
  } as StoredContextDelivery;
  return candidate;
}

/**
 * Move every spooled delivery into the store and remove its file. Returns the number of deliveries
 * INSERTED (a duplicate delivery_id counts as zero, so a drained record can never be double
 * counted). Never throws: draining is measurement plumbing and must not take down a runtime or a
 * report.
 */
export function drainDeliverySpool(db: LocalDatabase, projectDir: string): number {
  let inserted = 0;
  let files: string[];
  const directory = deliverySpoolDirectory(projectDir);
  try {
    files = readdirSync(directory).filter((name) => name.endsWith(".json"));
  } catch {
    return 0;
  }

  const store = new DeliveryStore(db);
  for (const name of files) {
    const path = join(directory, name);
    try {
      const delivery = projectDelivery(JSON.parse(readFileSync(path, "utf8")) as unknown);
      if (delivery && store.write(delivery).inserted) inserted += 1;
    } catch {
      // Unparseable, or a record that lies about what it delivered. It is not evidence of anything,
      // and it must not make the spool grow forever, so it is consumed like any other file.
    }
    try {
      unlinkSync(path);
    } catch {
      // Already gone (another drain won the race). Nothing to undo: the insert is idempotent.
    }
  }
  return inserted;
}
