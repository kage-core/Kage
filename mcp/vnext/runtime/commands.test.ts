import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { buildTransformationReceipt } from "../measurement/receipt.js";
import {
  ANTHROPIC_PRICE_SNAPSHOTS,
  GEMINI_PRICE_SNAPSHOTS,
  OPENAI_PRICE_SNAPSHOTS,
  type ProviderPriceSnapshot,
} from "../measurement/pricing.js";
import type { TransformationReceipt } from "../protocol/index.js";
import { readVnextConfig, vnextConfigPath } from "./config.js";
import type {
  DeliveryQueryResult,
  ReceiptQuery,
  ReceiptQueryResult,
  RuntimeClient,
  RuntimeHealth,
} from "./client.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import {
  probeLocalPort,
  proxyDaemonPaths,
  proxyDaemonState,
  writeProxyDaemonState,
  type ProxyDaemonRecord,
} from "./proxy-daemon.js";
import {
  attachmentByProvider,
  attachmentReport,
  byProvider,
  contextLatency,
  connectProject,
  downProject,
  renderDown,
  renderReceipts,
  renderStatus,
  renderUp,
  runtimeDownFrom,
  runWithProxy,
  upProject,
  vnextReceipts,
  vnextStatus,
} from "./commands.js";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-vnext-commands-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

const UNCACHED = (tokens: number) => ({
  uncached_input_tokens: tokens,
  cache_write_5m_tokens: 0,
  cache_write_1h_tokens: 0,
  cache_read_tokens: 0,
});

let receiptCounter = 0;

// A real model + its own price table per provider, so an openai/gemini receipt actually PRICES
// (with the anthropic default table + a claude model, a non-anthropic receipt would price to null
// on BOTH sides and a one-sided-cost test would pass for the wrong reason).
function priceFor(provider: string): { model: string; snapshots: readonly ProviderPriceSnapshot[] } {
  if (provider === "openai") return { model: "gpt-4o", snapshots: OPENAI_PRICE_SNAPSHOTS };
  if (provider === "gemini") return { model: "gemini-2.5-flash", snapshots: GEMINI_PRICE_SNAPSHOTS };
  return { model: "claude-opus-4-8", snapshots: ANTHROPIC_PRICE_SNAPSHOTS };
}

// A receipt exactly as Task 6 writes one. The audit-mode shape is the important case: the
// provider MEASURED both token totals, but only the `before` side has a billing breakdown, so
// `provider_input_cost_after_usd` is null. That is the one-sided cost every aggregate here must
// refuse to price.
function receipt(options: {
  quality: "exact" | "partial" | "unavailable";
  before_tokens?: number;
  after_tokens?: number;
  cost_both_sides?: boolean;
  task_id?: string;
  provider?: string;
}): TransformationReceipt {
  receiptCounter += 1;
  const before = options.before_tokens ?? 1_000;
  const after = options.after_tokens ?? 1_200;
  const beforeTokens = options.quality === "unavailable" ? null : before;
  const afterTokens = options.quality === "exact" ? after : null;
  const price = priceFor(options.provider ?? "anthropic");
  return buildTransformationReceipt({
    task_id: options.task_id ?? "task_fixture",
    request_id: `req_${receiptCounter}`,
    receipt_id: `receipt_${receiptCounter}`,
    provider: options.provider ?? "anthropic",
    model: price.model,
    snapshots: price.snapshots,
    mode: "audit",
    before: Buffer.alloc(10),
    after: Buffer.alloc(12),
    before_tokens: beforeTokens,
    after_tokens: afterTokens,
    before_breakdown: beforeTokens === null ? null : UNCACHED(beforeTokens),
    // Task 6 fact: the count_tokens side has a token count but NO cache breakdown, so an
    // audit-mode receipt carries no `after` cost. `cost_both_sides` exists only to prove the
    // aggregate CAN price a two-sided receipt when one genuinely exists.
    after_breakdown: options.cost_both_sides && afterTokens !== null ? UNCACHED(afterTokens) : null,
    latency_ms: 5,
    transformations: ["context_append_last_user_turn"],
  });
}

let deliveryCounter = 0;

function delivery(options: {
  status: StoredContextDelivery["status"];
  latency_ms?: number | null;
  /** Omitted => a hook delivery (provider null). Set it for a proxy delivery. */
  provider?: string | null;
}): StoredContextDelivery {
  deliveryCounter += 1;
  const delivered = options.status === "delivered";
  return {
    delivery_id: `delivery_${deliveryCounter}`,
    capsule_id: delivered ? `capsule_${deliveryCounter}` : "capsule_unavailable",
    task_id: "task_fixture",
    adapter_id: "claude-code-hooks",
    injection_location: delivered ? "user_turn" : "none",
    delivered_at: `2026-07-15T00:00:0${deliveryCounter % 10}.000Z`,
    added_bytes: delivered ? 400 : 0,
    added_tokens: null,
    measurement_quality: delivered ? "partial" : "unavailable",
    status: options.status,
    reason: options.status === "delivered" ? "delivered" : "audit_mode_no_injection",
    composition_latency_ms: options.latency_ms === undefined ? 10 : options.latency_ms,
    provider: options.provider === undefined ? null : options.provider,
  };
}

function fixtureRuntimeClient(options: {
  project_dir: string;
  receipts?: TransformationReceipt[];
  deliveries?: StoredContextDelivery[];
  available?: boolean;
  reason?: string | null;
  health?: Partial<RuntimeHealth>;
}): RuntimeClient {
  const receipts = options.receipts ?? [];
  const deliveries = options.deliveries ?? [];
  return {
    project_dir: options.project_dir,
    async health(): Promise<RuntimeHealth> {
      return {
        running: false,
        url: null,
        mode: null,
        protocol_version: null,
        reason: "not_running",
        ...options.health,
      };
    },
    async receipts(query?: ReceiptQuery): Promise<ReceiptQueryResult> {
      if (options.available === false) {
        return { available: false, reason: options.reason ?? "receipts_unavailable", receipts: [] };
      }
      const filtered = query?.task_id ? receipts.filter((r) => r.task_id === query.task_id) : receipts;
      return { available: true, reason: null, receipts: filtered };
    },
    async deliveries(): Promise<DeliveryQueryResult> {
      if (options.available === false) {
        return { available: false, reason: options.reason ?? "receipts_unavailable", deliveries: [] };
      }
      return { available: true, reason: null, deliveries };
    },
  };
}

function coverageClient(project: string, counts: { exact: number; partial: number; unavailable: number }): RuntimeClient {
  const receipts: TransformationReceipt[] = [];
  for (let i = 0; i < counts.exact; i += 1) receipts.push(receipt({ quality: "exact" }));
  for (let i = 0; i < counts.partial; i += 1) receipts.push(receipt({ quality: "partial" }));
  for (let i = 0; i < counts.unavailable; i += 1) receipts.push(receipt({ quality: "unavailable" }));
  return fixtureRuntimeClient({ project_dir: project, receipts });
}

// Kage may never mutate a prompt because a CLI default said so. `connect` is the command a user
// runs first, so its default is the whole safety posture of Phase A.
test("connect defaults to audit mode and never enables prompt mutation", async () => {
  const project = tempProject();
  const result = await connectProject({ project_dir: project, agents: ["claude-code"], start: false });

  assert.equal(result.config.vnext.runtime, "audit");
  assert.equal(result.config.vnext.gateway, "audit");
  assert.equal(result.mutates_prompts, false);
  assert.equal(result.runtime.started, false);

  const written = readVnextConfig(project);
  assert.equal(written?.vnext.runtime, "audit");
  assert.equal(written?.vnext.gateway, "audit");
  // Model-backed context delivery is opt-in only: `connect` always writes the legacy source.
  assert.equal(result.config.vnext.context_source, "legacy");
  assert.equal(written?.vnext.context_source, "legacy");
});

// A config predating context_source (or with an illegible value) must read back as legacy — never as
// model-backed. This is the backward-compatibility guarantee for the delivered source.
test("an absent or illegible context_source reads back as legacy, never model", () => {
  const project = tempProject();
  const path = vnextConfigPath(project);
  mkdirSync(dirname(path), { recursive: true });
  // A hand-written config with no context_source field at all (an older connect).
  writeFileSync(
    path,
    JSON.stringify({ vnext: { protocol_version: 1, runtime: "audit", gateway: "audit", adapters: ["claude-code"] } }),
    "utf8",
  );
  assert.equal(readVnextConfig(project)?.vnext.context_source, "legacy");

  // An illegible value is not honored either.
  writeFileSync(
    path,
    JSON.stringify({ vnext: { protocol_version: 1, runtime: "audit", gateway: "audit", adapters: [], context_source: "model-ish" } }),
    "utf8",
  );
  assert.equal(readVnextConfig(project)?.vnext.context_source, "legacy");
});

// The config file is the only thing a hook or proxy reads to decide whether it may inject. A
// caller (or a future flag) that tries to force assist through `connect` must not be able to.
test("connect cannot be talked into assist mode", async () => {
  const project = tempProject();
  const forced = { project_dir: project, start: false, mode: "assist", gateway: "assist" } as unknown as Parameters<typeof connectProject>[0];
  const result = await connectProject(forced);
  assert.equal(result.config.vnext.runtime, "audit");
  assert.equal(result.config.vnext.gateway, "audit");
  const raw = readFileSync(vnextConfigPath(project), "utf8");
  assert.equal(raw.includes("assist"), false);
});

// `connect --project .` runs against a live repo, repeatedly. It must be byte-idempotent, or it
// dirties the tree every invocation.
test("connect is byte-idempotent and starts no runtime with start:false", async () => {
  const project = tempProject();
  await connectProject({ project_dir: project, agents: ["claude-code"], start: false });
  const first = readFileSync(vnextConfigPath(project), "utf8");
  const second = await connectProject({ project_dir: project, agents: ["claude-code"], start: false });
  assert.equal(readFileSync(vnextConfigPath(project), "utf8"), first);
  assert.equal(second.runtime.started, false);
  assert.equal(existsSync(join(project, ".agent_memory", "daemon", "vnext", "status.json")), false);
});

test("status reports exact measurement coverage separately", async () => {
  const project = tempProject();
  const report = await vnextStatus(coverageClient(project, { exact: 3, partial: 2, unavailable: 1 }));
  assert.deepEqual(report.measurement, { exact: 3, partial: 2, unavailable: 1 });
  // Coverage counts are "of transformed requests" — a zero-recall request writes no receipt at
  // all, so this is never a share of all agent traffic.
  assert.equal(report.measurement_scope, "transformed_requests");
  assert.equal(report.receipts.total, 6);
});

// The lie this test exists to prevent: "83% measured" as a single number that quietly buries the
// unmeasured sixth of the traffic.
test("status never collapses coverage into one number", async () => {
  const project = tempProject();
  const report = await vnextStatus(coverageClient(project, { exact: 3, partial: 2, unavailable: 1 }));
  const keys = Object.keys(report as unknown as Record<string, unknown>);
  assert.equal(keys.some((key) => /coverage_percent|measured_percent|measurement_rate/.test(key)), false);
  assert.equal(renderStatus(report).includes("unavailable 1"), true);
});

// Task 6 fact (b): an audit-mode exact receipt has a measured `before` cost and a null `after`
// cost. Pricing that as a saving of the full `before` cost would be a fabricated dollar number.
test("status reports a one-sided cost as unavailable, never as zero", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({
    project_dir: project,
    receipts: [receipt({ quality: "exact", before_tokens: 1_000, after_tokens: 1_400 })],
  });
  const report = await vnextStatus(client);

  assert.equal(report.cost_delta.available, false);
  assert.equal(report.cost_delta.reason, "no_two_sided_cost_measurement");
  assert.equal(report.cost_delta.receipts, 0);
  assert.equal(report.cost_delta.before_usd, null);
  assert.equal(report.cost_delta.after_usd, null);
  assert.equal(report.cost_delta.delta_usd, null);

  // The token delta IS measured on the same receipt: token measurement is available far more
  // often than cost measurement, and the two must not be conflated.
  assert.equal(report.token_delta.available, true);
  assert.equal(report.token_delta.receipts, 1);
  assert.equal(report.token_delta.before_input_tokens, 1_000);
  assert.equal(report.token_delta.after_input_tokens, 1_400);
  assert.equal(report.token_delta.delta_tokens, -400);
});

test("status prices a cost delta only from receipts measured on both sides", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({
    project_dir: project,
    receipts: [
      receipt({ quality: "exact", before_tokens: 1_000, after_tokens: 1_400, cost_both_sides: true }),
      receipt({ quality: "exact", before_tokens: 500, after_tokens: 700 }),
      receipt({ quality: "unavailable" }),
    ],
  });
  const report = await vnextStatus(client);
  assert.equal(report.cost_delta.available, true);
  assert.equal(report.cost_delta.receipts, 1);
  assert.ok(report.cost_delta.before_usd !== null && report.cost_delta.before_usd > 0);
  assert.ok(report.cost_delta.after_usd !== null && report.cost_delta.after_usd > 0);
  assert.equal(
    report.cost_delta.delta_usd,
    (report.cost_delta.before_usd as number) - (report.cost_delta.after_usd as number),
  );
  // Token totals come from the two exact receipts, not from the priced one alone.
  assert.equal(report.token_delta.receipts, 2);
  assert.equal(report.token_delta.before_input_tokens, 1_500);
});

// An empty audit period is not a successful zero-cost period.
test("status with no receipts reports nulls, not zero savings", async () => {
  const project = tempProject();
  const report = await vnextStatus(fixtureRuntimeClient({ project_dir: project, receipts: [] }));
  assert.deepEqual(report.measurement, { exact: 0, partial: 0, unavailable: 0 });
  assert.equal(report.receipts.total, 0);
  assert.equal(report.token_delta.available, false);
  assert.equal(report.token_delta.reason, "no_measured_token_pair");
  assert.equal(report.token_delta.delta_tokens, null);
  assert.equal(report.cost_delta.available, false);
  assert.equal(report.cost_delta.delta_usd, null);
  const text = renderStatus(report);
  assert.equal(/\$0|no savings|0 tokens saved/i.test(text), false);
  assert.equal(text.includes("unavailable"), true);
});

// The receipt store being unreadable (Node < 22.5, no database yet) is itself a measurement
// outcome and must never read as "nothing was transformed".
test("status distinguishes an unreadable receipt store from an empty one", async () => {
  const project = tempProject();
  const report = await vnextStatus(
    fixtureRuntimeClient({ project_dir: project, available: false, reason: "runtime_unsupported" }),
  );
  assert.equal(report.receipts.available, false);
  assert.equal(report.receipts.reason, "runtime_unsupported");
  assert.equal(report.receipts.total, null);
  // Not {0,0,0}: three zeros would say "we measured, and nothing was transformed". We could not
  // even look.
  assert.equal(report.measurement, null);
  assert.equal(report.token_delta.reason, "runtime_unsupported");
  assert.equal(report.cost_delta.reason, "runtime_unsupported");
  assert.equal(renderStatus(report).includes("runtime_unsupported"), true);
});

test("receipts prints only measured fields and never zero-fills an unavailable one", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({
    project_dir: project,
    receipts: [
      receipt({ quality: "exact", before_tokens: 1_000, after_tokens: 1_300, task_id: "task_a" }),
      receipt({ quality: "unavailable", task_id: "task_a" }),
    ],
  });
  const report = await vnextReceipts(client, { task_id: "task_a" });
  assert.equal(report.receipts.length, 2);

  const [exact, unknown] = report.receipts;
  assert.equal(exact.measurement_quality, "exact");
  assert.equal(exact.delta_input_tokens, -300);
  // Audit-mode: `after` cost is not measured, so no cost delta may be printed for it.
  assert.equal(exact.provider_input_cost_after_usd, null);
  assert.equal(exact.delta_input_cost_usd, null);

  assert.equal(unknown.measurement_quality, "unavailable");
  assert.equal(unknown.before_input_tokens, null);
  assert.equal(unknown.after_input_tokens, null);
  assert.equal(unknown.delta_input_tokens, null);
  assert.equal(unknown.provider_input_cost_before_usd, null);
  assert.equal(unknown.delta_input_cost_usd, null);

  // The rendered text must say "unavailable" for every unmeasured quantity — never a 0, never a
  // $0.000000, never an implied "no change".
  const text = renderReceipts(report);
  assert.match(text, /input tokens: {2}before unavailable → after unavailable {2}delta unavailable/);
  assert.match(text, /input cost: {4}before unavailable → after unavailable {2}delta unavailable/);
  // The exact receipt: tokens measured on both sides, cost measured on one — so its cost delta is
  // unavailable too, and is printed that way rather than as the full before-cost "saving".
  assert.match(text, /input cost: {4}before \$0\.005000 → after unavailable {2}delta unavailable/);
  assert.equal(text.includes("$0.000000"), false);
  assert.equal(/\bdelta 0\b/.test(text), false);
});

test("receipts on a task with no receipts says so instead of reporting a saving", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({ project_dir: project, receipts: [] });
  const report = await vnextReceipts(client, { task_id: "task_missing" });
  assert.equal(report.receipts.length, 0);
  assert.equal(report.token_delta.available, false);
  assert.equal(report.cost_delta.available, false);
  assert.equal(/saved|savings/i.test(renderReceipts(report)), false);
});

// --- attachment and context latency: the numbers Phase A could not produce at all ---------

// The definition, stated once and enforced here: attachment_success_rate is
//   delivered / (delivered + skipped + failed_open)
// A skip is an attempt that attached NOTHING (audit mode, or an empty capsule). Leaving it out of
// the denominator would turn "Kage attached context 1 time in 4" into "Kage attached context 100%
// of the time", which is the exact lie this whole phase exists to prevent.
test("attachment counts every attempt, and a skip is never counted as a success", () => {
  const report = attachmentReport([
    delivery({ status: "delivered" }),
    delivery({ status: "delivered" }),
    delivery({ status: "skipped" }),
    delivery({ status: "failed_open", latency_ms: null }),
  ]);

  assert.equal(report.delivered, 2);
  assert.equal(report.skipped, 1);
  assert.equal(report.failed_open, 1);
  assert.equal(report.attempted, 4);
  assert.equal(report.success_rate, 0.5);
});

test("an audit period that attached nothing reports 0.0, not null and never 1.0", () => {
  // Audit composes and skips, every time. 0% attachment is the TRUTH about an audit period, and it
  // is a measured 0 — there were attempts, and none of them attached anything.
  const report = attachmentReport([delivery({ status: "skipped" }), delivery({ status: "skipped" })]);
  assert.equal(report.success_rate, 0);
  assert.equal(report.delivered, 0);
  assert.equal(report.attempted, 2);
});

test("no attempt at all is a null rate: zero attempts is not a zero percent, and not a hundred", () => {
  const report = attachmentReport([]);
  assert.deepEqual(report, { delivered: 0, skipped: 0, failed_open: 0, attempted: 0, success_rate: null });
});

test("context latency percentiles come from measured compositions, or they are null", () => {
  const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const report = contextLatency(latencies.map((ms) => delivery({ status: "delivered", latency_ms: ms })));

  assert.equal(report.available, true);
  assert.equal(report.samples, 10);
  // Nearest-rank, no interpolation: every reported number is a latency that was really measured.
  assert.equal(report.p50_ms, 50);
  assert.equal(report.p95_ms, 100);
  assert.equal(report.source, "context_delivery.composition_latency_ms");
});

test("a failed-open contributes no latency: a timeout is not a composition time", () => {
  const report = contextLatency([
    delivery({ status: "delivered", latency_ms: 12 }),
    delivery({ status: "failed_open", latency_ms: null }),
  ]);
  assert.equal(report.samples, 1, "only the composition that happened is a sample");
  assert.equal(report.p50_ms, 12);
  assert.equal(report.p95_ms, 12);
});

test("percentiles over no measured composition are null, never zero", () => {
  const report = contextLatency([delivery({ status: "failed_open", latency_ms: null })]);
  assert.equal(report.available, false);
  assert.equal(report.reason, "no_measured_composition");
  assert.equal(report.samples, 0);
  assert.equal(report.p50_ms, null);
  assert.equal(report.p95_ms, null);
  assert.equal(report.source, null);
});

test("status reports attachment and latency from real delivery rows", async () => {
  const project = tempProject();
  const report = await vnextStatus(fixtureRuntimeClient({
    project_dir: project,
    deliveries: [
      delivery({ status: "delivered", latency_ms: 20 }),
      delivery({ status: "skipped", latency_ms: 40 }),
      delivery({ status: "failed_open", latency_ms: null }),
    ],
  }));

  assert.equal(report.deliveries.available, true);
  assert.equal(report.deliveries.total, 3);
  assert.equal(report.attachment?.delivered, 1);
  assert.equal(report.attachment?.failed_open, 1);
  assert.equal(report.attachment?.success_rate, 1 / 3);
  // Nearest-rank on the two measured compositions (20 ms, 40 ms): p50 is a latency that really
  // happened, not the 30 ms average of two that did not.
  assert.equal(report.context_latency.p50_ms, 20);
  assert.equal(report.context_latency.p95_ms, 40);
  assert.equal(report.context_latency.samples, 2);

  const text = renderStatus(report);
  assert.match(text, /1 delivered, 1 skipped, 1 failed open/);
  assert.match(text, /failed-open/);
});

test("status with no deliveries reports a null attachment rate, not a perfect one", async () => {
  const project = tempProject();
  const report = await vnextStatus(fixtureRuntimeClient({ project_dir: project, deliveries: [] }));

  assert.equal(report.deliveries.available, true);
  assert.equal(report.deliveries.total, 0);
  assert.equal(report.attachment?.attempted, 0);
  assert.equal(report.attachment?.success_rate, null);
  assert.equal(report.context_latency.p50_ms, null);
  assert.equal(report.context_latency.p95_ms, null);
  const text = renderStatus(report);
  assert.match(text, /attachment:.*null \(nothing attempted\)/);
  assert.equal(/100%|1\.000/.test(text), false);
});

test("status distinguishes an unreadable delivery store from a period with no attempts", async () => {
  const project = tempProject();
  const report = await vnextStatus(
    fixtureRuntimeClient({ project_dir: project, available: false, reason: "runtime_unsupported" }),
  );
  assert.equal(report.deliveries.available, false);
  assert.equal(report.deliveries.total, null);
  // Not {0,0,0} with a rate: three zeros would claim we looked and saw no attempt. We could not look.
  assert.equal(report.attachment, null);
  assert.equal(report.context_latency.available, false);
  assert.equal(report.context_latency.reason, "runtime_unsupported");
});

// --- per-provider breakdown ------------------------------------------------------------------
//
// The proxy is multi-provider now, so every measurement surface must split by the receipt's
// provider and NEVER conflate two providers into one flattering number. A provider with no
// receipts is absent (no traffic), never a fabricated {0,0,0} coverage or a $0 cost.

test("byProvider splits coverage by provider and never conflates them", () => {
  const map = byProvider([
    receipt({ quality: "exact", provider: "anthropic" }),
    receipt({ quality: "partial", provider: "anthropic" }),
    receipt({ quality: "exact", provider: "openai" }),
    receipt({ quality: "unavailable", provider: "openai" }),
  ]);
  assert.deepEqual(Object.keys(map).sort(), ["anthropic", "openai"]);
  assert.deepEqual(map.anthropic.measurement, { exact: 1, partial: 1, unavailable: 0 });
  assert.deepEqual(map.openai.measurement, { exact: 1, partial: 0, unavailable: 1 });
  assert.equal(map.anthropic.receipts, 2);
  assert.equal(map.openai.receipts, 2);
  // No conflation: each provider's token pair is measured on ITS receipts only. Each provider has
  // exactly one exact receipt (a measured pair), so the two token aggregates are independent — not
  // a shared sum that hides which provider a token came from.
  assert.equal(map.anthropic.token_delta.receipts, 1);
  assert.equal(map.openai.token_delta.receipts, 1);
});

test("byProvider omits a provider with no receipts: absence is no traffic, never a zero bucket", () => {
  const map = byProvider([receipt({ quality: "exact", provider: "anthropic" })]);
  assert.equal("anthropic" in map, true);
  // The whole honesty gate: a provider that sent nothing has NO bucket. It is NOT {0,0,0} coverage
  // (which would claim "we measured openai and it transformed nothing") and it is NOT a $0 cost.
  assert.equal("openai" in map, false);
  assert.equal(map.openai, undefined);
});

test("byProvider prices each provider independently; a one-sided-cost provider is unavailable, not zero", () => {
  const map = byProvider([
    receipt({ quality: "exact", provider: "anthropic", cost_both_sides: true }),
    receipt({ quality: "exact", provider: "openai" }), // audit one-sided: real gpt-4o before cost, null after
  ]);
  assert.equal(map.anthropic.cost_delta.available, true);
  assert.ok((map.anthropic.cost_delta.before_usd ?? 0) > 0);
  // openai's receipt is priced with a REAL gpt-4o rate (not the null-both-sides a claude model +
  // the anthropic table would give), so this is the genuine one-sided case: a real before cost, a
  // null after cost. The aggregate refuses to price it — UNAVAILABLE, never before-0 as a full
  // saving, never a fabricated $0.
  assert.equal(map.openai.cost_delta.available, false);
  assert.equal(map.openai.cost_delta.reason, "no_two_sided_cost_measurement");
  assert.equal(map.openai.cost_delta.delta_usd, null);
  // ...but openai's TOKEN delta IS available (both token totals measured). Tokens and cost stay
  // strictly apart per provider, exactly as they do overall.
  assert.equal(map.openai.token_delta.available, true);
});

test("byProvider prices a genuinely two-sided OpenAI receipt with its own gpt-4o rate", () => {
  // Guards that OpenAI pricing is actually exercised end-to-end: a two-sided openai receipt must
  // produce a REAL dollar cost off the OpenAI table — not null (which a claude model + the default
  // anthropic table would silently yield, making the one-sided test above pass for the wrong reason).
  const map = byProvider([receipt({ quality: "exact", provider: "openai", cost_both_sides: true })]);
  assert.equal(map.openai.cost_delta.available, true);
  assert.ok((map.openai.cost_delta.before_usd ?? 0) > 0, "a two-sided openai receipt prices to a real cost");
  assert.ok((map.openai.cost_delta.after_usd ?? 0) > 0);
});

test("status exposes by_provider alongside the overall total, never instead of it", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({
    project_dir: project,
    receipts: [
      receipt({ quality: "exact", provider: "anthropic" }),
      receipt({ quality: "partial", provider: "anthropic" }),
      receipt({ quality: "exact", provider: "openai" }),
    ],
  });
  const report = await vnextStatus(client);
  // The overall total is still present (token counts are comparable across providers, so a total is
  // honest)...
  assert.deepEqual(report.measurement, { exact: 2, partial: 1, unavailable: 0 });
  // ...AND the per-provider split sits beside it, so no reader sees the total without seeing which
  // provider each count came from.
  assert.deepEqual(report.by_provider?.anthropic.measurement, { exact: 1, partial: 1, unavailable: 0 });
  assert.deepEqual(report.by_provider?.openai.measurement, { exact: 1, partial: 0, unavailable: 0 });
  // A provider with no receipts has no bucket — null traffic, not a zero.
  assert.equal(report.by_provider?.gemini, undefined);
});

test("status reports by_provider as null when the receipt store is unreadable, never as {}", async () => {
  const project = tempProject();
  const report = await vnextStatus(
    fixtureRuntimeClient({ project_dir: project, available: false, reason: "runtime_unsupported" }),
  );
  // Not {}: an empty object would say "we looked and no provider had traffic". We could not look.
  assert.equal(report.by_provider, null);
});

test("renderStatus prints each provider's coverage and never collapses to a total-only line", async () => {
  const project = tempProject();
  const client = fixtureRuntimeClient({
    project_dir: project,
    receipts: [
      receipt({ quality: "exact", provider: "anthropic" }),
      receipt({ quality: "unavailable", provider: "openai" }),
    ],
  });
  const text = renderStatus(await vnextStatus(client));
  assert.match(text, /anthropic/);
  assert.match(text, /openai/);
});

// --- per-provider ATTACHMENT ------------------------------------------------------------------
//
// Deliveries can now carry the provider (migration 003). A PROXY delivery knows it; a Claude-HOOK
// delivery does not (it injects from IDE events, blind to which API the agent calls) and records
// null. So attachment splits per provider — but a null-provider row is NEVER guessed into a
// provider; it lands in an explicit `unattributed` bucket and in the overall only.

test("attachmentByProvider splits proxy deliveries by provider and never conflates them", () => {
  const report = attachmentByProvider([
    delivery({ status: "delivered", provider: "anthropic" }),
    delivery({ status: "skipped", provider: "anthropic" }),
    delivery({ status: "delivered", provider: "openai" }),
  ]);
  assert.equal(report.available, true);
  assert.deepEqual(Object.keys(report.providers).sort(), ["anthropic", "openai"]);
  // anthropic: 1 delivered, 1 skipped → a measured 0.5, from ITS rows only.
  assert.equal(report.providers.anthropic.delivered, 1);
  assert.equal(report.providers.anthropic.skipped, 1);
  assert.equal(report.providers.anthropic.attempted, 2);
  assert.equal(report.providers.anthropic.success_rate, 0.5);
  // openai: 1 delivered → 1.0, kept strictly apart from anthropic's rate.
  assert.equal(report.providers.openai.delivered, 1);
  assert.equal(report.providers.openai.success_rate, 1);
  // Every row carried a provider, so there is nothing unattributed.
  assert.equal(report.unattributed, null);
});

test("attachmentByProvider omits a provider with no deliveries: absence is no traffic, never a zero bucket", () => {
  const report = attachmentByProvider([delivery({ status: "delivered", provider: "anthropic" })]);
  assert.equal("anthropic" in report.providers, true);
  // The honesty gate: a provider that attached nothing has NO bucket. It is NOT a {0,0,0} with a 0%
  // rate (which would claim "we saw openai and it attached nothing").
  assert.equal("openai" in report.providers, false);
  assert.equal(report.providers.openai, undefined);
});

test("attachmentByProvider puts hook (null-provider) rows in unattributed, never a fabricated provider", () => {
  const deliveries = [
    delivery({ status: "delivered", provider: "anthropic" }),
    delivery({ status: "skipped" }), // hook: provider null
    delivery({ status: "failed_open", latency_ms: null }), // hook: provider null
  ];
  const report = attachmentByProvider(deliveries);

  // Only the proxy row's provider gets a bucket. The two hook rows are NOT guessed into "anthropic".
  assert.deepEqual(Object.keys(report.providers), ["anthropic"]);
  assert.equal(report.providers.anthropic.delivered, 1);
  assert.equal(report.providers.anthropic.attempted, 1);
  assert.equal(report.providers.anthropic.success_rate, 1);
  // The null-provider rows land in an explicit unattributed bucket.
  assert.equal(report.unattributed?.skipped, 1);
  assert.equal(report.unattributed?.failed_open, 1);
  assert.equal(report.unattributed?.attempted, 2);
  assert.equal(report.unattributed?.success_rate, 0);

  // The split never loses or invents an attempt: every provider bucket plus unattributed reconstruct
  // the OVERALL attachment exactly.
  const overall = attachmentReport(deliveries);
  const buckets = [...Object.values(report.providers), report.unattributed!];
  assert.equal(buckets.reduce((n, b) => n + b.delivered, 0), overall.delivered);
  assert.equal(buckets.reduce((n, b) => n + b.skipped, 0), overall.skipped);
  assert.equal(buckets.reduce((n, b) => n + b.failed_open, 0), overall.failed_open);
});

test("attachmentByProvider with only hook rows has no provider buckets, only unattributed", () => {
  const report = attachmentByProvider([
    delivery({ status: "delivered" }),
    delivery({ status: "skipped" }),
  ]);
  // No provider knew this traffic. NOT one fabricated bucket — the whole thing is unattributed.
  assert.deepEqual(report.providers, {});
  assert.equal(report.unattributed?.delivered, 1);
  assert.equal(report.unattributed?.attempted, 2);
  assert.equal(report.unattributed?.success_rate, 0.5);
});

test("attachmentByProvider treats a blank provider (bypassed store) as unattributed, not a '' bucket", () => {
  // The store rejects an empty-string provider, so this can only arrive via a direct SQL insert
  // past the write door. The read side must not mint a "" provider bucket for it.
  const report = attachmentByProvider([
    { ...delivery({ status: "delivered", provider: "openai" }) },
    { ...delivery({ status: "delivered" }), provider: "" },
    { ...delivery({ status: "skipped" }), provider: "   " },
  ]);
  assert.deepEqual(Object.keys(report.providers), ["openai"]);
  assert.equal("" in report.providers, false);
  assert.equal(report.unattributed?.attempted, 2, "the blank-provider rows fall into unattributed");
});

test("status exposes attachment_by_provider alongside the overall attachment, never instead of it", async () => {
  const project = tempProject();
  const report = await vnextStatus(fixtureRuntimeClient({
    project_dir: project,
    deliveries: [
      delivery({ status: "delivered", provider: "anthropic" }),
      delivery({ status: "skipped", provider: "anthropic" }),
      delivery({ status: "skipped" }), // hook
    ],
  }));

  // The overall attachment is unchanged by the split.
  assert.equal(report.attachment?.delivered, 1);
  assert.equal(report.attachment?.skipped, 2);
  assert.equal(report.attachment?.attempted, 3);

  // ...and the per-provider split sits beside it.
  assert.equal(report.attachment_by_provider.available, true);
  assert.equal(report.attachment_by_provider.providers.anthropic.delivered, 1);
  assert.equal(report.attachment_by_provider.providers.anthropic.skipped, 1);
  // A provider with no traffic has no bucket; the hook row is unattributed, never fabricated.
  assert.equal(report.attachment_by_provider.providers.gemini, undefined);
  assert.equal(report.attachment_by_provider.unattributed?.skipped, 1);
});

test("status reports attachment_by_provider as unavailable when the delivery store is unreadable, never as an empty split", async () => {
  const project = tempProject();
  const report = await vnextStatus(
    fixtureRuntimeClient({ project_dir: project, available: false, reason: "runtime_unsupported" }),
  );
  // Same rule as the overall attachment: "we could not look" is unavailable, not "no provider
  // attached anything".
  assert.equal(report.attachment, null);
  assert.equal(report.attachment_by_provider.available, false);
  assert.equal(report.attachment_by_provider.reason, "runtime_unsupported");
  assert.deepEqual(report.attachment_by_provider.providers, {});
  assert.equal(report.attachment_by_provider.unattributed, null);
});

// ---------------------------------------------------------------------------------------------
// kage up — one command for the whole ambient stack
// ---------------------------------------------------------------------------------------------

function listenOnLoopback(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer(() => { /* accept and hold; the probe only needs a TCP accept */ });
  return new Promise((resolveListener) => {
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      resolveListener({
        port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

// A port with nothing behind it: bind, read the assigned port, release it.
async function freeLoopbackPort(): Promise<number> {
  const listener = await listenOnLoopback();
  await listener.close();
  return listener.port;
}

// `up` is the onboarding command, so its defaults are the safety posture: audit-only config on
// disk, audit proxy plan, and NO process spawned when the runtime seam says not to — the same
// start:false-style seam the connect tests use, so this test never launches a real daemon.
test("up on an unconnected project writes the audit config and plans runtime + proxy without spawning", async () => {
  const project = tempProject();
  const result = await upProject({
    project_dir: project,
    start_runtime: false,
    probe_port: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "audit"); // the safe onboarding default — bare `kage proxy` keeps assist
  assert.equal(result.port, 8788);
  assert.equal(result.base_url, "http://localhost:8788");

  // The config on disk is the audit-only connect config; `up` can never write anything else.
  const written = readVnextConfig(project);
  assert.equal(written?.vnext.runtime, "audit");
  assert.equal(written?.vnext.gateway, "audit");
  assert.equal(result.connect.mutates_prompts, false);

  // Nothing listens on the port, so the CLI's job is to start the foreground proxy...
  assert.equal(result.proxy.action, "start");
  // ...and no long-lived process was spawned by the plan itself.
  assert.equal(result.connect.runtime.started, false);
  assert.equal(existsSync(join(project, ".agent_memory", "daemon", "vnext", "status.json")), false);

  // The crisp block: the one export line, the kage run alternative, and where results land.
  const text = result.instructions.join("\n");
  assert.ok(text.includes("export ANTHROPIC_BASE_URL=http://localhost:8788"));
  assert.ok(text.includes("kage run -- "));
  assert.ok(text.includes("kage status --project"));
});

// --mode governs the PROXY PROCESS alone, exactly like `kage proxy --mode`. The config written to
// disk — what the hook adapter reads to decide whether it may touch a prompt — stays audit-only.
test("up --mode assist affects only the proxy plan; the connect config stays audit-only", async () => {
  const project = tempProject();
  const result = await upProject({
    project_dir: project,
    mode: "assist",
    start_runtime: false,
    probe_port: async () => false,
  });

  assert.equal(result.mode, "assist");
  assert.equal(result.proxy.mode, "assist");
  const raw = readFileSync(vnextConfigPath(project), "utf8");
  assert.equal(raw.includes("assist"), false);
});

// Honest output is a feature: audit must say measurement-only, assist must say memory will be
// injected — and neither may borrow the other's claim.
test("up mode honesty: audit says measurement-only, assist says memory will be injected", async () => {
  const project = tempProject();
  const audit = await upProject({ project_dir: project, start_runtime: false, probe_port: async () => false });
  const auditText = audit.instructions.join("\n").toLowerCase();
  assert.ok(auditText.includes("measurement only"));
  assert.ok(auditText.includes("injects nothing"));
  assert.equal(auditText.includes("will be injected"), false);

  const assist = await upProject({ project_dir: project, mode: "assist", start_runtime: false, probe_port: async () => false });
  const assistText = assist.instructions.join("\n").toLowerCase();
  assert.ok(assistText.includes("will be injected"));
  assert.equal(assistText.includes("injects nothing"), false);
});

// Re-running `kage up` while a listener already owns the port must be a no-op that still helps:
// same audit config bytes, same instructions, exit 0 — never a failure. The listener is real and
// the probe is the real TCP probe, so this covers the end-to-end idempotency path.
test("up is idempotent when a listener already owns the port", async () => {
  const project = tempProject();
  await connectProject({ project_dir: project, start: false });
  const firstConfig = readFileSync(vnextConfigPath(project), "utf8");

  const listener = await listenOnLoopback();
  try {
    const result = await upProject({ project_dir: project, port: listener.port, start_runtime: false });
    assert.equal(result.ok, true);
    assert.equal(result.proxy.action, "already_listening");
    // The same instructions as a fresh start — the user gets the export line either way.
    assert.ok(result.instructions.join("\n").includes(`export ANTHROPIC_BASE_URL=http://localhost:${listener.port}`));
    // And the config was not rewritten (byte-idempotent, like connect).
    assert.equal(readFileSync(vnextConfigPath(project), "utf8"), firstConfig);
    // The render says so in one calm line, not a failure.
    assert.ok(renderUp(result).includes("already has a listener"));
  } finally {
    await listener.close();
  }
});

// Fail-open ethos: a runtime that cannot start must never take `up` down with it. The proxy is
// still the plan, and the render carries an honest one-line note (the reason, not a stack trace).
test("up survives a runtime that fails to start: proxy still planned, honest note rendered", async () => {
  const project = tempProject();
  const result = await upProject({
    project_dir: project,
    runtime_starter: async () => { throw new Error("daemon exploded"); },
    probe_port: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.proxy.action, "start");
  assert.equal(result.connect.runtime.reason, "start_failed");

  const rendered = renderUp(result);
  assert.ok(rendered.includes("daemon exploded"));
  // The degradation is stated for what it is: the proxy works, evidence capture does not.
  assert.ok(rendered.toLowerCase().includes("evidence"));
});

// ---------------------------------------------------------------------------------------------
// kage run — env-wrapped exec through the local proxy
// ---------------------------------------------------------------------------------------------

test("run fails fast with a one-line kage-up hint when nothing listens", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const result = await runWithProxy({
    project_dir: project,
    port,
    command: [process.execPath, "-e", "process.exit(0)"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.ok(result.hint?.includes("kage up"));
  // One human line, not a paragraph and not a stack.
  assert.equal(result.hint?.includes("\n"), false);
});

test("run refuses an empty command with a usage hint", async () => {
  const project = tempProject();
  const result = await runWithProxy({ project_dir: project, command: [] });
  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 2);
  assert.ok(result.hint?.includes("kage run"));
});

// The real end-to-end path: a live loopback listener satisfies the probe, a real child process
// observes ANTHROPIC_BASE_URL (written to a file, since stdio is not captured), and the child's
// exit code comes back verbatim.
test("run sets ANTHROPIC_BASE_URL for the child and propagates its exit code", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  const envFile = join(project, "child-env.txt");
  try {
    const result = await runWithProxy({
      project_dir: project,
      port: listener.port,
      command: [
        process.execPath,
        "-e",
        'require("fs").writeFileSync(process.argv[1], process.env.ANTHROPIC_BASE_URL ?? "unset"); process.exit(7);',
        envFile,
      ],
      stdio: "ignore",
    });

    assert.equal(result.ok, true);
    assert.equal(result.exit_code, 7);
    assert.equal(result.hint, null);
    assert.equal(readFileSync(envFile, "utf8"), `http://localhost:${listener.port}`);
  } finally {
    await listener.close();
  }
});

// ---------------------------------------------------------------------------------------------
// help text — both commands are discoverable, with up's audit default called out
// ---------------------------------------------------------------------------------------------

test("kage help lists up and run, and the full usage documents up's audit default", () => {
  const cli = join(__dirname, "..", "..", "cli.js");
  const core = execFileSync(process.execPath, [cli, "help"], { encoding: "utf8" });
  assert.ok(core.includes("kage up"));
  assert.ok(core.includes("kage run"));

  const full = execFileSync(process.execPath, [cli, "help", "--all"], { encoding: "utf8" });
  assert.ok(full.includes("kage up [--project <dir>] [--port 8788] [--mode audit|assist]"));
  assert.ok(full.includes("kage run [--project <dir>] [--port 8788] -- <command> [args...]"));
  // The one sharp edge worth documenting: up defaults to audit; bare `kage proxy` keeps assist.
  const upLine = full.split("\n").find((line) => line.trimStart().startsWith("kage up "));
  assert.ok(upLine, "expected a kage up usage line");
  assert.ok(upLine.includes("audit"));
});

test("kage help documents the background lifecycle: up in the background, down to stop it", () => {
  const cli = join(__dirname, "..", "..", "cli.js");
  const core = execFileSync(process.execPath, [cli, "help"], { encoding: "utf8" });
  assert.ok(core.includes("kage down"));

  const full = execFileSync(process.execPath, [cli, "help", "--all"], { encoding: "utf8" });
  assert.ok(full.includes("kage down [--project <dir>]"));
  const upLine = full.split("\n").find((line) => line.trimStart().startsWith("kage up "));
  assert.ok(upLine, "expected a kage up usage line");
  assert.ok(upLine.includes("--foreground"));
  assert.ok(upLine.toLowerCase().includes("background"));
  // Honest about the one lifecycle gap: a reboot stops the proxy; there is no system service.
  assert.ok(upLine.toLowerCase().includes("reboot"));
});

// ---------------------------------------------------------------------------------------------
// the background proxy lifecycle: up plans around VERIFIED daemon state, down stops the stack
// ---------------------------------------------------------------------------------------------

function daemonRecord(projectDir: string, overrides: Partial<ProxyDaemonRecord> = {}): ProxyDaemonRecord {
  return {
    pid: process.pid,
    port: 8788,
    mode: "audit",
    project_dir: projectDir,
    started_at: new Date().toISOString(),
    log_path: join(projectDir, ".agent_memory", "daemon", "proxy.log"),
    ...overrides,
  };
}

test("up reuses a verified running background proxy: the running port and mode win, and nothing starts", async () => {
  const project = tempProject();
  const state = daemonRecord(project, { pid: 4242, port: 9999, mode: "assist" });
  const result = await upProject({
    project_dir: project,
    port: 8788,
    start_runtime: false,
    probe_daemon: async () => ({ running: true, state }),
    // A verified daemon already answered the question; probing the requested port would only
    // re-ask it of a listener we cannot attribute.
    probe_port: async () => { throw new Error("probe_port must not be called when a verified daemon is running"); },
  });

  assert.equal(result.proxy.action, "reuse_running");
  assert.equal(result.proxy.daemon?.pid, 4242);
  // The RUNNING proxy's coordinates are the truth the instructions must print — not the flags.
  assert.equal(result.port, 9999);
  assert.equal(result.mode, "assist");
  assert.equal(result.base_url, "http://localhost:9999");
  assert.ok(result.instructions.join("\n").includes("http://localhost:9999"));
  // The user asked for a different port; the reuse says so instead of silently ignoring the flag.
  assert.ok(result.warnings.some((warning) => warning.includes("--port")));

  const rendered = renderUp(result);
  assert.ok(rendered.includes("already running"));
  assert.ok(rendered.includes("4242"));
  assert.ok(rendered.includes("kage down"));
});

test("up cleans a stale proxy state, says so honestly, and starts fresh", async () => {
  const project = tempProject();
  const result = await upProject({
    project_dir: project,
    start_runtime: false,
    probe_daemon: async () => ({ running: false, state: null, reason: "stale_state_removed" }),
    probe_port: async () => false,
  });

  assert.equal(result.proxy.action, "start");
  assert.ok(result.warnings.some((warning) => warning.toLowerCase().includes("stale")));
  assert.ok(renderUp(result).toLowerCase().includes("stale"));
});

test("renderUp is honest about the process model: background by default, foreground on request", async () => {
  const project = tempProject();
  const result = await upProject({
    project_dir: project,
    start_runtime: false,
    probe_daemon: async () => ({ running: false, state: null, reason: "no_state" }),
    probe_port: async () => false,
  });
  assert.equal(result.proxy.action, "start");
  const background = renderUp(result);
  assert.ok(background.toLowerCase().includes("background"));
  assert.equal(background.includes("Ctrl-C stops it"), false);
  const foreground = renderUp(result, { foreground: true });
  assert.ok(foreground.includes("Ctrl-C"));
});

test("down reports each component honestly and is ok when the end state is nothing-running", async () => {
  const project = tempProject();
  const result = await downProject({
    project_dir: project,
    stop_proxy: async () => ({ status: "stopped", pid: 71, forced: false }),
    stop_runtime: () => ({ status: "stopped", detail: "Sent SIGTERM to Kage daemon pid 72." }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.proxy.status, "stopped");
  assert.equal(result.runtime.status, "stopped");
  const rendered = renderDown(result);
  assert.ok(rendered.includes("71"));
  assert.ok(rendered.includes("72"));
  assert.match(rendered, /proxy/i);
  assert.match(rendered, /runtime/i);
});

test("down when nothing runs is a clean no-op, never an error", async () => {
  const project = tempProject();
  const result = await downProject({
    project_dir: project,
    stop_proxy: async () => ({ status: "was_not_running" }),
    stop_runtime: () => ({ status: "was_not_running", detail: null }),
  });
  assert.equal(result.ok, true);
  const rendered = renderDown(result);
  assert.match(rendered, /was not running/);
});

test("down surfaces a proxy that would not die as a failure, not a shrug", async () => {
  const project = tempProject();
  const result = await downProject({
    project_dir: project,
    stop_proxy: async () => ({ status: "stop_failed", pid: 9, detail: "pid 9 is still alive after SIGTERM and SIGKILL" }),
    stop_runtime: () => ({ status: "was_not_running", detail: null }),
  });
  assert.equal(result.ok, false);
  assert.ok(renderDown(result).includes("still alive"));
});

test("runtimeDownFrom maps the legacy stopDaemon outcomes to honest per-component states", () => {
  const stopped = runtimeDownFrom(() => ({ ok: true, message: "Sent SIGTERM to Kage daemon pid 88.", status: { pid: 88 } }), "/tmp/x");
  assert.equal(stopped.status, "stopped");
  assert.ok(stopped.detail?.includes("88"));

  const missing = runtimeDownFrom(() => ({ ok: false, message: "No daemon status file found." }), "/tmp/x");
  assert.equal(missing.status, "was_not_running");

  // A SIGKILL'd daemon leaves its status file behind; SIGTERM to its pid throws ESRCH. That is a
  // stale status, not a live daemon and not a successful stop.
  const stale = runtimeDownFrom(() => ({ ok: false, message: "kill ESRCH", status: { pid: 89 } }), "/tmp/x");
  assert.equal(stale.status, "stale_status");
});

// ---------------------------------------------------------------------------------------------
// kage run — auto-discovery of the background proxy's verified port
// ---------------------------------------------------------------------------------------------

test("run auto-discovers the background proxy's recorded port when --port is not given", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  const envFile = join(project, "child-env.txt");
  try {
    // A REAL verified state: this test process is a live node pid and the listener accepts.
    writeProxyDaemonState(project, daemonRecord(project, { port: listener.port }));
    const result = await runWithProxy({
      project_dir: project,
      command: [
        process.execPath,
        "-e",
        'require("fs").writeFileSync(process.argv[1], process.env.ANTHROPIC_BASE_URL ?? "unset"); process.exit(0);',
        envFile,
      ],
      stdio: "ignore",
    });
    assert.equal(result.ok, true);
    assert.equal(result.base_url, `http://localhost:${listener.port}`);
    assert.equal(readFileSync(envFile, "utf8"), `http://localhost:${listener.port}`);
  } finally {
    await listener.close();
  }
});

test("run without a verified proxy falls back to the default port and fails fast with the kage-up hint", async () => {
  const project = tempProject();
  const result = await runWithProxy({
    project_dir: project,
    command: [process.execPath, "-e", "process.exit(0)"],
    discover_port: async () => null,
    probe_port: async () => false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.equal(result.base_url, "http://localhost:8788");
  assert.ok(result.hint?.includes("kage up"));
});

// ---------------------------------------------------------------------------------------------
// kage status — the proxy block comes from the VERIFIED state, never from the file alone
// ---------------------------------------------------------------------------------------------

test("status reports the verified background proxy and never fabricates one", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  try {
    writeProxyDaemonState(project, daemonRecord(project, { port: listener.port, mode: "audit" }));
    const report = await vnextStatus(fixtureRuntimeClient({ project_dir: project }));
    assert.equal(report.proxy.running, true);
    assert.equal(report.proxy.pid, process.pid);
    assert.equal(report.proxy.port, listener.port);
    assert.equal(report.proxy.mode, "audit");
    assert.ok(report.proxy.log_path?.endsWith("proxy.log"));
    assert.equal(report.proxy.reason, null);
    assert.match(renderStatus(report), /proxy:/);
  } finally {
    await listener.close();
  }
});

test("status reports a stale proxy state as not running with the reason, and cleans the file", async () => {
  const project = tempProject();
  // The 860a272 shape: a state file whose pid is alive (this process) but whose port is dead.
  writeProxyDaemonState(project, daemonRecord(project, { port: await freeLoopbackPort() }));
  const report = await vnextStatus(fixtureRuntimeClient({ project_dir: project }));
  assert.equal(report.proxy.running, false);
  assert.equal(report.proxy.reason, "stale_state_removed");
  assert.equal(report.proxy.pid, null);
  assert.equal(report.proxy.port, null);
  assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
});

test("status with no proxy state says not running with no_state, not a fabricated proxy", async () => {
  const project = tempProject();
  const report = await vnextStatus(fixtureRuntimeClient({ project_dir: project }));
  assert.equal(report.proxy.running, false);
  assert.equal(report.proxy.reason, "no_state");
  assert.match(renderStatus(report), /proxy:\s+not running \(no_state\)/);
});

// ---------------------------------------------------------------------------------------------
// end to end: the REAL `kage proxy` child, driven through up (background) -> run -> down
// ---------------------------------------------------------------------------------------------

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 15_000, stepMs = 150): Promise<void> {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`condition not reached within ${timeoutMs} ms`);
    await new Promise((done) => setTimeout(done, stepMs));
  }
}

test("end to end: kage up starts a real background proxy that outlives it; run wraps it; down stops it", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const cli = join(__dirname, "..", "..", "cli.js");
  const kage = (...cliArgs: string[]) =>
    execFileSync(process.execPath, [cli, ...cliArgs], { encoding: "utf8" });
  let pid = 0;
  try {
    // up: the CLI process exits (execFileSync returns) while the detached proxy keeps serving —
    // that IS the survives-the-parent proof.
    const upOut = kage("up", "--project", project, "--port", String(port), "--no-runtime");
    const pidMatch = upOut.match(/background \(pid (\d+)/);
    assert.ok(pidMatch, `expected the up output to name the background pid, got:\n${upOut}`);
    pid = Number(pidMatch[1]);
    assert.ok(upOut.includes("kage down"));

    const probe = await proxyDaemonState(project);
    assert.equal(probe.running, true);
    if (probe.running) {
      assert.equal(probe.state.pid, pid);
      assert.equal(probe.state.port, port);
      assert.equal(probe.state.mode, "audit");
    }
    assert.equal(await probeLocalPort(port), true, "the proxy must still accept after the parent exited");

    // Second up: a no-op reuse, exit 0, naming the live pid.
    const again = kage("up", "--project", project, "--port", String(port), "--no-runtime");
    assert.match(again, /already running/);
    assert.ok(again.includes(String(pid)));

    // run with NO --port: auto-discovers the recorded port and wraps the child env.
    const envFile = join(project, "run-env.txt");
    kage(
      "run", "--project", project, "--",
      process.execPath, "-e",
      `require("fs").writeFileSync(${JSON.stringify(envFile)}, process.env.ANTHROPIC_BASE_URL ?? "unset");`,
    );
    assert.equal(readFileSync(envFile, "utf8"), `http://localhost:${port}`);

    // down: the pid is really gone, the state file is removed, the port refuses.
    const downOut = kage("down", "--project", project);
    assert.match(downOut, /stopped/);
    await waitFor(() => !pidAlive(pid), 5_000);
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
    assert.equal(await probeLocalPort(port), false);

    // down again: a clean no-op.
    const downAgain = kage("down", "--project", project);
    assert.match(downAgain, /was not running/);
  } finally {
    if (pid && pidAlive(pid)) {
      try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ }
    }
  }
});

test("up --foreground keeps the proxy in the terminal and writes no daemon state", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const cli = join(__dirname, "..", "..", "cli.js");
  const child = spawn(
    process.execPath,
    [cli, "up", "--project", project, "--port", String(port), "--no-runtime", "--foreground"],
    { stdio: "ignore" },
  );
  try {
    await waitFor(() => probeLocalPort(port));
    // The foreground proxy is user-managed: no state file, so `kage down` has nothing to claim.
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
  } finally {
    child.kill("SIGKILL");
  }
});
