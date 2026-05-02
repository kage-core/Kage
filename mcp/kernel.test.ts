import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SETUP_AGENTS,
  benchmarkProject,
  buildGlobalCdnBundle,
  buildCodeGraph,
  buildKnowledgeGraph,
  buildBranchOverlay,
  buildMarketplace,
  capture,
  catalogDomainNodeCount,
  createReviewArtifact,
  createPublicCandidate,
  distillSession,
  doctorProject,
  exportPublicBundle,
  exportOrgRegistry,
  graphDir,
  graphMermaid,
  initProject,
  indexProject,
  installAgentPolicy,
  kageMetrics,
  learn,
  loadApprovedPackets,
  observe,
  layeredRecall,
  orgRecall,
  orgReviewPacket,
  orgStatus,
  orgUploadPacket,
  packetsDir,
  proposeFromDiff,
  queryCodeGraph,
  queryGraph,
  recall,
  recordFeedback,
  registryRecommendations,
  scanSensitiveText,
  setupAgent,
  setupDoctor,
  qualityReport,
  evaluateMemoryAdmission,
  verifyAgentActivation,
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
  writeFileSync(join(project, "README.md"), "# Demo\n\nNew setup flow lives here.\n", "utf8");
  indexProject(project);
  const overview = loadApprovedPackets(project).find((packet) => packet.title.includes("repo overview"));
  assert.match(overview?.body ?? "", /New setup flow/);
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
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "session-start.sh"), "utf8"), /KAGE_MEMORY_POLICY_V1/);

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
  assert.equal(typeof benchmark.pain_metrics.recall_hit_rate_percent, "number");
  assert.equal(typeof benchmark.pain_metrics.estimated_tokens_saved, "number");
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

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("backend")), false);
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
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "vitest", build: "tsc" } }), "utf8");
  writeFileSync(join(project, "src", "runner.ts"), "export const command = 'npm test';\n", "utf8");

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
  assert.match(readFileSync(result.path!, "utf8"), /git_diff/);
  assert.equal(recall(project, "what changed runner npm test").results.some((item) => item.packet.id === result.packet!.id), true);
});
