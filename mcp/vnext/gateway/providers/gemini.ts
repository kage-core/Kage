import { isRecord } from "../../../type-guards.js";
import type { TokenCounter } from "../../measurement/token-count.js";
import { isGeminiGenerateRequest, extractGeminiUsage } from "../../adapters/gemini-proxy.js";
import type { LiveZone } from "../live-zone.js";
import type { MessagesRequestBody } from "../transform.js";
import type { GatewayProviderAdapter } from "./provider.js";

// The Gemini binding of the pipeline-facing provider adapter.
//
// Gemini generateContent does not use `messages`: turns live in `contents[]` as `{role, parts[]}`,
// where a text part is `{text: "..."}`. The transform pipeline operates on a `messages` array whose
// entries carry `content` as a string or `{type:"text"}` blocks — so this adapter maps the Gemini
// wire into that shape on parse and EXACTLY back on serialize:
//   contents[i] = {role, parts}  ->  messages[i] = {role, content: parts.map(text? -> block)}
//   {text: T, ...rest}           ->  {type:"text", text: T, ...rest}      (and back, dropping `type`)
//   any non-text part            ->  passed through UNTOUCHED (functionCall/functionResponse/inlineData)
// The mapping is deterministic and lossless for every real Gemini part shape (Gemini parts carry no
// `type` key of their own), so audit stays byte-equivalent modulo this reversible view, injection
// lands as a text part in the final user turn, and payload compression sees text parts as
// {type:"text"} blocks. systemInstruction and every `contents` entry before the final user turn are
// the stable prefix (Gemini context caching keys on an identical prefix, like the other providers).
//
// Usage semantics: `promptTokenCount` is the FULL input total — like OpenAI's prompt_tokens, NOT
// Anthropic's uncached remainder. Receipts stay per-provider; totals are never cross-compared.

export const GEMINI_PIPELINE_PROVIDER = "gemini";

export interface GeminiProviderAdapterOptions {
  /** A MEASURED token counter (Gemini exposes countTokens), or null — never an estimate. */
  tokenCounter?: TokenCounter | null;
}

interface GeminiRequestView extends MessagesRequestBody {
  /** Retained so serialize can restore the exact original key order/fields around `contents`. */
  [key: string]: unknown;
}

function partToBlock(part: unknown): unknown {
  if (isRecord(part) && typeof part.text === "string" && !("type" in part)) {
    return { type: "text", ...part };
  }
  return part;
}

function blockToPart(block: unknown): unknown {
  if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
    const { type: _type, ...rest } = block;
    return rest;
  }
  return block;
}

function contentToMessage(entry: unknown): unknown {
  if (!isRecord(entry) || !Array.isArray(entry.parts)) return entry;
  const { parts, ...rest } = entry;
  return { ...rest, content: parts.map(partToBlock) };
}

function messageToContent(message: unknown): unknown {
  if (!isRecord(message)) return message;
  const content = message.content;
  const { content: _content, ...rest } = message;
  if (typeof content === "string") {
    // An injected/compressed string body becomes a single text part.
    return { ...rest, parts: [{ text: content }] };
  }
  if (Array.isArray(content)) {
    return { ...rest, parts: content.map(blockToPart) };
  }
  return message;
}

/** Map a Gemini request to the pipeline's messages view. Null when it is not a Gemini body. */
export function geminiToPipelineView(body: Record<string, unknown>): GeminiRequestView | null {
  if (!Array.isArray(body.contents)) return null;
  const { contents, ...rest } = body;
  return { ...rest, messages: contents.map(contentToMessage) } as GeminiRequestView;
}

/** Restore the exact Gemini wire shape from the pipeline view. */
export function pipelineViewToGemini(request: MessagesRequestBody): Record<string, unknown> {
  const { messages, ...rest } = request as Record<string, unknown> & { messages: unknown[] };
  return { ...rest, contents: (messages ?? []).map(messageToContent) };
}

// Gemini: every `contents` entry before the final USER turn is the stable prefix; the final user
// turn (and anything after) is mutable. systemInstruction is a sibling field, never in the zone.
export function geminiLiveZone(request: { messages?: unknown }): LiveZone {
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

export function createGeminiProviderAdapter(
  options: GeminiProviderAdapterOptions = {},
): GatewayProviderAdapter<MessagesRequestBody> {
  const tokenCounter = options.tokenCounter ?? null;
  return {
    provider: GEMINI_PIPELINE_PROVIDER,

    isEligible(method, path) {
      return isGeminiGenerateRequest(method, path);
    },

    parse(body) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.toString("utf8"));
      } catch {
        return null;
      }
      if (!isRecord(parsed)) return null;
      return geminiToPipelineView(parsed);
    },

    liveZone(request) {
      return geminiLiveZone(request);
    },

    async tokenCount(request) {
      if (!tokenCounter) return null;
      return tokenCounter(this.serialize(request));
    },

    usage(responseBody) {
      // Gemini usage semantics: promptTokenCount is the FULL prompt total.
      const usage = extractGeminiUsage(responseBody);
      return { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens };
    },

    serialize(request) {
      return Buffer.from(JSON.stringify(pipelineViewToGemini(request)), "utf8");
    },
  };
}
