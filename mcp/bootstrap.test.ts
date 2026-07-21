import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapStarterMemory, recall } from "./kernel.js";

// T4 — day-one value. A fresh repo must answer "how do I run the tests?" from memory immediately
// after install: bootstrap derives ONE runbook from package.json scripts (verifiable ground truth),
// tags it `bootstrap`, and is idempotent. Time-to-first-useful-recall is measured here as the
// assertion itself: recall hits the runbook at rank 1 with zero sessions of accumulated memory.

function freshRepo(scripts: Record<string, string> | null): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-boot-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  if (scripts) {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo-app", scripts }, null, 2), "utf8");
  }
  return dir;
}

test("bootstrap creates a verifiable runbook and the first recall answers from it", () => {
  const dir = freshRepo({ test: "node --test dist/", build: "tsc", dev: "vite" });
  const result = bootstrapStarterMemory(dir);
  assert.equal(result.created, true, result.reason);

  const firstRecall = recall(dir, "how do I run the tests", 3);
  assert.equal(firstRecall.results.length > 0, true, "day-one recall must not come back empty");
  assert.match(firstRecall.results[0].packet.title, /run, build and test/i);
  assert.ok(firstRecall.results[0].packet.tags.includes("bootstrap"));
  assert.match(firstRecall.results[0].packet.body, /npm run test/);
  assert.ok(firstRecall.injection.inject, "the day-one direct match must clear the injection gate");
});

test("bootstrap is idempotent", () => {
  const dir = freshRepo({ test: "node --test" });
  assert.equal(bootstrapStarterMemory(dir).created, true);
  const second = bootstrapStarterMemory(dir);
  assert.equal(second.created, false);
  assert.match(second.reason, /already present/);
});

test("bootstrap is honest when there is nothing verifiable to derive", () => {
  const noPackage = freshRepo(null);
  const result = bootstrapStarterMemory(noPackage);
  assert.equal(result.created, false);
  assert.match(result.reason, /no package\.json/);

  const noScripts = freshRepo({});
  const second = bootstrapStarterMemory(noScripts);
  assert.equal(second.created, false);
  assert.match(second.reason, /no runnable scripts/);
});
