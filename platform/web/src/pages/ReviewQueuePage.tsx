import { useState } from "react";
import type { ReviewItemDto } from "../api/types";
import type { ReviewAction } from "../api/client";
import { EvidenceList } from "../components/EvidenceList";
import { KnowledgeDiff } from "../components/KnowledgeDiff";

// The review queue — the only place the portal WRITES. It is deliberately evidence-first: every item
// shows the current knowledge, the proposed change, the reason, the ground-truth evidence, the
// affected entity, the required role, the impact, and any decision already recorded. The reviewer
// decides against the full picture, never a bare "approve?" prompt.
//
// The self-approval gate is mirrored from the backend so the UI never offers a click the server will
// reject with 403: a high-impact (or non-automatic-policy) claim's proposer cannot approve their own
// claim. The blocked control is disabled AND the reason is spelled out — a silently greyed-out button
// is not an honest explanation. Server-side conflicts (403/409) are surfaced against the offending
// item, never swallowed.

export interface ReviewDecisionInput {
  action: ReviewAction;
  actor: string;
  expected_version: string;
  decision_note: string;
  edited_content?: string;
  opposing_claim_id?: string;
  assigned_to?: string | null;
}

// The outcome of the last mutation the container attempted, surfaced against its item.
export interface ReviewMutationFeedback {
  review_item_id: string;
  status: number;
  error?: string;
}

interface ReviewQueuePageProps {
  items: ReviewItemDto[];
  // The asserted acting identity (trust-on-assertion in the local single-user model). Every mutation
  // is attributed to this actor and gated against it.
  actor: string;
  onDecide: (item: ReviewItemDto, decision: ReviewDecisionInput) => void;
  lastResult?: ReviewMutationFeedback | null;
}

// A human, title-cased label for an item, derived from its entity slug (falling back to the claim
// id). Used for the item's accessible name and heading.
function itemTitle(item: ReviewItemDto): string {
  const source = item.entity_slug ?? item.claim_id;
  return source
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Mirror of the backend rule (mcp/vnext/api/review.ts:requiresAuthorizedReviewer): a high-impact or
// non-automatic-policy claim needs an authorized reviewer distinct from its proposer.
function requiresAuthorizedReviewer(item: ReviewItemDto): boolean {
  return (
    item.claim_impact === "high" ||
    item.claim_impact === "critical" ||
    item.claim_review_policy !== "automatic"
  );
}

const IMPACT_LABELS: Record<ReviewItemDto["claim_impact"], string> = {
  low: "Low impact",
  medium: "Medium impact",
  high: "High impact",
  critical: "Critical impact",
};

const STATUS_LABELS: Record<ReviewItemDto["status"], string> = {
  open: "Awaiting review",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
};

function feedbackMessage(feedback: ReviewMutationFeedback): string {
  switch (feedback.error) {
    case "version_conflict":
      return "This item changed since you loaded it. Reload the queue and review the current state before deciding again.";
    case "self_approval_blocked":
      return "You cannot approve your own high-impact claim. A different authorized reviewer must decide.";
    case "review_item_already_decided":
      return "This item was already decided by someone else. Reload the queue.";
    default:
      return `The decision could not be recorded (error ${feedback.status}${feedback.error ? `: ${feedback.error}` : ""}).`;
  }
}

function ReviewItemCard({
  item,
  actor,
  onDecide,
  feedback,
}: {
  item: ReviewItemDto;
  actor: string;
  onDecide: (item: ReviewItemDto, decision: ReviewDecisionInput) => void;
  feedback?: ReviewMutationFeedback | null;
}): React.ReactElement {
  const [note, setNote] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [assignee, setAssignee] = useState("");

  const title = itemTitle(item);
  const headingId = `review-${item.review_item_id}-title`;
  const noteId = `review-${item.review_item_id}-note`;
  const editId = `review-${item.review_item_id}-edit`;
  const assignId = `review-${item.review_item_id}-assign`;

  const isOpen = item.status === "open";
  const noteReady = note.trim().length > 0;
  const selfApprovalBlocked = actor === item.proposer && requiresAuthorizedReviewer(item);
  // Approving actions (accept / edit-and-accept / supersede) are gated by the self-approval rule.
  const canApprove = isOpen && noteReady && !selfApprovalBlocked;

  const base = (action: ReviewAction): ReviewDecisionInput => ({
    action,
    actor,
    expected_version: item.version,
    decision_note: note.trim(),
  });

  return (
    <article className="review-item" aria-labelledby={headingId} data-impact={item.claim_impact}>
      <header className="review-item-header">
        <p className="review-item-kind">{item.entity_kind ?? "claim"}</p>
        <h3 id={headingId}>{title}</h3>
        <ul className="review-item-facts">
          <li>{IMPACT_LABELS[item.claim_impact]}</li>
          <li>Required role: {item.required_role}</li>
          <li>Proposed by {item.proposer}</li>
          <li data-status={item.status}>{STATUS_LABELS[item.status]}</li>
        </ul>
      </header>

      <KnowledgeDiff current={item.current_claim_content} proposed={item.claim_content} />

      <section className="review-item-reason" aria-label="Reason for review">
        <h4>Why this needs review</h4>
        <p>{item.reason}</p>
      </section>

      <section className="review-item-evidence" aria-label="Supporting evidence">
        <h4>Evidence</h4>
        <EvidenceList evidence={item.evidence} />
      </section>

      {item.decision_note && (
        <section className="review-item-history" aria-label="Decision history">
          <h4>Recorded decision</h4>
          <p>
            {item.decided_by ? `${item.decided_by}: ` : ""}
            {item.decision_note}
          </p>
        </section>
      )}

      {feedback && (
        <p role="alert" className="review-item-feedback" data-status={feedback.status}>
          {feedbackMessage(feedback)}
        </p>
      )}

      {isOpen ? (
        <div className="review-item-actions">
          <div className="review-field">
            <label htmlFor={noteId}>Decision note</label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Record why you are making this decision."
            />
          </div>

          {selfApprovalBlocked && (
            <p className="review-self-approval muted">
              You proposed this claim. You cannot approve your own high-impact claim — a different
              authorized reviewer must accept, edit-and-accept, or supersede it.
            </p>
          )}

          <div className="review-buttons">
            <button type="button" disabled={!canApprove} onClick={() => onDecide(item, base("accept"))}>
              Accept
            </button>
            <button
              type="button"
              disabled={!canApprove || editedContent.trim().length === 0}
              onClick={() => onDecide(item, { ...base("edit-and-accept"), edited_content: editedContent.trim() })}
            >
              Edit &amp; accept
            </button>
            <button
              type="button"
              disabled={!canApprove || !item.current_claim_id}
              onClick={() =>
                onDecide(item, { ...base("supersede"), opposing_claim_id: item.current_claim_id ?? undefined })
              }
            >
              Accept and supersede current
            </button>
            <button
              type="button"
              disabled={!isOpen || !noteReady}
              onClick={() => onDecide(item, base("reject"))}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={!isOpen || !noteReady || assignee.trim().length === 0}
              onClick={() => onDecide(item, { ...base("assign"), assigned_to: assignee.trim() })}
            >
              Assign
            </button>
            <button
              type="button"
              disabled={!isOpen || !noteReady}
              onClick={() => onDecide(item, base("request-evidence"))}
            >
              Request more evidence
            </button>
          </div>

          <details className="review-secondary">
            <summary>Edit content or assign</summary>
            <div className="review-field">
              <label htmlFor={editId}>Edited claim content (for Edit &amp; accept)</label>
              <textarea
                id={editId}
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
              />
            </div>
            <div className="review-field">
              <label htmlFor={assignId}>Assign to</label>
              <input
                id={assignId}
                type="text"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              />
            </div>
          </details>
        </div>
      ) : (
        <p className="muted">
          This item is {STATUS_LABELS[item.status].toLowerCase()} and can no longer be decided.
        </p>
      )}
    </article>
  );
}

export function ReviewQueuePage({ items, actor, onDecide, lastResult }: ReviewQueuePageProps): React.ReactElement {
  return (
    <section aria-label="Review queue">
      <h1>Review queue</h1>
      <p className="muted">
        Acting as <strong>{actor}</strong>. Every decision is recorded under this identity.
      </p>
      {items.length === 0 ? (
        <p className="review-empty">No items are awaiting review.</p>
      ) : (
        <div className="review-list">
          {items.map((item) => (
            <ReviewItemCard
              key={item.review_item_id}
              item={item}
              actor={actor}
              onDecide={onDecide}
              feedback={lastResult && lastResult.review_item_id === item.review_item_id ? lastResult : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
