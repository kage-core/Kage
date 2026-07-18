import { test } from "node:test";
import assert from "node:assert/strict";

import { matchMinimalChangeRoute, minimalChangeForTask } from "./minimal-change.js";

const DEP_DIFF = [
  "diff --git a/package.json b/package.json",
  "--- a/package.json",
  "+++ b/package.json",
  "@@ -2,3 +2,4 @@",
  '   "dependencies": {',
  '     "alpha": "^1.0.0",',
  '+    "left-pad": "^1.3.0",',
  '     "zeta": "^2.0.0"',
].join("\n");

test("matchMinimalChangeRoute matches the task-scoped path and extracts the id", () => {
  assert.deepEqual(matchMinimalChangeRoute("/v2/tasks/task-123/minimal-change"), { taskId: "task-123" });
  assert.equal(matchMinimalChangeRoute("/v2/tasks/task-123/receipts"), null);
  assert.equal(matchMinimalChangeRoute("/v2/health"), null);
  assert.equal(matchMinimalChangeRoute("/v2/tasks//minimal-change"), null);
});

test("minimalChangeForTask returns 404 for an unknown task", () => {
  const result = minimalChangeForTask({
    taskId: "ghost",
    repositoryId: null,
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
  });
  assert.equal(result.status, 404);
  assert.equal(result.error, "unknown_task");
});

test("minimalChangeForTask returns a disabled envelope when the guard is off", () => {
  const result = minimalChangeForTask({
    taskId: "t1",
    repositoryId: "repo",
    policy: { enabled: false, mode: "off", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
  });
  assert.equal(result.status, 200);
  const body = result.body as { enabled: boolean; task_id: string };
  assert.equal(body.enabled, false);
  assert.equal(body.task_id, "t1");
});

test("minimalChangeForTask builds an advisory report from the task's diff", () => {
  const result = minimalChangeForTask({
    taskId: "t1",
    repositoryId: "repo",
    policy: { enabled: true, mode: "advisory", enforced_rules: [] },
    diffText: DEP_DIFF,
    model: null,
    now: "2026-07-18T00:00:00.000Z",
  });
  assert.equal(result.status, 200);
  const body = result.body as { report: { ok: boolean; findings: Array<{ kind: string }> } };
  assert.equal(body.report.ok, true);
  assert.equal(body.report.findings.some((finding) => finding.kind === "new_dependency"), true);
});

test("minimalChangeForTask reports enforced blocking without fabricating impact", () => {
  const result = minimalChangeForTask({
    taskId: "t1",
    repositoryId: "repo",
    policy: { enabled: true, mode: "enforced", enforced_rules: ["new_dependency"] },
    diffText: DEP_DIFF,
    model: null,
    now: "2026-07-18T00:00:00.000Z",
  });
  assert.equal(result.status, 200);
  const body = result.body as { report: { ok: boolean; receipt_section: Record<string, unknown> } };
  assert.equal(body.report.ok, false);
  // Honesty: the receipt section never carries a fabricated "lines avoided" figure.
  assert.equal(Object.prototype.hasOwnProperty.call(body.report.receipt_section, "lines_avoided"), false);
});
