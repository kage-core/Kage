import { randomUUID } from "node:crypto";
import type { TransformationReceipt } from "../protocol/index.js";
import { findPriceSnapshot, inputCostUsd, type ProviderPriceSnapshot } from "./pricing.js";
import { measurementQuality } from "./token-count.js";

export interface TransformationReceiptInput {
  task_id: string;
  request_id: string;
  provider: string;
  model: string | null;
  mode: TransformationReceipt["mode"];
  /** The bytes the client sent. */
  before: Buffer;
  /** The bytes of the transformed candidate (which in audit mode is NOT what was forwarded). */
  after: Buffer;
  /** Provider-measured token count of `before`, or null when nothing measured it. */
  before_tokens: number | null;
  /** Provider-measured token count of `after`, or null when nothing measured it. */
  after_tokens: number | null;
  output_tokens?: number | null;
  latency_ms: number;
  transformations: string[];
  /** Overridable for tests; defaults to the snapshot in effect for the model at `now`. */
  price?: ProviderPriceSnapshot | null;
  snapshots?: readonly ProviderPriceSnapshot[];
  now?: Date;
  receipt_id?: string;
}

function nonnegativeMs(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

// The single place a receipt is allowed to come into existence. Every field is either measured or
// null; nothing here derives a token count from bytes, and no cost survives a missing count or a
// missing price snapshot.
export function buildTransformationReceipt(input: TransformationReceiptInput): TransformationReceipt {
  const now = input.now ?? new Date();
  const price = input.price !== undefined
    ? input.price
    : findPriceSnapshot({ provider: input.provider, model: input.model, at: now, snapshots: input.snapshots });

  return {
    receipt_id: input.receipt_id ?? `receipt_${randomUUID()}`,
    task_id: input.task_id,
    request_id: input.request_id,
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    measurement_quality: measurementQuality(input.before_tokens, input.after_tokens),
    before_input_bytes: input.before.length,
    after_input_bytes: input.after.length,
    before_input_tokens: input.before_tokens,
    after_input_tokens: input.after_tokens,
    output_tokens: input.output_tokens ?? null,
    // Kage's own processing cost is not measured in Phase A. Null is the honest value; 0 would be
    // a claim that the harness is free.
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: inputCostUsd(input.before_tokens, price),
    provider_input_cost_after_usd: inputCostUsd(input.after_tokens, price),
    latency_ms: nonnegativeMs(input.latency_ms),
    transformations: [...input.transformations],
    created_at: now.toISOString(),
  };
}
