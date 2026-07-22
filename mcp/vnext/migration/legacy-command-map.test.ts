import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mapLegacyCommand,
  isLegacyCommand,
  legacyReplacementCommands,
  formatDeprecationNotice,
  recordLegacyUsage,
  scanLegacyCommandUsage,
  V4_REMOVAL_VERSION,
  LEGACY_DOCS_PATH,
} from "./legacy-command-map.js";

test("removed daily command points to one supported replacement", () => {
  const result = mapLegacyCommand(["memory-timeline", "--project", "."]);
  assert.deepEqual(result.replacement, ["open", "--project", "."]);
});

test("mapLegacyCommand preserves the caller's flags around the swapped verb", () => {
  const result = mapLegacyCommand(["gains", "--project", "/repo", "--json"]);
  assert.equal(result.command, "gains");
  assert.equal(result.isLegacy, true);
  assert.equal(result.removed, false);
  // Inferred savings are replaced by the MEASURED receipts surface.
  assert.deepEqual(result.replacement, ["receipts", "--project", "/repo", "--json"]);
  assert.equal(result.replacementCommand, "receipts");
});

test("a removed command with no safe migration has an empty replacement and removed=true", () => {
  const result = mapLegacyCommand(["community-search", "prisma", "--domain", "database"]);
  assert.equal(result.isLegacy, true);
  assert.equal(result.removed, true);
  assert.deepEqual(result.replacement, []);
  assert.equal(result.replacementCommand, null);
  // Still reachable for one major version via `kage legacy ...`.
  assert.match(result.reason, /advisory|community|removed/i);
});

test("a supported v4 command is not treated as legacy", () => {
  assert.equal(isLegacyCommand("context"), false);
  assert.equal(isLegacyCommand("open"), false);
  assert.equal(isLegacyCommand("status"), false);
  const passthrough = mapLegacyCommand(["context", "how do I", "--project", "."]);
  assert.equal(passthrough.isLegacy, false);
  assert.deepEqual(passthrough.replacement, []);
});

test("every deprecation notice carries one replacement, the v5 removal version, and the docs link", () => {
  const notice = formatDeprecationNotice(mapLegacyCommand(["timeline", "--project", "."]));
  assert.match(notice, /deprecated/i);
  assert.ok(notice.includes(V4_REMOVAL_VERSION), "names the removal version");
  assert.ok(notice.includes(LEGACY_DOCS_PATH), "links the migration doc");
  assert.ok(notice.includes("kage open"), "names the single replacement command");
});

test("a removed command's notice states there is no direct replacement", () => {
  const notice = formatDeprecationNotice(mapLegacyCommand(["registry", "--project", "."]));
  assert.match(notice, /no direct replacement|removed/i);
  assert.ok(notice.includes(V4_REMOVAL_VERSION));
  assert.ok(notice.includes(LEGACY_DOCS_PATH));
});

test("legacyReplacementCommands lists only real v4 verbs on the right-hand side", () => {
  const targets = new Set(legacyReplacementCommands());
  // Only supported v4 verbs may appear as replacements.
  const supported = new Set(["open", "status", "context", "receipts", "connect", "doctor", "export", "migrate"]);
  for (const target of targets) {
    assert.equal(supported.has(target), true, `replacement ${target} is not a supported v4 verb`);
  }
});

test("recordLegacyUsage stores only the command name and version — never arguments", () => {
  const home = mkdtempSync(join(tmpdir(), "kage-legacy-usage-"));
  recordLegacyUsage("timeline", { homeDir: home, now: () => "2026-07-21T00:00:00.000Z" });
  const logPath = join(home, "legacy-usage.jsonl");
  assert.equal(existsSync(logPath), true);
  const line = readFileSync(logPath, "utf8").trim().split("\n").pop() as string;
  const entry = JSON.parse(line);
  assert.equal(entry.command, "timeline");
  assert.equal(typeof entry.version, "string");
  assert.equal(entry.at, "2026-07-21T00:00:00.000Z");
  // No argument-shaped keys may be recorded (private paths / query text).
  assert.equal("args" in entry, false);
  assert.equal("argv" in entry, false);
  assert.equal("project" in entry, false);
});

test("recordLegacyUsage never throws when the home dir cannot be written", () => {
  // A path whose parent is a file, so mkdir/append cannot succeed — must fail open.
  const base = mkdtempSync(join(tmpdir(), "kage-legacy-nowrite-"));
  const asFile = join(base, "not-a-dir");
  writeFileSync(asFile, "x", "utf8");
  assert.doesNotThrow(() => recordLegacyUsage("timeline", { homeDir: join(asFile, "child") }));
});

test("scanLegacyCommandUsage finds scripts/config that still invoke legacy commands", () => {
  const root = mkdtempSync(join(tmpdir(), "kage-legacy-scan-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts", "ci.sh"), "#!/bin/sh\nkage timeline --project .\nkage context 'x' --project .\n", "utf8");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { audit: "kage gains --project ." } }), "utf8");
  // A file that only uses supported commands must not be flagged.
  writeFileSync(join(root, "ok.sh"), "kage status --project .\n", "utf8");

  const hits = scanLegacyCommandUsage(root);
  const commands = hits.map((h) => h.command).sort();
  assert.deepEqual([...new Set(commands)].sort(), ["gains", "timeline"]);
  const files = new Set(hits.map((h) => h.file));
  assert.equal(files.has("scripts/ci.sh"), true);
  assert.equal(files.has("package.json"), true);
  assert.equal([...files].some((f) => f === "ok.sh"), false);
  // Each hit names a concrete supported replacement or flags it as removed.
  for (const hit of hits) {
    assert.equal(typeof hit.replacement === "string" || hit.removed === true, true);
  }
});
