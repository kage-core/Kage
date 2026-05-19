#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
const dataPath = required(args.data, "--data");
const limit = Number(args.limit ?? 470);
const topK = Number(args["top-k"] ?? 10);
const metricsK = unique([5, 10, 20, topK].filter((value) => Number.isFinite(value) && value > 0)).sort((a, b) => a - b);
const outPath = args.out ? String(args.out) : "";
const includeAbstention = Boolean(args["include-abstention"]);
const includeQuestionDate = Boolean(args["include-question-date"]);
const temporalQueryExpansion = !Boolean(args["no-temporal-query-expansion"]);

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const rows = data
  .filter((row) => includeAbstention || !String(row.question_id).endsWith("_abs"))
  .slice(0, limit);
const startedAt = Date.now();
const results = rows.map((row, index) => {
  const start = Date.now();
  const queryTerms = tokenize(queryText(row));
  const sessions = (row.haystack_sessions ?? []).map((session, sessionIndex) => ({
    id: String((row.haystack_session_ids ?? [])[sessionIndex] ?? sessionIndex),
    text: session.map((turn) => `${turn.role}: ${turn.content}`).join("\n\n"),
  }));
  const documents = sessions.map((session) => ({ ...session, terms: tokenize(session.text) }));
  const documentFrequency = new Map();
  for (const document of documents) {
    for (const term of new Set(document.terms)) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }
  const averageLength = documents.reduce((sum, document) => sum + document.terms.length, 0) / Math.max(1, documents.length);
  const retrieved = documents
    .map((document) => ({
      session_id: document.id,
      score: bm25(queryTerms, document.terms, documentFrequency, documents.length, averageLength),
    }))
    .sort((a, b) => b.score - a.score || a.session_id.localeCompare(b.session_id))
    .slice(0, Math.max(...metricsK))
    .map((item, rank) => ({ ...item, rank: rank + 1 }));
  const gold = new Set(row.answer_session_ids ?? []);
  const hitRanks = retrieved.filter((item) => gold.has(item.session_id)).map((item) => item.rank);
  if ((index + 1) % 10 === 0 || index + 1 === rows.length) console.error(`scored ${index + 1}/${rows.length}`);
  return {
    question_id: row.question_id,
    question_type: row.question_type,
    answer_session_ids: [...gold],
    retrieved,
    hit: hitRanks.length > 0,
    first_hit_rank: hitRanks[0] ?? null,
    latency_ms: Date.now() - start,
  };
});

const report = summarize({
  benchmark: "LongMemEval-S plain BM25 baseline",
  dataset_path: dataPath,
  evaluated_questions: rows.length,
  skipped_abstention_questions: includeAbstention ? 0 : data.filter((row) => String(row.question_id).endsWith("_abs")).length,
  top_k: topK,
  metrics_k: metricsK,
  include_question_date: includeQuestionDate,
  temporal_query_expansion: temporalQueryExpansion,
  duration_ms: Date.now() - startedAt,
  results,
});

if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

function bm25(queryTerms, documentTerms, documentFrequency, documentCount, averageLength) {
  const termFrequency = new Map();
  for (const term of documentTerms) termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
  let score = 0;
  const k1 = 1.5;
  const b = 0.75;
  for (const term of queryTerms) {
    const frequency = termFrequency.get(term) ?? 0;
    if (!frequency) continue;
    const df = documentFrequency.get(term) ?? 0;
    const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
    score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * (documentTerms.length / Math.max(1, averageLength)))));
  }
  return Number(score.toFixed(4));
}

function summarize(report) {
  const byType = {};
  for (const result of report.results) {
    byType[result.question_type] ??= { total: 0, hits: 0, mrr: 0 };
    byType[result.question_type].total += 1;
    if (result.hit) byType[result.question_type].hits += 1;
    if (result.first_hit_rank) byType[result.question_type].mrr += 1 / result.first_hit_rank;
  }
  const total = report.results.length || 1;
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
    evaluated_questions: report.evaluated_questions,
    top_k: report.top_k,
    metrics_k: report.metrics_k,
    ...recallByK,
    recall_at_k_percent: recallByK[`recall_at_${report.top_k}_percent`],
    mrr: round(report.results.reduce((sum, result) => sum + (result.first_hit_rank ? 1 / result.first_hit_rank : 0), 0) / total, 4),
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
      "This baseline builds an in-memory BM25 index for each question from raw LongMemEval-S sessions.",
      "It is not Kage and does not model repo-local memory packets, code links, freshness, PR checks, or shared review.",
      report.temporal_query_expansion
        ? "Relative temporal questions use the benchmark question date as retrieval-time metadata."
        : "Relative temporal query expansion was disabled.",
    ],
  };
  return report;
}

function tokenize(text) {
  return String(text).toLowerCase().match(/[a-z0-9_]+/g) ?? [];
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
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
  const hints = temporalQueryExpansion ? temporalQueryHints(row) : "";
  const parts = [row.question];
  if (includeQuestionDate && row.question_date) parts.push(`Question date: ${row.question_date}`);
  if (hints) parts.push(hints);
  return parts.join("\n");
}

function temporalQueryHints(row) {
  if (!row.question_date || !hasRelativeTemporalPhrase(row.question)) return "";
  const anchor = dateFromQuestionDate(row.question_date);
  if (!anchor) return "";
  const lower = String(row.question).toLowerCase();
  const hints = [];
  const addTargetDate = (daysAgo) => {
    const target = shiftUtcDays(anchor, -daysAgo);
    hints.push(`target date ${formatUtcDate(target)} ${monthName(target)} ${target.getUTCDate()}`);
  };
  if (/\b(?:ten|10)\s+days?\s+ago\b/.test(lower)) addTargetDate(10);
  if (/\b(?:two|2)\s+weeks?\s+ago\b/.test(lower)) addTargetDate(14);
  if (/\b(?:three|3)\s+weeks?\s+ago\b/.test(lower)) addTargetDate(21);
  if (/\b(?:four|4)\s+weeks?\s+ago\b/.test(lower)) addTargetDate(28);
  if (/\b(?:past|last)\s+month\b/.test(lower)) {
    const start = shiftUtcDays(anchor, -31);
    hints.push(`target month ${monthName(start)} ${start.getUTCFullYear()} ${formatUtcDate(start)} to ${formatUtcDate(anchor)}`);
  }
  return hints.join("\n");
}

function hasRelativeTemporalPhrase(question) {
  return /\b(?:(?:ten|10)\s+days?\s+ago|(?:two|2|three|3|four|4)\s+weeks?\s+ago|(?:past|last)\s+month)\b/i.test(String(question));
}

function dateFromQuestionDate(value) {
  const match = String(value).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function shiftUtcDays(date, days) {
  const shifted = new Date(date.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function formatUtcDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function monthName(date) {
  return date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}

function unique(values) {
  return [...new Set(values)];
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

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
