import { isRecord } from "../../type-guards.js";
import {
  measuredCount,
  NO_PROVIDER_USAGE,
  type ProviderUsage,
} from "../measurement/token-count.js";

// The OpenAI-compatible gateway's wire semantics, kept out of the neutral proxy core exactly like
// anthropic-proxy.ts. It covers BOTH OpenAI request shapes:
//   - chat/completions: a `messages[]` array with role "system"/"developer"/"user"/"assistant".
//   - responses:        a top-level `instructions` string (the system-equivalent) plus `input`,
//                        which is EITHER a bare user string OR an array of items.
// Everything here fails open: an unexpected shape means "no parseable prompt" / "measure nothing",
// never a throw into the request path.

export const OPENAI_PROXY_ADAPTER_ID = "openai-proxy";
export const OPENAI_PROXY_PROVIDER = "openai";

// Eligible completions are EXACTLY POST /v1/chat/completions and POST /v1/responses, sans query
// string (mirroring isCompletionsRequest's exact-match discipline). Everything else — /v1/embeddings,
// /v1/models, /v1/moderations, the /v1/chat/completions/... siblings, and every GET — is a strict
// passthrough the core measures nothing about and never injects into.
export function isOpenAiCompletionsRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== "POST") return false;
  const path = (url ?? "").split("?")[0];
  return path === "/v1/chat/completions" || path === "/v1/responses";
}

// A message/item's content is EITHER a plain string OR an array of content parts. The parts differ by
// surface — chat uses {type:"text",text}, responses input uses {type:"input_text",text}, output uses
// {type:"output_text",text} — so text is read off ANY part that carries a string `text`, which covers
// all three without hard-coding a type name. Anything else (image parts, junk) contributes nothing.
function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { text: string } => isRecord(part) && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n");
  }
  return "";
}

function hasRole(value: unknown, roles: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && typeof value.role === "string" && roles.includes(value.role);
}

// chat/completions: the system prompt is every system/developer message flattened. Read only — the
// system role is never rewritten (the byte-identity concern that motivated appending to the user turn).
function chatSystemText(messages: unknown[]): string {
  return messages
    .filter((message): message is Record<string, unknown> => hasRole(message, ["system", "developer"]))
    .map((message) => contentToText(message.content))
    .filter(Boolean)
    .join("\n");
}

function chatLastUserText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!hasRole(messages[i], ["user"])) continue;
    const text = contentToText((messages[i] as Record<string, unknown>).content);
    if (text) return text;
  }
  return "";
}

// responses: the system-equivalent is `instructions` (a string), NOT a system message — plus any
// system/developer ITEMS that appear in an array-form input. Both are read-only for workspace routing.
function responsesSystemText(body: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof body.instructions === "string" && body.instructions) parts.push(body.instructions);
  if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (!hasRole(item, ["system", "developer"])) continue;
      const text = contentToText((item as Record<string, unknown>).content);
      if (text) parts.push(text);
    }
  }
  return parts.join("\n");
}

function responsesLastUserText(body: Record<string, unknown>): string {
  const input = body.input;
  // A bare string input IS the user turn.
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    for (let i = input.length - 1; i >= 0; i--) {
      if (!hasRole(input[i], ["user"])) continue;
      const text = contentToText((input[i] as Record<string, unknown>).content);
      if (text) return text;
    }
  }
  return "";
}

// The `messages` array is the unambiguous chat/completions signal; otherwise treat the body as a
// responses request (which is also the safe fallback for a body that is neither — it just yields "").
export function openAiSystemText(body: Record<string, unknown>): string {
  if (Array.isArray(body.messages)) return chatSystemText(body.messages);
  return responsesSystemText(body);
}

export function openAiLastUserText(body: Record<string, unknown>): string {
  if (Array.isArray(body.messages)) return chatLastUserText(body.messages);
  return responsesLastUserText(body);
}

// Append the composed memory to the LAST USER TURN, mirroring the Anthropic choice — the system
// prompt / `instructions` / developer messages are NEVER touched, preserving their exact bytes (the
// OAuth-equivalent identity concern). `applied` is false when there is no user turn to attach to, and
// the caller then treats the body as untransformed. Audit forwards the client's original bytes
// regardless; this only shapes the candidate the receipt measures.
function appendToContent(content: unknown, memoryText: string, partType: string): unknown {
  if (typeof content === "string") return `${content}\n\n${memoryText}`;
  if (Array.isArray(content)) return [...content, { type: partType, text: memoryText }];
  // A user turn with an unrecognized content shape: replace it with the memory text as a plain string,
  // exactly as injectLastUserTurn does for Anthropic. Never throws.
  return memoryText;
}

function injectChat(body: Record<string, unknown>, memoryText: string): { body: Record<string, unknown>; applied: boolean } {
  const messages = [...(body.messages as unknown[])];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!hasRole(messages[i], ["user"])) continue;
    const message = messages[i] as Record<string, unknown>;
    messages[i] = { ...message, content: appendToContent(message.content, memoryText, "text") };
    return { body: { ...body, messages }, applied: true };
  }
  return { body, applied: false };
}

function injectResponses(body: Record<string, unknown>, memoryText: string): { body: Record<string, unknown>; applied: boolean } {
  const input = body.input;
  if (typeof input === "string") {
    return { body: { ...body, input: `${input}\n\n${memoryText}` }, applied: true };
  }
  if (Array.isArray(input)) {
    const items = [...input];
    for (let i = items.length - 1; i >= 0; i--) {
      if (!hasRole(items[i], ["user"])) continue;
      const item = items[i] as Record<string, unknown>;
      // responses input content parts are `input_text`, not `text`.
      items[i] = { ...item, content: appendToContent(item.content, memoryText, "input_text") };
      return { body: { ...body, input: items }, applied: true };
    }
  }
  return { body, applied: false };
}

export function injectOpenAi(body: Record<string, unknown>, memoryText: string): { body: Record<string, unknown>; applied: boolean } {
  if (Array.isArray(body.messages)) return injectChat(body, memoryText);
  return injectResponses(body, memoryText);
}

// VERIFIED (2026-07-15). OpenAI reports the FULL prompt count INCLUDING cached tokens, and the cached
// portion is a SUBSET reported separately — the opposite of Anthropic, whose usage.input_tokens is the
// uncached remainder. So the total is the reported prompt count DIRECTLY; do NOT sum.
//   - chat/completions: usage.prompt_tokens (full) / usage.prompt_tokens_details.cached_tokens (subset)
//     / usage.completion_tokens (output). Source: https://platform.openai.com/docs/guides/prompt-caching
//   - responses:        usage.input_tokens (full) / usage.input_tokens_details.cached_tokens (subset)
//     / usage.output_tokens (output). Source: https://platform.openai.com/docs/api-reference/responses/object
// This normalizes both shapes into the SHARED neutral ProviderUsage by decomposing the full prompt into
// (uncached remainder) + (cache-read subset). totalPromptTokens then returns the whole prompt, and the
// shared receipt/pricing path works unchanged. OpenAI bills no separate cache-WRITE token line, so
// cache_creation is a measured 0 (not null): the whole prompt total is known, only the write split is 0.
function neutralOpenAiUsage(usage: Record<string, unknown>): ProviderUsage {
  const prompt = measuredCount(usage.prompt_tokens ?? usage.input_tokens);
  const output = measuredCount(usage.completion_tokens ?? usage.output_tokens);
  if (prompt === null) {
    // No measured prompt total ⇒ the whole prompt side is honestly unavailable (null), never 0.
    return { ...NO_PROVIDER_USAGE, output_tokens: output };
  }
  const details: Record<string, unknown> = isRecord(usage.prompt_tokens_details)
    ? usage.prompt_tokens_details
    : isRecord(usage.input_tokens_details)
      ? usage.input_tokens_details
      : {};
  // A cache MISS omits cached_tokens (or reports 0), so absent ⇒ 0 cached, never null: the prompt total
  // is fully known and only the cached split is empty. Defend against a malformed cached>prompt.
  let cached = measuredCount(details.cached_tokens) ?? 0;
  if (cached > prompt) cached = prompt;
  return {
    input_tokens: prompt - cached,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: cached,
    cache_creation: null,
    output_tokens: output,
  };
}

// Reads what OpenAI reported, from a non-streamed JSON body OR a streamed SSE transcript. Streaming
// usage appears ONLY when the client sent stream_options.include_usage (chat) or on the responses
// `response.completed` event — always on the FINAL chunk; absent ⇒ honestly unavailable, never
// fabricated. Never throws: a malformed or truncated body is "unmeasured", not an error.
export function extractOpenAiUsage(raw: string): ProviderUsage {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json)) {
        if (isRecord(json.usage)) return neutralOpenAiUsage(json.usage);
        // Defensive: a responses transcript may nest the terminal object under `response`.
        if (isRecord(json.response) && isRecord(json.response.usage)) return neutralOpenAiUsage(json.response.usage);
      }
    } catch { /* fall through to unavailable */ }
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
      // Only the FINAL chunk carries usage; a later complete usage overwrites an earlier one.
      if (isRecord(event.usage)) usage = neutralOpenAiUsage(event.usage);
      else if (isRecord(event.response) && isRecord(event.response.usage)) usage = neutralOpenAiUsage(event.response.usage);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return usage;
}

// Parse the assistant tool calls OpenAI returned, from a non-streamed JSON body or a streamed SSE
// transcript. Only the tool NAME (+ its id) is read — a tool call's ARGUMENTS are never turned into
// evidence (privacy). Never throws: a malformed or truncated body yields no calls.
export function parseOpenAiToolCalls(raw: string): Array<{ name: string; id: string }> {
  const calls: Array<{ name: string; id: string }> = [];

  // chat/completions: choices[].message.tool_calls[] = { id, type:"function", function:{ name, arguments } }
  const pushChatToolCall = (toolCall: unknown): void => {
    if (!isRecord(toolCall)) return;
    const fn = toolCall.function;
    const name = isRecord(fn) && typeof fn.name === "string" ? fn.name : "";
    if (!name.trim()) return;
    calls.push({ name, id: typeof toolCall.id === "string" ? toolCall.id : "" });
  };
  // responses: output items of type "function_call" = { type:"function_call", call_id/id, name, arguments }
  const pushResponsesItem = (item: unknown): void => {
    if (!isRecord(item) || item.type !== "function_call") return;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name.trim()) return;
    const id = typeof item.call_id === "string" ? item.call_id : typeof item.id === "string" ? item.id : "";
    calls.push({ name, id });
  };

  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json)) {
        if (Array.isArray(json.choices)) {
          for (const choice of json.choices) {
            if (isRecord(choice) && isRecord(choice.message) && Array.isArray(choice.message.tool_calls)) {
              choice.message.tool_calls.forEach(pushChatToolCall);
            }
          }
        }
        if (Array.isArray(json.output)) json.output.forEach(pushResponsesItem);
        if (isRecord(json.response) && Array.isArray(json.response.output)) json.response.output.forEach(pushResponsesItem);
      }
    } catch { /* not JSON we understand — no tool calls */ }
    return calls;
  }

  // Streaming. chat/completions splits a tool call across deltas keyed by `index`: the name + id arrive
  // on the first delta, argument fragments on later ones (ignored). responses completes each call in a
  // `response.output_item.done` event and repeats them in the terminal `response.completed` output —
  // deduped here by id (or name) so a call is not double-counted.
  const chatByIndex = new Map<number, { name: string; id: string }>();
  const responsesCalls: Array<{ name: string; id: string }> = [];
  const seenResponses = new Set<string>();
  const collectResponsesItem = (item: unknown): void => {
    if (!isRecord(item) || item.type !== "function_call") return;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name.trim()) return;
    const id = typeof item.call_id === "string" ? item.call_id : typeof item.id === "string" ? item.id : "";
    const key = id || `name:${name}`;
    if (seenResponses.has(key)) return;
    seenResponses.add(key);
    responsesCalls.push({ name, id });
  };

  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event: unknown = JSON.parse(payload);
      if (!isRecord(event)) continue;
      if (Array.isArray(event.choices)) {
        for (const choice of event.choices) {
          if (!isRecord(choice) || !isRecord(choice.delta) || !Array.isArray(choice.delta.tool_calls)) continue;
          for (const toolCall of choice.delta.tool_calls) {
            if (!isRecord(toolCall) || typeof toolCall.index !== "number") continue;
            const existing = chatByIndex.get(toolCall.index) ?? { name: "", id: "" };
            const fn = toolCall.function;
            if (isRecord(fn) && typeof fn.name === "string" && fn.name) existing.name = fn.name;
            if (typeof toolCall.id === "string" && toolCall.id) existing.id = toolCall.id;
            chatByIndex.set(toolCall.index, existing);
          }
        }
      }
      if (isRecord(event.item)) collectResponsesItem(event.item);
      if (isRecord(event.response) && Array.isArray(event.response.output)) event.response.output.forEach(collectResponsesItem);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }

  for (const call of chatByIndex.values()) if (call.name.trim()) calls.push(call);
  calls.push(...responsesCalls);
  return calls;
}
