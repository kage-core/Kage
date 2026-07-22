// Phase D gate — the end-to-end proof that Kage's context-efficiency transform is net-negative
// overhead, REVERSIBLE, and FAIL-OPEN, measured against a fake provider over a tool-heavy corpus.
//
// This test replays a synthetic corpus (no secrets, no customer code) of >=30 tool-heavy tasks
// through the real transform pipeline in both audit and assist mode, then asserts every Phase D
// completion-gate bullet that can be proven in-process:
//
//   - Byte preservation: audit forwards the client's exact bytes; assist preserves the
//     system/tools/cache-stable prefix byte-for-byte.
//   - Reversibility: every lossy transform embeds a retrieval reference whose exact original is
//     fingerprint-verified retrievable through the SHIPPED retrieval surface (task-scoped, 403 for
//     another task).
//   - Invariant retention: a critical safety invariant in the system prompt is never compressed away.
//   - Verification: each task's original tool payload is exactly reconstructable from the store.
//   - Cost/latency thresholds: >=20% p50 provider-input cost reduction, Kage processing cost <10% of
//     measured savings, p95 local latency <150 ms — all from MEASURED receipts.
//   - Protect automation: a measured-unhealthy cohort backs off to protect and records its reason.
//   - Fail-open: a task whose reversible store is unavailable forwards the ORIGINAL bytes and books
//     no fabricated saving.
//
// THE FAKE PROVIDER is the measurement ground truth: its count_tokens response is modeled as a
// deterministic function of the forwarded bytes. Kage itself never estimates — the number comes from
// the (fake) provider, exactly as the real proxy takes it from a real count_tokens probe.

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { test } from "node:test";

import { planProxyForward } from "./adapters/anthropic-proxy.js";
import { DEFAULT_CONTEXT_BUDGET_POLICY, type ContextBudgetPolicy } from "./gateway/budget-policy.js";
import { calculateCohort, ProtectController, cohortToBudgetCohort } from "./gateway/cohort-metrics.js";
import { builtinCompressorProvider } from "./gateway/compressors/provider.js";
import { ContentStore } from "./gateway/content-store.js";
import {
  transformRequest,
  type MessagesRequestBody,
  type TransformContext,
} from "./gateway/transform.js";
import { retrieve } from "./api/retrieve.js";
import { buildTransformationReceipt } from "./measurement/receipt.js";
import type { ProviderPriceSnapshot, PromptTokenBreakdown } from "./measurement/pricing.js";
import type { TokenCounter } from "./measurement/token-count.js";
import type { TransformationReceipt } from "./protocol/index.js";

const CORPUS_SIZE = 30;
const INVARIANT_SENTINEL = "INVARIANT: never delete production data or force-push to main.";

// A fixed, auditable price so the gate's dollar math is deterministic (claude-opus-4-8 list rate).
const PRICE: ProviderPriceSnapshot = {
  provider: "anthropic",
  model: "claude-opus-4-8",
  input_usd_per_million: 5,
  cache_read_usd_per_million: 0.5,
  cache_write_5m_usd_per_million: 6.25,
  cache_write_1h_usd_per_million: 10,
  effective_from: "2026-06-24",
  source: "test-fixture",
};

// The amortized local-compute cost of running the transform, per measured millisecond. A real,
// non-zero rate (a fraction of a cloud vCPU-second): Kage's processing is cheap, not FREE, and the
// gate proves it stays under 10% of the provider savings rather than pretending it is zero.
const LOCAL_COMPUTE_USD_PER_MS = 2e-8;

/** The fake provider's count_tokens: a deterministic function of the forwarded bytes. */
const fakeProviderCounter: TokenCounter = async (body: Buffer) => Math.ceil(body.byteLength / 4);

function uncached(tokens: number): PromptTokenBreakdown {
  return { uncached_input_tokens: tokens, cache_write_5m_tokens: 0, cache_write_1h_tokens: 0, cache_read_tokens: 0 };
}

interface CorpusTask {
  task_id: string;
  request: MessagesRequestBody;
  /** The exact tool_result content array that must be losslessly recoverable. */
  original_tool_content: unknown;
}

// A tool-heavy task: a short system prompt carrying a CRITICAL INVARIANT, a tool, and a final user
// turn whose tool_result holds a large, highly compressible log block. Deterministic by index.
function buildTask(index: number): CorpusTask {
  const lines = [`starting task ${index}`];
  for (let i = 0; i < 400; i += 1) lines.push(`compiling module foo_${index}`);
  lines.push(`task ${index} done`);
  const logBlock = lines.join("\n");
  const originalToolContent = [{ type: "text", text: logBlock }];
  const request: MessagesRequestBody = {
    model: "claude-opus-4-8",
    system: [
      { type: "text", text: "You are Claude Code." },
      { type: "text", text: INVARIANT_SENTINEL },
    ],
    tools: [{ name: "bash", description: "run a shell command" }],
    messages: [
      { role: "user", content: `run the build for task ${index}` },
      { role: "assistant", content: [{ type: "tool_use", id: `t${index}`, name: "bash", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: `t${index}`, content: originalToolContent }] },
    ],
  };
  return { task_id: `task_${index}`, request, original_tool_content: originalToolContent };
}

function assistContext(store: ContentStore, task: CorpusTask, policy: ContextBudgetPolicy): TransformContext {
  return {
    task_id: task.task_id,
    request_id: `req_${task.task_id}`,
    provider: "anthropic",
    store,
    policy,
    compressorProvider: builtinCompressorProvider(),
    context_window: 200_000,
    injection: null,
    lossy: true,
    tokenCounter: fakeProviderCounter,
  };
}

function tempStore(): ContentStore {
  return new ContentStore({ root: mkdtempSync(join(tmpdir(), "kage-gate-")) });
}

// ---------------------------------------------------------------------------------------------
// the gate replay
// ---------------------------------------------------------------------------------------------

test("Phase D gate: >=30 tool-heavy tasks replay reversibly, byte-preserving, net-negative overhead", async () => {
  const store = tempStore();
  const policy: ContextBudgetPolicy = { ...DEFAULT_CONTEXT_BUDGET_POLICY, mode: "assist", lossy_compression: true };
  const receipts: TransformationReceipt[] = [];

  let bytePreservedTasks = 0;
  let invariantRetainedTasks = 0;
  let verifiedTasks = 0;
  let lossyTasks = 0;
  let sumBeforeCost = 0;
  let sumAfterCost = 0;

  for (let index = 0; index < CORPUS_SIZE; index += 1) {
    const task = buildTask(index);
    const originalBuffer = Buffer.from(JSON.stringify(task.request), "utf8");

    // --- assist: transform + measure -------------------------------------------------------
    const start = performance.now();
    const assist = await transformRequest(task.request, assistContext(store, task, policy));
    const latencyMs = Math.max(0, performance.now() - start);
    const transformedBuffer = Buffer.from(JSON.stringify(assist.request), "utf8");

    // Byte-preserving cache-stable prefix: system, tools, and every older message are untouched.
    assert.deepEqual(assist.request.system, task.request.system);
    assert.deepEqual(assist.request.tools, task.request.tools);
    assert.deepEqual(assist.request.messages.slice(0, -1), task.request.messages.slice(0, -1));
    bytePreservedTasks += 1;

    // Invariant retention: the critical safety invariant survives the transform byte-for-byte.
    const systemText = JSON.stringify(assist.request.system);
    assert.ok(systemText.includes(INVARIANT_SENTINEL), `task ${index} lost its safety invariant`);
    invariantRetainedTasks += 1;

    // The corpus is engineered to compress; every task must produce a lossy transform.
    assert.ok(assist.retrieval_ids.length >= 1, `task ${index} produced no reversible transform`);
    lossyTasks += 1;
    const retrievalId = assist.retrieval_ids[0];

    // Reversibility through the SHIPPED retrieval surface: the owner gets the exact original back...
    const owner = retrieve(retrievalId, { store, task_id: task.task_id });
    assert.equal(owner.status, 200);
    assert.deepEqual(JSON.parse((owner.body as Buffer).toString("utf8")), task.original_tool_content);
    // ...and a different task is denied (reversible, but strictly task-scoped).
    const stranger = retrieve(retrievalId, { store, task_id: "task_intruder" });
    assert.equal(stranger.status, 403);

    // Verification: the original tool payload is exactly reconstructable — a lossy transform that
    // could not be reversed would fail here.
    verifiedTasks += 1;

    // --- audit: same request, byte-identical forward --------------------------------------
    const auditPlan = planProxyForward({
      mode: "audit",
      original: originalBuffer,
      transformed: transformedBuffer,
      transformations: assist.receipt.transformations,
    });
    assert.ok(auditPlan.forwarded.equals(originalBuffer), `task ${index} audit did not forward original bytes`);

    // assist forwards the transformed candidate.
    const assistPlan = planProxyForward({
      mode: "assist",
      original: originalBuffer,
      transformed: transformedBuffer,
      transformations: assist.receipt.transformations,
    });
    assert.ok(assistPlan.forwarded.equals(transformedBuffer));

    // --- measured receipt (fake provider is the ground truth) ------------------------------
    const beforeTokens = (await fakeProviderCounter(originalBuffer)) as number;
    const afterTokens = (await fakeProviderCounter(transformedBuffer)) as number;
    const receipt = buildTransformationReceipt({
      task_id: task.task_id,
      request_id: `req_${task.task_id}`,
      provider: "anthropic",
      model: "claude-opus-4-8",
      mode: "assist",
      before: originalBuffer,
      after: transformedBuffer,
      before_tokens: beforeTokens,
      after_tokens: afterTokens,
      before_breakdown: uncached(beforeTokens),
      after_breakdown: uncached(afterTokens),
      latency_ms: latencyMs,
      transformations: assist.receipt.transformations,
      price: PRICE,
    });
    // Kage's OWN measured processing cost: local compute time * an explicit rate. Non-zero, honest.
    receipt.kage_processing_cost_usd = latencyMs * LOCAL_COMPUTE_USD_PER_MS;
    receipts.push(receipt);

    sumBeforeCost += receipt.provider_input_cost_before_usd as number;
    sumAfterCost += receipt.provider_input_cost_after_usd as number;
  }

  // --- corpus-level gate assertions --------------------------------------------------------
  assert.ok(receipts.length >= CORPUS_SIZE, "corpus must be at least 30 tasks");
  assert.equal(bytePreservedTasks, CORPUS_SIZE, "every task must preserve the cache-stable prefix");
  assert.equal(invariantRetainedTasks, CORPUS_SIZE, "every task must retain its safety invariant");
  assert.equal(verifiedTasks, CORPUS_SIZE, "every lossy transform must be exactly reversible");
  assert.equal(lossyTasks, CORPUS_SIZE);

  const cohort = calculateCohort(receipts);
  assert.equal(cohort.exact_receipts, CORPUS_SIZE, "fake provider measures both sides -> exact");
  assert.equal(cohort.unavailable_receipts, 0);

  // >=20% p50 provider-input cost reduction. The p50 net delta is negative (a saving); the reduction
  // is measured against the two-sided-priced receipts only.
  assert.ok(
    (cohort.p50_net_input_cost_delta_usd as number) < 0,
    "p50 net input cost delta must be a saving (negative)",
  );
  const measuredSavings = sumBeforeCost - sumAfterCost;
  const reduction = measuredSavings / sumBeforeCost;
  assert.ok(reduction >= 0.2, `provider-input cost reduction ${(reduction * 100).toFixed(1)}% < 20%`);

  // Kage processing cost < 10% of measured provider savings (and non-zero: it is not free).
  const kageCost = cohort.kage_processing_cost_total_usd as number;
  assert.ok(kageCost > 0, "Kage processing cost must be measured, not a fabricated zero");
  assert.ok(kageCost < 0.1 * measuredSavings, `Kage cost ${kageCost} >= 10% of savings ${measuredSavings}`);

  // p95 local transformation latency < 150 ms.
  assert.ok(cohort.p95_latency_ms !== null);
  assert.ok(
    (cohort.p95_latency_ms as number) < 150,
    `p95 local latency ${cohort.p95_latency_ms} ms >= 150 ms`,
  );

  // retrieval rate: every receipt carried a reversible transform.
  assert.equal(cohort.retrieval_rate, 1);
});

// ---------------------------------------------------------------------------------------------
// protect-mode automation from a measured cohort
// ---------------------------------------------------------------------------------------------

test("Phase D gate: a measured-unhealthy cohort backs off to protect and records its reason", () => {
  const controller = new ProtectController({ ...DEFAULT_CONTEXT_BUDGET_POLICY, mode: "assist" });

  // A cohort that raised provider input cost (positive net delta) is measured-unhealthy.
  const harmful: TransformationReceipt[] = [];
  for (let i = 0; i < 5; i += 1) {
    harmful.push(
      buildTransformationReceipt({
        task_id: `bad_${i}`,
        request_id: `req_bad_${i}`,
        provider: "anthropic",
        model: "claude-opus-4-8",
        mode: "assist",
        before: Buffer.from("small"),
        after: Buffer.from("a much larger transformed body that cost more"),
        before_tokens: 100,
        after_tokens: 300,
        before_breakdown: uncached(100),
        after_breakdown: uncached(300),
        latency_ms: 5,
        transformations: ["context_inject"],
        price: PRICE,
      }),
    );
  }
  const harmfulCohort = calculateCohort(harmful);
  const budgetCohort = cohortToBudgetCohort(harmfulCohort);
  assert.ok((budgetCohort.p50_net_cost_delta_usd as number) > 0, "harmful cohort must show positive net cost");

  controller.observe({
    p50_net_input_cost_delta_usd: harmfulCohort.p50_net_input_cost_delta_usd,
    p95_latency_ms: harmfulCohort.p95_latency_ms,
    tasks: harmful.length,
  });
  assert.equal(controller.state().mode, "protect");
  assert.ok(controller.state().reasons.includes("positive_net_cost"), "protect must attribute its reason");
});

// ---------------------------------------------------------------------------------------------
// fail-open: an unavailable reversible store forwards original bytes and books no saving
// ---------------------------------------------------------------------------------------------

test("Phase D gate: an unavailable reversible store fails open, byte-preserving, with no saving", async () => {
  const task = buildTask(0);
  const originalBuffer = Buffer.from(JSON.stringify(task.request), "utf8");

  // store: null disables every lossy transform — the pipeline must fail open to the exact input.
  const context: TransformContext = {
    task_id: task.task_id,
    provider: "anthropic",
    store: null,
    policy: { ...DEFAULT_CONTEXT_BUDGET_POLICY, mode: "assist", lossy_compression: true },
    compressorProvider: builtinCompressorProvider(),
    context_window: 200_000,
    injection: null,
    lossy: true,
    tokenCounter: fakeProviderCounter,
  };

  const result = await transformRequest(task.request, context);
  assert.equal(result.retrieval_ids.length, 0, "no store means no reversible output, so no lossy transform");
  assert.ok(!result.receipt.transformations.includes("payload_compress"));

  // The wire forwards the client's exact bytes; no fabricated saving.
  const transformedBuffer = Buffer.from(JSON.stringify(result.request), "utf8");
  const plan = planProxyForward({ mode: "assist", original: originalBuffer, transformed: transformedBuffer });
  assert.ok(plan.forwarded.equals(originalBuffer), "fail-open must forward the original bytes");
  assert.deepEqual(result.request, task.request);
});
