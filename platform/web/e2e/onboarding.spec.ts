import { expect, test } from "@playwright/test";

// Onboarding / shell journey: a fresh operator lands on the portal and sees the accessible shell —
// skip link, the "Repository knowledge" navigation landmark, and the audit-mode posture — before any
// data is present. A repository with no measured metrics or integrations shows local onboarding
// rather than an empty overview that implies success.
test.describe("onboarding and the accessible shell", () => {
  test("the portal presents an accessible shell with the primary navigation landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Repository knowledge" })).toBeVisible();
    // The skip link is the first focusable element and targets the main region.
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toHaveAttribute("href", "#main-content");
  });

  test("a fresh repository is guided through local audit-mode onboarding", async ({ page }) => {
    await page.goto("/");
    // Audit mode never modifies agent requests — the onboarding flow says so explicitly.
    await expect(page.getByText(/audit mode/i)).toBeVisible();
    await expect(page.getByText(/does not modify agent requests/i)).toBeVisible();
    // The local flow never asks for a team account or GitHub write permission.
    await expect(page.getByText(/team account/i)).toHaveCount(0);
  });
});
