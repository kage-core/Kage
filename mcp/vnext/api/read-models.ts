// Pure read-model builders over the Phase B repository model.
//
// Every builder here is a projection: it reads the model through the SAME honesty gates the model
// enforces (injectable = verified/approved) and NEVER re-derives trust by hand. Current truth is the
// injectable set; history and uncertainty (proposed/stale/disputed/superseded/archived) are carried
// separately in `other_claims`; health counts span the full claim set. None of these functions mutate
// anything, none reach the network, and none read raw event payloads.

import type { Repository } from "../repo-model/repository.js";
import { isInjectableTrustState } from "../repo-model/types.js";
import type { ClaimRecord, EntityRecord } from "../repo-model/types.js";
import type { TransformationReceipt } from "../protocol/index.js";
import { calculateCohort } from "../gateway/cohort-metrics.js";
import type {
  AttentionDto,
  ClaimDto,
  DecisionDetailDto,
  EntityCardDto,
  EntityDetailDto,
  EntityHealthDto,
  EvidenceDto,
  FeatureListDto,
  MetricDto,
  OverviewDto,
  RelatedEntityDto,
  ReviewItemDto,
  RunbookDetailDto,
  SystemMapDto,
  SystemMapLane,
  SystemMapLaneDto,
  SystemMapNodeDto,
  SystemMapTableRowDto,
  SystemMapView,
  TaskSummaryDto,
} from "./types.js";
import { SYSTEM_MAP_LANES } from "./types.js";

// The features whose absence the read model surfaces honestly rather than papering over. Mirrors
// REQUIRED_FEATURE_FIELDS in queries.ts.
const REQUIRED_FEATURE_RELATIONS: Record<string, string> = { owner: "owners", test_surface: "tests" };

// ---------------------------------------------------------------------------------------------
// claim + entity projections
// ---------------------------------------------------------------------------------------------

function claimDto(model: Repository, claim: ClaimRecord): ClaimDto {
  const evidence: EvidenceDto[] = model.evidenceForClaim(claim.claim_id).map(({ evidence: e, stance }) => ({
    evidence_id: e.evidence_id,
    source_type: e.source_type,
    source_uri: e.source_uri,
    path: e.path,
    symbol: e.symbol,
    line_start: e.line_start,
    line_end: e.line_end,
    commit: e.commit,
    verification_state: e.verification_state,
    stance,
  }));
  return {
    claim_id: claim.claim_id,
    claim_kind: claim.claim_kind,
    content: claim.normalized_content,
    trust_state: claim.trust_state,
    impact_class: claim.impact_class,
    confidence: claim.confidence,
    review_policy: claim.review_policy,
    supersedes_claim_id: claim.supersedes_claim_id,
    created_by: claim.created_by,
    created_at: claim.created_at,
    updated_at: claim.updated_at,
    evidence,
  };
}

function healthFor(allClaims: readonly ClaimRecord[], missing: string[]): EntityHealthDto {
  return {
    verified: allClaims.filter((c) => c.trust_state === "verified" || c.trust_state === "approved").length,
    stale: allClaims.filter((c) => c.trust_state === "stale").length,
    disputed: allClaims.filter((c) => c.trust_state === "disputed").length,
    missing_required_fields: missing,
  };
}

function entityCard(model: Repository, entity: EntityRecord): EntityCardDto {
  const allClaims = model.claimsForEntity(entity.entity_id);
  return {
    entity_id: entity.entity_id,
    kind: entity.kind,
    slug: entity.slug,
    canonical_name: entity.canonical_name,
    summary: entity.summary,
    status: entity.status,
    verified_claims: allClaims.filter((c) => c.trust_state === "verified" || c.trust_state === "approved").length,
    stale_claims: allClaims.filter((c) => c.trust_state === "stale").length,
    disputed_claims: allClaims.filter((c) => c.trust_state === "disputed").length,
  };
}

function relatedFor(model: Repository, entityId: string): { related: RelatedEntityDto[]; relatedKinds: Set<string> } {
  const related: RelatedEntityDto[] = [];
  const relatedKinds = new Set<string>();
  for (const relation of model.relationsFrom(entityId)) {
    const target = model.getEntity(relation.to_entity_id);
    if (!target) continue; // A dangling relation is not evidence of anything; skip it.
    relatedKinds.add(target.kind);
    related.push({
      entity_id: target.entity_id,
      kind: target.kind,
      slug: target.slug,
      canonical_name: target.canonical_name,
      relation_type: relation.relation_type,
      evidence_id: relation.evidence_id,
    });
  }
  return { related, relatedKinds };
}

// The shared feature/component/flow detail projection. current = injectable only; other = every
// non-injectable claim, shown but labeled; health counts span the full set.
export function entityDetail(model: Repository, entity: EntityRecord): EntityDetailDto {
  const allClaims = model.claimsForEntity(entity.entity_id);
  const current = allClaims.filter((c) => isInjectableTrustState(c.trust_state));
  const other = allClaims.filter((c) => !isInjectableTrustState(c.trust_state));
  const { related, relatedKinds } = relatedFor(model, entity.entity_id);

  const missing = entity.kind === "feature"
    ? Object.entries(REQUIRED_FEATURE_RELATIONS)
        .filter(([kind]) => !relatedKinds.has(kind))
        .map(([, field]) => field)
    : [];

  return {
    entity: entityCard(model, entity),
    current_claims: current.map((c) => claimDto(model, c)),
    other_claims: other.map((c) => claimDto(model, c)),
    related,
    health: healthFor(allClaims, missing),
  };
}

export function decisionDetail(model: Repository, entity: EntityRecord): DecisionDetailDto {
  const base = entityDetail(model, entity);
  // The approver is the accepted-review decider of a current (injectable) claim, when one exists.
  let approvedBy: string | null = null;
  const supersedesIds: string[] = [];
  for (const claim of model.claimsForEntity(entity.entity_id)) {
    if (claim.supersedes_claim_id) supersedesIds.push(claim.supersedes_claim_id);
    if (approvedBy === null && isInjectableTrustState(claim.trust_state)) {
      const accepted = model.reviewItemsForClaim(claim.claim_id).find((r) => r.status === "accepted" && r.decided_by);
      if (accepted?.decided_by) approvedBy = accepted.decided_by;
    }
  }
  return { ...base, decision: base.entity, approved_by: approvedBy, supersedes_claim_ids: supersedesIds };
}

export function runbookDetail(model: Repository, entity: EntityRecord): RunbookDetailDto {
  const base = entityDetail(model, entity);
  // Last successful execution is not recorded in the Phase B model. Surface it as an explicit null
  // rather than implying success by omission.
  return { ...base, runbook: base.entity, last_successful_execution: null };
}

export function featureList(model: Repository, repoId: string): FeatureListDto {
  return { features: model.listEntities(repoId, "feature").map((e) => entityCard(model, e)) };
}

// ---------------------------------------------------------------------------------------------
// review queue
// ---------------------------------------------------------------------------------------------

export function reviewItems(model: Repository, repoId: string, status?: ReviewItemDto["status"]): ReviewItemDto[] {
  return model.reviewItemsForRepository(repoId, status).map((item) => {
    const claim = model.getClaim(item.claim_id);
    const entity = claim ? model.getEntity(claim.entity_id) : null;
    return {
      review_item_id: item.review_item_id,
      claim_id: item.claim_id,
      entity_slug: entity?.slug ?? null,
      entity_kind: entity?.kind ?? null,
      claim_content: claim?.normalized_content ?? "",
      claim_impact: claim?.impact_class ?? "low",
      reason: item.reason,
      required_role: item.required_role,
      status: item.status,
      assigned_to: item.assigned_to,
      decided_by: item.decided_by,
      decided_at: item.decided_at,
      decision_note: item.decision_note,
      created_at: item.created_at,
      proposer: claim?.created_by ?? "",
    };
  });
}

// ---------------------------------------------------------------------------------------------
// overview
// ---------------------------------------------------------------------------------------------

function allClaimsForRepo(model: Repository, repoId: string): ClaimRecord[] {
  const claims: ClaimRecord[] = [];
  for (const entity of model.listEntities(repoId)) {
    for (const claim of model.claimsForEntity(entity.entity_id)) claims.push(claim);
  }
  return claims;
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function buildOverview(
  model: Repository,
  repoId: string | null,
  receipts: readonly TransformationReceipt[],
): OverviewDto {
  const entities = repoId ? model.listEntities(repoId) : [];
  const claims = repoId ? allClaimsForRepo(model, repoId) : [];
  const features = entities.filter((e) => e.kind === "feature");
  const runbooks = entities.filter((e) => e.kind === "runbook");
  const repositoryEntity = entities.find((e) => e.kind === "repository");

  const injectable = claims.filter((c) => isInjectableTrustState(c.trust_state)).length;
  const disputed = claims.filter((c) => c.trust_state === "disputed").length;
  const staleCritical = claims.filter(
    (c) => c.trust_state === "stale" && (c.impact_class === "high" || c.impact_class === "critical"),
  ).length;

  const documentedFeatures = features.filter((f) => {
    const kinds = new Set(
      model.relationsFrom(f.entity_id)
        .map((r) => model.getEntity(r.to_entity_id)?.kind)
        .filter((k): k is NonNullable<typeof k> => Boolean(k)),
    );
    return kinds.has("owner") && kinds.has("test_surface");
  }).length;

  const healthyRunbooks = runbooks.filter(
    (r) => model.injectableClaims(r.entity_id).length > 0,
  ).length;

  const cohort = calculateCohort(receipts);
  const netCostExact = cohort.cost_delta_receipts > 0;

  const metrics: MetricDto[] = [
    {
      id: "net_context_cost",
      label: "Net context cost",
      value: netCostExact ? cohort.total_net_input_cost_delta_usd : null,
      unit: "usd",
      exactness: netCostExact ? "exact" : "unavailable",
      formula: "Σ(provider_input_cost_after_usd − provider_input_cost_before_usd) over receipts priced on both sides",
      source_path: "mcp/vnext/gateway/cohort-metrics.ts",
      trend: null,
    },
    {
      id: "verified_reuse",
      label: "Verified reuse",
      value: percent(injectable, claims.length),
      unit: "percent",
      exactness: claims.length ? "structural" : "unavailable",
      formula: "injectable_claims ÷ total_claims × 100 (injectable = verified or approved)",
      source_path: "mcp/vnext/repo-model/repository.ts",
      trend: null,
    },
    {
      id: "time_to_verified_change",
      label: "Time to verified change",
      value: null,
      unit: "milliseconds",
      exactness: "unavailable",
      formula: "median(verified_at − proposed_at) — requires claim lifecycle timestamps not recorded in Phase B",
      source_path: "mcp/vnext/repo-model/claims",
      trend: null,
    },
    {
      id: "understanding_coverage",
      label: "Understanding coverage",
      value: percent(documentedFeatures, features.length),
      unit: "percent",
      exactness: features.length ? "structural" : "unavailable",
      formula: "features_with_owner_and_test_surface ÷ total_features × 100",
      source_path: "mcp/vnext/repo-model/queries.ts",
      trend: null,
    },
    {
      id: "attach_reliability",
      label: "Attach reliability",
      value: null,
      unit: "percent",
      exactness: "unavailable",
      formula: "delivered_context ÷ attempted_context × 100 — requires delivery telemetry not joined into the read model in Phase C Task 1",
      source_path: "mcp/vnext/storage/delivery-store.ts",
      trend: null,
    },
    {
      id: "open_contradictions",
      label: "Open contradictions",
      value: disputed,
      unit: "count",
      exactness: "structural",
      formula: "count(claims where trust_state = 'disputed')",
      source_path: "mcp/vnext/repo-model/repository.ts",
      trend: null,
    },
    {
      id: "stale_critical",
      label: "Stale critical claims",
      value: staleCritical,
      unit: "count",
      exactness: "structural",
      formula: "count(claims where trust_state = 'stale' and impact_class in ('high','critical'))",
      source_path: "mcp/vnext/repo-model/repository.ts",
      trend: null,
    },
    {
      id: "runbook_health",
      label: "Runbook health",
      value: percent(healthyRunbooks, runbooks.length),
      unit: "percent",
      exactness: runbooks.length ? "structural" : "unavailable",
      formula: "runbooks_with_injectable_claim ÷ total_runbooks × 100",
      source_path: "mcp/vnext/repo-model/queries.ts",
      trend: null,
    },
  ];

  const attention: AttentionDto[] = [];
  if (repoId) {
    for (const item of model.reviewItemsForRepository(repoId, "open")) {
      const claim = model.getClaim(item.claim_id);
      const critical = claim?.impact_class === "critical" || claim?.impact_class === "high";
      attention.push({
        id: item.review_item_id,
        kind: "review",
        title: `Review required: ${item.reason}`,
        severity: critical ? "critical" : "warning",
        href: "/review",
      });
    }
  }
  for (const claim of claims) {
    if (claim.trust_state === "stale" && (claim.impact_class === "high" || claim.impact_class === "critical")) {
      const entity = model.getEntity(claim.entity_id);
      attention.push({
        id: claim.claim_id,
        kind: "stale",
        title: `Stale ${claim.impact_class}-impact claim on ${entity?.canonical_name ?? claim.entity_id}`,
        severity: "critical",
        href: entity ? `/${entity.kind}s/${entity.slug}` : "/",
      });
    }
  }
  // Deterministic order: by severity (critical first), then id.
  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  attention.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));

  return {
    repository: {
      id: repoId ?? "",
      name: repositoryEntity?.canonical_name ?? repoId ?? "",
      branch: null,
      commit: null,
    },
    metrics,
    // Integration state is wired in Task 9; an empty list is honest, not a fabricated "all healthy".
    integrations: [],
    attention,
  };
}

// ---------------------------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------------------------

interface TaskRow {
  task_id: string;
  session_id: string;
  repository_id: string;
  agent_surface: string;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
}

export function listTaskSummaries(
  model: Repository,
  receiptCount: (taskId: string) => number,
): TaskSummaryDto[] {
  const rows = model.database
    .prepare(
      `SELECT task_id, session_id, repository_id, agent_surface, started_at, ended_at, outcome
       FROM tasks ORDER BY started_at, task_id`,
    )
    .all() as unknown as TaskRow[];
  return rows.map((row) => ({
    task_id: row.task_id,
    session_id: row.session_id,
    repository_id: row.repository_id,
    agent_surface: row.agent_surface,
    started_at: row.started_at,
    ended_at: row.ended_at,
    outcome: row.outcome,
    receipt_count: receiptCount(row.task_id),
  }));
}

export function findTaskSummary(
  model: Repository,
  taskId: string,
  receiptCount: (taskId: string) => number,
): TaskSummaryDto | null {
  const row = model.database
    .prepare(
      `SELECT task_id, session_id, repository_id, agent_surface, started_at, ended_at, outcome
       FROM tasks WHERE task_id = ?`,
    )
    .get(taskId) as TaskRow | undefined;
  if (!row) return null;
  return {
    task_id: row.task_id,
    session_id: row.session_id,
    repository_id: row.repository_id,
    agent_surface: row.agent_surface,
    started_at: row.started_at,
    ended_at: row.ended_at,
    outcome: row.outcome,
    receipt_count: receiptCount(row.task_id),
  };
}

// ---------------------------------------------------------------------------------------------
// system map — pure + deterministic (no wall-clock, no randomness, no force simulation)
// ---------------------------------------------------------------------------------------------

const LANE_SET: ReadonlySet<string> = new Set(SYSTEM_MAP_LANES);

export function buildSystemMap(model: Repository, repoId: string | null, view: SystemMapView): SystemMapDto {
  const entities = repoId ? model.listEntities(repoId) : [];
  // Only entities that belong to a canonical lane appear on the map. Sort by canonical name then
  // entity id — the codebase's standard tiebreak — so the map is byte-stable across calls.
  const laneEntities = entities
    .filter((e) => LANE_SET.has(e.kind))
    .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name) || a.entity_id.localeCompare(b.entity_id));

  const included = new Set(laneEntities.map((e) => e.entity_id));
  const byId = new Map(laneEntities.map((e) => [e.entity_id, e] as const));

  const lanes: SystemMapLaneDto[] = SYSTEM_MAP_LANES.map((lane) => ({
    lane,
    nodes: laneEntities
      .filter((e) => e.kind === lane)
      .map<SystemMapNodeDto>((e) => ({
        entity_id: e.entity_id,
        kind: e.kind,
        slug: e.slug,
        canonical_name: e.canonical_name,
        lane: e.kind as SystemMapLane,
      })),
  }));

  // Edges between two included nodes only, de-duplicated and sorted for determinism.
  const edgeKeys = new Set<string>();
  const edges = [] as SystemMapDto["edges"];
  const table: SystemMapTableRowDto[] = [];
  for (const entity of laneEntities) {
    for (const relation of model.relationsFrom(entity.entity_id)) {
      if (!included.has(relation.to_entity_id)) continue;
      const key = `${relation.from_entity_id}|${relation.relation_type}|${relation.to_entity_id}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        from_entity_id: relation.from_entity_id,
        to_entity_id: relation.to_entity_id,
        relation_type: relation.relation_type,
      });
      const to = byId.get(relation.to_entity_id)!;
      table.push({
        from: entity.canonical_name,
        from_kind: entity.kind,
        relation_type: relation.relation_type,
        to: to.canonical_name,
        to_kind: to.kind,
      });
    }
  }
  edges.sort((a, b) =>
    a.from_entity_id.localeCompare(b.from_entity_id)
    || a.relation_type.localeCompare(b.relation_type)
    || a.to_entity_id.localeCompare(b.to_entity_id),
  );
  table.sort((a, b) =>
    a.from.localeCompare(b.from) || a.relation_type.localeCompare(b.relation_type) || a.to.localeCompare(b.to),
  );

  return { view, lanes, edges, table };
}
