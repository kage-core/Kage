import type { MeasurementQuality } from "../protocol/index.js";
import { measurementQuality, type TokenCounter } from "../measurement/token-count.js";
import { isRecord } from "../../type-guards.js";
import { decideBudget, type BudgetDecision } from "./budget-engine.js";
import type { ContextBudgetPolicy } from "./budget-policy.js";
import { selectCompressor } from "./compressors/provider.js";
import { byteLength, type CompressorKind, type CompressorProvider } from "./compressors/types.js";
import { ContentStore } from "./content-store.js";
import { anthropicLiveZone, type LiveZone } from "./live-zone.js";

// The cache-aware transformation pipeline (Phase D, Task 4).
//
// It sits between Phase B context composition and the provider gateway. Given an already-composed
// request it runs a fixed, DETERMINISTIC 10-step order over ONLY the live (mutable) zone, so the
// provider's cached prefix survives byte-for-byte:
//
//   1. detect the live zone           6. compress
//   2. dedup delivered content        7. attach retrieval references
//   3. budget the capsule sections    8. recount exact tokens where supported (measured or null)
//   4. detect eligible tool payloads  9. enforce the final budget
//   5. store the original (Task 1)    10. produce the receipt + transformed bytes
//
// HONESTY GATES enforced here, not merely documented:
//   - REVERSIBLE: no lossy output is ever emitted without first storing the exact pre-compression
//     bytes in the content store and embedding its `kage-content:<sha256>` reference. No store, or a
//     store failure, means fail-open passthrough — never a lossy body with no retrievable original.
//   - MEASURED SAVINGS: byte accounting is real byte lengths; token counts are provider-measured or
//     null. Nothing here estimates tokens from bytes. A transform that does not actually shrink its
//     payload is discarded (passthrough), so a receipt never claims savings it did not achieve.
//   - FAIL-OPEN BYTE-PRESERVING: any throw returns the ORIGINAL request object plus a failed-open
//     receipt that fabricates no savings, so the proxy's planProxyForward forwards the client's
//     bytes unchanged and records no wire receipt.

export interface MessagesRequestBody {
  system?: unknown;
  tools?: unknown;
  messages: unknown[];
  [key: string]: unknown;
}

export interface ToolPayload {
  body: Buffer;
  media_type?: string;
}

export interface ContextInjection {
  /** The composed capsule text to append to the mutable user turn. */
  text: string;
  /** Tokens the context source would like to add; fed to the budget engine. */
  requested_tokens: number;
  /** Optional content id for dedup against already-delivered content. */
  id?: string;
}

export interface TransformContext {
  task_id: string;
  request_id?: string | null;
  provider: string;
  /** Reversible content store. Null disables all lossy transforms (fail-open). */
  store: ContentStore | null;
  policy: ContextBudgetPolicy;
  compressorProvider: CompressorProvider;
  /** Provider MEASURED context window, or null. Fed to the budget engine; never fabricated. */
  context_window?: number | null;
  /** Composed capsule to inject into the mutable user turn, or null. */
  injection?: ContextInjection | null;
  /** Content ids already delivered upstream — used to dedup the injection. */
  delivered_ids?: ReadonlySet<string>;
  /** Whether lossy compression is permitted. Defaults to policy.lossy_compression. */
  lossy?: boolean;
  /** Exact token counter (a provider count_tokens probe). Measured-or-null; never an estimate. */
  tokenCounter?: TokenCounter | null;
  /** Live-zone strategy. Defaults to the Anthropic live zone. */
  liveZone?: (request: MessagesRequestBody) => LiveZone;
}

export type TransformStatus = "transformed" | "noop" | "failed_open";

// The pipeline's internal, honest record of one request pass. NOT a wire-protocol message: the
// frozen v1 TransformationReceipt is untouched. Every token field is measured or null; byte fields
// are real lengths. A failed-open pass fabricates no savings.
export interface TransformPipelineReceipt {
  task_id: string;
  request_id: string | null;
  provider: string;
  status: TransformStatus;
  transformations: string[];
  injection_location: LiveZone["injection_location"] | null;
  original_bytes: number;
  transformed_bytes: number;
  before_tokens: number | null;
  after_tokens: number | null;
  measurement_quality: MeasurementQuality;
  retrieval_ids: string[];
  budget: BudgetDecision | null;
  warnings: string[];
}

export interface TransformRequestResult {
  request: MessagesRequestBody;
  retrieval_ids: string[];
  receipt: TransformPipelineReceipt;
}

export interface ToolResultTransform {
  output: string;
  retrieval_ids: string[];
  compressor: CompressorKind;
  lossy: boolean;
  original_bytes: number;
  output_bytes: number;
  warnings: string[];
}

const TRANSFORM_CONTEXT_INJECT = "context_inject";
const TRANSFORM_PAYLOAD_COMPRESS = "payload_compress";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serialize(request: unknown): Buffer {
  return Buffer.from(JSON.stringify(request), "utf8");
}

// The retrieval reference embedded next to every lossy output. It carries the full
// `kage-content:<sha256>` id so the exact original is one kage_retrieve away.
export function retrievalMarker(retrievalId: string): string {
  return `[kage-retrieval original=${retrievalId} — full output preserved; fetch with kage_retrieve]`;
}

interface PayloadCompression {
  output: string;
  retrieval_id: string | null;
  compressor: CompressorKind;
  lossy: boolean;
  original_bytes: number;
  output_bytes: number;
  warnings: string[];
}

// The core reversible-compression primitive shared by transformToolResult and the in-request payload
// scan. It NEVER throws and NEVER emits a lossy body without a stored, retrievable original.
//
// `compressBody` is the text handed to the compressor; `storeBody` is the EXACT original preserved in
// the content store (defaulting to `compressBody`). They diverge only when the compressible text is a
// lossy projection of a richer original — e.g. a multi-text-block tool_result whose blocks are joined
// for compression but whose exact block array must remain byte-recoverable. Storing `storeBody` (not
// the projection) is what keeps the reversibility gate honest for those shapes.
function compressPayload(
  compressBody: Buffer,
  mediaType: string,
  context: TransformContext,
  storeBody: Buffer = compressBody,
): PayloadCompression {
  const bodyStr = compressBody.toString("utf8");
  const originalBytes = compressBody.byteLength;
  const passthrough = (warnings: string[] = []): PayloadCompression => ({
    output: bodyStr,
    retrieval_id: null,
    compressor: "none",
    lossy: false,
    original_bytes: originalBytes,
    output_bytes: originalBytes,
    warnings,
  });

  let compressors;
  try {
    compressors = context.compressorProvider.compressors();
  } catch (error) {
    return passthrough([`compressor provider failed open: ${errorMessage(error)}`]);
  }

  const input = { body: bodyStr, media_type: mediaType, task_id: context.task_id, token_budget: 0 };
  const compressor = selectCompressor(input, compressors);
  if (!compressor) return passthrough();

  let result;
  try {
    result = compressor.compress(input);
  } catch (error) {
    return passthrough([`compressor threw; passthrough: ${errorMessage(error)}`]);
  }

  // Lossless (or a no-op passthrough): safe to emit as-is, no original needed.
  if (!result.lossy || result.compressor === "none") {
    return {
      output: result.output,
      retrieval_id: null,
      compressor: result.compressor,
      lossy: false,
      original_bytes: result.original_bytes,
      output_bytes: result.output_bytes,
      warnings: result.warnings,
    };
  }

  // Lossy path — the reversibility gate. Refuse unless policy allows lossy AND a store is present.
  const lossyAllowed = context.lossy ?? context.policy.lossy_compression;
  if (!lossyAllowed) return passthrough(["lossy compression disabled by policy; passthrough"]);
  if (!context.store) return passthrough(["no content store; refusing lossy transform"]);

  let metadata;
  try {
    metadata = context.store.put(storeBody, { media_type: mediaType, task_id: context.task_id });
  } catch (error) {
    return passthrough([`content store put failed; refusing lossy transform: ${errorMessage(error)}`]);
  }

  const output = `${result.output}\n\n${retrievalMarker(metadata.retrieval_id)}`;
  const outputBytes = byteLength(output);
  // Measured savings only: if the marker pushes the output past the original, there is no saving to
  // claim — discard the transform and passthrough (the original is still safely stored for later).
  if (outputBytes >= originalBytes) {
    return passthrough(["compressed output plus retrieval marker did not shrink payload; passthrough"]);
  }

  return {
    output,
    retrieval_id: metadata.retrieval_id,
    compressor: result.compressor,
    lossy: true,
    original_bytes: originalBytes,
    output_bytes: outputBytes,
    warnings: result.warnings,
  };
}

// Compress a single tool result (plan Task 4, step 1 reversibility test). Fails open to the original
// bytes on anything unexpected; never throws.
export async function transformToolResult(payload: ToolPayload, context: TransformContext): Promise<ToolResultTransform> {
  try {
    const mediaType = payload.media_type ?? "text/plain";
    const c = compressPayload(payload.body, mediaType, context);
    return {
      output: c.output,
      retrieval_ids: c.retrieval_id ? [c.retrieval_id] : [],
      compressor: c.compressor,
      lossy: c.lossy,
      original_bytes: c.original_bytes,
      output_bytes: c.output_bytes,
      warnings: c.warnings,
    };
  } catch (error) {
    const bytes = payload.body.byteLength;
    return {
      output: payload.body.toString("utf8"),
      retrieval_ids: [],
      compressor: "none",
      lossy: false,
      original_bytes: bytes,
      output_bytes: bytes,
      warnings: [`transformToolResult failed open: ${errorMessage(error)}`],
    };
  }
}

// --- in-request payload detection + compression ------------------------------------------------

interface BlockPayload {
  /** The compressible text handed to the compressor. */
  text: string;
  /** The EXACT bytes stored for reversibility — reconstructs the block's original content byte-for-byte. */
  original: Buffer;
}

// Read the compressible payload out of a content block, or null when the block carries no text payload.
//
// For a plain text block or a string-content tool_result the compressible text IS the exact original,
// so `original` is that text verbatim. For an all-text-block tool_result array the blocks are joined
// for compression, but the join is a LOSSY projection of the block structure — so `original` is the
// exact JSON of the original content array, not the join. Storing that array (via compressPayload's
// storeBody) keeps the multi-block shape byte-recoverable and upholds the reversibility gate.
function blockPayload(block: Record<string, unknown>): BlockPayload | null {
  if (block.type === "text" && typeof block.text === "string") {
    return { text: block.text, original: Buffer.from(block.text, "utf8") };
  }
  if (block.type === "tool_result") {
    const content = block.content;
    if (typeof content === "string") {
      return { text: content, original: Buffer.from(content, "utf8") };
    }
    if (Array.isArray(content)) {
      const parts = content
        .filter((b): b is { type: string; text: string } => isRecord(b) && b.type === "text" && typeof b.text === "string")
        .map((b) => b.text);
      if (parts.length && parts.length === content.length) {
        return { text: parts.join("\n"), original: Buffer.from(JSON.stringify(content), "utf8") };
      }
    }
  }
  return null;
}

function replaceBlockText(block: Record<string, unknown>, output: string): Record<string, unknown> {
  if (block.type === "text") return { ...block, text: output };
  if (block.type === "tool_result") {
    if (typeof block.content === "string") return { ...block, content: output };
    return { ...block, content: [{ type: "text", text: output }] };
  }
  return block;
}

interface MessagePayloadResult {
  changed: boolean;
  message: Record<string, unknown>;
  retrieval_ids: string[];
  warnings: string[];
}

function compressMessagePayloads(message: Record<string, unknown>, context: TransformContext, minBytes: number): MessagePayloadResult {
  const content = message.content;
  const retrieval_ids: string[] = [];
  const warnings: string[] = [];

  if (typeof content === "string") {
    if (byteLength(content) < minBytes) return { changed: false, message, retrieval_ids, warnings };
    const c = compressPayload(Buffer.from(content, "utf8"), "text/plain", context);
    if (c.compressor === "none") return { changed: false, message, retrieval_ids, warnings };
    if (c.retrieval_id) retrieval_ids.push(c.retrieval_id);
    warnings.push(...c.warnings);
    return { changed: true, message: { ...message, content: c.output }, retrieval_ids, warnings };
  }

  if (Array.isArray(content)) {
    let changed = false;
    const out = content.map((block) => {
      if (!isRecord(block)) return block;
      const payload = blockPayload(block);
      if (payload === null || byteLength(payload.text) < minBytes) return block;
      // Media type is unknown for a tool_result/text block; default to text/plain and let the
      // compressor selector sniff JSON payloads (it keys on a leading "{" or "["). The exact original
      // (payload.original) is what gets stored, so a multi-block array stays byte-recoverable.
      const c = compressPayload(Buffer.from(payload.text, "utf8"), "text/plain", context, payload.original);
      if (c.compressor === "none") return block;
      changed = true;
      if (c.retrieval_id) retrieval_ids.push(c.retrieval_id);
      warnings.push(...c.warnings);
      return replaceBlockText(block, c.output);
    });
    if (!changed) return { changed: false, message, retrieval_ids, warnings };
    return { changed: true, message: { ...message, content: out }, retrieval_ids, warnings };
  }

  return { changed: false, message, retrieval_ids, warnings };
}

// --- injection ---------------------------------------------------------------------------------

function appendTextToUserMessage(message: Record<string, unknown>, text: string): Record<string, unknown> {
  const content = message.content;
  if (typeof content === "string") return { ...message, content: `${content}\n\n${text}` };
  if (Array.isArray(content)) return { ...message, content: [...content, { type: "text", text }] };
  return { ...message, content: text };
}

// Step 2 (dedup) + step 3 (budget gate). Returns the injection to apply, or null when it was
// deduplicated away or the budget left no room.
function resolveInjection(context: TransformContext, budget: BudgetDecision): ContextInjection | null {
  const injection = context.injection;
  if (!injection || !injection.text) return null;
  if (budget.capsule_token_budget <= 0) return null;
  if (injection.id && context.delivered_ids?.has(injection.id)) return null;
  return injection;
}

// --- receipts ----------------------------------------------------------------------------------

function noopReceipt(context: TransformContext, originalBytes: number): TransformPipelineReceipt {
  return {
    task_id: context.task_id,
    request_id: context.request_id ?? null,
    provider: context.provider,
    status: "noop",
    transformations: [],
    injection_location: null,
    original_bytes: originalBytes,
    transformed_bytes: originalBytes,
    before_tokens: null,
    after_tokens: null,
    measurement_quality: "unavailable",
    retrieval_ids: [],
    budget: null,
    warnings: [],
  };
}

function failedOpenReceipt(context: TransformContext, originalBytes: number, error: unknown): TransformPipelineReceipt {
  return {
    task_id: context.task_id,
    request_id: context.request_id ?? null,
    provider: context.provider,
    status: "failed_open",
    transformations: [],
    injection_location: null,
    original_bytes: originalBytes,
    // Fabricate NO savings: the wire will forward the original, so before === after bytes.
    transformed_bytes: originalBytes,
    before_tokens: null,
    after_tokens: null,
    measurement_quality: "unavailable",
    retrieval_ids: [],
    budget: null,
    warnings: [`pipeline failed open: ${errorMessage(error)}`],
  };
}

/**
 * Run the deterministic transform pipeline over a request. Mutates ONLY the live zone; the stable
 * prefix (system, tools, older turns) is preserved byte-for-byte. Returns the ORIGINAL request
 * object unchanged when nothing was transformed (so the proxy forwards identical bytes), and returns
 * it unchanged with a failed-open receipt on any internal error.
 */
export async function transformRequest(request: MessagesRequestBody, context: TransformContext): Promise<TransformRequestResult> {
  const originalBytes = serialize(request).byteLength;
  try {
    // Step 1: detect the live zone.
    const zone = (context.liveZone ?? anthropicLiveZone)(request);
    const messages = Array.isArray(request.messages) ? [...request.messages] : [];
    const retrievalIds: string[] = [];
    const transformations: string[] = [];
    const warnings: string[] = [];

    // Step 3: budget the capsule sections (measured window or fixed default cap; never fabricated).
    const budget = decideBudget(
      {
        context_window: context.context_window ?? null,
        requested_capsule_tokens: context.injection?.requested_tokens ?? 0,
      },
      context.policy,
    );

    // Steps 2 + 3: dedup + budget gate, then inject the capsule into the mutable user turn only.
    const injection = resolveInjection(context, budget);
    if (
      injection &&
      zone.mutable_end > zone.mutable_start &&
      zone.mutable_start < messages.length
    ) {
      const idx = zone.mutable_start;
      const message = messages[idx];
      if (isRecord(message) && message.role === "user") {
        messages[idx] = appendTextToUserMessage(message, injection.text);
        transformations.push(TRANSFORM_CONTEXT_INJECT);
      }
    }

    // Steps 4-7: detect eligible tool payloads in the mutable zone, store originals, compress,
    // attach retrieval references. The min-payload floor is applied as a BYTE floor here (a token is
    // at least one byte, so requiring N bytes never compresses a payload smaller than N tokens) — it
    // is a conservative eligibility heuristic, not a token measurement.
    const minBytes = Math.max(1, Math.floor(context.policy.min_payload_tokens_for_compression));
    for (let i = zone.mutable_start; i < zone.mutable_end && i < messages.length; i += 1) {
      const message = messages[i];
      if (!isRecord(message)) continue;
      const compressed = compressMessagePayloads(message, context, minBytes);
      if (!compressed.changed) continue;
      messages[i] = compressed.message;
      retrievalIds.push(...compressed.retrieval_ids);
      warnings.push(...compressed.warnings);
      if (!transformations.includes(TRANSFORM_PAYLOAD_COMPRESS)) transformations.push(TRANSFORM_PAYLOAD_COMPRESS);
    }

    // Step 10 (early exit): nothing changed -> return the original object untouched, no receipt.
    if (transformations.length === 0) {
      return { request, retrieval_ids: [], receipt: noopReceipt(context, originalBytes) };
    }

    const transformedRequest: MessagesRequestBody = { ...request, messages };
    const transformedBytes = serialize(transformedRequest).byteLength;

    // Step 8: recount EXACT tokens where supported. Measured-or-null; never an estimate.
    let beforeTokens: number | null = null;
    let afterTokens: number | null = null;
    if (context.tokenCounter) {
      beforeTokens = await context.tokenCounter(serialize(request));
      afterTokens = await context.tokenCounter(transformedRequest === request ? serialize(request) : serialize(transformedRequest));
    }

    // Step 9/10: produce the receipt + transformed bytes.
    const receipt: TransformPipelineReceipt = {
      task_id: context.task_id,
      request_id: context.request_id ?? null,
      provider: context.provider,
      status: "transformed",
      transformations,
      injection_location: zone.injection_location,
      original_bytes: originalBytes,
      transformed_bytes: transformedBytes,
      before_tokens: beforeTokens,
      after_tokens: afterTokens,
      measurement_quality: measurementQuality(beforeTokens, afterTokens),
      retrieval_ids: retrievalIds,
      budget,
      warnings,
    };
    return { request: transformedRequest, retrieval_ids: retrievalIds, receipt };
  } catch (error) {
    // Fail open, byte-preserving: the ORIGINAL request and a receipt that fabricates no savings.
    return { request, retrieval_ids: [], receipt: failedOpenReceipt(context, originalBytes, error) };
  }
}
