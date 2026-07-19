// Team knowledge ownership — who is authorized to review which claims.
//
// A claim's review_policy plus the entity it belongs to determine WHICH scope of owner must sign off.
// Resolution walks from the MOST SPECIFIC applicable scope outward and stops at the first scope that has
// an assigned owner; if no scope is assigned anywhere, it falls back to any workspace knowledge owner
// (a role-based check made by the caller). Ownership never crosses a workspace: every query is scoped by
// workspace_id, and a repository-scoped assignment is additionally keyed by repository_id.
import type { Db } from "./db.js";
import type { ClaimRecord } from "../repo-model/types.js";

/** The ownership scopes a principal can be assigned. Ordered elsewhere from most to least specific. */
export type OwnershipScope =
  | "repository"
  | "feature"
  | "component"
  | "runbook"
  | "security"
  | "operations";

export interface OwnerAssignment {
  workspace_id: string;
  repository_id: string;
  scope_type: OwnershipScope;
  /** Entity id for component/feature/runbook; repository id for repository/security/operations. */
  scope_ref: string;
  principal_id: string;
}

/** Assign an owner to a scope. Idempotent: re-assigning the same (scope, principal) is a no-op. */
export async function assignOwner(db: Db, assignment: OwnerAssignment): Promise<void> {
  await db.query(
    `INSERT INTO workspace_owners(workspace_id, repository_id, scope_type, scope_ref, principal_id)
       VALUES($1, $2, $3, $4, $5)
     ON CONFLICT (workspace_id, repository_id, scope_type, scope_ref, principal_id) DO NOTHING`,
    [assignment.workspace_id, assignment.repository_id, assignment.scope_type, assignment.scope_ref, assignment.principal_id],
  );
}

/**
 * The scope precedence for a claim's review_policy, most specific first. `owner` policy is satisfied by
 * the entity's component/feature/runbook owner, then the repository owner. `security`/`operations`
 * policies require their named repo-wide scope. `automatic` requires no independent owner scope at all.
 */
function candidateScopes(claim: Pick<ClaimRecord, "review_policy">): Array<{ scope: OwnershipScope; keyed_by: "entity" | "repository" }> {
  switch (claim.review_policy) {
    case "security":
      return [{ scope: "security", keyed_by: "repository" }];
    case "operations":
      return [{ scope: "operations", keyed_by: "repository" }];
    case "owner":
      return [
        { scope: "component", keyed_by: "entity" },
        { scope: "feature", keyed_by: "entity" },
        { scope: "runbook", keyed_by: "entity" },
        { scope: "repository", keyed_by: "repository" },
      ];
    case "automatic":
    default:
      return [];
  }
}

export interface ReviewAuthority {
  /** The scope that resolved the required reviewers, or "workspace" when nothing specific is assigned. */
  scope: OwnershipScope | "workspace";
  /** The principals explicitly required to review; empty when falling back to workspace knowledge owners. */
  owner_ids: string[];
  /** True when no specific owner is assigned, so any workspace knowledge owner may review (role gate). */
  fallback_to_knowledge_owners: boolean;
}

/**
 * Resolve who may review this claim. Walks candidate scopes most-specific first and returns the owners of
 * the first scope that has any assignment. When none is assigned (or the policy needs no owner scope),
 * returns a fallback that the caller satisfies with a workspace knowledge-owner role check. Every query
 * is tenant-scoped by workspace_id (+ repository_id), so ownership can never leak across tenants.
 */
export async function resolveReviewAuthority(
  db: Db,
  input: { workspace_id: string; repository_id: string; entity_id: string; review_policy: ClaimRecord["review_policy"] },
): Promise<ReviewAuthority> {
  for (const { scope, keyed_by } of candidateScopes(input)) {
    const scopeRef = keyed_by === "entity" ? input.entity_id : input.repository_id;
    const { rows } = await db.query<{ principal_id: string }>(
      `SELECT principal_id FROM workspace_owners
        WHERE workspace_id = $1 AND repository_id = $2 AND scope_type = $3 AND scope_ref = $4
        ORDER BY principal_id`,
      [input.workspace_id, input.repository_id, scope, scopeRef],
    );
    if (rows.length > 0) {
      return { scope, owner_ids: rows.map((r) => r.principal_id), fallback_to_knowledge_owners: false };
    }
  }
  return { scope: "workspace", owner_ids: [], fallback_to_knowledge_owners: true };
}
