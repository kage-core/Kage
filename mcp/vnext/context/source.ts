import { isRecord } from "../../type-guards.js";
import type { CapsuleSection, RepositoryIdentity, TaskIdentity } from "../protocol/index.js";
import type { ValidationResult } from "../protocol/validate.js";

export const MAX_CONTEXT_TOKEN_BUDGET = 32_000;

// A query is a task description, not a payload. 4096 bytes is ~1024 estimated tokens —
// larger than any real prompt-derived task line, and small enough that echoing it back in
// the capsule cannot dwarf a caller's token budget. Over-long queries are REJECTED, never
// truncated: a silently truncated query would change the recall the caller thinks it ran.
export const MAX_CONTEXT_QUERY_BYTES = 4_096;

// repo_id and task_id are echoed into the capsule envelope, so they must be bounded for the
// envelope bound in capsule-builder.ts to hold.
export const MAX_CONTEXT_IDENTIFIER_BYTES = 256;

// LegacyContextSource.find drives SYNCHRONOUS kernel work (recall, kageRisk -> code-graph
// build). A synchronous kernel call cannot be preempted by an in-process timeout, so the
// only real bound available to the single-threaded runtime is a bound on its inputs: a
// request carrying tens of thousands of targets would block /v2/health, /v2/events and
// /v2/receipts for the whole analysis and drop fail-open adapter evidence.
//
// Known limitation (Phase A): even a legal, in-cap request can exceed Task 5's 500 ms
// budget on a cold repo, because kageRisk falls back to a full code-graph build. Bounding
// the inputs bounds the abuse case, not the cold-build case. Moving kernel work off the
// request thread is out of scope here and is recorded, not papered over.
export const MAX_CONTEXT_PATHS = 256;
export const MAX_CONTEXT_PATH_BYTES = 1_024;

export interface ContextRequest {
  repository: RepositoryIdentity;
  task: TaskIdentity;
  query: string;
  targets: string[];
  changed_files: string[];
  token_budget: number;
}

export interface ContextCandidate {
  candidate_id: string;
  kind: CapsuleSection["kind"];
  title: string;
  body: string;
  evidence_ids: string[];
  trust_state: "verified" | "approved";
  priority: number;
}

export interface ContextSource {
  find(request: ContextRequest): Promise<ContextCandidate[]>;
}

function hasExactOwnKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const ownKeys = Reflect.ownKeys(record);
  return ownKeys.length === expected.length
    && expected.every((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function ownValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nullableNonemptyString(value: unknown): value is string | null {
  return value === null || nonemptyString(value);
}

function withinByteCap(value: string, maxBytes: number): boolean {
  return Buffer.byteLength(value, "utf8") <= maxBytes;
}

function boundedIdentifier(value: unknown): value is string {
  return nonemptyString(value) && withinByteCap(value, MAX_CONTEXT_IDENTIFIER_BYTES);
}

function projectRepository(value: unknown): RepositoryIdentity | undefined {
  if (!isRecord(value) || !hasExactOwnKeys(value, ["repo_id", "root", "remote", "branch", "commit", "worktree"])) {
    return undefined;
  }
  const repoId = ownValue(value, "repo_id");
  const root = ownValue(value, "root");
  const remote = ownValue(value, "remote");
  const branch = ownValue(value, "branch");
  const commit = ownValue(value, "commit");
  const worktree = ownValue(value, "worktree");
  if (
    !boundedIdentifier(repoId)
    || !nonemptyString(root)
    || !nullableNonemptyString(remote)
    || !nullableNonemptyString(branch)
    || !nullableNonemptyString(commit)
    || !nonemptyString(worktree)
  ) return undefined;
  return { repo_id: repoId, root, remote, branch, commit, worktree };
}

function projectTask(value: unknown): TaskIdentity | undefined {
  if (!isRecord(value) || !hasExactOwnKeys(value, ["task_id", "session_id", "user_id", "agent_surface"])) {
    return undefined;
  }
  const taskId = ownValue(value, "task_id");
  const sessionId = ownValue(value, "session_id");
  const userId = ownValue(value, "user_id");
  const agentSurface = ownValue(value, "agent_surface");
  if (
    !boundedIdentifier(taskId)
    || !nonemptyString(sessionId)
    || !nullableNonemptyString(userId)
    || !nonemptyString(agentSurface)
  ) return undefined;
  return { task_id: taskId, session_id: sessionId, user_id: userId, agent_surface: agentSurface };
}

function projectPathArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_CONTEXT_PATHS) return undefined;
  const projected: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(value, index)
      || !nonemptyString(value[index])
      || !withinByteCap(value[index], MAX_CONTEXT_PATH_BYTES)
    ) return undefined;
    projected.push(value[index]);
  }
  return projected;
}

export function validateContextRequest(value: unknown): ValidationResult<ContextRequest> {
  if (!isRecord(value) || !hasExactOwnKeys(value, [
    "repository",
    "task",
    "query",
    "targets",
    "changed_files",
    "token_budget",
  ])) return { ok: false, errors: ["context request must contain exactly the protocol fields"] };

  const repository = projectRepository(ownValue(value, "repository"));
  const task = projectTask(ownValue(value, "task"));
  const query = ownValue(value, "query");
  const targets = projectPathArray(ownValue(value, "targets"));
  const changedFiles = projectPathArray(ownValue(value, "changed_files"));
  const tokenBudget = ownValue(value, "token_budget");
  if (
    repository === undefined
    || task === undefined
    || !nonemptyString(query)
    || !withinByteCap(query, MAX_CONTEXT_QUERY_BYTES)
    || targets === undefined
    || changedFiles === undefined
    || !Number.isSafeInteger(tokenBudget)
    || (tokenBudget as number) <= 0
    || (tokenBudget as number) > MAX_CONTEXT_TOKEN_BUDGET
  ) return { ok: false, errors: ["context request is invalid"] };

  return {
    ok: true,
    value: {
      repository,
      task,
      query,
      targets,
      changed_files: changedFiles,
      token_budget: tokenBudget as number,
    },
  };
}
