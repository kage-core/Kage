#!/usr/bin/env node
// Copy the built knowledge portal (platform/web/dist) INTO this package at dist/app, so it ships in
// the npm tarball and the daemon (resolvePortalDir) finds it in an installed layout. Without this,
// `kage viewer` -> /app/ 404s for every npm user (the 4.0.0 defect this fixes).
//
// Tolerant by default: if the portal has not been built, warn and skip so a plain `npm run build`
// during development still succeeds (a source checkout serves the portal from the monorepo path
// instead). Pass --require to FAIL when the portal is missing — used at publish time, where shipping
// a package without the portal is the bug.
import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mcpRoot = resolve(here, "..");
const source = resolve(mcpRoot, "..", "platform", "web", "dist");
const dest = resolve(mcpRoot, "dist", "app");
const require = process.argv.includes("--require");

const entry = join(source, "index.html");
if (!existsSync(entry)) {
  const msg = `bundle-portal: knowledge portal build not found at ${source}\n` +
    `  build it first:  npm --prefix ../platform/web run build`;
  if (require) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`${msg}\n  (skipping — a source checkout will serve the portal from the monorepo path)`);
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
// Ship the runtime assets; drop source maps (dev-only, and they bloat the tarball).
cpSync(source, dest, {
  recursive: true,
  filter: (src) => !src.endsWith(".map"),
});
console.log(`bundle-portal: copied knowledge portal -> ${dest.replace(`${mcpRoot}/`, "")}`);
