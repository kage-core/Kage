import {
  certifySurface,
  type AgentSurfaceCertification,
  type SurfaceHealth,
} from "./capability-matrix.js";

// Phase D Task 6 — honest Cursor adapter.
//
// Cursor's documented hook configuration lives in a project-level
// `.cursor/hooks.json` with sessionStart / beforeSubmitPrompt / tool / stop
// hooks (see https://cursor.com/blog/agent-best-practices). Kage installs those
// hooks so a certified Cursor version can deliver *session-level* context at
// sessionStart. We deliberately do NOT claim prompt-specific injection from
// beforeSubmitPrompt: Cursor's currently documented hook output does not
// reliably support returning per-prompt context, so beforeSubmitPrompt is used
// only to record the task event. The automatic_session label is earned solely
// through a passing transcript certification, never from installed config.

export const CURSOR_SURFACE = "cursor" as const;

export const CURSOR_HOOK_SCRIPT = "kage-hook.sh";

export interface CursorSmokeInput {
  capture_events: number;
  requested_sentinel: string;
  transcript: string;
  health: SurfaceHealth;
  surface_version?: string;
  certified_at?: string;
}

interface CursorHookEntry {
  command: string;
}

export interface CursorHooksConfig {
  version: number;
  hooks: {
    sessionStart: CursorHookEntry[];
    beforeSubmitPrompt: CursorHookEntry[];
    afterFileEdit: CursorHookEntry[];
    stop: CursorHookEntry[];
  };
}

/**
 * The project-level `.cursor/hooks.json` Kage installs. Deterministic so the
 * committed plugin file cannot drift from the generator.
 */
export function cursorHooksConfig(script = CURSOR_HOOK_SCRIPT): CursorHooksConfig {
  const command = `./.cursor/${script}`;
  return {
    version: 1,
    hooks: {
      // sessionStart is the only hook that may return context — and only after
      // certification proves the configured Cursor version delivers it.
      sessionStart: [{ command: `${command} sessionStart` }],
      // beforeSubmitPrompt records the task event only; it does not claim
      // prompt-specific injection.
      beforeSubmitPrompt: [{ command: `${command} beforeSubmitPrompt` }],
      afterFileEdit: [{ command: `${command} afterFileEdit` }],
      stop: [{ command: `${command} stop` }],
    },
  };
}

/**
 * Certify Cursor from a transcript-based smoke test. Session injection is only
 * certified automatic when the sentinel actually reaches the transcript.
 */
export function certifyCursor(input: CursorSmokeInput): AgentSurfaceCertification {
  return certifySurface({ surface: CURSOR_SURFACE, ...input });
}
