// GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with `npm run sync-types` (from platform/web). Source of truth:
//   mcp/vnext/api/types.ts (DTOs) + mcp/vnext/repo-model/types.ts + mcp/vnext/protocol/types.ts (enums).
// The `npm run check-types` drift guard fails CI if this file diverges from the backend.

// --- Inlined backend enums (string-literal unions, mirrored verbatim) ---
export type EntityKind =
  | "repository"
  | "feature"
  | "component"
  | "flow"
  | "contract"
  | "data_model"
  | "invariant"
  | "runbook"
  | "decision"
  | "incident"
  | "owner"
  | "dependency"
  | "test_surface";

export type ImpactClass = "low" | "medium" | "high" | "critical";

export type TrustState =
  | "proposed"
  | "verified"
  | "approved"
  | "disputed"
  | "stale"
  | "superseded"
  | "archived";

// --- Portal DTOs (copied verbatim from mcp/vnext/api/types.ts) ---

// Stable portal DTOs — the single source of truth for the Kage vNext knowledge portal read model.
//
// These types are pure data (no methods) built from string-literal unions that mirror the repository
// model enums (TrustState, EntityKind, ImpactClass). The frontend must not hand-maintain a parallel
// copy: a checked type-sync step (Task 2) generates `platform/web/src/api/types.ts` from this module
// and fails on drift.
//
// Honesty contract carried by these shapes:
//   - Every metric exposes `exactness` + `formula` + `source_path`; a metric with no honest value is
//     `value: null` with `exactness: "unavailable"`, never a fabricated zero.
//   - Entity read models split CURRENT TRUTH (`current_claims`, injectable only) from HISTORY /
//     UNCERTAINTY (`other_claims`, everything non-injectable) and from `health` counts over the full
//     claim set. Stale/superseded/disputed claims are shown but labeled, never merged into current.
//   - Raw event payloads and prompt text never travel through these routes.



export type MetricExactness = "exact" | "cohort" | "structural" | "unavailable";

export type MetricId =
  | "net_context_cost"
  | "verified_reuse"
  | "time_to_verified_change"
  | "understanding_coverage"
  | "attach_reliability"
  | "open_contradictions"
  | "stale_critical"
  | "runbook_health";

export interface MetricDto {
  id: MetricId;
  label: string;
  value: number | null;
  unit: "usd" | "percent" | "milliseconds" | "count";
  exactness: MetricExactness;
  formula: string;
  source_path: string;
  trend: number | null;
}

export interface RepositoryDto {
  id: string;
  name: string;
  branch: string | null;
  commit: string | null;
}

export interface AttentionDto {
  id: string;
  kind: "review" | "stale" | "integration" | "cost";
  title: string;
  severity: "info" | "warning" | "critical";
  href: string;
}

export interface IntegrationDto {
  id: string;
  name: string;
  state: "healthy" | "degraded" | "passthrough" | "disconnected";
  last_success_at: string | null;
}

export interface OverviewDto {
  repository: RepositoryDto;
  metrics: MetricDto[];
  attention: AttentionDto[];
  integrations: IntegrationDto[];
}

// A single supporting/contradicting evidence anchor. Only ground-truth anchors and verification
// state travel — never raw source bytes or prompt text.
export interface EvidenceDto {
  evidence_id: string;
  source_type: string;
  source_uri: string;
  path: string | null;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  commit: string | null;
  verification_state: "verified" | "failed" | "unavailable";
  stance: "supports" | "contradicts";
}

export interface ClaimDto {
  claim_id: string;
  claim_kind: string;
  content: string;
  trust_state: TrustState;
  impact_class: ImpactClass;
  confidence: number;
  review_policy: string;
  supersedes_claim_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  evidence: EvidenceDto[];
}

export interface RelatedEntityDto {
  entity_id: string;
  kind: EntityKind;
  slug: string;
  canonical_name: string;
  relation_type: string;
  evidence_id: string | null;
}

export interface EntityCardDto {
  entity_id: string;
  kind: EntityKind;
  slug: string;
  canonical_name: string;
  summary: string;
  status: "active" | "archived";
  verified_claims: number;
  stale_claims: number;
  disputed_claims: number;
}

export interface EntityHealthDto {
  verified: number;
  stale: number;
  disputed: number;
  missing_required_fields: string[];
}

// The shared body for feature/component/flow/decision/runbook detail pages. `current_claims` is the
// injectable set only; `other_claims` carries proposed/stale/disputed/superseded/archived so the
// frontend can render them in separately labeled panels. `health` counts span the full claim set.
export interface EntityDetailDto {
  entity: EntityCardDto;
  current_claims: ClaimDto[];
  other_claims: ClaimDto[];
  related: RelatedEntityDto[];
  health: EntityHealthDto;
}

export interface DecisionDetailDto extends EntityDetailDto {
  decision: EntityCardDto;
  // The accepted-review approver of the current claim, when one exists; null otherwise.
  approved_by: string | null;
  supersedes_claim_ids: string[];
}

export interface RunbookDetailDto extends EntityDetailDto {
  runbook: EntityCardDto;
  // Null until a successful execution is recorded — never implied by omission.
  last_successful_execution: string | null;
}

export interface FeatureListDto {
  features: EntityCardDto[];
}

export interface ReviewItemDto {
  review_item_id: string;
  claim_id: string;
  entity_slug: string | null;
  entity_kind: EntityKind | null;
  claim_content: string;
  claim_impact: ImpactClass;
  reason: string;
  required_role: string;
  status: "open" | "accepted" | "rejected" | "superseded";
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  proposer: string;
}

export interface ReviewItemsDto {
  review_items: ReviewItemDto[];
}

export interface TaskSummaryDto {
  task_id: string;
  session_id: string;
  repository_id: string;
  agent_surface: string;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  receipt_count: number;
}

export interface TasksDto {
  tasks: TaskSummaryDto[];
}

export interface TaskDetailDto {
  task: TaskSummaryDto;
  receipt_count: number;
}

export interface IntegrationsDto {
  integrations: IntegrationDto[];
}

// ---------------------------------------------------------------------------------------------
// System map — a task-oriented 2D view with an equivalent accessible table.
// ---------------------------------------------------------------------------------------------

export type SystemMapView = "feature" | "runtime" | "sequence" | "ownership" | "impact";

// Lanes are rendered in a FIXED order so the map is deterministic and diff-stable.
export const SYSTEM_MAP_LANES = ["feature", "flow", "component", "contract", "data_model", "owner"] as const;
export type SystemMapLane = (typeof SYSTEM_MAP_LANES)[number];

// A node's knowledge health, derived from the FULL claim set (never re-deriving trust by hand):
// disputed wins over stale wins over verified; a node with no injectable claim is "unverified".
// This mirrors the current-truth honesty gate — a node is only "verified" when it has injectable
// truth AND no stale/disputed claims pulling against it.
export type SystemMapNodeHealth = "verified" | "stale" | "disputed" | "unverified";

export interface SystemMapNodeDto {
  entity_id: string;
  kind: EntityKind;
  slug: string;
  canonical_name: string;
  lane: SystemMapLane;
  // Deterministic layered coordinates: `x` is the lane column, `y` the node's row within its lane.
  // Computed server-side (no force simulation, no wall-clock) so the map is diff-stable.
  x: number;
  y: number;
  health: SystemMapNodeHealth;
  // Link to the entity's detail page, or null for kinds with no dedicated page (owner/contract/
  // data_model) — an honest null, never a link that 404s.
  href: string | null;
  // Undirected distance from the view's root set. 0 for a root; nodes beyond `max_hops` are excluded.
  hops: number;
  // True when this node has a neighbor OUTSIDE the current two-hop window — the frontend offers an
  // "expand" action (re-focus on this node) instead of rendering the entire repository at once.
  truncated: boolean;
}

export interface SystemMapEdgeDto {
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
}

export interface SystemMapLaneDto {
  lane: SystemMapLane;
  label: string;
  nodes: SystemMapNodeDto[];
}

// One row per SHOWN node (not per edge), so the table is a complete accessible equivalent of the map
// — including isolated nodes an edge-only table would drop. `upstream`/`downstream` list the
// canonical names of neighbors within the window, so relations survive without the 2D rendering.
export interface SystemMapTableRowDto {
  entity_id: string;
  node: string;
  kind: EntityKind;
  lane: SystemMapLane;
  health: SystemMapNodeHealth;
  href: string | null;
  upstream: string[];
  downstream: string[];
}

export interface SystemMapDto {
  view: SystemMapView;
  // The entity the window is rooted on when the caller passed `?focus=`; null for the default view.
  focus_entity_id: string | null;
  max_hops: number;
  lanes: SystemMapLaneDto[];
  edges: SystemMapEdgeDto[];
  table: SystemMapTableRowDto[];
  // True when ANY shown node has a hidden neighbor — the map is a windowed view, not the whole repo.
  truncated: boolean;
}
