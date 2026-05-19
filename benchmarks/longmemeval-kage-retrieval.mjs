#!/usr/bin/env node

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);

const args = parseArgs(process.argv.slice(2));
const dataPath = required(args.data, "--data");
const limit = Number(args.limit ?? 50);
const topK = Number(args["top-k"] ?? 10);
const metricsK = unique([5, 10, 20, topK].filter((value) => Number.isFinite(value) && value > 0)).sort((a, b) => a - b);
const outPath = args.out ? String(args.out) : "";
const keep = Boolean(args.keep);
const includeAbstention = Boolean(args["include-abstention"]);
const includeQuestionDate = Boolean(args["include-question-date"]);
const temporalQueryExpansion = !Boolean(args["no-temporal-query-expansion"]);
const semanticExpansion = Boolean(args["semantic-expansion"]);
const useEmbeddings = Boolean(args.embeddings);
const embeddingModel = String(args["embedding-model"] ?? "Xenova/all-MiniLM-L6-v2");
const embeddingProvider = useEmbeddings
  ? await kernel.createDenseEmbeddingProvider(embeddingModel)
  : null;

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const rows = data
  .filter((row) => includeAbstention || !String(row.question_id).endsWith("_abs"))
  .slice(0, limit);

const runDir = mkdtempSync(join(tmpdir(), "kage-longmemeval-s-"));
const startedAt = Date.now();
const results = [];

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const projectDir = join(runDir, safeName(row.question_id));
  writeQuestionProject(projectDir, row);
  let embeddingBuild = null;
  if (useEmbeddings) {
    embeddingBuild = await kernel.buildEmbeddingIndex(projectDir, { provider: embeddingProvider });
    if (!embeddingBuild.ok) {
      throw new Error(`Embedding index failed for ${row.question_id}: ${embeddingBuild.errors.join("; ")}`);
    }
  }
  const start = Date.now();
  const recallLimit = Math.max(...metricsK);
  const recalled = useEmbeddings
    ? await kernel.recallWithEmbeddings(projectDir, queryText(row), recallLimit, false, { provider: embeddingProvider, trackAccess: false, semanticExpansion })
    : kernel.recall(projectDir, queryText(row), recallLimit, false, { trackAccess: false, semanticExpansion });
  const latencyMs = Date.now() - start;
  const retrieved = recalled.results.map((result, rank) => {
    const packet = result.packet ?? {};
    return {
      rank: rank + 1,
      packet_id: packet.id,
      title: packet.title,
      session_id: sessionFromPacket(packet),
      score: result.score,
    };
  });
  const gold = new Set(row.answer_session_ids ?? []);
  const hitRanks = retrieved
    .filter((item) => gold.has(item.session_id))
    .map((item) => item.rank);
  results.push({
    question_id: row.question_id,
    question_type: row.question_type,
    answer_session_ids: [...gold],
    retrieved,
    hit: hitRanks.length > 0,
    first_hit_rank: hitRanks[0] ?? null,
    latency_ms: latencyMs,
    embedding_index: embeddingBuild
      ? {
          provider: embeddingBuild.provider,
          model: embeddingBuild.model,
          dimensions: embeddingBuild.dimensions,
          packet_count: embeddingBuild.packet_count,
        }
      : null,
  });

  if ((index + 1) % 10 === 0 || index + 1 === rows.length) {
    console.error(`scored ${index + 1}/${rows.length}`);
  }
}

const report = summarize({
  benchmark: "LongMemEval-S",
  dataset_path: dataPath,
  evaluated_questions: rows.length,
  skipped_abstention_questions: includeAbstention ? 0 : data.filter((row) => String(row.question_id).endsWith("_abs")).length,
  top_k: topK,
  metrics_k: metricsK,
  include_question_date: includeQuestionDate,
  temporal_query_expansion: temporalQueryExpansion,
  semantic_expansion: semanticExpansion,
  embeddings: useEmbeddings
    ? {
        provider: "xenova",
        model: embeddingModel,
        artifact: ".agent_memory/indexes/embeddings-local.json",
      }
    : null,
  duration_ms: Date.now() - startedAt,
  workdir: keep ? runDir : null,
  results,
});

if (outPath) {
  mkdirSync(join(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
}

if (!keep) {
  rmSync(runDir, { recursive: true, force: true });
}

console.log(JSON.stringify(report.summary, null, 2));

function writeQuestionProject(projectDir, row) {
  const packetDir = join(projectDir, ".agent_memory", "packets");
  mkdirSync(packetDir, { recursive: true });
  const now = new Date().toISOString();
  const sessions = row.haystack_sessions ?? [];
  const ids = row.haystack_session_ids ?? [];
  const dates = row.haystack_dates ?? [];
  sessions.forEach((session, index) => {
    const sessionId = String(ids[index] ?? index);
    const transcript = session
      .map((turn) => `${turn.role}: ${turn.content}`)
      .join("\n\n");
    const packet = {
      schema_version: 2,
      id: `repo:longmemeval-s:${safeName(row.question_id)}:reference:session-${safeName(sessionId)}`,
      title: `LongMemEval-S session ${sessionId}`,
      summary: transcript.slice(0, 240),
      body: `Session date: ${dates[index] ?? "unknown"}\nSession id: ${sessionId}\n\n${transcript}`,
      type: "reference",
      scope: "repo",
      visibility: "team",
      sensitivity: "internal",
      status: "approved",
      confidence: 0.7,
      tags: ["external-benchmark", "longmemeval-s", row.question_type, `question:${row.question_id}`, `session:${sessionId}`],
      paths: [`longmemeval/${row.question_id}/${sessionId}.md`],
      stack: [],
      source_refs: [{ kind: "external_benchmark", captured_at: now }],
      context: {
        fact: "LongMemEval-S chat session imported as a Kage memory packet for retrieval evaluation.",
        verification: "Gold evidence session ids are supplied by the LongMemEval-S dataset.",
      },
      freshness: {
        ttl_days: 365,
        last_verified_at: now,
        verification: "longmemeval_s_gold_data",
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
    writeFileSync(join(packetDir, `${safeName(sessionId)}.json`), JSON.stringify(packet, null, 2));
  });
}

function summarize(report) {
  const byType = {};
  for (const result of report.results) {
    byType[result.question_type] ??= { total: 0, hits: 0, mrr: 0 };
    byType[result.question_type].total += 1;
    if (result.first_hit_rank && result.first_hit_rank <= report.top_k) byType[result.question_type].hits += 1;
    if (result.first_hit_rank) byType[result.question_type].mrr += 1 / result.first_hit_rank;
  }
  const total = report.results.length || 1;
  const mrr = report.results.reduce((sum, result) => sum + (result.first_hit_rank ? 1 / result.first_hit_rank : 0), 0) / total;
  const recallByK = Object.fromEntries(
    report.metrics_k.map((k) => [
      `recall_at_${k}_percent`,
      round((report.results.filter((result) => result.first_hit_rank && result.first_hit_rank <= k).length / total) * 100, 2),
    ]),
  );
  const ndcgByK = Object.fromEntries(
    report.metrics_k.map((k) => [`ndcg_at_${k}`, round(ndcgAtK(report.results, k), 4)]),
  );
  const latencies = report.results.map((result) => result.latency_ms).sort((a, b) => a - b);
  report.summary = {
    benchmark: report.benchmark,
    retrieval_mode: report.embeddings
      ? "kage-recall-with-dense-local-embeddings"
      : report.semantic_expansion
        ? "kage-recall-product-semantic-expansion"
        : "kage-recall-strict-no-semantic-expansion",
    embeddings: report.embeddings,
    evaluated_questions: report.evaluated_questions,
    top_k: report.top_k,
    metrics_k: report.metrics_k,
    ...recallByK,
    recall_at_k_percent: recallByK[`recall_at_${report.top_k}_percent`],
    mrr: round(mrr, 4),
    ...ndcgByK,
    median_latency_ms: percentile(latencies, 50),
    p95_latency_ms: percentile(latencies, 95),
    duration_seconds: round(report.duration_ms / 1000, 2),
    by_type: Object.fromEntries(
      Object.entries(byType).map(([type, value]) => [
        type,
        {
          questions: value.total,
          recall_at_k_percent: round((value.hits / value.total) * 100, 2),
          mrr: round(value.mrr / value.total, 4),
        },
      ]),
    ),
    caveats: [
      "This is session-level evidence retrieval, not answer generation.",
      "Abstention questions are skipped by default, matching the official retrieval-evaluation note.",
      "Each LongMemEval-S session is imported as one Kage memory packet; no LLM summarization is used.",
      report.temporal_query_expansion
        ? "Relative temporal questions use the benchmark question date as retrieval-time metadata."
        : "Relative temporal query expansion was disabled.",
    report.embeddings
      ? `The run uses Kage's normal recall stack plus optional dense local embeddings from ${report.embeddings.model}.`
      : report.semantic_expansion
        ? "The run uses Kage's product recall stack, including BM25, local sparse-vector scoring, graph/freshness/quality signals, and built-in concept expansion."
        : "The run uses Kage's strict benchmark recall stack: BM25, local sparse-vector scoring, graph/freshness/quality signals, and no built-in semantic concept expansion.",
    ],
  };
  return report;
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

function queryText(row) {
  if (!row.question_date) return row.question;
  if (includeQuestionDate || (temporalQueryExpansion && hasRelativeTemporalPhrase(row.question))) {
    return `${row.question}\nQuestion date: ${row.question_date}`;
  }
  return row.question;
}

function hasRelativeTemporalPhrase(question) {
  return /\b(?:(?:ten|10)\s+days?\s+ago|(?:two|2|three|3|four|4)\s+weeks?\s+ago|(?:past|last)\s+month)\b/i.test(String(question));
}

function sessionFromPacket(packet) {
  const tag = Array.isArray(packet.tags) ? packet.tags.find((item) => String(item).startsWith("session:")) : "";
  return tag ? String(tag).slice("session:".length) : "";
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function unique(values) {
  return [...new Set(values)];
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil((pct / 100) * values.length) - 1));
  return values[index];
}

function ndcgAtK(results, k) {
  if (!results.length) return 0;
  const total = results.reduce((sum, result) => {
    if (!result.first_hit_rank || result.first_hit_rank > k) return sum;
    return sum + 1 / Math.log2(result.first_hit_rank + 1);
  }, 0);
  return total / results.length;
}
