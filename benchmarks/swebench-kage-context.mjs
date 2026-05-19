#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);

const args = parseArgs(process.argv.slice(2));
const datasetPath = required(args.dataset, "--dataset");
const repoCache = required(args["repo-cache"], "--repo-cache");
const limit = Number(args.limit ?? 10);
const topK = Number(args["top-k"] ?? 10);
const outPath = args.out ? String(args.out) : "";

const rows = readJsonl(datasetPath).slice(0, limit);
const runDir = mkdtempSync(join(tmpdir(), "kage-swebench-context-"));
const startedAt = Date.now();
const results = [];

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const repoDir = join(repoCache, row.repo.replace("/", "__"));
  const goldFiles = patchFiles(row.patch ?? "");
  const result = {
    instance_id: row.instance_id,
    repo: row.repo,
    gold_files: goldFiles,
    indexed: false,
    retrieved_files: [],
    hit_files: [],
    recall_at_k_percent: 0,
    error: null,
  };
  try {
    if (!existsSync(repoDir)) {
      throw new Error(`missing repo checkout: ${repoDir}`);
    }
    execFileSync("git", ["-C", repoDir, "checkout", row.base_commit], { stdio: "ignore" });
    kernel.refreshProject(repoDir);
    const recalled = kernel.recall(repoDir, row.problem_statement, topK, false, { trackAccess: false });
    const codeFacts = kernel.queryCodeGraph(repoDir, row.problem_statement, topK);
    const retrievedFiles = new Set();
    for (const item of recalled.results ?? []) {
      for (const path of item.packet?.paths ?? []) retrievedFiles.add(path);
    }
    for (const fact of codeFacts.results ?? codeFacts.facts ?? []) {
      const text = typeof fact === "string" ? fact : JSON.stringify(fact);
      for (const file of goldFiles) {
        if (text.includes(file)) retrievedFiles.add(file);
      }
    }
    result.indexed = true;
    result.retrieved_files = [...retrievedFiles].sort();
    result.hit_files = goldFiles.filter((file) => retrievedFiles.has(file));
    result.recall_at_k_percent = goldFiles.length ? round((result.hit_files.length / goldFiles.length) * 100, 2) : 0;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  results.push(result);
  console.error(`scored ${index + 1}/${rows.length}`);
}

const scored = results.filter((result) => result.indexed && result.gold_files.length);
const report = {
  benchmark: "SWE-bench context retrieval",
  dataset_path: datasetPath,
  repo_cache: repoCache,
  evaluated_instances: results.length,
  scored_instances: scored.length,
  top_k: topK,
  duration_ms: Date.now() - startedAt,
  summary: {
    benchmark: "SWE-bench context retrieval",
    evaluated_instances: results.length,
    scored_instances: scored.length,
    file_recall_percent: scored.length
      ? round(scored.reduce((sum, result) => sum + result.recall_at_k_percent, 0) / scored.length, 2)
      : 0,
    caveats: [
      "This measures whether Kage retrieves files touched by gold patches; it is not SWE-bench pass rate.",
      "Full SWE-bench pass rate requires an agent to generate patches and the official Docker harness to evaluate them.",
    ],
  },
  results,
};

if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function patchFiles(patch) {
  const files = new Set();
  for (const line of patch.split(/\r?\n/)) {
    const match = line.match(/^\+\+\+ b\/(.+)$/);
    if (match && match[1] !== "/dev/null") files.add(match[1]);
  }
  return [...files].sort();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function required(value, name) {
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(2);
  }
  return String(value);
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
