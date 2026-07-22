import type { FindingKind, MinimalChangeMode } from "./types.js";

/**
 * Persisted configuration for the Minimal Change Guard (Phase D, Task 10).
 *
 * The guard is OFF and disabled by default. Turning it on — and, in particular, moving it into
 * `enforced` mode where a deterministic finding can gate a PR — is a separate, explicit, user-initiated
 * config edit, never a CLI default. A config that predates this block reads back as the disabled default,
 * so an existing repository's `pr check` is unchanged until an operator opts in.
 */
export interface MinimalChangePolicy {
  /** Whether the guard participates in `pr check` and the API/CLI surfaces at all. */
  enabled: boolean;
  /** How findings are treated. Only `enforced` can ever fail a check, and only for `enforced_rules`. */
  mode: MinimalChangeMode;
  /**
   * The deterministic rule kinds that may block in `enforced` mode. A non-deterministic finding can
   * never block regardless of this list (the honesty rule in `normalizeFinding`).
   */
  enforced_rules: FindingKind[];
}

// The audit-safe default: the guard is disabled and off. Nothing blocks; nothing is even surfaced.
export const DEFAULT_MINIMAL_CHANGE_POLICY: MinimalChangePolicy = {
  enabled: false,
  mode: "off",
  enforced_rules: [],
};

const MODES: readonly MinimalChangeMode[] = ["off", "advisory", "pr_warning", "enforced"];

const FINDING_KINDS: readonly FindingKind[] = [
  "no_change",
  "reuse_existing",
  "use_standard_library",
  "use_platform",
  "use_existing_dependency",
  "minimal_local_change",
  "new_abstraction",
  "new_dependency",
  "duplicate_symbol",
  "scope_expansion",
  "public_contract",
  "missing_verification",
];

function isFindingKind(value: unknown): value is FindingKind {
  return typeof value === "string" && (FINDING_KINDS as readonly string[]).includes(value);
}

function isMode(value: unknown): value is MinimalChangeMode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

/**
 * Read a possibly hand-edited config value into a safe `MinimalChangePolicy`. Anything illegible falls
 * back to the disabled default — a truncated or malformed block must never read as an enabled/enforced
 * state. `enforced_rules` is filtered to known deterministic kinds and de-duplicated for determinism.
 */
export function normalizeMinimalChangePolicy(value: unknown): MinimalChangePolicy {
  if (value === null || typeof value !== "object") return { ...DEFAULT_MINIMAL_CHANGE_POLICY };
  const record = value as Record<string, unknown>;
  const mode = isMode(record.mode) ? record.mode : DEFAULT_MINIMAL_CHANGE_POLICY.mode;
  const enabled = record.enabled === true;
  const rawRules = Array.isArray(record.enforced_rules) ? record.enforced_rules : [];
  const seen = new Set<FindingKind>();
  for (const entry of rawRules) if (isFindingKind(entry)) seen.add(entry);
  const enforced_rules = FINDING_KINDS.filter((kind) => seen.has(kind));
  return { enabled, mode, enforced_rules };
}
