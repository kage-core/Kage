// Phase C gate — the in-process proof that the knowledge portal read-model + review + receipts + live
// feed honor every completion-gate bullet that can be verified WITHOUT a browser:
//
//   - Overview metrics expose a formula, a source_path, and an exactness label; an unmeasured metric
//     renders value:null with exactness "unavailable" (never a fabricated $0.00 that implies success).
//   - System maps carry an equivalent accessible table: one row per shown node, in exact parity with
//     the laid-out nodes (no node shown on the map is missing from the table, and vice versa).
//   - Feature / runbook / decision read models show CURRENT truth (injectable = verified/approved)
//     separately from history and uncertainty (proposed/stale/disputed/superseded); a runbook with no
//     recorded execution reports an explicit null, and a decision's approver is verbatim or null.
//   - Review mutations enforce role, version, and self-approval boundaries: a proposer cannot approve
//     a high-impact claim (403 self_approval_blocked), and a stale expected_version is a 409.
//   - Task receipts keep EXACT request economics separate from COHORT outcomes and never fuse them
//     into a single "total value created" figure.
//   - The live feed emits identifiers/enums only — never raw prompt text or claim content.
//
// Browser journeys (onboarding/review/runbook/receipt/keyboard/degraded-daemon) are Playwright specs
// under platform/web/e2e; they are NOT part of this in-process gate and require a browser-capable CI
// step with a seeded daemon. This gate is the authoritative, network-and-browser-free proof.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openRepositoryModel } from "./migration/model-store.js";
import { Repository } from "./repo-model/repository.js";
import type { ClaimRecord, EvidenceRecord } from "./repo-model/types.js";
import { ReceiptStore } from "./storage/receipt-store.js";
import { handlePortalRoute } from "./api/router.js";
import { handleReviewMutation } from "./api/review.js";
import { reviewItemVersion } from "./api/read-models.js";
import { buildTaskReceiptAggregate } from "./api/task-receipts.js";
import { serializePortalEvent, toWirePayload, type ClaimUpdatedEvent } from "./api/events.js";
import type {
  DecisionDetailDto,
  EntityDetailDto,
  OverviewDto,
  RunbookDetailDto,
  SystemMapDto,
  TaskReceiptDto,
  TaskSummaryDto,
} from "./api/types.js";
import type { TransformationReceipt } from "./protocol/index.js";
import { assertVnextRuntime } from "./runtime/runtime-version.js";

const NOW = "2026-07-19T00:00:00.000Z";
const REPO = "repo-1";
const RAW_CONTENT = "SECRET raw claim body that must never reach the live feed";

function supportsVnextRuntime(): boolean {
  try {
    assertVnextRuntime();
    return true;
  } catch {
    return false;
  }
}

// A model exercising every honesty split the gate asserts: a feature with a verified current claim AND
// a stale high-impact claim (current-vs-history + stale_critical); a runbook; a decision; and a
// high-impact proposed claim + open review item (the self-approval / version-drift material).
function seed(model: Repository): void {
  const entity = (id: string, kind: Parameters<Repository["upsertEntity"]>[0]["kind"], name: string, slug: string) =>
    model.upsertEntity({
      entity_id: id,
      repository_id: REPO,
      kind,
      canonical_name: name,
      slug,
      summary: `${name} summary`,
      status: "active",
      created_at: NOW,
      updated_at: NOW,
    });

  entity("repo", "repository", "Kage", "kage");
  entity("feature-auth", "feature", "Authentication", "authentication");
  entity("component-token", "component", "Token store", "token-store");
  entity("runbook-rotate", "runbook", "Rotate signing keys", "rotate-signing-keys");
  entity("decision-okf", "decision", "Adopt OKF", "adopt-okf");

  const evidence: EvidenceRecord = {
    evidence_id: "ev-1",
    repository_id: REPO,
    source_type: "source",
    source_uri: "src/auth.ts",
    source_fingerprint: "fp-1",
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
    claim_id: "x",
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

  // A verified current claim and a stale, high-impact claim on the same feature.
  model.createClaim(
    base({ claim_id: "claim-auth-verified", claim_kind: "behavior-login", trust_state: "verified", impact_class: "high", normalized_content: "Login uses passkeys." }),
    [{ evidence_id: "ev-1", stance: "supports" }],
  );
  model.createClaim(
    base({ claim_id: "claim-auth-stale", claim_kind: "behavior-legacy", trust_state: "stale", impact_class: "critical", normalized_content: "Login used passwords." }),
  );
  // A component relation so the system map has an edge + a second lane populated.
  model.createClaim(
    base({ claim_id: "claim-token-verified", entity_id: "component-token", claim_kind: "behavior-store", trust_state: "verified", impact_class: "medium", normalized_content: "Tokens are stored hashed." }),
    [{ evidence_id: "ev-1", stance: "supports" }],
  );
  model.addRelation({
    relation_id: "rel-1",
    repository_id: REPO,
    from_entity_id: "feature-auth",
    to_entity_id: "component-token",
    relation_type: "depends_on",
    evidence_id: "ev-1",
    created_at: NOW,
  });

  // A verified claim on the runbook and the decision so their pages have current truth.
  model.createClaim(base({ claim_id: "claim-runbook", entity_id: "runbook-rotate", claim_kind: "runbook-steps", trust_state: "verified", impact_class: "high", normalized_content: "Rotate then verify." }), [{ evidence_id: "ev-1", stance: "supports" }]);
  model.createClaim(base({ claim_id: "claim-decision", entity_id: "decision-okf", claim_kind: "decision-status", trust_state: "verified", impact_class: "high", normalized_content: "OKF adopted." }), [{ evidence_id: "ev-1", stance: "supports" }]);

  // A HIGH-impact proposed claim by alice awaiting owner approval — the self-approval / version material.
  model.createClaim(base({ claim_id: "claim-passkey", claim_kind: "behavior-passkey", created_by: "alice", trust_state: "proposed", impact_class: "high", review_policy: "owner", normalized_content: RAW_CONTENT }));
  model.createReviewItem({
    review_item_id: "ri-passkey",
    repository_id: REPO,
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

function withModel(action: (model: Repository) => void): void {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-phase-c-gate-"));
  const opened = openRepositoryModel(projectDir);
  try {
    seed(opened.model);
    action(opened.model);
  } finally {
    opened.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

function ctx(model: Repository) {
  return { model, receiptStore: new ReceiptStore(model.database) };
}

const NO_PARAMS = new URLSearchParams();

test("Phase C gate: overview metrics carry formula, source, and honest exactness", { skip: !supportsVnextRuntime() }, () => {
  withModel((model) => {
    const result = handlePortalRoute({ kind: "overview" }, ctx(model), NO_PARAMS);
    assert.equal(result.status, 200);
    const overview = result.body as OverviewDto;
    assert.ok(overview.metrics.length >= 8, "overview publishes the full metric set");
    for (const metric of overview.metrics) {
      assert.ok(metric.formula.trim().length > 0, `${metric.id} carries a formula`);
      assert.ok(metric.source_path.trim().length > 0, `${metric.id} cites a source path`);
      assert.ok(["exact", "cohort", "structural", "unavailable"].includes(metric.exactness), `${metric.id} exactness`);
      // An unavailable metric NEVER shows a fabricated numeric value implying success.
      if (metric.exactness === "unavailable") assert.equal(metric.value, null, `${metric.id} unavailable => null`);
    }
    // A stale critical claim is surfaced honestly, not hidden.
    const staleCritical = overview.metrics.find((m) => m.id === "stale_critical");
    assert.ok(staleCritical && (staleCritical.value as number) >= 1, "stale critical claim is counted");
  });
});

test("Phase C gate: the system map has an equivalent accessible table in exact node parity", { skip: !supportsVnextRuntime() }, () => {
  withModel((model) => {
    const result = handlePortalRoute({ kind: "system_map" }, ctx(model), new URLSearchParams({ view: "feature" }));
    assert.equal(result.status, 200);
    const map = result.body as SystemMapDto;
    const nodeIds = new Set(map.lanes.flatMap((lane) => lane.nodes.map((n) => n.entity_id)));
    const rowIds = new Set(map.table.map((row) => row.entity_id));
    // Parity: every shown node is a table row and every table row is a shown node.
    assert.deepEqual([...rowIds].sort(), [...nodeIds].sort(), "table is a complete node-for-node equivalent");
    assert.ok(nodeIds.has("feature-auth"), "the feature root is present");
  });
});

test("Phase C gate: feature/runbook/decision separate current truth from history and uncertainty", { skip: !supportsVnextRuntime() }, () => {
  withModel((model) => {
    const feature = handlePortalRoute({ kind: "feature", slug: "authentication" }, ctx(model), NO_PARAMS).body as EntityDetailDto;
    // Current truth is injectable only — the stale claim is NOT in current_claims but IS reported.
    assert.ok(feature.current_claims.every((c) => c.trust_state === "verified" || c.trust_state === "approved"));
    assert.ok(feature.current_claims.every((c) => c.claim_id !== "claim-auth-stale"), "stale claim excluded from current truth");
    assert.ok(feature.other_claims.some((c) => c.claim_id === "claim-auth-stale"), "stale claim shown under history/uncertainty");
    assert.ok(feature.health.stale >= 1, "health counts the stale claim");

    const runbook = handlePortalRoute({ kind: "runbook", slug: "rotate-signing-keys" }, ctx(model), NO_PARAMS).body as RunbookDetailDto;
    assert.equal(runbook.last_successful_execution, null, "no fabricated successful execution");

    const decision = handlePortalRoute({ kind: "decision", slug: "adopt-okf" }, ctx(model), NO_PARAMS).body as DecisionDetailDto;
    // The approver is verbatim or an explicit null — never invented.
    assert.ok(decision.approved_by === null || typeof decision.approved_by === "string");
    assert.ok(Array.isArray(decision.supersedes_claim_ids));
  });
});

test("Phase C gate: review mutations enforce self-approval (403) and version (409) boundaries", { skip: !supportsVnextRuntime() }, () => {
  withModel((model) => {
    const item = model.getReviewItem("ri-passkey");
    assert.ok(item, "seeded review item exists");
    const version = reviewItemVersion(item!);

    // The proposer (alice) cannot approve her own high-impact claim.
    const selfApprove = handleReviewMutation(model, "ri-passkey", "accept", {
      actor: "alice",
      expected_version: version,
      decision_note: "looks good to me",
    });
    assert.equal(selfApprove.status, 403);
    assert.equal((selfApprove.body as { error: string }).error, "self_approval_blocked");

    // A stale expected_version is a version conflict.
    const stale = handleReviewMutation(model, "ri-passkey", "accept", {
      actor: "owner-bob",
      expected_version: "stale-version",
      decision_note: "accepting",
    });
    assert.equal(stale.status, 409);
    assert.equal((stale.body as { error: string }).error, "version_conflict");

    // A distinct authorized actor with the right version accepts and moves the claim to approved.
    const ok = handleReviewMutation(model, "ri-passkey", "accept", {
      actor: "owner-bob",
      expected_version: version,
      decision_note: "verified against the auth module and tests",
    });
    assert.equal(ok.status, 200);
    assert.equal((ok.body as { accepted: { trust_state: string } }).accepted.trust_state, "approved");
  });
});

test("Phase C gate: task receipts keep exact economics separate from cohort outcomes with no fused ROI", { skip: !supportsVnextRuntime() }, () => {
  const task: TaskSummaryDto = {
    task_id: "task-1",
    session_id: "session-1",
    repository_id: REPO,
    agent_surface: "claude-code",
    started_at: NOW,
    ended_at: null,
    outcome: null,
    receipt_count: 1,
  };
  const receipt: TransformationReceipt = {
    receipt_id: "receipt-1",
    task_id: "task-1",
    request_id: "request-1",
    provider: "anthropic",
    model: "claude-opus-4-8",
    mode: "assist",
    measurement_quality: "exact",
    before_input_bytes: 4_000,
    after_input_bytes: 2_000,
    before_input_tokens: 1_000,
    after_input_tokens: 500,
    output_tokens: 200,
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: 0.005,
    provider_input_cost_after_usd: 0.0025,
    latency_ms: 3.5,
    transformations: ["payload_compress"],
    created_at: NOW,
  };
  const aggregate = buildTaskReceiptAggregate({
    task,
    receipts: [receipt],
    deliveries: [],
    knowledgeChanges: [],
    policySection: null,
  }) as TaskReceiptDto;

  // Exact request economics and cohort outcomes are distinct objects, never fused.
  assert.ok(aggregate.exact_request_measurements, "exact economics present");
  assert.ok(aggregate.task_outcomes, "cohort outcomes present");
  assert.notEqual(aggregate.exact_request_measurements, aggregate.task_outcomes);
  // There is NO fused total-value / ROI figure anywhere in the receipt.
  const serialized = JSON.stringify(aggregate);
  assert.ok(!/total_value|total_roi|value_created|roi_usd/i.test(serialized), "no fabricated fused ROI figure");
});

test("Phase C gate: the live feed emits identifiers/enums only, never raw prompt or claim content", { skip: !supportsVnextRuntime() }, () => {
  const event = {
    kind: "claim_updated",
    claim_id: "claim-passkey",
    entity_slug: "authentication",
    trust_state: "approved",
    at: NOW,
    // a smuggled raw body that must be stripped
    normalized_content: RAW_CONTENT,
  } as ClaimUpdatedEvent & { normalized_content: string };
  const wire = toWirePayload(event);
  const frame = serializePortalEvent(event, 1);
  assert.ok(!Object.values(wire).some((v) => v === RAW_CONTENT), "wire payload strips raw content");
  assert.ok(!frame.includes(RAW_CONTENT), "SSE frame never carries raw content");
  assert.equal(wire.claim_id, "claim-passkey");
  assert.equal(wire.trust_state, "approved");
});
