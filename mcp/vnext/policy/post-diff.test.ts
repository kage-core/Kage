import test from "node:test";
import assert from "node:assert/strict";

import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import type { EntityKind, EvidenceRecord, TrustState } from "../repo-model/types.js";
import { normalizeFinding, type MinimalChangeFinding } from "./types.js";
import { parseUnifiedDiff } from "./diff-parser.js";
import {
  evaluateDiff,
  fingerprintFinding,
  applySuppressions,
  DEFAULT_POST_DIFF_POLICY,
  type PostDiffTask,
  type SuppressionRecord,
} from "./post-diff.js";

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repository:local";

// ---- repository-model fixtures (mirrors preflight.test conventions) -------------------------------

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function emptyModel(): Repository {
  return new Repository(migratedDatabase());
}

let counter = 0;

function entity(model: Repository, kind: EntityKind, name: string, slug: string): string {
  const created = model.upsertEntity({
    entity_id: `entity:${slug}`,
    repository_id: REPO,
    kind,
    canonical_name: name,
    slug,
    summary: `${name} component`,
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  return created.entity_id;
}

function evidence(model: Repository, path: string, symbol: string): EvidenceRecord {
  counter += 1;
  return model.addEvidence({
    evidence_id: `ev-${counter}`,
    repository_id: REPO,
    source_type: "source",
    source_uri: `fact:${path}#${symbol}`,
    source_fingerprint: `fp-${counter}`,
    commit: "abc123",
    path,
    symbol,
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
  });
}

function claim(model: Repository, entityId: string, content: string, trustState: TrustState, ev: EvidenceRecord): void {
  counter += 1;
  model.createClaim(
    {
      claim_id: `claim-${counter}`,
      entity_id: entityId,
      claim_kind: "capability",
      normalized_content: content,
      trust_state: trustState === "verified" ? "verified" : "proposed",
      confidence: trustState === "verified" ? 1 : 0.5,
      impact_class: "medium",
      valid_from_commit: null,
      valid_to_commit: null,
      supersedes_claim_id: null,
      review_policy: "automatic",
      created_by: "compiler",
      created_at: NOW,
      updated_at: NOW,
    },
    [{ evidence_id: ev.evidence_id, stance: "supports" }],
  );
}

// A model with two components, each anchored to a real source path via a verified claim.
function twoComponentModel(): Repository {
  const model = emptyModel();
  const auth = entity(model, "component", "Auth", "auth");
  claim(model, auth, "login authenticates a user", "verified", evidence(model, "src/auth/login.ts", "login"));
  const billing = entity(model, "component", "Billing", "billing");
  claim(model, billing, "charge bills a customer", "verified", evidence(model, "src/billing/charge.ts", "charge"));
  return model;
}

function task(declared: string[]): PostDiffTask {
  return { task_id: "task-1", repository_id: REPO, declared_components: declared };
}

// ---- diff fixtures -------------------------------------------------------------------------------

const DIFF_ADD_DEPENDENCY = `diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -12,6 +12,7 @@
   "dependencies": {
     "react": "^18.0.0",
+    "left-pad": "^1.3.0",
     "lodash": "^4.17.0"
   }
`;

const DIFF_TWO_COMPONENTS = `diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,1 +1,2 @@
 export function login() {}
+// tweak auth
diff --git a/src/billing/charge.ts b/src/billing/charge.ts
--- a/src/billing/charge.ts
+++ b/src/billing/charge.ts
@@ -1,1 +1,2 @@
 export function charge() {}
+// tweak billing
`;

const DIFF_DUPLICATE_SYMBOL = `diff --git a/src/other/helpers.ts b/src/other/helpers.ts
--- a/src/other/helpers.ts
+++ b/src/other/helpers.ts
@@ -0,0 +1,3 @@
+export function login() {
+  return true;
+}
`;

const DIFF_BINARY = `diff --git a/logo.png b/logo.png
index 1111111..2222222 100644
Binary files a/logo.png and b/logo.png differ
`;

// ---- diff parser ---------------------------------------------------------------------------------

test("parseUnifiedDiff extracts paths, change types, and added/removed lines", () => {
  const parsed = parseUnifiedDiff(DIFF_ADD_DEPENDENCY);
  assert.equal(parsed.files.length, 1);
  const file = parsed.files[0];
  assert.equal(file.path, "package.json");
  assert.equal(file.change_type, "modified");
  assert.equal(file.is_binary, false);
  assert.ok(file.added_lines.some((line) => line.includes("left-pad")));
});

test("parseUnifiedDiff flags binary files and never fabricates hunks", () => {
  const parsed = parseUnifiedDiff(DIFF_BINARY);
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].is_binary, true);
  assert.equal(parsed.files[0].hunks.length, 0);
  assert.equal(parsed.files[0].added_lines.length, 0);
});

test("parseUnifiedDiff is deterministic and fails open on arbitrary bytes", () => {
  const junk = "not a diff at all  \n@@ garbage @@\n++++\n--- \nplain odd text here\n";
  const first = parseUnifiedDiff(junk);
  const second = parseUnifiedDiff(junk);
  assert.deepEqual(first, second);
});

// ---- new_dependency ------------------------------------------------------------------------------

test("new dependency finding cites the package manifest and requires justification", () => {
  const findings = evaluateDiff({
    task: task([]),
    diff: parseUnifiedDiff(DIFF_ADD_DEPENDENCY),
    policy: DEFAULT_POST_DIFF_POLICY,
  });
  const finding = findings.find((item) => item.kind === "new_dependency");
  assert.ok(finding, "expected a new_dependency finding");
  assert.equal(finding.deterministic, true);
  assert.equal(finding.severity, "warning");
  assert.match(finding.evidence[0]?.source_uri ?? "", /package\.json/);
  assert.ok(finding.evidence[0]?.symbol === "left-pad");
});

// ---- scope_expansion -----------------------------------------------------------------------------

test("unrelated changed component creates a scope warning", () => {
  const findings = evaluateDiff({
    task: task(["auth"]),
    diff: parseUnifiedDiff(DIFF_TWO_COMPONENTS),
    model: twoComponentModel(),
    policy: DEFAULT_POST_DIFF_POLICY,
  });
  const scope = findings.find((item) => item.kind === "scope_expansion");
  assert.ok(scope, "expected a scope_expansion finding");
  assert.equal(scope.deterministic, true);
  // The finding cites the out-of-scope component's real evidence, not an opinion.
  assert.ok(scope.evidence.some((record) => record.path === "src/billing/charge.ts"));
});

test("no scope warning when every change lands in a declared component", () => {
  const findings = evaluateDiff({
    task: task(["auth", "billing"]),
    diff: parseUnifiedDiff(DIFF_TWO_COMPONENTS),
    model: twoComponentModel(),
    policy: DEFAULT_POST_DIFF_POLICY,
  });
  assert.equal(findings.some((item) => item.kind === "scope_expansion"), false);
});

// ---- duplicate_symbol ----------------------------------------------------------------------------

test("a new exported symbol that duplicates a model symbol is flagged", () => {
  const findings = evaluateDiff({
    task: task([]),
    diff: parseUnifiedDiff(DIFF_DUPLICATE_SYMBOL),
    model: twoComponentModel(),
    policy: DEFAULT_POST_DIFF_POLICY,
  });
  const dup = findings.find((item) => item.kind === "duplicate_symbol");
  assert.ok(dup, "expected duplicate_symbol finding for re-declared login()");
  assert.equal(dup.deterministic, true);
  assert.ok(dup.evidence.some((record) => record.symbol === "login" && record.path === "src/auth/login.ts"));
});

test("a genuinely new exported symbol is not flagged as a duplicate", () => {
  const diff = parseUnifiedDiff(`diff --git a/src/other/helpers.ts b/src/other/helpers.ts
--- a/src/other/helpers.ts
+++ b/src/other/helpers.ts
@@ -0,0 +1,1 @@
+export function brandNewUniqueThing() {}
`);
  const findings = evaluateDiff({ task: task([]), diff, model: twoComponentModel(), policy: DEFAULT_POST_DIFF_POLICY });
  assert.equal(findings.some((item) => item.kind === "duplicate_symbol"), false);
});

// ---- public_contract & missing_verification ------------------------------------------------------

test("changing a public contract file is flagged deterministically", () => {
  const diff = parseUnifiedDiff(`diff --git a/api/openapi.yaml b/api/openapi.yaml
--- a/api/openapi.yaml
+++ b/api/openapi.yaml
@@ -1,1 +1,2 @@
 openapi: 3.0.0
+  newField: true
`);
  const findings = evaluateDiff({ task: task([]), diff, policy: DEFAULT_POST_DIFF_POLICY });
  const contract = findings.find((item) => item.kind === "public_contract");
  assert.ok(contract, "expected public_contract finding");
  assert.equal(contract.deterministic, true);
});

test("source change without any test file yields missing_verification; a test file clears it", () => {
  const without = parseUnifiedDiff(`diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,1 +1,2 @@
 export function login() {}
+// changed
`);
  const withoutFindings = evaluateDiff({ task: task([]), diff: without, policy: DEFAULT_POST_DIFF_POLICY });
  assert.ok(withoutFindings.some((item) => item.kind === "missing_verification"));

  const withTest = parseUnifiedDiff(`diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,1 +1,2 @@
 export function login() {}
+// changed
diff --git a/src/auth/login.test.ts b/src/auth/login.test.ts
--- a/src/auth/login.test.ts
+++ b/src/auth/login.test.ts
@@ -1,1 +1,2 @@
 test("login", () => {});
+test("login again", () => {});
`);
  const withTestFindings = evaluateDiff({ task: task([]), diff: withTest, policy: DEFAULT_POST_DIFF_POLICY });
  assert.equal(withTestFindings.some((item) => item.kind === "missing_verification"), false);
});

// ---- honesty rule --------------------------------------------------------------------------------

test("a model-only (non-deterministic) finding cannot be blocking", () => {
  const finding = normalizeFinding({
    finding_id: "f1",
    kind: "duplicate_symbol",
    title: "Possible duplicate",
    explanation: "A model thinks this looks similar.",
    evidence: [],
    deterministic: false,
    severity: "blocking",
    suggested_files: [],
  });
  assert.equal(finding.severity, "warning");
});

test("every post-diff finding is advisory (never blocking) and passes through normalizeFinding", () => {
  const findings = evaluateDiff({
    task: task(["auth"]),
    diff: parseUnifiedDiff(DIFF_TWO_COMPONENTS + DIFF_ADD_DEPENDENCY),
    model: twoComponentModel(),
    policy: DEFAULT_POST_DIFF_POLICY,
  });
  assert.ok(findings.length > 0);
  assert.equal(findings.every((item) => item.severity !== "blocking"), true);
});

// ---- determinism ---------------------------------------------------------------------------------

test("evaluateDiff is deterministic: identical inputs yield identical findings", () => {
  const model = twoComponentModel();
  const build = () =>
    evaluateDiff({
      task: task(["auth"]),
      diff: parseUnifiedDiff(DIFF_TWO_COMPONENTS + DIFF_ADD_DEPENDENCY),
      model,
      policy: DEFAULT_POST_DIFF_POLICY,
    });
  assert.deepEqual(build(), build());
});

// ---- suppression records -------------------------------------------------------------------------

function suppression(fp: string, expiresAt: string): SuppressionRecord {
  return {
    finding_fingerprint: fp,
    actor: "kushal",
    reason: "left-pad is an approved internal fork",
    commit: "deadbeef",
    expires_at: expiresAt,
  };
}

test("a fingerprint excludes line numbers so a moved finding stays suppressed", () => {
  const findings = evaluateDiff({ task: task([]), diff: parseUnifiedDiff(DIFF_ADD_DEPENDENCY), policy: DEFAULT_POST_DIFF_POLICY });
  const dep = findings.find((item) => item.kind === "new_dependency")!;
  const fp1 = fingerprintFinding(dep);
  // The same finding with different suggested line context yields the same fingerprint.
  const fp2 = fingerprintFinding({ ...dep, title: dep.title, explanation: "moved to a different line" });
  assert.equal(fp1, fp2);
});

test("an active, unexpired suppression removes its finding; an expired one does not", () => {
  const findings = evaluateDiff({ task: task([]), diff: parseUnifiedDiff(DIFF_ADD_DEPENDENCY), policy: DEFAULT_POST_DIFF_POLICY });
  const dep = findings.find((item) => item.kind === "new_dependency")!;
  const fp = fingerprintFinding(dep);

  const active = applySuppressions(findings, [suppression(fp, "2999-01-01T00:00:00.000Z")], NOW);
  assert.equal(active.active.some((item) => item.kind === "new_dependency"), false);
  assert.equal(active.suppressed.length, 1);

  const expired = applySuppressions(findings, [suppression(fp, "2000-01-01T00:00:00.000Z")], NOW);
  assert.equal(expired.active.some((item) => item.kind === "new_dependency"), true);
  assert.equal(expired.suppressed.length, 0);
});

test("a suppression cannot match a materially changed finding fingerprint", () => {
  const leftPad = evaluateDiff({ task: task([]), diff: parseUnifiedDiff(DIFF_ADD_DEPENDENCY), policy: DEFAULT_POST_DIFF_POLICY });
  const dep = leftPad.find((item) => item.kind === "new_dependency")!;
  const fp = fingerprintFinding(dep);

  const otherDiff = parseUnifiedDiff(`diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -12,6 +12,7 @@
   "dependencies": {
+    "right-pad": "^2.0.0",
   }
`);
  const other = evaluateDiff({ task: task([]), diff: otherDiff, policy: DEFAULT_POST_DIFF_POLICY });
  // Suppressing left-pad must not silence a new right-pad dependency.
  const result = applySuppressions(other, [suppression(fp, "2999-01-01T00:00:00.000Z")], NOW);
  assert.equal(result.active.some((item) => item.kind === "new_dependency"), true);
});
