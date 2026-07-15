// Prices are CONFIGURATION RECORDS, not timeless constants. Each one names the source it was
// read from and the date it took effect, so a receipt's cost can be audited later and so a price
// change is a new record rather than an edit that silently rewrites history. If a request's model
// has no snapshot in effect, the cost fields on its receipt stay null — Kage does not guess.

export interface ProviderPriceSnapshot {
  provider: string;
  model: string;
  input_usd_per_million: number;
  // Cached input does NOT bill at the input rate. A receipt that prices a cached request as if
  // every token were uncached overstates its cost by up to ~10x, so every rate the proxy can
  // actually observe has its own field here. Null means "no rate on record" — which makes the cost
  // null, never 0.
  cache_read_usd_per_million: number | null;
  cache_write_5m_usd_per_million: number | null;
  cache_write_1h_usd_per_million: number | null;
  effective_from: string; // ISO date (YYYY-MM-DD) the price took effect.
  source: string;         // The URL the price was read from.
}

const ANTHROPIC_PRICING_SOURCE = "https://platform.claude.com/docs/en/pricing";
// Cache multipliers are published as multiples of the model's input price, not as absolute rates:
// a cache read bills at ~0.1x input, a 5-minute cache write at 1.25x, a 1-hour cache write at 2x.
// Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching (read 2026-06-24).
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_5M_MULTIPLIER = 1.25;
const CACHE_WRITE_1H_MULTIPLIER = 2;
// The date this table was read from the source above. Changing a price means appending a new
// record with a later effective_from, not editing one of these.
const READ_ON = "2026-06-24";

function anthropic(
  model: string,
  inputUsdPerMillion: number,
  effectiveFrom: string = READ_ON,
): ProviderPriceSnapshot {
  return {
    provider: "anthropic",
    model,
    input_usd_per_million: inputUsdPerMillion,
    cache_read_usd_per_million: inputUsdPerMillion * CACHE_READ_MULTIPLIER,
    cache_write_5m_usd_per_million: inputUsdPerMillion * CACHE_WRITE_5M_MULTIPLIER,
    cache_write_1h_usd_per_million: inputUsdPerMillion * CACHE_WRITE_1H_MULTIPLIER,
    effective_from: effectiveFrom,
    source: ANTHROPIC_PRICING_SOURCE,
  };
}

export const ANTHROPIC_PRICE_SNAPSHOTS: readonly ProviderPriceSnapshot[] = [
  anthropic("claude-fable-5", 10),
  anthropic("claude-opus-4-8", 5),
  anthropic("claude-opus-4-7", 5),
  anthropic("claude-opus-4-6", 5),
  // Sonnet 5 lists at $3/MTok but ships with an introductory $2/MTok rate through 2026-08-31. Two
  // records, not one: the intro rate is in effect now, and the list price takes over the day after
  // the intro window closes. Pricing the intro window at $3 would overstate every Sonnet 5 receipt
  // by 50%.
  anthropic("claude-sonnet-5", 2),
  anthropic("claude-sonnet-5", 3, "2026-09-01"),
  anthropic("claude-sonnet-4-6", 3),
  anthropic("claude-haiku-4-5", 1),
];

// OpenAI publishes per-model dollar rates (not multiples of a base rate), and — unlike Anthropic —
// bills NO separate cache-WRITE token line: prompt caching is automatic and only the cached READ is
// discounted. So each record carries an input rate and a cache-READ rate, and both cache-WRITE rates
// are null. That is safe because extractUsage reports 0 cache-creation tokens for OpenAI, and
// rateCostUsd charges nothing for 0 tokens regardless of a missing rate. Only rates that can be
// sourced are encoded; every other model (o-series, gpt-4-turbo, dated `-YYYY-MM-DD` ids, …) has no
// snapshot and therefore a null cost — the honest, expected outcome, never a fabricated rate.
const OPENAI_PRICING_SOURCE = "https://openai.com/api/pricing/";

function openai(
  model: string,
  inputUsdPerMillion: number,
  cacheReadUsdPerMillion: number,
  effectiveFrom: string,
): ProviderPriceSnapshot {
  return {
    provider: "openai",
    model,
    input_usd_per_million: inputUsdPerMillion,
    cache_read_usd_per_million: cacheReadUsdPerMillion,
    cache_write_5m_usd_per_million: null,
    cache_write_1h_usd_per_million: null,
    effective_from: effectiveFrom,
    source: OPENAI_PRICING_SOURCE,
  };
}

export const OPENAI_PRICE_SNAPSHOTS: readonly ProviderPriceSnapshot[] = [
  // Highest confidence: gpt-4o / gpt-4o-mini list prices have been stable and widely documented since
  // the 2024-08-06 4o price cut. Cached input bills at 50% of the input rate for this family.
  openai("gpt-4o", 2.5, 1.25, "2024-08-06"),
  openai("gpt-4o-mini", 0.15, 0.075, "2024-07-18"),
  // gpt-4.1 family launch pricing (2025-04-14). Cached input bills at 25% of the input rate here.
  openai("gpt-4.1", 2, 0.5, "2025-04-14"),
  openai("gpt-4.1-mini", 0.4, 0.1, "2025-04-14"),
  openai("gpt-4.1-nano", 0.1, 0.025, "2025-04-14"),
];

// A DATED model id (claude-opus-4-8-20260101) is the same model as its family alias, so it prices
// off the family snapshot. Any other suffix is a DIFFERENT product (a `-fast` premium tier, a
// long-context variant) with its own price — matching it to the family would silently misprice it,
// so it stays unpriced instead. A shorter or unrelated id is not a match either: "claude-opus"
// must not price as Opus 4.8.
const DATED_SNAPSHOT_SUFFIX = /^-\d{8}$/;

function modelMatches(snapshotModel: string, requestModel: string): boolean {
  if (requestModel === snapshotModel) return true;
  if (!requestModel.startsWith(snapshotModel)) return false;
  return DATED_SNAPSHOT_SUFFIX.test(requestModel.slice(snapshotModel.length));
}

export function findPriceSnapshot(options: {
  provider: string;
  model: string | null;
  at?: Date;
  snapshots?: readonly ProviderPriceSnapshot[];
}): ProviderPriceSnapshot | null {
  const { provider, model } = options;
  if (!model) return null;
  const at = options.at ?? new Date();
  const snapshots = options.snapshots ?? ANTHROPIC_PRICE_SNAPSHOTS;

  let best: ProviderPriceSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (snapshot.provider !== provider || !modelMatches(snapshot.model, model)) continue;
    const effectiveFrom = Date.parse(`${snapshot.effective_from}T00:00:00Z`);
    if (!Number.isFinite(effectiveFrom) || effectiveFrom > at.getTime()) continue;
    // Prefer the most specific model match, then the most recent price in effect.
    if (
      !best
      || snapshot.model.length > best.model.length
      || (snapshot.model.length === best.model.length && snapshot.effective_from > best.effective_from)
    ) best = snapshot;
  }
  return best;
}

// A cost only exists when a MEASURED token count meets a snapshot that was actually in effect.
export function inputCostUsd(tokens: number | null, snapshot: ProviderPriceSnapshot | null): number | null {
  if (tokens === null || !snapshot) return null;
  return (tokens / 1_000_000) * snapshot.input_usd_per_million;
}

// What the provider actually billed a prompt as: the same prompt splits across four different
// rates. Every component here must be a provider-measured count — this type never carries a
// number Kage inferred.
export interface PromptTokenBreakdown {
  uncached_input_tokens: number;
  cache_write_5m_tokens: number;
  cache_write_1h_tokens: number;
  cache_read_tokens: number;
}

function rateCostUsd(tokens: number, ratePerMillion: number | null): number | null {
  if (tokens === 0) return 0;            // nothing billed at this rate; no rate needed
  if (ratePerMillion === null) return null; // billed, but Kage has no rate on record -> unknown
  return (tokens / 1_000_000) * ratePerMillion;
}

// The honest cost of a prompt: each component at the rate it was actually billed at. If any
// component that was billed has no rate on record, the whole cost is null — a partially-priced
// cost would read as a complete one.
export function promptInputCostUsd(
  breakdown: PromptTokenBreakdown | null,
  snapshot: ProviderPriceSnapshot | null,
): number | null {
  if (!breakdown || !snapshot) return null;
  const parts = [
    rateCostUsd(breakdown.uncached_input_tokens, snapshot.input_usd_per_million),
    rateCostUsd(breakdown.cache_write_5m_tokens, snapshot.cache_write_5m_usd_per_million ?? null),
    rateCostUsd(breakdown.cache_write_1h_tokens, snapshot.cache_write_1h_usd_per_million ?? null),
    rateCostUsd(breakdown.cache_read_tokens, snapshot.cache_read_usd_per_million),
  ];
  if (parts.some((part) => part === null)) return null;
  return parts.reduce((total: number, part) => total + (part as number), 0);
}
