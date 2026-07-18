import {
  certifySurface,
  type AgentSurfaceCertification,
  type SurfaceHealth,
} from "./capability-matrix.js";

// Phase D Task 6 — honest Codex adapter.
//
// OpenAI documents Codex OpenTelemetry events for prompts, approvals, tool
// results, MCP usage, and proxy decisions
// (https://openai.com/index/running-codex-safely/). Kage consumes those events
// for automatic *capture*. But Codex plugins package skills/apps/MCP rather than
// establishing a general Kage-owned session injection hook
// (https://help.openai.com/en/articles/20001256-plugins-in-codex/). Therefore
// Codex is reported as automatic capture PLUS MCP fallback for injection, and is
// NOT counted as an automatic attachment — until a transcript-based injection
// certification (a Kage-owned session hook) actually passes. certifySurface
// enforces this: Codex's injection ceiling is mcp_fallback, so no transcript can
// upgrade it.

export const CODEX_SURFACE = "codex" as const;

// The OTEL event kinds Kage ingests for automatic capture.
export const CODEX_OTEL_EVENTS = [
  "prompt",
  "approval",
  "tool_result",
  "mcp_usage",
  "proxy_decision",
] as const;

export interface CodexSmokeInput {
  capture_events: number;
  requested_sentinel: string;
  transcript: string;
  health: SurfaceHealth;
  surface_version?: string;
  certified_at?: string;
}

/**
 * The `plugin/codex/otel-config.toml` Kage ships. Deterministic so the committed
 * plugin file cannot drift from the generator.
 */
export function codexOtelConfig(): string {
  const lines = [
    "# Kage Codex OpenTelemetry capture configuration.",
    "# Codex emits these events; Kage ingests them for AUTOMATIC CAPTURE only.",
    "# Injection remains MCP fallback (kage_retrieve / kage_context) — Codex",
    "# plugins do not establish a Kage-owned session injection hook.",
    "",
    "[otel]",
    "enabled = true",
    'exporter = "otlp"',
    "",
    "[otel.events]",
    ...CODEX_OTEL_EVENTS.map((event) => `${event} = true`),
    "",
    "[kage]",
    'capture = "automatic"',
    'injection = "mcp_fallback"',
    "counts_as_automatic_attachment = false",
    "",
  ];
  return lines.join("\n");
}

/**
 * Certify Codex from a transcript-based smoke test. Capture may certify
 * automatic; injection can never exceed mcp_fallback.
 */
export function certifyCodex(input: CodexSmokeInput): AgentSurfaceCertification {
  return certifySurface({ surface: CODEX_SURFACE, ...input });
}
