import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isRecord } from "../../type-guards.js";
import { KAGE_PROTOCOL_VERSION, type ProtocolVersion } from "../protocol/index.js";

// Phase A is an AUDIT phase. The config file is the only thing the Claude hook adapter and the
// Anthropic gateway read to decide whether they may touch a prompt, so "audit" is the only value
// this module is able to write. There is deliberately no writer parameter for assist: turning on
// prompt mutation must be a separate, explicit, user-initiated act — never a CLI default, and
// never something a caller can pass through `connect`.
export type VnextMode = "audit" | "assist";
export const VNEXT_AUDIT_MODE = "audit" as const;

export const VNEXT_ADAPTERS = ["claude-code", "proxy"] as const;
export type VnextAdapter = (typeof VNEXT_ADAPTERS)[number];

export interface VnextConfig {
  vnext: {
    protocol_version: ProtocolVersion;
    /** How the local runtime treats agent traffic. Phase A: audit only. */
    runtime: VnextMode;
    /** How the provider gateway treats request bodies. Phase A: audit only — bytes forwarded as sent. */
    gateway: VnextMode;
    adapters: VnextAdapter[];
  };
}

export function vnextConfigPath(projectDir: string): string {
  return join(resolve(projectDir), ".agent_memory", "daemon", "vnext", "config.json");
}

export function isVnextAdapter(value: unknown): value is VnextAdapter {
  return typeof value === "string" && (VNEXT_ADAPTERS as readonly string[]).includes(value);
}

export function normalizeAdapters(values: readonly string[] | undefined): VnextAdapter[] {
  const wanted = values?.length ? values : [...VNEXT_ADAPTERS];
  const seen = new Set<VnextAdapter>();
  for (const value of wanted) {
    const trimmed = value.trim();
    if (isVnextAdapter(trimmed)) seen.add(trimmed);
  }
  return [...VNEXT_ADAPTERS].filter((adapter) => seen.has(adapter));
}

/**
 * The audit config, built from the adapter selection and nothing else. No timestamp, no host
 * state: `connect` runs against a live repo repeatedly, so the same selection must produce the
 * same bytes.
 */
export function auditConfig(adapters: readonly string[] | undefined): VnextConfig {
  return {
    vnext: {
      protocol_version: KAGE_PROTOCOL_VERSION,
      runtime: VNEXT_AUDIT_MODE,
      gateway: VNEXT_AUDIT_MODE,
      adapters: normalizeAdapters(adapters),
    },
  };
}

export function writeVnextConfig(projectDir: string, config: VnextConfig): string {
  const path = vnextConfigPath(projectDir);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const contents = `${JSON.stringify(config, null, 2)}\n`;
  let existing: string | null = null;
  try {
    existing = readFileSync(path, "utf8");
  } catch {
    existing = null;
  }
  // Idempotent by bytes: an unchanged config is not rewritten, so `kage connect` never touches
  // an mtime (or a watcher) for nothing.
  if (existing !== contents) writeFileSync(path, contents, { encoding: "utf8", mode: 0o600 });
  return path;
}

function mode(value: unknown): VnextMode | null {
  return value === "audit" || value === "assist" ? value : null;
}

/**
 * Reads the config as a wire value, not as trusted state: a hand-edited or truncated file must
 * read as "not connected", never as a mode. Returns null when there is nothing legible.
 */
export function readVnextConfig(projectDir: string): VnextConfig | null {
  let raw: string;
  try {
    raw = readFileSync(vnextConfigPath(projectDir), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.vnext)) return null;
  const vnext = parsed.vnext;
  const runtime = mode(vnext.runtime);
  const gateway = mode(vnext.gateway);
  if (!runtime || !gateway) return null;
  const adapters = Array.isArray(vnext.adapters) ? vnext.adapters.filter(isVnextAdapter) : [];
  return {
    vnext: {
      protocol_version: KAGE_PROTOCOL_VERSION,
      runtime,
      gateway,
      adapters,
    },
  };
}
