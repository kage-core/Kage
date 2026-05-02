import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { callTool, listTools } from "./index.js";

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

test("MCP lists repo-local memory tools", () => {
  const names = listTools().map((tool) => tool.name);
  assert.equal(names.includes("kage_recall"), true);
  assert.equal(names.includes("kage_graph"), true);
  assert.equal(names.includes("kage_code_graph"), true);
  assert.equal(names.includes("kage_metrics"), true);
  assert.equal(names.includes("kage_quality"), true);
  assert.equal(names.includes("kage_benchmark"), true);
  assert.equal(names.includes("kage_setup_agent"), true);
  assert.equal(names.includes("kage_graph_visual"), true);
  assert.equal(names.includes("kage_learn"), true);
  assert.equal(names.includes("kage_capture"), true);
  assert.equal(names.includes("kage_observe"), true);
  assert.equal(names.includes("kage_distill"), true);
  assert.equal(names.includes("kage_feedback"), true);
  assert.equal(names.includes("kage_install_policy"), true);
  assert.equal(names.includes("kage_branch_overlay"), true);
  assert.equal(names.includes("kage_export_public_bundle"), true);
  assert.equal(names.includes("kage_review_artifact"), true);
  assert.equal(names.includes("kage_validate"), true);
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

test("MCP kage_capture creates pending memory and blocks sensitive input", async () => {
  const project = tempProject();
  const safe = await callTool("kage_capture", {
    project_dir: project,
    title: "Run webhook tests",
    body: "Run npm test -- webhooks after billing changes.",
    type: "runbook",
  });
  assert.equal(safe.isError, false);
  assert.match(textContent(safe), /Captured pending packet/);

  const blocked = await callTool("kage_capture", {
    project_dir: project,
    title: "Token",
    body: "token = abcdefghijklmnopqrstuvwxyz",
  });
  assert.equal(blocked.isError, true);
  assert.match(textContent(blocked), /Capture blocked/);
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

test("MCP kage_code_graph returns source-derived code facts", async () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { if (req.method === 'GET' && url.pathname === '/tasks') return {}; }\n", "utf8");
  const result = await callTool("kage_code_graph", {
    project_dir: project,
    query: "createApp tasks",
  });
  const text = textContent(result);
  assert.match(text, /Kage Code Graph Context/);
  assert.match(text, /createApp|\/tasks/);
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

test("MCP setup, quality, benchmark, observe, and distill tools work", async () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const setup = await callTool("kage_setup_agent", { project_dir: project, agent: "generic-mcp" });
  assert.match(textContent(setup), /mcpServers/);

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
