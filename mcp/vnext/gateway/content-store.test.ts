import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { ContentStore, type StoredContentMetadata } from "./content-store.js";
import { contentObjectPaths } from "../runtime/paths.js";

const roots: string[] = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kage-content-store-"));
  roots.push(root);
  return root;
}

function fixtureContentStore(options?: { now?: () => Date; retentionDays?: number }): ContentStore {
  return new ContentStore({ root: fixtureRoot(), now: options?.now, retentionDays: options?.retentionDays });
}

function fixtureMetadata(): { media_type: string; task_id: string } {
  return { media_type: "text/plain", task_id: "task-1" };
}

function shaOf(id: string): string {
  return id.replace(/^kage-content:/, "");
}

test("same bytes produce one stable retrieval id", () => {
  const store = fixtureContentStore();
  const first = store.put(Buffer.from("full test output"), { media_type: "text/plain", task_id: "task-1" });
  const second = store.put(Buffer.from("full test output"), { media_type: "text/plain", task_id: "task-1" });
  assert.equal(first.retrieval_id, second.retrieval_id);
  assert.equal(store.get(first.retrieval_id).body.toString("utf8"), "full test output");
});

test("retrieval id is kage-content:<sha256> and content addresses by content", () => {
  const store = fixtureContentStore();
  const saved = store.put(Buffer.from("abc"), fixtureMetadata());
  assert.match(saved.retrieval_id, /^kage-content:[0-9a-f]{64}$/);
  const other = store.put(Buffer.from("different bytes"), fixtureMetadata());
  assert.notEqual(saved.retrieval_id, other.retrieval_id);
});

test("tampered content is rejected on retrieval", () => {
  const root = fixtureRoot();
  const store = new ContentStore({ root });
  const saved = store.put(Buffer.from("original"), fixtureMetadata());
  const { objectPath } = contentObjectPaths(root, shaOf(saved.retrieval_id));
  writeFileSync(objectPath, Buffer.from("tampered"));
  assert.throws(() => store.get(saved.retrieval_id), /fingerprint mismatch/);
});

test("get on an unknown id throws not found", () => {
  const store = fixtureContentStore();
  assert.throws(() => store.get("kage-content:" + "0".repeat(64)), /not found/i);
});

test("malformed retrieval id is rejected", () => {
  const store = fixtureContentStore();
  assert.throws(() => store.get("not-a-content-id"), /invalid/i);
});

test("stored objects and metadata are written with mode 0600", () => {
  const root = fixtureRoot();
  const store = new ContentStore({ root });
  const saved = store.put(Buffer.from("secret bytes"), fixtureMetadata());
  const { objectPath, metadataPath } = contentObjectPaths(root, shaOf(saved.retrieval_id));
  assert.equal(statSync(objectPath).mode & 0o777, 0o600);
  assert.equal(statSync(metadataPath).mode & 0o777, 0o600);
});

test("metadata records byte length, media type, task and privacy class", () => {
  const store = fixtureContentStore();
  const saved = store.put(Buffer.from("hello world"), { media_type: "application/json", task_id: "task-42" });
  assert.equal(saved.byte_length, 11);
  assert.equal(saved.media_type, "application/json");
  assert.equal(saved.task_id, "task-42");
  assert.equal(saved.privacy_class, "local_raw");
  assert.equal(saved.sha256, shaOf(saved.retrieval_id));
  const round = store.get(saved.retrieval_id);
  assert.deepEqual(round.metadata, saved);
});

test("default retention is seven days from creation", () => {
  const now = new Date("2026-07-18T00:00:00.000Z");
  const store = fixtureContentStore({ now: () => now });
  const saved = store.put(Buffer.from("retained"), fixtureMetadata());
  assert.equal(saved.created_at, "2026-07-18T00:00:00.000Z");
  assert.equal(saved.expires_at, "2026-07-25T00:00:00.000Z");
});

test("gc removes expired content but keeps live content", () => {
  let clock = new Date("2026-07-18T00:00:00.000Z");
  const store = fixtureContentStore({ now: () => clock });
  const stale = store.put(Buffer.from("stale evidence"), fixtureMetadata());
  clock = new Date("2026-07-19T00:00:00.000Z");
  const fresh = store.put(Buffer.from("fresh evidence"), fixtureMetadata());
  // Advance beyond the stale object's 7-day deadline but not the fresh one's.
  clock = new Date("2026-07-25T12:00:00.000Z");
  const removed = store.gc();
  assert.equal(removed, 1);
  assert.throws(() => store.get(stale.retrieval_id), /not found/i);
  assert.equal(store.get(fresh.retrieval_id).body.toString("utf8"), "fresh evidence");
});

test("gc never deletes content referenced by an active task receipt before its deadline", () => {
  let clock = new Date("2026-07-18T00:00:00.000Z");
  const store = fixtureContentStore({ now: () => clock });
  const referenced = store.put(Buffer.from("still needed"), fixtureMetadata());
  clock = new Date("2026-08-01T00:00:00.000Z"); // long past the 7-day deadline
  const removed = store.gc({ activeReferences: new Set([referenced.retrieval_id]) });
  assert.equal(removed, 0);
  assert.equal(store.get(referenced.retrieval_id).body.toString("utf8"), "still needed");
});

test("put is idempotent and does not resurrect an overwritten deadline", () => {
  let clock = new Date("2026-07-18T00:00:00.000Z");
  const store = fixtureContentStore({ now: () => clock });
  const first = store.put(Buffer.from("dup"), fixtureMetadata());
  clock = new Date("2026-07-20T00:00:00.000Z");
  const second: StoredContentMetadata = store.put(Buffer.from("dup"), fixtureMetadata());
  assert.equal(second.created_at, first.created_at);
  assert.equal(second.expires_at, first.expires_at);
});

test("custom retention window is honored", () => {
  const now = new Date("2026-07-18T00:00:00.000Z");
  const store = fixtureContentStore({ now: () => now, retentionDays: 1 });
  const saved = store.put(Buffer.from("short-lived"), fixtureMetadata());
  assert.equal(saved.expires_at, "2026-07-19T00:00:00.000Z");
});
