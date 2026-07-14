import { createHash } from "node:crypto";
import type { TransformationReceipt } from "../protocol/index.js";
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
