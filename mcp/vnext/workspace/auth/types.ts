// Workspace identity, roles, and authorization vocabulary.
//
// A Principal is the *server-resolved* identity for a request: never trust a client-supplied workspace
// id, role, or repository scope — every field here is loaded from the session row and its principal
// record inside the database, then used to tenant-scope every downstream query. Roles gate ACTIONS;
// repository scope gates WHICH repositories within the (single) workspace a principal may touch.

/** Human team roles. Ordered loosely by privilege but authority is defined by the action map, not order. */
export type WorkspaceRole = "owner" | "admin" | "knowledge_owner" | "developer" | "viewer";

/** A non-human principal — a local daemon service token — restricted to sync on its own repositories. */
export type PrincipalType = "user" | "service";

/** The discrete authority checks the workspace enforces. Every mutating route maps to one of these. */
export type WorkspaceAction =
  | "workspace.manage"
  | "repository.connect"
  | "knowledge.read"
  | "knowledge.review"
  | "policy.manage"
  | "metrics.read"
  | "billing.manage"
  | "audit.read"
  | "sync.push"
  | "sync.pull";

export interface Principal {
  principal_id: string;
  workspace_id: string;
  principal_type: PrincipalType;
  role: WorkspaceRole;
  /** Repositories this principal may access, or "all" for the whole workspace. Never crosses workspaces. */
  repository_ids: string[] | "all";
}
