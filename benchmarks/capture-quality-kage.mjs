#!/usr/bin/env node
// Capture Quality — does INGESTION capture the RIGHT things, quarantine junk, and
// refuse garbage, so that only useful, grounded memory ever becomes recall-visible?
//
// This is the mirror image of injection-relevance-kage.mjs. That harness measures
// the EXTRACTION side (does recall/injection attach the right memories?). This one
// measures the INGESTION side: the gate BEFORE recall. A memory that never should
// have been stored can't be fixed by a better ranker — the 2026-07-16 audit found
// three approved junk packets (two ungrounded "Resume:" session artifacts, one raw
// "Tool failed:{…}" command dump) that had leaked into trusted recall historically,
// plus an EMPTY-body packet a kage_learn wrote when the insight arrived under the
// wrong param name (evidence/verifiedBy alone made the body non-empty). Those, and
// the auto-distill quarantine of a raw shell line and a file-changed observation,
// are the golden cases encoded below.
//
// The decision under test is the REAL ingestion surface imported from
// mcp/dist/kernel.js — learn(), capture(), observe(), distillSession() — plus the
// REAL recall() used to prove visibility. Nothing here mirrors kernel logic: if the
// signal gate, the empty-body reject, the citation reject, the ungrounded-utterance
// quarantine, the dedup flag, or the recall exclusion of pending/stale/superseded
// regresses, this eval moves. Recall-visibility is defined exactly as production
// defines it — loadApprovedPackets (the "packets" dir AND status "approved") minus
// the just-in-time staleness gate — so "not recall-visible" here means the same
// thing it means to an agent at session start.
//
// Labeled ingestion classes:
//   - GOOD LEARNINGS   grounded, substantive, cited to a real seeded file; must be
//                      ACCEPTED (ok + approved) AND recall-visible AND well-scored.
//   - EMPTY/DEGENERATE empty body, whitespace-only, title-only (misnamed-param);
//                      learn() must return ok:false and write NO packet file.
//   - UNGROUNDED       a learning citing only a nonexistent path (rejected), and an
//                      ungrounded conversational outburst (quarantined to pending);
//                      neither may become a trusted recall-visible repo fact.
//   - JUNK OBSERVATIONS a raw shell line, a "Tool failed:{json}" dump, a content-free
//                      "thanks, looks good", a generic "file changed" — fed through
//                      observe()/distill() as the hooks do; must NOT be recalled.
//   - DUPLICATES       the same substantive learning captured twice; the second must
//                      be flagged (quality.duplicate_candidates) not silently stored.
//
// HONESTY CONTRACT: this eval MEASURES the current baseline; it records the real
// numbers (imperfect ones included) in a dated BASELINE block and exits 0.
// `--assert-baseline` exits 1 only if a metric regressed BELOW the recorded baseline
// (or any case errored). A case that errors is an ERROR, never a skip — it is
// reported and excluded from rate denominators so it can masquerade as neither pass
// nor fail. false_ingest_rate is the historical-leak metric: JUNK that DID become
// recall-visible; its target is 0.
//
// Deterministic: fixed in-file inputs, fixed case order, no PRNG and no clock in any
// verdict or metric (Date.now feeds only packet ids and duration_ms, neither of
// which a verdict reads). Two runs are byte-identical in metrics and verdicts. No
// network. This is a benchmark: it is NOT part of `npm test`.
//
// Usage:
//   node benchmarks/capture-quality-kage.mjs            # summary JSON + baseline block inside it
//   node benchmarks/capture-quality-kage.mjs --json     # full report (per-case table) on stdout
//   node benchmarks/capture-quality-kage.mjs --out /tmp/r.json
//   node benchmarks/capture-quality-kage.mjs --assert-baseline
//   npm run bench:capture --prefix mcp

import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kernel = await import(pathToFileURL(join(repoRoot, "mcp/dist/kernel.js")).href);

const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// Recorded baseline (2026-07-16). These are the MEASURED numbers of the current
// ingestion path on this harness's dataset — recorded, not aspired to.
// --assert-baseline fails only when a metric gets WORSE than this.
// ---------------------------------------------------------------------------
const RECORDED_BASELINE = {
  date: "2026-07-16",
  junk_quarantine_rate: 1.0,
  false_ingest_rate: 0.0,
  good_acceptance_rate: 1.0,
  empty_rejection_rate: 1.0,
  ungrounded_containment_rate: 1.0,
  // 0.5, measured — NOT aspirational. An exact re-capture of a learning is flagged
  // (Jaccard 0.9 vs the original), but a moderate PARAPHRASE of the same learning
  // falls below the kernel's 0.58 duplicate-candidate threshold and is silently
  // stored as a redundant packet. This is a real, honest weakness this eval exists
  // to surface — recorded as the baseline, not hidden and not failed on. A stronger
  // near-duplicate matcher would move this to 1.0 without moving anything else.
  dedup_rate: 0.5,
  errors: 0,
};
// higher_is_better: regression when current < recorded. lower_is_better (rates that
// count leaks/noise/errors): regression when current > recorded.
const BASELINE_DIRECTIONS = {
  junk_quarantine_rate: "higher",
  false_ingest_rate: "lower",
  good_acceptance_rate: "higher",
  empty_rejection_rate: "higher",
  ungrounded_containment_rate: "higher",
  dedup_rate: "higher",
  errors: "lower",
};

// ---------------------------------------------------------------------------
// Seeded project. Real source files so GOOD learnings and DUP bases ground to
// paths that actually exist (memoryPathFingerprints hashes them; recall's
// staleness gate keeps them visible only while the files are unchanged, which
// they are for the life of the run). Everything is a fixed literal — no PRNG.
// ---------------------------------------------------------------------------
const SEED_FILES = {
  "src/payments/process-payment.ts":
    "// processPayment charges a customer through the ledger.\nexport function processPayment() { /* ... */ }\n",
  "src/ledger/idempotency.ts":
    "// The ledger dedupes on (account_id, idempotency_key).\nexport function insertLedgerRow() { /* ... */ }\n",
  "src/gateway/websocket-heartbeat.ts":
    "// Websocket gateway ping/pong heartbeat.\nexport function heartbeat() { /* ... */ }\n",
  "src/cli/confirm.ts":
    "// Destructive CLI command confirmation.\nexport function confirm() { /* ... */ }\n",
  "src/sync/checkpoint.ts":
    "// Sync engine cursor checkpointing.\nexport function checkpointCursor() { /* ... */ }\n",
  "docs/testing.md":
    "# Testing\n\nRun the package test suite from the mcp directory.\n",
};

// ---------------------------------------------------------------------------
// Labeled inputs. `run` returns a normalized row. Everything a verdict reads is
// a fixed function of the input and the real ingestion result — no clock, no PRNG.
// ---------------------------------------------------------------------------

// GOOD: grounded, substantive, cited to a real seeded file, across four types.
// Driven through learn() with strictCitations:true — the exact contract the CLI
// (`kage learn`) and the MCP `kage_learn` tool use (both set strictCitations:true).
const GOOD_LEARNINGS = [
  {
    id: "good-payments-idempotency",
    type: "decision",
    learning:
      "processPayment must pass the ledger idempotency key so a retried charge reuses the original key and the ledger inserts exactly one row per logical payment. Minting a fresh key inside the retry loop is how double charges shipped before.",
    evidence: "src/ledger/idempotency.ts unique constraint on (account_id, idempotency_key)",
    paths: ["src/payments/process-payment.ts", "src/ledger/idempotency.ts"],
    query: "how do retried payment charges dedupe to one row on the ledger",
  },
  {
    id: "good-test-runbook",
    type: "runbook",
    learning:
      "Run the package test suite with npm test from the mcp directory. It builds TypeScript first, then runs node --test over dist and the dogfood replay suite. macOS has no timeout command, so do not wrap the suite in one.",
    evidence: "verified by running npm test --prefix mcp",
    paths: ["docs/testing.md"],
    query: "how do I run the package test suite for this repo",
  },
  {
    id: "good-ws-heartbeat",
    type: "gotcha",
    learning:
      "The websocket gateway drops connections when the load balancer idle timeout is below the 35 second ping interval. The failure looks like random client disconnects; the root cause is the balancer closing an idle socket before the next ping. Keep the idle timeout above 35 seconds.",
    evidence: "reproduced by lowering the balancer idle timeout under load",
    paths: ["src/gateway/websocket-heartbeat.ts"],
    query: "why does the websocket gateway randomly drop connections",
  },
  {
    id: "good-yes-flag-convention",
    type: "convention",
    learning:
      "Destructive CLI commands must default the --yes flag to off and prompt for confirmation, so automation opts in explicitly. We decided the extra keystroke is cheaper than one deleted store.",
    evidence: "src/cli/confirm.ts",
    paths: ["src/cli/confirm.ts"],
    query: "should the yes flag default to off for destructive CLI commands",
  },
];

// DUPLICATES: a substantive base learning, then a re-capture that says the same
// thing. Distinct titles keep the ids distinct (same-millisecond Date.now suffixes
// would otherwise collide and overwrite), so the second capture's quality eval can
// actually see the first on disk. Detection = quality.duplicate_candidates non-empty.
const DUP_BASE = {
  title: "Sync engine checkpoints the cursor before every batch flush",
  body:
    "The sync engine must checkpoint its cursor before every batch flush, so a mid-flush crash resumes from the last checkpoint without double-processing rows. Flushing before checkpointing is how duplicate rows shipped.",
  type: "convention",
  paths: ["src/sync/checkpoint.ts"],
};
const DUP_VARIANTS = [
  {
    id: "dup-exact",
    title: "Sync engine must checkpoint the cursor prior to each batch flush",
    // Same body text as the base: the same learning, captured twice.
    body: DUP_BASE.body,
    type: "convention",
    paths: ["src/sync/checkpoint.ts"],
  },
  {
    id: "dup-paraphrase",
    title: "Checkpoint the sync cursor ahead of batch flush to stay crash-safe",
    body:
      "The sync engine must checkpoint its cursor before every batch flush so a crash during the flush resumes from the last checkpoint without reprocessing rows. Flushing before the checkpoint is what caused duplicate rows.",
    type: "convention",
    paths: ["src/sync/checkpoint.ts"],
  },
];

// EMPTY/DEGENERATE: learn() must refuse each and write NO packet file.
const EMPTY_INPUTS = [
  { id: "empty-body", learning: "", title: undefined, evidence: undefined },
  { id: "whitespace-only", learning: "   \n\t  ", title: undefined, evidence: undefined },
  // Golden 2026-07-16 regression: the insight arrived under the wrong param name, so
  // `learning` is empty but title + evidence make the composed body non-empty. The
  // guard must reject on empty `learning`, not be fooled by provenance-only content.
  {
    id: "misnamed-param",
    learning: "",
    title: "processPayment idempotency invariant",
    evidence: "src/payments/process-payment.ts",
  },
];

// UNGROUNDED: rejected OR quarantined — never a trusted recall-visible repo fact.
const UNGROUNDED_NONEXISTENT_PATH = {
  id: "ungrounded-nonexistent-path",
  learning:
    "The ghost module caches tenant tokens in memory and must be flushed on logout to avoid cross-tenant reuse.",
  paths: ["src/nonexistent/ghost-module.ts"],
};
const UNGROUNDED_CONVERSATIONAL = {
  id: "ungrounded-conversational",
  // A frustrated outburst at the assistant with no cited paths — the shape the
  // capture guard routes to pending (not auto-approved) and recall withholds.
  title: "why are you asking me, just fix the tests",
  body:
    "why are you asking me??? it's your job, don't stop before you finish the PR and stop asking me what to do next",
  type: "gotcha",
};

// JUNK OBSERVATIONS: fed through observe()/distill(auto) as the Stop hook does.
// Each uses its own session id so distill scores it in isolation.
const JUNK_OBSERVATIONS = [
  {
    id: "junk-raw-shell",
    session: "junk-shell",
    event: {
      type: "command_result",
      command: "grep -rn \"TODO\" . | head -50 && ls -la /tmp/scratch",
      exit_code: 0,
    },
    // Tokens that WOULD surface this if it had leaked into approved memory.
    query: "grep TODO head scratch ls",
    signature: "grep -rn",
  },
  {
    id: "junk-tool-failed-dump",
    session: "junk-tool-failed",
    event: {
      type: "command_result",
      command: "kage learn",
      text: 'Tool failed: {"interrupted":false,"isImage":false,"noOutputExpected":false,"stderr":"exit status 1","stdout":""}',
      exit_code: 1,
    },
    query: "tool failed interrupted isImage noOutputExpected stderr exit status",
    signature: "Tool failed:",
  },
  {
    id: "junk-content-free-thanks",
    session: "junk-thanks",
    event: { type: "user_prompt", text: "thanks, looks good" },
    query: "thanks looks good",
    signature: "thanks, looks good",
  },
  {
    id: "junk-file-changed",
    session: "junk-file-changed",
    event: {
      type: "file_change",
      path: "src/payments/process-payment.ts",
      summary: "Changed file: src/payments/process-payment.ts",
    },
    query: "changed file process-payment edited updated",
    signature: "Changed file:",
  },
];

// ---------------------------------------------------------------------------
// Store seeding.
// ---------------------------------------------------------------------------
function buildProject() {
  const dir = mkdtempSync(join(tmpdir(), "kage-capture-"));
  kernel.initProject(dir, { policy: false });
  for (const [rel, content] of Object.entries(SEED_FILES)) {
    const filePath = join(dir, rel);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf8");
  }
  return dir;
}

function countPacketFiles(dir) {
  const count = (sub) => {
    try {
      return readdirSync(join(dir, ".agent_memory", sub)).filter((f) => f.endsWith(".md")).length;
    } catch {
      return 0;
    }
  };
  // Both the approved store and the pending inbox — a "no packet written" check
  // must catch a leak into either.
  return count("packets") + count("pending");
}

// Recall-visibility, defined exactly as production defines it. A packet is
// recall-visible iff recall() returns it (recall loads only approved packets and
// applies the staleness gate). packetInRecall matches by id (for tracked packets);
// signatureInRecall matches by content (for junk that produced no tracked id).
function packetInRecall(dir, query, packetId) {
  const result = kernel.recall(dir, query, 10, false, { trackAccess: false });
  return result.results.some((r) => r.packet.id === packetId);
}
function signatureRecallVisible(dir, query, signature) {
  const needle = signature.toLowerCase();
  const viaRecall = kernel
    .recall(dir, query, 10, false, { trackAccess: false })
    .results.some((r) => `${r.packet.title}\n${r.packet.body}`.toLowerCase().includes(needle));
  // Defense in depth: a weak query must not let a leak hide. If the signature is on
  // ANY approved packet on disk, it is recall-visible in principle — count it.
  const viaDisk = kernel
    .loadApprovedPackets(dir)
    .some((p) => `${p.title}\n${p.body}`.toLowerCase().includes(needle));
  return viaRecall || viaDisk;
}

// ---------------------------------------------------------------------------
// Per-class runners. Each returns a normalized row; any throw is captured as an
// error (never a skip). Ingestion (Phase 1) is recorded first for every case, then
// the store is refreshed once, then recall-visibility (Phase 2) is resolved.
// ---------------------------------------------------------------------------
function newRow(id, cls, input) {
  return {
    id,
    class: cls,
    input,
    accepted: null,
    recall_visible: null,
    no_file_written: null,
    dedup_detected: null,
    quality_score: null,
    verdict: "",
    detail: null,
    error: null,
  };
}

function ingestGood(dir, spec) {
  const row = newRow(spec.id, "good", clip(spec.learning));
  try {
    const before = countPacketFiles(dir);
    const result = kernel.learn({
      projectDir: dir,
      learning: spec.learning,
      type: spec.type,
      evidence: spec.evidence,
      paths: spec.paths,
      strictCitations: true,
    });
    row.accepted = Boolean(result.ok) && result.packet?.status === "approved";
    row.quality_score = result.ok ? result.packet?.quality?.score ?? null : null;
    row.detail = { ok: result.ok, status: result.packet?.status ?? null, errors: result.errors ?? [] };
    row._packetId = result.packet?.id ?? null;
    row._query = spec.query;
    row._fileDelta = countPacketFiles(dir) - before;
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

function ingestDup(dir, spec) {
  const row = newRow(spec.id, "duplicate", clip(spec.title));
  try {
    const result = kernel.capture({
      projectDir: dir,
      title: spec.title,
      body: spec.body,
      type: spec.type,
      paths: spec.paths,
      strictCitations: true,
    });
    if (!result.ok) {
      row.detail = { ok: false, errors: result.errors ?? [] };
      row.dedup_detected = false;
      return row;
    }
    const dupes = result.packet?.quality?.duplicate_candidates ?? [];
    row.dedup_detected = dupes.length > 0;
    row.accepted = result.packet?.status === "approved";
    // Report the deterministic signal only — matched_count and the top Jaccard
    // score. The candidate packet ids embed the random temp-dir key (repoKey), so
    // reporting them would break byte-reproducibility of the report.
    row.detail = {
      matched_count: dupes.length,
      top_score: dupes.length ? dupes[0].score : null,
    };
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

function ingestEmpty(dir, spec) {
  const row = newRow(spec.id, "empty", clip(spec.title ? `title="${spec.title}" learning=""` : JSON.stringify(spec.learning)));
  try {
    const before = countPacketFiles(dir);
    const result = kernel.learn({
      projectDir: dir,
      learning: spec.learning,
      title: spec.title,
      evidence: spec.evidence,
      strictCitations: true,
    });
    const delta = countPacketFiles(dir) - before;
    row.accepted = Boolean(result.ok);
    row.no_file_written = delta === 0;
    row.detail = { ok: result.ok, file_delta: delta, errors: result.errors ?? [] };
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

function ingestUngroundedNonexistent(dir, spec) {
  const row = newRow(spec.id, "ungrounded", clip(`${spec.learning} [paths: ${spec.paths.join(", ")}]`));
  try {
    const before = countPacketFiles(dir);
    const result = kernel.learn({
      projectDir: dir,
      learning: spec.learning,
      paths: spec.paths,
      strictCitations: true,
      allowMissingPaths: false,
    });
    row.detail = {
      ok: result.ok,
      status: result.packet?.status ?? null,
      file_delta: countPacketFiles(dir) - before,
      errors: result.errors ?? [],
    };
    // A trusted recall-visible fact would be ok + approved. Rejected (ok:false) or
    // pending both contain it.
    row._packetId = result.ok ? result.packet?.id ?? null : null;
    row.accepted = Boolean(result.ok) && result.packet?.status === "approved";
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

function ingestUngroundedConversational(dir, spec) {
  const row = newRow(spec.id, "ungrounded", clip(spec.body));
  try {
    // capture() with no paths, the way the observation/distill pipeline calls it
    // (no strictCitations) — the ungrounded-utterance guard is the thing under test.
    const result = kernel.capture({
      projectDir: dir,
      title: spec.title,
      body: spec.body,
      type: spec.type,
      paths: [],
    });
    row.detail = { ok: result.ok, status: result.packet?.status ?? null, errors: result.errors ?? [] };
    row._packetId = result.ok ? result.packet?.id ?? null : null;
    row.accepted = Boolean(result.ok) && result.packet?.status === "approved";
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

function ingestJunk(dir, spec) {
  const row = newRow(spec.id, "junk", clip(spec.event.command ?? spec.event.text ?? spec.event.summary ?? ""));
  try {
    const observed = kernel.observe(dir, { ...spec.event, session_id: spec.session });
    const distilled = kernel.distillSession(dir, spec.session, { auto: true });
    const candidates = (distilled.candidates ?? []).map((c) => ({
      ok: c.ok,
      status: c.packet?.status ?? null,
    }));
    row.detail = {
      observation_stored: observed.stored,
      observation_low_signal: observed.record?.low_signal === true,
      skipped_low_signal: distilled.skipped_low_signal ?? 0,
      distill_candidates: candidates,
      // An approved candidate is the leak shape; record it explicitly.
      approved_candidates: candidates.filter((c) => c.status === "approved").length,
    };
    row._query = spec.query;
    row._signature = spec.signature;
  } catch (error) {
    row.error = errText(error);
  }
  return row;
}

// ---------------------------------------------------------------------------
// Run. Fixed order. Ingest everything (Phase 1), refresh once, resolve
// recall-visibility and verdicts (Phase 2).
// ---------------------------------------------------------------------------
const startedAt = Date.now();
console.error("seeding project...");
const dir = buildProject();

const rows = [];
// GOOD first so the store has real approved memory the DUP bases and recall can see.
for (const spec of GOOD_LEARNINGS) rows.push(ingestGood(dir, spec));
// DUP: capture the base once (untracked — its own outcome is not a labeled case),
// then each variant which must be flagged against it.
kernel.capture({ projectDir: dir, title: DUP_BASE.title, body: DUP_BASE.body, type: DUP_BASE.type, paths: DUP_BASE.paths, strictCitations: true });
for (const spec of DUP_VARIANTS) rows.push(ingestDup(dir, spec));
for (const spec of EMPTY_INPUTS) rows.push(ingestEmpty(dir, spec));
rows.push(ingestUngroundedNonexistent(dir, UNGROUNDED_NONEXISTENT_PATH));
rows.push(ingestUngroundedConversational(dir, UNGROUNDED_CONVERSATIONAL));
for (const spec of JUNK_OBSERVATIONS) rows.push(ingestJunk(dir, spec));
console.error(`ingested ${rows.length} labeled cases`);

// Refresh once so recall runs against a current index, exactly as a session would.
kernel.refreshProject(dir, { force: true });

// Phase 2: recall-visibility + verdicts.
for (const row of rows) {
  if (row.error) {
    row.verdict = "error";
    continue;
  }
  try {
    if (row.class === "good") {
      row.recall_visible = row._packetId ? packetInRecall(dir, row._query, row._packetId) : false;
      row.verdict = row.accepted && row.recall_visible
        ? "accepted-visible"
        : row.accepted
          ? "accepted-invisible"
          : "rejected";
    } else if (row.class === "junk") {
      row.recall_visible = signatureRecallVisible(dir, row._query, row._signature);
      row.verdict = row.recall_visible ? "false-ingest" : "quarantined";
    } else if (row.class === "ungrounded") {
      // Trusted-visible = an approved packet recall returns. Pending/rejected are contained.
      row.recall_visible = row._packetId ? packetInRecall(dir, row.input, row._packetId) : false;
      row.verdict = row.accepted && row.recall_visible
        ? "leaked-approved-visible"
        : row.detail?.status === "pending"
          ? "contained-quarantined"
          : "contained-rejected";
    } else if (row.class === "empty") {
      row.verdict = !row.accepted && row.no_file_written ? "rejected-clean" : "leaked";
    } else if (row.class === "duplicate") {
      row.verdict = row.dedup_detected ? "dedup-detected" : "dedup-missed";
    }
  } catch (error) {
    row.error = errText(error);
    row.verdict = "error";
  }
}

// Strip internal helper fields before reporting.
for (const row of rows) {
  delete row._packetId;
  delete row._query;
  delete row._signature;
  delete row._fileDelta;
}

// ---------------------------------------------------------------------------
// Metrics. Errored cases are counted, reported, and excluded from denominators.
// ---------------------------------------------------------------------------
const ok = rows.filter((r) => !r.error);
const errors = rows.filter((r) => r.error);
const inClass = (cls) => ok.filter((r) => r.class === cls);

const good = inClass("good");
const junk = inClass("junk");
const empty = inClass("empty");
const ungrounded = inClass("ungrounded");
const dup = inClass("duplicate");

const metrics = {
  junk_quarantine_rate: rate(junk.filter((r) => r.recall_visible === false).length, junk.length),
  false_ingest_rate: rate(junk.filter((r) => r.recall_visible === true).length, junk.length),
  good_acceptance_rate: rate(good.filter((r) => r.accepted && r.recall_visible).length, good.length),
  empty_rejection_rate: rate(empty.filter((r) => r.no_file_written && !r.accepted).length, empty.length),
  ungrounded_containment_rate: rate(
    ungrounded.filter((r) => !(r.accepted && r.recall_visible)).length,
    ungrounded.length,
  ),
  dedup_rate: rate(dup.filter((r) => r.dedup_detected).length, dup.length),
  cases_total: rows.length,
  cases_errored: errors.length,
};

// Score bands: the honesty ledger behind the rates. Good learnings should score
// well; junk should be gated (skipped_low_signal) with zero approved candidates.
const goodScores = good.map((r) => r.quality_score).filter((s) => typeof s === "number");
const score_bands = {
  good_min_quality_score: goodScores.length ? Math.min(...goodScores) : null,
  good_mean_quality_score: goodScores.length ? round(goodScores.reduce((a, b) => a + b, 0) / goodScores.length, 2) : null,
  junk_skipped_low_signal_total: junk.reduce((sum, r) => sum + (r.detail?.skipped_low_signal ?? 0), 0),
  junk_approved_candidates_total: junk.reduce((sum, r) => sum + (r.detail?.approved_candidates ?? 0), 0),
  dedup_matches: dup.map((r) => ({ id: r.id, detected: r.dedup_detected, top_score: r.detail?.top_score ?? null })),
  note:
    "Recall-visibility is loadApprovedPackets (packets dir AND status approved) minus the staleness gate — the same set an agent sees at session start. junk_approved_candidates_total > 0 would mean the signal gate let an observation reach trusted memory (the historical leak). dedup catches an exact re-capture (top_score ~0.9) but misses a moderate paraphrase (top_score null) — it falls below the kernel's 0.58 Jaccard duplicate threshold.",
};

// ---------------------------------------------------------------------------
// Baseline comparison. Regression = worse than recorded (direction-aware).
// ---------------------------------------------------------------------------
const current = {
  junk_quarantine_rate: metrics.junk_quarantine_rate,
  false_ingest_rate: metrics.false_ingest_rate,
  good_acceptance_rate: metrics.good_acceptance_rate,
  empty_rejection_rate: metrics.empty_rejection_rate,
  ungrounded_containment_rate: metrics.ungrounded_containment_rate,
  dedup_rate: metrics.dedup_rate,
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
  benchmark: "Capture Quality (ingestion gate: learn / capture / observe / distill)",
  decision_under_test:
    "mcp/kernel.ts learn(), capture(), observe(), distillSession() + recall() — imported from mcp/dist/kernel.js, not mirrored. Recall-visibility = loadApprovedPackets minus the staleness gate.",
  dataset: {
    good: GOOD_LEARNINGS.length,
    duplicate: DUP_VARIANTS.length,
    empty: EMPTY_INPUTS.length,
    ungrounded: 2,
    junk: JUNK_OBSERVATIONS.length,
    seeded_files: Object.keys(SEED_FILES).length,
  },
  metrics,
  score_bands,
  baseline: {
    recorded: RECORDED_BASELINE,
    current,
    regressions,
    asserted: Boolean(args["assert-baseline"]),
  },
  duration_ms: Date.now() - startedAt,
  workdir: args.keep ? dir : null,
  cases: rows,
};

if (args.out) {
  writeFileSync(String(args.out), JSON.stringify(report, null, 2));
  console.error(`full report written to ${args.out}`);
}
if (!args.keep) {
  rmSync(dir, { recursive: true, force: true });
} else {
  console.error(`kept store: ${dir}`);
}

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const { cases: _cases, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
}

// Human-readable per-case table + baseline block on stderr (stdout stays parseable JSON).
console.error("\nPER-CASE");
console.error(`  ${"id".padEnd(30)} ${"class".padEnd(11)} ${"accept".padEnd(7)} ${"visible".padEnd(8)} verdict`);
for (const row of rows) {
  console.error(
    `  ${String(row.id).padEnd(30)} ${String(row.class).padEnd(11)} ${String(row.accepted ?? "-").padEnd(7)} ${String(row.recall_visible ?? "-").padEnd(8)} ${row.verdict}`,
  );
}

console.error(`\nBASELINE ${RECORDED_BASELINE.date} (recorded in-file; the current ingestion path — measured, not aspired to)`);
for (const [key, direction] of Object.entries(BASELINE_DIRECTIONS)) {
  const flag = regressions.some((r) => r.metric === key) ? "REGRESSED" : "ok";
  console.error(
    `  ${key.padEnd(30)} current ${String(current[key]).padEnd(8)} recorded ${String(RECORDED_BASELINE[key]).padEnd(8)} (${direction} is better)  ${flag}`,
  );
}

if (errors.length) {
  console.error(`\n${errors.length} case(s) ERRORED (reported in the JSON, never skipped):`);
  for (const c of errors) console.error(`  ${c.id}: ${c.error}`);
}

if (args["assert-baseline"] && (regressions.length || errors.length)) {
  console.error(`\n--assert-baseline FAILED: ${regressions.length} regression(s), ${errors.length} error(s).`);
  process.exit(1);
}
process.exit(0);

// ---------------------------------------------------------------------------
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

function clip(text, max = 90) {
  const oneLine = String(text ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
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
