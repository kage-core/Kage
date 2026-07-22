import { isRecord } from "../../../type-guards.js";
import type { TokenCounter } from "../../measurement/token-count.js";
import { isOpenAiCompletionsRequest, extractOpenAiUsage } from "../../adapters/openai-proxy.js";
import type { LiveZone } from "../live-zone.js";
import type { MessagesRequestBody } from "../transform.js";
import type { GatewayProviderAdapter } from "./provider.js";

// The OpenAI binding of the pipeline-facing provider adapter.
//
// OpenAI Chat Completions uses the same top-level shape the transform pipeline operates on — a
// `messages` array whose entries carry `content` as a string or as `{type:"text"}` parts — so the
// shipped pipeline steps (append-to-last-user-turn injection, string/parts payload compression)
// apply without any transform changes. What is provider-specific here:
//   - eligibility: POST /v1/chat/completions (the same predicate the OpenAI ProviderGateway uses);
//   - live zone: system/developer messages and every turn before the final USER turn are the stable
//     prefix (OpenAI prompt caching keys on an identical prefix, exactly like Anthropic's cache);
//   - usage: OpenAI `prompt_tokens` is the FULL input total — NOT Anthropic's uncached remainder.
//     The two must never be compared directly; receipts record them under the same fields with
//     provider attribution so aggregation stays per-provider.

export const OPENAI_PIPELINE_PROVIDER = "openai";

export interface OpenAiProviderAdapterOptions {
  /** A MEASURED token counter, or null. OpenAI exposes no count-tokens endpoint, so this is null in
   *  practice and tokenCount is honestly null — never an estimate. */
  tokenCounter?: TokenCounter | null;
}

// OpenAI Chat Completions: every message before the final USER turn is the byte-stable prefix; the
// final user turn (and anything after it) is mutable. Role "system"/"developer" entries live inside
// the messages array and naturally stay in the stable prefix unless one IS the last user turn
// (impossible — they are not user turns), so injected context can never rewrite instructions.
export function openaiLiveZone(request: { messages?: unknown }): LiveZone {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (isRecord(message) && message.role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser === -1) {
    return {
      stable_prefix_end: messages.length,
      mutable_start: messages.length,
      mutable_end: messages.length,
      injection_location: "user_turn",
    };
  }
  return {
    stable_prefix_end: lastUser,
    mutable_start: lastUser,
    mutable_end: messages.length,
    injection_location: "user_turn",
  };
}

export function createOpenAiProviderAdapter(
  options: OpenAiProviderAdapterOptions = {},
): GatewayProviderAdapter<MessagesRequestBody> {
  const tokenCounter = options.tokenCounter ?? null;
  return {
    provider: OPENAI_PIPELINE_PROVIDER,

    isEligible(method, path) {
      return isOpenAiCompletionsRequest(method, path);
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
      return openaiLiveZone(request);
    },

    async tokenCount(request) {
      if (!tokenCounter) return null;
      return tokenCounter(Buffer.from(JSON.stringify(request), "utf8"));
    },

    usage(responseBody) {
      // OpenAI usage semantics: prompt_tokens is the FULL prompt total (cached + uncached).
      const usage = extractOpenAiUsage(responseBody);
      return { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens };
    },

    serialize(request) {
      return Buffer.from(JSON.stringify(request), "utf8");
    },
  };
}
