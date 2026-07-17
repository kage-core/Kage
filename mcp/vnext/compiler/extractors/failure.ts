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
 * Failure extractor. Turns an *unresolved* failure episode into a proposed incident candidate.
 *
 * Honesty rules:
 *   - An unresolved failure is an incident, never a runbook. The failing command is recorded as
 *     evidence of what broke; it is emphatically not a "run this" procedure.
 *   - An incident is always `proposed` with an operations review role. Whether a failure is a real
 *     incident, and what to do about it, is an operational judgement — extraction can only flag it.
 */

function failingCommands(events: EvidenceEvent[]): EvidenceEvent[] {
  return events.filter(
    (event) =>
      event.event_type === "tool_result"
      && typeof event.payload.exit_code === "number"
      && (event.payload.exit_code as number) !== 0,
  );
}

export function extractFailureCandidates(context: EpisodeContext): ClaimCandidate[] {
  // Only an episode that ended in an unresolved failure is an incident.
  if (context.episode.outcome !== "failure") return [];

  const failing = failingCommands(context.events);
  if (failing.length === 0) return [];

  const firstFailure = failing[0];
  const command = typeof firstFailure.payload.command === "string" ? firstFailure.payload.command : "(unknown command)";
  const content = `An unresolved failure occurred while running \`${command}\` and was never verified as fixed.`;
  const id = candidateId({
    repository_id: context.episode.repository_id,
    entity_kind: "incident",
    entity_name: context.episode.episode_id,
    claim_kind: "unresolved_failure",
    content,
  });

  return [
    {
      candidate_id: id,
      repository_id: context.episode.repository_id,
      entity_kind: "incident",
      entity_name: context.episode.episode_id,
      claim_kind: "unresolved_failure",
      content,
      evidence_ids: failing.map(eventEvidenceId),
      // Incidents are always proposed with an operations review role — never auto-verified.
      proposed_trust_state: "proposed",
      impact_class: impactFor("incident"),
      extraction_method: "deterministic",
      review_policy: reviewPolicyFor("incident"),
    },
  ];
}
