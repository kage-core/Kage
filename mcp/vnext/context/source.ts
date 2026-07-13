import { isRecord } from "../../type-guards.js";
import type { CapsuleSection, RepositoryIdentity, TaskIdentity } from "../protocol/index.js";
import type { ValidationResult } from "../protocol/validate.js";

export const MAX_CONTEXT_TOKEN_BUDGET = 32_000;

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
    !nonemptyString(repoId)
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
    !nonemptyString(taskId)
    || !nonemptyString(sessionId)
    || !nullableNonemptyString(userId)
    || !nonemptyString(agentSurface)
  ) return undefined;
  return { task_id: taskId, session_id: sessionId, user_id: userId, agent_surface: agentSurface };
}

function projectStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !nonemptyString(value[index])) return undefined;
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
  const targets = projectStringArray(ownValue(value, "targets"));
  const changedFiles = projectStringArray(ownValue(value, "changed_files"));
  const tokenBudget = ownValue(value, "token_budget");
  if (
    repository === undefined
    || task === undefined
    || !nonemptyString(query)
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
