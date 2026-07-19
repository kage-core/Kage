// Authorized review mutations — the ONLY write surface the knowledge portal exposes. Every mutation
// is a pure dispatch over the repository model: it validates the request envelope, proves the item is
// the one the reviewer saw (optimistic version), enforces the self-approval gate BEFORE any write,
// and delegates the atomic multi-row write to a single transactional Repository method.
//
// The machine token (checked in server.ts) proves a LOCAL OPERATOR, nothing more. In the local
// single-user model the acting identity is trust-on-assertion: `actor` comes from the request body,
// not from the token, because the token carries no identity. Phase E replaces this with a real
// workspace identity; until then the honest posture is "the operator asserts who they are, and that
// assertion is recorded as the decision's provenance."
//
// Honesty gates enforced here, mirrored by the frontend so the UI never offers a rejected click:
//   - self-approval: a high-impact (or non-automatic-policy) claim CANNOT be approved by its proposer
//     → 403 self_approval_blocked, before any write;
//   - optimistic concurrency: a stale `expected_version` → 409 version_conflict;
//   - contradiction acceptance atomically supersedes the opposing current claim.

import { ReviewStateError, type Repository } from "../repo-model/repository.js";
import type { ClaimRecord } from "../repo-model/types.js";
import { claimDto, reviewItemDto, reviewItemVersion } from "./read-models.js";

export type ReviewAction =
  | "accept"
  | "edit-and-accept"
  | "reject"
  | "supersede"
  | "assign"
  | "request-evidence";

export const REVIEW_ACTIONS: ReadonlySet<string> = new Set<ReviewAction>([
  "accept",
  "edit-and-accept",
  "reject",
  "supersede",
  "assign",
  "request-evidence",
]);

export interface ReviewResult {
  status: number;
  body: unknown;
}

interface ParsedRequest {
  actor: string;
  expectedVersion: string;
  decisionNote: string;
  editedContent?: string;
  opposingClaimId?: string;
  assignedTo: string | null;
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}): ReviewResult {
  return { status, body: { ok: false, error, ...extra } };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Parse and validate the shared request envelope. Every mutation requires a non-empty `actor`,
// `expected_version`, and `decision_note`; per-action fields are validated by the caller.
function parseRequest(raw: unknown): { ok: true; value: ParsedRequest } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid_request" };
  const body = raw as Record<string, unknown>;

  const actor = asString(body.actor)?.trim();
  if (!actor) return { ok: false, error: "missing_actor" };

  const expectedVersion = asString(body.expected_version)?.trim();
  if (!expectedVersion) return { ok: false, error: "missing_expected_version" };

  const decisionNote = asString(body.decision_note)?.trim();
  if (!decisionNote) return { ok: false, error: "missing_decision_note" };

  const editedContentRaw = body.edited_content;
  if (editedContentRaw !== undefined && asString(editedContentRaw) === null) {
    return { ok: false, error: "invalid_edited_content" };
  }
  const opposingClaimRaw = body.opposing_claim_id;
  if (opposingClaimRaw !== undefined && asString(opposingClaimRaw) === null) {
    return { ok: false, error: "invalid_opposing_claim_id" };
  }
  const assignedToRaw = body.assigned_to;
  if (assignedToRaw !== undefined && assignedToRaw !== null && asString(assignedToRaw) === null) {
    return { ok: false, error: "invalid_assigned_to" };
  }

  return {
    ok: true,
    value: {
      actor,
      expectedVersion,
      decisionNote,
      editedContent: asString(editedContentRaw)?.trim() || undefined,
      opposingClaimId: asString(opposingClaimRaw)?.trim() || undefined,
      assignedTo: assignedToRaw === undefined ? null : (asString(assignedToRaw)?.trim() || null),
    },
  };
}

// A high-impact or non-automatic-policy claim demands an authorized reviewer distinct from its
// proposer. An `automatic`, low/medium-impact claim carries no such requirement (it never needed a
// human gate to begin with), so its proposer accepting it is not a self-approval violation.
function requiresAuthorizedReviewer(claim: ClaimRecord): boolean {
  return claim.impact_class === "high" || claim.impact_class === "critical" || claim.review_policy !== "automatic";
}

// Map a repository-layer conflict to an HTTP status. `already_decided`/terminal/mismatch are all
// lost-update conflicts (the reviewer acted on a stale view) → 409; a genuinely absent claim/item is
// 404. Anything else is a real bug and surfaces as 500 (the caller rethrows).
function mapReviewStateError(error: ReviewStateError): ReviewResult {
  switch (error.code) {
    case "review_item_not_found":
    case "claim_not_found":
    case "opposing_claim_not_found":
      return fail(404, error.code);
    case "review_item_already_decided":
    case "claim_terminal":
    case "opposing_claim_terminal":
    case "review_item_claim_mismatch":
    case "opposing_claim_is_accepted_claim":
    case "opposing_claim_slot_mismatch":
      return fail(409, error.code);
    default:
      return fail(409, error.code);
  }
}

/**
 * Dispatch a review mutation. Returns a `{status, body}` result; the HTTP layer serializes it. Pure
 * over the model + request — no transport, no globals — so it is unit-testable and the honesty gates
 * live in one place.
 */
export function handleReviewMutation(
  model: Repository,
  reviewItemId: string,
  action: ReviewAction,
  rawBody: unknown,
): ReviewResult {
  const parsed = parseRequest(rawBody);
  if (!parsed.ok) return fail(400, parsed.error);
  const req = parsed.value;

  const item = model.getReviewItem(reviewItemId);
  if (!item) return fail(404, "review_item_not_found");
  const claim = model.getClaim(item.claim_id);
  if (!claim) return fail(404, "claim_not_found");

  // Optimistic concurrency: the reviewer must have decided against the item's current state.
  if (reviewItemVersion(item) !== req.expectedVersion) {
    return fail(409, "version_conflict", { current_version: reviewItemVersion(item) });
  }

  // Self-approval — enforced BEFORE any write. `accept`, `edit-and-accept`, and `supersede` all move a
  // claim into the injectable `approved` state; the proposer may not do that to a claim that needed an
  // authorized reviewer.
  const approving = action === "accept" || action === "edit-and-accept" || action === "supersede";
  if (approving && req.actor === claim.created_by && requiresAuthorizedReviewer(claim)) {
    return fail(403, "self_approval_blocked");
  }

  try {
    switch (action) {
      case "accept": {
        const { review, claim: updated } = model.acceptReviewItem(reviewItemId, req.actor, req.decisionNote);
        return { status: 200, body: { review: reviewItemDto(model, review), accepted: claimDto(model, updated) } };
      }
      case "reject": {
        const { review } = model.rejectReviewItem(reviewItemId, req.actor, req.decisionNote);
        return { status: 200, body: { review: reviewItemDto(model, review) } };
      }
      case "supersede": {
        if (!req.opposingClaimId) return fail(400, "missing_opposing_claim_id");
        const { accepted, replaced, review } = model.resolveContradiction(
          item.claim_id,
          req.opposingClaimId,
          reviewItemId,
          req.actor,
          req.decisionNote,
        );
        return {
          status: 200,
          body: {
            review: reviewItemDto(model, review),
            accepted: claimDto(model, accepted),
            replaced: claimDto(model, replaced),
          },
        };
      }
      case "edit-and-accept": {
        if (!req.editedContent) return fail(400, "missing_edited_content");
        const { accepted, review } = model.editAndAcceptReviewItem(
          reviewItemId,
          req.editedContent,
          req.actor,
          req.decisionNote,
        );
        return { status: 200, body: { review: reviewItemDto(model, review), accepted: claimDto(model, accepted) } };
      }
      case "assign": {
        const { review } = model.assignReviewItem(reviewItemId, req.assignedTo, req.decisionNote);
        return { status: 200, body: { review: reviewItemDto(model, review) } };
      }
      case "request-evidence": {
        const { review } = model.requestEvidenceForReviewItem(reviewItemId, req.decisionNote);
        return { status: 200, body: { review: reviewItemDto(model, review) } };
      }
    }
  } catch (error) {
    if (error instanceof ReviewStateError) return mapReviewStateError(error);
    throw error;
  }
}
