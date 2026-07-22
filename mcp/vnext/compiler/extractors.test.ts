import test from "node:test";
import assert from "node:assert/strict";

import { KAGE_PROTOCOL_VERSION, type EvidenceEvent, type RepositoryIdentity } from "../protocol/index.js";
import type { EpisodeRecord } from "../repo-model/types.js";
import type { RepositorySnapshot } from "../repo-index/source.js";
import { type ClaimCandidate, type EpisodeContext } from "./candidates.js";
import { admitCandidate } from "./admission.js";
import { extractCommandCandidates } from "./extractors/command.js";
import { extractChangeCandidates } from "./extractors/change.js";
import { extractFailureCandidates } from "./extractors/failure.js";
import { extractRepositoryCandidates } from "./extractors/repository.js";

const REPO = "repo";
const TASK = "task";

function event(
  type: EvidenceEvent["event_type"],
  time: number,
  payload: Record<string, unknown> = {},
): EvidenceEvent {
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    event_id: `${type}-${time}`,
    event_type: type,
    occurred_at: new Date(time * 60_000).toISOString(),
    repository_id: REPO,
    task_id: TASK,
    privacy_class: "local_raw",
    source_fingerprint: `fp-${type}-${time}`,
    payload,
  };
}

function episode(events: EvidenceEvent[], overrides: Partial<EpisodeRecord> = {}): EpisodeContext {
  const record: EpisodeRecord = {
    episode_id: "episode-x",
    repository_id: REPO,
    task_id: TASK,
    episode_type: "runbook_execution",
    title: "t",
    started_at: events[0]?.occurred_at ?? new Date(0).toISOString(),
    ended_at: events[events.length - 1]?.occurred_at ?? new Date(0).toISOString(),
    event_ids: events.map((e) => e.event_id),
    outcome: "success",
    ...overrides,
  };
  return { episode: record, events };
}

// A single successful/failed command execution wrapped in an episode.
function episodeWithCommand(command: string, exitCode: number): EpisodeContext {
  const events = [
    event("tool_result", 10, { command, exit_code: exitCode }),
  ];
  return episode(events, {
    episode_type: exitCode === 0 ? "runbook_execution" : "incident",
    outcome: exitCode === 0 ? "success" : "failure",
  });
}

function identity(): RepositoryIdentity {
  return { repo_id: REPO, root: "/repo", remote: null, branch: "main", commit: "abc", worktree: "/repo" };
}

// A repository snapshot that declares `name` as a package script (grounds a verified runbook).
function repositoryWithScript(name: string): RepositorySnapshot {
  return {
    repository: identity(),
    facts: [
      {
        fact_id: `script:${name}`,
        kind: "script",
        name,
        path: "package.json",
        line: null,
        fingerprint: `fp-script-${name}`,
        confidence: 1,
      },
    ],
    relations: [],
    proposals: [],
  };
}

function candidate(overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    candidate_id: "cand-1",
    repository_id: REPO,
    entity_kind: "runbook",
    entity_name: "npm test",
    claim_kind: "runbook_step",
    content: "Run `npm test` to execute the repository test suite.",
    evidence_ids: ["evidence:event:tool_result-10"],
    proposed_trust_state: "verified",
    impact_class: "medium",
    extraction_method: "deterministic",
    review_policy: "automatic",
    ...overrides,
  };
}

// ---- Plan Step 1 tests --------------------------------------------------

test("failed command alone is evidence, not a runbook", () => {
  const candidates = extractCommandCandidates(episodeWithCommand("npm test", 1));
  assert.equal(candidates.some((c) => c.entity_kind === "runbook"), false);
});

test("successful repeated command with repository declaration becomes a verified runbook candidate", () => {
  const candidates = extractCommandCandidates(
    episodeWithCommand("npm test", 0),
    repositoryWithScript("test"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.equal(runbook?.proposed_trust_state, "verified");
  assert.ok(runbook?.evidence_ids.length);
});

test("raw tool dumps are rejected from durable candidate content", () => {
  assert.equal(
    admitCandidate(candidate({ content: "Tool failed cwd=/tmp duration_ms=123 " + "x".repeat(4000) })).admit,
    false,
  );
});

// ---- Command extractor honesty gates ------------------------------------

test("successful command WITHOUT a repository script stays proposed (unverified)", () => {
  const candidates = extractCommandCandidates(episodeWithCommand("npm test", 0));
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.equal(runbook?.proposed_trust_state, "proposed");
});

test("a verified runbook candidate carries the script declaration as evidence", () => {
  const candidates = extractCommandCandidates(
    episodeWithCommand("npm run build", 0),
    repositoryWithScript("build"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.ok(runbook);
  // Evidence must include BOTH the execution event and the repository script fact.
  assert.ok(runbook!.evidence_ids.some((id) => id.includes("script:build")));
  assert.ok(runbook!.evidence_ids.some((id) => id.includes("tool_result")));
});

test("command candidates are deterministic: same episode yields identical candidate ids", () => {
  const a = extractCommandCandidates(episodeWithCommand("npm test", 0), repositoryWithScript("test"));
  const b = extractCommandCandidates(episodeWithCommand("npm test", 0), repositoryWithScript("test"));
  assert.deepEqual(a.map((c) => c.candidate_id), b.map((c) => c.candidate_id));
});

// ---- Command extractor: manifest grounding must be EXACT ----------------
// The declared-script fact grounds a runbook only when the command IS that bare script invocation.
// Extra shell operators, trailing args, a mismatched package manager, or an npx binary run all mean
// the declared script does not back the full command line, so it can never auto-verify.

test("a command chaining extra shell operators onto a declared script is NOT verified", () => {
  const candidates = extractCommandCandidates(
    episodeWithCommand("npm test && rm -rf /", 0),
    repositoryWithScript("test"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.ok(runbook);
  assert.notEqual(runbook!.proposed_trust_state, "verified");
  // The declared-script fact must NOT be attached as grounding for a command it does not back.
  assert.ok(!runbook!.evidence_ids.some((id) => id.includes("script:test")));
  // End-to-end: admission must not admit it as verified either.
  assert.notEqual(admitCandidate(runbook!).trust_state, "verified");
});

test("trailing arguments past a declared script name are NOT verified", () => {
  const candidates = extractCommandCandidates(
    episodeWithCommand("npm test --coverage", 0),
    repositoryWithScript("test"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.ok(runbook);
  assert.notEqual(runbook!.proposed_trust_state, "verified");
  assert.ok(!runbook!.evidence_ids.some((id) => id.includes("script:test")));
});

test("a runner that is not the repository's package manager is NOT verified", () => {
  // Repo declares a `test` script but no pnpm lockfile → default manager is npm; `pnpm test` is an
  // unverified procedure (pnpm may not even be installed), not a declared-script invocation.
  const candidates = extractCommandCandidates(
    episodeWithCommand("pnpm test", 0),
    repositoryWithScript("test"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.ok(runbook);
  assert.notEqual(runbook!.proposed_trust_state, "verified");
  assert.ok(!runbook!.evidence_ids.some((id) => id.includes("script:test")));
});

test("npx runs a package binary, not a declared script, so it is NOT verified", () => {
  const candidates = extractCommandCandidates(
    episodeWithCommand("npx test", 0),
    repositoryWithScript("test"),
  );
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.ok(runbook);
  assert.notEqual(runbook!.proposed_trust_state, "verified");
  assert.ok(!runbook!.evidence_ids.some((id) => id.includes("script:test")));
});

test("a declared script run with the repository's OWN package manager IS verified", () => {
  // A pnpm lockfile makes pnpm the repository's declared manager, so `pnpm test` is a real
  // declared-script invocation and grounds on the script fact.
  const snapshot: RepositorySnapshot = {
    repository: identity(),
    facts: [
      {
        fact_id: "file:pnpm-lock.yaml",
        kind: "file",
        name: "pnpm-lock.yaml",
        path: "pnpm-lock.yaml",
        line: null,
        fingerprint: "fp-lock",
        confidence: 1,
      },
      {
        fact_id: "script:test",
        kind: "script",
        name: "test",
        path: "package.json",
        line: null,
        fingerprint: "fp-script-test",
        confidence: 1,
      },
    ],
    relations: [],
    proposals: [],
  };
  const candidates = extractCommandCandidates(episodeWithCommand("pnpm test", 0), snapshot);
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.equal(runbook?.proposed_trust_state, "verified");
  assert.ok(runbook!.evidence_ids.some((id) => id.includes("script:test")));
});

// ---- Admission policy ----------------------------------------------------

test("admission admits a deterministic low/medium-impact runbook as verified", () => {
  const result = admitCandidate(candidate());
  assert.equal(result.admit, true);
  assert.equal(result.trust_state, "verified");
});

test("admission never auto-verifies a high-impact candidate — it downgrades to proposed", () => {
  const result = admitCandidate(candidate({
    entity_kind: "invariant",
    impact_class: "critical",
    review_policy: "security",
    proposed_trust_state: "verified",
    content: "The refund total must never exceed the original charge.",
  }));
  assert.equal(result.admit, true);
  assert.equal(result.trust_state, "proposed");
});

test("admission never auto-verifies a decision — decisions stay proposed with owner review", () => {
  const result = admitCandidate(candidate({
    entity_kind: "decision",
    impact_class: "high",
    review_policy: "owner",
    proposed_trust_state: "verified",
    content: "We chose SQLite over Postgres because the daemon is single-node.",
  }));
  assert.equal(result.trust_state, "proposed");
  assert.equal(result.review_policy, "owner");
});

test("admission never auto-verifies ownership — ownership stays proposed", () => {
  const result = admitCandidate(candidate({
    entity_kind: "owner",
    impact_class: "medium",
    review_policy: "owner",
    proposed_trust_state: "verified",
    content: "alice owns the billing module.",
  }));
  assert.equal(result.trust_state, "proposed");
});

test("admission never up-grades: a model-extracted candidate can never be verified", () => {
  const result = admitCandidate(candidate({
    extraction_method: "model",
    proposed_trust_state: "verified",
  }));
  assert.equal(result.trust_state, "proposed");
});

test("admission rejects session bookkeeping", () => {
  const result = admitCandidate(candidate({
    entity_kind: "runbook",
    content: "Session abc123 touched 4 repo paths and ran 2 commands.",
    evidence_ids: [],
  }));
  assert.equal(result.admit, false);
});

test("admission rejects a bare file list with no reusable learning", () => {
  const result = admitCandidate(candidate({
    entity_kind: "component",
    content: "src/a.ts, src/b.ts, src/c.ts, src/d.ts",
    evidence_ids: [],
  }));
  assert.equal(result.admit, false);
});

test("admission rejects a verified candidate with no supporting evidence", () => {
  const result = admitCandidate(candidate({ evidence_ids: [] }));
  // No evidence means it cannot be verified; at best it is proposed, and a contentless
  // trigger-less candidate is rejected outright.
  assert.notEqual(result.trust_state, "verified");
});

// ---- Change extractor ----------------------------------------------------

test("a file edit with no reusable learning does not become a verified claim", () => {
  const candidates = extractChangeCandidates(episode([
    event("file_edit", 10, { path: "src/server.ts" }),
  ]));
  assert.ok(candidates.every((c) => c.proposed_trust_state !== "verified"));
});

test("a verified-failure episode turns a file edit into a PROPOSED component candidate", () => {
  // This exercises the candidate-PRODUCING branch (outcome === 'verified_success') that the vacuous
  // default-outcome test never reached. If the extractor returned [], this assertion fails.
  const candidates = extractChangeCandidates(episode(
    [event("file_edit", 10, { path: "src/server.ts" })],
    { outcome: "verified_success" },
  ));
  assert.equal(candidates.length, 1);
  const c = candidates[0];
  assert.equal(c.entity_kind, "component");
  assert.equal(c.claim_kind, "change_touchpoint");
  assert.equal(c.entity_name, "src/server.ts");
  assert.equal(c.proposed_trust_state, "proposed");
  assert.ok(c.content.includes("src/server.ts"));
  assert.deepEqual(c.evidence_ids, ["evidence:event:file_edit-10"]);
  // Even end-to-end, admission must never verify a bare edit.
  assert.notEqual(admitCandidate(c).trust_state, "verified");
});

test("an episode that did not resolve a verified failure yields NO change candidates", () => {
  const candidates = extractChangeCandidates(episode(
    [event("file_edit", 10, { path: "src/server.ts" })],
    { outcome: "success" },
  ));
  assert.deepEqual(candidates, []);
});

test("repeated edits to the same path collapse to one deterministic change candidate", () => {
  const events = [
    event("file_edit", 10, { path: "src/server.ts" }),
    event("file_edit", 20, { path: "src/server.ts" }),
  ];
  const a = extractChangeCandidates(episode(events, { outcome: "verified_success" }));
  const b = extractChangeCandidates(episode(events, { outcome: "verified_success" }));
  assert.equal(a.length, 1);
  assert.deepEqual(a.map((c) => c.candidate_id), b.map((c) => c.candidate_id));
});

// ---- Failure extractor ---------------------------------------------------

test("an unresolved failure episode yields a proposed incident, never a runbook", () => {
  const ctx = episode([
    event("tool_result", 10, { command: "npm run deploy", exit_code: 1 }),
  ], { episode_type: "incident", outcome: "failure" });
  const candidates = extractFailureCandidates(ctx);
  assert.equal(candidates.some((c) => c.entity_kind === "runbook"), false);
  const incident = candidates.find((c) => c.entity_kind === "incident");
  assert.equal(incident?.proposed_trust_state, "proposed");
});

// ---- Repository extractor ------------------------------------------------

test("repository script facts become verified runbook candidates grounded in the manifest", () => {
  const candidates = extractRepositoryCandidates(repositoryWithScript("test"));
  const runbook = candidates.find((c) => c.entity_kind === "runbook");
  assert.equal(runbook?.proposed_trust_state, "verified");
  assert.ok(runbook?.evidence_ids.some((id) => id.includes("script:test")));
});

test("repository owner facts stay proposed even though they are code-graph grounded", () => {
  const snapshot: RepositorySnapshot = {
    repository: identity(),
    facts: [
      {
        fact_id: "owner:alice",
        kind: "owner",
        name: "alice",
        path: "",
        line: null,
        fingerprint: "fp-owner-alice",
        confidence: 1,
      },
    ],
    relations: [],
    proposals: [],
  };
  const candidates = extractRepositoryCandidates(snapshot);
  const owner = candidates.find((c) => c.entity_kind === "owner");
  assert.equal(owner?.proposed_trust_state, "proposed");
});

test("every emitted candidate that admission verifies is deterministic and low/medium impact", () => {
  const candidates = [
    ...extractCommandCandidates(episodeWithCommand("npm test", 0), repositoryWithScript("test")),
    ...extractRepositoryCandidates(repositoryWithScript("test")),
  ];
  for (const c of candidates) {
    const result = admitCandidate(c);
    if (result.trust_state === "verified") {
      assert.equal(c.extraction_method, "deterministic");
      assert.ok(c.impact_class === "low" || c.impact_class === "medium");
      assert.equal(c.review_policy, "automatic");
      assert.ok(c.evidence_ids.length > 0);
    }
  }
});
