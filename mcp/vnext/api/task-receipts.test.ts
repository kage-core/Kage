import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTaskReceiptsBody } from "./task-receipts.js";
import { buildMinimalChangeReport } from "../policy/report.js";
import type { TransformationReceipt } from "../protocol/index.js";
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
