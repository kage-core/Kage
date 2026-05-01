import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildCodeGraph,
  buildKnowledgeGraph,
  buildBranchOverlay,
  capture,
  catalogDomainNodeCount,
  createReviewArtifact,
  createPublicCandidate,
  doctorProject,
  exportPublicBundle,
  graphDir,
  graphMermaid,
  initProject,
  indexProject,
  installAgentPolicy,
  kageMetrics,
  learn,
  loadApprovedPackets,
  loadPendingPackets,
  packetsDir,
  proposeFromDiff,
  queryCodeGraph,
  queryGraph,
  recall,
  recordFeedback,
  registryRecommendations,
  scanSensitiveText,
  validatePacket,
  validateProject,
} from "./kernel.js";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-test-"));
  mkdirSync(join(dir, ".agent_memory", "nodes"), { recursive: true });
  return dir;
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
  assert.match(readFileSync(join(project, "AGENTS.md"), "utf8"), /KAGE_MEMORY_POLICY_V1/);
});

test("installs and updates Codex agent policy idempotently", () => {
  const project = tempProject();
  const created = installAgentPolicy(project);
  assert.equal(created.created, true);
  assert.equal(created.updated, false);
  const first = readFileSync(join(project, "AGENTS.md"), "utf8");
  assert.match(first, /Automatic Recall/);
  assert.match(first, /kage_validate/);

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

test("builds a multi-language code graph with generic static extractors", () => {
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  mkdirSync(join(project, "pkg"), { recursive: true });
  writeFileSync(
    join(project, "app", "service.py"),
    `from pkg.store import TaskStore

class TaskService:
    def list_tasks(self):
        return TaskStore().list()
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

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.language, "python");
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.parser, "generic-static");
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "TaskService" && symbol.kind === "class"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "list_tasks" && symbol.kind === "function"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "pkg/store.go" && symbol.name === "TaskStore" && symbol.kind === "class"), true);
  assert.equal(graph.imports.some((edge) => edge.from_path === "app/service.py" && edge.specifier === "pkg.store"), true);
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
    learning: "Decision: agents should use kage_learn for actual session discoveries and diff proposal only as a fallback.",
    paths: ["mcp/index.ts"],
    tags: ["session-learning"],
    verifiedBy: "npm test",
  });
  assert.equal(result.ok, true);
  assert.equal(result.packet?.type, "decision");
  assert.equal(result.packet?.tags.includes("session-learning"), true);
  assert.match(result.packet?.body ?? "", /Verified by: npm test/);
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
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  packet.status = "approved";
  writeFileSync(result.path!.replace("/pending/", "/packets/"), `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  const graph = buildKnowledgeGraph(project);
  const commandNames = graph.entities.filter((entity) => entity.type === "command").map((entity) => entity.name);
  assert.deepEqual(commandNames, ["npm run test"]);
});

test("graph skips missing path edges even when packets warn about them", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Old backend flow",
    body: "This memory references a path that no longer exists.",
    type: "workflow",
    paths: ["backend"],
  });
  assert.equal(result.ok, true);
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  packet.status = "approved";
  writeFileSync(result.path!.replace("/pending/", "/packets/"), `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("backend")), false);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
});

test("capture blocks sensitive content before writing pending packet", () => {
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

test("capture writes valid pending packet for safe memory", () => {
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
  const approvedPath = result.path!.replace("/pending/", "/packets/");
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  packet.status = "approved";
  writeFileSync(approvedPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
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

  const doctor = doctorProject(project);
  assert.equal(doctor.validation.ok, true);
  assert.equal(doctor.indexesMissing.length, 0);
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

test("builds branch overlay metadata", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  const overlay = buildBranchOverlay(project);
  assert.equal(overlay.changed_files.includes("README.md"), true);
  assert.equal(Array.isArray(overlay.pending_packet_ids), true);
});

test("creates review artifact for pending packets", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "changed\n", "utf8");
  assert.equal(proposeFromDiff(project).ok, true);
  const result = capture({
    projectDir: project,
    title: "Review me",
    body: "Pending memory needs human review.",
    type: "reference",
  });
  assert.equal(result.ok, true);
  const artifact = createReviewArtifact(project);
  assert.equal(artifact.pending, 1);
  assert.match(readFileSync(artifact.path, "utf8"), /Review me/);
  assert.match(readFileSync(artifact.path, "utf8"), /Quality score/);
  assert.match(readFileSync(artifact.path, "utf8"), /Estimated tokens saved/);
  assert.match(readFileSync(artifact.path, "utf8"), /Branch Summary/);
});

test("diff proposal creates a branch review summary instead of recallable memory", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "runner.ts"), "export const command = 'npm test';\n", "utf8");

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.equal(result.packet, undefined);
  assert.ok(result.summary);
  assert.equal(result.summary.review_required, true);
  assert.equal(result.changedFiles.includes("src/runner.ts"), true);
  assert.match(readFileSync(result.path!, "utf8"), /git_diff/);
  assert.equal(loadPendingPackets(project).some((packet) => packet.tags.includes("diff-proposal")), false);
});
