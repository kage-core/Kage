import assert from "node:assert/strict";
import { test } from "node:test";

import { compressLogs } from "./logs.js";
import { compressJson } from "./json.js";
import { compressDiff } from "./diff.js";
import { compressTestOutput } from "./test-output.js";
import { compressStackTrace } from "./stack-trace.js";
import { builtinCompressors, builtinCompressorProvider } from "./provider.js";
import type { CompressionInput } from "./types.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fixtureRepeatedLogs(): string {
  const lines: string[] = [];
  lines.push("2026-07-18T10:00:00Z first startup line");
  for (let i = 0; i < 98; i += 1) lines.push("2026-07-18T10:00:01Z heartbeat ok");
  lines.push("2026-07-18T10:05:00Z ERROR database unavailable");
  lines.push("2026-07-18T10:06:00Z final shutdown line");
  return lines.join("\n");
}

function fixtureLargeJson(): string {
  const items: unknown[] = [];
  for (let i = 0; i < 500; i += 1) items.push({ index: i, value: `row-${i}`, ok: true });
  return JSON.stringify({
    request_id: "req-123",
    status: "error",
    error: { message: "database unavailable", code: 503 },
    count: items.length,
    items,
  });
}

function fixtureLargeDiff(): string {
  const lines: string[] = [];
  lines.push("diff --git a/foo.txt b/foo.txt");
  lines.push("index 1111111..2222222 100644");
  lines.push("--- a/foo.txt");
  lines.push("+++ b/foo.txt");
  lines.push("@@ -10,3 +10,4 @@ context header one");
  lines.push(" line ten");
  lines.push(" line eleven");
  lines.push("-old line");
  lines.push("+new line");
  lines.push("+added line");
  lines.push(" line thirteen");
  lines.push("@@ -200,5 +201,5 @@ context header two");
  for (let i = 0; i < 20; i += 1) lines.push(` unchanged context line ${i}`);
  lines.push("-removed line");
  lines.push("+replaced line");
  for (let i = 0; i < 20; i += 1) lines.push(` trailing context line ${i}`);
  return lines.join("\n");
}

function fixtureTestOutput(): string {
  const block = [
    "  1) UserService should create a user",
    "     AssertionError: expected 200 to equal 500",
    "      at Context.<anonymous> (test/user.test.js:42:10)",
  ].join("\n");
  return [
    "  UserService",
    "",
    block,
    "",
    block,
    "",
    "  3 passing (120ms)",
    "  2 failing",
  ].join("\n");
}

function fixtureStackTrace(): string {
  const lines: string[] = [];
  lines.push("Error: boom in application layer");
  lines.push("    at handleRequest (src/app/handler.js:10:5)");
  for (let i = 0; i < 40; i += 1) lines.push(`    at internalFrame${i} (node:internal/thing:${i}:1)`);
  lines.push("    at bootstrap (src/app/main.js:3:1)");
  lines.push("Caused by: TypeError: cannot read property 'id' of undefined");
  lines.push("    at readId (src/app/user.js:7:9)");
  return lines.join("\n");
}

test("log compressor folds repeated lines but preserves first last and errors", () => {
  const result = compressLogs(fixtureRepeatedLogs());
  assert.match(result.output, /repeated 98 times/);
  assert.match(result.output, /first startup line/);
  assert.match(result.output, /final shutdown line/);
  assert.match(result.output, /ERROR database unavailable/);
  assert.equal(result.compressor, "logs");
  assert.equal(result.lossy, true);
});

test("JSON compressor preserves errors ids statuses and schema", () => {
  const result = compressJson(fixtureLargeJson());
  assert.match(result.output, /request_id/);
  assert.match(result.output, /status/);
  assert.match(result.output, /error/);
  assert.match(result.output, /database unavailable/);
  assert.equal(result.lossy, true);
  // still valid JSON after compression
  assert.doesNotThrow(() => JSON.parse(result.output));
});

test("JSON compressor returns none on invalid JSON", () => {
  const result = compressJson("{not valid json,,,");
  assert.equal(result.compressor, "none");
  assert.equal(result.lossy, false);
  assert.equal(result.output, "{not valid json,,,");
});

test("diff compressor keeps every changed hunk header", () => {
  const result = compressDiff(fixtureLargeDiff());
  for (const header of ["@@ -10,3 +10,4 @@", "@@ -200,5 +201,5 @@"]) {
    assert.match(result.output, new RegExp(escapeRegExp(header)));
  }
  assert.match(result.output, /--- a\/foo\.txt/);
  assert.match(result.output, /\+\+\+ b\/foo\.txt/);
  assert.match(result.output, /-old line/);
  assert.match(result.output, /\+added line/);
  assert.equal(result.lossy, true);
});

test("diff compressor does not transform binary diffs", () => {
  const body = "diff --git a/img.png b/img.png\nBinary files a/img.png and b/img.png differ\n";
  const result = compressDiff(body);
  assert.equal(result.compressor, "none");
  assert.equal(result.lossy, false);
  assert.equal(result.output, body);
});

test("test-output compressor folds identical failure signatures but keeps names and counts", () => {
  const result = compressTestOutput(fixtureTestOutput());
  assert.match(result.output, /UserService should create a user/);
  assert.match(result.output, /2 failing/);
  assert.match(result.output, /3 passing/);
  assert.match(result.output, /repeated 2 times/);
  assert.equal(result.lossy, true);
});

test("stack-trace compressor keeps root message boundary frames and caused-by chains", () => {
  const result = compressStackTrace(fixtureStackTrace());
  assert.match(result.output, /Error: boom in application layer/);
  assert.match(result.output, /at handleRequest \(src\/app\/handler\.js:10:5\)/);
  assert.match(result.output, /Caused by: TypeError/);
  assert.match(result.output, /frames omitted/);
  assert.equal(result.lossy, true);
});

test("compressors are deterministic", () => {
  const logs = fixtureRepeatedLogs();
  assert.equal(compressLogs(logs).output, compressLogs(logs).output);
  const json = fixtureLargeJson();
  assert.equal(compressJson(json).output, compressJson(json).output);
  const diff = fixtureLargeDiff();
  assert.equal(compressDiff(diff).output, compressDiff(diff).output);
});

test("compressors fail open on arbitrary UTF-8 payloads", () => {
  for (let index = 0; index < 200; index += 1) {
    const body = `${String.fromCodePoint(32 + (index % 90))}`.repeat(index * 13);
    for (const compressor of builtinCompressors()) {
      const input: CompressionInput = { body, media_type: "text/plain", task_id: "task-fuzz", token_budget: 500 };
      assert.doesNotThrow(() => compressor.compress(input));
    }
  }
});

test("builtin provider exposes deterministic compressors and reports health", async () => {
  const provider = builtinCompressorProvider();
  assert.equal(provider.provider_id, "builtin");
  const ids = provider.compressors().map((c) => c.id).sort();
  assert.deepEqual(ids, ["diff", "json", "logs", "stack_trace", "test_output"]);
  const health = await provider.health();
  assert.equal(health.ok, true);
});

test("compressor never grows output beyond a passthrough guarantee flag", () => {
  // A lossy result must carry byte accounting so the pipeline can measure savings.
  const result = compressLogs(fixtureRepeatedLogs());
  assert.equal(result.original_bytes, Buffer.byteLength(fixtureRepeatedLogs(), "utf8"));
  assert.equal(result.output_bytes, Buffer.byteLength(result.output, "utf8"));
  assert.ok(result.output_bytes < result.original_bytes);
});
