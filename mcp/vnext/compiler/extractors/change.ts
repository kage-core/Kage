import type { EvidenceEvent } from "../../protocol/index.js";
import {
  candidateId,
  eventEvidenceId,
  impactFor,
  reviewPolicyFor,
  type ClaimCandidate,
  type EpisodeContext,
} from "../candidates.js";

/**
 * Change extractor. Turns file edits in an episode into *proposed* component claims.
 *
 * Honesty rule: a raw file edit is never a verified claim. That a file changed is a fact, but *what
 * the change means* is an inference — an edit is not evidence that a component behaves a certain way,
 * only that someone touched it. So every candidate here is `proposed`, awaiting either verification
 * (a passing test, a CI run) or human review. We only surface a component candidate when the episode
 * resolved a failure (a debugging fix), which is the one shape where the edit is plausibly meaningful;
 * bare edits with no resolved failure are left as raw evidence, not durable claims.
 */

function editedPaths(events: EvidenceEvent[]): Map<string, EvidenceEvent> {
  const paths = new Map<string, EvidenceEvent>();
  for (const event of events) {
    if (event.event_type !== "file_edit") continue;
    const path = event.payload.path;
    if (typeof path !== "string" || path.trim() === "") continue;
    if (!paths.has(path)) paths.set(path, event);
  }
  return paths;
}

export function extractChangeCandidates(context: EpisodeContext): ClaimCandidate[] {
  // Only a debugging episode (a resolved failure) makes an edit plausibly a durable component fact.
  const resolvedFailure = context.episode.outcome === "verified_success";
  if (!resolvedFailure) return [];

  const candidates: ClaimCandidate[] = [];
  const seen = new Set<string>();

  for (const [path, event] of editedPaths(context.events)) {
    const content = `\`${path}\` was changed while resolving a verified failure in this episode.`;
    const id = candidateId({
      repository_id: context.episode.repository_id,
      entity_kind: "component",
      entity_name: path,
      claim_kind: "change_touchpoint",
      content,
    });
    if (seen.has(id)) continue;
    seen.add(id);

    candidates.push({
      candidate_id: id,
      repository_id: context.episode.repository_id,
      entity_kind: "component",
      entity_name: path,
      claim_kind: "change_touchpoint",
      content,
      evidence_ids: [eventEvidenceId(event)],
      // An edit is never self-verifying; the meaning of the change awaits verification/review.
      proposed_trust_state: "proposed",
      impact_class: impactFor("component"),
      extraction_method: "deterministic",
      review_policy: reviewPolicyFor("component"),
    });
  }

  return candidates;
}
