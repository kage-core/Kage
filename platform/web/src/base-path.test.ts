import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The portal is served by the daemon under `/app/` and drives its own client-side routing, so a user
// can deep-link or reload ANY route, including two-segment detail routes like `/app/decisions/<slug>`.
// A RELATIVE Vite base (`./`) makes the browser resolve `./assets/...` against the current route's
// directory — for a two-segment route that is `/app/decisions/assets/...`, which the daemon answers
// with index.html (SPA fallback); the browser then executes HTML as JavaScript and the app renders
// BLANK. An absolute `/app/` base resolves to `/app/assets/...` at every depth. This guards that
// invariant, which a relative base silently violated for every detail deep-link.

const here = dirname(fileURLToPath(import.meta.url));

describe("portal asset base path", () => {
  it("is the absolute /app/ mount, never relative (relative breaks deep-linked detail routes)", () => {
    const config = readFileSync(join(here, "..", "vite.config.ts"), "utf8");
    expect(config).toMatch(/base:\s*["']\/app\/["']/);
    expect(config).not.toMatch(/base:\s*["']\.\/?["']/);
  });
});
