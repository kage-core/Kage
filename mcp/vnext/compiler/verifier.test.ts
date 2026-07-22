import test from "node:test";
import assert from "node:assert/strict";

import type { EvidenceRecord } from "../repo-model/types.js";
import {
  isVerificationMethod,
  verifyEvidence,
  type GroundTruthProbe,
} from "./verifier.js";

const NOW = "2026-07-13T00:00:00.000Z";

function fixtureEvidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    evidence_id: "evidence:fact:1",
    repository_id: "repo-1",
    source_type: "source",
    source_uri: "source:src/auth.ts",
    source_fingerprint: "fp-original",
    commit: null,
    path: "src/auth.ts",
    symbol: "login",
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
    ...overrides,
  };
}

// A probe that answers with a fixed fingerprint (or null for "ground truth is gone").
function probeReturning(fingerprint: string | null): GroundTruthProbe {
  return { currentFingerprint: () => fingerprint };
}

test("matching ground-truth fingerprint verifies the evidence", () => {
  const evidence = fixtureEvidence({ source_fingerprint: "fp-x" });
  const verdict = verifyEvidence(evidence, probeReturning("fp-x"));
  assert.equal(verdict.state, "verified");
  assert.equal(verdict.method, "source_fingerprint");
});

test("a changed ground-truth fingerprint fails verification, never silently passes", () => {
  const evidence = fixtureEvidence({ source_fingerprint: "fp-old" });
  const verdict = verifyEvidence(evidence, probeReturning("fp-new"));
  assert.equal(verdict.state, "failed");
});

test("missing ground truth is unavailable, never a fabricated verified", () => {
  const evidence = fixtureEvidence();
  const verdict = verifyEvidence(evidence, probeReturning(null));
  assert.equal(verdict.state, "unavailable");
  // Honesty: an absent probe result must never be reported as verified.
  assert.notEqual(verdict.state, "verified");
});

test("a model assertion is extraction metadata, never a verification method", () => {
  assert.equal(isVerificationMethod("model"), false);
  assert.equal(isVerificationMethod("model_assertion"), false);
  const evidence = fixtureEvidence({ verification_method: "model_assertion" });
  // Even if a probe would match, a model assertion can never verify a claim.
  const verdict = verifyEvidence(evidence, probeReturning(evidence.source_fingerprint));
  assert.equal(verdict.state, "unavailable");
  assert.notEqual(verdict.state, "verified");
});

test("the eight real verification methods are recognized", () => {
  for (const method of [
    "source_fingerprint",
    "symbol_fingerprint",
    "package_script",
    "test_pass",
    "ci_run",
    "git_commit",
    "document_anchor",
    "human_review",
  ]) {
    assert.equal(isVerificationMethod(method), true, method);
  }
});

test("an authorized human review stands on its recorded decision", () => {
  const evidence = fixtureEvidence({ verification_method: "human_review", verification_state: "verified" });
  // A human review is an authority decision, not a fingerprint check; the probe never sees it.
  const verdict = verifyEvidence(evidence, probeReturning(null));
  assert.equal(verdict.state, "verified");
  assert.equal(verdict.method, "human_review");
});
