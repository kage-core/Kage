import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTaskReceiptAggregate, buildTaskReceiptsBody } from "./task-receipts.js";
import { buildMinimalChangeReport } from "../policy/report.js";
import type { TransformationReceipt } from "../protocol/index.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import type { PolicyReceiptSection } from "../policy/report.js";
import type { KnowledgeChangeDto, TaskSummaryDto } from "./types.js";
import type { SuppressionRecord } from "../policy/post-diff.js";

function fixtureReceipt(): TransformationReceipt {
  return {
    receipt_id: "receipt-1",
    task_id: "task-1",
    request_id: "request-1",
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "audit",
    measurement_quality: "exact",
    before_input_bytes: 2_000,
    after_input_bytes: 2_000,
    before_input_tokens: 500,
    after_input_tokens: 500,
    output_tokens: 100,
    kage_processing_cost_usd: 0,
    provider_input_cost_before_usd: 0.0015,
    provider_input_cost_after_usd: 0.0015,
    latency_ms: 2.5,
    transformations: [],
    created_at: "2026-07-13T00:00:01.000Z",
  };
}

const DEP_DIFF = [
  "diff --git a/package.json b/package.json",
  "index 111..222 100644",
  "--- a/package.json",
  "+++ b/package.json",
  "@@ -1,3 +1,4 @@",
  " {",
  '   "dependencies": {',
  '+    "left-pad": "^1.0.0",',
  '     "existing": "^2.0.0"',
  "   }",
].join("\n");

// ---- Task 10 Step 4: minimal-change findings must reach the real task-receipts surface ------------

test("disabled guard leaves the receipts body byte-identical to the receipts-only shape", () => {
  const body = buildTaskReceiptsBody({
    taskId: "task-1",
    receipts: [fixtureReceipt()],
    repositoryId: "repo",
    policy: { enabled: false, mode: "off", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
  });
  // No minimal_change section is fabricated for a repo that has not opted in — the surface is exactly
  // the transformation receipts, unchanged. (Backward compatibility for existing receipt consumers.)
  assert.deepEqual(body, { receipts: [fixtureReceipt()] });
  assert.equal(Object.prototype.hasOwnProperty.call(body, "minimal_change"), false);
});

test("an unknown task gets no minimal-change section even when the guard is enabled", () => {
  const body = buildTaskReceiptsBody({
    taskId: "ghost",
    receipts: [],
    repositoryId: null,
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
  });
  assert.deepEqual(body, { receipts: [] });
});

test("enabled guard attaches deterministic findings, severity, and decision to task receipts", () => {
  const body = buildTaskReceiptsBody({
    taskId: "task-1",
    receipts: [fixtureReceipt()],
    repositoryId: "repo",
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
    now: "2026-07-18T00:00:00.000Z",
  });
  // The transformation receipts are still present, untouched.
  assert.deepEqual(body.receipts, [fixtureReceipt()]);
  const section = body.minimal_change;
  assert.ok(section, "expected a minimal_change section on the receipts body");
  assert.equal(section!.mode, "advisory");
  assert.equal(section!.ok, true);
  const dep = section!.findings.find((finding) => finding.kind === "new_dependency");
  assert.ok(dep, "expected the deterministic new_dependency finding to reach task receipts");
  assert.equal(dep!.deterministic, true);
  assert.equal(dep!.severity, "warning");
  // Honesty: whether the finding changed agent behavior is unknown without a controlled comparison,
  // so it is reported as null — never a fabricated boolean, and never a "lines avoided" figure.
  assert.equal(dep!.changed_behavior, null);
  assert.equal(Object.prototype.hasOwnProperty.call(section, "lines_avoided"), false);
});

test("a matching unexpired suppression surfaces as a decision on task receipts", () => {
  // Learn the finding fingerprint the operator would suppress against, straight from the report builder
  // the receipts surface composes over — no new field is exposed on the body just to author this.
  const preview = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "task-1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    now: "2026-07-18T00:00:00.000Z",
  });
  const dep = preview.findings.find((finding) => finding.kind === "new_dependency");
  assert.ok(dep);

  const suppression: SuppressionRecord = {
    finding_fingerprint: preview.fingerprints[dep!.finding_id],
    actor: "kushal",
    reason: "intentional new dependency",
    commit: "abc123",
    expires_at: "2999-01-01T00:00:00.000Z",
  };
  const body = buildTaskReceiptsBody({
    taskId: "task-1",
    receipts: [],
    repositoryId: "repo",
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
    suppressions: [suppression],
    now: "2026-07-18T00:00:00.000Z",
  });
  const section = body.minimal_change!;
  // The active findings no longer carry the suppressed one; the decision is recorded under `suppressed`.
  assert.equal(section.findings.some((finding) => finding.kind === "new_dependency"), false);
  assert.equal(section.suppressed.some((item) => item.kind === "new_dependency"), true);
  const decision = section.suppressed.find((item) => item.kind === "new_dependency");
  assert.equal(decision!.actor, "kushal");
  assert.equal(decision!.reason, "intentional new dependency");
});

// ---- Task 8: the aggregate task receipt (exact economics vs cohort outcomes) ---------------------

function fixtureTaskSummary(overrides: Partial<TaskSummaryDto> = {}): TaskSummaryDto {
  return {
    task_id: "task-1",
    session_id: "session-1",
    repository_id: "repo",
    agent_surface: "proxy",
    started_at: "2026-07-13T00:00:00.000Z",
    ended_at: "2026-07-13T00:05:00.000Z",
    outcome: "completed",
    receipt_count: 0,
    ...overrides,
  };
}

// A receipt measured on BOTH sides: an exact net input cost and token delta can be computed.
function bothSidedReceipt(overrides: Partial<TransformationReceipt> = {}): TransformationReceipt {
  return {
    receipt_id: "receipt-both",
    task_id: "task-1",
    request_id: "req-both",
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "assist",
    measurement_quality: "exact",
    before_input_bytes: 4_000,
    after_input_bytes: 2_400,
    before_input_tokens: 500,
    after_input_tokens: 300,
    output_tokens: 100,
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: 0.0010,
    provider_input_cost_after_usd: 0.0006,
    latency_ms: 3,
    transformations: ["payload_compress"],
    created_at: "2026-07-13T00:00:01.000Z",
    ...overrides,
  };
}

// A receipt priced on ONE side only: no honest net cost/token delta exists for it.
function oneSidedReceipt(overrides: Partial<TransformationReceipt> = {}): TransformationReceipt {
  return {
    receipt_id: "receipt-one",
    task_id: "task-1",
    request_id: "req-one",
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "audit",
    measurement_quality: "partial",
    before_input_bytes: 3_000,
    after_input_bytes: 3_000,
    before_input_tokens: 400,
    after_input_tokens: null,
    output_tokens: null,
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: 0.0010,
    provider_input_cost_after_usd: null,
    latency_ms: 5,
    transformations: [],
    created_at: "2026-07-13T00:00:02.000Z",
    ...overrides,
  };
}

test("aggregate separates exact request economics from cohort outcomes and never fuses them", () => {
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    receipts: [bothSidedReceipt(), oneSidedReceipt()],
    deliveries: [],
    knowledgeChanges: [],
    policySection: null,
  });

  // Exact economics: net input cost is summed over the BOTH-sided receipt only (−0.0004), never the
  // one-sided one — a one-sided cost is null, not `before − 0`.
  const cost = receipt.exact_request_measurements.metrics.find((m) => m.label === "Net input cost");
  assert.ok(cost, "expected a net input cost metric");
  assert.equal(cost!.exactness, "exact");
  assert.ok(Math.abs((cost!.value as number) - -0.0004) < 1e-9, "cost delta over both-sided receipts only");
  assert.equal(receipt.exact_request_measurements.priced_request_count, 1);
  assert.equal(receipt.exact_request_measurements.total_request_count, 2);

  const tokens = receipt.exact_request_measurements.metrics.find((m) => m.label === "Net input tokens");
  assert.ok(tokens);
  assert.equal(tokens!.value, -200);
  assert.equal(tokens!.exactness, "exact");

  // Outcomes are a SEPARATE object: output tokens + latency percentiles + Kage processing cost.
  const outputP50 = receipt.task_outcomes.metrics.find((m) => m.label.startsWith("Output tokens (p50"));
  assert.ok(outputP50);
  assert.equal(outputP50!.value, 100);
  assert.equal(outputP50!.exactness, "cohort");
  // No exact-economics metric leaked into the outcomes object, and vice versa.
  assert.equal(receipt.task_outcomes.metrics.some((m) => m.label === "Net input cost"), false);

  // Per-request rows stay accessible; the one-sided row reports null, not a fabricated saving.
  const oneRow = receipt.exact_request_measurements.requests.find((r) => r.request_id === "req-one");
  assert.ok(oneRow);
  assert.equal(oneRow!.net_input_cost_usd, null);
  assert.equal(oneRow!.net_input_tokens, null);
});

test("aggregate reports an unmeasured cohort outcome as unavailable, never zero", () => {
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    // Both receipts carry no measured Kage processing cost, so the cohort has nothing to report.
    receipts: [bothSidedReceipt(), oneSidedReceipt()],
    deliveries: [],
    knowledgeChanges: [],
    policySection: null,
  });
  const kage = receipt.task_outcomes.metrics.find((m) => m.label === "Kage processing cost");
  assert.ok(kage);
  assert.equal(kage!.value, null);
  assert.equal(kage!.exactness, "unavailable");
});

test("aggregate over zero receipts reports unavailable economics, not a flattering zero", () => {
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    receipts: [],
    deliveries: [],
    knowledgeChanges: [],
    policySection: null,
  });
  for (const metric of receipt.exact_request_measurements.metrics) {
    assert.equal(metric.value, null);
    assert.equal(metric.exactness, "unavailable");
  }
  assert.equal(receipt.exact_request_measurements.priced_request_count, 0);
});

test("aggregate preserves each knowledge change's evidence link", () => {
  const change: KnowledgeChangeDto = {
    id: "kc-1",
    title: "Authentication now supports passkeys",
    change_kind: "claim_proposed",
    entity_kind: "feature",
    entity_slug: "authentication",
    trust_state: "proposed",
    evidence_href: "/features/authentication",
  };
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    receipts: [],
    deliveries: [],
    knowledgeChanges: [change],
    policySection: null,
  });
  assert.equal(receipt.knowledge_changes.length, 1);
  assert.equal(receipt.knowledge_changes[0].evidence_href, "/features/authentication");
});

test("aggregate projects policy findings with an honest null changed_behavior", () => {
  const section: PolicyReceiptSection = {
    mode: "advisory",
    ok: true,
    findings: [
      {
        finding_id: "f-1",
        kind: "new_dependency",
        title: "New dependency added: left-pad",
        deterministic: true,
        severity: "warning",
        suggested_files: [],
        evidence_uris: ["package.json"],
        changed_behavior: null,
      },
    ],
    suppressed: [],
  };
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    receipts: [],
    deliveries: [],
    knowledgeChanges: [],
    policySection: section,
  });
  assert.equal(receipt.policy_mode, "advisory");
  assert.equal(receipt.policy_findings.length, 1);
  assert.equal(receipt.policy_findings[0].changed_behavior, null);
  assert.equal(receipt.policy_findings[0].deterministic, true);
});

test("aggregate builds a timeline from task start, deliveries, transforms, and task end", () => {
  const delivery: StoredContextDelivery = {
    delivery_id: "d-1",
    capsule_id: "cap-1",
    task_id: "task-1",
    adapter_id: "proxy",
    injection_location: "system",
    delivered_at: "2026-07-13T00:00:00.500Z",
    added_bytes: 1_200,
    added_tokens: 300,
    measurement_quality: "exact",
    status: "delivered",
    reason: "attached",
    composition_latency_ms: 4,
  };
  const receipt = buildTaskReceiptAggregate({
    task: fixtureTaskSummary(),
    receipts: [bothSidedReceipt()],
    deliveries: [delivery],
    knowledgeChanges: [],
    policySection: null,
  });
  const kinds = receipt.timeline.map((event) => event.kind);
  assert.ok(kinds.includes("task_started"));
  assert.ok(kinds.includes("capsule_delivered"));
  assert.ok(kinds.includes("request_transformed"));
  assert.ok(kinds.includes("task_ended"));
  // The timeline is ordered by timestamp, so task start precedes the delivery precedes the transform.
  const atValues = receipt.timeline.map((event) => event.at ?? "");
  const sorted = [...atValues].sort();
  assert.deepEqual(atValues, sorted);
  // One delivery in, one delivery row out — deliveries are accessible, not summarized away.
  assert.equal(receipt.deliveries.length, 1);
  assert.equal(receipt.deliveries[0].status, "delivered");
});
