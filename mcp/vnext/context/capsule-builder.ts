import { createHash } from "node:crypto";
import {
  KAGE_PROTOCOL_VERSION,
  type CapsuleSection,
  type ContextCapsule,
} from "../protocol/index.js";
import {
  MAX_CONTEXT_IDENTIFIER_BYTES,
  MAX_CONTEXT_QUERY_BYTES,
  type ContextCandidate,
  type ContextRequest,
  type ContextSource,
} from "./source.js";
import { estimateTokens } from "./token-estimate.js";

const DEFAULT_TTL_MS = 5 * 60 * 1_000;

// JSON.stringify expands one input byte into at most six output bytes (a control character
// or lone surrogate becomes \u00XX).
const JSON_ESCAPE_FACTOR = 6;

// Everything in the capsule that is not a validated input string: the field names and JSON
// punctuation, capsule_id ("capsule_" + 64 hex chars), two ISO-8601 timestamps, the empty
// sections array, and the two numbers. Measured worst case is ~260 bytes; 512 is the
// documented ceiling.
const CAPSULE_ENVELOPE_STRUCTURE_BYTES = 512;

// The guarantee this module actually provides:
//
//   estimateTokens(JSON.stringify(capsule)) <= request.token_budget + MAX_CAPSULE_ENVELOPE_TOKENS
//
// Sections are charged the exact bytes they contribute to the serialized capsule (their own
// JSON plus the one-byte array separator), so the sections array never exceeds token_budget.
// Everything else is the envelope, which is bounded because validateContextRequest caps the
// only variable-length strings it echoes: query, repository_id, and task_id.
export const MAX_CAPSULE_ENVELOPE_TOKENS = Math.ceil(
  (CAPSULE_ENVELOPE_STRUCTURE_BYTES
    + JSON_ESCAPE_FACTOR * (MAX_CONTEXT_QUERY_BYTES + 2 * MAX_CONTEXT_IDENTIFIER_BYTES)) / 4,
);
const SECTION_KINDS = new Set<CapsuleSection["kind"]>([
  "orientation",
  "invariant",
  "feature",
  "entry_point",
  "decision",
  "verification",
  "runbook",
  "minimal_change",
]);
const KIND_RANK: Record<CapsuleSection["kind"], number> = {
  invariant: 1,
  entry_point: 2,
  minimal_change: 2,
  verification: 3,
  feature: 4,
  decision: 5,
  runbook: 6,
  orientation: 7,
};

export interface CapsuleBuilderOptions {
  now?: () => Date;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validEvidence(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !nonempty(value[index])) return false;
  }
  return true;
}

function validCandidate(candidate: ContextCandidate): boolean {
  return Boolean(
    candidate
    && nonempty(candidate.candidate_id)
    && SECTION_KINDS.has(candidate.kind)
    && nonempty(candidate.title)
    && nonempty(candidate.body)
    && validEvidence(candidate.evidence_ids)
    && (candidate.trust_state === "verified" || candidate.trust_state === "approved")
    && Number.isFinite(candidate.priority),
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalCandidate(candidate: ContextCandidate): string {
  return JSON.stringify({
    candidate_id: candidate.candidate_id,
    kind: candidate.kind,
    title: candidate.title,
    body: candidate.body,
    evidence_ids: candidate.evidence_ids,
    trust_state: candidate.trust_state,
    priority: candidate.priority,
  });
}

function compareCandidates(left: ContextCandidate, right: ContextCandidate): number {
  return KIND_RANK[left.kind] - KIND_RANK[right.kind]
    || right.priority - left.priority
    || compareText(left.candidate_id, right.candidate_id)
    || compareText(canonicalCandidate(left), canonicalCandidate(right));
}

function sectionFrom(candidate: ContextCandidate): CapsuleSection {
  return {
    kind: candidate.kind,
    title: candidate.title,
    body: candidate.body,
    evidence_ids: [...candidate.evidence_ids],
    priority: candidate.priority,
  };
}

// Exactly the bytes this section contributes to JSON.stringify(capsule).sections — every
// field the protocol emits, priority included. Omitting a field here would under-count the
// payload the caller is actually charged for.
export function renderCapsuleSection(section: CapsuleSection): string {
  return JSON.stringify({
    kind: section.kind,
    title: section.title,
    body: section.body,
    evidence_ids: section.evidence_ids,
    priority: section.priority,
  });
}

// The rendered section plus the one-byte comma that joins it to the array.
export function capsuleSectionTokens(section: CapsuleSection): number {
  return estimateTokens(`${renderCapsuleSection(section)},`);
}

function projectedRequest(request: ContextRequest): ContextRequest {
  return {
    repository: {
      repo_id: request.repository.repo_id,
      root: request.repository.root,
      remote: request.repository.remote,
      branch: request.repository.branch,
      commit: request.repository.commit,
      worktree: request.repository.worktree,
    },
    task: {
      task_id: request.task.task_id,
      session_id: request.task.session_id,
      user_id: request.task.user_id,
      agent_surface: request.task.agent_surface,
    },
    query: request.query,
    targets: [...request.targets],
    changed_files: [...request.changed_files],
    token_budget: request.token_budget,
  };
}

function capsuleId(request: ContextRequest, sections: CapsuleSection[]): string {
  const content = JSON.stringify({ request: projectedRequest(request), sections });
  return `capsule_${createHash("sha256").update(content).digest("hex")}`;
}

export async function buildContextCapsule(
  source: ContextSource,
  request: ContextRequest,
  options: CapsuleBuilderOptions = {},
): Promise<ContextCapsule> {
  const candidates = await source.find(projectedRequest(request));
  const sorted = candidates.filter(validCandidate).sort(compareCandidates);
  const seen = new Set<string>();
  const sections: CapsuleSection[] = [];
  let estimatedTokens = 0;

  for (const candidate of sorted) {
    if (seen.has(candidate.candidate_id)) continue;
    const section = sectionFrom(candidate);
    const sectionTokens = capsuleSectionTokens(section);
    // Budget overflow must not claim the id: a duplicate that fits still deserves its slot.
    if (estimatedTokens + sectionTokens > request.token_budget) continue;
    seen.add(candidate.candidate_id);
    sections.push(section);
    estimatedTokens += sectionTokens;
  }

  const created = (options.now ?? (() => new Date()))();
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    capsule_id: capsuleId(request, sections),
    task_id: request.task.task_id,
    repository_id: request.repository.repo_id,
    query: request.query,
    sections,
    token_budget: request.token_budget,
    estimated_tokens: estimatedTokens,
    created_at: created.toISOString(),
    expires_at: new Date(created.getTime() + DEFAULT_TTL_MS).toISOString(),
  };
}
