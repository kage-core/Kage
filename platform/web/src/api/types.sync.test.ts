import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

// The mandated guarantee for Phase C Task 2 is that the backend/frontend DTOs CANNOT drift. The
// drift guard (`scripts/sync-types.mjs --check`) is only a guarantee if an automated gate actually
// runs it: `npm test`, `npm run build`, and CI. These tests pin that enforcement so it can never be
// silently unwired again.

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..", "..");
const repoRoot = resolve(webRoot, "..", "..");

describe("DTO drift guard enforcement", () => {
  test("committed portal DTOs are in sync with the backend read-model", () => {
    // Runs the real guard in-process to `npm test`, so drift fails the frontend suite directly.
    const run = () =>
      execFileSync("node", ["scripts/sync-types.mjs", "--check"], {
        cwd: webRoot,
        encoding: "utf8",
        stdio: "pipe",
      });
    expect(run).not.toThrow();
  });

  test("the build script runs the drift guard before compiling", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(webRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("check-types");
  });

  test("the test script runs the drift guard", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(webRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.test).toContain("check-types");
  });

  test("CI runs the platform/web drift guard", () => {
    const ci = readFileSync(
      resolve(repoRoot, ".github/workflows/ci.yml"),
      "utf8",
    );
    // CI must both target platform/web and invoke the guard, so DTO drift fails the pipeline.
    expect(ci).toContain("platform/web");
    expect(ci).toContain("check-types");
  });
});
