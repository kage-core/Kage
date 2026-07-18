import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EvidenceRecord } from "../repo-model/types.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "../runtime/server.js";

const NOW = "2026-07-13T00:00:00.000Z";

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

// A read model with the shape the two plan tests assert: a `feature` slug `authentication` carrying
// exactly one injectable (verified) claim and exactly one stale claim, so `current_claims` must
// exclude the stale one while `health.stale` counts it.
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
  model.upsertEntity({
    entity_id: "component-token",
    repository_id: "repo-1",
    kind: "component",
    canonical_name: "Token store",
    slug: "token-store",
    summary: "Stores session tokens.",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  model.upsertEntity({
    entity_id: "runbook-rotate",
    repository_id: "repo-1",
    kind: "runbook",
    canonical_name: "Rotate signing key",
    slug: "rotate-signing-key",
    summary: "Steps to rotate the JWT signing key.",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  model.upsertEntity({
    entity_id: "decision-sessions",
    repository_id: "repo-1",
    kind: "decision",
    canonical_name: "Use signed sessions",
    slug: "use-signed-sessions",
    summary: "Adopt signed sessions over server-side session storage.",
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
    review_policy: "automatic",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });

  // One injectable (verified) claim, backed by verified evidence — it is current truth.
  model.createClaim(
    base({ trust_state: "verified", normalized_content: "Auth uses signed sessions.", impact_class: "high" }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  // One stale claim, high impact — excluded from current truth, reported in health and stale_critical.
  model.createClaim(base({ trust_state: "stale", normalized_content: "Auth used server sessions.", impact_class: "high" }));

  // A runbook claim so the runbook read model is non-empty.
  model.createClaim(
    base({ entity_id: "runbook-rotate", trust_state: "verified", claim_kind: "procedure", normalized_content: "Rotate the key." }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );

  // A relation feature -> component so the system map has an edge (and an accessible table row).
  model.addRelation({
    relation_id: randomUUID(),
    repository_id: "repo-1",
    from_entity_id: "feature-auth",
    relation_type: "depends_on",
    to_entity_id: "component-token",
    evidence_id: null,
    created_at: NOW,
  });

  // An open review item so the review queue and overview attention are non-empty.
  const proposed = model.createClaim(base({ normalized_content: "Auth supports passkeys." }));
  model.createReviewItem({
    review_item_id: randomUUID(),
    repository_id: "repo-1",
    claim_id: proposed.claim_id,
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

async function withSeededRuntime(action: (call: (method: string, path: string) => Promise<ApiResponse>, runtime: LocalRuntimeHandle) => Promise<void>): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-portal-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit", contextSource: null });
    seed(new Repository(runtime.database));
    const call = async (method: string, path: string): Promise<ApiResponse> => {
      const response = await fetch(`${runtime!.url}${path}`, { method, headers: authHeaders(runtime!.token) });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    };
    await action(call, runtime);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

test("overview exposes formulas and source links for every metric", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/overview");
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.metrics));
    assert.ok(response.body.metrics.length > 0);
    for (const metric of response.body.metrics) {
      assert.ok(metric.formula.length > 0, `metric ${metric.id} has a formula`);
      assert.ok(metric.source_path.length > 0, `metric ${metric.id} has a source path`);
      assert.notEqual(metric.value, undefined, `metric ${metric.id} has a value (null allowed)`);
      assert.ok(["exact", "cohort", "structural", "unavailable"].includes(metric.exactness));
    }
  });
});

test("feature endpoint excludes stale claims from current truth and reports them in health", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/features/authentication");
    assert.equal(response.status, 200);
    assert.equal(
      response.body.current_claims.some((claim: { trust_state: string }) => claim.trust_state === "stale"),
      false,
    );
    assert.equal(response.body.health.stale, 1);
  });
});

test("portal read routes require the machine token", async () => {
  await withSeededRuntime(async (_call, runtime) => {
    const response = await fetch(`${runtime.url}/v2/overview`);
    assert.equal(response.status, 401);
  });
});

test("unknown entity slugs return 404, not a fabricated body", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/features/does-not-exist");
    assert.equal(response.status, 404);
  });
});

test("feature list projects one card per feature entity", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/features");
    assert.equal(response.status, 200);
    const slugs = response.body.features.map((f: { slug: string }) => f.slug);
    assert.deepEqual(slugs, ["authentication"]);
  });
});

test("component, flow, and decision read models separate current claims from health", async () => {
  await withSeededRuntime(async (call) => {
    const component = await call("GET", "/v2/components/token-store");
    assert.equal(component.status, 200);
    assert.ok(Array.isArray(component.body.current_claims));
    assert.ok(component.body.health);

    const decision = await call("GET", "/v2/decisions/use-signed-sessions");
    assert.equal(decision.status, 200);
    assert.equal(decision.body.decision.slug, "use-signed-sessions");
  });
});

test("runbook read model reports no successful execution honestly", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/runbooks/rotate-signing-key");
    assert.equal(response.status, 200);
    assert.equal(response.body.last_successful_execution, null);
  });
});

test("review-items lists open items for the repository", async () => {
  await withSeededRuntime(async (call) => {
    const response = await call("GET", "/v2/review-items");
    assert.equal(response.status, 200);
    assert.equal(response.body.review_items.length, 1);
    assert.equal(response.body.review_items[0].status, "open");
  });
});

test("system map is deterministic and carries an equivalent accessible table", async () => {
  await withSeededRuntime(async (call) => {
    const first = await call("GET", "/v2/system-map?view=feature");
    const second = await call("GET", "/v2/system-map?view=feature");
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, second.body, "system map must be deterministic");
    assert.ok(Array.isArray(first.body.lanes));
    assert.ok(Array.isArray(first.body.table), "system map must carry an equivalent table for a11y");
    assert.ok(first.body.table.length > 0);
  });
});

test("tasks and integrations routes respond with honest empty collections", async () => {
  await withSeededRuntime(async (call) => {
    const tasks = await call("GET", "/v2/tasks");
    assert.equal(tasks.status, 200);
    assert.ok(Array.isArray(tasks.body.tasks));

    const integrations = await call("GET", "/v2/integrations");
    assert.equal(integrations.status, 200);
    assert.ok(Array.isArray(integrations.body.integrations));
  });
});
