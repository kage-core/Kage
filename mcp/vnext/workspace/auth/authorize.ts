// Role- and scope-based authorization for the workspace service.
//
// `can()` answers a single question: may THIS server-resolved principal perform THIS action, optionally
// on THIS repository? Two independent gates must both pass: the role must grant the action, and (when a
// repository is named) the principal's repository scope must include it. Service principals are handled
// separately — they may only sync, and only on their own repositories, regardless of any role string.
import type { Principal, WorkspaceAction, WorkspaceRole } from "./types.js";

const ALL_ACTIONS: readonly WorkspaceAction[] = [
  "workspace.manage",
  "repository.connect",
  "knowledge.read",
  "knowledge.review",
  "policy.manage",
  "metrics.read",
  "billing.manage",
  "audit.read",
  "sync.push",
  "sync.pull",
];

// What each human role may do. This is the single source of truth for team authority; routes ask `can`
// rather than switching on role strings themselves, so authority can never drift between endpoints.
const ROLE_ACTIONS: Record<WorkspaceRole, ReadonlySet<WorkspaceAction>> = {
  owner: new Set(ALL_ACTIONS),
  admin: new Set<WorkspaceAction>([
    "workspace.manage",
    "repository.connect",
    "knowledge.read",
    "knowledge.review",
    "policy.manage",
    "metrics.read",
    "audit.read",
  ]),
  knowledge_owner: new Set<WorkspaceAction>([
    "knowledge.read",
    "knowledge.review",
    "policy.manage",
    "metrics.read",
    "audit.read",
  ]),
  developer: new Set<WorkspaceAction>(["knowledge.read", "metrics.read"]),
  viewer: new Set<WorkspaceAction>(["knowledge.read"]),
};

// A local daemon service token is never a human role: it may only enqueue/pull sync, scoped to its repos.
const SERVICE_ACTIONS: ReadonlySet<WorkspaceAction> = new Set<WorkspaceAction>(["sync.push", "sync.pull"]);

/** True if `principal.repository_ids` permits touching `repositoryId` (or if no repository is named). */
export function scopeAllows(principal: Principal, repositoryId?: string): boolean {
  if (!repositoryId) return true;
  if (principal.repository_ids === "all") return true;
  return principal.repository_ids.includes(repositoryId);
}

/** May this principal perform `action`, optionally on `repositoryId`? Both role and scope must allow it. */
export function can(principal: Principal, action: WorkspaceAction, repositoryId?: string): boolean {
  const grantedByRole =
    principal.principal_type === "service"
      ? SERVICE_ACTIONS.has(action)
      : ROLE_ACTIONS[principal.role]?.has(action) === true;
  if (!grantedByRole) return false;
  return scopeAllows(principal, repositoryId);
}
