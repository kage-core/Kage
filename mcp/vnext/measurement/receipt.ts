import { randomUUID } from "node:crypto";
import type { TransformationReceipt } from "../protocol/index.js";
import {
  findPriceSnapshot,
  promptInputCostUsd,
  type PromptTokenBreakdown,
  type ProviderPriceSnapshot,
} from "./pricing.js";
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
  /**
   * Provider-measured TOTAL prompt tokens of `before` (uncached + cache writes + cache reads, or a
   * count_tokens measurement of the body), or null when nothing measured it. Both sides must be
   * the same quantity or the receipt compares two incommensurable numbers.
   */
  before_tokens: number | null;
  /** Provider-measured TOTAL prompt tokens of `after`, or null when nothing measured it. */
  after_tokens: number | null;
  /**
   * How `before`'s prompt tokens actually billed (cache reads and cache writes bill at their own
   * rates). Required, and explicitly null when unknown: a token total alone cannot be priced,
   * because pricing it as if every token were uncached overstates a cached request by up to ~10x.
   */
  before_breakdown: PromptTokenBreakdown | null;
  /** How `after`'s prompt tokens actually billed, or null when unknown. */
  after_breakdown: PromptTokenBreakdown | null;
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
    // A cost exists only where a measured BILLING BREAKDOWN meets a price snapshot in effect. A
    // measured token total with no breakdown (a count_tokens probe knows nothing about caching)
    // has no honest cost — null, never a number priced at the wrong rate.
    provider_input_cost_before_usd: promptInputCostUsd(input.before_breakdown, price),
    provider_input_cost_after_usd: promptInputCostUsd(input.after_breakdown, price),
    latency_ms: nonnegativeMs(input.latency_ms),
    transformations: [...input.transformations],
    created_at: now.toISOString(),
  };
}
