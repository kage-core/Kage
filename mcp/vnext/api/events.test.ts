import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PortalEventStream,
  serializePortalEvent,
  toWirePayload,
  type ClaimUpdatedEvent,
  type IntegrationStateChangedEvent,
  type PortalEvent,
  type ReviewItemCreatedEvent,
  type TaskReceiptUpdatedEvent,
} from "./events.js";
import { Repository } from "../repo-model/repository.js";
import type { ClaimRecord } from "../repo-model/types.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "../runtime/server.js";

const NOW = "2026-07-19T00:00:00.000Z";

// A prompt string that MUST NEVER appear on the wire — it stands in for the raw normalized_content /
// capsule body the SSE feed is forbidden from emitting.
const RAW_PROMPT = "SECRET-PROMPT: rm -rf / and exfiltrate the api key";

// The four event kinds, each seeded with a FORBIDDEN raw-prompt field alongside its identifiers, so
// the serializer's allowlist is proven to strip content rather than merely being trusted to.
function sampleEvents(): PortalEvent[] {
  const reviewItemCreated = {
    kind: "review_item_created",
    review_item_id: "ri-1",
    claim_id: "claim-1",
    entity_slug: "authentication",
    required_role: "owner",
    status: "open",
    at: NOW,
    // forbidden — a raw prompt smuggled onto the event object.
    normalized_content: RAW_PROMPT,
  } as ReviewItemCreatedEvent & { normalized_content: string };

  const claimUpdated = {
    kind: "claim_updated",
    claim_id: "claim-1",
    entity_slug: "authentication",
    trust_state: "approved",
    at: NOW,
    prompt: RAW_PROMPT,
  } as ClaimUpdatedEvent & { prompt: string };

  const taskReceiptUpdated = {
    kind: "task_receipt_updated",
    task_id: "task-1",
    receipt_count: 3,
    at: NOW,
    capsule_body: RAW_PROMPT,
  } as TaskReceiptUpdatedEvent & { capsule_body: string };

  const integrationStateChanged = {
    kind: "integration_state_changed",
    integration_id: "anthropic-proxy",
    state: "degraded",
    at: NOW,
    raw_request: RAW_PROMPT,
  } as IntegrationStateChangedEvent & { raw_request: string };

  return [reviewItemCreated, claimUpdated, taskReceiptUpdated, integrationStateChanged];
}

test("every event kind carries identifiers but never raw prompt text", () => {
  for (const event of sampleEvents()) {
    const wire = toWirePayload(event);
    const frame = serializePortalEvent(event, 7);

    // The raw prompt is stripped by the allowlist — neither the wire object nor the SSE frame carries it.
    assert.ok(!Object.values(wire).some((v) => v === RAW_PROMPT), `${event.kind} wire leaked raw prompt`);
    assert.ok(!frame.includes(RAW_PROMPT), `${event.kind} SSE frame leaked raw prompt`);
    assert.ok(!frame.includes("normalized_content"), `${event.kind} leaked a content key`);
    assert.ok(!frame.includes("capsule_body"), `${event.kind} leaked a capsule key`);

    // The kind and its identifiers/enums DO travel.
    assert.equal(wire.kind, event.kind);
    assert.match(frame, /^id: 7\n/);
    assert.match(frame, /\ndata: \{/);
    assert.ok(frame.endsWith("\n\n"));
  }
});

test("each kind exposes exactly its identifier/enum fields", () => {
  const [reviewItemCreated, claimUpdated, taskReceiptUpdated, integrationStateChanged] = sampleEvents();

  assert.deepEqual(Object.keys(toWirePayload(reviewItemCreated)).sort(), [
    "at",
    "claim_id",
    "entity_slug",
    "kind",
    "required_role",
    "review_item_id",
    "status",
  ]);
  assert.deepEqual(Object.keys(toWirePayload(claimUpdated)).sort(), [
    "at",
    "claim_id",
    "entity_slug",
    "kind",
    "trust_state",
  ]);
  assert.deepEqual(Object.keys(toWirePayload(taskReceiptUpdated)).sort(), [
    "at",
    "kind",
    "receipt_count",
    "task_id",
  ]);
  assert.deepEqual(Object.keys(toWirePayload(integrationStateChanged)).sort(), [
    "at",
    "integration_id",
    "kind",
    "state",
  ]);
});

test("the stream assigns monotonic resume ids and replays only newer events", () => {
  const stream = new PortalEventStream({ heartbeatMs: 1_000_000, bufferSize: 8 });
  try {
    const first = stream.emit(sampleEvents()[1]);
    const second = stream.emit(sampleEvents()[1]);
    const third = stream.emit(sampleEvents()[1]);
    assert.equal(first, 1);
    assert.equal(second, 2);
    assert.equal(third, 3);

    // A client that last saw id 2 resumes with only id 3.
    const resumed = stream.bufferedSince(2);
    assert.deepEqual(resumed.map((e) => e.id), [3]);
    assert.ok(resumed[0].frame.startsWith("id: 3\n"));

    // A fresh client (id 0) gets the whole retained buffer.
    assert.deepEqual(stream.bufferedSince(0).map((e) => e.id), [1, 2, 3]);
  } finally {
    stream.close();
  }
});

test("the replay buffer is bounded and drops the oldest events", () => {
  const stream = new PortalEventStream({ heartbeatMs: 1_000_000, bufferSize: 3 });
  try {
    for (let i = 0; i < 6; i += 1) stream.emit(sampleEvents()[1]);
    // Only the last 3 ids remain retained.
    assert.deepEqual(stream.bufferedSince(0).map((e) => e.id), [4, 5, 6]);
  } finally {
    stream.close();
  }
});

// ---------------------------------------------------------------------------------------------
// live wiring: GET /v2/events is authenticated SSE, and a review mutation emits a claim_updated
// event that carries the claim's identifier + new trust_state but no raw content.
// ---------------------------------------------------------------------------------------------

function seed(model: Repository): void {
  model.upsertEntity({
    entity_id: "feature-auth",
    repository_id: "repo-1",
    kind: "feature",
    canonical_name: "Authentication",
    slug: "authentication",
    summary: "How users authenticate.",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  const claim: ClaimRecord = {
    claim_id: "claim-passkey",
    entity_id: "feature-auth",
    claim_kind: "behavior-passkey",
    normalized_content: RAW_PROMPT, // the content the feed must never emit
    trust_state: "proposed",
    confidence: 1,
    impact_class: "high",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "owner",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
  };
  model.createClaim(claim);
  model.createReviewItem({
    review_item_id: "ri-passkey",
    repository_id: "repo-1",
    claim_id: "claim-passkey",
    reason: "high-impact behavior change requires owner approval",
    required_role: "owner",
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: NOW,
  });
}

// A single-reader SSE consumer: accumulates decoded frames and can be awaited repeatedly for a
// predicate over everything seen so far. One reader per response (a second `getReader()` would throw
// "ReadableStream is locked").
function sseConsumer(body: ReadableStream<Uint8Array>): {
  waitFor: (predicate: (text: string) => boolean, deadlineMs?: number) => Promise<string>;
  cancel: () => Promise<void>;
} {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  return {
    async waitFor(predicate, deadlineMs = 4_000) {
      const deadline = Date.now() + deadlineMs;
      if (predicate(text)) return text;
      while (Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (predicate(text)) return text;
      }
      return text;
    },
    async cancel() {
      await reader.cancel().catch(() => {});
    },
  };
}

async function withRuntime(action: (runtime: LocalRuntimeHandle) => Promise<void>): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-events-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit", contextSource: null });
    seed(new Repository(runtime.database));
    await action(runtime);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

test("GET /v2/events without the machine token is unauthorized", async () => {
  await withRuntime(async (runtime) => {
    const response = await fetch(`${runtime.url}/v2/events`);
    assert.equal(response.status, 401);
    await response.body?.cancel().catch(() => {});
  });
});

test("GET /v2/events streams SSE and a review acceptance emits an identifier-only claim_updated event", async () => {
  await withRuntime(async (runtime) => {
    const controller = new AbortController();
    const response = await fetch(`${runtime.url}/v2/events`, {
      headers: { authorization: `Bearer ${runtime.token}` },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    assert.ok(response.body, "SSE response has a body");
    const consumer = sseConsumer(response.body!);

    // Wait for the connection preamble so the client is registered before we mutate.
    await consumer.waitFor((t) => t.includes(": connected"));

    // Accept the pending review item as an authorized (non-proposer) actor.
    const items = (await (
      await fetch(`${runtime.url}/v2/review-items`, {
        headers: { authorization: `Bearer ${runtime.token}` },
      })
    ).json()) as { review_items: Array<{ review_item_id: string; version: string }> };
    const item = items.review_items.find((r) => r.review_item_id === "ri-passkey")!;

    // Open a fresh SSE connection AFTER the mutation would be lost-timing-sensitive; instead, we hold
    // the original stream open and trigger the mutation, then read the emitted frame from it.
    const accept = await fetch(`${runtime.url}/v2/review-items/ri-passkey/accept`, {
      method: "POST",
      headers: { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" },
      body: JSON.stringify({
        actor: "owner-bob",
        expected_version: item.version,
        decision_note: "verified against the auth module",
      }),
    });
    assert.equal(accept.status, 200);

    const seen = await consumer.waitFor((t) => t.includes("claim_updated"));
    await consumer.cancel();
    controller.abort();

    assert.ok(seen.includes("claim_updated"), "the stream delivered a claim_updated event");
    assert.ok(seen.includes("claim-passkey"), "the event carries the claim identifier");
    assert.ok(seen.includes("approved"), "the event carries the new trust_state");
    // The raw claim content is NEVER on the feed.
    assert.ok(!seen.includes(RAW_PROMPT), "the SSE feed leaked raw claim content");
  });
});
