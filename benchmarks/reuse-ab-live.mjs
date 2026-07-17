// Instrumented paired A/B on memory's REAL use case: a cross-session fact NOT derivable from the
// current code. Control = no memory (must fail or hunt). Treatment = fact in a Kage packet, proxy
// injects it. Per arm we VERIFY injection actually happened (proxy log "memories injected" > 0 for
// treatment, == 0 for control) so a startup race can't silently invalidate a trial. We measure
// correctness (the honest primary signal here), num_turns, and total_cost_usd.
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, openSync } from "node:fs";
import { tmpdir } from "node:os"; import { join } from "node:path";

const CLI = "/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation/mcp/dist/cli.js";
const N = Number(process.env.N || 3);
const FACT = "Payment incident PAY-4471 was caused by ledgerIdempotencyKey truncating to 24 characters, which collided for high-volume merchants; the verified fix is to use the full 52-character base32 digest and never re-truncate.";
const Q = "What caused payment incident PAY-4471 and what is the verified fix? Answer in one sentence.";
const CORRECT = ["24", "52"]; // the two non-guessable numbers unique to the fix

function seed(withMemory) {
  const dir = mkdtempSync(join(tmpdir(), `rf-${withMemory ? "mem" : "ctl"}-`));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  mkdirSync(join(dir, "src"), { recursive: true });
  // Opaque code: the derivation lives in an external service, so the fact is NOT readable here.
  writeFileSync(join(dir, "src", "pay.ts"), "export function processPayment(o,a){ return externalDerive(o,a); }\n");
  if (withMemory) {
    const r = spawnSync(process.execPath, [CLI, "learn", "--project", dir, "--title", "PAY-4471 incident and verified fix",
      "--type", "gotcha", "--paths", "src/pay.ts", "--learning", FACT], { encoding: "utf8" });
    if (r.status !== 0) { console.error("learn failed", r.stderr); process.exit(1); }
  } else {
    mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  }
  spawnSync(process.execPath, [CLI, "index", "--project", dir], { encoding: "utf8" });
  return dir;
}

async function proxyUp(dir, port, log) {
  const child = spawn(process.execPath, [CLI, "proxy", "--project", dir, "--mode", "assist", "--port", String(port)],
    { detached: true, stdio: ["ignore", "ignore", "ignore"] });
  child.unref();
  // wait until it truly serves
  for (let i = 0; i < 60; i++) {
    const p = spawnSync("bash", ["-c", `curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:${port}/v1/models`], { encoding: "utf8" });
    if (p.stdout && p.stdout !== "000") { await new Promise(r => setTimeout(r, 500)); return child.pid; }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("proxy not up " + port);
}

function trial(dir, port) {
  const out = execFileSync("claude", ["-p", "--output-format", "json", "--setting-sources", "project", "--model", "haiku", Q],
    { cwd: dir, env: { ...process.env, ANTHROPIC_BASE_URL: `http://localhost:${port}` }, encoding: "utf8", timeout: 180000, maxBuffer: 64e6 });
  const d = JSON.parse(out);
  const ans = String(d.result || "").toLowerCase();
  return { correct: CORRECT.every(t => ans.includes(t)), turns: d.num_turns, cost: d.total_cost_usd, answer: String(d.result || "").slice(0, 160) };
}

const ctl = seed(false), mem = seed(true);
const ctlLog = join(ctl, "px.log"), memLog = join(mem, "px.log");
// route each proxy's stdout to a log we can grep for injected-count
function proxyWithLog(dir, port, logPath) {
  const fd = openSync(logPath, "w");
  const child = spawn(process.execPath, [CLI, "proxy", "--project", dir, "--mode", "assist", "--port", String(port)],
    { detached: true, stdio: ["ignore", fd, fd] });
  child.unref(); return child.pid;
}
const ctlPid = proxyWithLog(ctl, 8821, ctlLog);
const memPid = proxyWithLog(mem, 8822, memLog);
await new Promise(r => setTimeout(r, 3000));
try {
  const control = [], treatment = [];
  for (let i = 0; i < N; i++) {
    process.stderr.write(`trial ${i + 1}/${N}…\n`);
    control.push(trial(ctl, 8821));
    treatment.push(trial(mem, 8822));
  }
  const injected = (log) => { try { const m = readFileSync(log, "utf8").match(/(\d+) memories injected/g); return m ? m[m.length - 1] : "0 memories injected"; } catch { return "?"; } };
  const rate = (rows, k) => (rows.reduce((s, r) => s + (r[k] ? 1 : 0), 0));
  const mean = (rows, k) => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(3);
  console.log(JSON.stringify({
    scenario: "cross-session fact NOT in code (memory's real use case)",
    n_per_arm: N,
    injection_verified: { control_proxy: injected(ctlLog), treatment_proxy: injected(memLog) },
    control_no_memory: { correct: rate(control, "correct") + "/" + N, mean_turns: mean(control, "turns"), mean_cost_usd: mean(control, "cost") },
    treatment_with_memory: { correct: rate(treatment, "correct") + "/" + N, mean_turns: mean(treatment, "turns"), mean_cost_usd: mean(treatment, "cost") },
    sample_answers: { control: control[0].answer, treatment: treatment[0].answer },
  }, null, 1));
} finally {
  for (const p of [ctlPid, memPid]) { try { process.kill(p); } catch {} }
  rmSync(ctl, { recursive: true, force: true }); rmSync(mem, { recursive: true, force: true });
}
