import { buildContextCapsule } from "./capsule-builder.js";
import { isExplainingSource, type ModelSourceRejection } from "./model-source.js";
import type { CapsuleSection } from "../protocol/index.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";
import type { ContextSourceMode } from "../runtime/config.js";

export type { ContextSourceMode };

/**
 * Controlled source progression (shadow mode).
 *
 * `compareContextSources` runs BOTH the legacy source and the model source for a request, delivers
 * exactly ONE of them (the legacy source by default — the model never becomes the delivered source
 * until the progression gate below is met), and records the full candidate set of both plus the
 * model's rejection reasons. Nothing the model proposes reaches the agent while the delivered source
 * is legacy: shadow mode PROPOSES, it never injects.
 *
 * `evaluateProgression` is the honesty gate that authorizes flipping the delivered source to `model`.
 * It measures the model against the legacy source over a FROZEN evaluation corpus and only returns
 * `ready` when every named criterion holds. It measures — it never assumes.
 */

export type DeliveredSource = "legacy" | "model";

export interface ContextComparison {
  legacy_candidate_ids: string[];
  model_candidate_ids: string[];
  model_rejections: ModelSourceRejection[];
  // Ids the model surfaced that legacy did not, and vice versa — the shadow delta a reviewer reads.
  model_only_candidate_ids: string[];
  legacy_only_candidate_ids: string[];
}

export interface CompareResult {
  delivered: ContextCandidate[];
  delivered_source: DeliveredSource;
  comparison: ContextComparison;
}

export interface CompareOptions {
  // Which source's candidates are actually DELIVERED. Defaults to legacy: the model is shadowed, not
  // injected, until the progression gate has passed and an operator has explicitly switched over.
  deliver?: DeliveredSource;
}

async function collect(
  source: ContextSource,
  request: ContextRequest,
): Promise<{ candidates: ContextCandidate[]; rejections: ModelSourceRejection[] }> {
  if (isExplainingSource(source)) {
    const explained = await source.explain(request);
    return { candidates: explained.candidates, rejections: explained.rejections };
  }
  return { candidates: await source.find(request), rejections: [] };
}

function ids(candidates: readonly ContextCandidate[]): string[] {
  return candidates.map((candidate) => candidate.candidate_id);
}

export async function compareContextSources(
  request: ContextRequest,
  legacy: ContextSource,
  model: ContextSource,
  options: CompareOptions = {},
): Promise<CompareResult> {
  const deliveredSource: DeliveredSource = options.deliver ?? "legacy";
  const legacyResult = await collect(legacy, request);
  const modelResult = await collect(model, request);

  const legacyIds = ids(legacyResult.candidates);
  const modelIds = ids(modelResult.candidates);
  const legacySet = new Set(legacyIds);
  const modelSet = new Set(modelIds);

  const comparison: ContextComparison = {
    legacy_candidate_ids: legacyIds,
    model_candidate_ids: modelIds,
    model_rejections: modelResult.rejections,
    model_only_candidate_ids: modelIds.filter((id) => !legacySet.has(id)),
    legacy_only_candidate_ids: legacyIds.filter((id) => !modelSet.has(id)),
  };

  const delivered = deliveredSource === "legacy" ? legacyResult.candidates : modelResult.candidates;
  return { delivered, delivered_source: deliveredSource, comparison };
}

// ---- progression gate ----------------------------------------------------

/**
 * One case in the frozen evaluation corpus. `answer_evidence_ids` are the evidence/claim/packet ids
 * that would ANSWER the query — a source "supports" the case when it surfaces at least one of them.
 * `critical_invariant_evidence_ids` name evidence a critical invariant rests on; dropping one the
 * legacy source surfaced is a regression. Labels are author-provided ground truth, not derived.
 */
export interface EvalCase {
  request: ContextRequest;
  answer_evidence_ids: string[];
  critical_invariant_evidence_ids?: string[];
}

export interface ProgressionCriteria {
  no_stale_or_disputed_injection: boolean;
  answer_support_rate_at_least_legacy: boolean;
  median_capsule_size_leq_legacy: boolean;
  feature_runbook_coverage_geq_legacy: boolean;
  no_critical_invariant_regression: boolean;
}

export interface ProgressionMeasured {
  cases: number;
  legacy_answer_support_rate: number;
  model_answer_support_rate: number;
  legacy_median_capsule_tokens: number;
  model_median_capsule_tokens: number;
  legacy_feature_runbook_coverage: number;
  model_feature_runbook_coverage: number;
  critical_invariant_regressions: number;
  non_injectable_model_candidates: number;
}

export interface ProgressionDecision {
  ready: boolean;
  criteria: ProgressionCriteria;
  measured: ProgressionMeasured;
}

function evidenceIdSet(candidates: readonly ContextCandidate[]): Set<string> {
  const set = new Set<string>();
  for (const candidate of candidates) {
    for (const id of candidate.evidence_ids) set.add(id);
    // The candidate id itself may encode a claim id (model:<claim>); include it so a label can key on
    // either the evidence or the claim.
    set.add(candidate.candidate_id);
  }
  return set;
}

function supportsAnswer(candidates: readonly ContextCandidate[], answerIds: readonly string[]): boolean {
  if (!answerIds.length) return false;
  const surfaced = evidenceIdSet(candidates);
  return answerIds.some((id) => surfaced.has(id));
}

function featureRunbookCoverage(candidates: readonly ContextCandidate[]): number {
  const buckets = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.kind === "feature" || candidate.kind === "runbook") buckets.add(candidate.candidate_id);
  }
  return buckets.size;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const INJECTABLE: ReadonlySet<CapsuleSection["kind"]> = new Set([
  "orientation", "invariant", "feature", "entry_point", "decision", "verification", "runbook", "minimal_change",
]);

/**
 * Measure the model source against the legacy source over a frozen corpus and decide whether the
 * delivered source may progress from legacy to model. Every figure is measured from real candidate
 * sets and real capsule builds; nothing is estimated. `ready` is the AND of all five criteria.
 */
export async function evaluateProgression(
  corpus: readonly EvalCase[],
  legacy: ContextSource,
  model: ContextSource,
): Promise<ProgressionDecision> {
  let legacySupported = 0;
  let modelSupported = 0;
  const legacyCapsuleTokens: number[] = [];
  const modelCapsuleTokens: number[] = [];
  let legacyCoverage = 0;
  let modelCoverage = 0;
  let criticalRegressions = 0;
  let nonInjectableModel = 0;

  for (const evalCase of corpus) {
    const legacyCandidates = await legacy.find(evalCase.request);
    const modelCandidates = await model.find(evalCase.request);

    // The load-bearing honesty invariant: the model source must never propose a non-injectable claim
    // into the delivered set. Any leak here fails the gate outright.
    nonInjectableModel += modelCandidates.filter(
      (c) => c.trust_state !== "verified" && c.trust_state !== "approved",
    ).length;

    if (supportsAnswer(legacyCandidates, evalCase.answer_evidence_ids)) legacySupported += 1;
    if (supportsAnswer(modelCandidates, evalCase.answer_evidence_ids)) modelSupported += 1;

    const legacyCapsule = await buildContextCapsule({ find: async () => legacyCandidates }, evalCase.request);
    const modelCapsule = await buildContextCapsule({ find: async () => modelCandidates }, evalCase.request);
    legacyCapsuleTokens.push(legacyCapsule.estimated_tokens);
    modelCapsuleTokens.push(modelCapsule.estimated_tokens);

    legacyCoverage += featureRunbookCoverage(legacyCandidates);
    modelCoverage += featureRunbookCoverage(modelCandidates);

    const critical = evalCase.critical_invariant_evidence_ids ?? [];
    if (critical.length) {
      const legacyHas = supportsAnswer(legacyCandidates, critical);
      const modelHas = supportsAnswer(modelCandidates, critical);
      if (legacyHas && !modelHas) criticalRegressions += 1;
    }
    // Defensive: an unrecognized section kind would mean an unbudgetable candidate leaked through.
    for (const candidate of modelCandidates) {
      if (!INJECTABLE.has(candidate.kind)) nonInjectableModel += 1;
    }
  }

  const cases = corpus.length;
  const legacyRate = cases ? legacySupported / cases : 0;
  const modelRate = cases ? modelSupported / cases : 0;
  const legacyMedian = median(legacyCapsuleTokens);
  const modelMedian = median(modelCapsuleTokens);

  const criteria: ProgressionCriteria = {
    no_stale_or_disputed_injection: nonInjectableModel === 0,
    answer_support_rate_at_least_legacy: modelRate >= legacyRate,
    median_capsule_size_leq_legacy: modelMedian <= legacyMedian,
    feature_runbook_coverage_geq_legacy: modelCoverage >= legacyCoverage,
    no_critical_invariant_regression: criticalRegressions === 0,
  };

  return {
    ready: Object.values(criteria).every(Boolean),
    criteria,
    measured: {
      cases,
      legacy_answer_support_rate: legacyRate,
      model_answer_support_rate: modelRate,
      legacy_median_capsule_tokens: legacyMedian,
      model_median_capsule_tokens: modelMedian,
      legacy_feature_runbook_coverage: legacyCoverage,
      model_feature_runbook_coverage: modelCoverage,
      critical_invariant_regressions: criticalRegressions,
      non_injectable_model_candidates: nonInjectableModel,
    },
  };
}

// ---- runtime source progression ------------------------------------------

/**
 * The context source the runtime actually installs, driven by config.context_source.
 *
 * - `legacy`  : delivers the legacy source's candidates unchanged. The model is never consulted.
 * - `compare` : delivers the LEGACY candidates (shadow mode — nothing the model proposes is
 *               injected) but ALSO runs the model source and records its candidate set for
 *               comparison. A shadow failure never breaks delivery: the model side is best-effort.
 * - `model`   : delivers the MODEL source's candidates. Reachable only when config says so, which is
 *               only after the progression gate has passed and an operator switched over.
 *
 * The gate lives in the store: the model source emits only verified/approved claims, so even the
 * `model` delivery path can never inject a proposed/stale/disputed claim.
 */
export class ProgressiveContextSource implements ContextSource {
  private lastComparison: ContextComparison | null = null;

  constructor(
    private readonly legacy: ContextSource,
    private readonly model: ContextSource,
    private readonly mode: ContextSourceMode,
  ) {}

  async find(request: ContextRequest): Promise<ContextCandidate[]> {
    if (this.mode === "model") return this.model.find(request);
    const legacyCandidates = await this.legacy.find(request);
    if (this.mode === "compare") {
      // Shadow: run the model and record the comparison, but never let a model-side failure affect
      // what the agent receives. The delivered set is legacy, full stop.
      try {
        const modelResult = await collect(this.model, request);
        const legacyIds = ids(legacyCandidates);
        const modelIds = ids(modelResult.candidates);
        const legacySet = new Set(legacyIds);
        const modelSet = new Set(modelIds);
        this.lastComparison = {
          legacy_candidate_ids: legacyIds,
          model_candidate_ids: modelIds,
          model_rejections: modelResult.rejections,
          model_only_candidate_ids: modelIds.filter((id) => !legacySet.has(id)),
          legacy_only_candidate_ids: legacyIds.filter((id) => !modelSet.has(id)),
        };
      } catch {
        this.lastComparison = null;
      }
    }
    return legacyCandidates;
  }

  // The most recent shadow comparison recorded in `compare` mode, for observation. Null when the mode
  // is not `compare` or the model side has not run/succeeded yet.
  comparison(): ContextComparison | null {
    return this.lastComparison;
  }

  async close(): Promise<void> {
    await this.legacy.close?.();
    await this.model.close?.();
  }
}
