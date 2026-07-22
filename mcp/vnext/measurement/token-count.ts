import type { MeasurementQuality } from "../protocol/index.js";
import type { PromptTokenBreakdown } from "./pricing.js";
import { isRecord } from "../../type-guards.js";

// Phase A exists to produce a truthful exact-vs-partial number, so this module has exactly one
// rule: a token count is either something a provider MEASURED, or it is null. There is no
// estimator here on purpose — no bytes/4, no tokenizer approximation, no interpolation. A
// number that Kage invented must never be able to reach a receipt.

export interface CacheCreationByTtl {
  ephemeral_5m_input_tokens: number;
  ephemeral_1h_input_tokens: number;
}

// The provider's usage block, in the shape the Anthropic API actually returns it. The trap this
// module exists to close: `input_tokens` is the UNCACHED REMAINDER of the prompt, not the prompt.
// On a cached Claude Code request it is a few hundred tokens while the real prompt is tens of
// thousands, the rest sitting in cache_read_input_tokens. Anything that compares `input_tokens`
// against a count_tokens number is comparing two different quantities.
export interface ProviderUsage {
  /** The UNCACHED REMAINDER only — never the size of the prompt. */
  input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  /** Present only when the extended-TTL cache beta is in play; splits cache writes by TTL. */
  cache_creation: CacheCreationByTtl | null;
  output_tokens: number | null;
}

export const NO_PROVIDER_USAGE: ProviderUsage = {
  input_tokens: null,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
  cache_creation: null,
  output_tokens: null,
};

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

// THE number that is allowed on a receipt: the size of the whole prompt the provider processed,
// which is exactly what /v1/messages/count_tokens measures for a body. That is what makes the two
// sides of a receipt commensurable. If ANY component of the total is missing or unparseable the
// total is null — a partial sum would read as a measurement of the whole prompt, and that is the
// lie this function exists to prevent.
export function totalPromptTokens(usage: ProviderUsage): number | null {
  const parts = [usage.input_tokens, usage.cache_creation_input_tokens, usage.cache_read_input_tokens];
  if (parts.some((part) => part === null)) return null;
  return (parts as number[]).reduce((total, part) => total + part, 0);
}

// The same prompt, split by the rate each part was actually billed at. Null whenever the provider
// did not report enough for that split to be a measurement rather than a guess.
export function promptTokenBreakdown(usage: ProviderUsage): PromptTokenBreakdown | null {
  const uncached = usage.input_tokens;
  const writes = usage.cache_creation_input_tokens;
  const reads = usage.cache_read_input_tokens;
  if (uncached === null || writes === null || reads === null) return null;

  const ttl = usage.cache_creation;
  if (ttl) {
    // Trust the per-TTL split only if it accounts for the writes the provider reported.
    if (ttl.ephemeral_5m_input_tokens + ttl.ephemeral_1h_input_tokens !== writes) return null;
    return {
      uncached_input_tokens: uncached,
      cache_write_5m_tokens: ttl.ephemeral_5m_input_tokens,
      cache_write_1h_tokens: ttl.ephemeral_1h_input_tokens,
      cache_read_tokens: reads,
    };
  }

  // No per-TTL split means the extended-TTL cache beta was not in play, and the API's documented
  // default TTL is 5 minutes. This is the one documented-default the module leans on; a 1h write
  // always arrives WITH the split handled above.
  return {
    uncached_input_tokens: uncached,
    cache_write_5m_tokens: writes,
    cache_write_1h_tokens: 0,
    cache_read_tokens: reads,
  };
}

function cacheCreationFromRecord(value: unknown, previous: CacheCreationByTtl | null): CacheCreationByTtl | null {
  if (!isRecord(value)) return previous;
  const fiveMinutes = measuredCount(value.ephemeral_5m_input_tokens);
  const oneHour = measuredCount(value.ephemeral_1h_input_tokens);
  if (fiveMinutes === null || oneHour === null) return previous;
  return { ephemeral_5m_input_tokens: fiveMinutes, ephemeral_1h_input_tokens: oneHour };
}

function usageFromRecord(usage: unknown, previous: ProviderUsage): ProviderUsage {
  if (!isRecord(usage)) return previous;
  return {
    input_tokens: measuredCount(usage.input_tokens) ?? previous.input_tokens,
    cache_creation_input_tokens:
      measuredCount(usage.cache_creation_input_tokens) ?? previous.cache_creation_input_tokens,
    cache_read_input_tokens:
      measuredCount(usage.cache_read_input_tokens) ?? previous.cache_read_input_tokens,
    cache_creation: cacheCreationFromRecord(usage.cache_creation, previous.cache_creation),
    output_tokens: measuredCount(usage.output_tokens) ?? previous.output_tokens,
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
      // Anthropic reports input and cache tokens once on message_start, then revises output tokens
      // on message_delta. Later events overwrite earlier ones only when they carry a real count.
      if (isRecord(event.message)) usage = usageFromRecord(event.message.usage, usage);
      usage = usageFromRecord(event.usage, usage);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return usage;
}

// The one legitimate way to obtain the token count of a body Kage did NOT send: ask the provider
// to count it. Returns null on any failure — measurement is best-effort and must fail open.
export type TokenCounter = (body: Buffer) => Promise<number | null>;
