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
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /no .claude\/settings\.local\.json/i);
  assert.match(renderAttachState(state), /not wired/i);
  assert.match(renderAttachState(state), /kage setup claude-code/);
});

test("a repo wired to this proxy reports wired", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, true);
  assert.equal(state.base_url, "http://localhost:8788");
  assert.match(renderAttachState(state), /every session started here flows through Kage/i);
});

test("a repo pointed at a DIFFERENT endpoint is reported honestly, never as wired", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "https://corp-gateway.example" } });
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, false);
  assert.equal(state.base_url, "https://corp-gateway.example");
  assert.match(state.reason ?? "", /points at another endpoint/i);
  assert.match(renderAttachState(state), /corp-gateway\.example/);
});

test("a wired repo on a different port is not silently called attached", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:9999" } });
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /another endpoint|different port/i);
});

test("settings without an env block reports not-wired, not a crash", () => {
  const dir = repoWith({ permissions: { allow: ["Bash(ls)"] } });
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, false);
  assert.equal(state.base_url, null);
});

test("malformed settings JSON degrades honestly", () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-attach-bad-"));
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "settings.local.json"), "{ not json", "utf8");
  const state = sessionAttachState(dir, 8788, {});
  assert.equal(state.wired, false);
  assert.match(state.reason ?? "", /unreadable|could not/i);
});

test("a correct settings file is NOT reported as attached when the host resolves its own endpoint", () => {
  // The Claude DESKTOP app injects ANTHROPIC_BASE_URL itself and never reads project settings, so a
  // perfectly wired repo attaches nothing there. Reporting "wired" sent someone through two restarts
  // chasing a state that could not happen; the status line now says so instead.
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788, {
    CLAUDE_CODE_ENTRYPOINT: "claude-desktop",
    ANTHROPIC_BASE_URL: "https://api.anthropic.com",
  });
  assert.equal(state.wired, false);
  assert.equal(state.base_url, "http://localhost:8788");
  assert.equal(state.live_base_url, "https://api.anthropic.com");
  assert.equal(state.host_override?.host, "claude-desktop");
  const line = renderAttachState(state);
  assert.match(line, /NOT attached in THIS session/);
  assert.match(line, /never reads it from project settings/);
  assert.match(line, /no restart will attach it/);
  // It must not send the reader back through setup — setup is not the problem.
  assert.doesNotMatch(line, /kage setup claude-code/);
  // Memory still reaches this host by hooks; say so rather than implying total loss.
  assert.match(line, /hooks/);
});

test("a host that DOES honour settings and resolved this proxy reports wired", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788, {
    CLAUDE_CODE_ENTRYPOINT: "cli",
    ANTHROPIC_BASE_URL: "http://localhost:8788",
  });
  assert.equal(state.wired, true);
  assert.equal(state.host_override, null);
});

test("a shell export outside any session is not mistaken for a host override", () => {
  // No host marker means no session: `kage status` from a plain terminal whose profile exports
  // ANTHROPIC_BASE_URL must still report the repo's real wiring, not invent an override.
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788, { ANTHROPIC_BASE_URL: "https://api.anthropic.com" });
  assert.equal(state.wired, true);
  assert.equal(state.host_override, null);
});

test("a non-desktop host override names the endpoint and gives an env-level fix", () => {
  const dir = repoWith({ env: { ANTHROPIC_BASE_URL: "http://localhost:8788" } });
  const state = sessionAttachState(dir, 8788, {
    CLAUDE_CODE_ENTRYPOINT: "cli",
    ANTHROPIC_BASE_URL: "https://corp-gateway.example",
  });
  assert.equal(state.wired, false);
  assert.match(renderAttachState(state), /corp-gateway\.example/);
  assert.match(renderAttachState(state), /unset ANTHROPIC_BASE_URL|kage run/);
});
