import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture, recall, recordValueEvent, teamValueReport, classifyPacketDerivability } from "./kernel.js";
import { injectMemory } from "./proxy.js";

// T3 — the lead-facing "is this helping?" report. Every figure is measured from local ledgers or
// the real store; unmeasured sections say so instead of fabricating zeros; estimated token figures
// keep their _estimated suffix so they can never masquerade as measured counts.

function seededProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-teamrep-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "uncited-area"), { recursive: true });
  writeFileSync(join(dir, "src", "pay.ts"), "export const pay = 1;\n", "utf8");
  writeFileSync(join(dir, "uncited-area", "x.txt"), "x\n", "utf8");
  capture({
    projectDir: dir,
    type: "decision",
    title: "Payments must dedupe on the ledger idempotency key",
    body: "We chose ledger idempotency keys because retry storms double-charged in the past; fresh keys inside the retry loop were rejected. Verified by: incident replay.",
    paths: ["src/pay.ts"],
  });
  capture({
    projectDir: dir,
    type: "gotcha",
    title: "Upstream payment API rate-limits in 10s windows",
    body: "External quirk: the upstream payment API rate-limits in 10-second windows, so synchronized retries stampede it. Discovered after the incident; reproduced in staging.",
  });
  return dir;
}

test("teamValueReport aggregates measured value, composition, coverage and review health", () => {
  const dir = seededProject();
  // Two recalls create measured recall_served events + access entries.
  recall(dir, "payment ledger idempotency dedupe", 4);
  recall(dir, "payment ledger idempotency dedupe", 4);

  const report = teamValueReport(dir);
  assert.equal(report.value.recalls_served, 2, "recalls are measured counts");
  assert.ok(report.composition.total_packets >= 2);
  assert.ok(report.composition.non_derivable_share > 0.5, "seeded store is non-derivable-heavy");
  assert.ok(
    report.composition.classes.some((row) => row.class === "non-derivable: decision+rationale"),
    JSON.stringify(report.composition.classes),
  );
  assert.ok(report.top_memories.length >= 1, "used memory surfaces");
  assert.ok(report.coverage.dark_areas.includes("uncited-area"), "areas with no memory are named");
  assert.ok(!report.coverage.dark_areas.includes("src"), "cited areas are not dark");
  assert.equal(report.review_health.contradictions, 0);
});

test("injection gate section is honestly unavailable with no traffic, and populates from live decisions", () => {
  const dir = seededProject();
  const before = teamValueReport(dir);
  assert.equal(before.injection_gate.available, false);
  assert.equal(before.injection_gate.injection_rate, null, "no rate is fabricated from zero traffic");

  // Live production path: injectMemory runs the real composeInjection, which records the gate.
  injectMemory(dir, {
    model: "claude-x",
    system: "s",
    messages: [{ role: "user", content: "how do payment retries dedupe on the ledger idempotency key?" }],
  });
  injectMemory(dir, {
    model: "claude-x",
    system: "s",
    messages: [{ role: "user", content: "hello" }],
  });

  const after = teamValueReport(dir);
  assert.equal(after.injection_gate.available, true);
  assert.equal(after.injection_gate.gates, 2, "both gate decisions recorded");
  assert.ok(after.injection_gate.injected >= 1, "the relevant question injected");
  assert.ok(after.injection_gate.injected < after.injection_gate.gates, "the content-free prompt did not");
  assert.ok(after.injection_gate.average_confidence !== null);
});

test("manual injection_gate events aggregate without disturbing other totals", () => {
  const dir = seededProject();
  recordValueEvent(dir, { kind: "injection_gate", injected: true, confidence: 0.9 });
  recordValueEvent(dir, { kind: "injection_gate", injected: false, confidence: 0.2 });
  const report = teamValueReport(dir);
  assert.equal(report.injection_gate.gates, 2);
  assert.equal(report.injection_gate.injected, 1);
  assert.equal(report.injection_gate.injection_rate, 0.5);
  assert.equal(report.value.recalls_served, 0, "gate events never count as recalls");
});

test("the derivability classifier ships as code (report and audit cannot drift)", () => {
  assert.equal(
    classifyPacketDerivability({ type: "gotcha", status: "approved", title: "t", summary: "s", body: "b" } as never),
    "non-derivable: gotcha/dead-end",
  );
  assert.equal(
    classifyPacketDerivability({ type: "reference", status: "approved", title: "t", summary: "s", body: "b" } as never),
    "derivable-risk: reference dump",
  );
});
