import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initProject, capture } from "../../mcp/dist/kernel.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The CLAUDE.md a Kage-installed repo carries. The agent is "instructed" only by
// this standing harness (what `kage install` writes) — never by the task itself.
// That is the realistic test: does Kage's own installed guidance change behavior?
const KAGE_CLAUDE_MD = `# Project

This repo uses Kage as an automatic memory harness for coding agents.

## Automatic Recall
Before making code changes, answering repo-specific questions, or debugging,
call \`kage_context\` with the project_dir and the task as the query. Use returned
memory only when it is relevant and source-backed.

## Automatic Capture
When you learn something reusable (a bug cause and fix, a convention, a decision),
create repo-local memory with \`kage_learn\`.
`;

function git(dir, ...args) {
  execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
}

function seedRepo(fixture, files) {
  mkdirSync(join(fixture, "src"), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(fixture, rel)), { recursive: true });
    writeFileSync(join(fixture, rel), content, "utf8");
  }
  writeFileSync(join(fixture, "CLAUDE.md"), KAGE_CLAUDE_MD, "utf8");
  git(fixture, "init", "-q");
  git(fixture, "config", "user.email", "eval@kage");
  git(fixture, "config", "user.name", "kage-eval");
  git(fixture, "add", "-A");
  git(fixture, "commit", "-q", "-m", "fixture");
  initProject(fixture);
}

export const SCENARIOS = [
  {
    id: "recall-before-edit",
    description:
      "A repo with an existing memory about a convention in the file being edited. A well-behaved agent should consult memory before changing the code.",
    task:
      "Add input validation to the login() function in src/auth.js so it rejects an empty username with a clear error.",
    expect: {
      must: ["used_kage", "recalled_before_first_edit"],
      mustNot: ["edited_without_recall"],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/auth.js":
          "export function normalizeUsername(u) { return String(u).trim().toLowerCase(); }\n\n" +
          "export function login(username, password, db) {\n" +
          "  const key = normalizeUsername(username);\n" +
          "  return db.check(key, password);\n" +
          "}\n",
      });
      capture({
        projectDir: fixture,
        title: "Auth convention: usernames must be normalized before lookup",
        body:
          "login() in src/auth.js must pass usernames through normalizeUsername() (trim + lowercase) before any credential check. Usernames are stored normalized, so skipping this causes silent auth failures for mixed-case emails. Any new validation must run on the normalized key.",
        type: "decision",
        paths: ["src/auth.js"],
      });
    },
  },
  {
    id: "capture-after-fix",
    description:
      "A genuine bug to fix. A well-behaved agent should capture the cause-and-fix back to memory once solved.",
    task:
      "There is a bug in src/utils.js: parseDate() returns NaN for valid ISO date strings like '2026-06-14'. Find the cause and fix it.",
    expect: {
      must: ["used_kage", "captured_a_learning"],
      mustNot: [],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/utils.js":
          "export function parseDate(s) {\n" +
          "  // Bug: splits on '/' but ISO dates use '-', so Number(parts) is NaN.\n" +
          "  const parts = String(s).split('/');\n" +
          "  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();\n" +
          "}\n",
      });
    },
  },
];
