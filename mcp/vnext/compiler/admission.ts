import type { TrustState } from "../repo-model/types.js";
import { ALWAYS_PROPOSED_KINDS, type ClaimCandidate } from "./candidates.js";

/**
 * Claim admission policy — the single honesty gate between extraction and the store.
 *
 * Two independent jobs:
 *   1. Rejection. Session bookkeeping, generic prompts, bare file lists, raw tool/payload dumps, and
 *      trigger-less/entity-less noise are not durable repository knowledge and never become claims.
 *   2. Trust clamping. A candidate's *proposed* trust is only an extractor's belief; admission clamps
 *      it to the honest ceiling. Auto-verification is permitted only for a deterministic extraction,
 *      of low/medium impact, on an `automatic`-review entity kind, backed by supporting evidence.
 *      Decisions, ownership, security/privacy invariants, production operations, and critical
 *      invariants always fall back to `proposed` with their review role. Admission can down-grade or
 *      reject; it can never up-grade (a `proposed` candidate is never promoted here).
 *
 * The rules mirror the kernel's long-standing `evaluateMemoryAdmission` honesty bar (dump rejection,
 * session-bookkeeping rejection, reusable-trigger requirement), applied to the vNext candidate shape.
 */

export interface AdmissionResult {
  admit: boolean;
  trust_state: TrustState;
  review_policy: ClaimCandidate["review_policy"];
  reasons: string[];
  risks: string[];
}

// Durable-content ceiling. A claim body is a distilled insight, not a transcript; anything longer is
// almost certainly a raw dump. Mirrors the kernel's MAX_PACKET_BODY_CHARS intent at candidate scale.
const MAX_CANDIDATE_CONTENT_CHARS = 2000;

// Raw tool-output / serialized-payload signatures: telemetry that leaked into content instead of a
// distilled learning. Any of these means "not durable knowledge".
function isRawPayloadOrDump(content: string): boolean {
  const t = content.trim();
  if (!t) return true;
  if (t.length > MAX_CANDIDATE_CONTENT_CHARS) return true;
  return (
    /tool failed|cwd=|duration_ms=|exit_code=|"interrupted"\s*:|"isImage"\s*:|"noOutputExpected"\s*:|"stdout"\s*:|"stderr"\s*:|"hookSpecificOutput"|tool_use_id|toolu_[A-Za-z0-9]{10}/i.test(
      t.slice(0, 4000),
    ) || t.startsWith('{"')
  );
}

// Session bookkeeping — "Session abc touched N repo paths / ran M commands" — is process metadata,
// not repository knowledge.
function isSessionBookkeeping(content: string): boolean {
  return /^session\b/i.test(content.trim())
    || /touched \d+ repo paths|ran \d+ commands?|user intent|command runbook/i.test(content);
}

// A bare list of file paths with no prose learning ("src/a.ts, src/b.ts, src/c.ts"). File activity is
// not, by itself, a reusable claim.
function isBareFileList(content: string): boolean {
  const t = content.trim();
  const tokens = t.split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 2) return false;
  const looksLikePath = (token: string) =>
    /[\w-]+\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|json|ya?ml|toml|md|sh|css|html|sql)$/i.test(token)
    || /^[\w.-]+\/[\w./-]+$/.test(token);
  return tokens.every(looksLikePath);
}

// Does the candidate carry a reusable trigger or a concrete repository entity? A candidate with
// neither evidence nor a recognizable trigger/entity is ungrounded noise. A backtick-quoted command,
// a package script name, a path, or any code identifier counts as a trigger; any evidence id counts
// as a repository grounding.
function hasTriggerOrEntity(candidate: ClaimCandidate): boolean {
  if (candidate.evidence_ids.length > 0) return true;
  const text = `${candidate.entity_name}\n${candidate.content}`;
  return (
    /`[^`]+`/.test(text)
    || /(^|\s)(npm|pnpm|yarn|npx|node|git|cargo|make|pytest|go|tsc|kage)\s+[\w.-]/.test(text)
    || /\b[\w.-]+\/[\w./-]+\b/.test(text)
    || /\b[a-z][a-z0-9]*[A-Z]\w*\b/.test(text)
  );
}

// The trust ceiling: the only shape that may auto-verify.
function meetsVerificationCeiling(candidate: ClaimCandidate): boolean {
  return (
    candidate.extraction_method === "deterministic"
    && (candidate.impact_class === "low" || candidate.impact_class === "medium")
    && candidate.review_policy === "automatic"
    && !ALWAYS_PROPOSED_KINDS.has(candidate.entity_kind)
    && candidate.evidence_ids.length > 0
  );
}

export function admitCandidate(candidate: ClaimCandidate): AdmissionResult {
  const reasons: string[] = [];
  const risks: string[] = [];

  // --- Rejection gates ---------------------------------------------------
  if (isRawPayloadOrDump(candidate.content)) {
    risks.push("raw tool/payload dump, not durable knowledge");
  }
  if (isSessionBookkeeping(candidate.content)) {
    risks.push("session bookkeeping, not durable knowledge");
  }
  if (isBareFileList(candidate.content)) {
    risks.push("bare file list without reusable learning");
  }
  if (!hasTriggerOrEntity(candidate)) {
    risks.push("no reusable trigger or repository entity");
  }

  if (risks.length > 0) {
    return {
      admit: false,
      // A rejected candidate is not injectable under any trust; report the floor.
      trust_state: "proposed",
      review_policy: candidate.review_policy,
      reasons,
      risks,
    };
  }

  // --- Trust clamping ----------------------------------------------------
  let trust: TrustState = candidate.proposed_trust_state;
  if (trust === "verified") {
    if (meetsVerificationCeiling(candidate)) {
      reasons.push("deterministic, low/medium impact, evidence-backed → auto-verified");
    } else {
      trust = "proposed";
      risks.push("cannot auto-verify (impact/kind/method/evidence ceiling) → proposed for review");
    }
  } else {
    reasons.push("proposed for review");
  }

  return {
    admit: true,
    trust_state: trust,
    review_policy: candidate.review_policy,
    reasons,
    risks,
  };
}
