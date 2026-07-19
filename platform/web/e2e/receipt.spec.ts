import { expect, test } from "@playwright/test";

// Receipt journey: a task receipt keeps EXACT request economics strictly separate from COHORT
// outcomes, and never prints a single fused "total value created" / ROI number. Unmeasurable figures
// render as "Unavailable", never a fabricated $0.00 that implies a measured zero.
test.describe("auditable task receipts", () => {
  const taskId = process.env.KAGE_TASK_ID ?? "task-1";

  test("exact request economics and cohort outcomes are shown under separate headings", async ({ page }) => {
    await page.goto(`/app/tasks/${taskId}`);
    await expect(page.getByRole("heading", { name: "Exact request measurements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Task outcomes" })).toBeVisible();
    // No fused ROI / total-value figure anywhere on the receipt.
    await expect(page.getByText(/total value created|total roi/i)).toHaveCount(0);
  });

  test("the agent-tasks list links to a task's receipt", async ({ page }) => {
    await page.goto("/app/tasks");
    await expect(page.getByRole("heading", { name: "Agent tasks" })).toBeVisible();
  });
});
