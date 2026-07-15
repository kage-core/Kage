import { randomUUID } from "node:crypto";
import { isRecord } from "../../type-guards.js";
import { extractProviderUsage, type ProviderUsage, type TokenCounter } from "../measurement/token-count.js";
import { ANTHROPIC_PRICE_SNAPSHOTS, type ProviderPriceSnapshot } from "../measurement/pricing.js";
import {
  KAGE_PROTOCOL_VERSION,
  type EvidenceEvent,
  type PrivacyClass,
  type RepositoryIdentity,
  type TransformationReceipt,
} from "../protocol/index.js";
import { claudeSourceFingerprint, claudeTaskIdentity } from "./claude.js";
import {
  ANTHROPIC_PROXY_ADAPTER_ID,
  ANTHROPIC_PROXY_PROVIDER,
  buildProxyReceipt,
  createUpstreamTokenCounter,
  injectLastUserTurn,
  isCompletionsRequest,
  lastUserText,
  parseResponseToolUses,
  requestModel,
  systemToText,
  type ProxyReceiptInput,
} from "./anthropic-proxy.js";

// The ProviderGateway seam. The proxy CORE is provider-neutral — it owns listen/route, eligibility
// dispatch, fail-open, byte-identical audit forward, streaming passthrough, receipt + delivery
// recording, evidence emission, and workspace routing. Everything a specific provider's wire format
// dictates lives behind this interface, so a new provider is a new gateway, not a fork of the core.

/** The neutral view of a completion request the core needs, extracted from a provider-shaped body. */
export interface ParsedProviderRequest {
  model: string | null;
  /** The provider's system-prompt text, flattened. Used for workspace routing only — never rewritten. */
  systemText: string;
  /** The last user turn's text. The recall query, and the captured `prompt` evidence. */
  lastUserText: string;
}

/** Everything a gateway needs to turn one served request+response into protocol-v1 evidence. */
export interface CaptureContext {
  repository: RepositoryIdentity;
  sessionId: string;
  /** The user's prompt for this request; a prompt event is emitted only when it is non-empty. */
  userPrompt: string;
  /** The (possibly streamed) response body, tapped by the core. Parsed for tool-use blocks. */
  responseBody: string;
  now?: Date;
}

export interface ProviderGateway {
  readonly adapter_id: string;
  readonly provider: string;
  /** Is this an eligible completion request for this provider? */
  matches(method: string | undefined, path: string | undefined, body: Record<string, unknown> | null): boolean;
  /** Extract the neutral request view from a parsed provider body. */
  parseRequest(body: Record<string, unknown>): ParsedProviderRequest;
  /**
   * Rewrite the body into this provider's request shape with the composed memory text attached
   * (the assist candidate). `applied` is false when there was nowhere to attach it, and the core
   * then treats the request as untransformed. Audit forwards the original bytes regardless.
   */
  inject(body: Record<string, unknown>, memoryText: string): { body: Record<string, unknown>; applied: boolean };
  /** The neutral provider usage read from a (possibly streamed) response body. */
  extractUsage(responseBody: string): ProviderUsage;
  /**
   * A probe that MEASURES the token count of a body the proxy did not send, or null when this
   * provider exposes no cheap count-tokens endpoint (then the receipt is honestly `partial`).
   */
  createTokenCounter(options: {
    upstream: URL;
    headers: Record<string, string | string[] | undefined>;
  }): TokenCounter | null;
  /** Build the transformation receipt from the forward plan + provider-reported usage. */
  buildReceipt(input: ProxyReceiptInput): TransformationReceipt;
  /** Protocol-v1 evidence events for one served exchange: a prompt event, plus tool_result events. */
  captureEvents(context: CaptureContext): EvidenceEvent[];
  /** Dated, sourced price records for this provider's models. */
  readonly priceSnapshots: readonly ProviderPriceSnapshot[];
}

// The protocol-v1 event assembly is SHARED across every gateway and every adapter: the fingerprint
// hashes the SIGNAL (repo, task, type, time, payload) and deliberately excludes the random event_id,
// so a duplicated or retried post deduplicates in the store. This is byte-identical to the
// construction claude.ts uses for the hook adapter, which is what lets the two paths dedupe against
// each other. Only the PAYLOAD is provider-specific; the frame around it is not.
export function assembleEvidenceEvent(options: {
  event_type: EvidenceEvent["event_type"];
  repository: RepositoryIdentity;
  sessionId: string;
  privacy_class: PrivacyClass;
  payload: Record<string, unknown>;
  now: Date;
}): EvidenceEvent {
  const task = claudeTaskIdentity(options.repository, options.sessionId);
  const occurredAt = options.now.toISOString();
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    event_id: `event_${randomUUID()}`,
    event_type: options.event_type,
    occurred_at: occurredAt,
    repository_id: options.repository.repo_id,
    task_id: task.task_id,
    privacy_class: options.privacy_class,
    source_fingerprint: claudeSourceFingerprint(
      options.repository.repo_id,
      task.task_id,
      options.event_type,
      occurredAt,
      options.payload,
    ),
    payload: options.payload,
  };
}

// The first gateway: the Anthropic /v1/messages proxy that Phase A shipped. It owns every piece of
// Anthropic wire semantics — path eligibility, message/system layout, response tool-use parsing,
// usage attribution (usage.input_tokens is the UNCACHED remainder, see token-count.ts), the
// count_tokens probe, and the price table — and nothing about Kage's runtime or storage.
export const anthropicGateway: ProviderGateway = {
  adapter_id: ANTHROPIC_PROXY_ADAPTER_ID,
  provider: ANTHROPIC_PROXY_PROVIDER,

  matches(method, path) {
    return isCompletionsRequest(method, path);
  },

  parseRequest(body) {
    return {
      model: requestModel(body),
      systemText: systemToText(body.system),
      lastUserText: lastUserText(body),
    };
  },

  inject(body, memoryText) {
    return injectLastUserTurn(body, memoryText);
  },

  extractUsage(responseBody) {
    return extractProviderUsage(responseBody);
  },

  createTokenCounter(options) {
    return createUpstreamTokenCounter({ upstream: options.upstream, headers: options.headers });
  },

  buildReceipt(input) {
    return buildProxyReceipt(input);
  },

  captureEvents(context) {
    const now = context.now ?? new Date();
    const events: EvidenceEvent[] = [];

    // A prompt is user text: local_raw, the tier the storage layer never lets leave this machine.
    // Empty prompt ⇒ no event: an eligible request with no user turn is not evidence, it is noise.
    if (context.userPrompt.trim()) {
      events.push(assembleEvidenceEvent({
        event_type: "prompt",
        repository: context.repository,
        sessionId: context.sessionId,
        privacy_class: "local_raw",
        payload: { text: context.userPrompt },
        now,
      }));
    }

    // One tool_result per assistant tool-use block the provider returned. Only the tool NAME is
    // carried — the tool's arguments are never turned into evidence. Each block's own signal makes
    // the fingerprint stable, so a duplicate post of the same exchange deduplicates.
    parseResponseToolUses(context.responseBody).forEach((block, index) => {
      // block.index disambiguates two same-named blocks that both lack an id, so their signals — and
      // therefore their fingerprints — stay distinct and neither is dropped as a false duplicate.
      // Real provider responses always populate id; this guards a malformed/truncated body.
      const payload = block.id
        ? { tool: block.name, tool_use_id: block.id }
        : { tool: block.name, block_index: index };
      events.push(assembleEvidenceEvent({
        event_type: "tool_result",
        repository: context.repository,
        sessionId: context.sessionId,
        privacy_class: "local_raw",
        payload,
        now,
      }));
    });

    return events;
  },

  priceSnapshots: ANTHROPIC_PRICE_SNAPSHOTS,
};

// The gateways the proxy dispatches across, in priority order. Task 1 ships exactly one; Tasks 2–3
// append the OpenAI-compatible and Gemini gateways here with no change to the core.
export const defaultGateways: readonly ProviderGateway[] = [anthropicGateway];

// Eligibility dispatch: the first gateway that claims this request handles it. No match ⇒ a strict
// passthrough the core measures nothing about (count_tokens, non-POSTs, unknown providers).
export function selectGateway(
  gateways: readonly ProviderGateway[],
  method: string | undefined,
  path: string | undefined,
  body: Record<string, unknown> | null,
): ProviderGateway | null {
  for (const gateway of gateways) {
    if (gateway.matches(method, path, body)) return gateway;
  }
  return null;
}
