import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { callTool, listTools } from "./index.js";
import { okfConceptToPacket } from "./okf.js";

// Hermetic personal store: recall reads $KAGE_HOME/memory, so tool tests must
// never see the developer's real ~/.kage.
if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-mcp-home-"));

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-mcp-test-"));
  mkdirSync(join(dir, ".agent_memory", "nodes"), { recursive: true });
  return dir;
}

function textContent(result: Awaited<ReturnType<typeof callTool>>): string {
  const first = result.content[0];
  assert.equal(first.type, "text");
  return String(first.text);
}

test("MCP default tool surface is the agent-facing core only", () => {
  const core = listTools().map((tool) => tool.name).sort();
  assert.deepEqual(core, [
    "kage_check", "kage_context", "kage_feedback", "kage_learn", "kage_pr_check",
    "kage_refresh", "kage_skills", "kage_supersede",
    "kage_risk", "kage_decisions", "kage_dependency_path", "kage_docs_search",
  ].sort());
  // None of the operator/diagnostic tools leak into the default agent surface.
  assert.equal(core.includes("kage_metrics"), false);
  assert.equal(core.includes("kage_xray"), false);
});

// Phase A of the vNext program adds CLI surfaces (connect/status/open/receipts) and automatic
// adapters, and REMOVES NOTHING from the MCP surface. Tool reduction is a later, major-version
// step that may only happen once the adapters have real usage evidence and a migration path — an
// agent whose config names one of these tools today must keep working after Phase A.
test("Phase A changes no default MCP tool names", () => {
  const core = listTools().map((tool) => tool.name).sort();
  assert.deepEqual(core, [
    "kage_check",
    "kage_context",
    "kage_decisions",
    "kage_dependency_path",
    "kage_docs_search",
    "kage_feedback",
    "kage_learn",
    "kage_pr_check",
    "kage_refresh",
    "kage_risk",
    "kage_skills",
    "kage_supersede",
  ]);
  assert.equal(core.length, 12);
});

test("MCP full mode exposes the complete repo-local memory tool registry", () => {
  const prev = process.env.KAGE_TOOLS;
  process.env.KAGE_TOOLS = "full";
  const names = listTools().map((tool) => tool.name);
  process.env.KAGE_TOOLS = prev;
  assert.equal(names.includes("kage_context"), true);
  assert.equal(names.includes("kage_recall"), true);
  assert.equal(names.includes("kage_graph"), true);
  assert.equal(names.includes("kage_graph_registry"), true);
  assert.equal(names.includes("kage_risk"), true);
  // kage_code_graph was deleted (agents grep; kage_context covers caller queries).
  assert.equal(names.includes("kage_code_graph"), false);
  assert.equal(names.includes("kage_dependency_path"), true);
  assert.equal(names.includes("kage_cleanup_candidates"), true);
  assert.equal(names.includes("kage_reviewers"), true);
  assert.equal(names.includes("kage_contributors"), true);
  assert.equal(names.includes("kage_profile"), true);
  assert.equal(names.includes("kage_xray"), true);
  assert.equal(names.includes("kage_capabilities"), true);
  assert.equal(names.includes("kage_context_slots"), true);
  assert.equal(names.includes("kage_context_slot_set"), true);
  assert.equal(names.includes("kage_context_slot_delete"), true);
  assert.equal(names.includes("kage_decisions"), true);
  assert.equal(names.includes("kage_code_index"), true);
  assert.equal(names.includes("kage_metrics"), true);
  assert.equal(names.includes("kage_module_health"), true);
  assert.equal(names.includes("kage_graph_insights"), true);
  assert.equal(names.includes("kage_workspace"), true);
  assert.equal(names.includes("kage_workspace_recall"), true);
  assert.equal(names.includes("kage_inbox"), true);
  assert.equal(names.includes("kage_refresh"), true);
  assert.equal(names.includes("kage_pr_summarize"), true);
  assert.equal(names.includes("kage_pr_check"), true);
  assert.equal(names.includes("kage_quality"), true);
  assert.equal(names.includes("kage_audit"), true);
  assert.equal(names.includes("kage_benchmark"), true);
  assert.equal(names.includes("kage_benchmark_compare"), true);
  assert.equal(names.includes("kage_memory_lifecycle"), true);
  assert.equal(names.includes("kage_memory_timeline"), true);
  assert.equal(names.includes("kage_memory_lineage"), true);
  assert.equal(names.includes("kage_memory_audit"), true);
  assert.equal(names.includes("kage_memory_handoff"), true);
  assert.equal(names.includes("kage_supersede"), true);
  assert.equal(names.includes("kage_setup_agent"), true);
  assert.equal(names.includes("kage_setup_doctor"), true);
  assert.equal(names.includes("kage_verify_agent"), true);
  assert.equal(names.includes("kage_graph_visual"), true);
  assert.equal(names.includes("kage_learn"), true);
  assert.equal(names.includes("kage_capture"), true);
  assert.equal(names.includes("kage_observe"), true);
  assert.equal(names.includes("kage_distill"), true);
  assert.equal(names.includes("kage_learning_ledger"), true);
  assert.equal(names.includes("kage_session_replay"), true);
  assert.equal(names.includes("kage_feedback"), true);
  assert.equal(names.includes("kage_install_policy"), true);
  assert.equal(names.includes("kage_branch_overlay"), true);
  // Org/marketplace/global stubs were removed from the surface.
  assert.equal(names.includes("kage_export_public_bundle"), false);
  assert.equal(names.includes("kage_org_status"), false);
  assert.equal(names.includes("kage_layered_recall"), false);
  assert.equal(names.includes("kage_marketplace"), false);
  assert.equal(names.includes("kage_review_artifact"), true);
  assert.equal(names.includes("kage_validate"), true);
  assert.equal(names.includes("kage_workflow"), true);
  // Phase D adds reversible retrieval; it is registered (reachable in full mode) but does not
  // join the default core surface until a major-version migration.
  assert.equal(names.includes("kage_retrieve"), true);
});

// Phase D reduces the MCP compatibility surface without deleting the legacy full mode: it offers an
// opt-in `vnext` surface that exposes only the three verbs a Kage-vNext agent needs — recall,
// reversible retrieval, and feedback. The default surface and `full` mode are unchanged, so an agent
// pinned to either keeps working through v4.
test("KAGE_TOOLS=vnext exposes exactly kage_context, kage_retrieve, kage_feedback", () => {
  const prev = process.env.KAGE_TOOLS;
  process.env.KAGE_TOOLS = "vnext";
  const names = listTools().map((tool) => tool.name).sort();
  process.env.KAGE_TOOLS = prev;
  assert.deepEqual(names, ["kage_context", "kage_feedback", "kage_retrieve"]);
});

test("kage_retrieve is not in the default core surface (reduction is a later, opt-in step)", () => {
  const prev = process.env.KAGE_TOOLS;
  delete process.env.KAGE_TOOLS;
  const core = listTools().map((tool) => tool.name);
  process.env.KAGE_TOOLS = prev;
  assert.equal(core.includes("kage_retrieve"), false);
  assert.equal(core.length, 12);
});

test("kage_workflow teaches the loop in its description and returns the same text", async () => {
  const prevWf = process.env.KAGE_TOOLS;
  process.env.KAGE_TOOLS = "full";
  const tool = listTools().find((item) => item.name === "kage_workflow");
  process.env.KAGE_TOOLS = prevWf;
  assert.ok(tool);
  assert.equal(tool.description.trim().split(/\s+/).length <= 150, true);
  for (const step of ["kage_context", "kage_learn", "kage_refresh", "kage_pr_check", "<private>", "receipts"]) {
    assert.equal(tool.description.includes(step), true, `description mentions ${step}`);
  }
  const result = await callTool("kage_workflow", {});
  const first = result.content[0];
  assert.equal(first.type, "text");
  assert.equal(String(first.text), tool.description);
});

test("MCP kage_context returns combined repo context", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = await callTool("kage_context", {
    project_dir: project,
    query: "how do I run tests",
  });
  const text = textContent(result);
  assert.match(text, /Kage Context/);
  assert.match(text, /Graph Facts/);
  assert.match(text, /Memory healthy|Warnings/);
});

test("MCP kage_context includes risk and dependency path when file targets are present", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");

  const result = await callTool("kage_context", {
    project_dir: project,
    query: "how does src/app.js connect to src/core.js before I edit it",
  });
  const text = textContent(result);
  assert.match(text, /Risk Signals/);
  assert.match(text, /Dependency Path/);
  assert.match(text, /src\/app\.js -> src\/core\.js/);
});

test("MCP kage_context returns a teammate brief with verification obligations", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { return 'ok'; }\n", "utf8");
  writeFileSync(
    join(project, "test", "server.test.js"),
    "import test from 'node:test';\nimport { createApp } from '../src/server.js';\ntest('createApp routes tasks', () => createApp());\n",
    "utf8"
  );

  const result = await callTool("kage_context", {
    project_dir: project,
    query: "change src/server.js safely",
    targets: ["src/server.js"],
    changed_files: ["src/server.js"],
  });
  const text = textContent(result);
  assert.match(text, /Teammate Brief/);
  assert.match(text, /Verification Contract/);
  assert.match(text, /test\/server\.test\.js/);
  assert.match(text, /Next Actions/);
});

test("MCP kage_xray returns first-use repo map", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "server.js"), "const app = { get() {} };\nexport function createApp() { return app; }\napp.get('/health', createApp);\n", "utf8");
  writeFileSync(join(project, "test", "server.test.js"), "import { createApp } from '../src/server.js';\ntest('createApp', () => createApp());\n", "utf8");

  const result = await callTool("kage_xray", { project_dir: project });
  const report = JSON.parse(textContent(result));

  assert.equal(report.schema_version, 1);
  assert.ok(report.layers.some((layer: { id: string; items: Array<{ path: string }> }) => layer.id === "entry_points" && layer.items.some((item) => item.path === "src/server.js")));
  assert.ok(report.first_use_script.some((line: string) => /I mapped your repo/.test(line)));
});

test("MCP kage_learning_ledger classifies what agents should save", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  await callTool("kage_observe", {
    project_dir: project,
    type: "command_result",
    session_id: "ledger-session",
    command: "npm test -- webhooks",
    exit_code: 0,
    summary: "Use this when changing webhook signature verification because the default suite skips signed payload replay.",
  });
  await callTool("kage_observe", {
    project_dir: project,
    type: "tool_use",
    session_id: "ledger-session",
    tool: "read",
    summary: "Read package metadata.",
  });
  await callTool("kage_observe", {
    project_dir: project,
    type: "command_result",
    session_id: "ledger-session",
    command: "npm test",
    exit_code: 1,
  });

  const result = await callTool("kage_learning_ledger", {
    project_dir: project,
    session_id: "ledger-session",
  });
  const ledger = JSON.parse(textContent(result));
  assert.equal(ledger.totals.save_candidates, 1);
  assert.equal(ledger.totals.ignore_items, 1);
  assert.equal(ledger.totals.needs_evidence, 1);
  assert.equal(ledger.sessions[0].decisions.some((item: { disposition: string; memory_type?: string }) => item.disposition === "save" && item.memory_type === "runbook"), true);

  const context = await callTool("kage_context", {
    project_dir: project,
    query: "finish webhook verification work",
    session_id: "ledger-session",
  });
  const text = textContent(context);
  assert.match(text, /Session Learning Ledger/);
  assert.match(text, /Save candidates: 1/);
  assert.match(text, /Needs evidence: 1/);
});

test("MCP kage_recall returns agent-ready context", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = await callTool("kage_recall", {
    project_dir: project,
    query: "how do I run tests",
  });

  assert.match(textContent(result), /Kage Context/);
  assert.match(textContent(result), /vitest|test/i);
});

test("MCP kage_recall can explain hybrid score breakdowns", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = await callTool("kage_recall", {
    project_dir: project,
    query: "how do I run tests",
    explain: true,
  });
  const payload = JSON.parse(textContent(result));
  assert.equal(payload.explanations.length > 0, true);
  assert.equal(typeof payload.results[0].score_breakdown.final, "number");
});

test("MCP kage_capture creates repo-local memory and blocks sensitive input", async () => {
  const project = tempProject();
  const safe = await callTool("kage_capture", {
    project_dir: project,
    title: "Run webhook tests",
    body: "Run npm test -- webhooks after billing changes.",
    type: "runbook",
  });
  assert.equal(safe.isError, false);
  assert.match(textContent(safe), /Captured repo-local packet/);

  const blocked = await callTool("kage_capture", {
    project_dir: project,
    title: "Token",
    body: "token = abcdefghijklmnopqrstuvwxyz",
  });
  assert.equal(blocked.isError, true);
  assert.match(textContent(blocked), /Capture blocked/);
});

test("MCP kage_supersede writes memory lineage", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "checkout.ts"), "export function checkout() { return 'ok'; }\n", "utf8");
  await callTool("kage_capture", {
    project_dir: project,
    title: "Old retry note",
    body: "Old retry note says duplicated checkout retry paths can be merged.",
    type: "decision",
    paths: ["src/checkout.ts"],
  });
  await callTool("kage_capture", {
    project_dir: project,
    title: "Checkout retry split",
    body: "Callback retries use idempotency keys while checkout retries use session state, so keep the paths separate.",
    type: "decision",
    paths: ["src/checkout.ts"],
  });
  const packets = readdirSync(join(project, ".agent_memory", "packets"))
    .filter((name) => name.endsWith(".md") || name.endsWith(".json"))
    .map((name) => {
      const p = join(project, ".agent_memory", "packets", name);
      return name.endsWith(".md") ? okfConceptToPacket(readFileSync(p, "utf8")) : JSON.parse(readFileSync(p, "utf8"));
    });
  const oldPacket = packets.find((packet) => packet.title === "Old retry note");
  const replacement = packets.find((packet) => packet.title === "Checkout retry split");
  assert.ok(oldPacket);
  assert.ok(replacement);

  const superseded = await callTool("kage_supersede", {
    project_dir: project,
    packet_id: oldPacket.id,
    replacement_packet_id: replacement.id,
    reason: "Newer debugging proved the retry paths are intentionally different.",
  });
  const result = JSON.parse(textContent(superseded));
  assert.equal(result.ok, true);
  assert.equal(result.old_packet.status, "superseded");

  const lineage = await callTool("kage_memory_lineage", { project_dir: project });
  const lineageJson = JSON.parse(textContent(lineage));
  assert.equal(lineageJson.totals.chains, 1);
  assert.equal(lineageJson.chains[0].current_packet_id, replacement.id);
});

test("MCP kage_graph returns evidence-backed graph facts", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = await callTool("kage_graph", {
    project_dir: project,
    query: "test command",
  });

  assert.match(textContent(result), /Kage Graph Context/);
  assert.match(textContent(result), /npm run test/);
});

test("MCP kage_graph_registry writes a signed artifact manifest", async () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");
  await callTool("kage_capture", {
    project_dir: project,
    title: "Decision: createApp owns app setup",
    body: "Why: app setup should be centralized.\n\nVerified by: npm test",
    type: "decision",
    paths: ["src/server.ts"],
  });

  const result = await callTool("kage_graph_registry", { project_dir: project });
  assert.equal(result.isError, false);
  const body = JSON.parse(textContent(result));
  assert.equal(body.manifest.kind, "graph_registry");
  assert.equal(body.artifacts.some((artifact: { kind: string }) => artifact.kind === "memory_graph"), true);
  assert.equal(body.manifest.payload.sources.packet_count >= 1, true);
  assert.equal(body.manifest.payload.sources.packets.some((packet: { title: string; content_sha256: string }) => packet.title === "Decision: createApp owns app setup" && packet.content_sha256.length === 64), true);
});

test("MCP kage_dependency_path returns graph path JSON", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");

  const result = await callTool("kage_dependency_path", {
    project_dir: project,
    from: "src/app.js",
    to: "src/core.js",
  });
  const body = JSON.parse(textContent(result));
  assert.equal(body.relation, "source_depends_on_target");
  assert.deepEqual(body.path, ["src/app.js", "src/core.js"]);
});

test("MCP kage_cleanup_candidates returns conservative candidates", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { used } from './used.js';\nused();\n", "utf8");
  writeFileSync(join(project, "src", "used.js"), "export function used() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "unused.js"), "export function unused() { return false; }\n", "utf8");

  const result = await callTool("kage_cleanup_candidates", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(body.candidates.some((candidate: { path: string }) => candidate.path === "src/unused.js"), true);
  assert.equal(body.skipped_entrypoints.includes("src/index.js"), true);
});

test("MCP kage_reviewers returns local git reviewer suggestions", async () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "alice owns core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });

  const result = await callTool("kage_reviewers", { project_dir: project, targets: ["src/core.js"] });
  const body = JSON.parse(textContent(result));
  assert.equal(body.suggestions.some((suggestion: { reviewer: string }) => suggestion.reviewer === "Alice <alice@example.com>"), true);
});

test("MCP kage_contributors returns local git contributor profiles", async () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "feat: alice owns core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });

  const result = await callTool("kage_contributors", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(body.contributors.some((profile: { contributor: string }) => profile.contributor === "Alice <alice@example.com>"), true);
});

test("MCP kage_profile returns project orientation profile", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  mkdirSync(join(project, ".agent_memory", "packets"), { recursive: true });
  writeFileSync(join(project, ".agent_memory", "packets", "decision-core.json"), JSON.stringify({
    schema_version: 2,
    id: "repo:test:decision:core",
    title: "Core path stays small",
    summary: "Core stays small for testability.",
    body: "Keep src/core.js small because downstream tests import it directly.",
    type: "decision",
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.7,
    tags: ["core"],
    paths: ["src/core.js"],
    stack: [],
    source_refs: [{ kind: "explicit_capture" }],
    freshness: { ttl_days: 365 },
    edges: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }), "utf8");

  const result = await callTool("kage_profile", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(body.totals.approved_memory, 1);
  assert.equal(body.run_commands.some((command: { name: string }) => command.name === "test"), true);
  assert.equal(body.key_files.some((file: { path: string; memory_packets: number }) => file.path === "src/core.js" && file.memory_packets === 1), true);
});

test("MCP kage_capabilities returns memory system readiness evidence", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  const result = await callTool("kage_capabilities", { project_dir: project });
  const body = JSON.parse(textContent(result));

  assert.equal(body.schema_version, 1);
  assert.equal(Array.isArray(body.pillars), true);
  assert.equal(body.pillars.some((pillar: { id: string }) => pillar.id === "benchmark"), true);
  assert.equal(body.checklist.some((item: { requirement: string }) => item.requirement === "viewer proof surface"), true);
});

test("MCP context slot tools create list and delete pinned context", async () => {
  const project = tempProject();
  const saved = await callTool("kage_context_slot_set", {
    project_dir: project,
    label: "project_context",
    content: "Always run npm test after editing the CLI.",
    description: "Pinned agent guidance",
    paths: ["mcp/cli.ts"],
    tags: ["tests"],
  });
  const savedBody = JSON.parse(textContent(saved));
  assert.equal(savedBody.ok, true);

  const listed = await callTool("kage_context_slots", { project_dir: project });
  const listedBody = JSON.parse(textContent(listed));
  assert.equal(listedBody.totals.pinned, 1);
  assert.match(listedBody.pinned_context_block, /Always run npm test/);

  const deleted = await callTool("kage_context_slot_delete", { project_dir: project, label: "project_context" });
  const deletedBody = JSON.parse(textContent(deleted));
  assert.equal(deletedBody.ok, true);
});

test("MCP kage_decisions returns why-memory coverage", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  mkdirSync(join(project, ".agent_memory", "packets"), { recursive: true });
  writeFileSync(join(project, ".agent_memory", "packets", "decision-core.json"), JSON.stringify({
    schema_version: 2,
    id: "repo:test:decision:core",
    title: "Core path stays small",
    summary: "Core stays small for testability.",
    body: "Keep the core path small because downstream tests import it directly.",
    type: "decision",
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.8,
    tags: ["core"],
    paths: ["src/core.js"],
    stack: [],
    source_refs: [{ kind: "test" }],
    context: { why: "Downstream tests import the core path directly." },
    freshness: {},
    edges: [],
    quality: { score: 90 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, null, 2));

  const result = await callTool("kage_decisions", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(body.decision_memory_count, 1);
  assert.equal(body.top_decisions[0].title, "Core path stays small");
  assert.equal(body.coverage_percent, 100);
});

test("MCP kage_code_index writes an LSP symbol index artifact", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function serve() { return true; }\n", "utf8");

  const result = await callTool("kage_code_index", { project_dir: project });
  assert.equal(result.isError, false);
  const body = JSON.parse(textContent(result));
  assert.equal(body.parser, "lsp");
  assert.equal(body.documents, 1);
  assert.equal(body.symbols >= 1, true);
});

test("MCP kage_metrics returns coverage and readiness metrics", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { return {}; }\n", "utf8");
  const result = await callTool("kage_metrics", { project_dir: project });
  const metrics = JSON.parse(textContent(result));
  assert.equal(metrics.code_graph.languages.javascript, 1);
  assert.equal(metrics.code_graph.indexer_coverage_percent, 100);
  assert.equal(typeof metrics.harness.readiness_score, "number");
  assert.equal(typeof metrics.pain.estimated_tokens_saved, "number");
});

test("MCP kage_module_health returns module scorecards", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "export function main() { return true; }\n", "utf8");

  const result = await callTool("kage_module_health", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(Array.isArray(body.modules), true);
  assert.equal(body.modules.some((item: { module: string }) => item.module === "src"), true);
});

test("MCP kage_graph_insights returns central files and communities", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { core } from './core.js';\ncore();\n", "utf8");
  writeFileSync(join(project, "src", "core.js"), "export function core() { return true; }\n", "utf8");

  const result = await callTool("kage_graph_insights", { project_dir: project });
  const body = JSON.parse(textContent(result));
  assert.equal(body.central_files.some((file: { path: string }) => file.path === "src/core.js"), true);
  assert.equal(body.communities.some((community: { files: string[] }) => community.files.includes("src/index.js")), true);
});

test("MCP kage_workspace and kage_workspace_recall fan out across local repos", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-mcp-workspace-"));
  const api = join(workspace, "api");
  const web = join(workspace, "web");
  mkdirSync(api, { recursive: true });
  mkdirSync(web, { recursive: true });
  execFileSync("git", ["init"], { cwd: api, stdio: "ignore" });
  execFileSync("git", ["init"], { cwd: web, stdio: "ignore" });
  writeFileSync(join(api, "package.json"), JSON.stringify({ name: "@demo/api" }), "utf8");
  writeFileSync(join(web, "package.json"), JSON.stringify({ name: "@demo/web", dependencies: { "@demo/api": "workspace:*" } }), "utf8");
  mkdirSync(join(api, "src"), { recursive: true });
  mkdirSync(join(web, "src"), { recursive: true });
  writeFileSync(join(api, "src", "server.js"), "const app = { get() {} };\nfunction handler() {}\napp.get('/auth/user', handler);\n", "utf8");
  writeFileSync(join(web, "src", "client.js"), "export function client() { return fetch('/auth/user'); }\n", "utf8");
  await callTool("kage_capture", {
    project_dir: api,
    title: "API auth contract",
    body: "The auth API keeps the x-user-id header stable for workspace clients.",
    type: "decision",
    paths: ["package.json"],
  });
  await callTool("kage_capture", {
    project_dir: web,
    title: "Web auth client",
    body: "The web client depends on the auth API x-user-id header contract.",
    type: "decision",
    paths: ["package.json"],
  });
  await callTool("kage_refresh", { project_dir: api });
  await callTool("kage_refresh", { project_dir: web });

  const workspaceResult = await callTool("kage_workspace", { project_dir: workspace });
  const workspaceBody = JSON.parse(textContent(workspaceResult));
  assert.equal(workspaceBody.package_dependencies.some((dep: { from: string; to: string }) => dep.from === "web" && dep.to === "api"), true);
  assert.equal(workspaceBody.route_contracts.some((contract: { provider_repo: string; consumer_repo: string; path: string }) => contract.provider_repo === "api" && contract.consumer_repo === "web" && contract.path === "/auth/user"), true);

  const recallResult = await callTool("kage_workspace_recall", { project_dir: workspace, query: "auth header contract", limit: 5, json: true });
  const recallBody = JSON.parse(textContent(recallResult));
  assert.equal(recallBody.hits.some((hit: { repo: string; title: string }) => hit.repo === "api" && /auth contract/i.test(hit.title)), true);
});

test("MCP kage_audit returns trust and recommendation details", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  const result = await callTool("kage_audit", { project_dir: project });
  const audit = JSON.parse(textContent(result));
  assert.equal(audit.ok, true);
  assert.equal(typeof audit.trust_score, "number");
  assert.equal(typeof audit.checks.memory_inbox.pending_packets, "number");
});

test("MCP kage_inbox returns actionable memory review items", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function serve() { return true; }\n", "utf8");
  await callTool("kage_capture", {
    project_dir: project,
    title: "Architecture note",
    body: "This packet needs structured follow-up context.",
    type: "reference",
    paths: ["src/server.ts"],
  });

  const result = await callTool("kage_inbox", { project_dir: project });
  assert.equal(result.isError, false);
  const inbox = JSON.parse(textContent(result));
  assert.equal(typeof inbox.counts.approved, "number");
  assert.equal(inbox.items.some((item: { kind: string }) => item.kind === "missing_context"), true);
  assert.equal(Array.isArray(inbox.recommendations), true);
});

test("MCP refresh and PR tools expose merge readiness", async () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");

  const summary = JSON.parse(textContent(await callTool("kage_pr_summarize", { project_dir: project })));
  assert.equal(summary.ok, true);
  assert.ok(summary.diff_memory_packet_id);

  const refresh = JSON.parse(textContent(await callTool("kage_refresh", { project_dir: project })));
  assert.equal(refresh.ok, true);
  assert.equal(typeof refresh.code_graph.files, "number");

  // kage_pr_check leads with the human stale-catch summary before the JSON payload.
  const checkText = textContent(await callTool("kage_pr_check", { project_dir: project }));
  assert.match(checkText.split("\n")[0], /team memor/);
  const check = JSON.parse(checkText.slice(checkText.indexOf("{")));
  assert.equal(check.ok, true);
  assert.equal(check.code_graph_current, true);
});

test("MCP setup, quality, benchmark, observe, and distill tools work", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const setup = await callTool("kage_setup_agent", { project_dir: project, agent: "generic-mcp" });
  assert.match(textContent(setup), /mcpServers/);

  const doctor = await callTool("kage_setup_doctor", { project_dir: project });
  assert.equal(Array.isArray(JSON.parse(textContent(doctor))), true);

  const verify = await callTool("kage_verify_agent", { project_dir: project, agent: "generic-mcp" });
  assert.equal(JSON.parse(textContent(verify)).checks.mcp_tool_reachable, true);

  const observed = await callTool("kage_observe", {
    project_dir: project,
    type: "command_result",
    session_id: "s2",
    command: "npm test",
    exit_code: 0,
    summary: "Test command passed.",
  });
  assert.equal(JSON.parse(textContent(observed)).ok, true);

  const distilled = await callTool("kage_distill", { project_dir: project, session_id: "s2" });
  assert.equal(JSON.parse(textContent(distilled)).ok, true);

  const quality = await callTool("kage_quality", { project_dir: project });
  assert.equal(typeof JSON.parse(textContent(quality)).useful_memory_ratio_percent, "number");

  const benchmark = await callTool("kage_benchmark", { project_dir: project });
  assert.equal(typeof JSON.parse(textContent(benchmark)).pain_metrics.estimated_tokens_saved, "number");

  const memoryQualityBenchmark = await callTool("kage_benchmark", { project_dir: project, mode: "memory_quality" });
  assert.equal(JSON.parse(textContent(memoryQualityBenchmark)).summary.recall_at_5_percent, 100);

  const memoryScaleBenchmark = await callTool("kage_benchmark", { project_dir: project, mode: "memory_scale", sizes: [24] });
  assert.equal(JSON.parse(textContent(memoryScaleBenchmark)).summary.largest_packets, 24);

  const lifecycle = await callTool("kage_memory_lifecycle", { project_dir: project });
  const lifecycleJson = JSON.parse(textContent(lifecycle));
  assert.equal(lifecycleJson.schema_version, 1);
  assert.equal(typeof lifecycleJson.totals.approved, "number");

  const timeline = await callTool("kage_memory_timeline", { project_dir: project, days: 7 });
  const timelineJson = JSON.parse(textContent(timeline));
  assert.equal(timelineJson.schema_version, 1);
  assert.equal(Array.isArray(timelineJson.entries), true);

  const lineage = await callTool("kage_memory_lineage", { project_dir: project });
  const lineageJson = JSON.parse(textContent(lineage));
  assert.equal(lineageJson.schema_version, 1);
  assert.equal(Array.isArray(lineageJson.chains), true);

  const audit = await callTool("kage_memory_audit", { project_dir: project, limit: 10 });
  const auditJson = JSON.parse(textContent(audit));
  assert.equal(auditJson.schema_version, 1);
  assert.equal(Array.isArray(auditJson.entries), true);

  const handoff = await callTool("kage_memory_handoff", { project_dir: project });
  const handoffJson = JSON.parse(textContent(handoff));
  assert.equal(handoffJson.schema_version, 1);
  assert.equal(typeof handoffJson.primary_action.label, "string");
  assert.equal(Array.isArray(handoffJson.items), true);

  const comparison = await callTool("kage_benchmark_compare", { project_dir: project, task: "how do I run tests" });
  assert.equal(typeof JSON.parse(textContent(comparison)).delta.estimated_tokens_saved, "number");
});

test("MCP kage_learn captures actual session learning", async () => {
  const project = tempProject();
  mkdirSync(join(project, "mcp"), { recursive: true });
  writeFileSync(join(project, "mcp", "index.ts"), "", "utf8");
  const result = await callTool("kage_learn", {
    project_dir: project,
    learning: "Decision: use kage_learn for actual discoveries and diff proposal only as a fallback.",
    paths: ["mcp/index.ts"],
    verified_by: "node --test",
  });

  assert.equal(result.isError, false);
  assert.match(textContent(result), /Captured session learning/);
});

test("MCP kage_session_replay returns a privacy-preserving session timeline", async () => {
  const project = tempProject();
  const observed = await callTool("kage_observe", {
    project_dir: project,
    type: "file_change",
    session_id: "mcp-replay",
    agent: "claude",
    path: "src/cache.ts",
    text: "Raw implementation note should not be replayed.",
    summary: "src/cache.ts must keep cache invalidation after writes because readers depend on fresh state.",
    timestamp: "2026-05-18T01:00:00.000Z",
  });
  assert.equal(observed.isError, false);

  const result = await callTool("kage_session_replay", {
    project_dir: project,
    session_id: "mcp-replay",
    limit: 5,
  });
  const report = JSON.parse(textContent(result));

  assert.equal(report.totals.sessions, 1);
  assert.equal(report.events.length, 1);
  assert.equal(report.events[0].path, "src/cache.ts");
  assert.equal(report.events[0].durable_candidate, true);
  assert.equal(report.events[0].raw_text_included, false);
  assert.equal(report.events[0].summary.includes("Raw implementation note"), false);
});

test("MCP kage_graph_visual returns Mermaid", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = await callTool("kage_graph_visual", { project_dir: project });
  assert.match(textContent(result), /```mermaid/);
  assert.match(textContent(result), /flowchart LR/);
});

test("MCP kage_validate reports project memory health", async () => {
  const project = tempProject();
  const result = await callTool("kage_validate", { project_dir: project });
  assert.equal(result.isError, false);
  assert.match(textContent(result), /Validation passed/);
});

// Regression: a kage_learn call that passed the insight under an unsupported key ("content"
// instead of "learning") was silently accepted. The unknown key was dropped, `learning`
// defaulted to "", and a packet with an empty body was written, indexed, and only ever
// surfaced as a soft "body is empty" validation warning long after the insight was lost.
test("kage_learn rejects an unknown parameter instead of silently dropping the insight", async () => {
  const project = tempProject();
  writeFileSync(join(project, "app.ts"), "export const app = 1;\n", "utf8");
  const result = await callTool("kage_learn", {
    project_dir: project,
    content: "The refund ledger is the source of truth; never recompute balances from events.",
    paths: ["app.ts"],
  });

  assert.equal(result.isError, true);
  assert.match(textContent(result), /content/);
  const packets = join(project, ".agent_memory", "packets");
  const written = existsSync(packets) ? readdirSync(packets) : [];
  assert.deepEqual(written, [], "a rejected call must not write a packet");
});

test("kage_learn refuses to write a packet with no learning text", async () => {
  const project = tempProject();
  writeFileSync(join(project, "app.ts"), "export const app = 1;\n", "utf8");
  const result = await callTool("kage_learn", {
    project_dir: project,
    learning: "   ",
    paths: ["app.ts"],
  });

  assert.equal(result.isError, true);
  const packets = join(project, ".agent_memory", "packets");
  const written = existsSync(packets) ? readdirSync(packets) : [];
  assert.deepEqual(written, [], "an empty learning must not produce a packet");
});

// Evidence and verified_by both feed the packet body, so checking only the composed body lets
// a dropped `learning` through: the packet is written carrying nothing but its own provenance.
// This actually happened while capturing memory for this change.
test("kage_learn refuses a packet whose only content is its own provenance", async () => {
  const project = tempProject();
  writeFileSync(join(project, "app.ts"), "export const app = 1;\n", "utf8");
  const result = await callTool("kage_learn", {
    project_dir: project,
    evidence: "Measured against the old path: 1 health probe in 600ms.",
    verified_by: "npm test --prefix mcp (546/546)",
    paths: ["app.ts"],
  });

  assert.equal(result.isError, true);
  const packets = join(project, ".agent_memory", "packets");
  const written = existsSync(packets) ? readdirSync(packets) : [];
  assert.deepEqual(written, [], "evidence alone must not produce a packet");
});

test("kage_supersede names the unknown parameter instead of failing as self-supersede", async () => {
  const project = tempProject();
  const result = await callTool("kage_supersede", {
    project_dir: project,
    old_id: "repo:demo:decision:a",
    new_id: "repo:demo:decision:b",
  });

  assert.equal(result.isError, true);
  const text = textContent(result);
  assert.match(text, /old_id|new_id/);
  assert.doesNotMatch(text, /cannot supersede itself/i);
});
