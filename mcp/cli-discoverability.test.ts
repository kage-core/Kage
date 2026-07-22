import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A command that runs but appears in no help output is a command nobody can find.
//
// `kage okf` was exactly that for an unknown stretch: four working subcommands, referenced by this
// repo's own CLAUDE.md, absent from `kage help --all`. `audit-log`, `memory-handoff`, and a dozen
// other aliases were the same. You could only learn they existed by reading cli.ts.
//
// This test closes that door: every command the CLI dispatches must be reachable from either the
// full reference or the legacy map. Adding a command and forgetting to document it now fails CI
// rather than quietly shipping.

// dist/cli-discoverability.test.js -> mcp/ (the build emits CommonJS, so __dirname is available)
const mcpRoot = join(__dirname, "..");
const cliJs = join(mcpRoot, "dist", "cli.js");
const cliTs = join(mcpRoot, "cli.ts");

/**
 * Meta-commands that are their own discovery mechanism. Exempting these is not a loophole for
 * "commands I did not feel like documenting" — it is exactly the two verbs whose whole job is to
 * print the lists this test checks against.
 */
const SELF_EVIDENT = new Set(["help", "legacy"]);

function run(...args: string[]): string {
  try {
    return execFileSync(process.execPath, [cliJs, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    // Some help verbs exit non-zero; their stdout is still the thing under test.
    const out = (error as { stdout?: string }).stdout;
    if (typeof out === "string" && out) return out;
    throw error;
  }
}

/** Every command string the CLI actually dispatches on. */
function dispatchedCommands(): string[] {
  const source = readFileSync(cliTs, "utf8");
  const found = new Set<string>();
  for (const match of source.matchAll(/command === "([a-z0-9-]+)"/g)) found.add(match[1]);
  return [...found].sort();
}

test("the CLI dispatches a non-trivial number of commands (guards the parser itself)", () => {
  // If the regex above ever stops matching, every other assertion here passes vacuously.
  assert.ok(dispatchedCommands().length > 50, `expected a large command surface, got ${dispatchedCommands().length}`);
});

test("every dispatched command is discoverable in help or the legacy map", () => {
  const documented = `${run("help", "--all")}\n${run("legacy", "--help")}`;
  const missing = dispatchedCommands()
    .filter((command) => !SELF_EVIDENT.has(command))
    .filter((command) => !new RegExp(`(^|\\s)kage ${command}(\\s|$)`, "m").test(documented));

  assert.deepEqual(
    missing,
    [],
    `these commands run but appear in no help output, so a user can only find them by reading cli.ts:\n  ${missing.join("\n  ")}`,
  );
});

test("kage okf stays discoverable — the command that motivated this test", () => {
  // Named explicitly so a future refactor that drops it from help fails with an obvious reason,
  // not just a long diff in the test above.
  assert.match(run("help", "--all"), /kage okf/);
});
