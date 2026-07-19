import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ReviewQueuePage } from "./ReviewQueuePage";
import { fixtureReviewItem } from "../test/fixtures";

describe("ReviewQueuePage", () => {
  test("each item shows current knowledge, the proposed change, reason, and evidence", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem()]}
        actor="human:reviewer"
        onDecide={vi.fn()}
      />,
    );
    // Evidence-first: the proposed change, the current knowledge it would displace, the reason, and
    // the ground-truth evidence anchor are all present.
    expect(
      screen.getByText("Authentication supports hardware passkeys as a first-class factor."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Authentication supports TOTP and SMS second factors only."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("high-impact behavior change requires owner approval"),
    ).toBeInTheDocument();
    expect(screen.getByText("mcp/vnext/runtime/server.ts:178-196")).toBeInTheDocument();
  });

  test("a high-impact claim proposed by the current actor disables accept and explains self-approval is blocked", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem({ proposer: "agent:opus" })]}
        actor="agent:opus"
        onDecide={vi.fn()}
      />,
    );
    const accept = screen.getByRole("button", { name: "Accept" });
    expect(accept).toBeDisabled();
    // The reason is spelled out, not left as a silently greyed-out control.
    expect(screen.getByText(/cannot approve your own high-impact claim/i)).toBeInTheDocument();
  });

  test("an item the actor did not propose offers an enabled accept action once a note is written", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem({ proposer: "agent:opus" })]}
        actor="human:reviewer"
        onDecide={vi.fn()}
      />,
    );
    const note = screen.getByLabelText(/decision note/i);
    fireEvent.change(note, { target: { value: "Verified against the passkey RFC." } });
    expect(screen.getByRole("button", { name: "Accept" })).toBeEnabled();
  });

  test("accepting sends the actor, the item version, and the decision note for optimistic concurrency", () => {
    const onDecide = vi.fn();
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem({ proposer: "agent:opus", version: "v-passkey-1" })]}
        actor="human:reviewer"
        onDecide={onDecide}
      />,
    );
    fireEvent.change(screen.getByLabelText(/decision note/i), {
      target: { value: "Verified against the passkey RFC." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onDecide).toHaveBeenCalledTimes(1);
    const [item, decision] = onDecide.mock.calls[0];
    expect(item.review_item_id).toBe("ri-passkey");
    expect(decision).toMatchObject({
      action: "accept",
      actor: "human:reviewer",
      expected_version: "v-passkey-1",
      decision_note: "Verified against the passkey RFC.",
    });
  });

  test("accept stays disabled until a decision note is written", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem({ proposer: "agent:opus" })]}
        actor="human:reviewer"
        onDecide={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
  });

  test("a version conflict from the server is surfaced against the offending item", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem()]}
        actor="human:reviewer"
        onDecide={vi.fn()}
        lastResult={{ review_item_id: "ri-passkey", status: 409, error: "version_conflict" }}
      />,
    );
    const item = screen.getByRole("article", { name: /Authentication/ });
    expect(within(item).getByRole("alert")).toHaveTextContent(/changed since you loaded it/i);
  });

  test("each item names the review authority that must sign off (team ownership scope)", () => {
    render(
      <ReviewQueuePage
        items={[fixtureReviewItem({ claim_review_policy: "security" })]}
        actor="human:reviewer"
        onDecide={vi.fn()}
      />,
    );
    // The reviewer sees WHICH owner scope is required, not just an opaque role, so team ownership is
    // legible on the queue itself.
    expect(screen.getByText(/Security owner sign-off/i)).toBeInTheDocument();
  });

  test("an empty queue is stated honestly, not omitted", () => {
    render(<ReviewQueuePage items={[]} actor="human:reviewer" onDecide={vi.fn()} />);
    expect(screen.getByText(/no items are awaiting review/i)).toBeInTheDocument();
  });
});
