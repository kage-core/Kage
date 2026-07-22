// The background-proxy lifecycle: state file, verified liveness, detached start, verified stop.
//
// STATE OWNERSHIP — the PARENT (`kage up`) writes .agent_memory/daemon/proxy.json, and only after
// it has confirmed the detached child accepts TCP connections. The child is the completely
// unchanged `kage proxy` command: parent-writes-after-confirm means a child that never listens
// leaves no state behind, and startProxy never had to learn about daemon files.
//
// LIVENESS — the file is NEVER trusted alone. This repo already paid for that lesson once
// (commit 860a272): a SIGKILL'd process leaves its status file behind, and anything that trusts
// the file without verifying the pid claims a dead service is alive. `proxyDaemonState` verifies
// two independent facts before calling the proxy "running":
//   1. the recorded pid is alive, ours, and still a node process (ESRCH, EPERM, or a foreign
//      command name all mean "not our proxy" — a recycled pid must never pass), and
//   2. the recorded port actually accepts a TCP connection.
// A file that fails either check is stale: removed, and reported as such — never as "running".
//
// LOCATION — .agent_memory/daemon/proxy.json, the legacy daemon's plain scratch directory, NOT
// the vNext runtime directory beside it. The runtime directory is a 0700-leased home the runtime
// process secures for itself (paths.ts), and the runtime needs Node 22.5+ for node:sqlite. The
// proxy runs fine on Node 18, so its state must not live inside — or depend on — a directory
// another component owns and a newer Node secures. (resolveRuntimePaths itself is Node-18-safe,
// but the ownership boundary is the point.)

import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { connect as connectTcp } from "node:net";
import { basename, join, resolve } from "node:path";
import { isRecord } from "../../type-guards.js";
import type { VnextMode } from "./config.js";

export type PortProbe = (port: number) => Promise<boolean>;

/**
 * True when something already accepts TCP connections on 127.0.0.1:<port>. Bounded — connect,
 * refuse, or time out within `timeoutMs` — because every caller (`up`'s idempotency check,
 * `run`'s fail-fast hint, the daemon-state verifier) sits on an interactive path where a hang is
 * worse than a conservative "no".
 */
export function probeLocalPort(port: number, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolveProbe) => {
    const socket = connectTcp({ port, host: "127.0.0.1" });
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveProbe(value);
    };
    socket.setTimeout(timeoutMs, () => settle(false));
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
  });
}

export interface ProxyDaemonRecord {
  pid: number;
  port: number;
  mode: VnextMode;
  project_dir: string;
  started_at: string;
  log_path: string;
}

export interface ProxyDaemonFilePaths {
  directory: string;
  statePath: string;
  logPath: string;
}

export function proxyDaemonPaths(projectDir: string): ProxyDaemonFilePaths {
  const directory = join(resolve(projectDir), ".agent_memory", "daemon");
  return {
    directory,
    statePath: join(directory, "proxy.json"),
    logPath: join(directory, "proxy.log"),
  };
}

/**
 * Atomic-enough 0600 write: an exclusive temp file plus rename, so a reader only ever sees a
 * complete document, and the mode is set at create time (umask can only clear bits 0600 lacks).
 */
export function writeProxyDaemonState(projectDir: string, state: ProxyDaemonRecord): string {
  const paths = proxyDaemonPaths(projectDir);
  mkdirSync(paths.directory, { recursive: true });
  const temporary = `${paths.statePath}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, paths.statePath);
  return paths.statePath;
}

export function removeProxyDaemonState(projectDir: string): void {
  try {
    unlinkSync(proxyDaemonPaths(projectDir).statePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// The state file sits at a repo-relative, checked-out path, so a cloned hostile repo could ship
// its own and point `kage run` (or a kill signal) wherever it likes. Ours is always a 0600 regular
// file owned by the current user; anything else — including git's default 0644 on a checked-in
// file — is not ours to believe, and not ours to delete or act on. Same rule as adapters/client.ts.
function trustedStateFile(path: string): boolean {
  try {
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink()) return false;
    const uid = process.getuid?.();
    if (uid !== undefined && stats.uid !== uid) return false;
    return (stats.mode & 0o077) === 0;
  } catch {
    return false;
  }
}

// Signal 0 probes existence and permission: ESRCH (gone) and EPERM (someone else's process, i.e.
// a recycled pid) both throw, and both mean "not our proxy". The `ps` comm check then rejects a
// pid recycled onto a non-node process. Same discipline as the runtime's liveness check.
function proxyProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    const comm = execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8", timeout: 2_000 });
    return basename(comm.trim()).toLowerCase().includes("node");
  } catch {
    return false;
  }
}

function parseProxyDaemonRecord(raw: string): ProxyDaemonRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { pid, port, mode, project_dir: projectDir, started_at: startedAt, log_path: logPath } = value;
  if (!Number.isInteger(pid) || (pid as number) <= 0) return null;
  if (!Number.isInteger(port) || (port as number) <= 0 || (port as number) > 65_535) return null;
  if (mode !== "audit" && mode !== "assist") return null;
  if (typeof projectDir !== "string" || typeof startedAt !== "string" || typeof logPath !== "string") return null;
  return {
    pid: pid as number,
    port: port as number,
    mode,
    project_dir: projectDir,
    started_at: startedAt,
    log_path: logPath,
  };
}

export type ProxyDaemonProbe =
  | { running: true; state: ProxyDaemonRecord }
  | { running: false; state: null; reason: "no_state" | "stale_state_removed" | "untrusted_state" };

/**
 * The verified answer to "is the background proxy running?". Reads the state file and then
 * verifies BOTH the pid (alive, ours, node) and the port (accepts a connection). A file that
 * fails verification is stale: removed so the next command starts clean, and reported with the
 * reason. An untrusted file (wrong owner, lax mode, symlink) is neither believed nor touched.
 */
export async function proxyDaemonState(
  projectDir: string,
  probePort: PortProbe = probeLocalPort,
): Promise<ProxyDaemonProbe> {
  const paths = proxyDaemonPaths(projectDir);
  if (!existsSync(paths.statePath)) return { running: false, state: null, reason: "no_state" };
  if (!trustedStateFile(paths.statePath)) return { running: false, state: null, reason: "untrusted_state" };

  let raw: string;
  try {
    raw = readFileSync(paths.statePath, "utf8");
  } catch {
    return { running: false, state: null, reason: "untrusted_state" };
  }

  const record = parseProxyDaemonRecord(raw);
  if (!record || !proxyProcessAlive(record.pid) || !(await probePort(record.port))) {
    removeProxyDaemonState(projectDir);
    return { running: false, state: null, reason: "stale_state_removed" };
  }
  return { running: true, state: record };
}

// ---------------------------------------------------------------------------------------------
// start — spawn detached, confirm liveness, THEN record. Never leave a half state.
// ---------------------------------------------------------------------------------------------

export interface StartProxyDaemonOptions {
  project_dir: string;
  port: number;
  mode: VnextMode;
  /**
   * The detached child's argv. Defaults to the real `kage proxy` invocation; injectable so tests
   * can use a tiny listener where the CLI's startup cost would add nothing.
   */
  command?: string[];
  probe_port?: PortProbe;
  /** Bounded wait for the child to accept connections. The real CLI loads tree-sitter first. */
  wait_ms?: number;
  poll_interval_ms?: number;
}

export type StartProxyDaemonResult =
  | { ok: true; state: ProxyDaemonRecord }
  | { ok: false; reason: "start_failed"; detail: string; log_path: string; pid: number | null };

function defaultProxyCommand(projectDir: string, port: number, mode: VnextMode): string[] {
  const cli = join(__dirname, "..", "..", "cli.js");
  return [process.execPath, cli, "proxy", "--project", projectDir, "--mode", mode, "--port", String(port)];
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

function describeExit(exit: { code: number | null; signal: NodeJS.Signals | null }): string {
  if (exit.code !== null) return `exit code ${exit.code}`;
  if (exit.signal !== null) return `signal ${exit.signal}`;
  return "unknown exit";
}

/**
 * Start the proxy as a detached background child and confirm it serves before recording it.
 * The child's stdout/stderr are appended to .agent_memory/daemon/proxy.log, so a failure always
 * has somewhere to point. On any failure — early exit, spawn error, or the wait bound expiring —
 * no state file is written and the child (if any) is reaped: never a half state.
 */
export async function startProxyDaemon(options: StartProxyDaemonOptions): Promise<StartProxyDaemonResult> {
  const projectDir = resolve(options.project_dir);
  const paths = proxyDaemonPaths(projectDir);
  mkdirSync(paths.directory, { recursive: true });

  const probe = options.probe_port ?? probeLocalPort;
  const command = options.command ?? defaultProxyCommand(projectDir, options.port, options.mode);
  const waitMs = options.wait_ms ?? 15_000;
  const pollMs = options.poll_interval_ms ?? 150;

  const logFd = openSync(paths.logPath, "a", 0o600);
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(command[0], command.slice(1), {
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
  } finally {
    // spawn dup'ed the descriptor into the child; the parent's copy must not leak.
    closeSync(logFd);
  }
  child.unref();

  let exit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  let spawnError: Error | null = null;
  child.once("exit", (code, signal) => { exit = { code, signal }; });
  child.once("error", (error) => { spawnError = error; });

  const fail = (detail: string): StartProxyDaemonResult => ({
    ok: false,
    reason: "start_failed",
    detail,
    log_path: paths.logPath,
    pid: child.pid ?? null,
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < waitMs) {
    if (spawnError) return fail(`the proxy could not be spawned (${(spawnError as Error).message})`);
    if (exit) {
      return fail(`the proxy exited before it started listening (${describeExit(exit)}) — check the log`);
    }
    if (await probe(options.port)) {
      // Listening confirmed. The child must still be alive when it is recorded: a racing loser
      // (EADDRINUSE against someone who grabbed the port first) dies here instead of being
      // written down as a running daemon. Anything that slips past is caught by the verified
      // read on the very next command.
      if (exit || spawnError || !child.pid) continue;
      const state: ProxyDaemonRecord = {
        pid: child.pid,
        port: options.port,
        mode: options.mode,
        project_dir: projectDir,
        started_at: new Date().toISOString(),
        log_path: paths.logPath,
      };
      writeProxyDaemonState(projectDir, state);
      return { ok: true, state };
    }
    await wait(pollMs);
  }

  // The bound expired with nothing listening. Reap the child so "start failed" is also "nothing
  // half-running was left behind".
  if (child.pid) {
    try { process.kill(child.pid, "SIGKILL"); } catch { /* already gone */ }
  }
  return fail(`the proxy did not start listening on port ${options.port} within ${waitMs} ms — check the log`);
}

// ---------------------------------------------------------------------------------------------
// stop — kill only what the verified state names; clean what is stale; report what happened.
// ---------------------------------------------------------------------------------------------

export interface StopProxyDaemonOptions {
  probe_port?: PortProbe;
  /** How long SIGTERM gets before SIGKILL. */
  grace_ms?: number;
}

export type StopProxyDaemonResult =
  | { status: "stopped"; pid: number; forced: boolean }
  | { status: "was_not_running" }
  | { status: "stale_state_cleaned" }
  | { status: "untrusted_state"; state_path: string }
  | { status: "stop_failed"; pid: number; detail: string };

async function waitForPidExit(pid: number, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  for (;;) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    if (Date.now() - startedAt >= timeoutMs) return false;
    await wait(100);
  }
}

/**
 * Stop the recorded background proxy. The kill decision runs through the same verified read as
 * every other consumer: a stale record (dead pid, dead port, or a pid that is not our node
 * process) is CLEANED, never signalled — `down` must not shoot at a recycled pid. A live proxy
 * gets SIGTERM, a bounded grace, then SIGKILL; the state file is removed only once the pid is
 * really gone.
 */
export async function stopProxyDaemon(
  projectDir: string,
  options: StopProxyDaemonOptions = {},
): Promise<StopProxyDaemonResult> {
  const probe = await proxyDaemonState(projectDir, options.probe_port);
  if (!probe.running) {
    if (probe.reason === "no_state") return { status: "was_not_running" };
    if (probe.reason === "untrusted_state") {
      return { status: "untrusted_state", state_path: proxyDaemonPaths(projectDir).statePath };
    }
    return { status: "stale_state_cleaned" };
  }

  const pid = probe.state.pid;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // It died between the verified read and the signal. The end state is what down promises.
    removeProxyDaemonState(projectDir);
    return { status: "stale_state_cleaned" };
  }

  let forced = false;
  if (!(await waitForPidExit(pid, options.grace_ms ?? 3_000))) {
    forced = true;
    try { process.kill(pid, "SIGKILL"); } catch { /* it exited inside the window */ }
    if (!(await waitForPidExit(pid, 2_000))) {
      // Do not remove the state: the process is demonstrably still there, and hiding that would
      // be the exact dishonesty the verified read exists to prevent.
      return { status: "stop_failed", pid, detail: `pid ${pid} is still alive after SIGTERM and SIGKILL` };
    }
  }
  removeProxyDaemonState(projectDir);
  return { status: "stopped", pid, forced };
}
