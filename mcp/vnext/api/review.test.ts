import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EvidenceRecord } from "../repo-model/types.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "../runtime/server.js";

const NOW = "2026-07-19T00:00:00.000Z";

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

// A model with two review scenarios:
//   1. `ri-passkey`: a HIGH-impact claim proposed by `alice`, awaiting owner review — the material
//      for the self-approval (403) and version-drift (409) tests.
//   2. `ri-contradiction`: a proposed claim that contradicts an existing verified current claim —
//      the material for the contradiction-supersession test.
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

  const evidence: EvidenceRecord = {
    evidence_id: randomUUID(),
    repository_id: "repo-1",
    source_type: "source",
    source_uri: "src/auth.ts",
    source_fingerprint: randomUUID(),
    commit: "abc123",
    path: "src/auth.ts",
    symbol: "authenticate",
    line_start: 1,
    line_end: 20,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
  };
  model.addEvidence(evidence);

  const base = (overrides: Partial<ClaimRecord>): ClaimRecord => ({
    claim_id: randomUUID(),
    entity_id: "feature-auth",
    claim_kind: "behavior",
    normalized_content: "content",
    trust_state: "proposed",
    confidence: 1,
    impact_class: "low",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "owner",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });

  // Scenario 1: a high-impact proposed claim by alice, awaiting owner approval.
  const passkey = model.createClaim(
    base({
      claim_id: "claim-passkey",
      claim_kind: "behavior-passkey",
      created_by: "alice",
      trust_state: "proposed",
      impact_class: "high",
      review_policy: "owner",
      normalized_content: "Auth supports passkeys.",
    }),
  );
  model.createReviewItem({
    review_item_id: "ri-passkey",
    repository_id: "repo-1",
    claim_id: passkey.claim_id,
    reason: "high-impact behavior change requires owner approval",
    required_role: "owner",
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: NOW,
  });

  // Scenario 2: an existing verified claim contradicted by a proposed one, in the same slot.
  model.createClaim(
    base({
      claim_id: "claim-sessions-server",
      claim_kind: "behavior-sessions",
      created_by: "compiler",
      trust_state: "verified",
      impact_class: "high",
      normalized_content: "Sessions are stored server-side.",
    }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  const candidate = model.createClaim(
    base({
      claim_id: "claim-sessions-signed",
      claim_kind: "behavior-sessions",
      created_by: "carol",
      trust_state: "proposed",
      impact_class: "high",
      normalized_content: "Sessions are signed, stateless cookies.",
    }),
  );
  model.createReviewItem({
    review_item_id: "ri-contradiction",
    repository_id: "repo-1",
    claim_id: candidate.claim_id,
    reason: "contradicts the current server-side sessions claim",
    required_role: "owner",
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: NOW,
  });
}

async function withSeededRuntime(
  action: (
    call: (method: string, path: string, body?: unknown) => Promise<ApiResponse>,
    runtime: LocalRuntimeHandle,
  ) => Promise<void>,
): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-review-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit", contextSource: null });
    seed(new Repository(runtime.database));
    const call = async (method: string, path: string, body?: unknown): Promise<ApiResponse> => {
      const response = await fetch(`${runtime!.url}${path}`, {
        method,
        headers: body === undefined
          ? authHeaders(runtime!.token)
          : { ...authHeaders(runtime!.token), "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    };
    await action(call, runtime);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

async function versionOf(
  call: (method: string, path: string, body?: unknown) => Promise<ApiResponse>,
  reviewItemId: string,
): Promise<string> {
  const response = await call("GET", "/v2/review-items");
  const item = response.body.review_items.find(
    (r: { review_item_id: string }) => r.review_item_id === reviewItemId,
  );
  assert.ok(item, `review item ${reviewItemId} present`);
  assert.ok(typeof item.version === "string" && item.version.length > 0, "review item carries a version");
  return item.version;
}

test("a high-impact claim cannot be approved by its proposer", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-passkey");
    const response = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "alice",
      expected_version: version,
      decision_note: "looks good to me",
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, "self_approval_blocked");
  });
});

test("a different authorized actor can accept, moving the claim to approved", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-passkey");
    const response = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "verified against the passkey RFC and the auth module",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.accepted.trust_state, "approved");
    assert.equal(response.body.review.status, "accepted");
    assert.equal(response.body.review.decided_by, "owner-bob");
  });
});

test("accepting with a stale expected version is rejected with 409", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "owner-bob",
      expected_version: "stale-version-that-does-not-match",
      decision_note: "note",
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.error, "version_conflict");
  });
});

test("a second decision on an already-accepted item conflicts", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-passkey");
    const first = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "accepting",
    });
    assert.equal(first.status, 200);
    // The stale version we still hold no longer matches the mutated item.
    const second = await call("POST", "/v2/review-items/ri-passkey/reject", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "changed my mind",
    });
    assert.equal(second.status, 409);
  });
});

test("accepting one contradiction supersedes the opposing current claim", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-contradiction");
    const response = await call("POST", "/v2/review-items/ri-contradiction/supersede", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "sessions are now stateless signed cookies; retiring the server-side claim",
      opposing_claim_id: "claim-sessions-server",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.accepted.trust_state, "approved");
    assert.equal(response.body.replaced.trust_state, "superseded");
    assert.equal(response.body.replaced.claim_id, "claim-sessions-server");
  });
});

test("rejecting records the decision without approving the claim", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-passkey");
    const response = await call("POST", "/v2/review-items/ri-passkey/reject", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "insufficient evidence for a high-impact change",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.review.status, "rejected");
    // The claim is NOT laundered into an injectable state by a rejection.
    const feature = await call("GET", "/v2/features/authentication");
    const approved = feature.body.current_claims.some(
      (c: { claim_id: string }) => c.claim_id === "claim-passkey",
    );
    assert.equal(approved, false);
  });
});

test("a mutation without an actor or decision note is refused", async () => {
  await withSeededRuntime(async (call) => {
    const version = await versionOf(call, "ri-passkey");
    const noActor = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "",
      expected_version: version,
      decision_note: "note",
    });
    assert.equal(noActor.status, 400);
    const noNote = await call("POST", "/v2/review-items/ri-passkey/accept", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "",
    });
    assert.equal(noNote.status, 400);
  });
});

test("a mutation against an unknown review item is a 404", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("POST", "/v2/review-items/does-not-exist/accept", {
      actor: "owner-bob",
      expected_version: "whatever",
      decision_note: "note",
    });
    assert.equal(response.status, 404);
  });
});
