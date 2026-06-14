#!/usr/bin/env node
// RECORD step (gated: makes real model calls). For each scenario it seeds a fresh
// fixture repo with Kage installed + memory, runs a real headless Claude Code agent
// on the GENERAL task (the agent is never told to use Kage), captures the exact
// tool-call trajectory it chose, and writes it to recordings/<id>.json.
//
// The recorded trajectory is the golden the deterministic replay test scores.
// Re-run this to refresh goldens / detect behavior drift.
//
// Usage: node evals/agent-trajectory/record.mjs [scenarioId ...]
//   requires: an authenticated `claude` CLI on PATH.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "./scenarios.mjs";
import { scoreTrajectory } from "./score.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const recDir = join(here, "recordings");
mkdirSync(recDir, { recursive: true });

const want = process.argv.slice(2);
const scenarios = want.length ? SCENARIOS.filter((s) => want.includes(s.id)) : SCENARIOS;
if (!scenarios.length) {
  console.error(`No matching scenarios. Known: ${SCENARIOS.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

function parseTrajectory(stdout) {
  const events = [];
  let seq = 0;
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg;
    try { msg = JSON.parse(trimmed); } catch { continue; }
    const blocks = msg?.message?.content;
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        if (b?.type === "tool_use") events.push({ seq: seq++, tool: b.name, input: b.input ?? {} });
      }
    } else if (msg?.type === "tool_use") {
      events.push({ seq: seq++, tool: msg.name, input: msg.input ?? {} });
    }
  }
  return events;
}

for (const scenario of scenarios) {
  const fixture = mkdtempSync(join(tmpdir(), `kage-eval-${scenario.id}-`));
  try {
    scenario.setup(fixture);
    const mcpConfig = join(fixture, "kage.mcp.json");
    writeFileSync(
      mcpConfig,
      JSON.stringify({ mcpServers: { kage: { type: "stdio", command: "node", args: [join(repoRoot, "mcp", "dist", "index.js")], alwaysLoad: true } } }),
      "utf8"
    );

    console.log(`\n▶ recording "${scenario.id}" — ${fixture}`);
    const res = spawnSync(
      "claude",
      [
        "-p", scenario.task,
        "--output-format", "stream-json",
        "--verbose",
        "--mcp-config", mcpConfig,
        "--strict-mcp-config",
        "--permission-mode", "bypassPermissions",
        "--max-budget-usd", "1.00",
      ],
      { cwd: fixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 600_000 }
    );

    if (res.error) { console.error(`  driver failed: ${res.error.message}`); continue; }
    const events = parseTrajectory(res.stdout || "");
    const trajectory = {
      scenario: scenario.id,
      recorded_at: new Date().toISOString(),
      driver: "claude -p (stream-json)",
      task: scenario.task,
      events,
    };
    writeFileSync(join(recDir, `${scenario.id}.json`), JSON.stringify(trajectory, null, 2) + "\n", "utf8");

    const score = scoreTrajectory(trajectory, scenario);
    console.log(`  ${events.length} tool calls · ${score.passed ? "PASS" : "FAIL"}`);
    for (const r of score.results) console.log(`    ${r.ok ? "✓" : "✗"} ${r.expectation}`);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}
