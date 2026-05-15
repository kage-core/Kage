import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { availableParallelism, tmpdir } from "node:os";
import vm from "node:vm";
import {
  SETUP_AGENTS,
  benchmarkTaskComparison,
  benchmarkProject,
  buildGlobalCdnBundle,
  buildCodeGraph,
  buildIndexes,
  buildKnowledgeGraph,
  buildBranchOverlay,
  buildMarketplace,
  buildStructuralIndex,
  auditProject,
  capture,
  catalogDomainNodeCount,
  createReviewArtifact,
  createPublicCandidate,
  distillSession,
  doctorProject,
  exportPublicBundle,
  exportOrgRegistry,
  codeGraphDir,
  graphDir,
  graphMermaid,
  gcProject,
  initProject,
  indexProject,
  installAgentPolicy,
  kageCleanupCandidates,
  kageContributors,
  kageDecisionIntelligence,
  kageDependencyPath,
  kageGraphInsights,
  kageHookInstall,
  kageHookStatus,
  kageHookUninstall,
  kageRisk,
  kageMetrics,
  kageModuleHealth,
  kageReviewerSuggestions,
  kageWorkspace,
  kageWorkspaceRecall,
  learn,
  loadApprovedPackets,
  memoryInbox,
  observe,
  layeredRecall,
  orgRecall,
  orgReviewPacket,
  orgStatus,
  orgUploadPacket,
  packetsDir,
  pendingDir,
  prCheck,
  prSummarize,
  proposeFromDiff,
  queryCodeGraph,
  queryGraph,
  recall,
  recordFeedback,
  refreshProject,
  registryRecommendations,
  scanSensitiveText,
  setupAgent,
  setupDoctor,
  structuralIndexDir,
  qualityReport,
  evaluateMemoryAdmission,
  verifyAgentActivation,
  validatePacket,
  validateProject,
  writeCodeIndex,
  writeLspSymbolIndex,
} from "./kernel.js";
import { buildGraphRegistryManifest } from "./graph-registry.js";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-test-"));
  mkdirSync(join(dir, ".agent_memory", "nodes"), { recursive: true });
  return dir;
}

const gitIdentityEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function commitAll(project: string, message: string): void {
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: project, stdio: "ignore", env: gitIdentityEnv });
}

test("migrates legacy markdown nodes into approved packets", () => {
  const project = tempProject();
  writeFileSync(
    join(project, ".agent_memory", "nodes", "tenant-header.md"),
    `---
title: "Tenant header is required"
category: repo_context
tags: ["api", "tenant"]
paths: "backend/api"
date: "2026-04-12"
---

# Tenant header is required

All backend API calls require x-tenant-id except health checks.
`,
    "utf8"
  );

  const result = indexProject(project);
  assert.equal(result.migrated, 1);
  const packets = loadApprovedPackets(project);
  assert.equal(packets.length >= 1, true);
  const imported = packets.find((packet) => packet.title === "Tenant header is required");
  assert.ok(imported);
  assert.equal(imported.status, "approved");
  assert.equal(imported.source_refs[0]?.kind, "legacy_markdown");
});

test("migrates inline legacy metadata from markdown body", () => {
  const project = tempProject();
  mkdirSync(join(project, "src", "app", "api", "stripe", "webhook"), { recursive: true });
  writeFileSync(join(project, "src", "app", "api", "stripe", "webhook", "route.ts"), "", "utf8");
  writeFileSync(
    join(project, ".agent_memory", "nodes", "stripe-webhook-runbook.md"),
    `# Stripe webhook runbook

Type: runbook
Tags: stripe, webhook, tests
Paths: src/app/api/stripe/webhook/route.ts

Use npm run test:webhook when changing webhook verification.
`,
    "utf8"
  );

  indexProject(project);
  const imported = loadApprovedPackets(project).find((packet) => packet.title === "Stripe webhook runbook");
  assert.ok(imported);
  assert.equal(imported.type, "runbook");
  assert.deepEqual(imported.tags, ["stripe", "webhook", "tests"]);
  assert.deepEqual(imported.paths, ["src/app/api/stripe/webhook/route.ts"]);
  assert.doesNotMatch(imported.body, /^Type:/m);
});

test("builds generated indexes after indexing", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "demo.test.ts"), "test('demo', () => {});\n", "utf8");
  const result = indexProject(project);
  assert.equal(result.indexes.some((path) => path.endsWith("indexes/catalog.json")), true);
  const catalog = JSON.parse(readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8"));
  assert.equal(catalog.packet_count >= 2, true);
  assert.equal(catalog.packets.some((packet: { title: string }) => packet.title.includes("repo structure")), true);
  const firstCatalog = readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8");
  indexProject(project);
  assert.equal(readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8"), firstCatalog);
  assert.equal("generated_at" in catalog, false);
  writeFileSync(join(project, "README.md"), "# Demo\n\nNew setup flow lives here.\n", "utf8");
  indexProject(project);
  const overview = loadApprovedPackets(project).find((packet) => packet.title.includes("repo overview"));
  assert.match(overview?.body ?? "", /New setup flow/);
  const structure = loadApprovedPackets(project).find((packet) => packet.title.includes("repo structure"));
  assert.match(overview?.context?.why ?? "", /repo orientation/i);
  assert.match(structure?.context?.verification ?? "", /Generated from files present/);
  assert.match(readFileSync(join(project, "AGENTS.md"), "utf8"), /KAGE_MEMORY_POLICY_V1/);
});

test("installs and updates Codex agent policy idempotently", () => {
  const project = tempProject();
  const created = installAgentPolicy(project);
  assert.equal(created.created, true);
  assert.equal(created.updated, false);
  const first = readFileSync(join(project, "AGENTS.md"), "utf8");
  assert.match(first, /Automatic Recall/);
  assert.match(first, /kage_context/);

  const second = installAgentPolicy(project);
  assert.equal(second.created, false);
  assert.equal(second.updated, false);
  assert.equal(readFileSync(join(project, "AGENTS.md"), "utf8"), first);
});

test("recall returns run command context from repo overview", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest", dev: "vite" } }), "utf8");
  const result = recall(project, "how do I run tests");
  assert.match(result.context_block, /vitest|test/i);
  assert.equal(result.results.length > 0, true);
});

test("recall reuses current graph artifacts without rewriting them", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  const captured = capture({
    projectDir: project,
    title: "Run tests",
    body: "Run tests with npm test. Verified by package scripts.",
    type: "runbook",
    paths: ["package.json"],
    tags: ["tests"],
  });
  assert.equal(captured.ok, true);
  buildIndexes(project);

  const codeGraphPath = join(codeGraphDir(project), "graph.json");
  const memoryGraphPath = join(graphDir(project), "graph.json");
  const codeGraph = JSON.parse(readFileSync(codeGraphPath, "utf8"));
  const memoryGraph = JSON.parse(readFileSync(memoryGraphPath, "utf8"));
  codeGraph.generated_at = "sentinel-code";
  memoryGraph.generated_at = "sentinel-memory";
  writeFileSync(codeGraphPath, JSON.stringify(codeGraph, null, 2), "utf8");
  writeFileSync(memoryGraphPath, JSON.stringify(memoryGraph, null, 2), "utf8");

  const result = recall(project, "how do I run tests");

  assert.equal(result.results[0]?.packet.title, "Run tests");
  assert.equal(JSON.parse(readFileSync(codeGraphPath, "utf8")).generated_at, "sentinel-code");
  assert.equal(JSON.parse(readFileSync(memoryGraphPath, "utf8")).generated_at, "sentinel-memory");
});

test("recall uses BM25 lexical ranking for repeated body evidence", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A sparse unrelated note",
    summary: "Operational note",
    body: "Cache eviction appears once. Verified by: npm test.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z repeated unrelated note",
    summary: "Operational note",
    body: "Cache eviction cache eviction cache eviction cache eviction cache eviction. Verified by: npm test.",
    type: "reference",
  });

  const result = recall(project, "cache eviction", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z repeated unrelated note");
  assert.equal(result.explanations?.[0]?.provider, "bm25");
  assert.equal((result.results[0]?.score_breakdown?.bm25 ?? 0) > 0, true);
});

test("recall prioritizes runbooks for command-intent queries", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A release proof note",
    summary: "Operational note",
    body: "Verified by npm test. npm test passed. npm test was run again.",
    type: "decision",
  });
  capture({
    projectDir: project,
    title: "A ranking bug note",
    summary: "BM25 bug note",
    body: "A previous bug made how do I run tests return release proof instead of runbooks. Verified by npm test.",
    type: "bug_fix",
  });
  capture({
    projectDir: project,
    title: "Z local command guide",
    summary: "Operational note",
    body: "Use npm test to run the suite.",
    type: "runbook",
  });

  const result = recall(project, "how do I run tests", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z local command guide");
  assert.equal((result.results[0]?.score_breakdown?.intent ?? 0) > 0, true);
});

test("recall applies type intent for gotcha queries", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A noisy branch note",
    summary: "Branch gotchas gotchas gotchas",
    body: "This branch note mentions gotchas several times but is not itself a gotcha.",
    type: "workflow",
  });
  capture({
    projectDir: project,
    title: "Z config gotcha",
    summary: "Remember the config ordering issue.",
    body: "The config loader reads local overrides after defaults. Verified by: npm test.",
    type: "gotcha",
  });

  const result = recall(project, "what gotchas exist", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z config gotcha");
  assert.equal((result.results[0]?.score_breakdown?.intent ?? 0) > 0, true);
});

test("builds an evidence-backed local knowledge graph", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" }, dependencies: { next: "15.0.0" } }), "utf8");
  indexProject(project);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.entities.some((entity) => entity.type === "memory"), true);
  assert.equal(graph.entities.some((entity) => entity.type === "command" && entity.name === "npm run test"), true);
  assert.equal(graph.entities.some((entity) => entity.type === "package" && entity.name === "next"), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "defines_command" && edge.evidence.length > 0), true);
  assert.equal(graph.episodes.some((episode) => episode.kind === "memory_packet"), true);
  const graphArtifact = JSON.parse(readFileSync(join(graphDir(project), "graph.json"), "utf8"));
  assert.equal(graphArtifact.compact, true);
  assert.equal(Array.isArray(graphArtifact.entities), false);
  assert.equal(graphArtifact.refs.entities, "entities.json");
  assert.ok(graphDir(project));
});

test("builds a source-derived code graph for JS projects", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "demo", scripts: { test: "node --test" }, dependencies: { express: "4.0.0" } }),
    "utf8"
  );
  writeFileSync(
    join(project, "src", "taskStore.js"),
    `export function createTaskStore() {
  return {
    list() { return []; },
    complete(id) { return id; }
  };
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "src", "server.js"),
    `import { createTaskStore } from './taskStore.js';
export function createApp(taskStore = createTaskStore()) {
  if (req.method === 'GET' && url.pathname === '/tasks') taskStore.list();
  if (req.method === 'POST' && url.pathname === '/summary') taskStore.complete(1);
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "test", "server.test.js"),
    `import test from 'node:test';
import { createApp } from '../src/server.js';
test('createApp routes tasks', () => createApp());
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.some((file) => file.path === "src/server.js"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "createTaskStore" && symbol.export), true);
  assert.equal(graph.imports.some((edge) => edge.from_path === "src/server.js" && edge.to_path === "src/taskStore.js"), true);
  assert.equal(graph.routes.some((route) => route.method === "GET" && route.path === "/tasks"), true);
  assert.equal(graph.calls.some((call) => call.to_symbol.includes("createtaskstore")), true);
  assert.equal(graph.tests.some((edge) => edge.covers_symbol === "createApp"), true);
});

test("risk report combines code dependents with git ownership and co-change signals", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  writeFileSync(join(project, "test", "core.test.js"), "import { core } from '../src/core.js';\ntest('core', () => core());\n", "utf8");
  commitAll(project, "initial core");
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 2; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core() + 1; }\n", "utf8");
  commitAll(project, "adjust core and app together");

  buildCodeGraph(project, { force: true });
  const report = kageRisk(project, ["src/core.js"]);
  const target = report.targets["src/core.js"];

  assert.ok(target);
  assert.equal(target.exists_in_code_graph, true);
  assert.equal(target.dependents.includes("src/app.js"), true);
  assert.equal(target.test_gap, false);
  assert.equal(target.git.commit_count_total >= 2, true);
  assert.equal(target.git.primary_owner, "Test <test@example.com>");
  assert.equal(target.git.co_change_partners.some((partner) => partner.file_path === "src/app.js"), true);
  assert.equal(target.co_change_warnings.some((partner) => partner.file_path === "src/app.js" && partner.included_in_change === false), true);
  assert.equal(report.ownership_silos.some((silo) => silo.file_path === "src/core.js" && silo.primary_owner === "Test <test@example.com>"), false);
});

test("dependency path reports forward reverse and undirected code graph connections", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.ts"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "service.ts"), "import { core } from './core.js';\nexport function service() { return core(); }\n", "utf8");
  writeFileSync(join(project, "src", "app.ts"), "import { service } from './service.js';\nexport function app() { return service(); }\n", "utf8");
  writeFileSync(join(project, "src", "sibling.ts"), "import { service } from './service.js';\nexport function sibling() { return service(); }\n", "utf8");
  buildCodeGraph(project, { force: true });

  const forward = kageDependencyPath(project, "src/app.ts", "src/core.ts");
  assert.equal(forward.relation, "source_depends_on_target");
  assert.deepEqual(forward.path, ["src/app.ts", "src/service.ts", "src/core.ts"]);
  assert.equal(forward.distance, 2);

  const reverse = kageDependencyPath(project, "src/core.ts", "src/app.ts");
  assert.equal(reverse.relation, "target_depends_on_source");
  assert.deepEqual(reverse.path, ["src/core.ts", "src/service.ts", "src/app.ts"]);

  const undirected = kageDependencyPath(project, "src/app.ts", "src/sibling.ts");
  assert.equal(undirected.relation, "connected_undirected");
  assert.deepEqual(undirected.path, ["src/app.ts", "src/service.ts", "src/sibling.ts"]);
});

test("cleanup candidates conservatively reports unreferenced source files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { used } from './used.js';\nused();\n", "utf8");
  writeFileSync(join(project, "src", "used.js"), "export function used() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "unused.js"), "export function unused() { return false; }\n", "utf8");
  writeFileSync(join(project, "src", "job.ts"), "export function runJob() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export const jobPath = 'job.js';\n", "utf8");
  buildCodeGraph(project, { force: true });

  const report = kageCleanupCandidates(project);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/unused.js"), true);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/used.js"), false);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/job.ts"), false);
  assert.equal(report.skipped_runtime_references.includes("src/job.ts"), true);
  assert.equal(report.skipped_entrypoints.includes("src/index.js"), true);
  const unused = report.candidates.find((candidate) => candidate.path === "src/unused.js");
  assert.equal(unused?.kind, "unreferenced_file");
  assert.equal(unused?.inbound_imports, 0);
});

test("reviewer suggestions rank local git authors and co-change owners", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "alice owns core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 2; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core() + 1; }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "bob updates app with core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Bob", GIT_AUTHOR_EMAIL: "bob@example.com", GIT_COMMITTER_NAME: "Bob", GIT_COMMITTER_EMAIL: "bob@example.com" },
  });
  buildCodeGraph(project, { force: true });

  const report = kageReviewerSuggestions(project, ["src/core.js"]);
  assert.equal(report.suggestions.some((suggestion) => suggestion.reviewer === "Alice <alice@example.com>"), true);
  assert.equal(report.suggestions.some((suggestion) => suggestion.reviewer === "Bob <bob@example.com>"), true);
  assert.equal(report.suggestions[0].authored_targets.includes("src/core.js"), true);
});

test("contributor profiles summarize local git activity ownership and modules", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src", "api"), { recursive: true });
  writeFileSync(join(project, "src", "api", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "api", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "feat: alice owns api"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });
  for (let i = 0; i < 5; i += 1) {
    writeFileSync(join(project, "src", "api", "core.js"), `export function core() { return ${i + 2}; }\n`, "utf8");
    execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", `fix: alice updates core ${i}`], {
      cwd: project,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
    });
  }
  buildCodeGraph(project, { force: true });

  const report = kageContributors(project);
  const alice = report.contributors.find((profile) => profile.contributor === "Alice <alice@example.com>");
  assert.ok(alice);
  assert.equal(alice.commits_total >= 6, true);
  assert.equal(alice.files_touched.some((file) => file.path === "src/api/core.js"), true);
  assert.equal(alice.modules_touched.some((module) => module.module === "src" || module.module === "src/api"), true);
  assert.equal(alice.primary_owned_files >= 1, true);
  assert.equal(alice.silo_files.some((file) => file.path === "src/api/core.js"), true);
  assert.equal(alice.commit_categories.fix >= 5, true);
});

test("decision intelligence surfaces why-memory coverage and gaps", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "checkout.js"), "export function checkout() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "callbacks.js"), "export function callback() { return true; }\n", "utf8");
  commitAll(project, "checkout flow");
  buildCodeGraph(project, { force: true });
  const captured = capture({
    projectDir: project,
    title: "Checkout retry paths stay separate",
    body: "The checkout retry paths look duplicated, but one path uses callback idempotency and the other uses user session state. Keep them separate and run checkout retry tests when touching this file.",
    type: "decision",
    paths: ["src/checkout.js"],
    context: {
      why: "Callback and user checkout retries carry different state.",
      risk_if_forgotten: "A cleanup can merge incompatible retry semantics.",
      verification: "checkout retry tests",
    },
  });
  assert.equal(captured.ok, true);

  const report = kageDecisionIntelligence(project);
  assert.equal(report.decision_memory_count, 1);
  assert.equal(report.code_paths_with_memory, 1);
  assert.equal(report.top_decisions[0].title, "Checkout retry paths stay separate");
  assert.equal(report.top_decisions[0].why, "Callback and user checkout retries carry different state.");
  assert.equal(report.coverage_gaps.some((gap) => gap.path === "src/callbacks.js"), true);
});

test("module health rolls up graph test cleanup and git signals", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src", "payments"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "payments", "checkout.js"), "export function checkout() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "payments", "unused.js"), "export function unused() { return false; }\n", "utf8");
  writeFileSync(join(project, "test", "checkout.test.js"), "import { checkout } from '../src/payments/checkout.js';\ntest('checkout', () => checkout());\n", "utf8");
  commitAll(project, "payments module");
  writeFileSync(join(project, "src", "payments", "checkout.js"), "export function checkout() { return 'ok'; }\n", "utf8");
  commitAll(project, "touch checkout");
  buildCodeGraph(project, { force: true });

  const report = kageModuleHealth(project);
  const module = report.modules.find((item) => item.module === "src");
  assert.ok(module);
  assert.equal(module.cleanup_candidates >= 1, true);
  assert.equal(module.churn_90d >= 2, true);
  assert.equal(module.primary_owners.some((owner) => owner.owner === "Test <test@example.com>"), true);
  assert.equal(module.score < 100, true);
});

test("graph insights report central files cycles communities and entry flows", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { a } from './a.js';\na();\n", "utf8");
  writeFileSync(join(project, "src", "a.js"), "import { b } from './b.js';\nexport function a() { return b(); }\n", "utf8");
  writeFileSync(join(project, "src", "b.js"), "import { a } from './a.js';\nexport function b() { return a; }\n", "utf8");
  writeFileSync(join(project, "src", "server.js"), "import { a } from './a.js';\nconst app = { get() {} };\nfunction handler() { return a(); }\napp.get('/health', handler);\n", "utf8");

  const report = kageGraphInsights(project);
  assert.equal(report.edge_mix.imports >= 3, true);
  assert.equal(report.language_coverage.some((item) => item.language === "javascript" && item.files === 4), true);
  assert.equal(report.central_files.some((file) => file.path === "src/a.js"), true);
  assert.equal(report.dependency_cycles.some((cycle) => cycle.files.includes("src/a.js") && cycle.files.includes("src/b.js")), true);
  assert.equal(report.communities.some((community) => community.files.includes("src/index.js") && community.files.includes("src/server.js")), true);
  assert.equal(report.entry_flows.some((flow) => flow.entry === "src/server.js" && flow.path.includes("src/a.js")), true);
});

test("workspace summarizes sibling repos and recalls across repo memory", () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kage-workspace-test-"));
  const api = join(workspaceRoot, "api");
  const web = join(workspaceRoot, "web");
  mkdirSync(join(api, "src"), { recursive: true });
  mkdirSync(join(web, "src"), { recursive: true });
  execFileSync("git", ["init"], { cwd: api, stdio: "ignore" });
  execFileSync("git", ["init"], { cwd: web, stdio: "ignore" });
  writeFileSync(join(api, "package.json"), JSON.stringify({ name: "@demo/api" }), "utf8");
  writeFileSync(join(web, "package.json"), JSON.stringify({ name: "@demo/web", dependencies: { "@demo/api": "workspace:*" } }), "utf8");
  writeFileSync(join(api, "src", "auth.js"), "export function auth() { return true; }\n", "utf8");
  writeFileSync(join(api, "src", "server.js"), "const app = { get() {} };\nfunction handler() {}\napp.get('/auth/user', handler);\n", "utf8");
  writeFileSync(join(web, "src", "client.js"), "export function client() { return fetch('/auth/user'); }\n", "utf8");
  buildCodeGraph(api, { force: true });
  buildCodeGraph(web, { force: true });
  learn({
    projectDir: api,
    title: "API auth middleware contract",
    learning: "The auth middleware must keep the x-user-id header contract because web clients depend on it.",
    type: "decision",
    paths: ["src/auth.js"],
    verifiedBy: "workspace test",
  });
  learn({
    projectDir: web,
    title: "Web client auth dependency",
    learning: "The web client expects API auth responses to preserve the user id header.",
    type: "decision",
    paths: ["src/client.js"],
    verifiedBy: "workspace test",
  });

  const workspace = kageWorkspace(workspaceRoot);
  assert.equal(workspace.repos.length, 2);
  const webRepo = workspace.repos.find((repo) => repo.alias === "web");
  assert.equal(webRepo?.dependencies_on_workspace_repos.some((dep) => dep.alias === "api"), true);
  assert.equal(workspace.package_dependencies.some((dep) => dep.from === "web" && dep.to === "api"), true);
  assert.equal(workspace.route_contracts.some((contract) => contract.provider_repo === "api" && contract.consumer_repo === "web" && contract.path === "/auth/user"), true);

  const recalled = kageWorkspaceRecall(workspaceRoot, "auth header contract", 5);
  assert.equal(recalled.repos_searched, 2);
  assert.equal(recalled.hits.some((hit) => hit.repo === "api" && /auth middleware/i.test(hit.title)), true);
  assert.match(recalled.context_block, /\[api\]/);
});

test("code graph represents huge source blobs without structurally extracting them", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "small.js"), "export function small() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "bundle.js"), `export const blob = "${"x".repeat(600_000)}";\n`, "utf8");

  const graph = buildCodeGraph(project);

  assert.equal(graph.files.some((file) => file.path === "src/small.js"), true);
  assert.equal(graph.files.some((file) => file.path === "src/bundle.js" && file.parser === "metadata"), true);
  const manifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(manifest.mode, "structural");
  assert.equal(manifest.coverage.indexed_files, 2);
  assert.equal(manifest.coverage.deferred_files, 1);
  assert.equal(manifest.deferred_files[0].path, "src/bundle.js");
  assert.equal(manifest.deferred_files[0].reason, "over_structural_extract_file_size_limit");
});

test("code graph caps noisy call extraction", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  const functions = Array.from({ length: 360 }, (_, index) => `export function target${index}() { return ${index}; }`).join("\n");
  const calls = Array.from({ length: 360 }, (_, index) => `  target${index}();`).join("\n");
  writeFileSync(join(project, "src", "calls.js"), `${functions}\nexport function run() {\n${calls}\n}\n`, "utf8");

  const graph = buildCodeGraph(project);

  assert.equal(graph.calls.length <= 250, true);
});

test("code graph keeps complete structural coverage for large file counts", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  for (let index = 0; index < 2003; index++) {
    writeFileSync(join(project, "src", `unit-${String(index).padStart(4, "0")}.js`), `export const value${index} = ${index};\n`, "utf8");
  }

  const graph = buildCodeGraph(project);
  const manifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));

  assert.equal(graph.files.length, 2003);
  assert.equal(manifest.coverage.indexable_files, 2003);
  assert.equal(manifest.coverage.indexed_files, 2003);
  assert.equal(manifest.coverage.deferred_files, 0);
  assert.equal(manifest.coverage.coverage_percent, 100);
  assert.equal(manifest.coverage.complete, true);
  assert.equal(manifest.deferred_files.length, 0);
});

test("structural index is the source for large-repo code graph coverage", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  for (let index = 0; index < 2003; index++) {
    writeFileSync(join(project, "src", `unit-${String(index).padStart(4, "0")}.js`), `export const value${index} = ${index};\n`, "utf8");
  }

  const graph = buildCodeGraph(project);
  const structural = buildStructuralIndex(project);

  assert.equal(graph.files.length, 2003);
  assert.equal(structural.files.length, 2003);
  assert.equal(structural.symbols.some((symbol) => symbol.name === "value2002"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "value2002"), true);
  if (availableParallelism() > 2) assert.equal(structural.manifest.worker_count > 1, true);
  assert.equal(existsSync(join(structuralIndexDir(project), "report.md")), true);
  assert.equal(existsSync(join(project, ".agent_memory", "indexes", "structural.json")), true);

  const result = queryCodeGraph(project, "value2002", 5, graph);
  assert.equal(result.symbols.some((symbol) => symbol.name === "value2002"), true);
  assert.match(result.context_block, /\[symbol\] constant value2002/);
});

test("structural index reuses cached file facts and updates changed files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "a.ts"), "export function alpha() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "b.ts"), "export function beta() { return 2; }\n", "utf8");

  buildStructuralIndex(project);
  const cached = buildStructuralIndex(project);
  assert.equal(cached.manifest.cache.hits, 2);
  assert.equal(cached.manifest.cache.misses, 0);
  const cachePath = join(project, ".agent_memory", "structural", "file-cache.json");
  assert.equal(Object.keys(JSON.parse(readFileSync(cachePath, "utf8")).entries).length, 2);
  assert.equal(existsSync(join(project, ".agent_memory", "structural", "file-cache")), false);

  writeFileSync(join(project, "src", "b.ts"), "export function betaChanged() { return 3; }\n", "utf8");
  const changed = buildStructuralIndex(project);
  assert.equal(changed.manifest.cache.hits, 1);
  assert.equal(changed.manifest.cache.misses, 1);
  assert.equal(changed.symbols.some((symbol) => symbol.name === "betaChanged"), true);
  assert.equal(Object.keys(JSON.parse(readFileSync(cachePath, "utf8")).entries).length, 2);
});

test("structural index honors .kageignore", () => {
  const project = tempProject();
  mkdirSync(join(project, "src", "ignored"), { recursive: true });
  writeFileSync(join(project, ".kageignore"), "src/ignored/\n", "utf8");
  writeFileSync(join(project, "src", "kept.ts"), "export function kept() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "ignored", "skipped.ts"), "export function skipped() { return false; }\n", "utf8");

  const structural = buildStructuralIndex(project);

  assert.equal(structural.files.some((file) => file.path === "src/kept.ts"), true);
  assert.equal(structural.files.some((file) => file.path === "src/ignored/skipped.ts"), false);
  assert.equal(structural.manifest.ignored_summary.kageignore, 1);
});

test("structural index skips broken symlinks instead of crashing", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "kept.ts"), "export function kept() { return true; }\n", "utf8");
  symlinkSync("missing-target.md", join(project, "README.md"));

  const structural = buildStructuralIndex(project);

  assert.equal(structural.files.some((file) => file.path === "src/kept.ts"), true);
  assert.equal(structural.files.some((file) => file.path === "README.md"), false);
  assert.equal(structural.manifest.ignored_summary.symlink, 1);
});

test("structural-backed code graph reuses per-file structural facts until source content changes", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  const cachePath = join(project, ".agent_memory", "structural", "file-cache.json");
  const packed = JSON.parse(readFileSync(cachePath, "utf8"));
  const cacheEntry = Object.entries(packed.entries).find(([, value]) => (value as { path?: string }).path === "src/worker.ts");
  assert.ok(cacheEntry);
  const cached = cacheEntry[1] as { schema_version: number; edges?: unknown; symbols: unknown[] };
  assert.equal(cached.schema_version, 2);
  assert.equal(cached.edges, undefined);
  cached.symbols.push(["symbol:src-worker-ts:function:cache-only:99", "cacheOnly", "function", "typescript-ast", true, 99, null, "cacheOnly()", "EXTRACTED"]);
  packed.entries[cacheEntry[0]] = cached;
  writeFileSync(cachePath, JSON.stringify(packed, null, 2), "utf8");
  unlinkSync(join(project, ".agent_memory", "code_graph", "graph.json"));

  const cachedGraph = buildCodeGraph(project);
  const cachedManifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(cachedGraph.symbols.some((symbol) => symbol.name === "cacheOnly"), true);
  assert.equal(cachedManifest.cache.hits, 1);
  assert.equal(cachedManifest.cache.misses, 0);

  writeFileSync(join(project, "src", "worker.ts"), "export function workChanged() { return 2; }\n", "utf8");
  const changedGraph = buildCodeGraph(project);
  const changedManifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(changedGraph.symbols.some((symbol) => symbol.name === "cacheOnly"), false);
  assert.equal(changedGraph.symbols.some((symbol) => symbol.name === "workChanged"), true);
  assert.equal(changedManifest.cache.hits, 0);
  assert.equal(changedManifest.cache.misses, 1);
});

test("code graph returns cached graph when source stat fingerprint is unchanged", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  const first = buildCodeGraph(project);
  const graphPath = join(codeGraphDir(project), "graph.json");
  const graphJson = JSON.parse(readFileSync(graphPath, "utf8"));
  assert.equal(graphJson.compact, true);
  assert.equal(graphJson.artifact_format, 2);
  assert.equal(Array.isArray(graphJson.files), false);
  assert.equal(graphJson.refs.files, "../structural/files.json");
  assert.equal(existsSync(join(codeGraphDir(project), "files.json")), false);
  assert.equal(existsSync(join(codeGraphDir(project), "symbols.json")), false);
  graphJson.generated_at = "sentinel-code-graph";
  writeFileSync(graphPath, JSON.stringify(graphJson, null, 2), "utf8");

  const second = buildCodeGraph(project);
  const manifest = JSON.parse(readFileSync(join(codeGraphDir(project), "index-manifest.json"), "utf8"));

  assert.equal(second.generated_at, "sentinel-code-graph");
  assert.equal(second.files.length, first.files.length);
  assert.equal(manifest.cache.hits, 1);
  assert.equal(manifest.cache.misses, 0);
  assert.equal(typeof manifest.fingerprint, "string");
});

test("read-only code graph queries rebuild stale structural artifacts after source changes", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  writeFileSync(join(project, "src", "worker.ts"), "export function changedWork() { return 2; }\n", "utf8");

  const result = queryCodeGraph(project, "changedWork", 5);
  assert.equal(result.symbols.some((symbol) => symbol.name === "changedWork"), true);
  assert.equal(result.symbols.some((symbol) => symbol.name === "work"), false);
});

test("code graph natural language queries prefer exact symbol identifiers over generic words", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "feature.ts"), "export function feature1999() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "worker.ts"), "export function Worker0() { return 2; }\n", "utf8");

  const graph = buildCodeGraph(project);
  const result = queryCodeGraph(project, "how does feature1999 work", 5, graph);

  assert.equal(result.symbols[0]?.name, "feature1999");
});

test("code graph force option bypasses unchanged graph reuse", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  const graphPath = join(codeGraphDir(project), "graph.json");
  const graphJson = JSON.parse(readFileSync(graphPath, "utf8"));
  graphJson.generated_at = "sentinel-code-graph";
  writeFileSync(graphPath, JSON.stringify(graphJson, null, 2), "utf8");

  const rebuilt = buildCodeGraph(project, { force: true });

  assert.notEqual(rebuilt.generated_at, "sentinel-code-graph");
  assert.equal(rebuilt.symbols.some((symbol) => symbol.name === "work"), true);
});

test("builds a multi-language code graph with generic static extractors", () => {
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  mkdirSync(join(project, "pkg"), { recursive: true });
  mkdirSync(join(project, "tests"), { recursive: true });
  writeFileSync(
    join(project, "app", "service.py"),
    `from fastapi import APIRouter
from pkg.store import TaskStore

router = APIRouter()

def normalize_task(value):
    return value

@router.get("/tasks/{task_id}")
def read_task(task_id):
    return normalize_task(task_id)

class TaskService:
    def list_tasks(self):
        return normalize_task(TaskStore().list())
`,
    "utf8"
  );
  writeFileSync(
    join(project, "pkg", "store.go"),
    `package pkg

import "context"

type TaskStore struct {}

func ListTasks(ctx context.Context) []string {
  return []string{}
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "tests", "test_service.py"),
    `from app.service import normalize_task

def test_normalize_task():
    return normalize_task([])
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.language, "python");
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.parser, "generic-static");
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "TaskService" && symbol.kind === "class"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "list_tasks" && symbol.kind === "function"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "tests/test_service.py" && symbol.name === "test_normalize_task" && symbol.kind === "test"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "pkg/store.go" && symbol.name === "TaskStore" && symbol.kind === "class"), true);
  assert.equal(graph.imports.some((edge) => edge.from_path === "app/service.py" && edge.specifier === "pkg.store"), true);
  assert.equal(graph.calls.some((edge) => edge.path === "app/service.py" && edge.to_symbol.includes(":normalize-task:")), true);
  assert.equal(graph.routes.some((route) => route.file_path === "app/service.py" && route.framework === "fastapi" && route.method === "GET" && route.path === "/tasks/:task_id" && route.handler_symbol?.includes(":read-task:")), true);
  assert.equal(graph.tests.some((edge) => edge.test_path === "tests/test_service.py" && edge.covers_path === "app/service.py"), true);
});

test("code graph extracts Python framework routes", () => {
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  writeFileSync(
    join(project, "app", "web.py"),
    `from flask import Flask

app = Flask(__name__)

@app.route("/checkout/<session_id>", methods=["POST"])
def create_checkout(session_id):
    return session_id
`,
    "utf8"
  );
  writeFileSync(
    join(project, "app", "urls.py"),
    `from django.urls import path
from . import views

urlpatterns = [
    path("orders/<int:order_id>/", views.order_detail),
]
`,
    "utf8"
  );
  writeFileSync(join(project, "app", "views.py"), "def order_detail(request, order_id):\n    return order_id\n", "utf8");

  const graph = buildCodeGraph(project);
  assert.equal(graph.routes.some((route) => route.file_path === "app/web.py" && route.framework === "flask" && route.method === "POST" && route.path === "/checkout/:session_id" && route.handler_symbol?.includes(":create-checkout:")), true);
  assert.equal(graph.routes.some((route) => route.file_path === "app/urls.py" && route.framework === "django" && route.method === "ANY" && route.path === "/orders/:order_id"), true);
});

test("code graph consumes Tree-sitter, SCIP, and LSP index artifacts when present", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, ".agent_memory", "code_index"), { recursive: true });
  writeFileSync(join(project, "src", "worker.py"), "def fallback_name():\n    return True\n", "utf8");
  writeFileSync(
    join(project, ".agent_memory", "code_index", "tree-sitter.json"),
    JSON.stringify({
      symbols: [{ path: "src/worker.py", name: "treeSitterSymbol", kind: "function", line: 1, signature: "def treeSitterSymbol()" }],
    }),
    "utf8"
  );
  writeFileSync(
    join(project, ".agent_memory", "code_index", "scip.json"),
    JSON.stringify({
      imports: [{ from_path: "src/worker.py", specifier: "src.worker", to_path: "src/worker.py", kind: "import", line: 1 }],
    }),
    "utf8"
  );
  writeFileSync(
    join(project, ".agent_memory", "code_index", "lsp-symbols.json"),
    JSON.stringify({
      documents: [
        {
          path: "src/worker.py",
          symbols: [{ name: "LspWorker", kind: "class", range: { start: { line: 0 } }, detail: "class LspWorker" }],
        },
      ],
    }),
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "treeSitterSymbol" && symbol.parser === "tree-sitter"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "LspWorker" && symbol.parser === "lsp"), true);
  assert.equal(graph.imports.some((edge) => edge.parser === "scip" && edge.specifier === "src.worker"), true);
  assert.equal(graph.files.find((file) => file.path === "src/worker.py")?.parser, "scip");
});

test("generated LSP symbol index upgrades code graph parser coverage", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  const before = buildCodeGraph(project);
  assert.equal(before.files.find((file) => file.path === "src/server.ts")?.parser, "typescript-ast");

  const result = writeLspSymbolIndex(project);
  assert.equal(result.ok, true);
  assert.equal(result.documents, 1);
  assert.equal(result.symbols >= 1, true);

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.find((file) => file.path === "src/server.ts")?.parser, "lsp");
  assert.equal(graph.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "lsp"), true);

  const cached = buildCodeGraph(project);
  assert.equal(cached.files.find((file) => file.path === "src/server.ts")?.parser, "lsp");
  assert.equal(cached.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "lsp"), true);
});

test("code index prefers scip-typescript when available", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "bin"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  writeFileSync(
    join(project, "bin", "scip-typescript"),
    `#!/usr/bin/env node
const fs = require("fs");
fs.writeFileSync("index.scip", "fake scip");
`,
    "utf8"
  );
  writeFileSync(
    join(project, "bin", "scip"),
    `#!/usr/bin/env node
console.log(JSON.stringify({
  documents: [{
    relativePath: "src/server.ts",
    occurrences: [{
      symbol: "scip-typescript npm demo 1.0.0 src/server.ts/createApp().",
      symbolRoles: 1,
      range: [0, 16, 25]
    }]
  }]
}));
`,
    "utf8"
  );
  chmodSync(join(project, "bin", "scip-typescript"), 0o755);
  chmodSync(join(project, "bin", "scip"), 0o755);

  const previousPath = process.env.PATH;
  process.env.PATH = `${join(project, "bin")}${delimiter}${previousPath ?? ""}`;
  try {
    const result = writeCodeIndex(project);
    assert.equal(result.ok, true);
    assert.equal(result.parser, "scip");
    assert.match(result.path, /code_index\/scip\.json$/);

    const graph = buildCodeGraph(project);
    assert.equal(graph.files.find((file) => file.path === "src/server.ts")?.parser, "scip");
    assert.equal(graph.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "scip"), true);
  } finally {
    process.env.PATH = previousPath;
  }
});

test("audit precision coverage ignores metadata-only files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");
  writeLspSymbolIndex(project);

  const audit = auditProject(project);
  assert.equal(audit.checks.code_graph.files, 2);
  assert.equal(audit.checks.code_graph.precise_files, 1);
  assert.equal(audit.checks.code_graph.precise_coverage_percent, 100);
  assert.equal(audit.recommendations.some((item) => item.includes("SCIP/LSIF/LSP")), false);
});

test("code graph query returns routes, symbols, and tests", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { if (req.method === 'GET' && url.pathname === '/summary') return {}; }\n", "utf8");
  writeFileSync(join(project, "test", "server.test.js"), "import test from 'node:test';\nimport { createApp } from '../src/server.js';\ntest('summary route', () => createApp());\n", "utf8");

  const result = queryCodeGraph(project, "summary createApp test");
  assert.match(result.context_block, /Kage Code Graph Context/);
  assert.equal(result.routes.some((route) => route.path === "/summary"), true);
  assert.equal(result.symbols.some((symbol) => symbol.name === "createApp"), true);
  assert.equal(result.tests.some((edge) => edge.title === "summary route"), true);
});

test("metrics summarize code graph, memory graph, and harness readiness", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { return {}; }\n", "utf8");
  indexProject(project);

  const metrics = kageMetrics(project);
  assert.equal(metrics.code_graph.files >= 2, true);
  assert.equal(metrics.code_graph.languages.javascript, 1);
  assert.equal(metrics.code_graph.parsers["typescript-ast"], 1);
  assert.equal(metrics.code_graph.indexer_coverage_percent, 100);
  assert.equal(metrics.memory_graph.evidence_coverage_percent, 100);
  assert.equal(metrics.memory_graph.average_quality_score > 0, true);
  assert.equal(metrics.savings.estimated_tokens_saved_per_recall >= 0, true);
  assert.equal(metrics.harness.policy_installed, true);
  assert.equal(metrics.harness.readiness_score > 0, true);
  assert.equal(typeof metrics.quality?.useful_memory_ratio_percent, "number");
  assert.equal(typeof metrics.pain?.estimated_tokens_saved, "number");
});

test("setup generates all-agent MCP configuration and writes Codex config idempotently", () => {
  const project = tempProject();
  const home = mkdtempSync(join(tmpdir(), "kage-home-"));
  for (const agent of SETUP_AGENTS) {
    const result = setupAgent(agent, project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home });
    assert.equal(result.agent, agent);
    assert.equal(result.config.length > 0, true);
    assert.equal(result.instructions.length > 0, true);
  }

  const first = setupAgent("codex", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(first.wrote, true);
  const second = setupAgent("codex", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(second.wrote, true);
  const config = readFileSync(join(home, ".codex", "config.toml"), "utf8");
  assert.equal((config.match(/\[mcp_servers\.kage\]/g) ?? []).length, 1);

  const claude = setupAgent("claude-code", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(claude.wrote, true);
  const claudeConfig = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
  assert.equal(claudeConfig.mcpServers.kage.command, "node");
  assert.equal(claudeConfig.mcpServers.kage.args[0], "/tmp/kage/dist/index.js");
  assert.equal(claudeConfig.mcpServers.kage.alwaysLoad, true);
  const claudeSettings = JSON.parse(readFileSync(join(home, ".claude", "settings.json"), "utf8"));
  assert.equal(Array.isArray(claudeSettings.hooks.SessionStart), true);
  assert.equal(Array.isArray(claudeSettings.hooks.Stop), true);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "session-start.sh"), "utf8"), /KAGE_MEMORY_POLICY_V1/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /kage refresh/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /kage pr summarize/);

  const doctor = setupDoctor(project);
  assert.equal(doctor.length, SETUP_AGENTS.length);

  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const cliVerify = verifyAgentActivation("codex", project, { homeDir: home });
  assert.equal(cliVerify.status, "restart_required");
  assert.equal(cliVerify.checks.config_mentions_kage, true);
  assert.equal(cliVerify.checks.policy_installed, true);
  assert.equal(cliVerify.checks.recall_works, true);
  assert.equal(cliVerify.checks.code_graph_works, true);
  assert.equal(cliVerify.checks.mcp_tool_reachable, false);
  assert.equal(cliVerify.next_steps.some((step) => step.includes("kage_verify_agent")), true);

  const mcpVerify = verifyAgentActivation("codex", project, { homeDir: home, mcpToolReachable: true });
  assert.equal(mcpVerify.status, "ready");
});

test("git hook manager installs status and uninstall while preserving existing hooks", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const hookPath = join(project, ".git", "hooks", "post-commit");
  writeFileSync(hookPath, "#!/bin/sh\nprintf existing-hook\\n\n", "utf8");
  chmodSync(hookPath, 0o755);

  const install = kageHookInstall(project);
  assert.equal(install.ok, true);
  assert.equal(install.installed, true);
  assert.equal(install.changed, true);
  assert.equal(install.hook_path, hookPath);
  const installed = readFileSync(hookPath, "utf8");
  assert.match(installed, /printf existing-hook/);
  assert.match(installed, /KAGE_POST_COMMIT_HOOK_V1/);
  assert.match(installed, /KAGE_SKIP_HOOK/);
  assert.match(installed, /"\$KAGE_BIN" refresh/);
  assert.match(installed, /pr summarize/);
  assert.equal(installed.includes(project), true);

  const reinstall = kageHookInstall(project);
  assert.equal(reinstall.ok, true);
  assert.equal(reinstall.changed, false);

  const status = kageHookStatus(project);
  assert.equal(status.ok, true);
  assert.equal(status.installed, true);

  const uninstall = kageHookUninstall(project);
  assert.equal(uninstall.ok, true);
  assert.equal(uninstall.changed, true);
  const removed = readFileSync(hookPath, "utf8");
  assert.match(removed, /printf existing-hook/);
  assert.doesNotMatch(removed, /KAGE_POST_COMMIT_HOOK_V1/);
  assert.equal(kageHookStatus(project).installed, false);
});

test("observations are privacy-scanned, deduplicated, and generic commands stay telemetry", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const event = {
    type: "command_result" as const,
    session_id: "s1",
    agent: "codex",
    command: "npm test",
    exit_code: 0,
    summary: "Tests passed after updating harness setup.",
    timestamp: "2026-05-02T10:00:00.000Z",
  };
  const stored = observe(project, event);
  assert.equal(stored.ok, true);
  assert.equal(stored.stored, true);
  const duplicate = observe(project, event);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);

  const blocked = observe(project, {
    type: "tool_result",
    session_id: "s1",
    text: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors.join("\n"), /Sensitive content blocked/);

  const distilled = distillSession(project, "s1");
  assert.equal(distilled.ok, true);
  assert.equal(distilled.observations, 1);
  assert.equal(distilled.candidates.length, 0);
});

test("distillation creates command memory only for reusable command learnings", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "cmd-meaningful",
    command: "npm test -- webhooks",
    exit_code: 0,
    summary: "Use this command after changing webhook signature verification.",
  }).ok, true);

  const distilled = distillSession(project, "cmd-meaningful");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "runbook");
  assert.match(packet?.title ?? "", /webhook signature verification/);
  assert.doesNotMatch(packet?.title ?? "", /Session .* command runbook/);
  assert.equal(packet?.source_refs[0]?.kind, "observation_session");
  assert.deepEqual(packet?.source_refs[0]?.session_id, "cmd-meaningful");
  assert.equal((packet?.quality.admission as { admit?: boolean } | undefined)?.admit, true);
});

test("distillation does not create useless touched-file memory", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "", "utf8");
  assert.equal(observe(project, {
    type: "file_change",
    session_id: "s-file",
    path: "src/server.ts",
    summary: "Edited file",
  }).ok, true);
  let distilled = distillSession(project, "s-file");
  assert.equal(distilled.ok, true);
  assert.equal(distilled.candidates.length, 0);

  assert.equal(observe(project, {
    type: "file_change",
    session_id: "s-meaningful",
    path: "src/server.ts",
    summary: "Server dispatcher maps GET /tasks and GET /summary through createApp.",
  }).ok, true);
  distilled = distillSession(project, "s-meaningful");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "workflow");
  assert.match(packet?.title ?? "", /Server dispatcher maps/);
  assert.doesNotMatch(packet?.title ?? "", /touched 1 repo paths/);
  assert.deepEqual(packet?.paths, ["src/server.ts"]);
});

test("distillation keeps ordinary prompts episodic and admits durable prompt learnings", () => {
  const project = tempProject();
  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-generic",
    text: "Build a todo app and show me the graph.",
  }).ok, true);
  let distilled = distillSession(project, "prompt-generic");
  assert.equal(distilled.candidates.length, 0);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-durable",
    text: "Decision: prefer kage_learn for durable session discoveries; avoid saving raw task prompts as memory.",
  }).ok, true);
  distilled = distillSession(project, "prompt-durable");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "decision");
  assert.match(packet?.title ?? "", /Decision/);
  assert.doesNotMatch(packet?.title ?? "", /user intent/);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-explanation",
    text: "Code explanation: createApp owns HTTP app wiring. Why: callers need one setup point for middleware and routes.",
  }).ok, true);
  distilled = distillSession(project, "prompt-explanation");
  const explanation = distilled.candidates[0]?.packet;
  assert.equal(explanation?.type, "code_explanation");
  assert.match(explanation?.context?.why ?? "", /callers need one setup point/);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-issue",
    text: "Issue context: Upload retries still fail after token refresh. Hypothesis: the refresh path does not update queued request metadata.",
  }).ok, true);
  distilled = distillSession(project, "prompt-issue");
  const issue = distilled.candidates[0]?.packet;
  assert.equal(issue?.type, "issue_context");
  assert.match(issue?.body ?? "", /Hypothesis/);
});

test("memory admission rejects session bookkeeping and accepts durable repo knowledge", () => {
  const project = tempProject();
  const bad = capture({
    projectDir: project,
    title: "Session abc command runbook",
    summary: "Observed commands: npm test",
    body: "Observed during session abc:\n- npm test (exit 0)",
    type: "runbook",
  });
  assert.equal(bad.ok, true);
  assert.equal(evaluateMemoryAdmission(project, bad.packet!).admit, false);

  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "", "utf8");
  const good = capture({
    projectDir: project,
    title: "Webhook replay tests verify signatures",
    summary: "Use npm test -- webhooks after changing webhook signature verification.",
    body: "Use npm test -- webhooks after changing webhook signature verification because the normal suite does not replay signed payload fixtures. Verified by: npm test -- webhooks.",
    type: "runbook",
    paths: ["src/server.ts"],
    tags: ["webhook", "tests"],
  });
  assert.equal(good.ok, true);
  assert.equal(evaluateMemoryAdmission(project, good.packet!).admit, true);
});

test("recall explanations, quality, and benchmark expose proof metrics", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);

  const result = recall(project, "how do I run tests", 5, true);
  assert.equal(result.explanations?.length! > 0, true);
  assert.equal(typeof result.results[0]?.score_breakdown?.final, "number");

  const quality = qualityReport(project);
  assert.equal(typeof quality.useful_memory_ratio_percent, "number");
  assert.equal(typeof quality.evidence_coverage_percent, "number");

  const benchmark = benchmarkProject(project);
  assert.equal(typeof benchmark.overall_score, "number");
  assert.equal(Array.isArray(benchmark.gates), true);
  assert.equal(benchmark.gates.some((gate) => gate.name === "recall_hit_rate"), true);
  assert.equal(typeof benchmark.pain_metrics.recall_hit_rate_percent, "number");
  assert.equal(typeof benchmark.pain_metrics.estimated_tokens_saved, "number");

  const comparison = benchmarkTaskComparison(project, "how do I run tests");
  assert.equal(comparison.task, "how do I run tests");
  assert.equal(comparison.baseline_without_kage.files_examined > 0, true);
  assert.equal(comparison.with_kage.context_tokens > 0, true);
  assert.equal(typeof comparison.delta.context_reduction_percent, "number");
  assert.equal(comparison.evidence.kage_memory.length > 0, true);
});

test("capture extracts structured engineering memory context", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");

  const result = capture({
    projectDir: project,
    title: "Decision: keep code facts separate from memory facts",
    body: "Decision: keep source-derived code facts separate from learned memory facts.\n\nWhy: parser facts should stay rebuildable and should not be overwritten by stale human notes.\n\nVerified by: npm test\n\nRisk if forgotten: future agents may collapse code graph and memory graph into one untrusted store.\n\nStale when: memory packets can directly overwrite generated code facts.",
    type: "decision",
    paths: ["src/server.ts"],
  });

  assert.equal(result.ok, true);
  assert.equal(result.packet?.context?.why?.includes("parser facts"), true);
  assert.equal(result.packet?.context?.risk_if_forgotten?.includes("collapse code graph"), true);
  assert.equal(result.packet?.context?.verification, "npm test");
  assert.equal(result.packet?.context?.stale_when?.includes("overwrite generated code facts"), true);
});

test("knowledge graph links structured memory to source symbols and verification commands", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Code explanation: createApp owns HTTP app wiring",
    body: "The createApp function owns HTTP app wiring. Why: callers need one setup point for middleware and routes. Verified by: node mcp/dist/cli.js audit --project . --json. Risk if forgotten: callers may bypass shared app setup.",
    type: "code_explanation",
    paths: ["src/server.ts"],
  });
  assert.equal(result.ok, true);
  assert.match(result.packet?.context?.verification ?? "", /cli\.js audit --project \. --json/);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.entities.some((entity) => entity.type === "symbol" && entity.name === "createApp"), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "explains_symbol" && edge.fact.includes("createApp")), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "explains_symbol" && edge.fact.includes("graph in src/server.ts")), false);
  assert.equal(graph.edges.some((edge) => edge.relation === "verified_by" && edge.fact.includes("cli.js audit --project . --json")), true);
});

test("viewer coalesces memory graph code entities with code graph nodes", () => {
  const source = readFileSync(join(process.cwd(), "viewer", "app.js"), "utf8");
  const element = () => ({
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    querySelector() { return element(); },
    querySelectorAll() { return []; },
    getContext() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 660 }; },
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    dataset: {},
    textContent: "",
    innerHTML: "",
    value: "",
    checked: false,
    clientWidth: 1000,
    clientHeight: 660,
    width: 1000,
    height: 660,
  });
  const sandbox: Record<string, unknown> = {
    console,
    Promise,
    Set,
    Map,
    URLSearchParams,
    Option: function Option(text: string, value: string) { return { text, value }; },
    document: {
      getElementById() { return element(); },
      createElementNS() { return element(); },
      createElement() { return element(); },
    },
    window: {
      location: { search: "?skipAutoLoad=1" },
      addEventListener() {},
      requestAnimationFrame() { return 0; },
      cancelAnimationFrame() {},
    },
    fetch() { return Promise.reject(new Error("skip network")); },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);

  const hooks = sandbox.__KAGE_VIEWER_TEST__ as {
    normalizeGraph(graph: unknown): { entities: Array<{ id: string; graph_kind: string; aliases?: string[] }>; edges: Array<{ from: string; to: string; relation: string; memory_code_link?: boolean }>; episodes: unknown[] };
    mergeNormalizedGraphs(graphs: Array<{ entities: unknown[]; edges: unknown[]; episodes: unknown[] }>): { entities: Array<{ id: string; graph_kind: string }>; edges: Array<{ from: string; to: string; relation: string; fact?: string; memory_code_link?: boolean }> };
    isMemoryCodeRelation(relation: string): boolean;
    hydrateCompactCodeGraph(graph: unknown, basePath: string): Promise<unknown>;
    testSignalVisibilityForGraph(graph: unknown, maxNodes: number): { entities: number; edges: number };
    testCombinedVisibilityForGraphs(graphs: unknown[], maxNodes: number): { entities: number; edges: number; memoryCodeEdges: number; pathBridgeEdges: number; codeEdges: number; memory: number; code: number };
    testRelationVisibilityForGraphs(graphs: unknown[], relation: string, maxNodes: number): { entities: number; edges: number; memoryCodeEdges: number; pathBridgeEdges: number; codeEdges: number; memory: number; code: number };
  };
  assert.equal(typeof hooks.normalizeGraph, "function");
  assert.equal(typeof hooks.hydrateCompactCodeGraph, "function");
  assert.equal(typeof hooks.testSignalVisibilityForGraph, "function");
  assert.equal(typeof hooks.testCombinedVisibilityForGraphs, "function");
  assert.equal(typeof hooks.testRelationVisibilityForGraphs, "function");

  const symbolId = "symbol:src-server-ts:function:createapp:1";
  const memoryGraph = hooks.normalizeGraph({
    entities: [
      { id: "memory:packet-1", type: "memory", name: "createApp memory", aliases: ["packet-1"], evidence: [] },
      { id: "symbol:symbol-src-server-ts-function-createapp-1", type: "symbol", name: "createApp", aliases: [symbolId, "src/server.ts"], evidence: [] },
      { id: "memory:stale", type: "memory", name: "Stale symbol memory", aliases: [], evidence: [] },
      { id: "symbol:stale-legacy-symbol", type: "symbol", name: "legacyHandler", aliases: ["src/server.ts"], evidence: [] },
      { id: "memory:file-note", type: "memory", name: "File memory", aliases: [], evidence: [] },
      { id: "path:src/server.ts", type: "path", name: "src/server.ts", aliases: [], evidence: [] },
    ],
    edges: [
      { id: "edge-1", from: "memory:packet-1", to: "symbol:symbol-src-server-ts-function-createapp-1", relation: "explains_symbol", fact: "memory explains createApp", evidence: [] },
      { id: "edge-stale", from: "memory:stale", to: "symbol:stale-legacy-symbol", relation: "explains_symbol", fact: "stale symbol should not fall back to a file", evidence: [] },
      { id: "edge-2", from: "memory:file-note", to: "path:src/server.ts", relation: "affects_path", fact: "memory applies to file", evidence: [] },
    ],
    episodes: [],
  });
  const codeGraph = hooks.normalizeGraph({
    files: [{ path: "src/server.ts", kind: "source", language: "typescript", parser: "lsp", line_count: 1, hash: "abc" }],
    symbols: [{ id: symbolId, name: "createApp", kind: "function", path: "src/server.ts", line: 1, language: "typescript", signature: "function createApp()" }],
    imports: [],
    routes: [],
    tests: [],
    packages: [],
    repo_state: {},
  });
  const merged = hooks.mergeNormalizedGraphs([memoryGraph, codeGraph]);
  const normalizedCodeGraph = hooks.normalizeGraph({
    files: [{ path: "src/rich.ts", kind: "source", language: "typescript", parser: "typescript-ast", line_count: 3, size_bytes: 84, hash: "rich" }],
    symbols: [{ id: "symbol:src-rich-ts:function:rich:1", name: "rich", kind: "function", path: "src/rich.ts", line: 1, end_line: 2, language: "typescript", parser: "typescript-ast", export: true, signature: "export function rich()" }],
    imports: [],
    routes: [],
    tests: [],
    packages: [],
    repo_state: {},
  });
  const richSymbol = normalizedCodeGraph.entities.find((entity) => entity.id === "symbol:src-rich-ts:function:rich:1") as Record<string, unknown> | undefined;

  assert.equal(merged.entities.filter((entity) => entity.id === symbolId).length, 1);
  assert.equal(merged.entities.some((entity) => entity.id === "symbol:symbol-src-server-ts-function-createapp-1"), false);
  assert.equal(merged.entities.some((entity) => entity.id === "symbol:stale-legacy-symbol"), true);
  assert.equal(merged.edges.some((edge) => edge.to === symbolId && edge.relation === "explains_symbol" && edge.memory_code_link), true);
  assert.equal(merged.edges.some((edge) => edge.to === "file:src/server.ts" && (edge.fact ?? "").includes("stale symbol")), false);
  assert.equal(merged.edges.some((edge) => edge.to === "symbol:stale-legacy-symbol" && edge.relation === "explains_symbol" && edge.memory_code_link), false);
  assert.equal(merged.edges.some((edge) => edge.from === "memory:file-note" && edge.to === "file:src/server.ts" && edge.relation === "affects_path" && edge.memory_code_link), true);
  assert.equal(merged.edges.some((edge) => edge.from === "memory:file-note" && edge.to === symbolId), false);
  assert.equal(hooks.isMemoryCodeRelation("verified_by_test"), true);
  assert.equal(richSymbol?.path, "src/rich.ts");
  assert.equal(richSymbol?.parser, "typescript-ast");
  assert.equal(richSymbol?.signature, "export function rich()");

  const largeCodeGraph = {
    files: Array.from({ length: 120 }, (_, index) => ({
      path: `src/unit-${index}.ts`,
      kind: "source",
      language: "typescript",
      line_count: 2,
      hash: String(index),
    })),
    symbols: Array.from({ length: 120 }, (_, index) => ({
      id: `symbol:unit-${index}`,
      name: `feature${index}`,
      kind: "function",
      path: `src/unit-${index}.ts`,
      language: "typescript",
      parser: "typescript-ast",
      line: 1,
      signature: `feature${index}()`,
    })),
    calls: Array.from({ length: 119 }, (_, index) => ({
      from_symbol: `symbol:unit-${index}`,
      to_symbol: `symbol:unit-${index + 1}`,
      path: `src/unit-${index}.ts`,
      line: 2,
    })),
  };
  const signal = hooks.testSignalVisibilityForGraph(largeCodeGraph, 90);
  assert.equal(signal.entities <= 90, true);
  assert.equal(signal.edges > 0, true);

  const pathBridgeMerged = hooks.mergeNormalizedGraphs([
    hooks.normalizeGraph({
      entities: [
        { id: "memory:src-note", type: "memory", name: "Source convention", aliases: [], evidence: [] },
        { id: "path:src", type: "path", name: "src", aliases: [], evidence: [] },
      ],
      edges: [
        { id: "src-path", from: "memory:src-note", to: "path:src", relation: "affects_path", fact: "Source convention applies to src.", evidence: [] },
      ],
      episodes: [],
    }),
    hooks.normalizeGraph(largeCodeGraph),
  ]);
  const bridgeEdges = pathBridgeMerged.edges.filter((edge) => edge.relation === "affects_code_path");
  assert.equal(bridgeEdges.length, 8);
  assert.equal(bridgeEdges.every((edge) => edge.from === "memory:src-note" && edge.to.startsWith("file:src/") && edge.memory_code_link), true);
  assert.equal(pathBridgeMerged.edges.some((edge) => edge.relation === "affects_path" && edge.memory_code_link), false);
  assert.equal(hooks.isMemoryCodeRelation("affects_path"), false);

  const combined = hooks.testCombinedVisibilityForGraphs([
    {
      entities: [
        { id: "memory:repo", type: "memory", name: "Repo summary", aliases: [], evidence: [] },
        { id: "memory:decision", type: "memory", name: "Decision", aliases: [], evidence: [] },
        { id: "path:src", type: "path", name: "src", aliases: [], evidence: [] },
        { id: "symbol:unit-0", type: "symbol", name: "feature0", aliases: ["symbol:unit-0"], evidence: [] },
      ],
      edges: [
        { id: "mem-code", from: "memory:decision", to: "symbol:unit-0", relation: "informs_symbol", fact: "Decision informs feature0", evidence: [] },
        { id: "mem-path", from: "memory:repo", to: "path:src", relation: "affects_path", fact: "Repo summary applies to src", evidence: [] },
      ],
      episodes: [],
    },
    largeCodeGraph,
  ], 90);
  assert.equal(combined.entities <= 90, true);
  assert.equal(combined.memory > 0, true);
  assert.equal(combined.code > 0, true);
  assert.equal(combined.edges > 0, true);
  assert.equal(combined.edges <= 360, true);
  assert.equal(combined.memoryCodeEdges > 0, true);
  assert.equal(combined.pathBridgeEdges > 0, true);
  assert.equal(combined.codeEdges > 0, true);

  const memoryCodeOnly = hooks.testRelationVisibilityForGraphs([
    {
      entities: [
        { id: "memory:repo", type: "memory", name: "Repo summary", aliases: [], evidence: [] },
        { id: "path:src", type: "path", name: "src", aliases: [], evidence: [] },
      ],
      edges: [
        { id: "mem-path", from: "memory:repo", to: "path:src", relation: "affects_path", fact: "Repo summary applies to src", evidence: [] },
      ],
      episodes: [],
    },
    largeCodeGraph,
  ], "__memory_code__", 90);
  assert.equal(memoryCodeOnly.edges, memoryCodeOnly.memoryCodeEdges);
  assert.equal(memoryCodeOnly.pathBridgeEdges > 0, true);
  assert.equal(memoryCodeOnly.codeEdges, 0);
});

test("auditProject reports trust and concrete memory/code graph recommendations", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = capture({
    projectDir: project,
    title: "Architecture note",
    body: "The architecture note explains a design choice but has no structured why or risk fields.",
    type: "reference",
  });
  assert.equal(result.ok, true);

  const audit = auditProject(project);
  assert.equal(audit.ok, true);
  assert.equal(typeof audit.trust_score, "number");
  assert.equal(audit.trust_score < 100, true);
  assert.equal(audit.checks.structured_memory.total_packets >= 1, true);
  assert.equal(audit.checks.memory_inbox.pending_packets, 0);
  assert.equal(audit.checks.code_graph.precise_files >= 0, true);
  assert.equal(audit.recommendations.some((item) => item.includes("structured context") || item.includes("SCIP")), true);
});

test("memoryInbox consolidates pending stale and structured-context work", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function start() { return true; }\n", "utf8");

  const missingContext = capture({
    projectDir: project,
    title: "Architecture note",
    body: "This packet has a useful note but no rationale, verification, or stale condition.",
    type: "reference",
    paths: ["src/server.ts"],
  });
  assert.equal(missingContext.ok, true);

  const stale = capture({
    projectDir: project,
    title: "Decision: removed file owned startup",
    body: "Why: the removed file used to own startup wiring.\n\nVerified by: historical review",
    type: "decision",
    paths: ["src/removed.ts"],
  });
  assert.equal(stale.ok, true);

  const pending = capture({
    projectDir: project,
    title: "Decision: review before promotion",
    body: "Why: org/global memory needs human review.\n\nVerified by: policy review",
    type: "decision",
    paths: ["src/server.ts"],
  });
  assert.equal(pending.ok, true);
  mkdirSync(pendingDir(project), { recursive: true });
  writeFileSync(join(pendingDir(project), "pending-review.json"), JSON.stringify({ ...pending.packet, status: "pending" }, null, 2), "utf8");

  const inbox = memoryInbox(project);
  assert.equal(inbox.ok, false);
  assert.equal(inbox.counts.pending, 1);
  assert.equal(inbox.items.some((item) => item.kind === "pending" && item.packet_id === pending.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "stale" && item.packet_id === stale.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "missing_context" && item.packet_id === missingContext.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "validation_warning"), true);
  assert.equal(inbox.recommendations.length > 0, true);
});

test("graph query returns relevant typed facts", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = queryGraph(project, "run tests");
  assert.match(result.context_block, /Kage Graph Context/);
  assert.equal(result.edges.some((edge) => edge.fact.includes("npm run test")), true);
});

test("exports the knowledge graph as Mermaid", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const visual = graphMermaid(project);
  assert.match(visual.mermaid, /flowchart LR/);
  assert.match(visual.mermaid, /documents_command|defines_command/);
  assert.equal(visual.edges > 0, true);
});

test("learn captures actual session learning with inferred type", () => {
  const project = tempProject();
  mkdirSync(join(project, "mcp"), { recursive: true });
  writeFileSync(join(project, "mcp", "index.ts"), "", "utf8");
  const result = learn({
    projectDir: project,
    learning: "Decision: agents should use kage_learn for actual session discoveries and diff proposal only as a fallback. Why: session learnings can capture cause and rationale that raw diffs cannot.",
    paths: ["mcp/index.ts"],
    tags: ["session-learning"],
    verifiedBy: "npm test",
  });
  assert.equal(result.ok, true);
  assert.equal(result.packet?.type, "decision");
  assert.equal(result.packet?.tags.includes("session-learning"), true);
  assert.match(result.packet?.body ?? "", /Verified by: npm test/);
  assert.match(result.packet?.context?.why ?? "", /cause and rationale/);
  assert.equal(result.packet?.context?.verification, "npm test");
});

test("graph command extraction ignores prose and file references", () => {
  const project = tempProject();
  mkdirSync(join(project, "scripts"), { recursive: true });
  writeFileSync(join(project, "scripts", "stop.sh"), "#!/bin/sh\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Session dedupe",
    body: "The `stop.sh` hook prevents duplicate memory nodes. Store state in `~/.claude/kage/.processed_sessions`. Use npm run test to verify.",
    type: "convention",
    paths: ["scripts/stop.sh"],
  });
  assert.equal(result.ok, true);

  const graph = buildKnowledgeGraph(project);
  const commandNames = graph.entities.filter((entity) => entity.type === "command").map((entity) => entity.name);
  assert.deepEqual(commandNames, ["npm run test"]);
});

test("graph skips missing path edges even when packets warn about them", () => {
  const project = tempProject();
  mkdirSync(join(project, "node_modules", "debug"), { recursive: true });
  writeFileSync(join(project, "node_modules", "debug", "README.md"), "dependency docs\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Old backend flow",
    body: "This memory references a path that no longer exists.",
    type: "workflow",
    paths: ["backend", "node_modules/debug/README.md"],
  });
  assert.equal(result.ok, true);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("backend")), false);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("node_modules")), false);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
});

test("capture blocks sensitive content before writing repo memory", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Secret handling",
    body: "The api_key = sk_live_123456789 should never be saved.",
    type: "gotcha",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Sensitive content blocked/);
});

test("capture writes valid repo-local packet for safe memory", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Use webhook replay tests",
    body: "Run pnpm test:api -- webhooks after changing billing webhooks.",
    type: "runbook",
    tags: ["billing", "webhook"],
    paths: ["backend/billing"],
  });
  assert.equal(result.ok, true);
  assert.ok(result.path);
  assert.equal(result.packet?.status, "approved");
  assert.match(result.path!, /\/packets\//);
  assert.match(readFileSync(result.path!, "utf8"), /Use webhook replay tests/);
});

test("records usefulness feedback on approved packets", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project)[0];
  const result = recordFeedback(project, packet.id, "stale");
  assert.equal(result.ok, true);
  assert.equal((result.packet?.quality as Record<string, unknown>).reports_stale, 1);
  assert.ok((result.packet?.freshness as Record<string, unknown>).stale_reported_at);
});

test("packet validation catches invalid type and confidence range", () => {
  const result = validatePacket({
    schema_version: 2,
    id: "bad",
    title: "Bad",
    summary: "Bad",
    body: "Bad",
    type: "unknown" as never,
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 2,
    tags: [],
    paths: [],
    stack: [],
    source_refs: [],
    freshness: {},
    edges: [],
    quality: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /invalid type|confidence/);
});

test("sensitive scanner detects common leak shapes", () => {
  assert.deepEqual(scanSensitiveText("hello world"), []);
  assert.equal(scanSensitiveText("Contact person@example.com").includes("email address"), true);
  assert.equal(scanSensitiveText("Authorization: Bearer abcdefghijklmnopqrstuvwxyz").includes("generic bearer token"), true);
  assert.equal(scanSensitiveText("STRIPE_SECRET_KEY=sk_test_1234567890abcdefghijklmnopqrstuvwxyz").includes("api key assignment"), true);
  assert.equal(scanSensitiveText("STRIPE_SECRET_KEY=sk_test_1234567890abcdefghijklmnopqrstuvwxyz").includes("stripe secret key"), true);
  assert.equal(scanSensitiveText("STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz").includes("stripe webhook secret"), true);
});

test("project validation warns when indexes are missing", () => {
  const project = tempProject();
  const result = validateProject(project);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((warning) => warning.includes("catalog")), true);
  assert.ok(packetsDir(project));
});

test("project validation warns when legacy markdown has not been migrated", () => {
  const project = tempProject();
  writeFileSync(join(project, ".agent_memory", "nodes", "run-tests.md"), "# Run tests\n\nUse npm test.\n", "utf8");
  const result = validateProject(project);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((warning) => warning.includes("has not been migrated")), true);
});

test("project validation warns when approved packet paths are ungrounded", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Missing path memory",
    body: "This should point at a real subsystem.",
    type: "reference",
    paths: ["missing/subsystem"],
  });
  assert.equal(result.ok, true);
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  writeFileSync(result.path!, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
});

test("project validation ignores retired packet quality warnings", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Retired memory",
    body: "This old memory points at a subsystem that no longer exists.",
    type: "reference",
    paths: ["missing/subsystem"],
  });
  assert.equal(result.ok, true);
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  packet.status = "deprecated";
  writeFileSync(result.path!, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  renameSync(result.path!, `${result.path!}.retired`);

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("none of the referenced paths exist")), false);
});

test("project validation ignores duplicate warnings between generated branch change memories", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "first branch notes\n", "utf8");

  const first = proposeFromDiff(project);
  assert.equal(first.ok, true);
  assert.ok(first.packet?.tags.includes("change-memory"));

  execFileSync("git", ["checkout", "-b", "feature/docs"], { cwd: project, stdio: "ignore" });
  const second = proposeFromDiff(project);
  assert.equal(second.ok, true);
  assert.ok(second.packet?.tags.includes("change-memory"));

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("possible duplicate of Change memory")), false);
});

test("public catalog compatibility accepts nodes and node_count", () => {
  assert.equal(catalogDomainNodeCount({ nodes: 3 }), 3);
  assert.equal(catalogDomainNodeCount({ node_count: 4 }), 4);
  assert.equal(catalogDomainNodeCount({}), 0);
});

test("init and doctor expose first-run health and recall preview", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const init = initProject(project);
  assert.equal(init.validation.ok, true);
  assert.match(init.sampleRecall.context_block, /vitest|test/i);
  assert.equal(init.index.indexes.some((path) => path.endsWith("indexes/catalog.json")), true);
  assert.equal(existsSync(join(project, ".agent_memory", "code_graph", "graph.json")), false);
  assert.equal(existsSync(join(project, ".agent_memory", "graph", "graph.json")), false);

  const doctor = doctorProject(project);
  assert.equal(doctor.validation.ok, true);
  assert.equal(doctor.indexesMissing.includes("code-graph.json"), true);
  assert.equal(doctor.graphEntities > 0, true);
  assert.equal(doctor.graphEdges > 0, true);
  assert.match(doctor.sampleRecall, /Kage Context/);
});

test("registry recommendations detect docs skills and MCPs from package metadata", () => {
  const project = tempProject();
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({
      name: "demo",
      dependencies: {
        next: "15.0.0",
        react: "19.0.0",
        prisma: "6.0.0",
        stripe: "18.0.0",
        "@modelcontextprotocol/sdk": "1.0.0",
      },
    }),
    "utf8"
  );

  const recommendations = registryRecommendations(project);
  assert.equal(recommendations.some((item) => item.id === "docs:nextjs" && item.install === "read_only"), true);
  assert.equal(recommendations.some((item) => item.id === "docs:stripe" && item.trust === "official"), true);
  assert.equal(recommendations.some((item) => item.id === "mcp:database-inspector" && item.install === "manual_approval_required"), true);
});

test("graph registry manifest signs graph artifacts and source packet hashes", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");
  const packet = capture({
    projectDir: project,
    title: "Decision: createApp owns setup",
    body: "Why: one setup point keeps middleware consistent.\n\nVerified by: npm test",
    type: "decision",
    paths: ["src/server.ts"],
  });
  assert.equal(packet.ok, true);
  writeLspSymbolIndex(project);
  refreshProject(project);

  const result = buildGraphRegistryManifest(project);
  assert.equal(result.ok, true);
  assert.match(result.path, /graph_registry\/manifest\.json$/);
  assert.equal(result.manifest.kind, "graph_registry");
  assert.equal(result.manifest.signature.algorithm, "sha256-canonical-json");
  assert.equal(result.manifest.payload.sources.packets.some((source) => source.id === packet.packet?.id && source.content_sha256.length === 64), true);
  assert.equal(result.manifest.payload.artifacts.some((artifact) => artifact.path === ".agent_memory/graph/graph.json" && artifact.sha256.length === 64), true);
  assert.equal(result.manifest.payload.artifacts.some((artifact) => artifact.path === ".agent_memory/code_graph/graph.json" && artifact.sha256.length === 64), true);
  assert.equal(result.manifest.payload.reports.audit.trust_score >= 0, true);
  assert.equal(result.manifest.payload.reports.inbox.pending, 0);
  assert.equal(result.manifest.payload.repo_state.branch !== undefined, true);
  assert.match(readFileSync(result.path, "utf8"), /graph_registry/);
});

test("public candidate promotion sanitizes private packet metadata", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);

  const result = createPublicCandidate(project, packet.id);
  assert.equal(result.ok, true);
  assert.ok(result.packet);
  assert.equal(result.packet.scope, "public");
  assert.equal(result.packet.visibility, "public");
  assert.equal(result.packet.sensitivity, "public");
  assert.deepEqual(result.packet.paths, []);
  assert.equal(result.packet.source_refs[0]?.kind, "local_public_candidate");
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("no repo-grounded source reference")), false);
  assert.equal(Object.values(result.packet.source_refs[0] ?? {}).some((value) => String(value).includes("package.json")), false);
});

test("exports public candidates as a static bundle", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);
  assert.equal(createPublicCandidate(project, packet.id).ok, true);
  const bundle = exportPublicBundle(project);
  assert.equal(bundle.ok, true);
  assert.equal(bundle.packetCount, 1);
  assert.match(readFileSync(bundle.path!, "utf8"), /public_candidate_bundle/);
  assert.match(readFileSync(bundle.path!, "utf8"), /payload_sha256/);
});

test("org memory upload, review, registry export, and layered recall are human-gated", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);

  const upload = orgUploadPacket(project, "acme", packet.id);
  assert.equal(upload.ok, true);
  assert.ok(upload.packet);
  assert.equal(upload.packet.status, "pending");
  assert.equal(upload.packet.scope, "org");
  assert.equal(orgRecall(project, "acme", "run tests").results.length, 0);

  const review = orgReviewPacket(project, "acme", upload.packet.id, "approve");
  assert.equal(review.ok, true);
  const orgResult = orgRecall(project, "acme", "run tests");
  assert.equal(orgResult.results.length > 0, true);
  const registry = exportOrgRegistry(project, "acme");
  assert.equal(registry.approved, 1);
  assert.match(readFileSync(registry.registry_path!, "utf8"), /org_registry/);

  const layered = layeredRecall(project, "run tests", { org: "acme", includeGlobal: false });
  assert.deepEqual(layered.priority_order, ["branch", "repo", "org"]);
  assert.equal((layered.org?.results.length ?? 0) > 0, true);
});

test("marketplace and local global CDN bundle are explicit-review artifacts", () => {
  const project = tempProject();
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "demo", dependencies: { next: "15.0.0", react: "19.0.0", stripe: "18.0.0" } }),
    "utf8"
  );
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);
  assert.equal(createPublicCandidate(project, packet.id).ok, true);

  const marketplace = buildMarketplace(project);
  assert.equal(marketplace.ok, true);
  assert.equal(marketplace.packs.some((pack) => pack.id === "docs:nextjs"), true);
  assert.match(readFileSync(marketplace.path, "utf8"), /explicit_human_approval_required/);

  const global = buildGlobalCdnBundle(project, "acme");
  assert.equal(global.ok, true);
  assert.equal(global.packet_count, 1);
  assert.equal(global.marketplace_packs >= 2, true);
  assert.match(readFileSync(global.alias_path!, "utf8"), /rollback_ready/);
  assert.match(readFileSync(global.manifest_path!, "utf8"), /org_registry/);
});

test("builds branch overlay metadata", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  const overlay = buildBranchOverlay(project);
  assert.equal(overlay.changed_files.includes("README.md"), true);
  assert.equal(Array.isArray(overlay.pending_packet_ids), true);
});

test("creates review artifact for legacy pending packets and branch summaries", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "changed\n", "utf8");
  assert.equal(proposeFromDiff(project).ok, true);
  const result = capture({
    projectDir: project,
    title: "Review me",
    body: "Legacy pending memory needs human review.",
    type: "reference",
  });
  assert.equal(result.ok, true);
  const pendingPacket = { ...result.packet!, id: `${result.packet!.id}-pending`, status: "pending" };
  writeFileSync(join(project, ".agent_memory", "pending", "review-me.json"), `${JSON.stringify(pendingPacket, null, 2)}\n`, "utf8");
  const artifact = createReviewArtifact(project);
  assert.equal(artifact.pending, 1);
  assert.match(readFileSync(artifact.path, "utf8"), /Review me/);
  assert.match(readFileSync(artifact.path, "utf8"), /Quality score/);
  assert.match(readFileSync(artifact.path, "utf8"), /Estimated tokens saved/);
  assert.match(readFileSync(artifact.path, "utf8"), /Branch Summary/);
});

test("diff proposal creates a branch review summary and repo-local change memory", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "node_modules", "left-pad"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "vitest", build: "tsc" } }), "utf8");
  writeFileSync(join(project, "src", "runner.ts"), "export const command = 'npm test';\n", "utf8");
  writeFileSync(join(project, "node_modules", "left-pad", "README.md"), "dependency noise\n", "utf8");

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.ok(result.packet);
  assert.ok(result.packetPath);
  assert.equal(result.packet.type, "workflow");
  assert.equal(result.packet.status, "approved");
  assert.equal(result.packet.tags.includes("change-memory"), true);
  assert.match(result.packetPath, /\/packets\//);
  assert.ok(result.summary);
  assert.equal(result.summary.repo_memory_written, true);
  assert.equal(result.summary.promotion_review_required, true);
  assert.equal(result.changedFiles.includes("src/runner.ts"), true);
  assert.equal(result.changedFiles.some((path) => path.includes("node_modules")), false);
  assert.equal(result.packet.paths.some((path) => path.includes("node_modules")), false);
  assert.match(result.packet.context?.why ?? "", /git diff/);
  assert.match(result.packet.context?.stale_when ?? "", /branch diff changes/);
  assert.match(readFileSync(result.path!, "utf8"), /git_diff/);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("no repo-grounded source reference")), false);
  assert.equal(recall(project, "what changed runner npm test").results.some((item) => item.packet.id === result.packet!.id), true);
});

test("diff proposal from a package directory stores project-relative paths", () => {
  const root = tempProject();
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  mkdirSync(join(root, "packages", "ai", "src"), { recursive: true });
  writeFileSync(join(root, "README.md"), "root readme\n", "utf8");
  commitAll(root, "initial");
  const project = join(root, "packages", "ai");
  writeFileSync(join(project, "src", "client.ts"), "export const client = true;\n", "utf8");

  const result = proposeFromDiff(project);

  assert.equal(result.ok, true);
  assert.equal(result.changedFiles.includes("src/client.ts"), true);
  assert.equal(result.changedFiles.some((path) => path.startsWith("packages/ai/")), false);
  assert.equal(result.packet?.paths.includes("src/client.ts"), true);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("none of the referenced paths exist")), false);
});

test("diff proposal includes repo memory packet-only changes", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" },
  });

  const learned = learn({
    projectDir: project,
    title: "Release workflow gotcha",
    learning: "Use GIT_EDITOR=true for non-interactive release rebases and fetch before npm publish.",
    type: "gotcha",
    tags: ["release", "npm"],
    paths: ["README.md"],
  });
  assert.equal(learned.ok, true);

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.equal(result.changedFiles.some((path) => path.startsWith(".agent_memory/packets/")), true);
  assert.equal(result.packet?.paths.some((path) => path.startsWith(".agent_memory/packets/")), true);
  assert.match(result.summary?.diff_stat ?? "", /\.agent_memory\/packets\//);
});

test("diff proposal stat includes untracked files alongside tracked diffs", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" },
  });
  writeFileSync(join(project, "README.md"), "hello again\n", "utf8");
  writeFileSync(join(project, "src", "new-release.ts"), "export const release = true;\n", "utf8");

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.match(result.summary?.diff_stat ?? "", /README\.md/);
  assert.match(result.summary?.diff_stat ?? "", /src\/new-release\.ts/);
});

test("refresh rebuilds graphs and marks path-drifted memory stale", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const result = capture({
    projectDir: project,
    title: "Old runbook path",
    body: "Run tests with npm test after changing the old runner module. Verified by local command output.",
    type: "runbook",
    paths: ["src/old-runner.ts"],
    tags: ["tests"],
  });
  assert.equal(result.ok, true);

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  assert.equal(refresh.stale_packets.some((packet) => packet.id === result.packet!.id), true);
  assert.equal(refresh.code_graph.files >= 0, true);
  assert.equal(refresh.memory_graph.entities > 0, true);

  const packet = loadApprovedPackets(project).find((candidate) => candidate.id === result.packet!.id);
  assert.ok(packet);
  assert.equal(packet.quality.stale, true);
  assert.match((packet.quality.stale_reasons as string[]).join(" "), /missing/);
});

test("refresh uses lightweight metrics and leaves benchmarks to metrics command", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  assert.equal(refresh.metrics.pain, undefined);
  assert.equal(refresh.metrics.quality, undefined);
  assert.equal(refresh.metrics.code_graph.files > 0, true);

  const metrics = kageMetrics(project);
  assert.ok(metrics.pain);
  assert.ok(metrics.quality);
});

test("gc deprecates stale packets by exact packet file path", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const result = capture({
    projectDir: project,
    title: "Removed helper runbook",
    body: "Run tests with npm test after changing the removed helper.",
    type: "runbook",
    paths: ["src/removed-helper.ts"],
    tags: ["tests"],
  });
  assert.equal(result.ok, true);

  const dryRun = gcProject(project, { dryRun: true });
  assert.equal(dryRun.deprecated.length, 1);
  let packet = JSON.parse(readFileSync(result.path!, "utf8"));
  assert.equal(packet.status, "approved");

  const gc = gcProject(project);
  assert.equal(gc.deprecated.length, 1);
  packet = JSON.parse(readFileSync(result.path!, "utf8"));
  assert.equal(packet.status, "deprecated");
  assert.equal(loadApprovedPackets(project).some((candidate) => candidate.id === result.packet!.id), false);
});

test("pr summarize and check make merge-time memory health explicit", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");

  const summary = prSummarize(project);
  assert.equal(summary.ok, true);
  assert.ok(summary.diff_memory_packet_id);
  assert.ok(summary.review_artifact_path);
  assert.equal(summary.changed_files.includes("src/runner.js"), true);

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  const check = prCheck(project);
  assert.equal(check.ok, true);
  assert.equal(check.code_graph_current, true);
  assert.equal(check.memory_graph_current, true);
  assert.equal(check.memory_packet_changes.length > 0, true);
});

test("pr check accepts same-tree commits after graph refresh", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  commitAll(project, "initial");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  execFileSync("git", ["commit", "--allow-empty", "-m", "metadata-only"], { cwd: project, stdio: "ignore", env: gitIdentityEnv });

  const check = prCheck(project);
  assert.equal(check.code_graph_current, true);
  assert.equal(check.memory_graph_current, true);
  assert.equal(check.errors.some((error) => error.includes("graph artifacts")), false);
});

test("pr check marks graphs stale when source content changes after refresh", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  commitAll(project, "initial");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'changed'; }\n", "utf8");

  const check = prCheck(project);
  assert.equal(check.code_graph_current, false);
  assert.equal(check.memory_graph_current, false);
  assert.equal(check.ok, false);
  assert.match(check.errors.join("\n"), /graph artifacts/);
});
