import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { capture, tfCosine } from "./kernel.js";

// W3 — near-duplicate detection with a weighted-overlap view.
//
// Capture-time dedup was Jaccard-on-token-sets only (threshold 0.58): a reworded near-duplicate
// that keeps its core vocabulary but pads different filler dilutes the set overlap below the
// threshold and slips through as a "new" packet, splitting recall mass. The dedup scorer now takes
// max(jaccard, tf-cosine); these tests pin the property with a real reworded pair through the REAL
// capture() path, and the function-level contrast that motivates it.

const ORIGINAL = {
  title: "Run the package test suite with npm test from the mcp directory",
  body: "npm test builds TypeScript first, then runs node --test over dist and the dogfood replay suite. From the repo root use npm test --prefix mcp. macOS has no timeout command, so do not wrap the suite in one.",
};

// The same fact, reworded and padded differently — core vocabulary intact.
const REWORDED = {
  title: "Testing runbook: npm test in mcp runs the whole package suite",
  body: "To run the tests: npm test (inside mcp) or npm test --prefix mcp from the repo root. It builds the TypeScript, then node --test runs everything under dist plus the dogfood replay suite. Reminder for macOS folks: there is no timeout command, never wrap the suite in it.",
};

// A genuinely different memory sharing only incidental words.
const UNRELATED = {
  title: "Staging deploys fail when the artifact bucket region mismatches the cluster",
  body: "Deploys to staging fail with a 301 from the artifact store when the bucket region differs from the cluster region. Both must be us-east-1.",
};

test("tf-cosine rates a reworded near-duplicate far above an unrelated packet", () => {
  const near = tfCosine(`${ORIGINAL.title}\n${ORIGINAL.body}`, `${REWORDED.title}\n${REWORDED.body}`);
  const far = tfCosine(`${ORIGINAL.title}\n${ORIGINAL.body}`, `${UNRELATED.title}\n${UNRELATED.body}`);
  assert.ok(near >= 0.58, `reworded pair must clear the dedup threshold (got ${near.toFixed(3)})`);
  assert.ok(far < 0.4, `unrelated pair must stay well below it (got ${far.toFixed(3)})`);
  assert.ok(near > far * 2, "the separation must be decisive, not marginal");
});

test("capture surfaces the reworded near-duplicate as a duplicate candidate", () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-dedup-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  const docPath = join(dir, "docs/testing.md");
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, "# testing\n", "utf8");

  capture({ projectDir: dir, type: "runbook", title: ORIGINAL.title, body: ORIGINAL.body, paths: ["docs/testing.md"] });
  const second = capture({
    projectDir: dir,
    type: "runbook",
    title: REWORDED.title,
    body: REWORDED.body,
    paths: ["docs/testing.md"],
  }) as unknown as { packet?: { quality?: { duplicate_candidates?: Array<{ title: string; score: number }> } } } & Record<string, unknown>;

  const packet = (second.packet ?? second) as { quality?: { duplicate_candidates?: Array<{ title: string; score: number }> } };
  const candidates = packet.quality?.duplicate_candidates ?? [];
  assert.ok(
    candidates.some((candidate) => candidate.title === ORIGINAL.title),
    `the original must be flagged as a duplicate candidate; got ${JSON.stringify(candidates)}`,
  );
});

test("tf-cosine is symmetric and bounded", () => {
  const a = `${ORIGINAL.title}\n${ORIGINAL.body}`;
  const b = `${REWORDED.title}\n${REWORDED.body}`;
  assert.equal(tfCosine(a, b).toFixed(6), tfCosine(b, a).toFixed(6));
  assert.equal(tfCosine(a, a) > 0.999, true);
  assert.equal(tfCosine("", a), 0);
});
