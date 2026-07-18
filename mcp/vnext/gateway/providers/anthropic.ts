import { isRecord } from "../../../type-guards.js";
import { extractProviderUsage, type TokenCounter } from "../../measurement/token-count.js";
import { isCompletionsRequest } from "../../adapters/anthropic-proxy.js";
import { anthropicLiveZone } from "../live-zone.js";
import type { MessagesRequestBody } from "../transform.js";
import type { GatewayProviderAdapter } from "./provider.js";

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

// Phase D pipeline registry: only Anthropic is wired to the cache-aware transform pipeline. Other
// providers (OpenAI, Gemini) still get provider-neutral injection through the ProviderGateway, but
// no Phase D compression until they ship their own cache/injection fixtures — so this returns null
// for them and the proxy skips the pipeline (fail-open, byte-preserving) for those providers.
export function providerAdapterFor(
  provider: string,
  options: AnthropicProviderAdapterOptions = {},
): GatewayProviderAdapter<MessagesRequestBody> | null {
  return provider === ANTHROPIC_PROVIDER ? createAnthropicProviderAdapter(options) : null;
}
