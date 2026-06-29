// Pure metric and statistics helpers used by the benchmark/metrics code.
// This is a dependency-free leaf module: it imports nothing from the kernel,
// so pulling it out carries no circular-dependency risk. Leaf-first is the
// safe way to decompose the kernel — extract the bottom of the dependency
// graph first, where nothing depends back inward.

/** Recall@k: fraction of the relevant set retrieved within the top k. */
export function codingRecallAt(retrieved: Array<{ packet_id: string }>, relevant: Set<string>, k: number): number {
  if (!relevant.size) return 0;
  return retrieved.slice(0, k).filter((item) => relevant.has(item.packet_id)).length / relevant.size;
}

/** Precision@k: fraction of the top k that is relevant. */
export function codingPrecisionAt(retrieved: Array<{ packet_id: string }>, relevant: Set<string>, k: number): number {
  const rows = retrieved.slice(0, k);
  return rows.length ? rows.filter((item) => relevant.has(item.packet_id)).length / rows.length : 0;
}

/** Normalized discounted cumulative gain at k (binary relevance). */
export function codingNdcgAt(retrieved: Array<{ packet_id: string }>, relevant: Set<string>, k: number): number {
  const dcg = retrieved.slice(0, k).reduce((sum, item, index) => sum + (relevant.has(item.packet_id) ? 1 / Math.log2(index + 2) : 0), 0);
  const idealHits = Math.min(relevant.size, k);
  let ideal = 0;
  for (let index = 0; index < idealHits; index += 1) ideal += 1 / Math.log2(index + 2);
  return ideal ? dcg / ideal : 0;
}

/** Mean reciprocal rank: 1 / rank of the first relevant hit, else 0. */
export function codingMrr(retrieved: Array<{ packet_id: string }>, relevant: Set<string>): number {
  const index = retrieved.findIndex((item) => relevant.has(item.packet_id));
  return index >= 0 ? 1 / (index + 1) : 0;
}

/** Arithmetic mean, 0 for an empty list. */
export function averageNumber(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** p-th percentile (0..1) via nearest-rank, 0 for an empty list. */
export function percentileNumber(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

/** Round to a fixed number of decimal places. */
export function roundDecimal(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Tally rows by a string key. */
export function countByKey<T>(rows: T[], fn: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = fn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Upper-case the first letter of each word. */
export function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (match) => match.toUpperCase());
}
