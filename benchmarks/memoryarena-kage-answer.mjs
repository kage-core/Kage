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
const limit = Number(args.limit ?? 10);
const topK = Number(args["top-k"] ?? 10);
const outPath = args.out ? String(args.out) : "";
const keep = Boolean(args.keep);
const provider = String(args.provider ?? "openai");
const model = String(args.model ?? process.env.KAGE_MEMORYARENA_MODEL ?? "gpt-4.1-mini");
const temperature = Number(args.temperature ?? 0);
const maxOutputTokens = Number(args["max-output-tokens"] ?? 800);

if (provider === "openai" && !process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Use --provider gold only for scorer smoke tests; do not report gold-provider results as model accuracy.");
  process.exit(2);
}
if (!["openai", "gold"].includes(provider)) {
  console.error(`Unsupported --provider ${provider}. Supported providers: openai, gold`);
  process.exit(2);
}

const rows = readJsonl(datasetPath).slice(0, limit);
const runDir = mkdtempSync(join(tmpdir(), "kage-memoryarena-answer-"));
const startedAt = Date.now();
const results = [];
let promptTokens = 0;
let completionTokens = 0;

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const projectDir = join(runDir, `${suite}-${safeName(String(row.id ?? index))}`);
  mkdirSync(join(projectDir, ".agent_memory", "packets"), { recursive: true });
  seedBackground(projectDir, row, suite);

  const questions = Array.isArray(row.questions) ? row.questions : [];
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const stepResults = [];

  for (let step = 0; step < questions.length; step += 1) {
    kernel.buildIndexes(projectDir);
    const question = String(questions[step] ?? "");
    const gold = answers[step];
    const recalled = kernel.recall(projectDir, question, topK, false, {
      trackAccess: false,
      semanticExpansion: false,
    });
    const prompt = answerPrompt({
      suite,
      row,
      step,
      question,
      recalledContext: recalled.context_block,
      gold,
    });
    const answerStart = Date.now();
    const modelResult = await answerWithProvider(prompt, gold);
    const latencyMs = Date.now() - answerStart;
    promptTokens += modelResult.prompt_tokens ?? estimateTokens(prompt);
    completionTokens += modelResult.completion_tokens ?? estimateTokens(modelResult.answer);
    const score = scoreAnswer(modelResult.answer, gold);
    stepResults.push({
      step,
      question,
      exact_answer: exactAnswer(gold),
      model_answer: modelResult.answer,
      score,
      latency_ms: latencyMs,
      retrieved_titles: recalled.results.slice(0, 5).map((entry) => entry.packet.title),
    });

    writeStepMemory(projectDir, row, suite, step, question, gold, modelResult.answer, score);
  }

  const finalStep = stepResults.at(-1) ?? null;
  results.push({
    row_id: row.id ?? index,
    category: row.category ?? suite,
    steps: questions.length,
    step_accuracy_percent: average(stepResults.map((item) => item.score.correct ? 100 : 0)),
    final_correct: Boolean(finalStep?.score.correct),
    final_score: finalStep?.score ?? null,
    median_latency_ms: percentile(stepResults.map((item) => item.latency_ms), 50),
    step_results: stepResults,
  });
  console.error(`answered ${index + 1}/${rows.length}`);
}

const report = buildReport();

if (outPath) {
  mkdirSync(join(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
}

if (!keep) rmSync(runDir, { recursive: true, force: true });

console.log(JSON.stringify(report.summary, null, 2));

function buildReport() {
  const scored = results.filter((item) => item.steps > 0);
  return {
    schema_version: 1,
    benchmark: "MemoryArena answer accuracy",
    suite,
    dataset_path: datasetPath,
    provider,
    model: provider === "openai" ? model : provider,
    evaluated_tasks: results.length,
    scored_tasks: scored.length,
    top_k: topK,
    duration_ms: Date.now() - startedAt,
    workdir: keep ? runDir : null,
    token_usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated: provider !== "openai",
    },
    summary: {
      benchmark: "MemoryArena answer accuracy",
      suite,
      provider,
      model: provider === "openai" ? model : provider,
      evaluated_tasks: results.length,
      scored_tasks: scored.length,
      step_accuracy_percent: average(scored.map((item) => item.step_accuracy_percent)),
      final_accuracy_percent: average(scored.map((item) => item.final_correct ? 100 : 0)),
      median_latency_ms: percentile(scored.map((item) => item.median_latency_ms), 50),
      token_usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated: provider !== "openai",
      },
      caveats: [
        provider === "gold"
          ? "Gold provider is a scorer/loop smoke test only and must not be reported as model accuracy."
          : "This is an official-style MemoryArena answer-accuracy run: Kage recall plus model answers compared to gold answers.",
        "Prior gold answers are saved as memory after each subtask to model environment feedback available to later sessions.",
        "Recall runs in strict mode with semantic concept expansion disabled.",
        "Scoring is exact/normalized matching for scalar answers and recursive exact matching for JSON/list/object answers.",
      ],
    },
    results,
  };
}

async function answerWithProvider(prompt, gold) {
  if (provider === "gold") {
    return {
      answer: typeof gold === "string" ? extractExactAnswer(gold) : JSON.stringify(gold),
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(stringifyMemory(gold)),
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "You are a precise benchmark agent. Answer only the current subtask. Use Kage memory context when it is relevant. Do not explain unless the question requires it.",
        },
        { role: "user", content: prompt },
      ],
      temperature,
      max_output_tokens: maxOutputTokens,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI response failed: ${response.status} ${body}`);
  }
  const json = await response.json();
  return {
    answer: extractResponseText(json),
    prompt_tokens: json.usage?.input_tokens,
    completion_tokens: json.usage?.output_tokens,
  };
}

function answerPrompt({ suite: suiteName, row, step, question, recalledContext, gold }) {
  const wantsJson = typeof gold !== "string";
  return [
    `MemoryArena suite: ${suiteName}`,
    `Task id: ${row.id ?? "unknown"}`,
    `Subtask: ${step + 1}`,
    "",
    "Kage recalled memory/context:",
    recalledContext,
    "",
    "Current subtask:",
    question,
    "",
    wantsJson
      ? "Return only valid JSON matching the requested answer structure. Do not include markdown or explanation."
      : "Return only the final answer text. If the answer is multiple choice, return the option letters or exact selected text only.",
  ].join("\n");
}

function scoreAnswer(predicted, gold) {
  if (typeof gold !== "string") {
    const parsed = parseJsonAnswer(predicted);
    const correct = parsed.ok && normalizedJson(parsed.value) === normalizedJson(gold);
    return {
      correct,
      method: "json_recursive_exact",
      normalized_prediction: parsed.ok ? normalizedJson(parsed.value) : normalizeScalar(predicted),
      normalized_gold: normalizedJson(gold),
    };
  }
  const goldExact = extractExactAnswer(gold);
  const pred = normalizeScalar(predicted);
  const exact = normalizeScalar(goldExact);
  const full = normalizeScalar(gold);
  const correct = Boolean(pred) && (pred === exact || pred === full || full.includes(pred) || pred.includes(exact));
  return {
    correct,
    method: "normalized_exact",
    normalized_prediction: pred,
    normalized_gold: exact,
  };
}

function parseJsonAnswer(value) {
  const text = stripCodeFence(String(value ?? "").trim());
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    const start = Math.min(...["[", "{"].map((char) => {
      const index = text.indexOf(char);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    }));
    const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (Number.isFinite(start) && end > start) {
      try {
        return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
      } catch {
        return { ok: false, value: text };
      }
    }
    return { ok: false, value: text };
  }
}

function stripCodeFence(value) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizedJson(value) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  }
  if (typeof value === "string") return value.trim();
  return value;
}

function exactAnswer(value) {
  return typeof value === "string" ? extractExactAnswer(value) : value;
}

function extractExactAnswer(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/(?:^|\n)\s*\*?\*?Exact Answer:?\*?\*?\s*(.+?)\s*$/is);
  if (match) return match[1].trim();
  return text.split(/\n+/).at(-1)?.trim() || text;
}

function normalizeScalar(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/```(?:json)?/g, "")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

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

function writeStepMemory(projectDir, row, suiteName, step, question, gold, modelAnswer, score) {
  const body = [
    `Subtask ${step + 1}`,
    "",
    `Question: ${question}`,
    "",
    "Environment feedback / gold answer:",
    stringifyMemory(gold),
    "",
    "Model answer:",
    String(modelAnswer ?? ""),
    "",
    `Scored correct: ${score.correct}`,
  ].join("\n");
  writePacket(projectDir, {
    id: `repo:memoryarena:${suiteName}:${safeName(String(row.id ?? "row"))}:answer-step-${step}`,
    title: `MemoryArena ${suiteName} task ${row.id ?? "row"} answer step ${step + 1}`,
    summary: truncate(`Gold feedback for prior MemoryArena subtask: ${stringifyMemory(gold)}`, 240),
    body,
    type: "reference",
    tags: ["external-benchmark", "memoryarena", suiteName, "subtask-answer", `step:${step}`],
  });
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
      fact: "MemoryArena task artifact imported as a Kage memory packet for answer-accuracy evaluation.",
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

function extractResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text.trim();
  const chunks = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
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

function estimateTokens(value) {
  return Math.ceil(String(value ?? "").length / 4);
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
