import { createHash } from "node:crypto";

// Phase D Task 6 — honest agent-surface capability certification.
//
// The whole point of this module is refusal: a surface is labeled "automatic"
// ONLY when a transcript-based smoke test proves it. We never infer an automatic
// fallback from installed configuration alone, and we never let a captured
// telemetry stream (which proves capture) masquerade as an injection guarantee.
// Each surface carries a declared injection *ceiling*; a sentinel can confirm the
// ceiling but can never raise a surface above it. Codex, whose plugins package
// skills/MCP but do not establish a Kage-owned session injection hook, has a
// ceiling of `mcp_fallback` and therefore can never be counted as an automatic
// attachment no matter what a transcript shows.

export type CaptureLevel = "automatic" | "manual" | "unavailable";
export type InjectionLevel =
  | "automatic_task"
  | "automatic_session"
  | "gateway"
  | "mcp_fallback"
  | "unavailable";
export type AgentSurface =
  | "claude-code"
  | "anthropic-proxy"
  | "cursor"
  | "codex"
  | "other";
export type SurfaceHealth = "healthy" | "degraded" | "unavailable";

export interface AgentSurfaceCertification {
  surface: AgentSurface;
  surface_version: string;
  capture: CaptureLevel;
  injection: InjectionLevel;
  counts_as_automatic_attachment: boolean;
  certified_at: string;
  fixture_fingerprint: string;
  limitations: string[];
}

export interface CertifySurfaceInput {
  surface: AgentSurface;
  /** Number of capture events (prompts/tools/results) the smoke test observed. */
  capture_events: number;
  /** The sentinel Kage asked the surface to inject into the transcript. */
  requested_sentinel: string;
  /** The observed transcript the surface produced during the smoke test. */
  transcript: string;
  health: SurfaceHealth;
  surface_version?: string;
  /** Optional override so certification records are reproducible in tests/gates. */
  certified_at?: string;
}

interface SurfaceProfile {
  /** The best capture this surface supports when events are actually observed. */
  capture_supported: Exclude<CaptureLevel, "unavailable">;
  /** The best injection this surface can reach when a sentinel is proven. */
  injection_ceiling: InjectionLevel;
  /** What injection degrades to when the sentinel never lands in the transcript. */
  injection_fallback: InjectionLevel;
}

// The declared, source-of-truth ceilings. These are honesty constants, not
// aspirations: raising one requires a passing transcript certification AND a
// documented Kage-owned injection path on that surface.
const SURFACE_PROFILES: Record<AgentSurface, SurfaceProfile> = {
  "claude-code": {
    capture_supported: "automatic",
    injection_ceiling: "automatic_session",
    injection_fallback: "mcp_fallback",
  },
  "anthropic-proxy": {
    capture_supported: "automatic",
    injection_ceiling: "gateway",
    // If the gateway did not forward the sentinel, injection did not happen.
    injection_fallback: "unavailable",
  },
  cursor: {
    capture_supported: "automatic",
    injection_ceiling: "automatic_session",
    injection_fallback: "mcp_fallback",
  },
  codex: {
    capture_supported: "automatic",
    // Codex plugins do not establish a Kage-owned session injection hook. Its
    // honest ceiling is MCP fallback — a sentinel can never raise it.
    injection_ceiling: "mcp_fallback",
    injection_fallback: "mcp_fallback",
  },
  other: {
    capture_supported: "manual",
    injection_ceiling: "unavailable",
    injection_fallback: "unavailable",
  },
};

const AUTOMATIC_INJECTION: ReadonlySet<InjectionLevel> = new Set<InjectionLevel>([
  "automatic_task",
  "automatic_session",
  "gateway",
]);

function fixtureFingerprint(input: CertifySurfaceInput): string {
  // Content-addressed over the meaningful smoke-test inputs only (never the
  // wall-clock certified_at), so identical fixtures fingerprint identically.
  const canonical = JSON.stringify({
    surface: input.surface,
    surface_version: input.surface_version ?? "unknown",
    capture_events: input.capture_events,
    requested_sentinel: input.requested_sentinel,
    transcript: input.transcript,
    health: input.health,
  });
  return "sha256:" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Certify what an agent surface actually supports from a transcript-based smoke
 * test. Returns measured capabilities — never labels a surface automatic from
 * configuration alone. Deterministic given a `certified_at` override.
 */
export function certifySurface(input: CertifySurfaceInput): AgentSurfaceCertification {
  const profile = SURFACE_PROFILES[input.surface] ?? SURFACE_PROFILES.other;
  const limitations: string[] = [];

  const sentinelPresent =
    input.requested_sentinel.length > 0 &&
    input.transcript.includes(input.requested_sentinel);
  const healthy = input.health === "healthy";

  // --- capture ---
  let capture: CaptureLevel;
  if (!healthy) {
    capture = "unavailable";
    limitations.push("Surface health check failed; capabilities recorded as unavailable.");
  } else if (!Number.isInteger(input.capture_events) || input.capture_events <= 0) {
    // Fail CLOSED: capture is "automatic" only on a positive integer count of
    // observed events. undefined / NaN / non-integer / Infinity / negative all
    // certify as unavailable — never fabricate an automatic capture label.
    capture = "unavailable";
    limitations.push("No capture events observed during the smoke test.");
  } else {
    capture = profile.capture_supported;
    if (capture === "manual") {
      limitations.push("Capture requires manual invocation on this surface.");
    }
  }

  // --- injection ---
  let injection: InjectionLevel;
  if (!healthy) {
    injection = "unavailable";
  } else if (
    profile.injection_ceiling === "mcp_fallback" ||
    profile.injection_ceiling === "unavailable"
  ) {
    // A sentinel cannot raise a surface above its declared ceiling.
    injection = profile.injection_ceiling;
  } else if (sentinelPresent) {
    injection = profile.injection_ceiling;
  } else {
    injection = profile.injection_fallback;
    limitations.push(
      "Injection sentinel never reached the transcript; automatic injection not certified.",
    );
  }

  if (injection === "mcp_fallback") {
    limitations.push(
      "Injection uses MCP fallback (the agent must call kage_context); Kage does not own an automatic session-injection hook here.",
    );
  } else if (injection === "unavailable" && healthy) {
    limitations.push("No automatic injection path certified on this surface.");
  }

  if (input.surface === "codex") {
    limitations.push(
      "Codex plugins package skills/MCP but do not establish a Kage-owned session injection hook.",
    );
  }

  const counts_as_automatic_attachment =
    capture === "automatic" && AUTOMATIC_INJECTION.has(injection);

  return {
    surface: input.surface,
    surface_version: input.surface_version ?? "unknown",
    capture,
    injection,
    counts_as_automatic_attachment,
    certified_at: input.certified_at ?? new Date().toISOString(),
    fixture_fingerprint: fixtureFingerprint(input),
    // De-duplicate while preserving first-seen order.
    limitations: [...new Set(limitations)],
  };
}

export { AUTOMATIC_INJECTION, SURFACE_PROFILES };
