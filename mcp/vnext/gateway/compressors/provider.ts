import { diffCompressor } from "./diff.js";
import { jsonCompressor } from "./json.js";
import { logCompressor } from "./logs.js";
import { stackTraceCompressor } from "./stack-trace.js";
import { testOutputCompressor } from "./test-output.js";
import type { Compressor, CompressorProvider } from "./types.js";

// The deterministic built-in compressors are the DEFAULT and the only core-runtime dependency.
//
// An external provider implements the same `CompressorProvider` interface but stays disabled unless
// repository policy selects it AND its privacy, license, latency, retrieval, and golden-output checks
// pass. No external compressor is ever a core dependency (Task 2 step 4).

export function builtinCompressors(): Compressor[] {
  return [logCompressor, jsonCompressor, testOutputCompressor, diffCompressor, stackTraceCompressor];
}

export function builtinCompressorProvider(): CompressorProvider {
  return {
    provider_id: "builtin",
    compressors(): Compressor[] {
      return builtinCompressors();
    },
    async health(): Promise<{ ok: boolean; reason: string }> {
      // Pure deterministic code with no external dependency: always healthy.
      return { ok: true, reason: "builtin deterministic compressors" };
    },
  };
}

// Selects the first built-in compressor that supports the input, if any. The pipeline (Task 4) uses
// this to pick a type-specific transform; a null result means "leave the payload untouched".
export function selectCompressor(
  input: Parameters<Compressor["supports"]>[0],
  compressors: Compressor[] = builtinCompressors(),
): Compressor | null {
  for (const compressor of compressors) {
    if (compressor.supports(input)) return compressor;
  }
  return null;
}
