import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  probeLocalPort,
  proxyDaemonPaths,
  proxyDaemonState,
  startProxyDaemon,
  stopProxyDaemon,
  writeProxyDaemonState,
  type ProxyDaemonRecord,
} from "./proxy-daemon.js";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-proxy-daemon-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

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

async function freeLoopbackPort(): Promise<number> {
  const listener = await listenOnLoopback();
  await listener.close();
  return listener.port;
}

// A pid that is certainly not running: the child has already exited when spawnSync returns, and
// pid recycling within a test's lifetime is not a realistic hazard.
function deadPid(): number {
  const child = spawnSync(process.execPath, ["-e", ""]);
  return child.pid as number;
}

function record(overrides: Partial<ProxyDaemonRecord> & { port: number; project_dir: string }): ProxyDaemonRecord {
  return {
    pid: process.pid,
    mode: "audit",
    started_at: new Date().toISOString(),
    log_path: join(overrides.project_dir, ".agent_memory", "daemon", "proxy.log"),
    ...overrides,
  };
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 15_000, stepMs = 100): Promise<void> {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`condition not reached within ${timeoutMs} ms`);
    await new Promise((done) => setTimeout(done, stepMs));
  }
}

// A stand-in for the real `kage proxy` child where its startup cost would add nothing: a plain TCP
// listener that stays alive. The real child is driven end-to-end in commands.test.ts.
function fakeProxyCommand(port: number, options: { delay_ms?: number } = {}): string[] {
  const listen = `require("net").createServer(() => {}).listen(${port}, "127.0.0.1");`;
  const script = options.delay_ms ? `setTimeout(() => { ${listen} }, ${options.delay_ms});` : listen;
  return [process.execPath, "-e", script];
}

// ---------------------------------------------------------------------------------------------
// proxyDaemonState — the file is NEVER trusted alone (the 860a272 lesson: a SIGKILL'd process
// leaves its status file behind, and trusting the file claims a dead service is alive).
// ---------------------------------------------------------------------------------------------

test("proxy state with a dead pid is stale: cleaned up and reported honestly, even while the port answers", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  try {
    writeProxyDaemonState(project, record({ pid: deadPid(), port: listener.port, project_dir: project }));
    const probe = await proxyDaemonState(project);
    assert.equal(probe.running, false);
    assert.equal(probe.running === false && probe.reason, "stale_state_removed");
    // The stale file is gone: the next command starts from a clean slate instead of re-diagnosing.
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
  } finally {
    await listener.close();
  }
});

test("proxy state with a live-but-wrong pid and a dead port is stale: the port is verified, not just the pid", async () => {
  const project = tempProject();
  // This test process is alive and IS a node process — exactly the recycled-pid shape that fooled
  // pid-only checks. The dead port is what gives it away.
  writeProxyDaemonState(project, record({ pid: process.pid, port: await freeLoopbackPort(), project_dir: project }));
  const probe = await proxyDaemonState(project);
  assert.equal(probe.running, false);
  assert.equal(probe.running === false && probe.reason, "stale_state_removed");
  assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
});

test("proxy state verifies as running only when the pid is alive AND the port accepts", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  try {
    const written = record({ pid: process.pid, port: listener.port, mode: "assist", project_dir: project });
    writeProxyDaemonState(project, written);
    const probe = await proxyDaemonState(project);
    assert.equal(probe.running, true);
    if (probe.running) {
      assert.equal(probe.state.pid, process.pid);
      assert.equal(probe.state.port, listener.port);
      assert.equal(probe.state.mode, "assist");
      assert.equal(probe.state.log_path, written.log_path);
    }
    // A verified state is not consumed by reading it.
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), true);
  } finally {
    await listener.close();
  }
});

test("no proxy state file reports no_state and invents nothing", async () => {
  const probe = await proxyDaemonState(tempProject());
  assert.equal(probe.running, false);
  assert.equal(probe.running === false && probe.reason, "no_state");
});

test("a proxy state file with lax permissions is untrusted: never believed, never removed, never acted on", async () => {
  const project = tempProject();
  const listener = await listenOnLoopback();
  try {
    const path = writeProxyDaemonState(project, record({ pid: process.pid, port: listener.port, project_dir: project }));
    // A checked-in or tampered state file arrives group/other-readable; ours is always 0600.
    chmodSync(path, 0o644);
    const probe = await proxyDaemonState(project);
    assert.equal(probe.running, false);
    assert.equal(probe.running === false && probe.reason, "untrusted_state");
    // Refusing to trust it also means refusing to delete it: we do not own its story.
    assert.equal(existsSync(path), true);
  } finally {
    await listener.close();
  }
});

test("a malformed proxy state file is stale: removed rather than crashing every later command", async () => {
  const project = tempProject();
  const paths = proxyDaemonPaths(project);
  mkdirSync(paths.directory, { recursive: true });
  writeFileSync(paths.statePath, "not json {", { mode: 0o600 });
  const probe = await proxyDaemonState(project);
  assert.equal(probe.running, false);
  assert.equal(probe.running === false && probe.reason, "stale_state_removed");
  assert.equal(existsSync(paths.statePath), false);
});

// ---------------------------------------------------------------------------------------------
// startProxyDaemon — parent writes the state file, and only after confirming the child listens.
// ---------------------------------------------------------------------------------------------

test("startProxyDaemon confirms the child accepts connections before writing a verifiable state file", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  let startedPid = 0;
  try {
    // The child listens only after a delay, so success proves the bounded poll actually waits for
    // liveness instead of trusting the spawn.
    const result = await startProxyDaemon({
      project_dir: project,
      port,
      mode: "audit",
      command: fakeProxyCommand(port, { delay_ms: 300 }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      startedPid = result.state.pid;
      assert.equal(result.state.port, port);
      assert.equal(result.state.mode, "audit");
      assert.equal(pidAlive(result.state.pid), true);
      assert.equal(await probeLocalPort(port), true);
    }
    // The written state round-trips through the verifier.
    const probe = await proxyDaemonState(project);
    assert.equal(probe.running, true);
    assert.equal(probe.running && probe.state.pid, startedPid);
  } finally {
    if (startedPid) {
      try { process.kill(startedPid, "SIGKILL"); } catch { /* already gone */ }
    }
  }
});

test("a child that never listens is start_failed: no state file left behind, the child reaped, the log named", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const result = await startProxyDaemon({
    project_dir: project,
    port,
    mode: "audit",
    command: [process.execPath, "-e", "setInterval(() => {}, 1000);"],
    wait_ms: 700,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "start_failed");
    // One human line pointing at the log — not a stack trace.
    assert.equal(result.detail.includes("\n"), false);
    assert.equal(result.log_path, proxyDaemonPaths(project).logPath);
    // Never leave a half state: no file, and no orphaned child still running.
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
    assert.notEqual(result.pid, null);
    await waitFor(() => !pidAlive(result.pid as number), 3_000);
  }
});

test("a child that exits immediately fails fast with the exit visible, well before the wait bound", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const startedAt = Date.now();
  const result = await startProxyDaemon({
    project_dir: project,
    port,
    mode: "audit",
    command: [process.execPath, "-e", "process.exit(3);"],
    wait_ms: 10_000,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.detail, /exit/i);
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
  }
  // Fail-fast: the child's exit ends the wait; the full 10 s bound is never sat out.
  assert.ok(Date.now() - startedAt < 8_000, "an exited child must end the wait early");
});

// ---------------------------------------------------------------------------------------------
// stopProxyDaemon — verified stop: kill only what the verified state names, clean what is stale.
// ---------------------------------------------------------------------------------------------

test("stopProxyDaemon stops the recorded proxy, removes the state file, and the pid is really gone", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const child: ChildProcess = spawn(fakeProxyCommand(port)[0], fakeProxyCommand(port).slice(1), { stdio: "ignore" });
  try {
    await waitFor(() => probeLocalPort(port));
    writeProxyDaemonState(project, record({ pid: child.pid as number, port, project_dir: project }));

    const result = await stopProxyDaemon(project);
    assert.equal(result.status, "stopped");
    assert.equal(result.status === "stopped" && result.pid, child.pid);
    await waitFor(() => !pidAlive(child.pid as number), 3_000);
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
    assert.equal(await probeLocalPort(port), false);
  } finally {
    try { child.kill("SIGKILL"); } catch { /* already gone */ }
  }
});

test("stopProxyDaemon escalates to SIGKILL after the grace period when the proxy ignores SIGTERM", async () => {
  const project = tempProject();
  const port = await freeLoopbackPort();
  const script = `process.on("SIGTERM", () => {}); require("net").createServer(() => {}).listen(${port}, "127.0.0.1");`;
  const child = spawn(process.execPath, ["-e", script], { stdio: "ignore" });
  try {
    await waitFor(() => probeLocalPort(port));
    writeProxyDaemonState(project, record({ pid: child.pid as number, port, project_dir: project }));

    const result = await stopProxyDaemon(project, { grace_ms: 300 });
    assert.equal(result.status, "stopped");
    assert.equal(result.status === "stopped" && result.forced, true, "the SIGTERM-ignoring child was force-killed");
    await waitFor(() => !pidAlive(child.pid as number), 3_000);
    assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
  } finally {
    try { child.kill("SIGKILL"); } catch { /* already gone */ }
  }
});

test("stopProxyDaemon with nothing recorded is a clean no-op", async () => {
  const result = await stopProxyDaemon(tempProject());
  assert.equal(result.status, "was_not_running");
});

test("stopProxyDaemon on a stale state cleans it, says so, and kills nothing", async () => {
  const project = tempProject();
  // Live pid (this test process), dead port: the stale shape that must never trigger a kill.
  writeProxyDaemonState(project, record({ pid: process.pid, port: await freeLoopbackPort(), project_dir: project }));
  const result = await stopProxyDaemon(project);
  assert.equal(result.status, "stale_state_cleaned");
  assert.equal(existsSync(proxyDaemonPaths(project).statePath), false);
  // We are demonstrably still alive: the stale path never signalled the recorded pid.
  assert.equal(pidAlive(process.pid), true);
});

test("the state file is written 0600 and readable back as the exact record", async () => {
  const project = tempProject();
  const written = record({ pid: process.pid, port: 8788, project_dir: project });
  const path = writeProxyDaemonState(project, written);
  const raw = JSON.parse(readFileSync(path, "utf8")) as ProxyDaemonRecord;
  assert.deepEqual(raw, written);
});
