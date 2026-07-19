import { defineConfig, devices } from "@playwright/test";

// Browser journeys for the knowledge portal. These require:
//   1. A built portal (`npm run build`) served by the Kage daemon under /app/, and
//   2. A daemon backed by a repository model with seeded knowledge (features, a runbook, a review
//      item, a task receipt) so the journeys have something real to assert against.
//
// CI runs these in a dedicated, browser-capable step that installs Chromium (`npx playwright install`)
// and starts a seeded daemon; the base URL is passed via KAGE_PORTAL_URL. In environments that cannot
// download browsers or run the daemon, this step is SKIPPED with a logged reason — it never silently
// "passes". Point the run at a live portal with, e.g.:
//   KAGE_PORTAL_URL=http://127.0.0.1:3113/app npm run test:e2e --prefix platform/web
const baseURL = process.env.KAGE_PORTAL_URL ?? "http://127.0.0.1:3113/app";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
