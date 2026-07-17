import type { EvidenceEvent } from "../../protocol/index.js";
import type { IndexedFact, RepositorySnapshot } from "../../repo-index/source.js";
import {
  candidateId,
  eventEvidenceId,
  factEvidenceId,
  impactFor,
  reviewPolicyFor,
  type ClaimCandidate,
  type EpisodeContext,
} from "../candidates.js";

/**
 * Command extractor. Turns successful command executions into runbook candidates.
 *
 * Honesty rules baked in here:
 *   - A *failed* command is evidence, never a runbook. A procedure that did not work is not a
 *     procedure; the failure is left to the failure extractor (as an incident), never surfaced as a
 *     durable "run this" claim.
 *   - A successful command only auto-*verifies* when the repository itself *declares* it (a package
 *     script the code-graph indexed). That declaration is the repository entity that grounds the
 *     runbook. A successful ad-hoc command that the repo does not declare is a real observation, so
 *     it is proposed — but never verified, because nothing in the repository backs it as a procedure.
 */

const COMMAND_EVENT = "tool_result";

interface CommandExecution {
  event: EvidenceEvent;
  command: string;
  exitCode: number;
}

function readExecutions(context: EpisodeContext): CommandExecution[] {
  const executions: CommandExecution[] = [];
  for (const event of context.events) {
    if (event.event_type !== COMMAND_EVENT) continue;
    const command = event.payload.command;
    const exitCode = event.payload.exit_code;
    if (typeof command !== "string" || command.trim() === "") continue;
    if (typeof exitCode !== "number") continue;
    executions.push({ event, command: command.trim(), exitCode });
  }
  return executions;
}

// Map a shell command to the package-script name it invokes, if any. `npm test` / `npm run test` /
// `yarn test` / `pnpm run test` all resolve to the script `test`. Anything that is not a recognized
// package-runner invocation resolves to null (no declared-script grounding).
function scriptTokenFor(command: string): string | null {
  const parts = command.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const runner = parts[0];
  if (!/^(npm|pnpm|yarn|npx)$/.test(runner)) return null;
  // Skip an explicit `run` verb: `npm run build` → build.
  let idx = 1;
  if (parts[idx] === "run") idx += 1;
  const token = parts[idx];
  if (!token || token.startsWith("-")) return null;
  return token;
}

function matchingScriptFact(snapshot: RepositorySnapshot | undefined, token: string | null): IndexedFact | null {
  if (!snapshot || !token) return null;
  return snapshot.facts.find((fact) => fact.kind === "script" && fact.name === token) ?? null;
}

export function extractCommandCandidates(
  context: EpisodeContext,
  snapshot?: RepositorySnapshot,
): ClaimCandidate[] {
  const candidates: ClaimCandidate[] = [];
  const seen = new Set<string>();

  for (const execution of readExecutions(context)) {
    // A failed command is evidence only — never a runbook procedure.
    if (execution.exitCode !== 0) continue;

    const token = scriptTokenFor(execution.command);
    const scriptFact = matchingScriptFact(snapshot, token);

    const evidence_ids = [eventEvidenceId(execution.event)];
    if (scriptFact) evidence_ids.push(factEvidenceId(scriptFact));

    const content = `Run \`${execution.command}\` to execute the repository's ${token ?? "command"} step.`;
    const id = candidateId({
      repository_id: context.episode.repository_id,
      entity_kind: "runbook",
      entity_name: execution.command,
      claim_kind: "runbook_step",
      content,
    });
    if (seen.has(id)) continue;
    seen.add(id);

    candidates.push({
      candidate_id: id,
      repository_id: context.episode.repository_id,
      entity_kind: "runbook",
      entity_name: execution.command,
      claim_kind: "runbook_step",
      content,
      evidence_ids,
      // Verified only when the repository itself declares the command as a script; otherwise the
      // execution is real but unbacked by a repository entity, so it stays proposed.
      proposed_trust_state: scriptFact ? "verified" : "proposed",
      impact_class: impactFor("runbook"),
      extraction_method: "deterministic",
      review_policy: reviewPolicyFor("runbook"),
    });
  }

  return candidates;
}
