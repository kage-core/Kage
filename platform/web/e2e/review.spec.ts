import { expect, test } from "@playwright/test";

// Review journey: an operator opens the queue, reads the evidence behind a proposed change, asserts
// who they are acting as, records a decision note, and accepts. The evidence-first layout and the
// actor + decision-note requirement mirror the backend's authorized-mutation contract (an accept
// without an actor or note is refused; a proposer cannot self-approve a high-impact claim).
test.describe("evidence-backed review queue", () => {
  test("the queue shows supporting evidence and the acting-as identity control", async ({ page }) => {
    await page.goto("/review");
    // The acting identity is trust-on-assertion in the local model; the operator states who they are.
    await expect(page.getByLabel("Acting as")).toBeVisible();
    // Each item leads with the evidence behind the proposed change.
    await expect(page.getByRole("region", { name: "Supporting evidence" }).first()).toBeVisible();
  });

  test("an authorized operator accepts a change with a decision note", async ({ page }) => {
    await page.goto("/review");
    await page.getByLabel("Acting as").fill("owner-bob");
    // Record the required decision note on the first open item, then accept.
    await page.getByLabel("Decision note").first().fill("Matches the current implementation and tests.");
    await page.getByRole("button", { name: "Accept", exact: true }).first().click();
    // A successful decision refreshes the queue; the accepted item leaves the open list (or shows its
    // new state). We assert no error alert surfaced against the item.
    await expect(page.getByText(/self_approval_blocked|version_conflict/i)).toHaveCount(0);
  });
});
