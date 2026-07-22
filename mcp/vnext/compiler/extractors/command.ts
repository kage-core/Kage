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

// Package-manager runners that execute a package.json `scripts` entry. `npx` is deliberately
// excluded: it runs a package *binary*, not a declared script, so it never grounds on a script fact.
const SCRIPT_RUNNERS = new Set(["npm", "pnpm", "yarn"]);

// Determine the repository's declared package manager from its snapshot. Lockfiles are ground truth:
// pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm. When nothing in the snapshot
// declares a manager we default to npm (the historical default); a non-npm runner then never matches,
// so grounding stays conservative (proposed, not verified) rather than trusting a manager the
// repository does not evidence.
function packageManagerFor(snapshot: RepositorySnapshot | undefined): "npm" | "pnpm" | "yarn" {
  if (!snapshot) return "npm";
  const hasFile = (needle: string) =>
    snapshot.facts.some(
      (fact) => fact.kind === "file" && (fact.name === needle || fact.path.endsWith(needle)),
    );
  if (hasFile("pnpm-lock.yaml")) return "pnpm";
  if (hasFile("yarn.lock")) return "yarn";
  return "npm";
}

// Map a shell command to the package-script name it invokes, if — and ONLY if — the command is
// EXACTLY that bare script invocation. `npm test`, `npm run test`, `pnpm test`, `yarn build` resolve
// to their script token. Anything more than the bare invocation resolves to null, because the
// declared script does not back the extra content:
//   - any shell metacharacter (&&, ||, ;, |, redirects, subshells, backticks, $) — e.g.
//     `npm test && rm -rf /` is a compound command, not the declared script;
//   - any trailing argument or flag past the script name — e.g. `npm test --coverage`;
//   - a runner that is not the repository's declared package manager — e.g. `pnpm test` in an
//     npm repo;
//   - `npx`, which runs a binary rather than a declared script.
function scriptTokenFor(command: string, packageManager: string): string | null {
  // Any shell metacharacter means the command is more than a single bare script invocation.
  if (/[&|;<>`$(){}\n]/.test(command)) return null;
  const parts = command.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const runner = parts[0];
  if (!SCRIPT_RUNNERS.has(runner)) return null;
  // The runner must be the repository's own package manager, or the recommendation is unverified.
  if (runner !== packageManager) return null;
  // Skip an explicit `run` verb: `npm run build` → build.
  let idx = 1;
  if (parts[idx] === "run") idx += 1;
  const token = parts[idx];
  if (!token || token.startsWith("-")) return null;
  // Nothing may follow the script name — no extra args, no flags. The declared script grounds only
  // the bare invocation, not `<script> <args>`.
  if (idx !== parts.length - 1) return null;
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
  const packageManager = packageManagerFor(snapshot);

  for (const execution of readExecutions(context)) {
    // A failed command is evidence only — never a runbook procedure.
    if (execution.exitCode !== 0) continue;

    const token = scriptTokenFor(execution.command, packageManager);
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
