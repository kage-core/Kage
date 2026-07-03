import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { driftCheck, formatCheckReport, checkReportMarkdown, writeCheckBaseline } from "./check.js";

function makeRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-check-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content, "utf8");
  }
  return dir;
}

function gitInit(dir: string): void {
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  run(["init", "-q"]);
  run(["config", "user.email", "test@test"]);
  run(["config", "user.name", "test"]);
  run(["add", "-A"]);
  run(["commit", "-q", "-m", "init"]);
}

test("broken path claim is confirmed with two-sided evidence", () => {
  const dir = makeRepo({
    "CLAUDE.md": "Read `src/auth/session.ts` before changing login.\n",
    "src/other.ts": "export {};\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    const finding = report.confirmed[0];
    assert.equal(finding.type, "path");
    assert.equal(finding.claim, "src/auth/session.ts");
    assert.equal(finding.doc, "CLAUDE.md");
    assert.match(finding.evidence, /does not exist/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("existing path claim lands in verified, not confirmed", () => {
  const dir = makeRepo({
    "AGENTS.md": "The entrypoint is `src/main.ts`.\n",
    "src/main.ts": "export {};\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 0);
    assert.equal(report.totals.verified, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doc-dir-relative paths resolve (docs/ links)", () => {
  const dir = makeRepo({
    "docs/guide.md": "See [setup](../scripts/setup.sh) or `../scripts/setup.sh`.\n",
    "scripts/setup.sh": "echo hi\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("paths inside non-shell fences are ignored; npm run inside shell fences is checked", () => {
  const dir = makeRepo({
    "README.md": [
      "```json",
      '{ "file": "conf/missing-a.json" }',
      "```",
      "```bash",
      "npm run definitely-missing",
      "```",
      "```json",
      '{ "cmd": "npm run also-ignored" }',
      "```",
      "",
    ].join("\n"),
    "package.json": JSON.stringify({ name: "x", scripts: { test: "true" } }),
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    assert.equal(report.confirmed[0].claim, "npm run definitely-missing");
    assert.match(report.confirmed[0].evidence, /scripts: test/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("npm script found in a nested workspace package.json verifies", () => {
  const dir = makeRepo({
    "README.md": "Build with `npm run build`.\n",
    "packages/app/package.json": JSON.stringify({ name: "app", scripts: { build: "tsc" } }),
  });
  gitInit(dir);
  try {
    const report = driftCheck(dir);
    const claim = [...report.verified, ...report.unverifiable, ...report.confirmed].find((c) => c.claim === "npm run build");
    assert.ok(claim);
    assert.equal(report.totals.confirmed, 0);
    assert.match(claim.evidence, /packages\/app\/package.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("make target: broken confirmed, .PHONY parsed, English 'make sure' ignored", () => {
  const dir = makeRepo({
    "README.md": [
      "Make sure you read this. Run `make lint` then `make ship`.",
      "",
    ].join("\n"),
    "Makefile": ".PHONY: lint\nlint:\n\ttrue\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    assert.equal(report.confirmed[0].claim, "make ship");
    assert.equal(report.totals.verified, 1); // make lint via .PHONY/target
    assert.ok(!JSON.stringify(report).includes("make sure"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unverifiable bucket: npm run with no package.json anywhere", () => {
  const dir = makeRepo({ "README.md": "Run `npm run dev`.\n" });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 0);
    assert.equal(report.totals.unverifiable, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hypothetical and placeholder paths are unverifiable, not confirmed", () => {
  const dir = makeRepo({
    "CLAUDE.md": [
      "Components live in files like `src/components/MyComponent.tsx`, e.g. `src/foo/bar.ts`.",
      "Built output goes to `dist/cli.js`.",
      "",
    ].join("\n"),
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 0);
    assert.ok(report.totals.unverifiable >= 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("baseline suppresses accepted findings; new drift still gates", () => {
  const dir = makeRepo({
    "CLAUDE.md": "Old ref `src/gone.ts`.\n",
    "src/present.ts": "export {};\n", // top-level src/ must exist for a missing leaf to confirm
  });
  try {
    let report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    writeCheckBaseline(dir, report);
    report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 0);
    assert.equal(report.totals.suppressed_baseline, 1);
    // New drift after baseline is not suppressed.
    writeFileSync(join(dir, "CLAUDE.md"), "Old ref `src/gone.ts`. New ref `src/also-gone.ts`.\n", "utf8");
    report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    assert.equal(report.confirmed.filter((c) => !c.preexisting)[0].claim, "src/also-gone.ts");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--base mode: only drift attributable to the diff counts; the rest is preexisting", () => {
  const dir = makeRepo({
    "CLAUDE.md": "Preexisting broken ref `src/never-existed.ts`.\n",
    "src/real.ts": "export {};\n",
  });
  gitInit(dir);
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  // Commit 2: delete a file the docs reference from a NEW doc line.
  writeFileSync(join(dir, "AGENTS.md"), "Uses `src/real.ts` heavily.\n", "utf8");
  run(["add", "-A"]);
  run(["commit", "-q", "-m", "add agents doc"]);
  rmSync(join(dir, "src/real.ts"));
  run(["add", "-A"]);
  run(["commit", "-q", "-m", "delete real.ts"]);
  try {
    const report = driftCheck(dir, { base: "HEAD~1" });
    const active = report.confirmed.filter((c) => !c.preexisting);
    assert.equal(active.length, 1);
    assert.equal(active[0].claim, "src/real.ts");
    assert.match(active[0].evidence, /deleted in [0-9a-f]+/);
    assert.equal(report.totals.suppressed_preexisting, 1); // src/never-existed.ts predates the diff
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("json report shape and formatter honesty (no estimates, empty state is plain)", () => {
  const dir = makeRepo({
    "README.md": "See `src/index.ts`.\n",
    "src/index.ts": "export {};\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.schema_version, 1);
    assert.deepEqual(Object.keys(report.totals).sort(), ["confirmed", "suppressed_baseline", "suppressed_preexisting", "unverifiable", "verified"]);
    const text = formatCheckReport(report);
    assert.match(text, /confirmed drift: 0 · verified true: 1/);
    for (const banned of ["saved", "token", "\\$", "score", "faster"]) {
      assert.ok(!new RegExp(banned, "i").test(text), `formatter must not say "${banned}"`);
    }
    const md = checkReportMarkdown(report);
    assert.match(md, /No new drift/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing path under an absent top-level dir is unverifiable (out-of-tree), under a real dir it confirms", () => {
  const dir = makeRepo({
    "CLAUDE.md": "The tool installs `.factory/commands/run.md`. Tests live in `tests/image-tests/run.sh`.\n",
    "tests/other.sh": "true\n",
  });
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed, 1);
    assert.equal(report.confirmed[0].claim, "tests/image-tests/run.sh");
    assert.equal(report.totals.unverifiable, 1);
    assert.match(report.unverifiable[0].evidence, /does not exist in this tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty repo is a graceful no-op", () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-check-empty-"));
  try {
    const report = driftCheck(dir);
    assert.equal(report.totals.confirmed + report.totals.verified + report.totals.unverifiable, 0);
    assert.match(formatCheckReport(report), /no agent-context or doc files found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
