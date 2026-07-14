import type { MeasurementQuality } from "../protocol/index.js";
import { isRecord } from "../../type-guards.js";

// Phase A exists to produce a truthful exact-vs-partial number, so this module has exactly one
// rule: a token count is either something a provider MEASURED, or it is null. There is no
// estimator here on purpose — no bytes/4, no tokenizer approximation, no interpolation. A
// number that Kage invented must never be able to reach a receipt.

export interface ProviderUsage {
  input_tokens: number | null;
  output_tokens: number | null;
}

export const NO_PROVIDER_USAGE: ProviderUsage = { input_tokens: null, output_tokens: null };

// A usage field only counts if it is a real, nonnegative integer count. Anything else (missing,
// a string, a float, NaN, negative) is "not measured", which is null — never 0. Defaulting to 0
// is how an unmeasured request silently becomes a free one.
export function measuredCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

export function measurementQuality(before: number | null, after: number | null): MeasurementQuality {
  if (before !== null && after !== null) return "exact";
  return before !== null || after !== null ? "partial" : "unavailable";
}

function usageFromRecord(usage: unknown, previous: ProviderUsage): ProviderUsage {
  if (!isRecord(usage)) return previous;
  const input = measuredCount(usage.input_tokens);
  const output = measuredCount(usage.output_tokens);
  return {
    input_tokens: input ?? previous.input_tokens,
    output_tokens: output ?? previous.output_tokens,
  };
}

// Reads what the provider reported, from either a non-streamed JSON body or a streamed SSE
// transcript. Never throws: a malformed or truncated body is "unmeasured", not an error.
export function extractProviderUsage(raw: string): ProviderUsage {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json)) return usageFromRecord(json.usage, NO_PROVIDER_USAGE);
    } catch { /* fall through to the SSE parse */ }
    return NO_PROVIDER_USAGE;
  }

  let usage = NO_PROVIDER_USAGE;
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event: unknown = JSON.parse(payload);
      if (!isRecord(event)) continue;
      // Anthropic reports input tokens once on message_start, then revises output tokens on
      // message_delta. Later events overwrite earlier ones only when they carry a real count.
      if (isRecord(event.message)) usage = usageFromRecord(event.message.usage, usage);
      usage = usageFromRecord(event.usage, usage);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return usage;
}

// The one legitimate way to obtain the token count of a body Kage did NOT send: ask the provider
// to count it. Returns null on any failure — measurement is best-effort and must fail open.
export type TokenCounter = (body: Buffer) => Promise<number | null>;
