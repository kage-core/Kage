// Pure type guards shared across the kernel and its leaf modules (proxy,
// registry). Dependency-free leaf module — imports nothing, so pulling it out
// carries no circular-dependency risk. Was defined three times independently
// (kernel.ts, proxy.ts, registry/index.ts) before this extraction.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
