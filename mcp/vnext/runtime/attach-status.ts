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
  /**
   * The endpoint the CURRENTLY RUNNING host actually resolved, when this command runs inside an
   * agent session (inherited env). Null when unknown — e.g. a plain terminal invocation.
   */
  live_base_url?: string | null;
  /**
   * Set when the settings say one thing and the running host does another. Some hosts — notably the
   * Claude DESKTOP app (CLAUDE_CODE_ENTRYPOINT=claude-desktop) — inject ANTHROPIC_BASE_URL
   * themselves and never read it from project settings, so a correct settings file attaches
   * nothing there. Reporting "wired" in that case would be a comfortable lie.
   */
  host_override?: { host: string; effective: string } | null;
}

function proxyUrls(port: number): string[] {
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
}

type Env = Record<string, string | undefined>;

/**
 * Which agent host is running this command, if any. Only a real host marker counts: a user who
 * exports ANTHROPIC_BASE_URL in their shell profile and runs `kage status` from a plain terminal is
 * not "a session", and must not be reported as one.
 */
function runningHost(env: Env): string | null {
  const entry = env.CLAUDE_CODE_ENTRYPOINT;
  return typeof entry === "string" && entry.trim() ? entry.trim() : null;
}

/** Hosts that resolve their own endpoint and never read it from project settings. */
function hostIgnoresProjectSettings(host: string): boolean {
  return host === "claude-desktop";
}

/** Read this directory's agent settings and decide whether sessions started here reach the proxy. */
export function sessionAttachState(projectDir: string, port: number, env: Env = process.env): SessionAttachState {
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

  const settingsEnv =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? ((parsed as Record<string, unknown>).env as Record<string, unknown> | undefined)
      : undefined;
  const raw = settingsEnv && typeof settingsEnv === "object" ? settingsEnv.ANTHROPIC_BASE_URL : undefined;
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

  // The settings are correct. That is NOT the same as this session being attached: when a host
  // resolves its own endpoint, a perfect settings file routes nothing, and restarting will never
  // change it. Compare against what the running host actually resolved and say so.
  const host = runningHost(env);
  const live = typeof env.ANTHROPIC_BASE_URL === "string" ? env.ANTHROPIC_BASE_URL.trim() : "";
  if (host && live && !proxyUrls(port).includes(live.replace(/\/+$/, ""))) {
    return {
      ...base,
      wired: false,
      base_url: baseUrl,
      live_base_url: live,
      host_override: { host, effective: live },
      reason:
        `settings are wired to ${baseUrl}, but the running host (${host}) resolved ${live} itself` +
        (hostIgnoresProjectSettings(host)
          ? " — this host sets ANTHROPIC_BASE_URL on its own and never reads it from project settings, so no restart will attach it"
          : " — its own environment wins over project settings"),
    };
  }

  return { ...base, wired: true, base_url: baseUrl, reason: null, live_base_url: live || null, host_override: null };
}

/** One status line (plus the fix when it is not wired). */
export function renderAttachState(state: SessionAttachState): string {
  if (state.wired) {
    return `  attach:        wired (${state.base_url}) — every session started here flows through Kage, no \`kage run\` needed`;
  }
  if (state.host_override) {
    // Deliberately does not suggest re-running setup: setup already did its job, and telling someone
    // to restart into the same result is the failure this line exists to prevent.
    const fix = hostIgnoresProjectSettings(state.host_override.host)
      ? `for proxy coverage start the agent from a terminal in this repo (\`claude\`) or use \`kage run -- <agent>\`; memory still reaches this host through the hooks`
      : `unset ANTHROPIC_BASE_URL in the launching environment, or use \`kage run -- <agent>\``;
    return `  attach:        NOT attached in THIS session — ${state.reason}; ${fix}`;
  }
  const fix = `run \`kage setup claude-code --project ${state.project_dir} --write\`, then restart the agent`;
  return `  attach:        NOT wired — ${state.reason}; ${fix}`;
}
