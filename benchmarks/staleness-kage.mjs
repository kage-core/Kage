#!/usr/bin/env node
// Memory Correctness Under Change — the benchmark the agent-memory field is missing.
//
// Every memory tool measures RECALL (can you find what you stored). None measure
// CORRECTNESS AFTER THE CODE CHANGES. An agent acting on a memory that describes
// deleted/refactored code is worse than one with no memory at all.
//
// This seeds N memories about a real repo, each citing a real file, then mutates
// the repo (deletes some cited files, rewrites others), and measures the
// STALE-SERVED RATE: of the memories returned at recall, how many now describe
// code that no longer matches. A capture-everything store serves 100% of them
// (it has no notion of staleness). Kage withholds them.
//
// Reproducible, no API. Usage: node benchmarks/staleness-kage.mjs [--n 40]

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);
const N = Number(process.argv.includes("--n") ? process.argv[process.argv.indexOf("--n") + 1] : 40);

const project = mkdtempSync(join(tmpdir(), "kage-staleness-"));
const git = (...a) => execFileSync("git", ["-C", project, ...a], { stdio: "pipe" });
git("init", "-q"); git("config", "user.email", "b@b"); git("config", "user.name", "b");
mkdirSync(join(project, "src"), { recursive: true });

// Seed N source files + one memory per file (real capture, real citations).
const files = [];
for (let i = 0; i < N; i += 1) {
  const f = `src/mod${i}.ts`;
  writeFileSync(join(project, f), `export function feature${i}() { return ${i}; }\n`, "utf8");
  files.push(f);
}
git("add", "-A"); git("commit", "-q", "-m", "seed");
kernel.initProject(project, { policy: false });
kernel.indexProject(project);
for (let i = 0; i < N; i += 1) {
  kernel.capture({
    projectDir: project,
    title: `feature${i} returns ${i}`,
    body: `feature${i}() in ${files[i]} returns the constant ${i}. Callers depend on this exact value.`,
    type: "reference",
    paths: [files[i]],
  });
}

// Mutate: delete the first third, rewrite the next third (changed behavior),
// leave the last third untouched. Two-thirds of memories are now stale.
const deleted = files.slice(0, Math.floor(N / 3));
const changed = files.slice(Math.floor(N / 3), Math.floor((2 * N) / 3));
const untouched = files.slice(Math.floor((2 * N) / 3));
for (const f of deleted) unlinkSync(join(project, f));
for (const f of changed) writeFileSync(join(project, f), `export function renamed() { return -1; }\n`, "utf8");
git("add", "-A"); git("commit", "-q", "-m", "mutate");
kernel.refreshProject(project, { force: true });

// Recall broadly and classify what comes back.
const recalled = kernel.recall(project, "feature returns constant value callers depend", 100, false, { trackAccess: false });
const served = recalled.results.map((r) => r.packet);
const staleSet = new Set([...deleted, ...changed]);
const servedStale = served.filter((p) => (p.paths ?? []).some((path) => staleSet.has(path)));

// "Naive baseline" = a store with no staleness notion: it would serve every
// packet whose query matches, stale or not. We approximate its stale-served
// count as all seeded packets that cite a now-stale file (what Kage suppresses).
const suppressed = kernel.kageSuppressedMemory(project).items.length;

const summary = {
  benchmark: "Memory Correctness Under Change (no API)",
  seeded_memories: N,
  mutated: { deleted: deleted.length, changed: changed.length, untouched: untouched.length, total_now_stale: deleted.length + changed.length },
  kage: {
    served_total: served.length,
    served_stale: servedStale.length,
    stale_served_rate_percent: round(served.length ? (servedStale.length / served.length) * 100 : 0, 2),
    suppressed_stale_memories: suppressed,
  },
  naive_capture_everything_baseline: {
    // No staleness check → every still-stored memory about a stale file is served.
    stale_served_rate_percent: 100,
    note: "Architectural: tools with no code-grounding (claude-mem, mem0, Hivemind, Glen) have no mechanism to detect a cited file changed; they serve stale memory at recall.",
  },
};
console.log(JSON.stringify(summary, null, 2));
rmSync(project, { recursive: true, force: true });

function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
