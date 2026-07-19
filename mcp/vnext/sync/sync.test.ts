// Phase E Task 3 — the local sync outbox: privacy filtering, exactly-once enqueue, deterministic
// conflict handling, and offline-tolerant drain. These are pure/local (no Postgres); the workspace-side
// idempotency and tenant isolation are proven end-to-end against real embedded PG in sync-routes.test.ts.
import test from "node:test";
import assert from "node:assert/strict";
import { buildSyncBatch, Outbox } from "./outbox.js";
import { mergeConcurrentClaims } from "./conflicts.js";
import { drainOutbox, type SyncTransport } from "./client.js";
import { fixtureModelWithEvidence, fixtureSyncBatch, makeClaim } from "./fixtures.js";
import type { PushResult } from "./client.js";

const WORKSPACE = "00000000-0000-0000-0000-000000000001";

test("local_raw evidence never enters a sync batch", () => {
  const batch = buildSyncBatch(fixtureModelWithEvidence(["local_raw", "team_metadata", "team_approved"]));
  assert.equal(batch.evidence.some((item) => item.privacy_class === "local_raw"), false);
  // The permitted classes DO survive — the filter drops only local_raw, not all evidence.
  assert.equal(batch.evidence.length, 2);
});

test("only injectable (verified/approved) claims are synced", () => {
  const batch = buildSyncBatch({
    workspace_id: WORKSPACE,
    repository_id: "repo-a1",
    entities: [],
    claims: [
      makeClaim("verified-claim", { trust_state: "verified" }),
      makeClaim("approved-claim", { trust_state: "approved" }),
      makeClaim("proposed-claim", { trust_state: "proposed" }),
      makeClaim("disputed-claim", { trust_state: "disputed" }),
    ],
    evidence: [],
    relations: [],
  });
  const ids = batch.claims.map((claim) => claim.claim_id).sort();
  assert.deepEqual(ids, ["approved-claim", "verified-claim"]);
});

test("a batch id is a stable content hash — the same snapshot yields the same id", () => {
  const a = fixtureSyncBatch(WORKSPACE);
  const b = fixtureSyncBatch(WORKSPACE);
  assert.equal(a.batch_id, b.batch_id);
});

test("enqueuing the same batch twice keeps a single outbox record", () => {
  const outbox = new Outbox();
  const batch = fixtureSyncBatch(WORKSPACE);
  outbox.enqueue(batch);
  outbox.enqueue(batch);
  assert.equal(outbox.size(), 1);
  assert.equal(outbox.pending().length, 1);
});

test("concurrent claim versions preserve both and create review conflict", () => {
  const result = mergeConcurrentClaims(
    makeClaim("claim-A", { content: "A" }),
    makeClaim("claim-B", { content: "B" }),
  );
  assert.equal(result.action, "review_conflict");
  assert.equal(result.preserved_versions.length, 2);
  assert.equal(result.winner, null);
});

test("a linear supersede fast-forwards to the newer head", () => {
  const base = makeClaim("claim-old", { content: "old" });
  const next = makeClaim("claim-new", { content: "new", supersedes: "claim-old" });
  const result = mergeConcurrentClaims(base, next);
  assert.equal(result.action, "fast_forward");
  assert.equal(result.winner?.claim_id, "claim-new");
  assert.equal(result.preserved_versions.length, 1);
});

test("identical content is a no-op merge", () => {
  const result = mergeConcurrentClaims(
    makeClaim("claim-1", { content: "same" }),
    makeClaim("claim-1", { content: "same" }),
  );
  assert.equal(result.action, "identical");
  assert.equal(result.preserved_versions.length, 1);
});

test("merge is commutative — arrival order never changes the outcome", () => {
  const a = makeClaim("claim-A", { content: "A" });
  const b = makeClaim("claim-B", { content: "B" });
  const forward = mergeConcurrentClaims(a, b);
  const reverse = mergeConcurrentClaims(b, a);
  assert.deepEqual(
    forward.preserved_versions.map((c) => c.claim_id),
    reverse.preserved_versions.map((c) => c.claim_id),
  );
});

test("offline drain leaves batches pending, and a later drain delivers them once", async () => {
  const outbox = new Outbox();
  outbox.enqueue(fixtureSyncBatch(WORKSPACE, "repo-a1"));

  let online = false;
  const delivered: string[] = [];
  const transport: SyncTransport = {
    async push(batch): Promise<PushResult> {
      if (!online) throw new Error("workspace unreachable");
      delivered.push(batch.batch_id);
      return { batch_id: batch.batch_id, status: "applied", applied_counts: {} };
    },
    async pull() {
      return { cursor: null, batches: [] };
    },
  };

  const offline = await drainOutbox(outbox, transport);
  assert.equal(offline.offline, true);
  assert.equal(offline.pushed, 0);
  assert.equal(outbox.pending().length, 1);

  online = true;
  const recovered = await drainOutbox(outbox, transport);
  assert.equal(recovered.offline, false);
  assert.equal(recovered.pushed, 1);
  assert.equal(outbox.pending().length, 0);

  // A third drain after everything is acknowledged sends nothing — no duplicate delivery.
  const idle = await drainOutbox(outbox, transport);
  assert.equal(idle.pushed, 0);
  assert.equal(delivered.length, 1);
});

test("assembling a batch that still carries local_raw evidence is rejected at build time", () => {
  // buildSyncBatch filters, but a hand-assembled snapshot cannot smuggle raw content past enqueue.
  const outbox = new Outbox();
  const batch = fixtureSyncBatch(WORKSPACE);
  const tampered = { ...batch, evidence: [{ ...batch.evidence[0], privacy_class: "local_raw" as const }] };
  assert.throws(() => outbox.enqueue(tampered), /local_raw/);
});
