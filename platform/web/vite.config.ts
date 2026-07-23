/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The knowledge portal is served by the Kage daemon under `/app/` behind a strict CSP
// (`script-src 'self'`, `connect-src 'self'`). Assets are self-hosted under the ABSOLUTE `/app/`
// base — NOT relative. A relative base (`./`) resolves `./assets/...` against the current route's
// directory, so a two-segment deep link like `/app/decisions/<slug>` requests
// `/app/decisions/assets/...`; the daemon's SPA fallback answers that with index.html, the browser
// executes HTML as JavaScript, and the whole app renders blank. An absolute `/app/` base always
// resolves to `/app/assets/...` at any route depth, and same-origin still satisfies `script-src 'self'`.
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Playwright drives real browser journeys under `e2e/`; keep them out of the Vitest run.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
