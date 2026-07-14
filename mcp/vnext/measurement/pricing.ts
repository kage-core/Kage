// Prices are CONFIGURATION RECORDS, not timeless constants. Each one names the source it was
// read from and the date it took effect, so a receipt's cost can be audited later and so a price
// change is a new record rather than an edit that silently rewrites history. If a request's model
// has no snapshot in effect, the cost fields on its receipt stay null — Kage does not guess.

export interface ProviderPriceSnapshot {
  provider: string;
  model: string;
  input_usd_per_million: number;
  // Cache-read pricing is published only as an approximate multiple of the input price, and Kage
  // does not measure cache reads yet, so it is left unmeasured rather than derived.
  cache_read_usd_per_million: number | null;
  effective_from: string; // ISO date (YYYY-MM-DD) the price took effect.
  source: string;         // The URL the price was read from.
}

const ANTHROPIC_PRICING_SOURCE = "https://platform.claude.com/docs/en/pricing";
// The date this table was read from the source above. Changing a price means appending a new
// record with a later effective_from, not editing one of these.
const READ_ON = "2026-06-24";

function anthropic(model: string, inputUsdPerMillion: number): ProviderPriceSnapshot {
  return {
    provider: "anthropic",
    model,
    input_usd_per_million: inputUsdPerMillion,
    cache_read_usd_per_million: null,
    effective_from: READ_ON,
    source: ANTHROPIC_PRICING_SOURCE,
  };
}

export const ANTHROPIC_PRICE_SNAPSHOTS: readonly ProviderPriceSnapshot[] = [
  anthropic("claude-fable-5", 10),
  anthropic("claude-opus-4-8", 5),
  anthropic("claude-opus-4-7", 5),
  anthropic("claude-opus-4-6", 5),
  anthropic("claude-sonnet-5", 3),
  anthropic("claude-sonnet-4-6", 3),
  anthropic("claude-haiku-4-5", 1),
];

// A dated model id (claude-opus-4-8-20260101) is the same model as its family alias, so it prices
// off the family snapshot. A shorter or unrelated id is NOT a match — "claude-opus" must not
// silently price as Opus 4.8.
function modelMatches(snapshotModel: string, requestModel: string): boolean {
  return requestModel === snapshotModel || requestModel.startsWith(`${snapshotModel}-`);
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
