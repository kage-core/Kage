import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TransformationReceipt } from "../protocol/index.js";
import {
  createRuntimeClient,
  probeRuntimeHealth,
  type ReceiptQuery,
  type RuntimeClient,
  type RuntimeHealth,
} from "./client.js";
import {
  auditConfig,
  readVnextConfig,
  vnextConfigPath,
  writeVnextConfig,
  type VnextAdapter,
  type VnextConfig,
} from "./config.js";
import { resolveRuntimePaths } from "./paths.js";
import { assertVnextRuntime } from "./runtime-version.js";

// ---------------------------------------------------------------------------------------------
// connect
// ---------------------------------------------------------------------------------------------

export type MemoryInitializer = (projectDir: string) => void;
export type RuntimeStarter = (projectDir: string) => Promise<void>;

export interface ConnectOptions {
  project_dir: string;
  agents?: string[];
  /** Defaults to true. `false` writes config only — no process is launched. */
  start?: boolean;
  /** Injected by the CLI so this module never imports the legacy kernel. */
  initialize_memory?: MemoryInitializer;
  start_runtime?: RuntimeStarter;
}

export interface ConnectAdapterState {
  adapter: VnextAdapter;
  /** How the adapter actually attaches once the runtime is live. */
  activation: string;
}

export interface ConnectRuntimeState {
  supported: boolean;
  started: boolean;
  running: boolean;
  url: string | null;
  reason: "started" | "already_running" | "not_requested" | "runtime_unsupported" | "start_failed";
}

export interface ConnectResult {
  ok: boolean;
  project_dir: string;
  memory_initialized: boolean;
  config: VnextConfig;
  config_path: string;
  /**
   * Phase A's whole safety claim, stated as a field so a reviewer (and a test) can see it: audit
   * mode forwards the agent's exact bytes. Kage adds context to a request only in assist mode,
   * which `connect` cannot turn on.
   */
  mutates_prompts: false;
  adapters: ConnectAdapterState[];
  runtime: ConnectRuntimeState;
  warnings: string[];
}

const ADAPTER_ACTIVATION: Record<VnextAdapter, string> = {
  "claude-code": "Claude Code hooks post evidence to the local runtime when it is live; they exit 0 when it is not.",
  proxy: "kage proxy --mode audit records receipts and forwards the client's exact bytes.",
};

function defaultRuntimeStarter(projectDir: string): Promise<void> {
  // A detached child, because `kage connect` must return. The daemon owns the runtime lifetime;
  // connect only asks for it.
  const cli = join(__dirname, "..", "..", "cli.js");
  const child = spawn(process.execPath, [cli, "daemon", "start", "--project", projectDir, "--vnext"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return Promise.resolve();
}

async function waitForRuntime(projectDir: string, attempts = 20): Promise<RuntimeHealth> {
  let health = await probeRuntimeHealth(projectDir);
  for (let attempt = 0; attempt < attempts && !health.running; attempt += 1) {
    await new Promise((done) => setTimeout(done, 150));
    health = await probeRuntimeHealth(projectDir);
  }
  return health;
}

/**
 * The first command a user runs. It writes the audit config, records the adapters, and — only on
 * a runtime that can actually host the local daemon — starts it. It never enables prompt
 * mutation: `ConnectOptions` has no mode, and `auditConfig` has no other value to write.
 */
export async function connectProject(options: ConnectOptions): Promise<ConnectResult> {
  const projectDir = resolve(options.project_dir);
  const warnings: string[] = [];

  let memoryInitialized = false;
  if (!existsSync(join(projectDir, ".agent_memory", "packets"))) {
    if (options.initialize_memory) {
      options.initialize_memory(projectDir);
      memoryInitialized = true;
    } else {
      warnings.push("Kage memory is not initialized in this project; run `kage init --project <dir>` first.");
    }
  }

  const config = auditConfig(options.agents);
  const configPath = writeVnextConfig(projectDir, config);
  const adapters = config.vnext.adapters.map((adapter) => ({ adapter, activation: ADAPTER_ACTIVATION[adapter] }));

  const runtime: ConnectRuntimeState = {
    supported: true,
    started: false,
    running: false,
    url: null,
    reason: "not_requested",
  };

  try {
    assertVnextRuntime();
  } catch (error) {
    runtime.supported = false;
    runtime.reason = "runtime_unsupported";
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  if (options.start !== false && runtime.supported) {
    const existing = await probeRuntimeHealth(projectDir);
    if (existing.running) {
      runtime.running = true;
      runtime.url = existing.url;
      runtime.reason = "already_running";
    } else {
      try {
        await (options.start_runtime ?? defaultRuntimeStarter)(projectDir);
        const health = await waitForRuntime(projectDir);
        runtime.started = health.running;
        runtime.running = health.running;
        runtime.url = health.url;
        runtime.reason = health.running ? "started" : "start_failed";
        if (!health.running) {
          warnings.push("The Kage vNext runtime did not become healthy; legacy Kage keeps working and adapters stay inert.");
        }
      } catch (error) {
        runtime.reason = "start_failed";
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  return {
    ok: true,
    project_dir: projectDir,
    memory_initialized: memoryInitialized,
    config,
    config_path: configPath,
    mutates_prompts: false,
    adapters,
    runtime,
    warnings,
  };
}

export function renderConnect(result: ConnectResult): string {
  const lines = [
    `Connected ${result.project_dir} in audit mode.`,
    `  config:   ${result.config_path}`,
    `  runtime:  ${result.config.vnext.runtime}   gateway: ${result.config.vnext.gateway}   (audit forwards your agent's exact bytes; Kage mutates no prompt)`,
    `  adapters: ${result.adapters.length ? result.adapters.map((entry) => entry.adapter).join(", ") : "none"}`,
    `  daemon:   ${result.runtime.running ? `running at ${result.runtime.url}` : `not running (${result.runtime.reason})`}`,
  ];
  for (const warning of result.warnings) lines.push(`  warning:  ${warning}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// measurement aggregation — the honesty core of this file
// ---------------------------------------------------------------------------------------------

export interface MeasurementCoverage {
  exact: number;
  partial: number;
  unavailable: number;
}

export interface TokenDeltaReport {
  available: boolean;
  reason: string | null;
  /** Receipts where BOTH token totals were measured. Nothing else can enter a delta. */
  receipts: number;
  before_input_tokens: number | null;
  after_input_tokens: number | null;
  /** before - after. Negative means Kage's candidate prompt was LARGER. */
  delta_tokens: number | null;
}

export interface CostDeltaReport {
  available: boolean;
  reason: string | null;
  receipts: number;
  before_usd: number | null;
  after_usd: number | null;
  delta_usd: number | null;
}

function unavailableTokenDelta(reason: string): TokenDeltaReport {
  return {
    available: false,
    reason,
    receipts: 0,
    before_input_tokens: null,
    after_input_tokens: null,
    delta_tokens: null,
  };
}

function unavailableCostDelta(reason: string): CostDeltaReport {
  return { available: false, reason, receipts: 0, before_usd: null, after_usd: null, delta_usd: null };
}

function coverageOf(receipts: readonly TransformationReceipt[]): MeasurementCoverage {
  const coverage: MeasurementCoverage = { exact: 0, partial: 0, unavailable: 0 };
  for (const receipt of receipts) coverage[receipt.measurement_quality] += 1;
  return coverage;
}

/**
 * A token delta over the receipts whose BOTH sides a provider measured. A receipt with one side
 * measured contributes nothing: adding it would silently price the missing side at zero, which is
 * exactly the fabricated saving Phase A exists to make impossible.
 */
export function tokenDelta(receipts: readonly TransformationReceipt[]): TokenDeltaReport {
  const pairs = receipts.filter(
    (receipt) => receipt.before_input_tokens !== null && receipt.after_input_tokens !== null,
  );
  if (!pairs.length) {
    return {
      available: false,
      reason: "no_measured_token_pair",
      receipts: 0,
      before_input_tokens: null,
      after_input_tokens: null,
      delta_tokens: null,
    };
  }
  const before = pairs.reduce((total, receipt) => total + (receipt.before_input_tokens as number), 0);
  const after = pairs.reduce((total, receipt) => total + (receipt.after_input_tokens as number), 0);
  return {
    available: true,
    reason: null,
    receipts: pairs.length,
    before_input_tokens: before,
    after_input_tokens: after,
    delta_tokens: before - after,
  };
}

/**
 * A cost delta over the receipts whose BOTH sides carry a MEASURED cost.
 *
 * This is much rarer than a token delta, and deliberately so. An audit-mode receipt measures the
 * `after` side with count_tokens, which reports a token total and NOTHING about caching — and a
 * prompt priced as if every token were uncached can overstate a cached request by ~10x. Task 6
 * therefore leaves `provider_input_cost_after_usd` null on every audit-mode receipt. A one-sided
 * cost is UNUSABLE here, never zero: `before - 0` would report the entire request cost as a
 * saving. When no receipt is priced on both sides, the honest answer is "unavailable".
 */
export function costDelta(receipts: readonly TransformationReceipt[]): CostDeltaReport {
  const pairs = receipts.filter(
    (receipt) =>
      receipt.provider_input_cost_before_usd !== null && receipt.provider_input_cost_after_usd !== null,
  );
  if (!pairs.length) {
    return {
      available: false,
      reason: "no_two_sided_cost_measurement",
      receipts: 0,
      before_usd: null,
      after_usd: null,
      delta_usd: null,
    };
  }
  const before = pairs.reduce((total, receipt) => total + (receipt.provider_input_cost_before_usd as number), 0);
  const after = pairs.reduce((total, receipt) => total + (receipt.provider_input_cost_after_usd as number), 0);
  return {
    available: true,
    reason: null,
    receipts: pairs.length,
    before_usd: before,
    after_usd: after,
    delta_usd: before - after,
  };
}

// ---------------------------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------------------------

export interface VnextStatusReport {
  ok: boolean;
  project_dir: string;
  connected: boolean;
  mode: "audit" | "assist" | null;
  gateway: "audit" | "assist" | null;
  adapters: VnextAdapter[];
  runtime: RuntimeHealth;
  receipts: { available: boolean; reason: string | null; total: number | null; tasks: number | null };
  /**
   * Three counts, never one percentage: a single "measured %" would hide the unavailable slice,
   * and the unavailable slice is the finding. Null — not three zeros — when the receipt store
   * could not be read at all, because "we could not look" is not "nothing was transformed".
   */
  measurement: MeasurementCoverage | null;
  /**
   * Receipts exist only for requests Kage ACTUALLY TRANSFORMED — a zero-recall request writes
   * none. So coverage is a share of transformed requests, not of all agent traffic.
   */
  measurement_scope: "transformed_requests";
  token_delta: TokenDeltaReport;
  cost_delta: CostDeltaReport;
}

export async function vnextStatus(client: RuntimeClient): Promise<VnextStatusReport> {
  const projectDir = resolve(client.project_dir);
  const config = readVnextConfig(projectDir);
  const runtime = await client.health();
  const query = await client.receipts();
  const receipts = query.available ? query.receipts : [];
  const unreadable = query.available ? null : (query.reason ?? "receipts_unavailable");

  return {
    ok: true,
    project_dir: projectDir,
    connected: config !== null,
    mode: config?.vnext.runtime ?? null,
    gateway: config?.vnext.gateway ?? null,
    adapters: config?.vnext.adapters ?? [],
    runtime,
    receipts: {
      available: query.available,
      reason: query.reason,
      total: query.available ? receipts.length : null,
      tasks: query.available ? new Set(receipts.map((receipt) => receipt.task_id)).size : null,
    },
    measurement: unreadable ? null : coverageOf(receipts),
    measurement_scope: "transformed_requests",
    token_delta: unreadable ? unavailableTokenDelta(unreadable) : tokenDelta(receipts),
    cost_delta: unreadable ? unavailableCostDelta(unreadable) : costDelta(receipts),
  };
}

function renderTokenDelta(delta: TokenDeltaReport): string {
  if (!delta.available) return `  input tokens:  unavailable (${delta.reason})`;
  const sign = (delta.delta_tokens as number) >= 0 ? "-" : "+";
  return `  input tokens:  before ${delta.before_input_tokens} → after ${delta.after_input_tokens} (${sign}${Math.abs(delta.delta_tokens as number)} tokens, measured on ${delta.receipts} receipt${delta.receipts === 1 ? "" : "s"})`;
}

function renderCostDelta(delta: CostDeltaReport): string {
  if (!delta.available) {
    return `  input cost:    unavailable (${delta.reason}) — audit-mode receipts measure the forwarded prompt's tokens but not its cache breakdown, so no honest cost delta exists yet`;
  }
  return `  input cost:    before $${(delta.before_usd as number).toFixed(6)} → after $${(delta.after_usd as number).toFixed(6)} (delta $${(delta.delta_usd as number).toFixed(6)}, measured on ${delta.receipts} receipt${delta.receipts === 1 ? "" : "s"})`;
}

export function renderStatus(report: VnextStatusReport): string {
  const lines = [
    `Kage vNext status — ${report.project_dir}`,
    `  connected:     ${report.connected ? `yes (runtime ${report.mode}, gateway ${report.gateway})` : "no — run `kage connect --project <dir>`"}`,
    `  adapters:      ${report.adapters.length ? report.adapters.join(", ") : "none"}`,
    `  runtime:       ${report.runtime.running ? `running at ${report.runtime.url} (protocol v${report.runtime.protocol_version})` : `not running (${report.runtime.reason})`}`,
  ];

  if (!report.receipts.available) {
    lines.push(`  receipts:      unavailable (${report.receipts.reason})`);
  } else {
    lines.push(`  receipts:      ${report.receipts.total} across ${report.receipts.tasks} task${report.receipts.tasks === 1 ? "" : "s"}`);
  }

  lines.push(
    "",
    "Measurement of transformed requests (a request Kage did not transform writes no receipt):",
    report.measurement
      ? `  exact ${report.measurement.exact}, partial ${report.measurement.partial}, unavailable ${report.measurement.unavailable}`
      : `  unavailable (${report.receipts.reason}) — the receipt store could not be read, which is not the same as no request being transformed`,
    renderTokenDelta(report.token_delta),
    renderCostDelta(report.cost_delta),
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// receipts
// ---------------------------------------------------------------------------------------------

export interface ReceiptRowReport {
  receipt_id: string;
  task_id: string;
  request_id: string;
  provider: string;
  model: string | null;
  mode: TransformationReceipt["mode"];
  measurement_quality: TransformationReceipt["measurement_quality"];
  before_input_bytes: number;
  after_input_bytes: number;
  before_input_tokens: number | null;
  after_input_tokens: number | null;
  delta_input_tokens: number | null;
  provider_input_cost_before_usd: number | null;
  provider_input_cost_after_usd: number | null;
  delta_input_cost_usd: number | null;
  kage_processing_cost_usd: number | null;
  latency_ms: number;
  transformations: string[];
  created_at: string;
}

export interface ReceiptsReport {
  ok: boolean;
  project_dir: string;
  task_id: string | null;
  available: boolean;
  reason: string | null;
  measurement: MeasurementCoverage | null;
  measurement_scope: "transformed_requests";
  receipts: ReceiptRowReport[];
  token_delta: TokenDeltaReport;
  cost_delta: CostDeltaReport;
}

/**
 * A row is the stored receipt plus exactly two derived fields, each of which exists only when
 * BOTH of its inputs were measured. Nothing here fills a missing measurement with a zero, and
 * nothing converts bytes into tokens.
 */
function receiptRow(receipt: TransformationReceipt): ReceiptRowReport {
  const tokensMeasured = receipt.before_input_tokens !== null && receipt.after_input_tokens !== null;
  const costMeasured =
    receipt.provider_input_cost_before_usd !== null && receipt.provider_input_cost_after_usd !== null;
  return {
    receipt_id: receipt.receipt_id,
    task_id: receipt.task_id,
    request_id: receipt.request_id,
    provider: receipt.provider,
    model: receipt.model,
    mode: receipt.mode,
    measurement_quality: receipt.measurement_quality,
    before_input_bytes: receipt.before_input_bytes,
    after_input_bytes: receipt.after_input_bytes,
    before_input_tokens: receipt.before_input_tokens,
    after_input_tokens: receipt.after_input_tokens,
    delta_input_tokens: tokensMeasured
      ? (receipt.before_input_tokens as number) - (receipt.after_input_tokens as number)
      : null,
    provider_input_cost_before_usd: receipt.provider_input_cost_before_usd,
    provider_input_cost_after_usd: receipt.provider_input_cost_after_usd,
    delta_input_cost_usd: costMeasured
      ? (receipt.provider_input_cost_before_usd as number) - (receipt.provider_input_cost_after_usd as number)
      : null,
    kage_processing_cost_usd: receipt.kage_processing_cost_usd,
    latency_ms: receipt.latency_ms,
    transformations: [...receipt.transformations],
    created_at: receipt.created_at,
  };
}

export async function vnextReceipts(client: RuntimeClient, query: ReceiptQuery = {}): Promise<ReceiptsReport> {
  const result = await client.receipts(query);
  const receipts = result.available ? result.receipts : [];
  const unreadable = result.available ? null : (result.reason ?? "receipts_unavailable");
  return {
    ok: true,
    project_dir: resolve(client.project_dir),
    task_id: query.task_id ?? null,
    available: result.available,
    reason: result.reason,
    measurement: unreadable ? null : coverageOf(receipts),
    measurement_scope: "transformed_requests",
    receipts: receipts.map(receiptRow),
    token_delta: unreadable ? unavailableTokenDelta(unreadable) : tokenDelta(receipts),
    cost_delta: unreadable ? unavailableCostDelta(unreadable) : costDelta(receipts),
  };
}

function tokens(value: number | null): string {
  return value === null ? "unavailable" : String(value);
}

function usd(value: number | null): string {
  return value === null ? "unavailable" : `$${value.toFixed(6)}`;
}

export function renderReceipts(report: ReceiptsReport): string {
  if (!report.available) return `Receipts unavailable (${report.reason}).`;
  if (!report.receipts.length) {
    return report.task_id
      ? `No transformation receipts for task ${report.task_id}. Kage writes a receipt only for a request it transformed.`
      : "No transformation receipts yet. Kage writes a receipt only for a request it transformed.";
  }

  const lines: string[] = [];
  for (const row of report.receipts) {
    lines.push(
      `${row.created_at}  ${row.receipt_id}  [${row.mode}] ${row.model ?? "unknown model"}  measurement: ${row.measurement_quality}`,
      `  task ${row.task_id}  request ${row.request_id}  latency ${row.latency_ms} ms`,
      `  input bytes:   before ${row.before_input_bytes} → after ${row.after_input_bytes}`,
      `  input tokens:  before ${tokens(row.before_input_tokens)} → after ${tokens(row.after_input_tokens)}  delta ${tokens(row.delta_input_tokens)}`,
      `  input cost:    before ${usd(row.provider_input_cost_before_usd)} → after ${usd(row.provider_input_cost_after_usd)}  delta ${usd(row.delta_input_cost_usd)}`,
      `  transformations: ${row.transformations.length ? row.transformations.join(", ") : "none"}`,
      "",
    );
  }
  lines.push(
    "Measurement of transformed requests:",
    `  exact ${report.measurement?.exact ?? 0}, partial ${report.measurement?.partial ?? 0}, unavailable ${report.measurement?.unavailable ?? 0}`,
    renderTokenDelta(report.token_delta),
    renderCostDelta(report.cost_delta),
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// shared helpers for the CLI
// ---------------------------------------------------------------------------------------------

export function runtimeClientFor(projectDir: string): RuntimeClient {
  return createRuntimeClient(projectDir);
}

export function vnextRuntimeDirectory(projectDir: string): string {
  return resolveRuntimePaths(projectDir).runtimeDirectory;
}

export { vnextConfigPath };
