import { test } from "node:test";
import assert from "node:assert/strict";

import {
  policyReport,
  buildMinimalChangeReport,
  policyReportReceiptSection,
} from "./report.js";
import type { FindingKind, FindingSeverity, MinimalChangeFinding } from "./types.js";
import type { EvidenceRecord } from "../repo-model/types.js";
import type { SuppressionRecord } from "./post-diff.js";

function fixtureEvidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    evidence_id: "diff:package.json",
    repository_id: "repo",
    source_type: "git",
    source_uri: "package.json",
    source_fingerprint: "diff:package.json",
    commit: null,
    path: "package.json",
    symbol: null,
    line_start: null,
    line_end: null,
    verification_method: "diff_parse",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: "diff",
    ...overrides,
  };
}

function fixtureFinding(overrides: Partial<MinimalChangeFinding> = {}): MinimalChangeFinding {
  const kind: FindingKind = overrides.kind ?? "new_dependency";
  const severity: FindingSeverity = overrides.severity ?? "warning";
  return {
    finding_id: overrides.finding_id ?? `mc:${kind}`,
    kind,
    title: overrides.title ?? "finding",
    explanation: overrides.explanation ?? "explanation",
    evidence: overrides.evidence ?? [fixtureEvidence()],
    deterministic: overrides.deterministic ?? true,
    severity,
    suggested_files: overrides.suggested_files ?? ["package.json"],
  };
}

// ---- Task 10 Step 1: the two plan-pinned enforcement tests ----------------------------------------

test("advisory findings never fail PR check", () => {
  const report = policyReport([fixtureFinding({ deterministic: true, severity: "warning" })], { mode: "advisory" });
  assert.equal(report.ok, true);
});

test("enforced mode blocks only selected deterministic rules", () => {
  const report = policyReport(
    [
      fixtureFinding({ kind: "new_dependency", deterministic: true, severity: "blocking" }),
      fixtureFinding({ kind: "duplicate_symbol", deterministic: false, severity: "warning" }),
    ],
    { mode: "enforced", enforced_rules: ["new_dependency"] },
  );
  assert.equal(report.ok, false);
  assert.deepEqual(report.blocking.map((item) => item.kind), ["new_dependency"]);
});

// ---- Additional honesty coverage ------------------------------------------------------------------

test("advisory mode never blocks even a deterministic blocking finding", () => {
  const report = policyReport([fixtureFinding({ deterministic: true, severity: "blocking" })], { mode: "advisory" });
  assert.equal(report.ok, true);
  assert.equal(report.blocking.length, 0);
  // A deterministic blocking finding still surfaces — as an advisory warning, not a hard gate.
  assert.equal(report.warnings.length, 1);
});

test("pr_warning mode surfaces findings but never fails the check", () => {
  const report = policyReport([fixtureFinding({ deterministic: true, severity: "blocking" })], { mode: "pr_warning" });
  assert.equal(report.ok, true);
  assert.equal(report.blocking.length, 0);
});

test("off mode produces an empty, passing report", () => {
  const report = policyReport([fixtureFinding({ severity: "blocking", deterministic: true })], { mode: "off" });
  assert.equal(report.ok, true);
  assert.equal(report.blocking.length, 0);
});

test("enforced mode cannot block a non-deterministic finding even if selected", () => {
  // A model-opinion finding marked blocking is downgraded to warning by the honesty rule, and can never
  // enter the blocking set — not even when its kind is explicitly listed in enforced_rules.
  const report = policyReport(
    [fixtureFinding({ kind: "duplicate_symbol", deterministic: false, severity: "blocking" })],
    { mode: "enforced", enforced_rules: ["duplicate_symbol"] },
  );
  assert.equal(report.ok, true);
  assert.equal(report.blocking.length, 0);
});

test("enforced mode does not block a deterministic rule that is not selected", () => {
  const report = policyReport(
    [fixtureFinding({ kind: "public_contract", deterministic: true, severity: "blocking" })],
    { mode: "enforced", enforced_rules: ["new_dependency"] },
  );
  assert.equal(report.ok, true);
});

test("receipt section reports deterministic/severity/decision and never fabricates lines-avoided", () => {
  const report = policyReport([fixtureFinding({ kind: "new_dependency", deterministic: true })], { mode: "advisory" });
  const section = policyReportReceiptSection(report);
  assert.equal(section.mode, "advisory");
  assert.equal(section.ok, true);
  assert.equal(section.findings[0].kind, "new_dependency");
  assert.equal(section.findings[0].deterministic, true);
  // Honesty: whether the finding actually changed agent behavior is unknown without a controlled
  // comparison, so it is reported as null — never a fabricated boolean or a "lines avoided" count.
  assert.equal(section.findings[0].changed_behavior, null);
  assert.equal(Object.prototype.hasOwnProperty.call(section, "lines_avoided"), false);
});

// ---- buildMinimalChangeReport: end-to-end over a real diff + suppressions --------------------------

const DEP_DIFF = [
  "diff --git a/package.json b/package.json",
  "index 111..222 100644",
  "--- a/package.json",
  "+++ b/package.json",
  "@@ -1,3 +1,4 @@",
  ' {',
  '   "dependencies": {',
  '+    "left-pad": "^1.0.0",',
  '     "existing": "^2.0.0"',
  "   }",
].join("\n");

test("buildMinimalChangeReport parses a real diff and emits a deterministic new_dependency finding", () => {
  const built = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
  });
  assert.equal(built.task_id, "t1");
  const dep = built.findings.find((item) => item.kind === "new_dependency");
  assert.ok(dep, "expected a new_dependency finding");
  assert.equal(dep?.deterministic, true);
  assert.match(dep?.evidence[0]?.source_uri ?? "", /package\.json/);
  assert.equal(built.ok, true); // advisory never fails
  // Deterministic: byte-identical across runs.
  const again = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
  });
  assert.deepEqual(built.findings, again.findings);
});

test("buildMinimalChangeReport honors an unexpired matching suppression", () => {
  const first = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
  });
  const dep = first.findings.find((item) => item.kind === "new_dependency");
  assert.ok(dep);
  const suppression: SuppressionRecord = {
    finding_fingerprint: first.fingerprints[dep!.finding_id],
    actor: "kushal",
    reason: "intentional new dependency",
    commit: "abc123",
    expires_at: "2999-01-01T00:00:00.000Z",
  };
  const suppressed = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    suppressions: [suppression],
    now: "2026-07-18T00:00:00.000Z",
  });
  assert.equal(suppressed.findings.some((item) => item.kind === "new_dependency"), false);
  assert.equal(suppressed.suppressed.some((item) => item.finding.kind === "new_dependency"), true);
});

test("buildMinimalChangeReport with enforced new_dependency fails the report", () => {
  const built = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: true, mode: "enforced", enforced_rules: ["new_dependency"] },
  });
  assert.equal(built.ok, false);
  assert.deepEqual(built.blocking.map((item) => item.kind), ["new_dependency"]);
});

test("disabled policy yields an empty passing report regardless of diff", () => {
  const built = buildMinimalChangeReport({
    diff_text: DEP_DIFF,
    task: { task_id: "t1", repository_id: "repo", declared_components: [] },
    policy: { enabled: false, mode: "advisory", enforced_rules: [] },
  });
  assert.equal(built.enabled, false);
  assert.equal(built.findings.length, 0);
  assert.equal(built.ok, true);
});
