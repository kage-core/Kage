// Team-scoped review authority — the workspace's authoritative write for a claim's trust.
//
// This mirrors the Phase C mutation contract (api/review.ts) at TEAM scope, enforced against real
// ownership rather than a single local operator:
//   - AUTHORITY. An approving decision (accept/supersede) requires the knowledge.review role AND that the
//     principal satisfies the claim's ownership scope (the most specific assigned owner, or any workspace
//     knowledge owner when nothing is assigned). A reject withholds trust and needs only the review role.
//   - OPTIMISTIC CONCURRENCY. The reviewer must prove they acted on the current version; a stale
//     expected_version is a 409, never a silent overwrite.
//   - NO SELF-APPROVAL. The proposer of a claim that needs an authorized reviewer cannot approve it (403).
//   - AUDIT. Every decision appends one immutable audit event, atomically with the write it records.
// Tenant isolation is absolute: the claim is loaded under the SERVER-resolved principal.workspace_id, so
// a decision aimed at another tenant's repository finds no claim and returns 404 (existence undisclosed).
import { randomUUID } from "node:crypto";
import type { Db } from "./db.js";
import type { Principal } from "./auth/types.js";
import { can } from "./auth/authorize.js";
import { resolveReviewAuthority } from "./ownership.js";
import { recordAuditEvent } from "./audit.js";
import type { ClaimRecord } from "../repo-model/types.js";

export type ReviewAction = "accept" | "reject" | "supersede";

export interface ReviewClaimRequest {
  workspace_id: string;
  repository_id: string;
  claim_id: string;
  /** The claim version the reviewer saw; drift against the stored head is a 409, not a write. */
  expected_version: string;
  action: ReviewAction;
  decision_note: string;
  /** Optional request id recorded in the audit metadata for traceability. */
  request_id?: string;
}

export interface ReviewOutcome {
  status: number;
  claim_id: string;
  error?: string;
  version?: string;
}

/** A high-impact/critical claim, or any non-automatic-policy claim, demands an independent reviewer. */
function requiresAuthorizedReviewer(claim: Pick<ClaimRecord, "impact_class" | "review_policy">): boolean {
  return claim.impact_class === "high" || claim.impact_class === "critical" || claim.review_policy !== "automatic";
}

/** The trust state a decision moves a claim into. */
function nextTrustState(action: ReviewAction): ClaimRecord["trust_state"] {
  switch (action) {
    case "accept":
    case "supersede":
      return "verified";
    case "reject":
      return "disputed";
  }
}

/**
 * Apply a team review decision to a claim. Pure authority + audit: it never touches the low-latency local
 * context path. Returns a status/outcome rather than throwing so the HTTP layer maps it directly.
 */
export async function reviewClaim(
  db: Db,
  principal: Principal,
  request: ReviewClaimRequest,
): Promise<ReviewOutcome> {
  const workspaceId = principal.workspace_id; // SERVER-resolved tenant, never the client's field.
  const { repository_id: repositoryId, claim_id: claimId } = request;

  // Load the claim under the principal's tenant. A cross-tenant/out-of-scope target simply is not found.
  const { rows } = await db.query<{ record_json: ClaimRecord }>(
    `SELECT record_json FROM workspace_claims WHERE workspace_id = $1 AND repository_id = $2 AND claim_id = $3`,
    [workspaceId, repositoryId, claimId],
  );
  const claim = rows[0]?.record_json;
  if (!claim) return { status: 404, claim_id: claimId, error: "claim_not_found" };

  const approving = request.action === "accept" || request.action === "supersede";

  // Optimistic concurrency: prove the reviewer acted on the version currently stored.
  const priorVersion = claim.updated_at;
  if (request.expected_version !== priorVersion) {
    return { status: 409, claim_id: claimId, error: "version_conflict" };
  }

  // Authority. Every action needs the review role for this repository. An approving action additionally
  // needs the principal to satisfy the claim's ownership scope.
  if (!can(principal, "knowledge.review", repositoryId)) {
    return { status: 403, claim_id: claimId, error: "review_authority_required" };
  }
  if (approving) {
    const authority = await resolveReviewAuthority(db, {
      workspace_id: workspaceId,
      repository_id: repositoryId,
      entity_id: claim.entity_id,
      review_policy: claim.review_policy,
    });
    const satisfiesScope = authority.fallback_to_knowledge_owners || authority.owner_ids.includes(principal.principal_id);
    if (!satisfiesScope) {
      return { status: 403, claim_id: claimId, error: "review_authority_required" };
    }
    // No self-approval on a claim that needed an independent reviewer to begin with.
    if (principal.principal_id === claim.created_by && requiresAuthorizedReviewer(claim)) {
      return { status: 403, claim_id: claimId, error: "self_approval_blocked" };
    }
  }

  const newVersion = bumpVersion(priorVersion);
  const nextTrust = nextTrustState(request.action);
  const updatedClaim: ClaimRecord = { ...claim, trust_state: nextTrust, updated_at: newVersion };

  // The claim update, its decision row and the audit event are ONE unit on ONE connection: a decision
  // that is visible without its audit trail (or an audit trail for a decision that never landed) would
  // make the review record unfalsifiable. `db.transaction` owns the connection for the whole unit.
  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE workspace_claims
          SET trust_state = $4, record_json = $5, updated_at = $6
        WHERE workspace_id = $1 AND repository_id = $2 AND claim_id = $3`,
      [workspaceId, repositoryId, claimId, nextTrust, JSON.stringify(updatedClaim), newVersion],
    );
    await tx.query(
      `INSERT INTO workspace_review_decisions(workspace_id, repository_id, decision_id, claim_id, action, actor_id, expected_version, decision_note, decided_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [workspaceId, repositoryId, randomUUID(), claimId, request.action, principal.principal_id, request.expected_version, request.decision_note, newVersion],
    );
    await recordAuditEvent(tx, {
      workspace_id: workspaceId,
      actor_type: principal.principal_type,
      actor_id: principal.principal_id,
      action: `knowledge.review.${request.action}`,
      target_type: "claim",
      target_id: claimId,
      // Provenance only — never a raw prompt or tool payload.
      metadata: {
        request_id: request.request_id,
        prior_version: priorVersion,
        new_version: newVersion,
        reason: request.decision_note,
      },
    });
  });

  return { status: 202, claim_id: claimId, version: newVersion };
}

/** Produce a strictly newer ISO version token; guarantees it differs from the prior one to the millisecond. */
function bumpVersion(prior: string): string {
  const now = Date.now();
  const priorMs = Date.parse(prior);
  const next = Number.isFinite(priorMs) && now <= priorMs ? priorMs + 1 : now;
  return new Date(next).toISOString();
}
