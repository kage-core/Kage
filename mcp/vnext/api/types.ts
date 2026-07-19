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

import type { EntityKind, ImpactClass, TrustState } from "../repo-model/types.js";

export type { EntityKind, ImpactClass, TrustState } from "../repo-model/types.js";

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
  // The claim's review policy, mirrored so the UI can compute the SAME self-approval rule the server
  // enforces (blocked when the actor is the proposer AND the claim is high-impact OR policy is not
  // "automatic"), and never offer a click the server will reject with 403.
  claim_review_policy: string;
  // The claim CURRENTLY occupying this claim's slot (the one a contradiction would displace): its id
  // (so an accept can supersede it) and its content (so the reviewer sees what would change), or null
  // when there is none — evidence-first review shows exactly what a decision replaces.
  current_claim_id: string | null;
  current_claim_content: string | null;
  // The proposed claim's supporting/contradicting evidence anchors.
  evidence: EvidenceDto[];
  reason: string;
  required_role: string;
  status: "open" | "accepted" | "rejected" | "superseded";
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  proposer: string;
  // Optimistic-concurrency tag: a stable hash of the item's mutable decision state. The client echoes
  // it as `expected_version`; a mismatch means the item changed under the reviewer's feet (409).
  version: string;
}

export interface ReviewItemsDto {
  review_items: ReviewItemDto[];
}

// The six review mutations share one request envelope. `actor` and `decision_note` are always
// required; `expected_version` is the optimistic-concurrency tag; the remaining fields are per-action
// (`edited_content` for edit-and-accept, `opposing_claim_id` for supersede, `assigned_to` for assign).
export interface ReviewDecisionRequestDto {
  actor: string;
  expected_version: string;
  decision_note: string;
  edited_content?: string;
  opposing_claim_id?: string;
  assigned_to?: string | null;
}

// The result of a review mutation. `accepted` is present when a claim was approved; `replaced` is
// present only for a contradiction supersession (the retired opposing claim).
export interface ReviewDecisionResultDto {
  review: ReviewItemDto;
  accepted?: ClaimDto;
  replaced?: ClaimDto;
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

// ---------------------------------------------------------------------------------------------
// Task + cost receipts — EXACT request economics kept strictly SEPARATE from COHORT outcomes.
//
// The honesty contract this DTO set exists to enforce:
//   - EXACT request economics (what a transform did to the prompt) live in
//     `exact_request_measurements`; COHORT outcome trends (output tokens, latency, Kage's own
//     processing cost) live in `task_outcomes`. The two are NEVER fused, and there is NO
//     "total value created" / ROI number anywhere — a change in model output can never be dressed
//     up as a prompt saving.
//   - A net input cost/token delta is EXACT only over requests measured on BOTH sides; a one-sided
//     request reports `null`, never `before − 0` (which would book the whole request as a saving).
//   - Every metric carries `exactness` + `formula` + `source_path`; an unmeasurable metric is
//     `value: null` with `exactness: "unavailable"`, rendered "Unavailable", never a fabricated zero.
//   - Every injected knowledge change links to its EVIDENCE through a genuinely navigable portal
//     route (`evidence_href`), or reports `null` — never a fabricated dead link.
// ---------------------------------------------------------------------------------------------

// A receipt metric carries the same honesty contract as `MetricDto` (exactness + formula + source),
// but is not constrained to the fixed overview `MetricId` set. `value: null` renders "Unavailable".
export interface ReceiptMetricDto {
  label: string;
  value: number | null;
  unit: "usd" | "tokens" | "milliseconds" | "count";
  exactness: MetricExactness;
  formula: string;
  source_path: string;
}

export type ReceiptMeasurementQuality = "exact" | "partial" | "unavailable";

// One transformed request, kept ACCESSIBLE so the exact per-request economics are auditable and never
// dissolved into a single cohort number. `net_input_cost_usd` / `net_input_tokens` are the EXACT
// deltas (`after − before`, positive = more expensive), present ONLY when the request was measured on
// BOTH sides; a one-sided request reports `null`.
export interface RequestMeasurementDto {
  request_id: string;
  provider: string;
  model: string | null;
  mode: "audit" | "assist" | "protect";
  measurement_quality: ReceiptMeasurementQuality;
  net_input_cost_usd: number | null;
  net_input_tokens: number | null;
  transformations: string[];
  created_at: string;
}

// The EXACT request economics of a task. Totals are summed over the both-sided-measured requests
// only; the per-request rows stay accessible for audit.
export interface ExactRequestMeasurementsDto {
  metrics: ReceiptMetricDto[];
  // Requests priced on both sides — the cost total's honest denominator.
  priced_request_count: number;
  // Requests with input tokens measured on both sides — the token total's honest denominator.
  measured_token_request_count: number;
  total_request_count: number;
  requests: RequestMeasurementDto[];
}

// The COHORT outcome trends of a task: output-token and latency distributions and Kage's own
// processing cost. Deliberately SEPARATE from the exact input economics above.
export interface TaskOutcomesDto {
  metrics: ReceiptMetricDto[];
  request_count: number;
}

// A single injected context delivery for the task — one row of the injected-sections timeline. A
// skipped / failed-open delivery is shown as such, never silently counted as a successful attachment.
export interface DeliveryRecordDto {
  delivery_id: string;
  capsule_id: string;
  injection_location: "system" | "user_turn" | "tool_result" | "none";
  status: "delivered" | "skipped" | "failed_open";
  added_bytes: number;
  added_tokens: number | null;
  delivered_at: string;
  reason: string;
}

// A knowledge change linked to the task, with a link to its EVIDENCE. `evidence_href` is a genuinely
// navigable portal route to the entity's detail page (never a fabricated dead link); it is `null`
// when there is no navigable target, and the section then renders the change without a link.
export interface KnowledgeChangeDto {
  id: string;
  title: string;
  change_kind: string;
  entity_kind: EntityKind | null;
  entity_slug: string | null;
  trust_state: TrustState;
  evidence_href: string | null;
}

// A compact, self-contained projection of a Minimal Change Guard finding for the task receipt.
// `changed_behavior` is ALWAYS `null` — whether the recommendation changed what the agent did is
// unknown without a controlled comparison, so it is never a fabricated boolean.
export interface PolicyFindingSummaryDto {
  finding_id: string;
  kind: string;
  title: string;
  severity: string;
  deterministic: boolean;
  changed_behavior: null;
}

export type TaskTimelineKind =
  | "task_started"
  | "capsule_delivered"
  | "request_transformed"
  | "knowledge_changed"
  | "policy_finding"
  | "task_ended";

// A single receipt-timeline event. `at` is the ISO timestamp, or `null` when the underlying record
// carries none (rendered "unavailable", never omitted in a way that implies success).
export interface TaskTimelineEventDto {
  kind: TaskTimelineKind;
  at: string | null;
  detail: string;
}

// The aggregate task receipt: request economics, outcomes, deliveries, knowledge changes, policy
// findings, and a timeline — all keyed by one `task_id`, none of them fused into a single ROI figure.
export interface TaskReceiptDto {
  task: TaskSummaryDto;
  exact_request_measurements: ExactRequestMeasurementsDto;
  task_outcomes: TaskOutcomesDto;
  deliveries: DeliveryRecordDto[];
  knowledge_changes: KnowledgeChangeDto[];
  policy_mode: string | null;
  policy_findings: PolicyFindingSummaryDto[];
  timeline: TaskTimelineEventDto[];
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
// `truncated` mirrors the node's flag (the diagram's "+more" / "has hidden neighbors"): without it a
// windowed-out node's empty relation cell would read as "None" and assert an absence that is false —
// the exact failure the "equivalent accessible table" gate forbids.
export interface SystemMapTableRowDto {
  entity_id: string;
  node: string;
  kind: EntityKind;
  lane: SystemMapLane;
  health: SystemMapNodeHealth;
  href: string | null;
  upstream: string[];
  downstream: string[];
  // True when this node has a neighbor OUTSIDE the current window — identical to the node's flag, so
  // the table carries the same truncation signal the diagram does and never implies a false leaf.
  truncated: boolean;
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
