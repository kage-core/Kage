import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { scanRepository } from "./repository-scanner.js";
import type { RepositorySnapshot } from "./source.js";
import { contributorEvidence } from "./git-index.js";
import type { LegacyIndexKernel } from "./legacy-code-graph.js";
import { documentFacts } from "./document-index.js";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-repo-index-home-"));

interface FixtureOptions {
  route?: string;
  handler?: string;
  test?: string;
  git?: boolean;
}

function fixtureRepository(options: FixtureOptions = {}): string {
  const route = options.route ?? "POST /refunds";
  const [method, routePath] = route.split(" ");
  const handler = options.handler ?? "createRefund";
  const testFile = options.test ?? "refund.test.ts";
  const dir = mkdtempSync(join(tmpdir(), "kage-repo-index-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "test"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", scripts: { test: "node --test" }, dependencies: { express: "4.0.0" } }),
    "utf8",
  );
  writeFileSync(
    join(dir, "src", "refunds.js"),
    `import express from 'express';\n`
      + `export function ${handler}(req, res) {\n  return res.json({ ok: true });\n}\n`
      + `const router = express.Router();\n`
      + `router.${method.toLowerCase()}('${routePath}', ${handler});\n`
      + `export { router };\n`,
    "utf8",
  );
  writeFileSync(
    join(dir, "test", testFile),
    `import test from 'node:test';\n`
      + `import { ${handler} } from '../src/refunds.js';\n`
      + `test('${handler} works', () => { ${handler}({}, { json() {} }); });\n`,
    "utf8",
  );
  writeFileSync(
    join(dir, "README.md"),
    `# Fixture\n\n## Refund flow\n\nHow refunds are processed end to end.\n`,
    "utf8",
  );
  if (options.git) {
    execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "dev@example.com"], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Dev Example"], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "initial", "--no-gpg-sign"], {
      cwd: dir,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_DATE: "2020-01-01T00:00:00", GIT_COMMITTER_DATE: "2020-01-01T00:00:00" },
    });
  }
  return dir;
}

test("scanner emits route-to-handler and handler-to-test evidence", async () => {
  const project = fixtureRepository({ route: "POST /refunds", handler: "createRefund", test: "refund.test.ts" });
  const snapshot = await scanRepository(project);
  assert.ok(snapshot.facts.some((fact) => fact.kind === "route" && fact.name === "POST /refunds"));
  assert.ok(
    snapshot.relations.some((relation) => relation.type === "verified_by" && relation.to.includes("refund.test.ts")),
  );
  // The route→handler edge is an "exposes" relation carrying the route fact as evidence.
  assert.ok(snapshot.relations.some((relation) => relation.type === "exposes"));
});

test("scanner keeps code graph certainty separate from inferred feature grouping", async () => {
  const snapshot: RepositorySnapshot = await scanRepository(fixtureRepository());
  assert.ok(snapshot.facts.length > 0);
  assert.ok(snapshot.facts.every((fact) => fact.confidence === 1));
  assert.ok(snapshot.proposals.every((proposal) => proposal.trust_state === "proposed"));
});

test("scanner normalizes evidence to repository-relative paths and stable fingerprints", async () => {
  const project = fixtureRepository();
  const snapshot = await scanRepository(project);
  assert.ok(snapshot.facts.length > 0);
  for (const fact of snapshot.facts) {
    assert.ok(!fact.path.startsWith("/"), `fact path must be repo-relative: ${fact.path}`);
    assert.ok(!fact.path.includes(project), `fact path must not leak absolute root: ${fact.path}`);
    assert.equal(typeof fact.fingerprint, "string");
    assert.ok(fact.fingerprint.length > 0);
  }
  // Deterministic: scanning the same repository twice yields identical facts.
  const second = await scanRepository(project);
  assert.deepEqual(
    snapshot.facts.map((fact) => `${fact.fact_id}:${fact.fingerprint}`).sort(),
    second.facts.map((fact) => `${fact.fact_id}:${fact.fingerprint}`).sort(),
  );
});

test("document index preserves heading anchors from repository docs", async () => {
  const snapshot = await scanRepository(fixtureRepository());
  const documents = snapshot.facts.filter((fact) => fact.kind === "document");
  assert.ok(documents.length > 0);
  // At least one document fact addresses a heading anchor (preserved via the fact id).
  assert.ok(documents.some((fact) => fact.fact_id.includes("#")));
});

test("document index translation preserves anchors without touching the file system", () => {
  const facts = documentFacts({
    schema_version: 1,
    generated_at: "2020-01-01T00:00:00.000Z",
    source: "repo-docs",
    doc_count: 1,
    chunk_count: 1,
    chunks: [{ doc_path: "README.md", heading: "Refund flow", anchor: "refund-flow", text: "body", line: 3 }],
  });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].kind, "document");
  assert.equal(facts[0].path, "README.md");
  assert.ok(facts[0].fact_id.includes("refund-flow"));
  assert.equal(facts[0].confidence, 1);
});

test("git index emits raw author/co-change evidence, never bus-factor heuristics", () => {
  // A contributor with a silo_files bus-factor heuristic and ownership_pct: only raw
  // files_touched must become owned_by evidence; silo/hotspot heuristics must be ignored.
  const { facts, relations } = contributorEvidence({
    schema_version: 1,
    project_dir: "/tmp/x",
    generated_at: "2020-01-01T00:00:00.000Z",
    summary: "",
    warnings: [],
    contributors: [
      {
        contributor: "Dev Example",
        commits_total: 3,
        commits_90d: 1,
        files_touched: [{ path: "src/refunds.js", commits: 3 }],
        modules_touched: [{ module: "src", files: 1 }],
        primary_owned_files: 1,
        silo_files: [{ path: "src/secret.js", ownership_pct: 100, commits: 3 }],
        hotspot_files: [{ path: "src/hot.js", hotspot_score: 9, commits_90d: 1 }],
        commit_categories: { feat: 3 },
        summary: "",
      },
    ],
  });
  assert.ok(facts.some((fact) => fact.kind === "owner" && fact.name === "Dev Example"));
  const owned = relations.filter((relation) => relation.type === "owned_by");
  assert.ok(owned.some((relation) => relation.from.includes("src/refunds.js")));
  // Bus-factor-only files (silo/hotspot, never actually in files_touched) must NOT appear.
  assert.ok(!owned.some((relation) => relation.from.includes("src/secret.js")));
  assert.ok(!owned.some((relation) => relation.from.includes("src/hot.js")));
});

test("scanner accepts an injected kernel seam and never imports the kernel directly", async () => {
  const project = fixtureRepository();
  let calledBuild = 0;
  const fakeKernel: LegacyIndexKernel = {
    buildCodeGraph() {
      calledBuild += 1;
      return {
        schema_version: 1,
        project_dir: project,
        repo_key: "k",
        generated_at: "2020-01-01T00:00:00.000Z",
        repo_state: { branch: "main", head: "abc123", merge_base: null, tree: null, input_hash: null },
        files: [{ id: "f1", path: "src/a.js", language: "javascript", parser: "typescript-ast", kind: "source", size_bytes: 10, line_count: 1, hash: "hash-a" }],
        symbols: [],
        imports: [],
        calls: [],
        routes: [],
        tests: [],
        packages: [],
      };
    },
    buildDocsIndex() {
      return { schema_version: 1, generated_at: "2020-01-01T00:00:00.000Z", source: "repo-docs", doc_count: 0, chunk_count: 0, chunks: [] };
    },
    kageContributors() {
      return { schema_version: 1, project_dir: project, generated_at: "2020-01-01T00:00:00.000Z", contributors: [], warnings: [], summary: "" };
    },
  };
  const snapshot = await scanRepository(project, { kernel: fakeKernel });
  assert.equal(calledBuild, 1);
  assert.ok(snapshot.facts.some((fact) => fact.kind === "file" && fact.path === "src/a.js"));
  assert.equal(snapshot.facts.find((fact) => fact.kind === "file")?.fingerprint, "hash-a");
});
