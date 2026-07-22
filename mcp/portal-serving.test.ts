import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolvePortalDir, resolveAppAsset } from "./daemon.js";

// The knowledge portal (`/app/`) 404'd for every npm user in 4.0.0: the daemon only ever looked at
// the monorepo path (`../../platform/web/dist`), which does not exist in an installed package, AND
// the build was never bundled into the tarball. These tests pin both halves of the fix so the
// portal cannot silently ship broken again.

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "kage-portal-"));
}

test("resolvePortalDir prefers the bundled dist/app when it has an index.html", () => {
  // Installed layout: __dirname is <pkg>/dist and the portal is bundled at <pkg>/dist/app.
  const distDir = join(tmp(), "dist");
  const appDir = join(distDir, "app");
  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, "index.html"), "<!doctype html><title>portal</title>", "utf8");
  assert.equal(resolvePortalDir(distDir), resolve(appDir));
});

test("resolvePortalDir falls back to the monorepo build for a source checkout", () => {
  // Source layout: <root>/mcp/dist is __dirname, portal is two levels up at <root>/platform/web/dist.
  const root = tmp();
  const distDir = join(root, "mcp", "dist");
  mkdirSync(distDir, { recursive: true });
  const monorepo = join(root, "platform", "web", "dist");
  mkdirSync(monorepo, { recursive: true });
  writeFileSync(join(monorepo, "index.html"), "<!doctype html>", "utf8");
  assert.equal(resolvePortalDir(distDir), resolve(monorepo));
});

test("resolvePortalDir returns the bundled path when the portal was never built", () => {
  // Neither location has an index.html; return the bundled path so /app/ yields a coherent
  // portal_not_built 404 rather than pointing at a directory that does not exist.
  const distDir = join(tmp(), "dist");
  mkdirSync(distDir, { recursive: true });
  assert.equal(resolvePortalDir(distDir), resolve(distDir, "app"));
});

test("resolveAppAsset serves the entry for /app/ and SPA-falls-back for client routes", () => {
  const appDir = join(tmp(), "app");
  mkdirSync(join(appDir, "assets"), { recursive: true });
  writeFileSync(join(appDir, "index.html"), "INDEX", "utf8");
  writeFileSync(join(appDir, "assets", "app.js"), "JS", "utf8");

  assert.equal(resolveAppAsset(appDir, "/app/"), join(appDir, "index.html"));
  assert.equal(resolveAppAsset(appDir, "/app/assets/app.js"), join(appDir, "assets", "app.js"));
  // A History-API deep link with no matching file resolves to the entry, not a 404.
  assert.equal(resolveAppAsset(appDir, "/app/review/pending"), join(appDir, "index.html"));
  // Non-/app paths are not this resolver's job.
  assert.equal(resolveAppAsset(appDir, "/viewer/index.html"), null);
});

test("the package whitelists the bundled portal so it actually ships", () => {
  // The real 4.0.0 miss: files[] was `dist/**/*.js`, which silently drops index.html/.css even once
  // the portal is bundled. This asserts the whitelist that carries it into the tarball.
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { files?: string[] };
  assert.ok(Array.isArray(pkg.files), "package.json must declare a files whitelist");
  assert.ok(
    pkg.files!.some((f) => f.replace(/\\/g, "/").startsWith("dist/app/")),
    `package.json files[] must include the bundled portal (dist/app/**/*); got ${JSON.stringify(pkg.files)}`,
  );
});
