/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The knowledge portal is served by the Kage daemon under `/app/` behind a strict CSP
// (`script-src 'self'`, `connect-src 'self'`). Emit only self-hosted, relative assets — no
// CDN, no inline scripts — so the built bundle satisfies that policy.
export default defineConfig({
  base: "./",
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
