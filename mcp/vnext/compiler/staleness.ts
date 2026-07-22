import type { Repository } from "../repo-model/repository.js";

/**
 * Evidence-driven staleness.
 *
 * When source ground truth changes, every claim grounded in the changed region loses the verification
 * that made it injectable. This module transitions those — and ONLY those — claims to `stale`, so a
 * stale fact stops being served the instant its evidence moves, while untouched claims keep their
 * trust. It never fabricates trust and never touches an unrelated claim.
 *
 * A changed ref is a ground-truth locator, in one of two forms:
 *   - `path#symbol` — a SYMBOL-level change: it invalidates only claims grounded in that exact symbol.
 *   - `path`        — a FILE-level change: it invalidates every claim grounded anywhere in that file
 *                     (all symbols within it), because the whole file moved.
 *
 * Only injectable (verified/approved) claims are considered: those are the ones whose trust is now in
 * question. A claim that is already proposed/disputed/stale/superseded/archived is left alone —
 * re-marking a non-injectable claim would be noise, and terminal claims are immutable. This makes the
 * pass idempotent: replaying the same change re-marks nothing, because the first pass already moved
 * the affected claims out of the injectable set.
 */

export interface StalenessResult {
  // claim_ids transitioned verified/approved -> stale by this pass, in deterministic (sorted) order.
  invalidated: string[];
}

interface ParsedRef {
  path: string;
  symbol: string | null;
}

function parseRef(ref: string): ParsedRef {
  const hash = ref.indexOf("#");
  if (hash === -1) return { path: ref, symbol: null };
  return { path: ref.slice(0, hash), symbol: ref.slice(hash + 1) || null };
}

// Does a changed ref hit an evidence anchor?
//   - a file-level ref (no symbol) matches any anchor whose path equals it (whole file changed);
//   - a symbol-level ref matches an anchor with the same path AND symbol.
function refMatchesAnchor(ref: ParsedRef, anchor: { path: string | null; symbol: string | null }): boolean {
  if (anchor.path === null || anchor.path !== ref.path) return false;
  if (ref.symbol === null) return true; // file-level change hits every symbol in the file
  return anchor.symbol === ref.symbol;
}

export function invalidateChangedEvidence(model: Repository, changedRefs: readonly string[]): StalenessResult {
  const refs = changedRefs.map(parseRef);
  const invalidated: string[] = [];

  for (const claim of model.allInjectableClaimAnchors()) {
    const affected = claim.anchors.some((anchor) => refs.some((ref) => refMatchesAnchor(ref, anchor)));
    if (!affected) continue;
    // `stale` is a non-terminal, non-injectable state; the transition has no honesty gate to clear
    // (only moves INTO verified/approved are gated). Provenance (created_by) is untouched by the store.
    model.transitionClaim(claim.claim_id, "stale", "compiler");
    invalidated.push(claim.claim_id);
  }

  invalidated.sort();
  return { invalidated };
}
