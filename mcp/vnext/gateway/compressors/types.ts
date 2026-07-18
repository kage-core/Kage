// Deterministic, type-specific context compressors for the Phase D gateway pipeline.
//
// A compressor is a PURE, DETERMINISTIC string -> string transform: same input bytes always yield the
// same output bytes, no wall-clock, no randomUUID, no I/O. It never throws on arbitrary UTF-8; on any
// internal failure it FAILS OPEN, returning the original body unchanged with `compressor: "none"`.
//
// Compressors themselves do NOT store originals or embed retrieval ids. Reversibility is guaranteed by
// the pipeline (Task 4): it writes the exact pre-compression bytes to the content-addressed store
// (Task 1) BEFORE calling a lossy compressor, and attaches the returned `kage-content:<sha256>`
// reference next to the compressed output. A compressor's only job is to report whether its output is
// `lossy` and the byte accounting the pipeline needs to measure real savings.

export type CompressorId = "logs" | "json" | "test_output" | "diff" | "stack_trace";

export type CompressorKind = CompressorId | "none";

export interface CompressionInput {
  body: string;
  media_type: string;
  task_id: string;
  token_budget: number;
}

export interface CompressionResult {
  compressor: CompressorKind;
  output: string;
  lossy: boolean;
  original_bytes: number;
  output_bytes: number;
  warnings: string[];
}

export interface Compressor {
  id: CompressorId;
  supports(input: CompressionInput): boolean;
  compress(input: CompressionInput): CompressionResult;
}

export interface CompressorProvider {
  provider_id: string;
  compressors(): Compressor[];
  health(): Promise<{ ok: boolean; reason: string }>;
}

export function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

// A fail-open / no-op passthrough result. Used both when a compressor does not apply to the input and
// when it hits an internal error on arbitrary bytes. Never lossy, never smaller.
export function passthroughResult(body: string, warnings: string[] = []): CompressionResult {
  const bytes = byteLength(body);
  return {
    compressor: "none",
    output: body,
    lossy: false,
    original_bytes: bytes,
    output_bytes: bytes,
    warnings,
  };
}

// Wraps a lossy compression function so any throw on arbitrary UTF-8 becomes a fail-open passthrough.
// This is the single choke point that guarantees the fuzz contract (never throws) for every built-in.
export function guardCompression(body: string, run: () => CompressionResult): CompressionResult {
  try {
    const result = run();
    // Defensive: never claim savings we did not achieve.
    if (result.output_bytes > result.original_bytes) {
      return passthroughResult(body, [...result.warnings, "compression grew output; passthrough"]);
    }
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return passthroughResult(body, [`compressor failed open: ${reason}`]);
  }
}
