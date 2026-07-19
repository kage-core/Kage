import { expect, test } from "@playwright/test";

// Runbook journey: a runbook page must never imply an operational success it cannot prove. When no
// successful execution has been recorded, it says exactly that — the literal honesty gate — rather
// than omitting the field in a way that reads as "all good". Current, verified truth is shown in a
// region kept separate from history and uncertainty.
test.describe("runbook current truth and honest execution state", () => {
  // The seeded runbook slug the CI fixture publishes; override with KAGE_RUNBOOK_SLUG if needed.
  const slug = process.env.KAGE_RUNBOOK_SLUG ?? "rotate-signing-keys";

  test("a runbook with no recorded execution says so instead of implying success", async ({ page }) => {
    await page.goto(`/runbooks/${slug}`);
    await expect(page.getByRole("region", { name: "Last successful execution" })).toBeVisible();
    await expect(page.getByText("No successful execution has been recorded")).toBeVisible();
  });

  test("current truth is presented separately from history and uncertainty", async ({ page }) => {
    await page.goto(`/runbooks/${slug}`);
    await expect(page.getByRole("region", { name: "Current truth" })).toBeVisible();
  });
});
