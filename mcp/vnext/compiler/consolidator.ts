import type { ClaimRecord } from "../repo-model/types.js";
import type { ClaimCandidate } from "./candidates.js";

/**
 * Claim consolidation.
 *
 * Extraction produces a stream of candidate claims; many restate a fact the model already holds. The
 * consolidator decides, deterministically, what to do with one candidate given the claim that already
 * occupies its slot (same entity + same claim_kind), and it NEVER rewrites a claim's content in place:
 *
 *   - refresh_evidence — the candidate says the same thing (identical, or trivially reworded to the
 *     same normalized meaning and polarity). Keep the existing claim; attach/refresh its evidence.
 *   - review_contradiction — the candidate asserts the OPPOSITE of the existing claim about the same
 *     subject (same content words, flipped polarity). Two supported-but-opposing facts are never
 *     silently merged; a human/authority review item resolves it.
 *   - supersede — a genuinely different fact in the same slot. The existing claim is not edited; a new
 *     version is minted and linked back via supersession (the store enforces this), after policy
 *     permits it.
 *   - create — there is no existing claim in the slot; the candidate stands up a fresh claim.
 *
 * Everything here is a pure function of content, so replaying the same candidates yields the same
 * decisions (replay-idempotent), and no comparison depends on wall-clock time or ordering.
 */

export type ConsolidationAction =
  | { action: "create"; candidate: ClaimCandidate }
  | { action: "refresh_evidence"; claim_id: string; evidence_ids: string[] }
  | { action: "supersede"; claim_id: string; replacement: ClaimCandidate }
  | { action: "review_contradiction"; claim_id: string; candidate: ClaimCandidate };

export type Polarity = "positive" | "negative";

export interface ContentAnalysis {
  // Whitespace/punctuation-normalized, lowercased text (polarity preserved).
  normalized: string;
  // Content-word set with auxiliaries, articles, and negations removed and a light stem applied, so
  // "uses sessions" and "use sessions" share a set. This is the subject fingerprint.
  words: Set<string>;
  polarity: Polarity;
}

// Words that carry no subject meaning: articles, auxiliaries/copulas, negations, and a few connectors.
// Negations are dropped from the word SET (so the subject matches across polarity) but are separately
// detected to set polarity.
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the",
  "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "done",
  "has", "have", "had",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "to", "of", "and", "or", "with", "that", "this", "it", "its", "as",
  // negations (also trip the polarity flag below)
  "not", "no", "never", "none", "without", "cannot",
]);

const NEGATIONS: ReadonlySet<string> = new Set([
  "not", "no", "never", "none", "without", "cannot",
]);

// Expand the common English contractions that hide a negation, so tokenization sees the "not".
function expandContractions(text: string): string {
  return text
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bcannot\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bshan't\b/g, "shall not")
    .replace(/\bn't\b/g, " not")
    .replace(/n't\b/g, " not");
}

// Light, deterministic stem: drop a single trailing plural/3rd-person "s" (but never on "ss" or very
// short tokens) so "uses"/"use" and "sessions"/"session" collapse. Intentionally minimal — this is a
// fingerprint helper, not a linguistic stemmer.
function stem(token: string): string {
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

export function analyzeContent(content: string): ContentAnalysis {
  const lowered = expandContractions(content.toLowerCase());
  const rawTokens = lowered.split(/[^a-z0-9]+/).filter(Boolean);
  const normalized = rawTokens.join(" ");
  const polarity: Polarity = rawTokens.some((t) => NEGATIONS.has(t)) ? "negative" : "positive";
  const words = new Set<string>();
  for (const token of rawTokens) {
    if (STOPWORDS.has(token)) continue;
    words.add(stem(token));
  }
  return { normalized, words, polarity };
}

function sameWordSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const w of a) if (!b.has(w)) return false;
  return true;
}

/**
 * Decide what to do with `candidate` given the claim (if any) currently occupying its slot.
 *
 * `existing` is the current claim in the candidate's (entity, claim_kind) slot, or null when the slot
 * is empty. This function is pure: it never touches the store and never mutates `existing`.
 */
export function consolidate(existing: ClaimRecord | null, candidate: ClaimCandidate): ConsolidationAction {
  if (!existing) {
    return { action: "create", candidate };
  }

  const a = analyzeContent(existing.normalized_content);
  const b = analyzeContent(candidate.content);
  const equivalentSubject = sameWordSet(a.words, b.words);

  // Same subject, same polarity → the same fact, restated. Keep the claim, refresh its evidence. This
  // also folds exact duplicates and trivial rewordings, preventing version churn.
  if (equivalentSubject && a.polarity === b.polarity) {
    return { action: "refresh_evidence", claim_id: existing.claim_id, evidence_ids: [...candidate.evidence_ids] };
  }

  // Same subject, opposite polarity → a real contradiction. Never merge; route to review.
  if (equivalentSubject && a.polarity !== b.polarity) {
    return { action: "review_contradiction", claim_id: existing.claim_id, candidate };
  }

  // Different fact in the same slot → a new version. Content is never edited in place; the store mints
  // the replacement and links supersession.
  return { action: "supersede", claim_id: existing.claim_id, replacement: candidate };
}
