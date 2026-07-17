#!/usr/bin/env node
// Reuse Value — does injected memory let the agent answer a question WITHOUT re-reading the
// files it would otherwise have to open?
//
// Kage's headline claim is a REUSE thesis, not a compression one. The proxy INJECTS memory, so
// it ADDS tokens to a single prompt; the claim is that having the memory means the agent does
// not re-derive or re-read knowledge it already captured, saving tokens ACROSS a task. The
// honest, deterministic core of that thesis — the part measurable with no agent and no network —
// is exactly this: for a labeled (query, the fact needed to answer it, the file(s) that carry
// that fact), does the recalled memory BODY contain the fact, so the agent could answer from
// memory instead of opening those files?
//
// This harness encodes that as a repeatable eval:
//   - A deterministic store, seeded through the kernel's own capture(): packets whose BODY carries
//     a non-obvious fact, cited to real seeded files that ALSO contain that fact.
//   - RELEVANT queries: the fact IS recallable from memory, so the agent avoids opening N cited
//     files. A relevant case is "answered from memory" iff the recalled packet bodies literally
//     contain the labeled fact.
//   - CONTROL queries: a plausible question whose ANSWER fact is NOT in any packet body (some
//     deliberately share topic vocabulary with a packet, so recall DOES return a packet — but not
//     the answer). Memory must not be credited. false_help_rate is that error, and its target is 0.
//
// The decision under test is the REAL recall() imported from mcp/dist/kernel.js — nothing here
// mirrors kernel logic. If ranking regresses so a relevant fact stops being recalled,
// answer_from_memory_rate drops; if the harness ever conflated "recalled a topical packet" with
// "recalled the answer", every topic-overlap control would flip to false-help and false_help_rate
// would jump. Two construction guards make the labels fair: each relevant fact occurs in exactly
// one packet body (and in each of its cited files), and each control's absent fact occurs in ZERO
// packet bodies. A violated guard is an ERROR, never a silent pass.
//
// HONEST SCOPE: answer_from_memory_rate is a deterministic PROXY for reuse value. It shows the
// answer was PRESENT in memory, so the agent COULD skip the files. The actual end-to-end TOKEN
// DELTA (an agent run WITH memory vs WITHOUT, netting the injection's own added tokens against the
// files not read) requires a live A/B agent run and is NOT claimed here. No token-savings number
// is fabricated. For the MEASURED cost side of the ledger — what injection actually ADDED, from
// real receipts — run this file with `--receipts` (see below); that cost is measured, the
// rediscovery saving is still an estimate until a live A/B exists.
//
// HONESTY CONTRACT: this eval MEASURES the current baseline; it records the real numbers in a
// dated BASELINE block and exits 0. `--assert-baseline` exits 1 only if a metric regressed below
// the recorded baseline (or any case errored). It is a benchmark: NOT part of `npm test`.
//
// Deterministic: fixed in-file corpus, fixed case order, recall runs with trackAccess:false so it
// observes without mutating, no PRNG and no clock in any verdict or metric.
//
// Usage:
//   node benchmarks/reuse-value-kage.mjs              # summary JSON + baseline block inside it
//   node benchmarks/reuse-value-kage.mjs --json       # full report (per-case table) on stdout
//   node benchmarks/reuse-value-kage.mjs --out /tmp/r.json
//   node benchmarks/reuse-value-kage.mjs --assert-baseline
//   node benchmarks/reuse-value-kage.mjs --receipts [--project <dir>] [--json]   # measured-cost cross-check
//   npm run bench:reuse --prefix mcp

import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));

// ===========================================================================================
// PART 1 — the deterministic reuse-value eval (no receipts, no network).
// ===========================================================================================

async function runReuseEval() {
  const kernel = await import(pathToFileURL(join(repoRoot, "mcp/dist/kernel.js")).href);

  // -----------------------------------------------------------------------------------------
  // Recorded baseline (2026-07-17). MEASURED numbers of the current recall path on this corpus,
  // recorded not aspired to. --assert-baseline fails only when a metric gets WORSE than this.
  // -----------------------------------------------------------------------------------------
  const RECORDED_BASELINE = {
    date: "2026-07-17",
    answer_from_memory_rate: 1.0,
    files_avoided: 8,
    false_help_rate: 0.0,
    errors: 0,
  };
  const BASELINE_DIRECTIONS = {
    answer_from_memory_rate: "higher",
    files_avoided: "higher",
    false_help_rate: "lower",
    errors: "lower",
  };

  // -----------------------------------------------------------------------------------------
  // Corpus. Each RELEVANT packet's `fact` is a verbatim substring of its body AND is written into
  // every one of its cited files. Everything is a fixed literal — no PRNG, no clock.
  // -----------------------------------------------------------------------------------------
  const RELEVANT = [
    {
      key: "payments-idempotency",
      type: "decision",
      title: "Ledger dedupes retried charges with an idempotency key",
      fact: "a unique database constraint on (account_id, idempotency_key)",
      body:
        "A retried charge reuses the original idempotency key, and the ledger keeps exactly one row per payment with a unique database constraint on (account_id, idempotency_key). Minting a fresh key inside the retry loop is how double charges shipped before.",
      files: ["src/payments/ledger.ts", "src/payments/retry.ts"],
      query: "how does the ledger stop a retried charge from paying twice",
    },
    {
      key: "deploy-region",
      type: "gotcha",
      title: "Staging deploy 301 means the bucket and cluster regions disagree",
      fact: "the artifact bucket and the cluster must both be us-east-1",
      body:
        "A staging deploy that fails with a 301 from the artifact store means the artifact bucket and the cluster must both be us-east-1 but currently disagree. The error surfaces as a generic upload timeout, which is why it keeps getting rediscovered.",
      files: ["deploy/staging.yaml"],
      query: "why does the staging deploy fail with a 301 from the artifact store",
    },
    {
      key: "ws-heartbeat",
      type: "gotcha",
      title: "Websocket gateway drops idle connections below the balancer timeout",
      fact: "the load balancer idle timeout must be above 35 seconds",
      // Deliberately states no ping-interval number, so the ping-interval control has no answer here.
      body:
        "The websocket gateway drops connections when the load balancer idle timeout must be above 35 seconds but is set lower, so the balancer closes the socket before the next keepalive. It looks like random client disconnects.",
      files: ["src/gateway/heartbeat.ts", "config/load-balancer.yaml"],
      query: "why does the websocket gateway drop idle connections at random",
    },
    {
      key: "migrator-reserved",
      type: "convention",
      title: "Quote identifiers in migrations because some column names are reserved words",
      fact: "order, group and user are SQL reserved words and must be quoted",
      body:
        "The schema migrator emits broken DDL when a column name is a SQL reserved word: order, group and user are SQL reserved words and must be quoted in every migration template. The reserved word list lives in the migrator.",
      files: ["migrator/reserved.ts"],
      query: "why does the schema migrator generate invalid DDL for some columns",
    },
    {
      key: "cache-tenant-keys",
      type: "convention",
      title: "Cache keys are namespaced by tenant id to survive bulk restores",
      fact: "every cache key is prefixed with the tenant id",
      body:
        "During bulk restores un-namespaced entries collide across tenants, so every cache key is prefixed with the tenant id. A linter enforces the prefix on new code before it can merge.",
      files: ["src/cache/keys.ts", "src/cache/restore.ts"],
      query: "how are cache entries kept separate per tenant during restores",
    },
  ];

  // CONTROL queries. `absent_fact` is the answer the question wants — and it is NOT in any packet
  // body. The first three deliberately share topic words with a packet, so recall returns that
  // packet; the fourth shares almost nothing. In every case, memory must claim NO help.
  const CONTROL = [
    {
      key: "db-replica-region",
      query: "which region hosts the staging database read replica",
      absent_fact: "us-west-2",
      note: "topic overlaps the deploy-region packet (region, staging); memory knows the bucket/cluster region, not the DB replica's",
    },
    {
      key: "ping-interval-ms",
      query: "how many milliseconds between websocket keepalive pings",
      absent_fact: "25000 milliseconds",
      note: "topic overlaps the ws-heartbeat packet (websocket, keepalive); the packet gives the idle timeout, never the ping interval",
    },
    {
      key: "cache-encryption",
      query: "what algorithm encrypts tenant cache entries at rest",
      absent_fact: "aes-256-gcm",
      note: "topic overlaps the cache-tenant-keys packet (tenant, cache); the packet is about key prefixing, not encryption",
    },
    {
      key: "gpg-release-key",
      query: "how do I rotate the GPG signing key used for npm releases",
      absent_fact: "gpg --full-generate-key",
      note: "no topical packet exists; the honest outcome is that memory offers and claims no help",
    },
  ];

  // -----------------------------------------------------------------------------------------
  // Store seeding through the kernel's own capture(), like production memory. Cited files are
  // written to contain the fact, so "files the agent would not need to open" is literally true.
  // -----------------------------------------------------------------------------------------
  const dir = mkdtempSync(join(tmpdir(), "kage-reuse-"));
  kernel.initProject(dir, { policy: false });
  const seedErrors = [];
  const titleByKey = new Map();
  for (const p of RELEVANT) {
    for (const rel of p.files) {
      const filePath = join(dir, rel);
      mkdirSync(dirname(filePath), { recursive: true });
      // The cited file carries the fact verbatim: opening it is exactly what memory lets the agent skip.
      writeFileSync(filePath, `// ${p.title}\n// ${p.fact}\n`, "utf8");
    }
    const result = kernel.capture({ projectDir: dir, title: p.title, body: p.body, type: p.type, paths: p.files });
    if (!result.ok) seedErrors.push(`capture failed for "${p.title}": ${(result.errors ?? []).join("; ")}`);
    titleByKey.set(p.key, p.title);
  }
  kernel.refreshProject(dir, { force: true });

  // Construction guards: the labels are only fair if each relevant fact is in exactly one packet
  // body (its own) and in all its cited files, and each control's absent fact is in NO packet body.
  const bodies = RELEVANT.map((p) => ({ key: p.key, text: normalize(`${p.title}\n${p.body}`) }));
  const guardErrors = [];
  for (const p of RELEVANT) {
    const carriers = bodies.filter((b) => b.text.includes(normalize(p.fact)));
    if (carriers.length !== 1 || carriers[0].key !== p.key) {
      guardErrors.push(`relevant fact for "${p.key}" must live in exactly its own packet body, found in [${carriers.map((c) => c.key).join(", ")}]`);
    }
  }
  for (const c of CONTROL) {
    const leaked = bodies.filter((b) => b.text.includes(normalize(c.absent_fact)));
    if (leaked.length > 0) {
      guardErrors.push(`control absent_fact "${c.absent_fact}" (${c.key}) must be in NO packet body, leaked into [${leaked.map((b) => b.key).join(", ")}]`);
    }
  }

  // -----------------------------------------------------------------------------------------
  // Cases. recall() with trackAccess:false is the real, non-mutating ranking call.
  // -----------------------------------------------------------------------------------------
  const startedAt = Date.now();
  const cases = [];
  for (const p of RELEVANT) cases.push(runRelevant(kernel, dir, p, titleByKey.get(p.key)));
  for (const c of CONTROL) cases.push(runControl(kernel, dir, c));

  // -----------------------------------------------------------------------------------------
  // Metrics. Errors (including construction-guard/seed failures) are counted, reported, and
  // excluded from rate denominators — never a silent pass.
  // -----------------------------------------------------------------------------------------
  const setupErrors = [...seedErrors, ...guardErrors];
  const ok = cases.filter((c) => !c.error);
  const errored = cases.filter((c) => c.error);
  const relevant = ok.filter((c) => c.class === "relevant");
  const control = ok.filter((c) => c.class === "control");

  const answered = relevant.filter((c) => c.answered_from_memory);
  const filesAvoided = answered.reduce((sum, c) => sum + c.cited_files, 0);
  const filesAvoidedPossible = relevant.reduce((sum, c) => sum + c.cited_files, 0);
  const controlsCredited = control.filter((c) => c.memory_credited);

  const metrics = {
    // Share of relevant questions whose answer was PRESENT in recalled memory (a deterministic
    // proxy for reuse value — see the honest-scope note; NOT an end-to-end token delta).
    answer_from_memory_rate: rate(answered.length, relevant.length),
    // Cited files the agent would not need to open on the answered relevant questions.
    files_avoided: filesAvoided,
    files_avoided_possible: filesAvoidedPossible,
    // Control questions the harness WRONGLY credited to memory. Target 0.
    false_help_rate: rate(controlsCredited.length, control.length),
    cases_total: cases.length,
    cases_errored: errored.length + (setupErrors.length ? 1 : 0),
  };

  // Score bands: the honesty ledger behind the rates. The control-recall rate proves the controls
  // actually RECALL packets, so false_help_rate=0 means "recall did not serve the answer", not
  // "recall returned nothing".
  const score_bands = {
    relevant_expected_top_hit_rate: rate(relevant.filter((c) => c.expected_top_hit).length, relevant.length),
    control_recall_returned_rate: rate(control.filter((c) => c.recalled_packets > 0).length, control.length),
    control_recall_returned_but_no_answer: control.filter((c) => c.recalled_packets > 0 && !c.memory_credited).length,
    note:
      "answer_from_memory_rate is a deterministic PROXY: the labeled fact was present in the recalled memory body, so the agent COULD answer without opening the cited files. It is NOT the end-to-end token delta (agent-with-memory vs agent-without, net of the injection's own added tokens), which needs a live A/B run and is not claimed here. control_recall_returned_rate > 0 with false_help_rate 0 is the point: recall serves topical packets for the controls, and the harness still does not credit memory unless the ANSWER is actually present.",
  };

  const current = {
    answer_from_memory_rate: metrics.answer_from_memory_rate,
    files_avoided: metrics.files_avoided,
    false_help_rate: metrics.false_help_rate,
    errors: metrics.cases_errored,
  };
  const EPSILON = 1e-6;
  const regressions = Object.entries(BASELINE_DIRECTIONS).flatMap(([key, direction]) => {
    const now = current[key];
    const recorded = RECORDED_BASELINE[key];
    if (typeof now !== "number" || typeof recorded !== "number") {
      return [{ metric: key, recorded, current: now, reason: "not comparable" }];
    }
    const worse = direction === "higher" ? now < recorded - EPSILON : now > recorded + EPSILON;
    return worse ? [{ metric: key, recorded, current: now, direction }] : [];
  });

  const report = {
    benchmark: "Reuse Value (recall answer-from-memory proxy)",
    decision_under_test:
      "mcp/kernel.ts recall(projectDir, query, 5, false, { trackAccess:false }) — imported from mcp/dist/kernel.js, not mirrored. Answered-from-memory = the labeled fact is a substring of the recalled packet bodies.",
    scope_note:
      "answer_from_memory_rate is a deterministic proxy for reuse value; the real agent-with-memory vs agent-without TOKEN DELTA is NOT claimed here (needs a live A/B run). For the MEASURED injection cost from real receipts: node benchmarks/reuse-value-kage.mjs --receipts.",
    dataset: {
      relevant: RELEVANT.length,
      control: CONTROL.length,
      seeded_files: RELEVANT.reduce((sum, p) => sum + p.files.length, 0),
      approved_packet_files: readdirSync(join(dir, ".agent_memory", "packets")).filter((f) => f.endsWith(".md")).length,
    },
    metrics,
    score_bands,
    setup_errors: setupErrors.length ? setupErrors : null,
    baseline: {
      recorded: RECORDED_BASELINE,
      current,
      regressions,
      asserted: Boolean(args["assert-baseline"]),
    },
    duration_ms: Date.now() - startedAt,
    workdir: args.keep ? dir : null,
    cases,
  };

  if (args.out) {
    writeFileSync(String(args.out), JSON.stringify(report, null, 2));
    console.error(`full report written to ${args.out}`);
  }
  if (!args.keep) rmSync(dir, { recursive: true, force: true });
  else console.error(`kept store: ${dir}`);

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    const { cases: _cases, ...summary } = report;
    console.log(JSON.stringify(summary, null, 2));
  }

  // Human-readable per-case table + baseline block on stderr (stdout stays parseable JSON).
  console.error("\nPER-CASE");
  console.error(`  ${"id".padEnd(24)} ${"class".padEnd(9)} ${"recalled".padEnd(9)} ${"answer".padEnd(7)} verdict`);
  for (const c of cases) {
    console.error(
      `  ${String(c.id).padEnd(24)} ${String(c.class).padEnd(9)} ${String(c.recalled_packets).padEnd(9)} ${String(c.class === "relevant" ? c.answered_from_memory : c.memory_credited).padEnd(7)} ${c.verdict}`,
    );
  }

  console.error(`\nBASELINE ${RECORDED_BASELINE.date} (recorded in-file; the current recall path — measured, not aspired to)`);
  for (const [key, direction] of Object.entries(BASELINE_DIRECTIONS)) {
    const flag = regressions.some((r) => r.metric === key) ? "REGRESSED" : "ok";
    console.error(`  ${key.padEnd(24)} current ${String(current[key]).padEnd(8)} recorded ${String(RECORDED_BASELINE[key]).padEnd(8)} (${direction} is better)  ${flag}`);
  }

  if (setupErrors.length) {
    console.error(`\nSETUP/CONSTRUCTION ERROR(S) (reported, never skipped):`);
    for (const e of setupErrors) console.error(`  ${e}`);
  }
  if (errored.length) {
    console.error(`\n${errored.length} case(s) ERRORED (reported in the JSON, never skipped):`);
    for (const c of errored) console.error(`  ${c.id}: ${c.error}`);
  }

  if (args["assert-baseline"] && (regressions.length || metrics.cases_errored)) {
    console.error(`\n--assert-baseline FAILED: ${regressions.length} regression(s), ${metrics.cases_errored} error(s).`);
    process.exit(1);
  }
  process.exit(0);
}

function runRelevant(kernel, dir, spec, expectedTitle) {
  const row = {
    id: spec.key,
    class: "relevant",
    query: spec.query,
    fact: spec.fact,
    cited_files: spec.files.length,
    recalled_packets: 0,
    expected_top_hit: false,
    answered_from_memory: false,
    verdict: "",
    error: null,
  };
  try {
    const result = kernel.recall(dir, spec.query, 5, false, { trackAccess: false });
    const served = result.results ?? [];
    row.recalled_packets = served.length;
    row.expected_top_hit = served.length > 0 && served[0].packet.title === expectedTitle;
    const servedText = normalize(served.map((r) => `${r.packet.title}\n${r.packet.body}`).join("\n"));
    row.answered_from_memory = servedText.includes(normalize(spec.fact));
    row.verdict = row.answered_from_memory ? (row.expected_top_hit ? "answered-top" : "answered") : "miss";
  } catch (error) {
    row.error = errText(error);
    row.verdict = "error";
  }
  return row;
}

function runControl(kernel, dir, spec) {
  const row = {
    id: spec.key,
    class: "control",
    query: spec.query,
    absent_fact: spec.absent_fact,
    cited_files: 0,
    recalled_packets: 0,
    memory_credited: false,
    verdict: "",
    error: null,
  };
  try {
    const result = kernel.recall(dir, spec.query, 5, false, { trackAccess: false });
    const served = result.results ?? [];
    row.recalled_packets = served.length;
    const servedText = normalize(served.map((r) => `${r.packet.title}\n${r.packet.body}`).join("\n"));
    // Credited only if the ANSWER the control asked for is actually in memory — which, by
    // construction, it is not. Crediting on mere recall would be the false-help failure.
    row.memory_credited = servedText.includes(normalize(spec.absent_fact));
    row.verdict = row.memory_credited ? "false-help" : "correctly-unhelped";
  } catch (error) {
    row.error = errText(error);
    row.verdict = "error";
  }
  return row;
}

// ===========================================================================================
// PART 2 — the receipts cross-check (Deliverable 3): the MEASURED cost of injection from the real
// local vNext store, put next to the reuse-value ESTIMATE. Reads the same shipped runtime client
// the audit report uses. On a repo with no receipts it says so (null + reason), never a zero.
// ===========================================================================================

async function runReceiptsCrossCheck() {
  const projectDir = resolve(args.project ? String(args.project) : process.cwd());
  const value = await crossCheck(projectDir);
  if (args.out) writeFileSync(String(args.out), JSON.stringify(value, null, 2));
  console.log(args.json ? JSON.stringify(value, null, 2) : renderCrossCheck(value));
  process.exit(0);
}

async function crossCheck(projectDir) {
  const base = {
    mode: "receipts_crosscheck",
    project_dir: projectDir,
    available: false,
    reason: null,
    receipts: 0,
    measurement_coverage: null,
    injected_bytes: { measured: false, reason: "no_receipts", receipts: 0, before_input_bytes: null, after_input_bytes: null, added_bytes: null },
    injected_tokens: { measured: false, reason: "no_receipts", receipts: 0, before_input_tokens: null, after_input_tokens: null, added_tokens: null },
    input_cost: { available: false, reason: "no_receipts", receipts: 0, before_usd: null, after_usd: null, delta_usd: null },
    by_mode: null,
    savings_status: "estimated_only",
    notes: NOTES,
  };

  let client;
  let commands;
  try {
    client = await import(pathToFileURL(join(repoRoot, "mcp/dist/vnext/runtime/client.js")).href);
    commands = await import(pathToFileURL(join(repoRoot, "mcp/dist/vnext/runtime/commands.js")).href);
  } catch {
    return { ...base, reason: "kage_build_missing" };
  }

  const query = client.readLocalReceipts(projectDir);
  if (!query.available) {
    // "we could not read the store" and "nothing was transformed" are different facts; carry the reason.
    return { ...base, reason: query.reason ?? "receipt_store_unreadable" };
  }
  const receipts = query.receipts;
  if (!receipts.length) {
    // Readable store, genuinely empty: measurable values stay null with an explicit reason, never 0.
    return { ...base, available: true, reason: "empty_audit_period" };
  }

  const coverage = { exact: 0, partial: 0, unavailable: 0 };
  for (const r of receipts) coverage[r.measurement_quality] += 1;

  // Injected BYTES are measured on every receipt (before/after input bytes are always counted).
  // This is the real, measured footprint of injection. It is NEVER converted to tokens — the
  // codebase forbids deriving a token count from bytes.
  const injecting = receipts.filter((r) => Array.isArray(r.transformations) && r.transformations.length > 0);
  const beforeBytes = injecting.reduce((s, r) => s + r.before_input_bytes, 0);
  const afterBytes = injecting.reduce((s, r) => s + r.after_input_bytes, 0);
  const injected_bytes = injecting.length
    ? { measured: true, reason: null, receipts: injecting.length, before_input_bytes: beforeBytes, after_input_bytes: afterBytes, added_bytes: afterBytes - beforeBytes }
    : { measured: false, reason: "no_transformed_receipt", receipts: 0, before_input_bytes: null, after_input_bytes: null, added_bytes: null };

  // Injected TOKENS require a receipt measured on BOTH sides. Reuse the shipped tokenDelta so this
  // cannot drift from `kage status` / the audit report; it returns before - after (a saving frame),
  // and the injected cost is the negation. When no receipt is two-sided, this is UNAVAILABLE — the
  // honest state for an audit store where the unsent candidate was never token-counted.
  const td = commands.tokenDelta(receipts);
  const injected_tokens = td.available
    ? { measured: true, reason: null, receipts: td.receipts, before_input_tokens: td.before_input_tokens, after_input_tokens: td.after_input_tokens, added_tokens: td.after_input_tokens - td.before_input_tokens }
    : { measured: false, reason: td.reason, receipts: 0, before_input_tokens: null, after_input_tokens: null, added_tokens: null };

  const by_mode = {};
  for (const r of receipts) {
    const m = (by_mode[r.mode] ??= { receipts: 0, before_input_bytes: 0, after_input_bytes: 0, added_bytes: 0 });
    m.receipts += 1;
    m.before_input_bytes += r.before_input_bytes;
    m.after_input_bytes += r.after_input_bytes;
    m.added_bytes += r.after_input_bytes - r.before_input_bytes;
  }

  return {
    ...base,
    available: true,
    reason: null,
    receipts: receipts.length,
    measurement_coverage: coverage,
    injected_bytes,
    injected_tokens,
    input_cost: commands.costDelta(receipts),
    by_mode,
    savings_status: "estimated_only",
    notes: NOTES,
  };
}

const NOTES = [
  "This is the MEASURED COST of injection — what Kage's memory ADDS to a prompt — read from real transformation receipts in the local vNext store. It is the measured counterpart to the ESTIMATED rediscovery saving shown by `kage gains` and the recall value_receipt.",
  "injected_bytes is measured on every transformed receipt (before/after input bytes are always counted). It is deliberately NOT converted to tokens: a token count is only ever a measured value here, never derived from bytes.",
  "injected_tokens needs a receipt measured on BOTH sides (before AND after input tokens). An audit-mode receipt measures the forwarded original and leaves the unsent memory-injected candidate un-counted, so a pure audit store reports injected_tokens as unavailable — not zero.",
  "input_cost reuses the shipped costDelta: a token total with no billing breakdown cannot be priced, so cost is unavailable rather than a wrong-rate number.",
  "savings_status=estimated_only: this cross-check measures the COST of injection. The REUSE SAVING it is meant to offset (files not re-read, knowledge not re-derived) is still an ESTIMATE — the true end-to-end token delta needs a live A/B agent run and is not claimed here.",
];

function renderCrossCheck(v) {
  const lines = [`Kage reuse-value receipts cross-check — ${v.project_dir}`, ""];
  if (!v.available) {
    lines.push(`  receipts: unavailable (${v.reason}) — no injection was measured, so every cost is null (not zero).`);
    lines.push("");
    lines.push("  The rediscovery SAVING remains an ESTIMATE (kage gains); a live A/B agent run is still needed for a measured token delta.");
    return lines.join("\n");
  }
  if (v.reason === "empty_audit_period") {
    lines.push("  receipts: 0 — the store is readable but nothing was transformed, so every measured cost is null (not zero).");
    return lines.join("\n");
  }
  const b = v.injected_bytes;
  const t = v.injected_tokens;
  lines.push(
    `  receipts:                 ${v.receipts} (measurement: exact ${v.measurement_coverage.exact}, partial ${v.measurement_coverage.partial}, unavailable ${v.measurement_coverage.unavailable})`,
    b.measured
      ? `  injected bytes (MEASURED):  before ${b.before_input_bytes} → after ${b.after_input_bytes}  (added ${b.added_bytes} bytes across ${b.receipts} transformed receipt(s))`
      : `  injected bytes:           unavailable (${b.reason})`,
    t.measured
      ? `  injected tokens (MEASURED): before ${t.before_input_tokens} → after ${t.after_input_tokens}  (added ${t.added_tokens} tokens across ${t.receipts} two-sided receipt(s))`
      : `  injected tokens:          unavailable (${t.reason}) — no receipt was token-measured on both sides, so the injected TOKEN cost is not claimed`,
    v.input_cost.available
      ? `  input cost (MEASURED):    before $${v.input_cost.before_usd.toFixed(6)} → after $${v.input_cost.after_usd.toFixed(6)} (delta $${v.input_cost.delta_usd.toFixed(6)})`
      : `  input cost:               unavailable (${v.input_cost.reason})`,
    "",
  );
  for (const [mode, m] of Object.entries(v.by_mode)) {
    lines.push(`    mode ${mode}:  ${m.receipts} receipt(s), added ${m.added_bytes} bytes (measured)`);
  }
  lines.push(
    "",
    "  savings status: ESTIMATED ONLY — this is the measured COST of injection; the rediscovery",
    "  SAVING it offsets is still an estimate (kage gains). A live A/B agent run is required for a",
    "  measured end-to-end token delta, which is not claimed here.",
  );
  return lines.join("\n");
}

// ===========================================================================================
// helpers
// ===========================================================================================
function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function normalize(text) {
  return String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function errText(error) {
  return String(error && error.message ? error.message : error);
}

function rate(numerator, denominator) {
  return denominator ? round(numerator / denominator, 4) : null;
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// Dispatch last, so every module-level const (NOTES) and function declaration is initialized
// before either mode runs.
if (args.receipts) {
  await runReceiptsCrossCheck();
} else {
  await runReuseEval();
}
