#!/usr/bin/env node

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);

const args = parseArgs(process.argv.slice(2));
const datasetPath = required(args.dataset, "--dataset");
const suite = String(args.suite ?? "memoryarena");
const limit = Number(args.limit ?? 25);
const topK = Number(args["top-k"] ?? 10);
const outPath = args.out ? String(args.out) : "";
const keep = Boolean(args.keep);

const rows = readJsonl(datasetPath).slice(0, limit);
const runDir = mkdtempSync(join(tmpdir(), "kage-memoryarena-context-"));
const startedAt = Date.now();
const results = [];

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const projectDir = join(runDir, `${suite}-${safeName(String(row.id ?? index))}`);
  mkdirSync(join(projectDir, ".agent_memory", "packets"), { recursive: true });
  seedBackground(projectDir, row, suite);

  const questions = Array.isArray(row.questions) ? row.questions : [];
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const stepResults = [];
  const priorPacketIds = [];

  for (let step = 0; step < questions.length; step += 1) {
    kernel.buildIndexes(projectDir);
    const query = String(questions[step] ?? "");
    const recallStart = Date.now();
    const recalled = kernel.recall(projectDir, query, topK, false, {
      trackAccess: false,
      semanticExpansion: false,
    });
    const latencyMs = Date.now() - recallStart;
    const retrievedIds = recalled.results.map((entry) => entry.packet.id);
    const priorHits = priorPacketIds.filter((id) => retrievedIds.includes(id));
    const dependencyCoverage = priorPacketIds.length
      ? round((priorHits.length / priorPacketIds.length) * 100, 2)
      : null;
    stepResults.push({
      step,
      question: query,
      prior_memory_packets: priorPacketIds.length,
      retrieved_packets: retrievedIds.length,
      prior_hits: priorHits.length,
      dependency_coverage_percent: dependencyCoverage,
      latency_ms: latencyMs,
      top_titles: recalled.results.slice(0, 5).map((entry) => entry.packet.title),
    });

    const answer = answers[step];
    if (answer !== undefined) {
      const packetId = writeStepMemory(projectDir, row, suite, step, query, answer);
      priorPacketIds.push(packetId);
    }
  }

  const scoredSteps = stepResults.filter((item) => item.prior_memory_packets > 0);
  const finalStep = scoredSteps.at(-1) ?? null;
  results.push({
    row_id: row.id ?? index,
    category: row.category ?? suite,
    steps: questions.length,
    scored_steps: scoredSteps.length,
    average_dependency_coverage_percent: average(scoredSteps.map((item) => item.dependency_coverage_percent ?? 0)),
    final_dependency_coverage_percent: finalStep?.dependency_coverage_percent ?? null,
    median_latency_ms: percentile(stepResults.map((item) => item.latency_ms), 50),
    step_results: stepResults,
  });
  console.error(`scored ${index + 1}/${rows.length}`);
}

const scored = results.filter((item) => item.scored_steps > 0);
const report = {
  schema_version: 1,
  benchmark: "MemoryArena context recall",
  suite,
  dataset_path: datasetPath,
  evaluated_tasks: results.length,
  scored_tasks: scored.length,
  top_k: topK,
  duration_ms: Date.now() - startedAt,
  workdir: keep ? runDir : null,
  summary: {
    benchmark: "MemoryArena context recall",
    suite,
    evaluated_tasks: results.length,
    scored_tasks: scored.length,
    average_dependency_coverage_percent: average(scored.map((item) => item.average_dependency_coverage_percent)),
    final_dependency_coverage_percent: average(scored.map((item) => item.final_dependency_coverage_percent ?? 0)),
    median_latency_ms: percentile(results.map((item) => item.median_latency_ms), 50),
    caveats: [
      "This is not the official MemoryArena task-solving score.",
      "It measures whether Kage retrieves earlier subtask answer memories when later subtasks run in the same task chain.",
      "Recall runs in strict mode with semantic concept expansion disabled.",
      "Official MemoryArena scoring requires an agent/LLM to act on retrieved context and produce final answers.",
    ],
  },
  results,
};

if (outPath) {
  mkdirSync(join(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
}

if (!keep) rmSync(runDir, { recursive: true, force: true });

console.log(JSON.stringify(report.summary, null, 2));

function seedBackground(projectDir, row, suiteName) {
  const backgrounds = Array.isArray(row.backgrounds)
    ? row.backgrounds
    : row.backgrounds
      ? [row.backgrounds]
      : [];
  if (row.base_person) backgrounds.push(row.base_person);
  backgrounds.forEach((background, index) => {
    writePacket(projectDir, {
      id: `repo:memoryarena:${suiteName}:${safeName(String(row.id ?? "row"))}:background-${index}`,
      title: `MemoryArena ${suiteName} background ${index + 1}`,
      body: stringifyMemory(background),
      summary: truncate(stringifyMemory(background), 240),
      type: "reference",
      tags: ["external-benchmark", "memoryarena", suiteName, "background"],
    });
  });
}

function writeStepMemory(projectDir, row, suiteName, step, question, answer) {
  const id = `repo:memoryarena:${suiteName}:${safeName(String(row.id ?? "row"))}:step-${step}`;
  const body = [
    `Subtask ${step + 1}`,
    "",
    `Question: ${question}`,
    "",
    "Verified answer:",
    stringifyMemory(answer),
  ].join("\n");
  writePacket(projectDir, {
    id,
    title: `MemoryArena ${suiteName} task ${row.id ?? "row"} step ${step + 1}`,
    summary: truncate(`Answer for prior MemoryArena subtask: ${stringifyMemory(answer)}`, 240),
    body,
    type: "reference",
    tags: ["external-benchmark", "memoryarena", suiteName, "subtask-answer", `step:${step}`],
  });
  return id;
}

function writePacket(projectDir, input) {
  const now = new Date().toISOString();
  const packet = {
    schema_version: 2,
    id: input.id,
    title: input.title,
    summary: input.summary,
    body: input.body,
    type: input.type,
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.7,
    tags: input.tags,
    paths: [`memoryarena/${safeName(input.id)}.md`],
    stack: [],
    source_refs: [{ kind: "external_benchmark", captured_at: now }],
    context: {
      fact: "MemoryArena task artifact imported as a Kage memory packet for context recall evaluation.",
      verification: "MemoryArena dataset supplies the subtask question, answer, and background.",
    },
    freshness: {
      ttl_days: 365,
      last_verified_at: now,
      verification: "memoryarena_gold_data",
    },
    edges: [],
    quality: {
      reviewer: "benchmark-harness",
      votes_up: 0,
      votes_down: 0,
      uses_30d: 0,
      reports_stale: 0,
      review_boundary: "external_benchmark",
      promotion_requires_review: false,
      score: 100,
      reasons: ["external gold dataset"],
      risks: [],
      duplicate_candidates: [],
      estimated_tokens_saved: 0,
    },
    created_at: now,
    updated_at: now,
  };
  writeFileSync(join(projectDir, ".agent_memory", "packets", `${safeName(input.id)}.json`), JSON.stringify(packet, null, 2));
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function stringifyMemory(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function truncate(value, length) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
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

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "item";
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 0;
  return round(finite.reduce((sum, value) => sum + value, 0) / finite.length, 2);
}

function percentile(values, percentileValue) {
  const finite = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!finite.length) return 0;
  const index = Math.min(finite.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * finite.length) - 1));
  return finite[index];
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
