#!/usr/bin/env node
// LoCoMo retrieval evaluation for Kage — RETRIEVAL ONLY, no API, no LLM.
// Ingests each LoCoMo conversation's dialog turns as Kage memory packets
// (one packet per turn, keyed by dia_id), then for each answerable QA pair
// measures whether Kage recall surfaces the gold evidence turn(s) in top-k.
//
// This measures retrieval (did the right turn come back), NOT end-to-end QA
// accuracy (which needs an LLM to answer + judge). Kage has no LLM by design.
// LoCoMo is a conversational benchmark, not Kage's core use case (repo memory).
// Adversarial / evidence-less questions are excluded (nothing to retrieve).
//
// Usage: node benchmarks/locomo-kage-retrieval.mjs --data /path/locomo10.json [--limit N] [--top-k 10]

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);

const args = parseArgs(process.argv.slice(2));
const dataPath = required(args.data, "--data");
const convLimit = Number(args.limit ?? 10);
const topK = Number(args["top-k"] ?? 10);
const metricsK = unique([1, 5, 10, topK].filter((v) => Number.isFinite(v) && v > 0)).sort((a, b) => a - b);
const keep = Boolean(args.keep);
const useEmbeddings = Boolean(args.embeddings);
const embeddingModel = String(args["embedding-model"] ?? "Xenova/all-MiniLM-L6-v2");
const embeddingProvider = useEmbeddings ? await kernel.createDenseEmbeddingProvider(embeddingModel) : null;

const data = JSON.parse(readFileSync(dataPath, "utf8")).slice(0, convLimit);
const runDir = mkdtempSync(join(tmpdir(), "kage-locomo-"));
const startedAt = Date.now();
const results = [];

for (let ci = 0; ci < data.length; ci += 1) {
  const conv = data[ci];
  const projectDir = join(runDir, `conv-${ci}`);
  const turns = ingestConversation(projectDir, conv, ci);
  const turnIds = new Set(turns);
  if (useEmbeddings) {
    const built = await kernel.buildEmbeddingIndex(projectDir, { provider: embeddingProvider });
    if (!built.ok) throw new Error(`embedding index failed: ${built.errors.join("; ")}`);
  }

  for (const qa of conv.qa) {
    const evidence = (qa.evidence ?? []).filter((e) => typeof e === "string");
    // Skip adversarial (category 5) and any question with no in-conversation
    // evidence — retrieval recall is undefined when there's nothing to retrieve.
    if (qa.category === 5 || evidence.length === 0) continue;
    if (!evidence.some((e) => turnIds.has(e))) continue; // gold turn missing from data
    const recalled = useEmbeddings
      ? await kernel.recallWithEmbeddings(projectDir, String(qa.question), Math.max(...metricsK), false, { provider: embeddingProvider, trackAccess: false })
      : kernel.recall(projectDir, String(qa.question), Math.max(...metricsK), false, { trackAccess: false });
    const retrievedIds = recalled.results.map((r) => diaIdFromPacket(r.packet));
    let firstHit = null;
    retrievedIds.forEach((id, i) => {
      if (firstHit === null && evidence.includes(id)) firstHit = i + 1;
    });
    results.push({ category: qa.category, first_hit_rank: firstHit });
  }
  process.stderr.write(`conv ${ci + 1}/${data.length} done (${results.length} scored)\n`);
}

const CAT = { 1: "multi-hop", 2: "temporal", 3: "open-domain", 4: "single-hop" };
const total = results.length || 1;
const recallByK = Object.fromEntries(metricsK.map((k) => [
  `recall_at_${k}_percent`,
  round(results.filter((r) => r.first_hit_rank && r.first_hit_rank <= k).length / total * 100, 2),
]));
const mrr = round(results.reduce((s, r) => s + (r.first_hit_rank ? 1 / r.first_hit_rank : 0), 0) / total, 4);
const byCat = {};
for (const r of results) {
  const c = CAT[r.category] ?? `cat-${r.category}`;
  byCat[c] ??= { questions: 0, hits: 0 };
  byCat[c].questions += 1;
  if (r.first_hit_rank && r.first_hit_rank <= topK) byCat[c].hits += 1;
}

const summary = {
  benchmark: "LoCoMo (retrieval-only, no API)",
  retrieval_mode: useEmbeddings ? "kage-recall-dense-local-embeddings" : "kage-recall-bm25",
  note: "Measures whether Kage recall surfaces the gold evidence turn in top-k; not end-to-end QA accuracy. Adversarial (cat 5) and evidence-less questions excluded.",
  conversations: data.length,
  evaluated_questions: results.length,
  top_k: topK,
  ...recallByK,
  mrr,
  by_category: Object.fromEntries(Object.entries(byCat).map(([c, v]) => [c, { questions: v.questions, recall_at_k_percent: round(v.hits / v.questions * 100, 2) }])),
  duration_seconds: round((Date.now() - startedAt) / 1000, 2),
};
console.log(JSON.stringify(summary, null, 2));
if (!keep) rmSync(runDir, { recursive: true, force: true });

function ingestConversation(projectDir, conv, ci) {
  const packetDir = join(projectDir, ".agent_memory", "packets");
  mkdirSync(packetDir, { recursive: true });
  const now = new Date().toISOString();
  const c = conv.conversation ?? {};
  const ids = [];
  for (const key of Object.keys(c)) {
    if (!/^session_\d+$/.test(key)) continue;
    const date = c[`${key}_date_time`] ?? "unknown";
    for (const turn of c[key]) {
      const dia = turn.dia_id;
      if (!dia) continue;
      ids.push(dia);
      const packet = {
        schema_version: 2,
        id: `repo:locomo:c${ci}:turn:${safeName(dia)}`,
        title: `${turn.speaker}: ${String(turn.text).slice(0, 80)}`,
        summary: String(turn.text).slice(0, 240),
        body: `Date: ${date}\nSpeaker: ${turn.speaker}\ndia_id: ${dia}\n\n${turn.text}`,
        type: "reference", scope: "repo", visibility: "team", sensitivity: "internal",
        status: "approved", confidence: 0.7,
        tags: ["external-benchmark", "locomo", `dia:${dia}`],
        paths: [`locomo/c${ci}/${safeName(dia)}.md`],
        stack: [],
        source_refs: [{ kind: "external_benchmark", captured_at: now }],
        context: { fact: "LoCoMo dialog turn imported for retrieval evaluation.", verification: "Gold evidence dia_ids supplied by the LoCoMo dataset." },
        freshness: { ttl_days: 365, last_verified_at: now, verification: "locomo_gold_data" },
        edges: [],
        quality: { reviewer: "benchmark-harness", score: 100, reasons: ["external gold dataset"], review_boundary: "external_benchmark", promotion_requires_review: false },
        created_at: now, updated_at: now,
      };
      writeFileSync(join(packetDir, `${safeName(dia)}.json`), JSON.stringify(packet, null, 2));
    }
  }
  return ids;
}

function diaIdFromPacket(packet) {
  const tag = (packet?.tags ?? []).find((t) => t.startsWith("dia:"));
  return tag ? tag.slice(4) : null;
}
function parseArgs(argv) { const o = {}; for (let i = 0; i < argv.length; i += 1) { const a = argv[i]; if (a.startsWith("--")) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true; o[k] = v; } } return o; }
function required(v, n) { if (!v) { console.error(`Missing ${n}`); process.exit(2); } return v; }
function unique(a) { return [...new Set(a)]; }
function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
function safeName(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g, "_"); }
