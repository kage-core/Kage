#!/usr/bin/env node
// Injection Relevance — does automatic injection attach the RIGHT memories, and
// only when the prompt deserves them?
//
// HISTORY: composeInjection originally injected whatever recall returned with
// NO relevance gate. Measured 2026-07-16 on the real 325-packet store, the
// content-free prompt "Reply with the single word: pong" injected 4 lexical
// accidents, while a genuine small-store direct match scored BELOW the big
// store's junk band — recall scores are match-strength sums, not normalized
// relevance, so an absolute score floor is impossible (see the superseded
// negative_result packet "recall-scores-are-not-corpus-normalized-...").
//
// THE FIX (2026-07-21, W3): recall now computes a corpus-normalized injection
// decision from its own full candidate distribution (RecallResult.injection):
// the top hit must (a) match >= 2 DISTINCT meaningful query terms — a one-token
// lexical accident like "pong" spiking a websocket runbook is not evidence —
// and (b) SPIKE above this corpus's own score band (z-score + runner-up lead;
// gap/anchor rules on tiny corpora where no distribution exists). Production
// composeInjection gates on that decision and then dominance-trims co-attached
// packets to those scoring >= 0.5×top. "Inject nothing" is a first-class
// outcome; the numbers below are the measured result of that decision.
//
// This harness encodes that finding as a repeatable eval:
//   - SMALL store (3 packets) and LARGE store (150 packets), both seeded
//     deterministically at runtime through the kernel's own capture().
//   - Labeled queries in three classes: CONTENT-FREE (should inject nothing),
//     REAL-RELEVANT (should inject, top hit must be the labeled packet), and
//     REAL-BUT-ABSENT (genuine question, topic has no packet — injection is noise).
//   - The decision under test is the REAL composeInjection imported from
//     mcp/dist/proxy.js, driven through a fake recording gateway, so the eval
//     cannot drift from production. A diagnostic recall(projectDir, query, 4,
//     false, { trackAccess: false }) — the byte-identical ranking call — runs
//     first (it does not mutate the store) to attach packet identities and
//     scores; any disagreement with the production decision is reported as a
//     per-case ERROR (drift detection), never skipped.
//
// HONESTY CONTRACT: this eval MEASURES the shipped decision; the recorded
// baseline is what the current code actually does, not an aspiration. It prints
// metrics plus a dated BASELINE block and exits 0. `--assert-baseline` exits 1
// only if a metric regressed below the recorded baseline (or any case errored).
// This harness WAS the acceptance gate for the corpus-normalized relevance
// task, and the fix passed it: false_injection 0.6667→0, absent 0.875→0,
// precision 0.1538→0.6364, with small_store_recall and expected_top_hit_rate
// held at 1.0. It now guards that result against regression.
//
// Deterministic: fixed in-file corpus, fixed case order (access-tracking side
// effects of the production call are order-dependent and production-authentic),
// no network, no Date.now-dependent verdicts.
//
// Usage:
//   node benchmarks/injection-relevance-kage.mjs             # summary JSON + baseline check inside it
//   node benchmarks/injection-relevance-kage.mjs --json      # full report (per-case table) on stdout
//   node benchmarks/injection-relevance-kage.mjs --out /tmp/r.json
//   node benchmarks/injection-relevance-kage.mjs --assert-baseline
//   npm run bench:injection --prefix mcp

import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kernel = await import(pathToFileURL(join(repoRoot, "mcp/dist/kernel.js")).href);
const proxy = await import(pathToFileURL(join(repoRoot, "mcp/dist/proxy.js")).href);

const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// Recorded baseline. These are the MEASURED numbers of the current GATED
// composeInjection on this harness's corpus — recorded, not aspired to.
// --assert-baseline fails only when a metric gets WORSE than this. The
// corpus-normalized relevance kernel task should improve precision and the
// false-injection rates while holding small_store_recall and
// expected_top_hit_rate at 1.0.
// ---------------------------------------------------------------------------
const RECORDED_BASELINE = {
  // 2026-07-21: the corpus-normalized injection gate + dominance trim landed (W3). Every
  // content-free and absent-topic case now injects NOTHING on both stores while the genuine
  // small-store direct match and every real question still inject with the labeled top hit.
  // (The 2026-07-16 ungated numbers this replaced: precision 0.1538, false 0.6667/0.3333/1.0,
  // absent 0.875 — kept here as history so the improvement stays legible.)
  date: "2026-07-21",
  injection_precision: 0.6364,
  false_injection_rate_overall: 0,
  false_injection_rate_small: 0,
  false_injection_rate_large: 0,
  small_store_recall: 1.0,
  expected_top_hit_rate: 1.0,
  absent_injection_rate_overall: 0,
  errors: 0,
};
// higher_is_better: regression when current < recorded. Otherwise regression
// when current > recorded (rates that count noise).
const BASELINE_DIRECTIONS = {
  injection_precision: "higher",
  false_injection_rate_overall: "lower",
  false_injection_rate_small: "lower",
  false_injection_rate_large: "lower",
  small_store_recall: "higher",
  expected_top_hit_rate: "higher",
  absent_injection_rate_overall: "lower",
  errors: "lower",
};

// ---------------------------------------------------------------------------
// Corpus. Everything is a fixed literal or a deterministic function of the
// packet index — no PRNG, no clock in the content.
// ---------------------------------------------------------------------------

// The three topical packets, present in BOTH stores. Realistic phrasing, not
// query-verbatim: the small-store direct match is the case an absolute
// injection floor kills, so it must look like real repo memory, not bait.
const TOPICAL_PACKETS = [
  {
    key: "payments-idempotency",
    type: "decision",
    title: "Ledger idempotency key dedupes charge retries",
    body: "A retried charge reuses the original idempotency key, so the ledger inserts exactly one row per logical payment. The dedupe happens at insert time via a unique constraint on (account_id, idempotency_key). Never mint a fresh key inside the retry loop — that is how double charges shipped in the past.",
    tags: ["payments", "ledger", "idempotency"],
    path: "src/payments/ledger-idempotency.ts",
  },
  {
    key: "test-runbook",
    type: "runbook",
    title: "Run the package test suite with npm test from the mcp directory",
    body: "npm test builds TypeScript first, then runs node --test over dist and the dogfood replay suite. From the repo root use npm test --prefix mcp. macOS has no timeout command, so do not wrap the suite in one.",
    tags: ["tests", "runbook", "ci"],
    path: "docs/testing.md",
  },
  {
    key: "deploy-gotcha",
    type: "gotcha",
    title: "Staging deploys fail when the artifact bucket region mismatches the cluster",
    body: "Deploys to staging fail with a 301 from the artifact store when the bucket region differs from the cluster region. Both must be us-east-1. The error surfaces as a generic upload timeout, which is why this keeps getting rediscovered.",
    tags: ["deploy", "staging", "gotcha"],
    path: "deploy/staging.yaml",
  },
];

// Hand-written collision-prone packets (LARGE store only). These mirror the
// real store's measured lexical accidents — "single source of truth" matched
// the prompt "single word" — by carrying common conversational tokens (single,
// word, reply, pong, good, looks, continue, fix, hello, thanks, yes) inside
// legitimate engineering memory.
const COLLISION_PACKETS = [
  { key: "single-source", type: "decision", title: "Adopt a single source of truth for pricing configuration", body: "Pricing configuration is defined once in pricing/config.yaml and everything else derives from it. Duplicated price tables in the billing service and the admin console drifted apart twice; a single source of truth ended that class of bug.", tags: ["pricing", "config", "decision"], path: "pricing/config.yaml" },
  { key: "reserved-word", type: "gotcha", title: "Reserved word collisions break the schema migrator", body: "Column names that are SQL reserved words (order, group, user) break the schema migrator's generated DDL. Quote every identifier in migration templates; the word list lives in migrator/reserved.ts.", tags: ["schema", "migrations", "gotcha"], path: "migrator/reserved.ts" },
  { key: "reply-queue", type: "convention", title: "Reply queue consumers must ack before processing", body: "Consumers on the reply queue ack the message first and rely on idempotent handlers, because a crash mid-processing must not wedge the reply channel for every later caller.", tags: ["queue", "messaging", "convention"], path: "src/messaging/reply-queue.ts" },
  { key: "ping-pong", type: "runbook", title: "Ping pong heartbeat keeps the websocket gateway alive", body: "The websocket gateway sends a ping every 25 seconds and expects a pong within 10. To debug dropped connections: enable KAGE_WS_TRACE=1, watch for missed pong frames, and check the load balancer idle timeout is above 35 seconds.", tags: ["websocket", "gateway", "runbook"], path: "src/gateway/heartbeat.ts" },
  { key: "known-good", type: "runbook", title: "Known good build pinning for the release train", body: "The release train only promotes a build marked known good by the soak job. To pin one manually: tag the build id in releases/pins.json and rerun the promote step. Never edit the tag on a running train.", tags: ["release", "build", "runbook"], path: "releases/pins.json" },
  { key: "looks-like-dns", type: "gotcha", title: "Looks like a timeout but is really DNS negative caching", body: "Requests that fail fast after a deploy look like connection timeouts but are DNS negative cache entries from the old service name. Flush the resolver or wait out the 60 second TTL before digging into the network path.", tags: ["dns", "networking", "gotcha"], path: "docs/dns-negative-cache.md" },
  { key: "continue-on-error", type: "convention", title: "Continue-on-error must stay disabled in CI pipelines", body: "No CI job may set continue-on-error. A red step that lets the pipeline continue hides real breakage behind a green check; the one exception ever granted was reverted after it masked a packaging failure.", tags: ["ci", "pipelines", "convention"], path: ".github/workflows/ci.yml" },
  { key: "fix-forward", type: "convention", title: "Fix forward instead of rollback for hotfix deployments", body: "Production incidents are fixed forward: ship the minimal fix through the hotfix lane rather than rolling back, because rollbacks resurrect old schema expectations. The fix must land on main within one day.", tags: ["deploy", "incident", "convention"], path: "docs/fix-forward.md" },
  { key: "hello-world-smoke", type: "runbook", title: "Hello world smoke test guards the packaging step", body: "The packaging step runs a hello world smoke test against the built artifact: install it into a clean prefix, run the binary with --version, and fail the build if the greeting output or exit code differs.", tags: ["packaging", "smoke-test", "runbook"], path: "scripts/smoke.sh" },
  { key: "thanks-page", type: "gotcha", title: "Thanks page redirect loses UTM parameters on checkout", body: "The post-checkout thanks page redirect drops UTM parameters because the payment provider strips the query string. Attribution must be stashed in the session before redirecting out, not read back from the URL.", tags: ["checkout", "analytics", "gotcha"], path: "src/checkout/thanks-redirect.ts" },
  { key: "yes-flag", type: "decision", title: "Yes flag defaults to no for destructive CLI commands", body: "Destructive CLI commands prompt for confirmation and the --yes flag defaults to off. Automation that wants to skip the prompt must opt in explicitly; we decided the extra keystroke is cheaper than one deleted store.", tags: ["cli", "safety", "decision"], path: "src/cli/confirm.ts" },
  { key: "single-writer", type: "convention", title: "Single writer rule for the migrations directory", body: "Only one open PR may touch the migrations directory at a time — the single writer rule. Two parallel migration PRs renumber each other and the merge produces a skipped version.", tags: ["migrations", "process", "convention"], path: "migrations/README.md" },
];

// Template-synthesized packets (LARGE store only): 135 across the four types,
// assembled with deterministic index arithmetic over fixed word lists. Volume
// with varied vocabulary is what gives lexical accidents room to occur.
const SUBJECTS = [
  "cache", "queue", "worker pool", "scheduler", "search index", "shard router",
  "replica set", "snapshot store", "backfill job", "cursor pager", "event stream",
  "checkpoint file", "quota counter", "throttle gate", "webhook relay", "token vault",
  "session store", "trace sampler", "memory allocator", "config parser", "route resolver",
  "query planner", "log compactor", "artifact uploader", "metrics exporter", "csv importer",
  "email notifier", "rate limiter", "feature flag store", "audit trail",
];
const AREAS = [
  "billing service", "auth service", "sync engine", "ingest pipeline", "admin console",
  "mobile client", "api gateway", "search service", "notification hub", "report builder",
];
const CONDITIONS = [
  "the replica lags behind the primary", "the region header is missing",
  "clock skew exceeds thirty seconds", "the payload crosses the size cap",
  "two writers race on the same key", "the pool is exhausted under load",
  "a partial write is retried", "the schema version is behind",
  "the disk fills past ninety percent", "tls certificates rotate mid request",
];
const SYNTH_TYPES = ["decision", "gotcha", "runbook", "convention"];
const SYNTH_COUNT = 135;

function synthPacket(i) {
  const type = SYNTH_TYPES[i % 4];
  const s = SUBJECTS[i % SUBJECTS.length];
  const a = AREAS[(i + Math.floor(i / SUBJECTS.length)) % AREAS.length];
  const cond = CONDITIONS[(i + Math.floor(i / SUBJECTS.length)) % CONDITIONS.length];
  const alt = SUBJECTS[(i + 7) % SUBJECTS.length];
  if (type === "decision") {
    return {
      key: `synth-${i}`, type,
      title: `Keep the ${s} inside the ${a}`,
      body: `We decided the ${a} owns its ${s}. Moving it into the shared platform layer next to the ${alt} was rejected: operational ownership, alerting, and on-call already live with the ${a} team. Revisit only if the ${s} outgrows one region.`,
      tags: [s.split(" ")[0], a.split(" ")[0], "decision"],
      path: `src/${slug(a)}/${slug(s)}-owner.ts`,
    };
  }
  if (type === "gotcha") {
    return {
      key: `synth-${i}`, type,
      title: `The ${s} stalls when ${cond}`,
      body: `Symptom: the ${a} ${s} stops making progress when ${cond}. It recovers on its own once the condition clears, which is why dashboards look healthy afterwards. Guard: alert on ${s} progress age, not on error rate.`,
      tags: [s.split(" ")[0], a.split(" ")[0], "gotcha"],
      path: `src/${slug(a)}/${slug(s)}-stall.ts`,
    };
  }
  if (type === "runbook") {
    return {
      key: `synth-${i}`, type,
      title: `How to drain and rebuild the ${s} in the ${a}`,
      body: `1. Pause the ${a} consumers. 2. Flush the ${s} and archive its state. 3. Rebuild from the last checkpoint. 4. Compare entry counts against the archive before resuming traffic. Takes about ten minutes off peak.`,
      tags: [s.split(" ")[0], a.split(" ")[0], "runbook"],
      path: `runbooks/${slug(a)}-${slug(s)}.md`,
    };
  }
  return {
    key: `synth-${i}`, type,
    title: `${capitalize(s)} keys in the ${a} must be namespaced by tenant`,
    body: `Every ${s} key in the ${a} starts with the tenant id. Un-namespaced keys collide across tenants during bulk restores; the linter in tools/key-lint enforces the prefix on new code.`,
    tags: [s.split(" ")[0], a.split(" ")[0], "convention"],
    path: `src/${slug(a)}/${slug(s)}-keys.ts`,
  };
}

const SMALL_STORE_PACKETS = TOPICAL_PACKETS;
const LARGE_STORE_PACKETS = [
  ...TOPICAL_PACKETS,
  ...COLLISION_PACKETS,
  ...Array.from({ length: SYNTH_COUNT }, (_, i) => synthPacket(i)),
];

// ---------------------------------------------------------------------------
// Labeled queries. `relevant` lists the packet keys a correct injector may
// attach for this prompt; empty means the ideal behavior is NO injection.
// ---------------------------------------------------------------------------
const CONTENT_FREE_QUERIES = [
  // Measured 2026-07-16 on the real store: "pong" recalled 4 lexical accidents
  // at 23-33 and all were injected; "fix it" scored 43.9 — ABOVE a real
  // question (receipts-pricing, 40.5) — so it clears any naive score gate.
  { id: "pong", query: "Reply with the single word: pong" },
  { id: "thanks", query: "thanks, looks good" },
  { id: "ok-continue", query: "ok continue" },
  { id: "yes-do-it", query: "yes do it" },
  { id: "hello", query: "hello" },
  { id: "fix-it", query: "fix it" },
];

const REAL_RELEVANT_QUERIES = [
  // Both stores. The payments query is the exact measured killer from the
  // negative-result packet: on a tiny store its direct match scored 14.3,
  // below the big store's junk band — the case an absolute floor destroys.
  { id: "payments", query: "how do payment retries dedupe on the ledger", expected: "payments-idempotency", stores: ["small", "large"] },
  // The same topic phrased the way a user actually asks, sharing almost no
  // title vocabulary with the packet. On the small store this direct match
  // scores INSIDE the large store's content-free noise band — the in-harness
  // reproduction of the measured 14.3-vs-(20-33) inversion that makes an
  // absolute injection floor impossible.
  { id: "payments-paraphrase", query: "what stops a customer being charged twice when a payment is retried", expected: "payments-idempotency", stores: ["small", "large"] },
  { id: "run-tests", query: "how do I run the test suite for this package", expected: "test-runbook", stores: ["small", "large"] },
  { id: "staging-deploy", query: "why does the staging deploy keep failing", expected: "deploy-gotcha", stores: ["small", "large"] },
  // Large store only: real questions whose expected packet is one of the
  // collision carriers — the same packet must be a top hit for a real question
  // AND stay out of content-free prompts. That is the whole game.
  { id: "ws-heartbeat", query: "how does the websocket gateway heartbeat keep connections alive", expected: "ping-pong", stores: ["large"] },
  { id: "ci-continue", query: "should CI pipelines allow continue-on-error", expected: "continue-on-error", stores: ["large"] },
  { id: "pricing-source", query: "where is the single source of truth for pricing configuration", expected: "single-source", stores: ["large"] },
];

const ABSENT_QUERIES = [
  // Genuine engineering questions whose TOPIC has no packet in either store.
  // Weak lexical overlap with unrelated packets is the realistic hazard;
  // injecting them is noise, so the ideal injected count is zero.
  { id: "gpg-rotate", query: "how do I rotate the GPG signing key for npm releases" },
  { id: "android-dex", query: "why does the android build fail with a dex merge error" },
  { id: "cron-timezone", query: "what timezone does the nightly cron use for report generation" },
  { id: "terraform-logs", query: "how do I enable verbose logging in the terraform provider" },
];

// ---------------------------------------------------------------------------
// Store seeding through the kernel's own capture(), like production memory.
// ---------------------------------------------------------------------------
function buildStore(name, packets) {
  const dir = mkdtempSync(join(tmpdir(), `kage-injection-${name}-`));
  kernel.initProject(dir, { policy: false });
  const titles = new Set();
  for (const p of packets) {
    if (titles.has(p.title)) throw new Error(`duplicate title in ${name} corpus: ${p.title}`);
    titles.add(p.title);
    const filePath = join(dir, p.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `// ${p.title}\n`, "utf8");
    const result = kernel.capture({
      projectDir: dir,
      title: p.title,
      body: p.body,
      type: p.type,
      tags: p.tags,
      paths: [p.path],
    });
    if (!result.ok) throw new Error(`capture failed in ${name} store for "${p.title}": ${result.errors.join("; ")}`);
  }
  kernel.refreshProject(dir, { force: true });
  // initProject auto-creates a repo_map "repo structure" packet; it is part of
  // every production store, so it stays recallable here too (its title embeds
  // the random temp dir name, but no labeled query can match those tokens, so
  // verdicts stay deterministic). It is never labeled relevant.
  const approvedFiles = readdirSync(join(dir, ".agent_memory", "packets")).filter((f) => f.endsWith(".md")).length;
  const byTitle = new Map(packets.map((p) => [p.title, p.key]));
  return { name, dir, packets, byTitle, seeded: packets.length, approvedFiles };
}

// ---------------------------------------------------------------------------
// One case = the production decision (real composeInjection, fake recording
// gateway) plus a non-mutating diagnostic recall for identities/scores, with a
// drift cross-check between the two.
// ---------------------------------------------------------------------------
function runCase(store, cls, spec) {
  const row = {
    id: `${store.name}:${spec.id}`,
    store: store.name,
    class: cls,
    query: spec.query,
    expected: spec.expected ?? null,
    relevant: spec.expected ? [spec.expected] : [],
    injected_count: 0,
    injected: [],
    top_is_expected: false,
    all_injected_relevant: false,
    verdict: "",
    error: null,
  };
  try {
    // Diagnostic ranking: the byte-identical recall call composeInjection makes
    // (same query slice, same limit 4, same explain=false, default expansion),
    // with trackAccess:false so it observes without mutating. It runs BEFORE
    // the production call so both see the same store state.
    const sliced = spec.query.slice(0, 1000);
    const diag = kernel.recall(store.dir, sliced, 4, false, { trackAccess: false });

    // Production decision: the real composeInjection from mcp/dist/proxy.js.
    // The fake gateway is recording-only: it hands the prompt to parseRequest
    // and captures the memory text inject() was asked to attach.
    const record = { memoryText: null };
    const gateway = {
      adapter_id: "eval-recording-gateway",
      provider: "eval",
      matches: () => true,
      parseRequest: () => ({ model: null, systemText: "", lastUserText: spec.query }),
      inject: (body, memoryText) => {
        record.memoryText = memoryText;
        return { body: { ...body, memory: memoryText }, applied: true };
      },
      extractUsage: () => ({}),
      createTokenCounter: () => null,
      buildReceipt: () => { throw new Error("buildReceipt is not part of the injection decision"); },
      captureEvents: () => [],
      priceSnapshots: [],
    };
    const decision = proxy.composeInjection(gateway, store.dir, { messages: [] });

    // Drift check: if the production decision disagrees with the diagnostic
    // ranking, the decision path changed and this harness's identities can no
    // longer be trusted — report the case as an ERROR, never silently.
    // Production gates on recall's corpus-normalized injection decision (W3):
    // when the diagnostic recall says inject=false, the expected count is 0.
    // Model the production decision: the corpus-normalized GATE must agree exactly (inject vs not).
    // The dominance-trimmed co-attach COUNT may differ by a packet between the diagnostic and the
    // production call, because production recall runs AFTER earlier cases recorded access boosts
    // (order-dependent and production-authentic, per this harness's design) and the 0.5×top trim is
    // score-sensitive. Gate disagreement is drift; a count wobble under an agreeing gate is data.
    const attachedDiag = diag.injection && diag.injection.inject === false
      ? []
      : diag.results.filter((r, i) => i === 0 || r.score >= diag.results[0].score * 0.5);
    const gateSaysInject = !(diag.injection && diag.injection.inject === false);
    if (gateSaysInject !== decision.injected > 0) {
      throw new Error(`decision-path drift: gate expected inject=${gateSaysInject} but composeInjection injected ${decision.injected} (recall.injection: ${JSON.stringify(diag.injection ?? null)})`);
    }
    if (decision.injected > 0) {
      for (const r of attachedDiag) {
        if (!record.memoryText || !record.memoryText.includes(r.packet.title)) {
          throw new Error(`decision-path drift: diagnostic hit "${r.packet.title}" is absent from the injected memory text`);
        }
      }
    }

    row.injected_count = decision.injected;
    row.injection_decision = diag.injection
      ? { inject: diag.injection.inject, confidence: diag.injection.confidence, why: diag.injection.why }
      : null;
        row.injected = attachedDiag.map((r) => ({
      // Unseeded hits are the store's own auto-created packets (repo_map);
      // keyed by type so the table stays deterministic despite the random
      // temp-dir token in their titles. Never labeled relevant.
      key: store.byTitle.get(r.packet.title) ?? `auto:${r.packet.type ?? "unknown"}`,
      title: r.packet.title,
      score: round(r.score, 2),
    }));
    const relevantSet = new Set(row.relevant);
    row.top_is_expected = row.injected.length > 0 && row.injected[0].key === row.expected && row.expected !== null;
    row.all_injected_relevant = row.injected.length > 0 && row.injected.every((p) => relevantSet.has(p.key));

    if (cls === "content-free") row.verdict = row.injected_count === 0 ? "clean" : "false-injection";
    else if (cls === "real-but-absent") row.verdict = row.injected_count === 0 ? "clean" : "noise-injection";
    else if (row.injected_count === 0) row.verdict = "miss";
    else if (row.top_is_expected) row.verdict = "top-hit";
    else if (row.injected.some((p) => p.key === row.expected)) row.verdict = "hit";
    else row.verdict = "miss";
  } catch (error) {
    row.error = String(error && error.message ? error.message : error);
    row.verdict = "error";
  }
  return row;
}

// ---------------------------------------------------------------------------
// Run. Fixed order: per store — content-free, real-relevant, real-but-absent.
// ---------------------------------------------------------------------------
const startedAt = Date.now();
console.error(`seeding small store (${SMALL_STORE_PACKETS.length} packets)...`);
const small = buildStore("small", SMALL_STORE_PACKETS);
console.error(`seeding large store (${LARGE_STORE_PACKETS.length} packets)...`);
const large = buildStore("large", LARGE_STORE_PACKETS);

const cases = [];
for (const store of [small, large]) {
  for (const q of CONTENT_FREE_QUERIES) cases.push(runCase(store, "content-free", q));
  for (const q of REAL_RELEVANT_QUERIES.filter((q) => q.stores.includes(store.name))) {
    cases.push(runCase(store, "real-relevant", q));
  }
  for (const q of ABSENT_QUERIES) cases.push(runCase(store, "real-but-absent", q));
  console.error(`${store.name} store scored (${cases.length} cases so far)`);
}

// ---------------------------------------------------------------------------
// Metrics. Errors are counted, reported, and excluded from rate denominators —
// an errored case must never masquerade as a pass OR a fail.
// ---------------------------------------------------------------------------
const ok = cases.filter((c) => !c.error);
const errors = cases.filter((c) => c.error);
const by = (cls, store) => ok.filter((c) => c.class === cls && (!store || c.store === store));

const injectedCases = ok.filter((c) => c.injected_count > 0);
const contentFree = by("content-free");
const realRelevant = by("real-relevant");
const absent = by("real-but-absent");
const smallRelevant = by("real-relevant", "small");

const metrics = {
  injection_precision: rate(injectedCases.filter((c) => c.all_injected_relevant).length, injectedCases.length),
  false_injection_rate: {
    overall: rate(contentFree.filter((c) => c.injected_count > 0).length, contentFree.length),
    small: rate(by("content-free", "small").filter((c) => c.injected_count > 0).length, by("content-free", "small").length),
    large: rate(by("content-free", "large").filter((c) => c.injected_count > 0).length, by("content-free", "large").length),
  },
  small_store_recall: rate(
    smallRelevant.filter((c) => c.injected.some((p) => p.key === c.expected)).length,
    smallRelevant.length,
  ),
  expected_top_hit_rate: {
    overall: rate(realRelevant.filter((c) => c.top_is_expected).length, realRelevant.length),
    small: rate(by("real-relevant", "small").filter((c) => c.top_is_expected).length, by("real-relevant", "small").length),
    large: rate(by("real-relevant", "large").filter((c) => c.top_is_expected).length, by("real-relevant", "large").length),
  },
  absent_injection_rate: {
    overall: rate(absent.filter((c) => c.injected_count > 0).length, absent.length),
    small: rate(by("real-but-absent", "small").filter((c) => c.injected_count > 0).length, by("real-but-absent", "small").length),
    large: rate(by("real-but-absent", "large").filter((c) => c.injected_count > 0).length, by("real-but-absent", "large").length),
  },
  cases_total: cases.length,
  cases_errored: errors.length,
};

// The floor-impossibility evidence, in numbers: whatever a gate would need to
// admit (small-store direct matches, real-question tops) versus what it would
// need to reject (content-free hits on the large store). "fix it" is called
// out because the 2026-07-16 measurement showed it scoring above a real
// question — it clears any naive absolute gate.
const topScore = (c) => (c.injected.length ? c.injected[0].score : null);
const smallDirect = ok.find((c) => c.id === "small:payments");
const smallParaphrase = ok.find((c) => c.id === "small:payments-paraphrase");
const fixItLarge = ok.find((c) => c.id === "large:fix-it");
const largeContentFreeTops = by("content-free", "large").map(topScore).filter((s) => s !== null);
const largeRelevantTops = by("real-relevant", "large").filter((c) => c.top_is_expected).map(topScore).filter((s) => s !== null);
const paraphraseTop = smallParaphrase ? topScore(smallParaphrase) : null;
const contentFreeMax = largeContentFreeTops.length ? Math.max(...largeContentFreeTops) : null;
const score_bands = {
  small_store_direct_match_top_score: smallDirect ? topScore(smallDirect) : null,
  small_store_paraphrase_top_score: paraphraseTop,
  large_store_content_free_max_score: contentFreeMax,
  large_store_real_relevant_min_top_score: largeRelevantTops.length ? Math.min(...largeRelevantTops) : null,
  fix_it_large_store_top_score: fixItLarge ? topScore(fixItLarge) : null,
  // True when a genuinely relevant small-store hit scores BELOW large-store
  // content-free noise — the measured inversion (14.3 vs 20-33 on 2026-07-16)
  // that makes any absolute injection floor impossible.
  floor_inversion_reproduced: paraphraseTop !== null && contentFreeMax !== null && paraphraseTop < contentFreeMax,
  note: "Recall scores are match-strength sums, not corpus-normalized relevance. Any absolute floor high enough to reject the content-free band must not also reject small-store direct matches — compare across these bands before proposing one (see the negative_result packet).",
};

// ---------------------------------------------------------------------------
// Baseline comparison. Regression = worse than recorded (direction-aware).
// ---------------------------------------------------------------------------
const current = {
  injection_precision: metrics.injection_precision,
  false_injection_rate_overall: metrics.false_injection_rate.overall,
  false_injection_rate_small: metrics.false_injection_rate.small,
  false_injection_rate_large: metrics.false_injection_rate.large,
  small_store_recall: metrics.small_store_recall,
  expected_top_hit_rate: metrics.expected_top_hit_rate.overall,
  absent_injection_rate_overall: metrics.absent_injection_rate.overall,
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
  benchmark: "Injection Relevance (composeInjection decision path)",
  decision_under_test: "mcp/proxy.ts composeInjection — recall + corpus-normalized injection gate (recall.injection) + 0.5×top dominance trim; imported from mcp/dist/proxy.js, not mirrored",
  stores: {
    small: { seeded_packets: small.seeded, approved_packet_files: small.approvedFiles },
    large: { seeded_packets: large.seeded, approved_packet_files: large.approvedFiles },
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
  workdirs: args.keep ? { small: small.dir, large: large.dir } : null,
  cases,
};

if (args.out) {
  writeFileSync(String(args.out), JSON.stringify(report, null, 2));
  console.error(`full report written to ${args.out}`);
}
if (!args.keep) {
  rmSync(small.dir, { recursive: true, force: true });
  rmSync(large.dir, { recursive: true, force: true });
} else {
  console.error(`kept stores: small=${small.dir} large=${large.dir}`);
}

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const { cases: _cases, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
}

// Human-readable baseline block on stderr so stdout stays parseable JSON.
console.error(`\nBASELINE ${RECORDED_BASELINE.date} (recorded in-file; the current gated injector — measured, not aspired to)`);
for (const [key, direction] of Object.entries(BASELINE_DIRECTIONS)) {
  const flag = regressions.some((r) => r.metric === key) ? "REGRESSED" : "ok";
  console.error(`  ${key.padEnd(34)} current ${String(current[key]).padEnd(8)} recorded ${String(RECORDED_BASELINE[key]).padEnd(8)} (${direction} is better)  ${flag}`);
}

if (errors.length) {
  console.error(`\n${errors.length} case(s) ERRORED (reported above in the JSON, never skipped):`);
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

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function rate(numerator, denominator) {
  return denominator ? round(numerator / denominator, 4) : null;
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
