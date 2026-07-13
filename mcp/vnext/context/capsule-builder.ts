import { createHash } from "node:crypto";
import {
  KAGE_PROTOCOL_VERSION,
  type CapsuleSection,
  type ContextCapsule,
} from "../protocol/index.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";
import { estimateTokens } from "./token-estimate.js";

const DEFAULT_TTL_MS = 5 * 60 * 1_000;
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

export function renderCapsuleSection(section: CapsuleSection): string {
  return JSON.stringify({
    kind: section.kind,
    title: section.title,
    body: section.body,
    evidence_ids: section.evidence_ids,
  });
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
    seen.add(candidate.candidate_id);
    const section = sectionFrom(candidate);
    const sectionTokens = estimateTokens(renderCapsuleSection(section));
    if (estimatedTokens + sectionTokens > request.token_budget) continue;
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
