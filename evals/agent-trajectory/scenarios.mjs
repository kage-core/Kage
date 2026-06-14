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
  {
    id: "answer-from-memory",
    description:
      "A question, not a change. A well-behaved agent should consult memory and answer without editing any code.",
    task:
      "How does session expiry work in this service? Summarize the rule a contributor needs to know. Do not change any code.",
    expect: {
      must: ["used_kage", "answered_without_editing"],
      mustNot: ["edited_code"],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/session.js":
          "export const SESSION_TTL_MS = 30 * 60 * 1000;\n\n" +
          "export function isExpired(session, now) {\n" +
          "  return now - session.lastSeen > SESSION_TTL_MS;\n" +
          "}\n",
      });
      capture({
        projectDir: fixture,
        title: "Session expiry is sliding, not absolute",
        body:
          "isExpired() in src/session.js compares now against session.lastSeen, so the 30-minute TTL is a sliding window reset on every request, not an absolute cap from login. Any change to expiry must preserve the sliding behavior or it will silently log active users out.",
        type: "decision",
        paths: ["src/session.js"],
      });
    },
  },
  {
    id: "reconcile-after-change",
    description:
      "Editing a file that existing memory cites. A well-behaved agent should recall first and then reconcile/supersede the affected memory after changing the code.",
    task:
      "Change the default request timeout in src/config.js from 30 seconds to 60 seconds.",
    expect: {
      must: ["used_kage", "recalled_before_first_edit", "maintained_after_edit"],
      mustNot: ["edited_without_recall"],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/config.js":
          "export const config = {\n" +
          "  // 30s default chosen to match the upstream gateway's hard cutoff.\n" +
          "  requestTimeoutMs: 30000,\n" +
          "};\n",
      });
      capture({
        projectDir: fixture,
        title: "Request timeout is 30s to match the upstream gateway cutoff",
        body:
          "config.requestTimeoutMs in src/config.js is 30000 deliberately: the upstream gateway hard-cuts requests at 30s, so a higher client timeout just wastes connections waiting on responses that were already killed. Revisit only if the gateway cutoff changes.",
        type: "decision",
        paths: ["src/config.js"],
      });
    },
  },
  {
    // Was a known gap; now enforced. After de-confounding the task wording (the
    // agent previously stopped to ask a clarifying question) and cutting the tool
    // surface to the core, the agent reliably recalls the old decision and
    // supersedes it. Recorded passing 2026-06-14.
    id: "supersede-outdated-decision",
    description:
      "A task that invalidates an existing decision. A well-behaved agent should recall the old decision and supersede/reconcile it after refactoring, not silently leave a contradicting memory.",
    task:
      "Convert getUser() in src/db.js to async/await. It is fine to drop the callback signature entirely; just make the change.",
    expect: {
      must: ["used_kage", "recalled_before_first_edit", "maintained_after_edit"],
      mustNot: ["edited_without_recall"],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/db.js":
          "export function getUser(id, cb) {\n" +
          "  query('SELECT * FROM users WHERE id = ?', [id], function (err, rows) {\n" +
          "    if (err) return cb(err);\n" +
          "    cb(null, rows[0]);\n" +
          "  });\n" +
          "}\n",
      });
      capture({
        projectDir: fixture,
        title: "Decision: db layer uses Node-style callbacks",
        body:
          "src/db.js intentionally uses Node-style (err, result) callbacks rather than promises, to stay compatible with the legacy query() driver that has no promise interface. New db functions should follow the callback convention.",
        type: "decision",
        paths: ["src/db.js"],
      });
    },
  },
  {
    // A memory contradicted by the current code. A well-behaved agent should
    // recall it, check the source, and CORRECT it — and the recording shows the
    // agent prefers superseding/relearning over a bare stale flag, which is better
    // hygiene. The rubric accepts any correction (feedback OR supersede OR learn).
    id: "mark-stale-feedback",
    description:
      "A memory contradicted by the current code. The agent should recall it, check the source, and correct the stale memory (feedback, supersede, or a relearn).",
    task:
      "What is our API rate limit and where is it enforced? The existing notes may be out of date — verify against the code and fix anything wrong.",
    expect: {
      must: ["used_kage", "inspected_source", "corrected_memory"],
      mustNot: [],
    },
    setup(fixture) {
      // Capture the memory while the limit is 100, then change the code to 1000 so
      // the packet is genuinely wrong/stale against the current source.
      seedRepo(fixture, {
        "src/limits.js":
          "export function checkLimit(count) {\n" +
          "  const MAX_PER_MIN = 100;\n" +
          "  return count <= MAX_PER_MIN;\n" +
          "}\n",
      });
      capture({
        projectDir: fixture,
        title: "API rate limit is 100 requests/min",
        body:
          "checkLimit() in src/limits.js enforces a hard cap of 100 requests per minute. Clients exceeding it are rejected. This is the documented public rate limit.",
        type: "decision",
        paths: ["src/limits.js"],
      });
      writeFileSync(
        join(fixture, "src", "limits.js"),
        "export function checkLimit(count) {\n  const MAX_PER_MIN = 1000;\n  return count <= MAX_PER_MIN;\n}\n",
        "utf8"
      );
    },
  },
  {
    id: "onboard-scan",
    description:
      "A newcomer asking what to watch out for. A well-behaved agent should consult Kage's repo knowledge and answer without editing.",
    task:
      "I'm new to this repo. Before I touch anything, what conventions or risky areas should I know about?",
    expect: {
      must: ["used_kage", "answered_without_editing"],
      mustNot: ["edited_code"],
    },
    setup(fixture) {
      seedRepo(fixture, {
        "src/payments.js":
          "export function charge(amountCents, card) {\n" +
          "  if (!Number.isInteger(amountCents)) throw new Error('amount must be integer cents');\n" +
          "  return gateway.charge(amountCents, card);\n" +
          "}\n",
      });
      capture({
        projectDir: fixture,
        title: "Money is always integer cents, never floats",
        body:
          "charge() in src/payments.js requires amountCents to be an integer number of cents. Never pass floating-point dollars anywhere in the payments path: floating-point rounding silently corrupts charge amounts. This is the single most important convention in the repo.",
        type: "decision",
        paths: ["src/payments.js"],
      });
    },
  },
];
