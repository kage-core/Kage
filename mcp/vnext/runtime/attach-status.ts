import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Is a coding agent started IN THIS DIRECTORY actually routed through the Kage proxy?
//
// Attach works by `env.ANTHROPIC_BASE_URL` in the project's `.claude/settings.local.json`, which the
// agent reads AT STARTUP FROM THE DIRECTORY IT WAS LAUNCHED IN. That makes a silent failure mode
// possible and easy: wire one directory (a git worktree, a subpackage) while actually running the
// agent from another (the parent repo), and everything looks healthy — the proxy is up, memory is
// full, the hooks fire — while not one request ever reaches the proxy.
//
// Nothing surfaced that mismatch, so it stayed invisible until someone thought to ask. This module
// answers it directly, and `kage status` prints it next to the proxy line. Honesty rules apply as
// everywhere else: a repo pointed at a DIFFERENT endpoint is reported as not-wired WITH the endpoint
// it actually points at (never silently "attached"), and an unreadable settings file says so rather
// than being reported as either state.

export interface SessionAttachState {
  /** True only when this directory routes agents at THIS proxy. */
  wired: boolean;
  /** The directory whose settings were read — the one an agent must be launched from. */
  project_dir: string;
  /** Whatever ANTHROPIC_BASE_URL the settings actually carry, or null when absent/unreadable. */
  base_url: string | null;
  /** Why it is not wired, in words a reader can act on. Null when wired. */
  reason: string | null;
}

function proxyUrls(port: number): string[] {
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
}

/** Read this directory's agent settings and decide whether sessions started here reach the proxy. */
export function sessionAttachState(projectDir: string, port: number): SessionAttachState {
  const dir = resolve(projectDir);
  const settingsPath = join(dir, ".claude", "settings.local.json");
  const base: Omit<SessionAttachState, "wired" | "reason" | "base_url"> = { project_dir: dir };

  if (!existsSync(settingsPath)) {
    return {
      ...base,
      wired: false,
      base_url: null,
      reason: "no .claude/settings.local.json in this directory — sessions started here go straight to the provider",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    return {
      ...base,
      wired: false,
      base_url: null,
      reason: "could not read .claude/settings.local.json (unreadable or malformed JSON)",
    };
  }

  const env =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? ((parsed as Record<string, unknown>).env as Record<string, unknown> | undefined)
      : undefined;
  const raw = env && typeof env === "object" ? env.ANTHROPIC_BASE_URL : undefined;
  const baseUrl = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  if (!baseUrl) {
    return {
      ...base,
      wired: false,
      base_url: null,
      reason: "settings carry no env.ANTHROPIC_BASE_URL — sessions started here go straight to the provider",
    };
  }

  const normalized = baseUrl.replace(/\/+$/, "");
  if (!proxyUrls(port).includes(normalized)) {
    return {
      ...base,
      wired: false,
      base_url: baseUrl,
      reason: `env.ANTHROPIC_BASE_URL points at another endpoint (${baseUrl}), not this proxy on port ${port} — a deliberate override is respected, never silently replaced`,
    };
  }

  return { ...base, wired: true, base_url: baseUrl, reason: null };
}

/** One status line (plus the fix when it is not wired). */
export function renderAttachState(state: SessionAttachState): string {
  if (state.wired) {
    return `  attach:        wired (${state.base_url}) — every session started here flows through Kage, no \`kage run\` needed`;
  }
  const fix = `run \`kage setup claude-code --project ${state.project_dir} --write\`, then restart the agent`;
  return `  attach:        NOT wired — ${state.reason}; ${fix}`;
}
