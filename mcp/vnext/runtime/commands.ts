import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { join, resolve } from "node:path";
import { sessionAttachState, renderAttachState, type SessionAttachState } from "./attach-status.js";
import type { TransformationReceipt } from "../protocol/index.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
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
  type VnextMode,
} from "./config.js";
import { resolveRuntimePaths } from "./paths.js";
import {
  probeLocalPort,
  proxyDaemonState,
  stopProxyDaemon,
  type PortProbe,
  type ProxyDaemonProbe,
  type ProxyDaemonRecord,
  type StopProxyDaemonResult,
} from "./proxy-daemon.js";
import { assertVnextRuntime } from "./runtime-version.js";

// The daemon-lifecycle helpers are part of this module's public surface: the CLI (and the tests)
// reach the whole `up`/`run`/`down`/`status` toolkit through one import.
export {
  probeLocalPort,
  proxyDaemonPaths,
  proxyDaemonState,
  startProxyDaemon,
  stopProxyDaemon,
  writeProxyDaemonState,
} from "./proxy-daemon.js";
export type {
  PortProbe,
  ProxyDaemonProbe,
  ProxyDaemonRecord,
  StartProxyDaemonResult,
  StopProxyDaemonResult,
} from "./proxy-daemon.js";

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
// up — the one-command onramp: connect (audit config) + runtime daemon + a background-proxy plan
// ---------------------------------------------------------------------------------------------

export interface UpOptions {
  project_dir: string;
  /** Proxy port. Default 8788, same as `kage proxy`. */
  port?: number;
  /**
   * Governs the PROXY PROCESS alone, mirroring `kage proxy --mode`. The config `up` writes is
   * the audit-only connect config regardless — enabling prompt mutation on disk is not something
   * an onboarding command may do. Default audit, the safe onboarding default (bare `kage proxy`
   * keeps its historical assist default; the help text states the difference).
   */
  mode?: VnextMode;
  agents?: string[];
  /** Defaults to true. `false` plans without launching the runtime — the test seam, mirroring connect's start:false. */
  start_runtime?: boolean;
  /** Injected by the CLI so this module never imports the legacy kernel. */
  initialize_memory?: MemoryInitializer;
  runtime_starter?: RuntimeStarter;
  /** Injectable for tests. Defaults to the bounded TCP probe in proxy-daemon.ts. */
  probe_port?: PortProbe;
  /** Injectable for tests. Defaults to the VERIFIED daemon-state read (pid + port checked). */
  probe_daemon?: (projectDir: string) => Promise<ProxyDaemonProbe>;
}

export interface UpProxyPlan {
  /**
   * The one decision the CLI acts on.
   * "reuse_running": the VERIFIED daemon state (pid alive AND port accepting — never the file
   *   alone) says our background proxy already serves this project. Print its coordinates and
   *   exit 0; start nothing.
   * "start": no verified daemon and nothing owns the port, so start the proxy — detached into
   *   the background by default, or in the foreground when the user asked for it.
   * "already_listening": something we did NOT record owns the port. We cannot tell whose
   *   listener it is, so say exactly that, suggest --port, and exit 0 without overwriting any
   *   state. upProject itself never starts the proxy, which keeps the plan spawn-free and
   *   testable.
   */
  action: "start" | "already_listening" | "reuse_running";
  port: number;
  mode: VnextMode;
  /** The verified daemon record behind "reuse_running"; null for every other action. */
  daemon: ProxyDaemonRecord | null;
}

export interface UpResult {
  ok: boolean;
  project_dir: string;
  port: number;
  mode: VnextMode;
  base_url: string;
  /** The audit-only connect result — config path, adapters, runtime state, warnings. */
  connect: ConnectResult;
  proxy: UpProxyPlan;
  /** The crisp block printed before the proxy takes the terminal: what to do, where results land. */
  instructions: string[];
  warnings: string[];
}

function upInstructions(projectDir: string, port: number, mode: VnextMode): string[] {
  const baseUrl = `http://localhost:${port}`;
  return [
    "Point your agent through Kage — one thing left to do (either form):",
    "",
    `  export ANTHROPIC_BASE_URL=${baseUrl}    # in the terminal where your agent runs`,
    "  kage run -- claude                                 # or wrap a single command; no export needed",
    "",
    `See what Kage measured:  kage status --project ${projectDir}   (per-request: kage receipts --project ${projectDir})`,
    "",
    mode === "audit"
      ? "Mode: audit — measurement only. Kage forwards your agent's exact bytes and injects nothing."
      : "Mode: assist — verified repo memory will be injected into your agent's prompts (the last user turn).",
  ];
}

/**
 * Everything `kage up` decides, with no side effect beyond what `connect` already does (write the
 * audit config; start the detached runtime daemon when supported and requested — the singleton
 * lease and the health probe make a second daemon impossible) plus the stale-state cleanup the
 * verified daemon read performs. The proxy is deliberately NOT started here: the CLI does that
 * after the plan, so the plan stays testable without spawning long-lived processes and `--json`
 * has a complete document to print.
 *
 * The proxy decision runs on the VERIFIED daemon state first (see proxy-daemon.ts: pid alive AND
 * port accepting, never the file alone — the 860a272 lesson), and only then on the raw port
 * probe. A verified running proxy is reused with ITS port and mode: the flags do not beat a
 * process that is already serving, and the reuse says so instead of silently ignoring them.
 */
export async function upProject(options: UpOptions): Promise<UpResult> {
  const projectDir = resolve(options.project_dir);
  const requestedPort = options.port ?? 8788;
  const requestedMode: VnextMode = options.mode ?? "audit";

  // connect is byte-idempotent and audit-only: an already-connected project is re-confirmed, not
  // rewritten, and --mode assist cannot leak into the config (connect has no mode to pass).
  const connected = await connectProject({
    project_dir: projectDir,
    agents: options.agents,
    start: options.start_runtime !== false,
    initialize_memory: options.initialize_memory,
    start_runtime: options.runtime_starter,
  });
  const warnings = [...connected.warnings];

  const daemon = await (options.probe_daemon ?? proxyDaemonState)(projectDir);

  let proxy: UpProxyPlan;
  if (daemon.running) {
    proxy = { action: "reuse_running", port: daemon.state.port, mode: daemon.state.mode, daemon: daemon.state };
    if (options.port !== undefined && options.port !== daemon.state.port) {
      warnings.push(
        `--port ${options.port} ignored: the background proxy is already running on port ${daemon.state.port} — run \`kage down\` first to change ports.`,
      );
    }
    if (options.mode !== undefined && options.mode !== daemon.state.mode) {
      warnings.push(
        `--mode ${options.mode} ignored: the background proxy is already running in ${daemon.state.mode} mode — run \`kage down\` first to change modes.`,
      );
    }
  } else {
    if (daemon.reason === "stale_state_removed") {
      warnings.push(
        "a previous background-proxy state file was stale (its process or port was gone) — removed it; starting fresh.",
      );
    } else if (daemon.reason === "untrusted_state") {
      warnings.push(
        "found a proxy state file this user does not own (or with lax permissions) — ignoring it; remove .agent_memory/daemon/proxy.json yourself if it is unexpected.",
      );
    }
    const listening = await (options.probe_port ?? probeLocalPort)(requestedPort);
    proxy = { action: listening ? "already_listening" : "start", port: requestedPort, mode: requestedMode, daemon: null };
  }

  return {
    ok: true,
    project_dir: projectDir,
    port: proxy.port,
    mode: proxy.mode,
    base_url: `http://localhost:${proxy.port}`,
    connect: connected,
    proxy,
    instructions: upInstructions(projectDir, proxy.port, proxy.mode),
    warnings,
  };
}

// The runtime is optional by design: the proxy measures and serves traffic without it — evidence
// just isn't captured to /v2/events. Every degraded state below says exactly that, in one line.
function renderUpRuntime(state: ConnectRuntimeState): string {
  switch (state.reason) {
    case "started":
      return `running at ${state.url} — proxy evidence lands in /v2/events`;
    case "already_running":
      return `already running at ${state.url} — reusing it (the runtime is a singleton; no second one started)`;
    case "start_failed":
      return "did not start — the proxy still works; evidence just isn't captured to /v2/events";
    case "runtime_unsupported":
      return "unsupported on this Node — the proxy still works; evidence just isn't captured to /v2/events";
    default:
      return "not started (runtime start was not requested)";
  }
}

function renderUpProxyLine(result: UpResult, foreground: boolean): string {
  switch (result.proxy.action) {
    case "reuse_running": {
      const daemon = result.proxy.daemon as ProxyDaemonRecord;
      return `  proxy:    already running in the background (pid ${daemon.pid}, port ${daemon.port}, mode ${daemon.mode}) — reusing it; stop with \`kage down\``;
    }
    case "start":
      return foreground
        ? `  proxy:    starting on ${result.base_url} (${result.mode}) — foreground; Ctrl-C stops it`
        : `  proxy:    starting in the background on ${result.base_url} (${result.mode}) — stop with \`kage down\``;
    default:
      return `  proxy:    port ${result.port} already has a listener that is not our recorded proxy — cannot tell whose it is, so reusing it and exiting 0 (if that isn't a Kage proxy, rerun with --port <n>)`;
  }
}

export function renderUp(result: UpResult, options: { foreground?: boolean } = {}): string {
  const lines = [
    `Kage up — ${result.project_dir}`,
    "",
    `  config:   ${result.connect.config_path}   (audit-only; up never enables prompt mutation on disk)`,
    `  runtime:  ${renderUpRuntime(result.connect.runtime)}`,
    renderUpProxyLine(result, options.foreground === true),
  ];
  for (const warning of result.warnings) lines.push(`  note:     ${warning}`);
  lines.push("", ...result.instructions);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// down — the symmetric other half of up: stop the background proxy AND the runtime daemon
// ---------------------------------------------------------------------------------------------

export interface DownRuntimeReport {
  status: "stopped" | "was_not_running" | "stale_status" | "stop_failed";
  detail: string | null;
}

export type LegacyDaemonStop = (projectDir: string) => { ok: boolean; message: string; status?: { pid: number } };

/**
 * Adapt the legacy `stopDaemon` result (daemon.ts — the same code path `kage daemon stop` runs)
 * into an honest per-component state. The legacy daemon hosts the vNext runtime when `up` started
 * it with --vnext, so SIGTERM to that pid stops both. A stale status file — the daemon was
 * SIGKILL'd and its pid now throws ESRCH — is reported as stale, never as "stopped" (nothing was
 * stopped) and never as an error (nothing is running, which is what down promises).
 */
export function runtimeDownFrom(stop: LegacyDaemonStop, projectDir: string): DownRuntimeReport {
  const result = stop(projectDir);
  if (result.ok) return { status: "stopped", detail: result.message };
  if (/no daemon status file/i.test(result.message)) return { status: "was_not_running", detail: null };
  if (/ESRCH/.test(result.message)) {
    return {
      status: "stale_status",
      detail: `the daemon status file names pid ${result.status?.pid ?? "?"}, which is no longer running`,
    };
  }
  return { status: "stop_failed", detail: result.message };
}

export interface DownOptions {
  project_dir: string;
  /** Injectable for tests. Defaults to the verified stop in proxy-daemon.ts. */
  stop_proxy?: (projectDir: string) => Promise<StopProxyDaemonResult>;
  /** Injected by the CLI (wrapping daemon.ts's stopDaemon) so this module never imports the legacy kernel. */
  stop_runtime: (projectDir: string) => DownRuntimeReport;
}

export interface DownResult {
  ok: boolean;
  project_dir: string;
  proxy: StopProxyDaemonResult;
  runtime: DownRuntimeReport;
}

/**
 * Stop the whole stack `up` started. `ok` means the END STATE is "nothing running" — stopped,
 * was-not-running, and stale-state-cleaned all qualify; a process that survived SIGKILL or a
 * state file we refuse to trust does not, and the CLI exits 1 so the failure cannot pass silently.
 */
export async function downProject(options: DownOptions): Promise<DownResult> {
  const projectDir = resolve(options.project_dir);
  const proxy = await (options.stop_proxy ?? stopProxyDaemon)(projectDir);
  const runtime = options.stop_runtime(projectDir);
  const proxyDown = proxy.status === "stopped" || proxy.status === "was_not_running" || proxy.status === "stale_state_cleaned";
  const runtimeDown = runtime.status !== "stop_failed";
  return { ok: proxyDown && runtimeDown, project_dir: projectDir, proxy, runtime };
}

function renderDownProxy(proxy: StopProxyDaemonResult): string {
  switch (proxy.status) {
    case "stopped":
      return `  proxy:    stopped (pid ${proxy.pid}${proxy.forced ? ", forced with SIGKILL after the grace period" : ""}) — state file removed`;
    case "was_not_running":
      return "  proxy:    was not running (no background-proxy state; a foreground `kage proxy` is stopped with Ctrl-C in its own terminal)";
    case "stale_state_cleaned":
      return "  proxy:    was not running — a stale state file was left behind (its process or port was gone); cleaned it";
    case "untrusted_state":
      return `  proxy:    refusing to act on ${proxy.state_path}: this user does not own it (or its permissions are too open) — remove it yourself if it is unexpected`;
    default:
      return `  proxy:    FAILED to stop: ${proxy.detail}`;
  }
}

function renderDownRuntime(runtime: DownRuntimeReport): string {
  switch (runtime.status) {
    case "stopped":
      return `  runtime:  stopped — ${runtime.detail}`;
    case "was_not_running":
      return "  runtime:  was not running";
    case "stale_status":
      return `  runtime:  was not running (${runtime.detail ?? "stale daemon status file"})`;
    default:
      return `  runtime:  FAILED to stop: ${runtime.detail}`;
  }
}

export function renderDown(result: DownResult): string {
  const lines = [
    `Kage down — ${result.project_dir}`,
    renderDownProxy(result.proxy),
    renderDownRuntime(result.runtime),
  ];
  lines.push(
    "",
    result.ok
      ? "Nothing kage-managed is left running for this project. Bring it back with `kage up`."
      : "Something is still running (see above) — nothing was hidden to make this exit clean.",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// run — env-wrapped exec: point ONE command at the local proxy and get out of the way
// ---------------------------------------------------------------------------------------------

export interface RunOptions {
  project_dir: string;
  port?: number;
  /** argv after `--`: the command and its args, exec'd as-is (no shell). */
  command: string[];
  /** Injectable for tests. Defaults to the same bounded TCP probe `up` uses. */
  probe_port?: PortProbe;
  /**
   * Injectable for tests. Defaults to the VERIFIED background-proxy state: when --port is not
   * given, `run` uses the port the daemon record names — after the pid and the port itself have
   * been re-verified — and falls back to 8788 when nothing verified exists.
   */
  discover_port?: (projectDir: string) => Promise<number | null>;
  /** Defaults to "inherit" so interactive agents own the terminal. Tests pass "ignore". */
  stdio?: "inherit" | "ignore";
}

export interface RunResult {
  ok: boolean;
  /** The child's exit code verbatim; 1/2/127 when the child never ran (see hint). */
  exit_code: number;
  base_url: string;
  /** One human line when the child never ran; null once the child owned the terminal. */
  hint: string | null;
}

// The default discovery: the verified daemon state's port, or null when nothing verified exists.
// proxyDaemonState re-checks the pid AND the port, so a stale record can never point a child at a
// port whose listener died (and the stale file is cleaned as a side effect of looking).
async function discoverDaemonPort(projectDir: string): Promise<number | null> {
  const probe = await proxyDaemonState(projectDir);
  return probe.running ? probe.state.port : null;
}

/**
 * Sets ANTHROPIC_BASE_URL=http://localhost:<port> in the child's environment — and nothing else —
 * then runs the command with inherited stdio and reports the child's exit code. It NEVER starts
 * the proxy: `up` owns that lifecycle, and folding two lifecycles into one command would make
 * ownership ambiguous (whose Ctrl-C stops what?). With no --port it asks the verified daemon
 * state where the background proxy listens, falling back to the historical 8788 probe. When
 * nothing listens it fails fast with a one-line hint instead of hanging or half-working.
 */
export async function runWithProxy(options: RunOptions): Promise<RunResult> {
  if (!options.command.length) {
    return {
      ok: false,
      exit_code: 2,
      base_url: `http://localhost:${options.port ?? 8788}`,
      hint: "Usage: kage run [--project <dir>] [--port <n>] -- <command> [args...]   e.g. kage run -- claude",
    };
  }

  const port = options.port
    ?? (await (options.discover_port ?? discoverDaemonPort)(options.project_dir))
    ?? 8788;
  const baseUrl = `http://localhost:${port}`;

  const listening = await (options.probe_port ?? probeLocalPort)(port);
  if (!listening) {
    return {
      ok: false,
      exit_code: 1,
      base_url: baseUrl,
      hint: `Nothing is listening on ${baseUrl} — start the background proxy once with \`kage up --project ${options.project_dir}\` (run never starts the proxy; up owns that lifecycle).`,
    };
  }

  const child = spawn(options.command[0], options.command.slice(1), {
    stdio: options.stdio ?? "inherit",
    env: { ...process.env, ANTHROPIC_BASE_URL: baseUrl },
  });

  // Ctrl-C belongs to the interactive agent in the foreground: the wrapper must not die first and
  // orphan a live session. The child shares the process group, so it still receives the SIGINT —
  // the wrapper just waits for the child to act on it and then reports how it exited.
  const ignoreSigint = () => { /* the child decides what Ctrl-C means */ };
  process.on("SIGINT", ignoreSigint);
  try {
    return await new Promise<RunResult>((resolveRun) => {
      child.once("error", (error) => {
        resolveRun({
          ok: false,
          exit_code: 127,
          base_url: baseUrl,
          hint: `${options.command[0]}: ${error.message}`,
        });
      });
      child.once("exit", (code, signal) => {
        const signalCode = signal ? 128 + (osConstants.signals[signal] ?? 0) : null;
        resolveRun({ ok: true, exit_code: code ?? signalCode ?? 1, base_url: baseUrl, hint: null });
      });
    });
  } finally {
    process.removeListener("SIGINT", ignoreSigint);
  }
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
// per-provider breakdown — the proxy is multi-provider, so nothing here may be conflated
// ---------------------------------------------------------------------------------------------

export interface ProviderBreakdown {
  provider: string;
  /** Transformed-request receipts carrying THIS provider. */
  receipts: number;
  measurement: MeasurementCoverage;
  token_delta: TokenDeltaReport;
  cost_delta: CostDeltaReport;
}

/**
 * The per-provider split of measurement, token, and cost. The proxy now serves Anthropic, OpenAI,
 * and Gemini, so a single conflated number would hide which provider a token or a dollar came from
 * — and "anthropic + gemini" summed into one figure is exactly the kind of flattering aggregate
 * this workstream exists to forbid.
 *
 * EVIDENCE-DRIVEN, not config-driven: a bucket exists for a provider ONLY when at least one receipt
 * carries it. A provider that sent nothing has NO key. That absence is the honest "no traffic", and
 * it is categorically NOT a `{exact:0, partial:0, unavailable:0}` coverage (which would claim "we
 * measured it and it transformed nothing") and NOT a `$0` cost. Each bucket reads only its own
 * provider's receipts, so no provider's tokens or costs leak into another's.
 */
export function byProvider(receipts: readonly TransformationReceipt[]): Record<string, ProviderBreakdown> {
  const groups = new Map<string, TransformationReceipt[]>();
  for (const receipt of receipts) {
    const existing = groups.get(receipt.provider);
    if (existing) existing.push(receipt);
    else groups.set(receipt.provider, [receipt]);
  }
  const breakdown: Record<string, ProviderBreakdown> = {};
  for (const provider of [...groups.keys()].sort()) {
    const group = groups.get(provider) as TransformationReceipt[];
    breakdown[provider] = {
      provider,
      receipts: group.length,
      measurement: coverageOf(group),
      token_delta: tokenDelta(group),
      cost_delta: costDelta(group),
    };
  }
  return breakdown;
}

// ---------------------------------------------------------------------------------------------
// attachment and context latency — measured from real delivery rows, or null
// ---------------------------------------------------------------------------------------------

export interface AttachmentReport {
  /** Context actually reached the agent. */
  delivered: number;
  /** Kage composed context and deliberately attached none of it (audit mode; an empty capsule). */
  skipped: number;
  /** Kage could not compose or attach, and let the session carry on. */
  failed_open: number;
  attempted: number;
  /** delivered / attempted. Null when nothing was attempted. */
  success_rate: number | null;
}

export interface ContextLatencyReport {
  available: boolean;
  reason: string | null;
  /** Deliveries whose composition latency was MEASURED. Nothing else can enter a percentile. */
  samples: number;
  p50_ms: number | null;
  p95_ms: number | null;
  source: "context_delivery.composition_latency_ms" | null;
}

export function unavailableContextLatency(reason: string): ContextLatencyReport {
  return { available: false, reason, samples: 0, p50_ms: null, p95_ms: null, source: null };
}

/**
 * ATTACHMENT SUCCESS RATE, defined once, here:
 *
 *     attachment_success_rate = delivered / (delivered + skipped + failed_open)
 *
 * A SKIP IS IN THE DENOMINATOR. A capsule Kage composed and did not inject — every audit-mode
 * attempt, and every empty capsule — is an attempt that attached nothing, and counting it as a
 * success (or dropping it from the denominator, which is the same thing) would turn "Kage attached
 * context once in four tries" into "Kage attaches context 100% of the time".
 *
 * Null, not 1.0 and not 0.0, when NOTHING was attempted: no attempt is not a perfect record, and it
 * is not a total failure either. It is an absence of measurement.
 */
export function attachmentReport(deliveries: readonly StoredContextDelivery[]): AttachmentReport {
  const delivered = deliveries.filter((row) => row.status === "delivered").length;
  const skipped = deliveries.filter((row) => row.status === "skipped").length;
  const failedOpen = deliveries.filter((row) => row.status === "failed_open").length;
  const attempted = delivered + skipped + failedOpen;
  return {
    delivered,
    skipped,
    failed_open: failedOpen,
    attempted,
    success_rate: attempted ? delivered / attempted : null,
  };
}

export interface AttachmentByProviderReport {
  /** False only when the delivery store could not be read at all — the same rule as `attachment`. */
  available: boolean;
  reason: string | null;
  /**
   * Per-provider attachment, keyed by the provider RECORDED on the delivery row. A provider with no
   * deliveries has NO key — absence is "no traffic", never a fabricated {0,0,0}/0%. Only PROXY
   * deliveries carry a provider; a hook delivery records null and never appears here.
   */
  providers: Record<string, AttachmentReport>;
  /**
   * Deliveries with NO recorded provider — every Claude-hook delivery, because the hook cannot know
   * which API the agent called. They are attributed to NO provider (guessing one would be a
   * fabrication) but are still counted here and in the OVERALL attachment. Null when there are none.
   */
  unattributed: AttachmentReport | null;
}

export function unavailableAttachmentByProvider(reason: string): AttachmentByProviderReport {
  return { available: false, reason, providers: {}, unattributed: null };
}

/**
 * The per-provider split of ATTACHMENT, from the provider recorded on each delivery row (migration
 * 003). It is the attachment analogue of `byProvider` for receipts, with one difference the honesty
 * gates force: a delivery's provider is NULLABLE. The proxy knows it; the Claude hook does not, and
 * records null rather than guessing.
 *
 *   - A provider with ≥1 delivery gets a real {delivered, skipped, failed_open} + rate, from ITS rows
 *     only. A provider that attached nothing has NO key — that absence is "no traffic", categorically
 *     not a 0%/100% rate we never measured.
 *   - Null-provider rows (every hook delivery) are NEVER guessed into a provider. They go into an
 *     explicit `unattributed` bucket, and they remain in the OVERALL `attachmentReport`, which is
 *     unchanged. providers + unattributed reconstruct the overall exactly.
 */
export function attachmentByProvider(
  deliveries: readonly StoredContextDelivery[],
): AttachmentByProviderReport {
  const groups = new Map<string, StoredContextDelivery[]>();
  const unattributedRows: StoredContextDelivery[] = [];
  for (const row of deliveries) {
    // The store rejects an empty-string provider, so a blank here would only arrive via a direct SQL
    // insert bypassing the write door. Treat a blank as unattributed rather than minting a "" bucket:
    // read-side defense-in-depth, since the migration column has no CHECK constraint.
    const provider = typeof row.provider === "string" && row.provider.trim() ? row.provider : null;
    if (provider === null) {
      unattributedRows.push(row);
      continue;
    }
    const existing = groups.get(provider);
    if (existing) existing.push(row);
    else groups.set(provider, [row]);
  }
  const providers: Record<string, AttachmentReport> = {};
  for (const provider of [...groups.keys()].sort()) {
    providers[provider] = attachmentReport(groups.get(provider) as StoredContextDelivery[]);
  }
  return {
    available: true,
    reason: null,
    providers,
    unattributed: unattributedRows.length ? attachmentReport(unattributedRows) : null,
  };
}

// Nearest-rank, deliberately: every number reported is a latency that was really measured on some
// real request. Interpolation would print a millisecond value that never happened, which on a small
// sample (and a first internal audit IS a small sample) is exactly the kind of invented precision
// this phase refuses.
function percentile(sorted: readonly number[], fraction: number): number {
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

/**
 * Context-composition latency percentiles from the deliveries that MEASURED one. A failed-open
 * composed nothing, so it has no latency and contributes no sample: putting its timeout into the
 * percentiles would report a failure as if it were a composition time.
 *
 * Zero samples => null. A tiny sample is still an honest number and is reported as one, with the
 * sample count beside it so nobody can mistake it for a population statistic.
 */
export function contextLatency(deliveries: readonly StoredContextDelivery[]): ContextLatencyReport {
  const samples = deliveries
    .map((row) => row.composition_latency_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!samples.length) return unavailableContextLatency("no_measured_composition");
  return {
    available: true,
    reason: null,
    samples: samples.length,
    p50_ms: percentile(samples, 0.5),
    p95_ms: percentile(samples, 0.95),
    source: "context_delivery.composition_latency_ms",
  };
}

// ---------------------------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------------------------

/**
 * The background proxy as `status` reports it — from the VERIFIED daemon state (pid alive AND
 * port accepting), never from the file alone. When it is not running, every field is null and
 * `reason` says why ("no_state", "stale_state_removed", "untrusted_state"): absence with a
 * reason, never a fabricated proxy.
 */
export interface ProxyDaemonStatusReport {
  running: boolean;
  pid: number | null;
  port: number | null;
  mode: VnextMode | null;
  log_path: string | null;
  reason: "no_state" | "stale_state_removed" | "untrusted_state" | null;
}

export function proxyDaemonReport(probe: ProxyDaemonProbe): ProxyDaemonStatusReport {
  return probe.running
    ? {
      running: true,
      pid: probe.state.pid,
      port: probe.state.port,
      mode: probe.state.mode,
      log_path: probe.state.log_path,
      reason: null,
    }
    : { running: false, pid: null, port: null, mode: null, log_path: null, reason: probe.reason };
}

export interface VnextStatusReport {
  ok: boolean;
  project_dir: string;
  connected: boolean;
  mode: "audit" | "assist" | null;
  gateway: "audit" | "assist" | null;
  adapters: VnextAdapter[];
  runtime: RuntimeHealth;
  /** The background proxy, verified — see ProxyDaemonStatusReport. */
  proxy: ProxyDaemonStatusReport;
  /**
   * Whether an agent started IN THIS DIRECTORY is actually routed through the proxy. A healthy
   * proxy proves nothing on its own: attach is per-directory (.claude/settings.local.json), so
   * wiring a worktree while running the agent from the parent repo attaches nothing, silently.
   */
  attach: SessionAttachState;
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
  /**
   * The same coverage, token, and cost aggregates split by the receipt's provider, so a reader
   * never sees the overall total without seeing which provider each number came from. Keyed by
   * provider; a provider with no receipts has NO key (its absence is "no traffic", never a
   * fabricated `{0,0,0}` or `$0`). Null — not `{}` — when the receipt store could not be read at
   * all: "we could not look" is not "no provider had traffic".
   */
  by_provider: Record<string, ProviderBreakdown> | null;
  deliveries: { available: boolean; reason: string | null; total: number | null };
  /**
   * Null — not three zeros and a rate — when the delivery store could not be read: "we could not
   * look" is not "Kage never tried to attach context".
   */
  attachment: AttachmentReport | null;
  /**
   * The same attachment, split by the provider recorded on each delivery. A PROXY delivery carries
   * its provider; a HOOK delivery does not (it cannot know which API the agent called) and lands in
   * `unattributed`, never guessed into a provider. `available: false` — not an empty split — when
   * the delivery store could not be read, exactly like `attachment` being null.
   */
  attachment_by_provider: AttachmentByProviderReport;
  context_latency: ContextLatencyReport;
}

export async function vnextStatus(
  client: RuntimeClient,
  options: { probe_daemon?: (projectDir: string) => Promise<ProxyDaemonProbe> } = {},
): Promise<VnextStatusReport> {
  const projectDir = resolve(client.project_dir);
  const config = readVnextConfig(projectDir);
  const runtime = await client.health();
  const proxy = proxyDaemonReport(await (options.probe_daemon ?? proxyDaemonState)(projectDir));
  const attach = sessionAttachState(projectDir, proxy.port ?? 8788);
  const query = await client.receipts();
  const receipts = query.available ? query.receipts : [];
  const unreadable = query.available ? null : (query.reason ?? "receipts_unavailable");

  const deliveryQuery = await client.deliveries();
  const deliveries = deliveryQuery.available ? deliveryQuery.deliveries : [];
  const deliveriesUnreadable = deliveryQuery.available
    ? null
    : (deliveryQuery.reason ?? "deliveries_unavailable");

  return {
    ok: true,
    project_dir: projectDir,
    connected: config !== null,
    mode: config?.vnext.runtime ?? null,
    gateway: config?.vnext.gateway ?? null,
    adapters: config?.vnext.adapters ?? [],
    runtime,
    proxy,
    attach,
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
    by_provider: unreadable ? null : byProvider(receipts),
    deliveries: {
      available: deliveryQuery.available,
      reason: deliveryQuery.reason,
      total: deliveryQuery.available ? deliveries.length : null,
    },
    attachment: deliveriesUnreadable ? null : attachmentReport(deliveries),
    attachment_by_provider: deliveriesUnreadable
      ? unavailableAttachmentByProvider(deliveriesUnreadable)
      : attachmentByProvider(deliveries),
    context_latency: deliveriesUnreadable
      ? unavailableContextLatency(deliveriesUnreadable)
      : contextLatency(deliveries),
  };
}

function renderAttachment(report: VnextStatusReport): string[] {
  if (!report.attachment) {
    return [
      `  attachment:    unavailable (${report.deliveries.reason}) — the delivery store could not be read, which is not the same as Kage never attaching context`,
    ];
  }
  const { delivered, skipped, failed_open: failedOpen, success_rate: rate } = report.attachment;
  return [
    `  attachment:    ${delivered} delivered, ${skipped} skipped, ${failedOpen} failed open` +
      `  →  ${rate === null ? "null (nothing attempted)" : rate.toFixed(3)} attached`,
    `  failed-open:   ${failedOpen}`,
    report.context_latency.available
      ? `  context latency p50/p95:  ${report.context_latency.p50_ms} / ${report.context_latency.p95_ms} ms (measured on ${report.context_latency.samples} composition${report.context_latency.samples === 1 ? "" : "s"})`
      : `  context latency p50/p95:  unavailable (${report.context_latency.reason})`,
  ];
}

function attachmentRate(report: AttachmentReport): string {
  return report.success_rate === null ? "null (nothing attempted)" : report.success_rate.toFixed(3);
}

// The per-provider attachment block. Like the receipts by-provider block, it NEVER collapses to one
// number, NEVER invents a provider for a delivery that had none (every hook delivery), and NEVER
// prints a row for a provider that attached nothing. Null-provider rows are shown under an explicit
// "unattributed" heading that says WHY they have no provider.
function renderAttachmentByProvider(report: VnextStatusReport): string[] {
  const split = report.attachment_by_provider;
  if (!split.available) {
    return [`  attachment by provider:  unavailable (${split.reason}) — the delivery store could not be read`];
  }
  const providers = Object.keys(split.providers);
  if (!providers.length && !split.unattributed) {
    return ["  attachment by provider:  none — no context attachment was attempted"];
  }
  const lines = ["  attachment by provider (only the proxy knows the provider; a hook delivery is unattributed, never guessed):"];
  for (const provider of providers) {
    const a = split.providers[provider];
    lines.push(`    ${provider}:  ${a.delivered} delivered, ${a.skipped} skipped, ${a.failed_open} failed open  →  ${attachmentRate(a)} attached`);
  }
  if (split.unattributed) {
    const u = split.unattributed;
    lines.push(`    unattributed (hook deliveries — the hook cannot know the provider):  ${u.delivered} delivered, ${u.skipped} skipped, ${u.failed_open} failed open  →  ${attachmentRate(u)} attached`);
  }
  return lines;
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

// The per-provider block. It NEVER collapses to one number and it NEVER invents a row for a
// provider that sent nothing — a provider with no receipts simply has no line, which is the honest
// "no traffic", not a zero.
function renderByProvider(report: VnextStatusReport): string[] {
  if (report.by_provider === null) {
    return [`  by provider:   unavailable (${report.receipts.reason}) — the receipt store could not be read`];
  }
  const providers = Object.keys(report.by_provider);
  if (!providers.length) {
    return ["  by provider:   none — no request was transformed for any provider"];
  }
  const lines = ["  by provider (a provider with no traffic has no row, which is not a zero):"];
  for (const provider of providers) {
    const bucket = report.by_provider[provider];
    const coverage = `exact ${bucket.measurement.exact}, partial ${bucket.measurement.partial}, unavailable ${bucket.measurement.unavailable}`;
    const tokensPart = bucket.token_delta.available
      ? `tokens ${bucket.token_delta.before_input_tokens}→${bucket.token_delta.after_input_tokens}`
      : `tokens unavailable (${bucket.token_delta.reason})`;
    const costPart = bucket.cost_delta.available
      ? `cost delta $${(bucket.cost_delta.delta_usd as number).toFixed(6)}`
      : `cost unavailable (${bucket.cost_delta.reason})`;
    lines.push(`    ${provider}:  ${coverage}  |  ${tokensPart}  |  ${costPart}`);
  }
  return lines;
}

export function renderStatus(report: VnextStatusReport): string {
  const lines = [
    `Kage vNext status — ${report.project_dir}`,
    `  connected:     ${report.connected ? `yes (runtime ${report.mode}, gateway ${report.gateway})` : "no — run `kage connect --project <dir>`"}`,
    `  adapters:      ${report.adapters.length ? report.adapters.join(", ") : "none"}`,
    `  runtime:       ${report.runtime.running ? `running at ${report.runtime.url} (protocol v${report.runtime.protocol_version})` : `not running (${report.runtime.reason})`}`,
    report.proxy.running
      ? `  proxy:         running in the background (pid ${report.proxy.pid}, port ${report.proxy.port}, mode ${report.proxy.mode}) — log: ${report.proxy.log_path}; stop with \`kage down\``
      : `  proxy:         not running (${report.proxy.reason}) — start it once with \`kage up\``,
    renderAttachState(report.attach),
  ];

  if (!report.receipts.available) {
    lines.push(`  receipts:      unavailable (${report.receipts.reason})`);
  } else {
    lines.push(`  receipts:      ${report.receipts.total} across ${report.receipts.tasks} task${report.receipts.tasks === 1 ? "" : "s"}`);
  }

  lines.push(
    "",
    "Context attachment (every attempt: an audit-mode skip attaches nothing and is counted as a skip):",
    ...renderAttachment(report),
    ...renderAttachmentByProvider(report),
    "",
    "Measurement of transformed requests (a request Kage did not transform writes no receipt):",
    report.measurement
      ? `  exact ${report.measurement.exact}, partial ${report.measurement.partial}, unavailable ${report.measurement.unavailable}  (overall, across every provider)`
      : `  unavailable (${report.receipts.reason}) — the receipt store could not be read, which is not the same as no request being transformed`,
    renderTokenDelta(report.token_delta),
    renderCostDelta(report.cost_delta),
    ...renderByProvider(report),
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
