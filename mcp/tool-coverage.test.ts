import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callTool, listTools } from "./index.js";
import { initProject, buildIndexes, capture, claimWorkItem } from "./kernel.js";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-cov-home-"));

// Tools whose handlers fetch from the public graph CDN — not callable offline in
// CI. We assert they are registered, but don't invoke them here.
const NETWORK_TOOLS = new Set([
  "kage_list_domains", "kage_search", "kage_fetch", "kage_graph_registry", "kage_registry_recommend",
]);

function setupFixture() {
  const project = mkdtempSync(join(tmpdir(), "kage-cov-"));
  execFileSync("git", ["init", "-q"], { cwd: project });
  execFileSync("git", ["config", "user.email", "c@c"], { cwd: project });
  execFileSync("git", ["config", "user.name", "c"], { cwd: project });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core() + 1; }\n", "utf8");
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "cov", scripts: { test: "node --test" } }), "utf8");
  execFileSync("git", ["add", "-A"], { cwd: project });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: project });
  initProject(project);
  buildIndexes(project);
  // Packets for feedback (A) and supersede (B -> C).
  const a = capture({ projectDir: project, title: "Coverage packet A", body: "A grounded note about src/app.js used for feedback coverage in this fixture.", type: "reference", paths: ["src/app.js"] });
  const b = capture({ projectDir: project, title: "Coverage packet B", body: "A grounded note about src/core.js to be superseded during coverage.", type: "reference", paths: ["src/core.js"] });
  const c = capture({ projectDir: project, title: "Coverage packet C", body: "The replacement note about src/core.js for supersede coverage.", type: "reference", paths: ["src/core.js"] });
  // Work-item fixtures: d for the claim-tool test, e (pre-claimed) + f (its
  // output) for the link-implements and transition-tool tests — dedicated
  // packets so these don't depend on tool iteration order.
  const d = capture({ projectDir: project, title: "Coverage proposal D", body: "We should add a coverage feature D to the system.", type: "proposal", allowMissingPaths: true });
  const e = capture({ projectDir: project, title: "Coverage proposal E", body: "We should add a coverage feature E to the system.", type: "proposal", allowMissingPaths: true });
  claimWorkItem(project, e.packet!.id, "coverage-agent");
  const f = capture({ projectDir: project, title: "Coverage packet F", body: "Implemented coverage feature E in src/app.js.", type: "decision", paths: ["src/app.js"] });
  return { project, ids: { a: a.packet!.id, b: b.packet!.id, c: c.packet!.id, d: d.packet!.id, e: e.packet!.id, f: f.packet!.id } };
}

const { project, ids } = setupFixture();

// Per-tool arguments. Anything not listed gets { project_dir } only.
function argsFor(name: string): Record<string, unknown> {
  const base = { project_dir: project };
  const overrides: Record<string, Record<string, unknown>> = {
    kage_context: { ...base, query: "config timeout in app" },
    kage_recall: { ...base, query: "core app" },
    kage_learn: { ...base, title: "Coverage learn", learning: "A reusable fact about src/app.js captured for coverage.", paths: ["src/app.js"] },
    kage_capture: { ...base, title: "Coverage capture", body: "A reusable note about src/app.js for coverage testing here.", paths: ["src/app.js"] },
    kage_feedback: { ...base, packet_id: ids.a, kind: "helpful" },
    kage_reverify: { ...base, packet_id: ids.a, evidence: "Coverage check confirms src/app.js still exists and the packet's claim is unaffected.", verified_by: "tool-coverage.test.ts" },
    kage_supersede: { ...base, packet_id: ids.b, replacement_packet_id: ids.c },
    kage_setup_agent: { ...base, agent: "generic-mcp" },
    kage_verify_agent: { ...base, agent: "claude-code" },
    kage_context_slot_set: { ...base, label: "cov", content: "Coverage pin", description: "for coverage" },
    kage_context_slot_delete: { ...base, label: "cov" },
    kage_observe: { ...base, type: "command_result", session_id: "cov", command: "npm test", exit_code: 0, summary: "A coverage observation about running the test suite in this repo." },
    kage_distill: { ...base, session_id: "cov" },
    kage_dependency_path: { ...base, from: "src/app.js", to: "src/core.js" },
    kage_verify_citations: { ...base },
    kage_claim_work_item: { ...base, packet_id: ids.d, actor: "coverage-agent" },
    kage_link_implements: { ...base, output_packet_id: ids.f, proposal_packet_id: ids.e, evidence: "coverage test" },
    kage_transition_work_item: { ...base, packet_id: ids.e, to_stage: "in_review", actor: "coverage-agent" },
  };
  return overrides[name] ?? base;
}

const allTools = (() => {
  const prev = process.env.KAGE_TOOLS;
  process.env.KAGE_TOOLS = "full";
  const names = listTools().map((t) => t.name);
  process.env.KAGE_TOOLS = prev;
  return names;
})();

test("every registered MCP tool is reachable and returns content (no orphan handlers)", async (t) => {
  const failures: string[] = [];
  for (const name of allTools) {
    if (NETWORK_TOOLS.has(name)) continue; // asserted-registered below, not called offline
    await t.test(name, async () => {
      let result;
      try {
        result = await callTool(name, argsFor(name));
      } catch (error) {
        failures.push(`${name}: threw ${(error as Error).message}`);
        throw error;
      }
      assert.ok(result && Array.isArray(result.content) && result.content.length > 0, `${name} returned no content`);
      assert.equal(result.content[0].type, "text", `${name} first content block is not text`);
    });
  }
  assert.deepEqual(failures, [], `tools with broken handlers: ${failures.join("; ")}`);
});

test("kage_transition_work_item never performs the terminal in_review -> done transition, even for a real in_review item", async () => {
  const proposal = capture({ projectDir: project, title: "Coverage proposal — never-done", body: "We should add a never-approved-via-mcp feature.", type: "proposal", allowMissingPaths: true });
  const packetId = proposal.packet!.id;
  claimWorkItem(project, packetId, "coverage-agent");
  const output = capture({ projectDir: project, title: "Coverage output — never-done", body: "Implemented the never-approved-via-mcp feature.", type: "decision", paths: ["src/app.js"] });
  const link = await callTool("kage_link_implements", { project_dir: project, output_packet_id: output.packet!.id, proposal_packet_id: packetId, evidence: "coverage" });
  assert.equal(Boolean(link.isError), false);

  const result = await callTool("kage_transition_work_item", { project_dir: project, packet_id: packetId, to_stage: "done", actor: "coverage-agent" });
  assert.equal(result.isError, true);
  const body = JSON.parse((result.content[0] as { text: string }).text);
  assert.equal(body.ok, false);
  assert.match(body.errors.join(" "), /never performs the terminal in_review -> done transition/);

  const items = (await callTool("kage_list_work_items", { project_dir: project, stage: "in_review" })).content;
  const listed = JSON.parse((items[0] as { text: string }).text) as Array<{ id: string; stage: string }>;
  assert.equal(listed.some((item) => item.id === packetId && item.stage === "in_review"), true, "the item must still be in_review, not done");
});

test("network tools are registered (in full mode) even though offline-skipped", () => {
  for (const name of NETWORK_TOOLS) {
    assert.equal(allTools.includes(name), true, `${name} missing from full registry`);
  }
});

test("full registry covers every tool exactly once", () => {
  assert.equal(new Set(allTools).size, allTools.length, "duplicate tool names");
  assert.ok(allTools.length >= 60, `expected full registry, got ${allTools.length}`);
});

// The Task 10 cutover shrinks the DEFAULT surface to three verbs, but must not make any tool
// unreachable: KAGE_TOOLS=legacy still exposes the entire registry (with deprecation notes), so every
// full-mode tool has a handler reachable by a back-compat config.
test("default surface is three verbs and legacy mode still covers the whole registry", () => {
  const prev = process.env.KAGE_TOOLS;
  delete process.env.KAGE_TOOLS;
  const defaultNames = listTools().map((t) => t.name);
  const legacyNames = listTools({ mode: "legacy" }).map((t) => t.name);
  process.env.KAGE_TOOLS = prev;
  assert.deepEqual(defaultNames, ["kage_context", "kage_retrieve", "kage_feedback"]);
  assert.deepEqual([...legacyNames].sort(), [...allTools].sort(), "legacy mode covers the full registry");
});
