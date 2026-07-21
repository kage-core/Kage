import { isRecord } from "../../../type-guards.js";
import { extractProviderUsage, type TokenCounter } from "../../measurement/token-count.js";
import { isCompletionsRequest } from "../../adapters/anthropic-proxy.js";
import { anthropicLiveZone } from "../live-zone.js";
import type { MessagesRequestBody } from "../transform.js";
import type { GatewayProviderAdapter } from "./provider.js";
import { createOpenAiProviderAdapter, OPENAI_PIPELINE_PROVIDER } from "./openai.js";
import { createGeminiProviderAdapter, GEMINI_PIPELINE_PROVIDER } from "./gemini.js";

// The Anthropic binding of the pipeline-facing provider adapter (Task 5). It wraps the SAME wire
// logic the shipped Anthropic gateway already uses — path eligibility (isCompletionsRequest), the
// last-user-turn live zone (anthropicLiveZone, exactly what injectLastUserTurn respects), and usage
// extraction — so the transform pipeline sees one consistent Anthropic contract. It is the ONLY
// provider adapter enabled in Phase D.

export const ANTHROPIC_PROVIDER = "anthropic";

export interface AnthropicProviderAdapterOptions {
  /**
   * A MEASURED token counter (a provider count_tokens probe), or null. When absent, tokenCount is
   * honestly null rather than an estimate. The proxy leaves this null in the request path and does
   * its count_tokens measurement AFTER the client has been answered, so a probe never adds latency.
   */
  tokenCounter?: TokenCounter | null;
}

export function createAnthropicProviderAdapter(
  options: AnthropicProviderAdapterOptions = {},
): GatewayProviderAdapter<MessagesRequestBody> {
  const tokenCounter = options.tokenCounter ?? null;
  return {
    provider: ANTHROPIC_PROVIDER,

    isEligible(method, path) {
      return isCompletionsRequest(method, path);
    },

    parse(body) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.toString("utf8"));
      } catch {
        return null;
      }
      if (!isRecord(parsed) || !Array.isArray(parsed.messages)) return null;
      return parsed as MessagesRequestBody;
    },

    liveZone(request) {
      return anthropicLiveZone(request);
    },

    async tokenCount(request) {
      if (!tokenCounter) return null;
      return tokenCounter(Buffer.from(JSON.stringify(request), "utf8"));
    },

    usage(responseBody) {
      const usage = extractProviderUsage(responseBody);
      return { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens };
    },

    serialize(request) {
      return Buffer.from(JSON.stringify(request), "utf8");
    },
  };
}

// Pipeline registry: Anthropic (Phase D), OpenAI and Gemini (W1) are wired to the cache-aware
// transform pipeline, each with its own live-zone/injection/usage fixtures. OpenAI shares the
// pipeline's native message shape; Gemini goes through a deterministic, lossless contents<->messages
// view in its adapter (see providers/gemini.ts). An unknown provider still returns null and the
// proxy skips the pipeline for it (fail-open, byte-preserving).
export function providerAdapterFor(
  provider: string,
  options: AnthropicProviderAdapterOptions = {},
): GatewayProviderAdapter<MessagesRequestBody> | null {
  if (provider === ANTHROPIC_PROVIDER) return createAnthropicProviderAdapter(options);
  if (provider === OPENAI_PIPELINE_PROVIDER) return createOpenAiProviderAdapter(options);
  if (provider === GEMINI_PIPELINE_PROVIDER) return createGeminiProviderAdapter(options);
  return null;
}
