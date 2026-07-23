import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolvePortalDir, resolveAppAsset, servePortalApi } from "./daemon.js";

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

// A minimal ServerResponse stand-in capturing exactly what json()/servePortalApi write.
function captureResponse(): { captured: { status: number | null; body: unknown }; res: import("node:http").ServerResponse } {
  const captured: { status: number | null; body: unknown } = { status: null, body: undefined };
  const res = {
    writeHead(status: number) {
      captured.status = status;
      return this;
    },
    end(payload?: string) {
      if (payload) captured.body = JSON.parse(payload);
    },
  } as unknown as import("node:http").ServerResponse;
  return { captured, res };
}

// The knowledge portal SPA fetches `/v2/...` SAME-ORIGIN from the daemon that serves it. 4.0.1 fixed
// the shell but not this: the daemon served no /v2 routes, so every panel showed "Kage API 404".
// servePortalApi now answers those routes from the local repository model.

test("servePortalApi answers /v2/overview with a 200 overview from a fresh local model", async () => {
  const { captured, res } = captureResponse();
  await servePortalApi(tmp(), new URL("http://127.0.0.1/v2/overview"), res);
  assert.equal(captured.status, 200, "overview must be served, not 404");
  const body = captured.body as { metrics?: unknown[]; repository?: unknown };
  assert.ok(Array.isArray(body.metrics), "overview carries a metrics array (honest-empty on a fresh repo)");
  assert.ok("repository" in body, "overview carries a repository descriptor");
});

test("servePortalApi 404s an undefined /v2 route instead of hanging or 500ing", async () => {
  const { captured, res } = captureResponse();
  await servePortalApi(tmp(), new URL("http://127.0.0.1/v2/not-a-real-route"), res);
  assert.equal(captured.status, 404);
  assert.equal((captured.body as { error?: string }).error, "not_found");
});

test("servePortalApi serves the other portal read routes a fresh model supports", async () => {
  const project = tmp();
  for (const path of ["/v2/system-map", "/v2/features", "/v2/review-items", "/v2/tasks", "/v2/integrations", "/v2/team-report"]) {
    const { captured, res } = captureResponse();
    await servePortalApi(project, new URL(`http://127.0.0.1${path}`), res);
    assert.equal(captured.status, 200, `${path} must serve 200, not 404`);
  }
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
