import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sessionAttachState, renderAttachState } from "./attach-status.js";

// Sessions attach to the proxy through `env.ANTHROPIC_BASE_URL` in the PROJECT's
// .claude/settings.local.json. That file is read by the agent at startup FROM THE DIRECTORY THE
// AGENT WAS LAUNCHED IN — so wiring a worktree while running the agent from the parent repo
// silently attaches nothing. Nothing surfaced that mismatch, so it stayed invisible until someone
// asked "why is the proxy not being used?". `kage status` now answers it directly.

function repoWith(settings: unknown | null): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-attach-"));
  mkdirSync(join(dir, ".agent_memory"), { recursive: true });
  if (settings !== null) {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(join(dir, ".claude", "settings.local.json"), JSON.stringify(settings, null, 2), "utf8");
  }
  return dir;
}

test("an unwired repo reports not-wired with the exact command to fix it", () => {
  const dir = repoWith(null);
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /no .claude\/settings\.local\.json/i);
  assert.match(renderAttachState(state), /not wired/i);
  assert.match(renderAttachState(state), /kage setup claude-code/);
});

test("a repo wired to this proxy reports wired", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, true);
  assert.equal(state.base_url, "http://localhost:8788");
  assert.match(renderAttachState(state), /every session started here flows through Kage/i);
});

test("a repo pointed at a DIFFERENT endpoint is reported honestly, never as wired", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "https://corp-gateway.example" } });
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, false);
  assert.equal(state.base_url, "https://corp-gateway.example");
  assert.match(state.reason ?? "", /points at another endpoint/i);
  assert.match(renderAttachState(state), /corp-gateway\.example/);
});

test("a wired repo on a different port is not silently called attached", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:9999" } });
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /another endpoint|different port/i);
});

test("settings without an env block reports not-wired, not a crash", () => {
  const dir = repoWith({ permissions: { allow: ["Bash(ls)"] } });
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, false);
  assert.equal(state.base_url, null);
});

test("malformed settings JSON degrades honestly", () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-attach-bad-"));
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "settings.local.json"), "{ not json", "utf8");
  const state = sessionAttachState(dir, 8788);
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /unreadable|could not/i);
});
