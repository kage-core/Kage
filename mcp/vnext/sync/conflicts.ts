// Deterministic reconciliation of competing claim versions.
//
// When two daemons (or a daemon and the workspace) each hold a version of the same claim, the merge must
// be a pure function of the two records — never of arrival order — so every replica reaches the same
// decision. Three outcomes only: identical content is a no-op; a linear supersede fast-forwards to the
// newer head; a genuine concurrent divergence PRESERVES BOTH versions and raises a review conflict, so no
// knowledge is lost to a silent last-write-wins overwrite.
import type { ClaimRecord } from "../repo-model/types.js";
import type { ClaimMergeResult } from "./types.js";

/** Stable ordering for two claim versions: by claim_id, then updated_at. Arrival order never matters. */
function ordered(a: ClaimRecord, b: ClaimRecord): [ClaimRecord, ClaimRecord] {
  const byId = a.claim_id.localeCompare(b.claim_id);
  if (byId !== 0) return byId < 0 ? [a, b] : [b, a];
  return a.updated_at <= b.updated_at ? [a, b] : [b, a];
}

/** True when two versions carry the same normalized content and lifecycle state — nothing to reconcile. */
function sameContent(a: ClaimRecord, b: ClaimRecord): boolean {
  return a.normalized_content === b.normalized_content && a.trust_state === b.trust_state;
}

/**
 * Reconcile two versions of a claim. Deterministic and commutative:
 *  - a linear supersede (one version's supersedes_claim_id points at the other) fast-forwards to the newer;
 *  - identical content is a no-op keeping a single canonical version;
 *  - anything else is a concurrent divergence: keep BOTH and require a human review decision.
 */
export function mergeConcurrentClaims(a: ClaimRecord, b: ClaimRecord): ClaimMergeResult {
  // Linear history: b is the ancestor a supersedes -> a is the newer head.
  if (a.supersedes_claim_id && a.supersedes_claim_id === b.claim_id) {
    return { action: "fast_forward", winner: a, preserved_versions: [a] };
  }
  if (b.supersedes_claim_id && b.supersedes_claim_id === a.claim_id) {
    return { action: "fast_forward", winner: b, preserved_versions: [b] };
  }
  if (sameContent(a, b)) {
    const [first] = ordered(a, b);
    return { action: "identical", winner: first, preserved_versions: [first] };
  }
  const [first, second] = ordered(a, b);
  return { action: "review_conflict", winner: null, preserved_versions: [first, second] };
}
