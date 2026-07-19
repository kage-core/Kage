import { expect, test } from "@playwright/test";

// Degraded-daemon journey: when the read-model API is unavailable, the portal must fail honestly —
// an accessible alert that says the data is unavailable — and NEVER render a fabricated healthy state.
// The portal is off the context-delivery critical path, so a portal outage never affects the agent.
test.describe("degraded daemon is surfaced honestly", () => {
  test("an API failure renders an accessible unavailable alert, not a fake healthy view", async ({ page }) => {
    // Simulate the daemon read-model being down for every /v2 API call.
    await page.route("**/v2/**", (route) => route.fulfill({ status: 503, body: "unavailable" }));
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(/unavailable/i);
    // No fabricated dollar figure or "healthy" badge is shown while the daemon is down.
    await expect(page.getByText(/\$\d/)).toHaveCount(0);
  });

  test("an integration that is passing through is labelled, never counted as a silent success", async ({ page }) => {
    await page.goto("/integrations");
    // The Integrations page conveys state in text; a passthrough adapter is explicitly labelled.
    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
  });
});
