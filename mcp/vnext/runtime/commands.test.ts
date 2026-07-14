import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildTransformationReceipt } from "../measurement/receipt.js";
import type { TransformationReceipt } from "../protocol/index.js";
import { readVnextConfig, vnextConfigPath } from "./config.js";
import type { ReceiptQuery, ReceiptQueryResult, RuntimeClient, RuntimeHealth } from "./client.js";
import {
  connectProject,
  renderReceipts,
  renderStatus,
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
}): TransformationReceipt {
  receiptCounter += 1;
  const before = options.before_tokens ?? 1_000;
  const after = options.after_tokens ?? 1_200;
  const beforeTokens = options.quality === "unavailable" ? null : before;
  const afterTokens = options.quality === "exact" ? after : null;
  return buildTransformationReceipt({
    task_id: options.task_id ?? "task_fixture",
    request_id: `req_${receiptCounter}`,
    receipt_id: `receipt_${receiptCounter}`,
    provider: "anthropic",
    model: "claude-opus-4-8",
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

function fixtureRuntimeClient(options: {
  project_dir: string;
  receipts?: TransformationReceipt[];
  available?: boolean;
  reason?: string | null;
  health?: Partial<RuntimeHealth>;
}): RuntimeClient {
  const receipts = options.receipts ?? [];
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
