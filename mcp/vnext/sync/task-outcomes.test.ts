// Phase E Task 6 hardening — the PRODUCER of team task outcomes.
//
// Before this module existed, `LocalModelSnapshot.task_outcomes` had no writer anywhere in the product:
// every privacy, suppression and pilot rule was unit-green over hand-written fixtures and could never
// have run on a real repository. These tests hold the producer to the same two disciplines the rest of
// the pipeline carries:
//
//   1. MEASURED OR NULL. A task whose requests were not priced on both sides reports a NULL cost, and a
//      quantity this install does not record at all (which knowledge a capsule reused, how many review
//      decisions a task caused) reports NULL — never 0, which would publish "no reuse" as a measurement.
//   2. NO RAW, NO IDENTITY. The record carries a salted actor PSEUDONYM, never the local user id, and
//      every field it emits passes the workspace's own validator.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TransformationReceipt } from "../protocol/index.js";
import { openVnextDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { DeliveryStore, type StoredContextDelivery } from "../storage/delivery-store.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { validateTaskOutcome } from "../workspace/metrics.js";
import { collectTaskOutcomes } from "./task-outcomes.js";

const T0 = "2026-07-20T00:00:00.000Z";

function receipt(overrides: Partial<TransformationReceipt> = {}): TransformationReceipt {
  return {
    receipt_id: `receipt-${Math.random().toString(36).slice(2, 10)}`,
    task_id: "task-1",
    request_id: `request-${Math.random().toString(36).slice(2, 10)}`,
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "assist",
    measurement_quality: "exact",
    before_input_bytes: 4_000,
    after_input_bytes: 2_000,
    before_input_tokens: 1_000,
    after_input_tokens: 500,
    output_tokens: 300,
    kage_processing_cost_usd: 0.001,
    provider_input_cost_before_usd: 0.05,
    provider_input_cost_after_usd: 0.03,
    latency_ms: 40,
    transformations: ["compress"],
    created_at: T0,
    ...overrides,
  } as TransformationReceipt;
}

function delivery(overrides: Partial<StoredContextDelivery> = {}): StoredContextDelivery {
  return {
    protocol_version: 1,
    delivery_id: `delivery-${Math.random().toString(36).slice(2, 10)}`,
    capsule_id: "capsule-1",
    task_id: "task-1",
    adapter_id: "claude_code",
    injection_location: "system",
    delivered_at: T0,
    added_bytes: 512,
    added_tokens: 128,
    measurement_quality: "exact",
    status: "delivered",
    reason: "capsule injected",
    composition_latency_ms: 12,
    ...overrides,
  } as StoredContextDelivery;
}

interface Harness {
  database: ReturnType<typeof openVnextDatabase>;
  receipts: ReceiptStore;
  deliveries: DeliveryStore;
  dispose(): void;
}

function harness(): Harness {
  const dir = mkdtempSync(join(tmpdir(), "kage-outcomes-"));
  const database = openVnextDatabase(join(dir, "kage.db"));
  migrateLocalDatabase(database);
  return {
    database,
    receipts: new ReceiptStore(database),
    deliveries: new DeliveryStore(database),
    dispose() {
      database.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function seedTask(
  h: Harness,
  taskId: string,
  options: { userId?: string | null; repositoryId?: string; endedAt?: string | null } = {},
): void {
  h.database
    .prepare(
      `INSERT INTO tasks (task_id, session_id, repository_id, agent_surface, user_id, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      taskId,
      `session-${taskId}`,
      options.repositoryId ?? "repo-1",
      "claude_code",
      options.userId === undefined ? "engineer@example.com" : options.userId,
      T0,
      options.endedAt ?? "2026-07-20T00:05:00.000Z",
    );
}

test("the producer turns local tasks, receipts and deliveries into privacy-safe outcomes", () => {
  const h = harness();
  try {
    seedTask(h, "task-1");
    h.receipts.write(receipt({ task_id: "task-1" }));
    h.receipts.write(receipt({ task_id: "task-1" }));
    h.deliveries.write(delivery({ task_id: "task-1" }));

    const outcomes = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-1" },
    );
    assert.equal(outcomes.length, 1);
    const record = outcomes[0];
    assert.equal(record.task_id, "task-1");
    assert.equal(record.repository_id, "repo-1");
    assert.equal(record.agent_surface, "claude_code");
    assert.equal(record.mode, "assist");
    assert.equal(record.measurement_quality, "exact");
    // Two receipts, each measured on both sides: 2 x (0.03 − 0.05). The measurement is passed through
    // unrounded — a producer never massages a measured number — so it is compared within float epsilon.
    assert.ok(Math.abs((record.net_input_cost_delta_usd ?? 0) + 0.04) < 1e-12);
    assert.ok(Math.abs((record.kage_processing_cost_usd ?? 0) - 0.002) < 1e-12);
    assert.equal(record.latency_ms, 40);
    assert.equal(record.delivery_status, "delivered");
    assert.equal(record.started_at, T0);
    // Every emitted record satisfies the workspace's own ingest validator.
    validateTaskOutcome(record);
  } finally {
    h.dispose();
  }
});

test("the producer pseudonymizes the actor and never emits the local user id", () => {
  const h = harness();
  try {
    seedTask(h, "task-1", { userId: "engineer@example.com" });
    seedTask(h, "task-2", { userId: "engineer@example.com" });
    seedTask(h, "task-3", { userId: "other@example.com" });
    for (const id of ["task-1", "task-2", "task-3"]) {
      h.receipts.write(receipt({ task_id: id }));
      h.deliveries.write(delivery({ task_id: id }));
    }
    const outcomes = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-1" },
    );
    const serialized = JSON.stringify(outcomes);
    assert.equal(serialized.includes("engineer@example.com"), false);
    assert.equal(serialized.includes("other@example.com"), false);
    // The pseudonym is stable per person (so the workspace can count distinct people) and distinct
    // between people (so it can enforce a per-person k-anonymity floor).
    assert.equal(outcomes[0].actor_id, outcomes[1].actor_id);
    assert.notEqual(outcomes[0].actor_id, outcomes[2].actor_id);

    // A different install salt yields a different pseudonym, so the id is not a lookup table away
    // from the address it was derived from.
    const salted = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-2" },
    );
    assert.notEqual(salted[0].actor_id, outcomes[0].actor_id);
  } finally {
    h.dispose();
  }
});

test("an unmeasured quantity is null, never a flattering zero", () => {
  const h = harness();
  try {
    seedTask(h, "task-partial");
    // Priced on one side only: no honest delta exists.
    h.receipts.write(
      receipt({
        task_id: "task-partial",
        measurement_quality: "partial",
        provider_input_cost_after_usd: null,
        kage_processing_cost_usd: null,
      }),
    );
    h.deliveries.write(delivery({ task_id: "task-partial", status: "failed_open", injection_location: "none", added_bytes: 0, added_tokens: null }));

    const [record] = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-1" },
    );
    assert.equal(record.measurement_quality, "partial");
    assert.equal(record.net_input_cost_delta_usd, null);
    assert.equal(record.kage_processing_cost_usd, null);
    assert.equal(record.delivery_status, "failed_open");
    // This install does not record WHICH knowledge a capsule reused, nor how many review decisions a
    // task caused. Emitting [] / 0 would publish "no reuse" and "no review burden" as measurements.
    assert.equal(record.knowledge_ids_reused, null);
    assert.equal(record.review_decisions, null);
    assert.equal(record.verification_outcome, "unavailable");
    assert.equal(record.verified_at, null);
  } finally {
    h.dispose();
  }
});

test("a task Kage never touched produces no team outcome at all", () => {
  const h = harness();
  try {
    seedTask(h, "untouched");
    const outcomes = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-1" },
    );
    assert.deepEqual(outcomes, []);
  } finally {
    h.dispose();
  }
});

test("the producer is repository-scoped", () => {
  const h = harness();
  try {
    seedTask(h, "task-a", { repositoryId: "repo-a" });
    seedTask(h, "task-b", { repositoryId: "repo-b" });
    for (const id of ["task-a", "task-b"]) {
      h.receipts.write(receipt({ task_id: id }));
      h.deliveries.write(delivery({ task_id: id }));
    }
    const scoped = collectTaskOutcomes(
      { database: h.database, receipts: h.receipts, deliveries: h.deliveries },
      { actorSalt: "salt-1", repositoryId: "repo-a" },
    );
    assert.deepEqual(scoped.map((record) => record.task_id), ["task-a"]);
  } finally {
    h.dispose();
  }
});
