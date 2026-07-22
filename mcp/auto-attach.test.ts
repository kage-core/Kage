import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupAgent } from "./kernel.js";

// Auto-attach UX: `kage setup claude-code --write` (and therefore `kage install`) wires
// ANTHROPIC_BASE_URL into the PROJECT's personal settings (.claude/settings.local.json), so every
// Claude Code session started in the repo flows through the kage proxy with no `kage run` and no
// export. The session-start hook gains an ensure-up block so a session that starts while the proxy
// is down (fresh boot) restarts it instead of failing to reach the API.

function freshDirs(): { project: string; home: string } {
  const project = mkdtempSync(join(tmpdir(), "kage-attach-proj-"));
  const home = mkdtempSync(join(tmpdir(), "kage-attach-home-"));
  mkdirSync(join(project, ".agent_memory"), { recursive: true });
  return { project, home };
}

test("setup claude-code --write wires auto-attach into the project's settings.local.json", () => {
  const { project, home } = freshDirs();
  const result = setupAgent("claude-code", project, { write: true, homeDir: home });
  assert.equal(result.wrote, true);

  const settingsPath = join(project, ".claude", "settings.local.json");
  assert.ok(existsSync(settingsPath), "settings.local.json must be created");
  const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { env?: Record<string, string> };
  assert.equal(settings.env?.ANTHROPIC_BASE_URL, "http://localhost:8788");
});

test("a user's existing ANTHROPIC_BASE_URL is never clobbered", () => {
  const { project, home } = freshDirs();
  const settingsPath = join(project, ".claude", "settings.local.json");
  mkdirSync(join(project, ".claude"), { recursive: true });
  writeFileSync(
    settingsPath,
    JSON.stringify({ env: { ANTHROPIC_BASE_URL: "https://corp-gateway.example", OTHER: "kept" }, permissions: { allow: ["x"] } }, null, 2),
    "utf8",
  );

  setupAgent("claude-code", project, { write: true, homeDir: home });

  const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as {
    env?: Record<string, string>;
    permissions?: unknown;
  };
  assert.equal(settings.env?.ANTHROPIC_BASE_URL, "https://corp-gateway.example", "user value wins");
  assert.equal(settings.env?.OTHER, "kept", "unrelated env survives");
  assert.ok(settings.permissions, "unrelated settings survive");
});

test("setup is idempotent for the attach wiring", () => {
  const { project, home } = freshDirs();
  setupAgent("claude-code", project, { write: true, homeDir: home });
  setupAgent("claude-code", project, { write: true, homeDir: home });
  const settings = JSON.parse(readFileSync(join(project, ".claude", "settings.local.json"), "utf8")) as {
    env?: Record<string, string>;
  };
  assert.equal(settings.env?.ANTHROPIC_BASE_URL, "http://localhost:8788");
});

test("the session-start hook contains the guarded proxy ensure-up block", () => {
  const { project, home } = freshDirs();
  setupAgent("claude-code", project, { write: true, homeDir: home });
  const script = readFileSync(join(home, ".claude", "kage", "hooks", "session-start.sh"), "utf8");
  assert.match(script, /Proxy ensure-up \(auto-attach\)/);
  assert.match(script, /ANTHROPIC_BASE_URL.*settings\.local\.json/, "gated on the repo actually being attach-wired");
  assert.match(script, /nc -z 127\.0\.0\.1 8788/, "checks the port before acting");
  assert.match(script, /kage up --project "\$CWD" --mode "\$KAGE_UP_MODE"/, "starts the proxy with the recorded mode");
  assert.match(script, /KAGE_UP_MODE="audit"/, "audit-safe default when no state is recorded");
});
