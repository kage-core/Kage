import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  capture,
  recall,
  verifyCitations,
  kageSuppressedMemory,
  kageMemoryLifecycle,
  reverifyMemory,
  supersedeMemory,
  recordFeedback,
  approvePending,
  compactProject,
  generateSkills,
} from "./kernel.js";

// ─────────────────────────────────────────────────────────────────────────────
// Black-box lifecycle ("trajectory" + "Markov chain") tests for Kage memory.
//
// These exercise the FULL flow through its observable states, asserting both the
// state transitions and the safety invariants after every hop. They are written
// against the public API only (capture/recall/verify/supersede/...), never
// internals, so they catch regressions in behavior even when the implementation
// changes underneath.
//
// State machine under test (see also the lifecycle diagram):
//   pending --approve--> approved_fresh
//   approved_fresh --change_content--> soft_stale
//   soft_stale --reverify--> approved_fresh
//   approved_fresh|soft_stale --delete_cited--> hard_stale
//   approved_fresh --report_stale--> hard_stale
//   approved_fresh --supersede--> superseded
//   hard_stale --compact--> deprecated
//
// Invariants (asserted after every transition):
//   I1  withheld states {pending, hard_stale, superseded, deprecated} are NEVER
//       returned by recall().results.
//   I2  approved_fresh runbooks ARE returned by recall().results for their query.
//   I3  a grounded approved_fresh runbook IS emitted by `kage skills`.
//   I4  withheld states are NEVER emitted by `kage skills`.
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-traj-home-"));

type State = "pending" | "approved_fresh" | "soft_stale" | "hard_stale" | "superseded" | "deprecated" | "absent";
type Ctx = { id: string; token: string; file: string; query: string };

function newProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-traj-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
  mkdirSync(join(dir, "src"), { recursive: true });
  return dir;
}

let seq = 0;
function captureRunbook(project: string, opts: { pending?: boolean; type?: "runbook" | "workflow" } = {}): Ctx {
  seq += 1;
  const token = `ztoken${seq}`;
  const file = join("src", `mod${seq}.js`);
  writeFileSync(join(project, file), `export function f${seq}() { return ${seq}; }\n`, "utf8");
  const res = capture({
    projectDir: project,
    title: `Procedure ${token}`,
    body: `Runbook ${token}: to perform the ${token} task, run the documented steps in order and verify the result against the cited module before shipping. This is a substantive, reusable procedure with enough detail to qualify as a skill.`,
    type: opts.type ?? "runbook",
    paths: [file],
    pendingReview: opts.pending === true,
  });
  assert.equal(res.ok, true, `capture failed: ${res.errors?.join("; ")}`);
  return { id: res.packet!.id, token, file, query: token };
}

function diskStatus(project: string, id: string): string | null {
  const dir = join(project, ".agent_memory", "packets");
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const p = JSON.parse(readFileSync(join(dir, f), "utf8"));
      if (p.id === id) return p.status;
    } catch { /* skip unreadable */ }
  }
  return null;
}

// Derive the packet's state purely from public queries + the on-disk packet file.
function observe(project: string, id: string): State {
  const item = kageMemoryLifecycle(project).items.find((i) => i.packet_id === id);
  if (item) {
    if (item.status !== "approved") return item.status as State;
    if (kageSuppressedMemory(project).items.some((s) => s.id === id)) return "hard_stale";
    const v = verifyCitations(project, { id }).packets[0];
    if (v?.stale_severity === "hard") return "hard_stale";
    if (v?.stale_severity === "soft") return "soft_stale";
    return "approved_fresh";
  }
  const status = diskStatus(project, id);
  if (status === "superseded") return "superseded";
  if (status === "deprecated") return "deprecated";
  return "absent";
}

// Each mutation writes distinct content so the source hash actually changes
// (re-writing identical bytes leaves the fingerprint matching = still fresh).
let mutationN = 0;
function mutateFile(project: string, file: string): void {
  mutationN += 1;
  writeFileSync(join(project, file), `export function changed${mutationN}() { return -${mutationN}; }\n`, "utf8");
}

function served(project: string, ctx: Ctx): boolean {
  return recall(project, ctx.query).results.some((r) => r.packet.id === ctx.id);
}

function isSkill(project: string, id: string): boolean {
  return generateSkills(project, { dryRun: true }).generated.some((s) => s.packet_id === id);
}

const WITHHELD: State[] = ["pending", "hard_stale", "superseded", "deprecated"];

function assertInvariants(project: string, ctx: Ctx): void {
  const state = observe(project, ctx.id);
  if (WITHHELD.includes(state)) {
    assert.equal(served(project, ctx), false, `I1: ${state} packet must not be recalled`);
    assert.equal(isSkill(project, ctx.id), false, `I4: ${state} packet must not become a skill`);
  }
  if (state === "approved_fresh") {
    assert.equal(served(project, ctx), true, `I2: approved_fresh must be recalled`);
    assert.equal(isSkill(project, ctx.id), true, `I3: grounded approved_fresh runbook must become a skill`);
  }
}

// ── Trajectory tests: concrete end-to-end journeys ───────────────────────────

test("trajectory: create -> recall -> content change -> reverify -> fresh", () => {
  const p = newProject();
  const c = captureRunbook(p);
  assert.equal(observe(p, c.id), "approved_fresh");
  assert.equal(served(p, c), true);
  assertInvariants(p, c);

  mutateFile(p, c.file);
  assert.equal(observe(p, c.id), "soft_stale");

  const rv = reverifyMemory(p, c.id);
  assert.equal(rv.ok, true);
  assert.equal(observe(p, c.id), "approved_fresh");
  assertInvariants(p, c);
});

test("trajectory: create -> delete cited -> withheld -> compact -> deprecated", () => {
  const p = newProject();
  const c = captureRunbook(p);
  unlinkSync(join(p, c.file));
  assert.equal(observe(p, c.id), "hard_stale");
  assertInvariants(p, c);

  compactProject(p);
  assert.equal(observe(p, c.id), "deprecated");
  assertInvariants(p, c);
});

test("trajectory: supersede replaces and withholds the old packet", () => {
  const p = newProject();
  const oldC = captureRunbook(p);
  const newC = captureRunbook(p);
  const r = supersedeMemory(p, oldC.id, newC.id);
  assert.equal(r.ok, true);
  assert.equal(observe(p, oldC.id), "superseded");
  assert.equal(observe(p, newC.id), "approved_fresh");
  assertInvariants(p, oldC);
  assertInvariants(p, newC);
});

test("trajectory: pending draft is excluded from recall until approved", () => {
  const p = newProject();
  const c = captureRunbook(p, { pending: true });
  assert.equal(observe(p, c.id), "pending");
  assert.equal(served(p, c), false);
  assertInvariants(p, c);

  approvePending(p, c.id);
  assert.equal(observe(p, c.id), "approved_fresh");
  assert.equal(served(p, c), true);
  assertInvariants(p, c);
});

test("trajectory: reported-stale memory is withheld", () => {
  const p = newProject();
  const c = captureRunbook(p);
  recordFeedback(p, c.id, "stale");
  assert.equal(observe(p, c.id), "hard_stale");
  assertInvariants(p, c);
});

test("trajectory: skills follow grounding — fresh becomes a skill, withheld does not", () => {
  const p = newProject();
  const c = captureRunbook(p);
  assert.equal(isSkill(p, c.id), true);
  unlinkSync(join(p, c.file));
  assert.equal(observe(p, c.id), "hard_stale");
  assert.equal(isSkill(p, c.id), false);
});

// ── Markov-chain tests: every defined transition lands where expected ────────

const TRANSITIONS: Array<{ from: State; event: string; to: State }> = [
  { from: "pending", event: "approve", to: "approved_fresh" },
  { from: "approved_fresh", event: "change_content", to: "soft_stale" },
  { from: "approved_fresh", event: "delete_cited", to: "hard_stale" },
  { from: "approved_fresh", event: "report_stale", to: "hard_stale" },
  { from: "approved_fresh", event: "supersede", to: "superseded" },
  { from: "soft_stale", event: "reverify", to: "approved_fresh" },
  { from: "soft_stale", event: "delete_cited", to: "hard_stale" },
  { from: "hard_stale", event: "compact", to: "deprecated" },
];

function setupState(project: string, state: State): Ctx {
  const c = captureRunbook(project, { pending: state === "pending" });
  if (state === "soft_stale") mutateFile(project, c.file);
  if (state === "hard_stale") unlinkSync(join(project, c.file));
  assert.equal(observe(project, c.id), state, `setup did not reach ${state}`);
  return c;
}

function applyEvent(project: string, ctx: Ctx, event: string): void {
  switch (event) {
    case "approve": approvePending(project, ctx.id); break;
    case "change_content": mutateFile(project, ctx.file); break;
    case "reverify": reverifyMemory(project, ctx.id); break;
    case "delete_cited": unlinkSync(join(project, ctx.file)); break;
    case "report_stale": recordFeedback(project, ctx.id, "stale"); break;
    case "supersede": supersedeMemory(project, ctx.id, captureRunbook(project).id); break;
    case "compact": compactProject(project); break;
    default: throw new Error(`unknown event ${event}`);
  }
}

for (const t of TRANSITIONS) {
  test(`markov: ${t.from} --${t.event}--> ${t.to}`, () => {
    const p = newProject();
    const c = setupState(p, t.from);
    applyEvent(p, c, t.event);
    assert.equal(observe(p, c.id), t.to, `${t.from} --${t.event}--> expected ${t.to}`);
    assertInvariants(p, c);
  });
}

test("markov chain: repair cycle then decay (fresh -> soft -> fresh -> soft -> hard -> deprecated)", () => {
  const p = newProject();
  const c = captureRunbook(p);
  const walk: Array<{ event: string; expect: State }> = [
    { event: "change_content", expect: "soft_stale" },
    { event: "reverify", expect: "approved_fresh" },
    { event: "change_content", expect: "soft_stale" },
    { event: "delete_cited", expect: "hard_stale" },
    { event: "compact", expect: "deprecated" },
  ];
  for (const step of walk) {
    applyEvent(p, c, step.event);
    assert.equal(observe(p, c.id), step.expect, `after ${step.event} expected ${step.expect}`);
    assertInvariants(p, c);
  }
});
