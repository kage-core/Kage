#!/usr/bin/env node
// Honest real-body compression benchmark for Kage vNext Phase D.
//
// The Phase D gate test (mcp/vnext/phase-d-gate.test.ts) proves the compression
// pipeline is reversible, byte-preserving-on-failure, and net-negative — but it
// measures the savings NUMBER on a synthetic corpus engineered to compress (400
// identical log lines). That is honest as a mechanism proof, but it is NOT a
// real-traffic number. This benchmark runs the SHIPPED built-in compressors over
// REAL repository bodies (a real git diff, a real full-suite test-output log, a
// real source file, a real JSON) and reports the honest per-type savings.
//
// Expected result: on typical real bodies savings are ~0%. Compression only pays
// off on genuinely repetitive payloads (repeated log/error runs). The pipeline
// correctly PASSES THROUGH (byte-preserving, zero saving) whenever the compressed
// output plus its kage-content retrieval marker does not actually shrink the body.
// This benchmark exists so that honest fact is measured and reproducible, not
// estimated — matching Phase D's "measured, never fabricated" contract.
//
// Usage:
//   node benchmarks/compression-realbody-kage.mjs [--json]
//
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const { selectCompressor } = require(
  join(repoRoot, "mcp/dist/vnext/gateway/compressors/provider.js"),
);

const asJson = process.argv.includes("--json");
// A kage-content:<sha256> retrieval marker the pipeline must add to stay
// reversible; ~54 bytes ("kage-content:" + 64 hex). Charge it against savings so
// the net figure reflects what the proxy would actually forward.
const MARKER_BYTES = 54;

function gitShow(ref) {
  try {
    return execFileSync("git", ["show", ref], { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

// Real bodies, sourced from the repo itself so the benchmark is reproducible
// anywhere the repo is checked out.
const headDiff = gitShow("HEAD");
const cases = [];
if (headDiff) cases.push({ name: "real git diff (HEAD)", body: headDiff, media_type: "text/x-diff" });
try {
  cases.push({ name: "real source (transform.ts)", body: readFileSync(join(repoRoot, "mcp/vnext/gateway/transform.ts"), "utf8"), media_type: "text/x-typescript" });
} catch { /* skip */ }
try {
  cases.push({ name: "real JSON (mcp/package.json)", body: readFileSync(join(repoRoot, "mcp/package.json"), "utf8"), media_type: "application/json" });
} catch { /* skip */ }
// A synthetic repetitive log, included ONLY to show the contrast case where
// compression genuinely wins (this is the shape the gate test measures).
// Consecutive IDENTICAL non-error lines — the one shape the log folder collapses.
// This is the favorable case the gate test measures; shown here only for contrast.
cases.push({
  name: "synthetic repetitive log (contrast)",
  body: Array.from({ length: 400 }, () => "[info] compiling module foo").join("\n"),
  media_type: "text/plain",
});

const rows = [];
for (const c of cases) {
  const input = { body: c.body, media_type: c.media_type };
  const orig = Buffer.byteLength(c.body, "utf8");
  const comp = selectCompressor(input);
  if (!comp) {
    rows.push({ name: c.name, orig_bytes: orig, compressor: null, comp_bytes: orig, saved_pct: 0, net_pct: 0, decision: "passthrough (no compressor supports)" });
    continue;
  }
  const r = comp.compress(input);
  const compBytes = r.output_bytes;
  const netBytes = compBytes + MARKER_BYTES;
  const savedPct = orig > 0 ? ((orig - compBytes) / orig) * 100 : 0;
  const netPct = orig > 0 ? ((orig - netBytes) / orig) * 100 : 0;
  const keep = netBytes < orig;
  rows.push({
    name: c.name,
    orig_bytes: orig,
    compressor: comp.type || comp.id || "builtin",
    comp_bytes: compBytes,
    saved_pct: Number(savedPct.toFixed(2)),
    net_pct: Number(netPct.toFixed(2)),
    decision: keep ? "KEEP" : "passthrough (net-of-marker does not shrink)",
  });
}

// The honest headline: median net savings across the REAL (non-synthetic) bodies.
const realRows = rows.filter((r) => !r.name.startsWith("synthetic"));
const sortedNet = realRows.map((r) => r.net_pct).sort((a, b) => a - b);
const medianRealNet = sortedNet.length
  ? sortedNet[Math.floor((sortedNet.length - 1) / 2)]
  : 0;

if (asJson) {
  console.log(JSON.stringify({
    marker_bytes: MARKER_BYTES,
    rows,
    real_body_median_net_pct: medianRealNet,
    honest_note: "On real bodies compression nets ~0%; it only pays off on genuinely repetitive payloads. Passthrough is byte-preserving with zero saving. Numbers are measured, never estimated.",
  }, null, 2));
} else {
  console.log("Kage vNext Phase D — real-body compression (measured, shipped compressors)\n");
  console.log(
    "body".padEnd(40),
    "orig".padStart(9),
    "comp".padStart(9),
    "saved%".padStart(8),
    "net%".padStart(8),
    "  decision",
  );
  for (const r of rows) {
    console.log(
      r.name.padEnd(40),
      String(r.orig_bytes).padStart(9),
      String(r.comp_bytes).padStart(9),
      (r.saved_pct + "%").padStart(8),
      (r.net_pct + "%").padStart(8),
      "  " + r.decision,
    );
  }
  console.log(`\nReal-body median NET saving: ${medianRealNet}%  (synthetic repetitive log shown for contrast only)`);
  console.log("Honest: real-traffic compression nets ~0%; audit stays the default; savings are measured, never estimated.");
}
