import { isRecord } from "../../type-guards.js";
import {
  measuredCount,
  NO_PROVIDER_USAGE,
  type ProviderUsage,
} from "../measurement/token-count.js";

// The Gemini gateway's wire semantics, kept out of the neutral proxy core exactly like
// anthropic-proxy.ts and openai-proxy.ts. Gemini's shape differs from both in one structural way that
// drives this whole file: the MODEL is in the PATH, not the body
// (POST /v1beta/models/{model}:generateContent), and the request body is `contents[]` + an optional
// `systemInstruction` rather than `messages`/`input`. Everything here fails open: an unexpected shape
// means "no parseable prompt" / "measure nothing", never a throw into the request path.
//
// Sources verified 2026-07-15:
//   - request/response shape (contents, systemInstruction, parts, functionCall, usageMetadata):
//     https://ai.google.dev/api/generate-content
//   - usageMetadata token semantics + :countTokens: https://ai.google.dev/api/tokens

export const GEMINI_PROXY_ADAPTER_ID = "gemini-proxy";
export const GEMINI_PROXY_PROVIDER = "gemini";

// The generation actions Kage injects into and measures. A Gemini method is the segment after the
// FINAL colon in the path (resource:action). Only these two are completions; the siblings
// :countTokens, :embedContent and :batchGenerateContent are strict passthroughs Kage measures
// nothing about and never injects into (injecting into :countTokens would corrupt the client's own
// token accounting, the same trap the Anthropic matcher guards against for /v1/messages/count_tokens).
const GEMINI_GENERATION_ACTIONS = new Set(["generateContent", "streamGenerateContent"]);

// A `/models/{model}` resource: the model segment carries no slash. `{model}` may be a bare family
// name (gemini-2.5-flash) or a versioned id (gemini-2.0-flash-001). Tuned models live under a
// different resource (/tunedModels/{id}) and are intentionally NOT matched — the scope is /models/.
const GEMINI_MODEL_RESOURCE = /\/models\/([^/]+)$/;

// Split a Gemini path (query already stripped) into its resource and action around the final colon.
// Null when there is no `resource:action` colon at all.
function splitGeminiPath(url: string | undefined): { resource: string; action: string } | null {
  const path = (url ?? "").split("?")[0];
  const colon = path.lastIndexOf(":");
  if (colon < 0) return null;
  return { resource: path.slice(0, colon), action: path.slice(colon + 1) };
}

// Eligible Gemini completions are EXACTLY a POST to `/models/{model}:generateContent` or
// `:streamGenerateContent` (under either /v1beta or /v1). The API key travels in `?key=...` or the
// `x-goog-api-key` header — the core forwards headers + query untouched, so eligibility only inspects
// method + path (query stripped). This matcher is DISJOINT from the Anthropic (/v1/messages) and
// OpenAI (/v1/chat/completions, /v1/responses) matchers: those paths have no `resource:action` colon,
// so splitGeminiPath returns null for them and they are never claimed here.
export function isGeminiGenerateRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== "POST") return false;
  const split = splitGeminiPath(url);
  if (!split || !GEMINI_GENERATION_ACTIONS.has(split.action)) return false;
  return GEMINI_MODEL_RESOURCE.test(split.resource);
}

// The model is the `/models/{model}` segment of the request path — Gemini bodies carry no `model`
// field, so this is the ONLY place the receipt's model can come from. Null when the path has no
// /models/ segment (then pricing has no model to match and the cost stays null, the honest default).
export function geminiModelFromPath(url: string | undefined): string | null {
  const split = splitGeminiPath(url);
  // Tolerate a colon-less path too (e.g. a bare resource) by falling back to the whole path.
  const resource = split ? split.resource : (url ?? "").split("?")[0];
  const match = resource.match(GEMINI_MODEL_RESOURCE);
  return match ? match[1] : null;
}

// --- Gemini request shape -------------------------------------------------------------------

// A Content's `parts[]` mixes text parts with non-text parts (inlineData, functionCall, fileData).
// Only the text is read — off ANY part carrying a string `text` — and everything else contributes
// nothing. Never throws on a non-array or junk part.
function partsToText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is { text: string } => isRecord(part) && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

// A Gemini `contents[]` entry is the user turn when its role is "user" OR when role is OMITTED —
// Gemini defaults a role-less content to "user". "model" (the assistant role) and anything else are
// not user turns.
function isUserContent(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const role = value.role;
  return role === undefined || role === null || role === "user";
}

// The system prompt is `systemInstruction` — a Content object whose `parts[].text` is flattened. Read
// only: like every gateway, Kage never rewrites the system prompt (it injects into the user turn).
// Some clients / proto-JSON emit the snake_case `system_instruction`; both are accepted.
export function geminiSystemText(body: Record<string, unknown>): string {
  const system = body.systemInstruction ?? body.system_instruction;
  if (!isRecord(system)) return "";
  return partsToText(system.parts);
}

// The last user turn's text — the recall query and the captured `prompt` evidence. Scans `contents`
// from the end for the last user (or role-omitted) entry with any text part.
export function geminiLastUserText(body: Record<string, unknown>): string {
  const contents = Array.isArray(body.contents) ? body.contents : [];
  for (let i = contents.length - 1; i >= 0; i--) {
    if (!isUserContent(contents[i])) continue;
    const text = partsToText((contents[i] as Record<string, unknown>).parts);
    if (text) return text;
  }
  return "";
}

// Append the composed memory to the LAST USER `contents` entry, mirroring the Anthropic/OpenAI choice
// — `systemInstruction` is NEVER touched, preserving its exact bytes. Memory is appended to the
// entry's last TEXT part (so it flows right after the user's words); if the entry has no text part
// (e.g. an image-only turn) a new `{ text: memoryText }` part is added, leaving the existing parts
// untouched. `applied` is false when there is no user turn to attach to, and the caller then treats
// the body as untransformed. Audit forwards the client's original bytes regardless; this only shapes
// the candidate the receipt measures. Never throws.
export function injectGemini(body: Record<string, unknown>, memoryText: string): { body: Record<string, unknown>; applied: boolean } {
  const contents = Array.isArray(body.contents) ? [...body.contents] : [];
  for (let i = contents.length - 1; i >= 0; i--) {
    const item = contents[i];
    if (!isUserContent(item)) continue;
    const record = item as Record<string, unknown>;
    const parts = Array.isArray(record.parts) ? [...record.parts] : [];
    let appended = false;
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      if (isRecord(part) && typeof part.text === "string") {
        parts[j] = { ...part, text: `${part.text}\n\n${memoryText}` };
        appended = true;
        break;
      }
    }
    if (!appended) parts.push({ text: memoryText });
    contents[i] = { ...record, parts };
    return { body: { ...body, contents }, applied: true };
  }
  return { body, applied: false };
}

// --- Usage ----------------------------------------------------------------------------------

// VERIFIED 2026-07-15 (https://ai.google.dev/api/tokens). Gemini's `usageMetadata` reports the FULL
// prompt count in `promptTokenCount` INCLUDING cached tokens, and the cached portion is a SUBSET
// reported separately in `cachedContentTokenCount` — the same convention as OpenAI, and the OPPOSITE
// of Anthropic (whose usage.input_tokens is the uncached remainder). So the total is `promptTokenCount`
// DIRECTLY; do NOT sum. `cachedContentTokenCount` is ABSENT (not 0) on a cache miss — treat falsy as 0,
// never crash on undefined. `candidatesTokenCount` is the output.
//   total_prompt_tokens = promptTokenCount
//   cache_read          = cachedContentTokenCount ?? 0
//   cache_creation      = 0 (Gemini bills no separate cache-WRITE token line, like OpenAI)
//   output              = candidatesTokenCount
// This normalizes into the SHARED neutral ProviderUsage by decomposing the full prompt into
// (uncached remainder) + (cache-read subset), so totalPromptTokens returns the whole prompt and the
// shared receipt/pricing path works unchanged.
function neutralGeminiUsage(usage: Record<string, unknown>): ProviderUsage {
  const prompt = measuredCount(usage.promptTokenCount);
  const output = measuredCount(usage.candidatesTokenCount);
  if (prompt === null) {
    // No measured prompt total ⇒ the whole prompt side is honestly unavailable (null), never 0.
    return { ...NO_PROVIDER_USAGE, output_tokens: output };
  }
  // A cache MISS omits cachedContentTokenCount, so absent ⇒ 0 cached, never null: the prompt total is
  // fully known and only the cached split is empty. Defend against a malformed cached>prompt.
  let cached = measuredCount(usage.cachedContentTokenCount) ?? 0;
  if (cached > prompt) cached = prompt;
  return {
    input_tokens: prompt - cached,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: cached,
    cache_creation: null,
    output_tokens: output,
  };
}

// Reads what Gemini reported, from a non-streamed JSON object, a streamed JSON ARRAY of
// GenerateContentResponse chunks (streamGenerateContent without ?alt=sse), or a streamed SSE
// transcript (?alt=sse). usageMetadata appears only on the FINAL chunk; a later usageMetadata
// overwrites an earlier one. Absent ⇒ honestly unavailable, never fabricated. Never throws: a
// malformed or truncated body is "unmeasured", not an error.
export function extractGeminiUsage(raw: string): ProviderUsage {
  const trimmed = raw.trimStart();

  // Streamed JSON array of chunks: take the last chunk's usageMetadata.
  if (trimmed.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) {
        let usage = NO_PROVIDER_USAGE;
        for (const chunk of arr) {
          if (isRecord(chunk) && isRecord(chunk.usageMetadata)) usage = neutralGeminiUsage(chunk.usageMetadata);
        }
        return usage;
      }
    } catch { /* fall through to unavailable */ }
    return NO_PROVIDER_USAGE;
  }

  // Non-streamed single JSON object.
  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json) && isRecord(json.usageMetadata)) return neutralGeminiUsage(json.usageMetadata);
    } catch { /* fall through to unavailable */ }
    return NO_PROVIDER_USAGE;
  }

  // Streamed SSE (?alt=sse): each `data:` line is one GenerateContentResponse chunk.
  let usage = NO_PROVIDER_USAGE;
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event: unknown = JSON.parse(payload);
      if (isRecord(event) && isRecord(event.usageMetadata)) usage = neutralGeminiUsage(event.usageMetadata);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return usage;
}

// --- Tool calls -----------------------------------------------------------------------------

// Parse the assistant function calls Gemini returned, from a non-streamed JSON object, a streamed
// JSON array of chunks, or a streamed SSE transcript. Gemini emits function calls as
// `candidates[].content.parts[].functionCall = { name, args }` — with NO id (unlike Anthropic's
// tool_use.id or OpenAI's tool_call.id). Only the tool NAME is read; the call's ARGUMENTS are never
// turned into evidence (privacy). Never throws: a malformed or truncated body yields no calls.
// Gemini streams each function call once (in the chunk where the model emits it) and does not repeat
// it in the final chunk, so calls are simply collected in order across chunks — no dedup needed.
export function parseGeminiFunctionCalls(raw: string): Array<{ name: string }> {
  const calls: Array<{ name: string }> = [];

  const pushFromCandidates = (candidates: unknown): void => {
    if (!Array.isArray(candidates)) return;
    for (const candidate of candidates) {
      if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) continue;
      for (const part of candidate.content.parts) {
        if (!isRecord(part) || !isRecord(part.functionCall)) continue;
        const name = part.functionCall.name;
        if (typeof name === "string" && name.trim()) calls.push({ name });
      }
    }
  };

  const trimmed = raw.trimStart();

  if (trimmed.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) for (const chunk of arr) { if (isRecord(chunk)) pushFromCandidates(chunk.candidates); }
    } catch { /* not JSON we understand — no calls */ }
    return calls;
  }

  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json)) pushFromCandidates(json.candidates);
    } catch { /* not JSON we understand — no calls */ }
    return calls;
  }

  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event: unknown = JSON.parse(payload);
      if (isRecord(event)) pushFromCandidates(event.candidates);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return calls;
}
