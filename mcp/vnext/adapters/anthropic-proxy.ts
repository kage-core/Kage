import { createHash, randomUUID } from "node:crypto";
import type { TransformationReceipt } from "../protocol/index.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import { buildTransformationReceipt } from "../measurement/receipt.js";
import {
  measuredCount,
  promptTokenBreakdown,
  totalPromptTokens,
  type ProviderUsage,
  type TokenCounter,
} from "../measurement/token-count.js";
import type { ProviderPriceSnapshot } from "../measurement/pricing.js";
import { isRecord } from "../../type-guards.js";

// The proxy is the first gateway adapter: it sits on the wire between an Anthropic-API client and
// api.anthropic.com, so it is the one place where a BEFORE and an AFTER body both exist for the
// same request. That makes it the only Phase A surface that can produce a real exact-vs-partial
// cost number — as long as it never forwards bytes the client did not write while it is measuring.

export const ANTHROPIC_PROXY_ADAPTER_ID = "anthropic-proxy";
export const ANTHROPIC_PROXY_PROVIDER = "anthropic";
export const CONTEXT_APPEND_TRANSFORMATION = "context_append_last_user_turn";

export type ProxyMode = "audit" | "assist";

export interface ProxyForwardPlan {
  /** The client's own bytes — always the BEFORE side of the receipt. */
  original: Buffer;
  /** Exactly what goes on the wire to the provider. */
  forwarded: Buffer;
  /** The transformed candidate body — always the AFTER side of the receipt. */
  measured: Buffer;
  transformations: string[];
}

// audit: build the candidate, measure it, forward the client's ORIGINAL BYTES. The audit number is
// worthless if the audited traffic was itself modified, so this is the load-bearing line of the
// whole phase.
// assist: forward the candidate, because that is what the user asked Kage to do.
export function planProxyForward(options: {
  mode: ProxyMode;
  original: Buffer;
  transformed: Buffer | null;
}): ProxyForwardPlan {
  const { mode, original, transformed } = options;
  if (!transformed || transformed.equals(original)) {
    return { original, forwarded: original, measured: original, transformations: [] };
  }
  return {
    original,
    forwarded: mode === "audit" ? original : transformed,
    measured: transformed,
    transformations: [CONTEXT_APPEND_TRANSFORMATION],
  };
}

export function requestModel(body: Record<string, unknown>): string | null {
  const model = body.model;
  return typeof model === "string" && model.trim() ? model : null;
}

// --- Anthropic Messages request shape ---------------------------------------------------------
// These are the provider-specific ways to read and rewrite an Anthropic /v1/messages body. They
// live in the gateway (not the neutral proxy core) because message/system layout is per-provider.

// Only a POST to exactly /v1/messages is a completion we inject into. IMPORTANT: the sibling
// endpoint /v1/messages/count_tokens also starts with "/v1/messages" — injecting into it would
// pollute the client's own token accounting (making it think its context is larger than it is) and
// inflate the injected counter. Match the path exactly, sans query.
export function isCompletionsRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== "POST") return false;
  const path = (url ?? "").split("?")[0];
  return path === "/v1/messages";
}

export function lastUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as Record<string, unknown> | undefined;
    if (!message || message.role !== "user") continue;
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .filter((block): block is { type: string; text: string } => isRecord(block) && block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n");
      if (text) return text;
    }
  }
  return "";
}

export function systemToText(system: unknown): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .filter((block): block is { text: string } => isRecord(block) && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
  }
  return "";
}

// Append composed memory text into the LAST USER MESSAGE, never the system prompt. Subscription/
// OAuth tokens (Claude Code on a plan, not an API key) require the system prompt's first block to be
// the exact Claude Code identity string; prepending to it makes Anthropic reject the request
// (observed: 429 rate_limit_error on /v1/messages?beta=true, every request). Appending to the user
// turn keeps `system` byte-identical and works for both OAuth and API-key requests. `applied` is
// false when there is no user turn to append to — the caller then treats the body as untransformed.
export function injectLastUserTurn(
  body: Record<string, unknown>,
  memoryText: string,
): { body: Record<string, unknown>; applied: boolean } {
  const messages = Array.isArray(body.messages) ? [...body.messages] : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!isRecord(message) || message.role !== "user") continue;
    if (typeof message.content === "string") {
      messages[i] = { ...message, content: `${message.content}\n\n${memoryText}` };
    } else if (Array.isArray(message.content)) {
      messages[i] = { ...message, content: [...message.content, { type: "text", text: memoryText }] };
    } else {
      messages[i] = { ...message, content: memoryText };
    }
    return { body: { ...body, messages }, applied: true };
  }
  return { body, applied: false };
}

// Parse the assistant tool-use blocks the provider returned, from either a non-streamed JSON body or
// a streamed SSE transcript. Only the tool NAME is read — a tool's arguments are never turned into
// evidence. Never throws: a malformed or truncated body yields no blocks, not an error.
export function parseResponseToolUses(raw: string): Array<{ name: string; id: string }> {
  const blocks: Array<{ name: string; id: string }> = [];
  const push = (candidate: unknown): void => {
    if (isRecord(candidate) && candidate.type === "tool_use" && typeof candidate.name === "string" && candidate.name.trim()) {
      blocks.push({ name: candidate.name, id: typeof candidate.id === "string" ? candidate.id : "" });
    }
  };

  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      const json: unknown = JSON.parse(raw);
      if (isRecord(json) && Array.isArray(json.content)) json.content.forEach(push);
    } catch { /* not JSON we understand — no tool blocks */ }
    return blocks;
  }

  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event: unknown = JSON.parse(payload);
      // A tool_use block is announced by content_block_start; its later input deltas are ignored.
      if (isRecord(event) && event.type === "content_block_start") push(event.content_block);
    } catch { /* skip a malformed event rather than losing the whole transcript */ }
  }
  return blocks;
}

// Stable per-(repo, session) task id, in the same shape the Claude adapter uses, so proxy receipts
// and hook events can be attributed to the same task later.
export function proxyTaskId(projectRoot: string, sessionId: string): string {
  const digest = createHash("sha256").update(`${projectRoot}|${sessionId}`).digest("hex").slice(0, 32);
  return `task_${digest}`;
}

export interface ProxyReceiptInput {
  task_id: string;
  request_id: string;
  model: string | null;
  mode: ProxyMode;
  plan: ProxyForwardPlan;
  /** Provider-reported usage for the body that was actually FORWARDED. */
  forwarded_usage: ProviderUsage;
  /**
   * Provider-measured TOTAL tokens of the body that was NOT forwarded, from a count_tokens call.
   * count_tokens counts the whole body and knows nothing about caching, so it is directly
   * comparable with the forwarded body's TOTAL prompt tokens — and with nothing else.
   */
  measured_input_tokens: number | null;
  latency_ms: number;
  now?: Date;
  snapshots?: readonly ProviderPriceSnapshot[];
}

// Two things are easy to get quietly wrong here, and both manufacture a fake number.
//
// 1. ATTRIBUTION. The provider's usage always describes THE BODY THAT WAS SENT. In audit mode that
//    is the original (the BEFORE side); in assist mode it is the transformed body (the AFTER
//    side). Copying one count into both sides would claim a measured zero-savings result.
// 2. COMMENSURABILITY. `usage.input_tokens` is the UNCACHED REMAINDER, while count_tokens returns
//    the size of the WHOLE body. Putting those two on opposite sides of a receipt is what made a
//    cached session look like injecting context saved 98% of the prompt. Both sides here are TOTAL
//    prompt tokens (uncached + cache writes + cache reads), which is the same quantity count_tokens
//    reports — and null the moment any component of that total is missing.
export function buildProxyReceipt(input: ProxyReceiptInput): TransformationReceipt {
  const forwardedIsOriginal = input.plan.forwarded.equals(input.plan.original);
  // When nothing was transformed, before and after are the SAME BYTES, so the provider's one
  // measurement describes both. An identity, not an inference.
  const untransformed = input.plan.measured.equals(input.plan.original);

  const forwardedTokens = totalPromptTokens(input.forwarded_usage);
  // How the forwarded prompt actually billed. The counted (unsent) body has no such breakdown —
  // count_tokens says how big a body is, not what mix of cached/uncached tokens it would have
  // billed as — so that side's cost stays null rather than being priced as if fully uncached.
  const forwardedBreakdown = promptTokenBreakdown(input.forwarded_usage);
  const countedTokens = input.measured_input_tokens;

  const beforeIsForwarded = untransformed || forwardedIsOriginal;
  const afterIsForwarded = untransformed || !forwardedIsOriginal;

  return buildTransformationReceipt({
    task_id: input.task_id,
    request_id: input.request_id,
    provider: ANTHROPIC_PROXY_PROVIDER,
    model: input.model,
    mode: input.mode,
    before: input.plan.original,
    after: input.plan.measured,
    before_tokens: beforeIsForwarded ? forwardedTokens : countedTokens,
    after_tokens: afterIsForwarded ? forwardedTokens : countedTokens,
    before_breakdown: beforeIsForwarded ? forwardedBreakdown : null,
    after_breakdown: afterIsForwarded ? forwardedBreakdown : null,
    output_tokens: input.forwarded_usage.output_tokens,
    latency_ms: input.latency_ms,
    transformations: input.plan.transformations,
    now: input.now,
    snapshots: input.snapshots,
  });
}

/**
 * What the proxy RECORDS about attaching context, as opposed to what it measured about tokens.
 *
 * A receipt says what the transformation cost. A delivery says whether it ever reached the agent —
 * and those are different facts. Without this row, attachment_success_rate and the context latency
 * percentiles have no input at all and stay null forever, which is what made Phase A's completion
 * gate unmeetable.
 *
 * Null when nothing was composed: a request with no recall hit has no context to deliver, and a row
 * for it would put a phantom attempt into the denominator.
 */
export function buildProxyDelivery(input: {
  task_id: string;
  mode: ProxyMode;
  plan: ProxyForwardPlan;
  /** MEASURED: how long composing the candidate body actually took, in milliseconds. */
  composition_latency_ms: number;
  now?: Date;
}): StoredContextDelivery | null {
  const { plan } = input;
  if (!plan.transformations.length) return null;

  // Derived from the bytes, not from the flag: "delivered" means the transformed body is what
  // actually went upstream. In audit the client's original bytes are forwarded, so nothing was
  // attached and the row is a SKIP.
  const delivered = !plan.forwarded.equals(plan.original);
  const addedBytes = plan.measured.length - plan.original.length;

  return {
    delivery_id: `delivery_${randomUUID()}`,
    // The proxy composes from legacy recall rather than from a protocol capsule, so its capsule id
    // is content-addressed: the same composed body is the same capsule, and no id is invented for a
    // composition that never happened.
    capsule_id: `capsule_${createHash("sha256").update(plan.measured).digest("hex").slice(0, 32)}`,
    task_id: input.task_id,
    adapter_id: ANTHROPIC_PROXY_ADAPTER_ID,
    // The proxy appends to the LAST USER TURN, never the system prompt (a modified system prompt is
    // rejected by subscription tokens). The record says exactly where the bytes went.
    injection_location: delivered ? "user_turn" : "none",
    delivered_at: (input.now ?? new Date()).toISOString(),
    added_bytes: delivered && addedBytes > 0 ? addedBytes : 0,
    // The injected block's TOKEN count is measured by nobody here. A bytes/4 estimate would be a
    // fabricated number, so this stays null and the row is honestly "partial".
    added_tokens: null,
    measurement_quality: delivered ? "partial" : "unavailable",
    status: delivered ? "delivered" : "skipped",
    reason: delivered ? "delivered" : "audit_mode_no_injection",
    composition_latency_ms: input.composition_latency_ms,
  };
}

// Headers that identify and authorize the client to the provider. A count_tokens probe is the
// client's own request against the client's own credentials, so it carries exactly these and
// nothing else Kage invented.
const COUNT_TOKENS_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "anthropic-version",
  "anthropic-beta",
  "anthropic-dangerous-direct-browser-access",
]);

// /v1/messages/count_tokens is NOT /v1/messages: it accepts only the fields that determine the
// token count and rejects unrecognized top-level fields. Posting the client's complete Messages
// body (max_tokens, stream, metadata, temperature, ...) is a 400 — a probe that always failed
// silently, downgrading every transformed receipt to "partial" forever while still spending a
// billable round trip. Send only what the endpoint accepts.
const COUNT_TOKENS_FIELDS = ["model", "messages", "system", "tools", "tool_choice", "thinking"] as const;

// Pure + exported for testing: the body of the count_tokens probe for a Messages body. Null when
// there is nothing countable (unparseable, or no model/messages) — Kage does not probe a body it
// cannot form a legal request for.
export function countTokensProbeBody(body: Buffer): Buffer | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (typeof parsed.model !== "string" || !Array.isArray(parsed.messages)) return null;

  const probe: Record<string, unknown> = {};
  for (const field of COUNT_TOKENS_FIELDS) {
    if (parsed[field] !== undefined) probe[field] = parsed[field];
  }
  return Buffer.from(JSON.stringify(probe), "utf8");
}

// The ONLY honest way to learn the token count of a body Kage did not send: ask the provider to
// count it. It is a real measurement, and it is opt-in because it costs an extra round trip.
// Any failure returns null, which downgrades the receipt to "partial" — never to a guess.
export function createUpstreamTokenCounter(options: {
  upstream: URL;
  headers: Record<string, string | string[] | undefined>;
  timeoutMs?: number;
}): TokenCounter {
  const headers: Record<string, string> = { "content-type": "application/json" };
  for (const [key, value] of Object.entries(options.headers)) {
    const name = key.toLowerCase();
    if (!COUNT_TOKENS_HEADERS.has(name)) continue;
    if (typeof value === "string") headers[name] = value;
  }

  return async (body: Buffer): Promise<number | null> => {
    const probe = countTokensProbeBody(body);
    if (!probe) return null;
    try {
      const response = await fetch(new URL("/v1/messages/count_tokens", options.upstream.origin), {
        method: "POST",
        headers,
        body: new Uint8Array(probe),
        signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
      });
      if (!response.ok) return null;
      const parsed: unknown = JSON.parse(await response.text());
      return isRecord(parsed) ? measuredCount(parsed.input_tokens) : null;
    } catch {
      return null;
    }
  };
}
