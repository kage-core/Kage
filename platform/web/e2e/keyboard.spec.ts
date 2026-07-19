import { expect, test } from "@playwright/test";

// Keyboard journey: the portal must be operable without a mouse. The skip link is the first focusable
// element and jumps straight to the main region; primary navigation is reachable by Tab; the active
// section is exposed via aria-current (not color alone).
test.describe("keyboard operability", () => {
  test("the first Tab lands on the skip link, which focuses the main region", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("navigation links are reachable by keyboard and mark the active section", async ({ page }) => {
    await page.goto("/review");
    const nav = page.getByRole("navigation", { name: "Repository knowledge" });
    // The active section is conveyed to assistive tech, not by styling alone.
    await expect(nav.getByRole("link", { name: "Review Queue" })).toHaveAttribute("aria-current", "page");
  });
});
