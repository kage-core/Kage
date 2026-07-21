// Shared test fixtures for the knowledge portal. These build DTOs from the generated `api/types.ts`
// so component tests exercise the exact wire shapes the backend read-model emits.

import type {
  AttentionDto,
  ClaimDto,
  DecisionDetailDto,
  EntityCardDto,
  EntityDetailDto,
  EntityHealthDto,
  EvidenceDto,
  IntegrationDto,
  MetricDto,
  OverviewDto,
  TeamMetricsPanelDto,
  RelatedEntityDto,
  RepositoryDto,
  ReviewItemDto,
  RunbookDetailDto,
  SystemMapDto,
  TaskReceiptDto,
  TaskSummaryDto,
} from "../api/types";

export function fixtureRepository(overrides: Partial<RepositoryDto> = {}): RepositoryDto {
  return {
    id: "repo-1",
    name: "kage",
    branch: "codex/kage-vnext-implementation",
    commit: "0000000",
    ...overrides,
  };
}

// A single overview metric with an honest, exact default. Component tests override `value` /
// `exactness` to exercise the unavailable-vs-measured rendering split.
export function fixtureMetric(overrides: Partial<MetricDto> = {}): MetricDto {
  return {
    id: "net_context_cost",
    label: "Net context cost",
    value: -1.25,
    unit: "usd",
    exactness: "exact",
    formula:
      "Σ(provider_input_cost_after_usd − provider_input_cost_before_usd) over receipts priced on both sides",
    source_path: "mcp/vnext/gateway/cohort-metrics.ts",
    trend: -0.4,
    ...overrides,
  };
}

export function fixtureAttention(overrides: Partial<AttentionDto> = {}): AttentionDto {
  return {
    id: "att-1",
    kind: "review",
    title: "1 high-impact claim awaiting review",
    severity: "warning",
    href: "/review",
    ...overrides,
  };
}

export function fixtureIntegration(overrides: Partial<IntegrationDto> = {}): IntegrationDto {
  return {
    id: "anthropic",
    name: "Anthropic proxy",
    state: "healthy",
    last_success_at: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

// A fully populated overview so the OverviewPage renders every region (metrics, attention,
// integrations). Metrics deliberately mix exact / structural / unavailable exactness so the page
// test can assert the unavailable one is not rendered as a fabricated zero.
export function fixtureOverview(overrides: Partial<OverviewDto> = {}): OverviewDto {
  return {
    repository: fixtureRepository(),
    metrics: [
      fixtureMetric({ id: "net_context_cost", label: "Net context cost" }),
      fixtureMetric({
        id: "verified_reuse",
        label: "Verified reuse",
        value: 62.5,
        unit: "percent",
        exactness: "structural",
        trend: 4,
      }),
      fixtureMetric({
        id: "time_to_verified_change",
        label: "Time to verified change",
        value: null,
        unit: "milliseconds",
        exactness: "unavailable",
        trend: null,
      }),
      fixtureMetric({
        id: "understanding_coverage",
        label: "Understanding coverage",
        value: 48,
        unit: "percent",
        exactness: "structural",
        trend: null,
      }),
      fixtureMetric({
        id: "attach_reliability",
        label: "Attach reliability",
        value: null,
        unit: "percent",
        exactness: "unavailable",
        trend: null,
      }),
      fixtureMetric({
        id: "open_contradictions",
        label: "Open contradictions",
        value: 2,
        unit: "count",
        exactness: "structural",
        trend: null,
      }),
      fixtureMetric({
        id: "stale_critical",
        label: "Stale critical claims",
        value: 1,
        unit: "count",
        exactness: "structural",
        trend: null,
      }),
      fixtureMetric({
        id: "runbook_health",
        label: "Runbook health",
        value: 80,
        unit: "percent",
        exactness: "structural",
        trend: null,
      }),
    ],
    attention: [fixtureAttention()],
    integrations: [fixtureIntegration()],
    // Default to NO workspace: the local-only install is the common case, and the page must say
    // "no workspace connected" rather than render an empty team as if it had zero activity.
    team: null,
    ...overrides,
  };
}

// A team panel at (not below) the privacy cohort floor: the trends are published, the exact dollar
// figure is measured, and one card is unavailable so the page test can assert an unmeasured team
// metric still renders honestly.
export function fixtureTeamPanel(
  overrides: Partial<TeamMetricsPanelDto> = {},
): TeamMetricsPanelDto {
  return {
    window_start: "2026-07-01T00:00:00.000Z",
    window_end: "2026-07-14T00:00:00.000Z",
    tasks: 12,
    repositories: 3,
    agents: 2,
    metrics: [
      fixtureMetric({
        id: "team_exact_context_cost",
        label: "Team net context cost",
        value: -3.4,
        unit: "usd",
        exactness: "exact",
        trend: null,
        suppression_reason: null,
      }),
      fixtureMetric({
        id: "team_time_to_verified_change",
        label: "Time to verified change",
        value: 120000,
        unit: "milliseconds",
        exactness: "cohort",
        trend: null,
        suppression_reason: null,
      }),
    ],
    suppression_reason: null,
    caveats: [
      "exact request economics (usd) and cohort outcome trends (milliseconds) are reported separately and are never multiplied into a single savings number",
    ],
    ...overrides,
  };
}

// A small but structurally complete system map: a feature that depends on a component that persists
// to a data model, with the data model's owner hidden beyond the two-hop window (so `truncated` is
// true). It exercises every rendering path — a linked node, a health-labeled node, an unlinked
// (null-href) node, upstream/downstream relations, and the truncation affordance.
export function fixtureSystemMap(overrides: Partial<SystemMapDto> = {}): SystemMapDto {
  return {
    view: "feature",
    focus_entity_id: null,
    max_hops: 2,
    lanes: [
      {
        lane: "feature",
        label: "Features",
        nodes: [
          {
            entity_id: "feature-auth",
            kind: "feature",
            slug: "authentication",
            canonical_name: "Authentication",
            lane: "feature",
            x: 40,
            y: 40,
            health: "stale",
            href: "/features/authentication",
            hops: 0,
            truncated: false,
          },
        ],
      },
      { lane: "flow", label: "Flows", nodes: [] },
      {
        lane: "component",
        label: "Components",
        nodes: [
          {
            entity_id: "component-token",
            kind: "component",
            slug: "token-store",
            canonical_name: "Token store",
            lane: "component",
            x: 520,
            y: 40,
            health: "verified",
            href: "/components/token-store",
            hops: 1,
            truncated: false,
          },
        ],
      },
      { lane: "contract", label: "Contracts", nodes: [] },
      {
        lane: "data_model",
        label: "Data models",
        nodes: [
          {
            entity_id: "data-session",
            kind: "data_model",
            slug: "session-record",
            canonical_name: "Session record",
            lane: "data_model",
            x: 1000,
            y: 40,
            health: "disputed",
            href: null,
            hops: 2,
            truncated: true,
          },
        ],
      },
      { lane: "owner", label: "Owners", nodes: [] },
    ],
    edges: [
      { from_entity_id: "feature-auth", to_entity_id: "component-token", relation_type: "depends_on" },
      { from_entity_id: "component-token", to_entity_id: "data-session", relation_type: "persists_to" },
    ],
    table: [
      {
        entity_id: "feature-auth",
        node: "Authentication",
        kind: "feature",
        lane: "feature",
        health: "stale",
        href: "/features/authentication",
        upstream: [],
        downstream: ["Token store"],
        truncated: false,
      },
      {
        entity_id: "data-session",
        node: "Session record",
        kind: "data_model",
        lane: "data_model",
        health: "disputed",
        href: null,
        upstream: ["Token store"],
        downstream: [],
        truncated: true,
      },
      {
        entity_id: "component-token",
        node: "Token store",
        kind: "component",
        lane: "component",
        health: "verified",
        href: "/components/token-store",
        upstream: ["Authentication"],
        downstream: ["Session record"],
        truncated: false,
      },
    ],
    truncated: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------------------------
// Knowledge detail fixtures — feature / component / flow / runbook / decision pages.
//
// These build the exact EntityDetailDto shape the backend read model emits, keeping the
// CURRENT-TRUTH vs HISTORY split honest: `current_claims` holds only injectable (verified/approved)
// claims; `other_claims` holds proposed/stale/disputed/superseded claims that must be SHOWN but
// LABELLED, never merged into current truth; `health` counts span the full claim set.
// ---------------------------------------------------------------------------------------------

export function fixtureEvidence(overrides: Partial<EvidenceDto> = {}): EvidenceDto {
  return {
    evidence_id: "ev-1",
    source_type: "code",
    source_uri: "mcp/vnext/runtime/server.ts",
    path: "mcp/vnext/runtime/server.ts",
    symbol: "isAuthorized",
    line_start: 178,
    line_end: 196,
    commit: "0000000",
    verification_state: "verified",
    stance: "supports",
    ...overrides,
  };
}

export function fixtureClaim(overrides: Partial<ClaimDto> = {}): ClaimDto {
  return {
    claim_id: "claim-1",
    claim_kind: "behavior",
    content: "Every /v2 request is authenticated with a timing-safe bearer token compare.",
    trust_state: "verified",
    impact_class: "high",
    confidence: 0.9,
    review_policy: "manual",
    supersedes_claim_id: null,
    created_by: "agent:opus",
    created_at: "2026-07-10T10:00:00.000Z",
    updated_at: "2026-07-12T10:00:00.000Z",
    evidence: [fixtureEvidence()],
    ...overrides,
  };
}

export function fixtureEntityCard(overrides: Partial<EntityCardDto> = {}): EntityCardDto {
  return {
    entity_id: "feature-auth",
    kind: "feature",
    slug: "authentication",
    canonical_name: "Authentication",
    summary: "Verifies operator identity before any privileged action.",
    status: "active",
    verified_claims: 2,
    stale_claims: 1,
    disputed_claims: 0,
    ...overrides,
  };
}

export function fixtureHealth(overrides: Partial<EntityHealthDto> = {}): EntityHealthDto {
  return {
    verified: 2,
    stale: 1,
    disputed: 0,
    missing_required_fields: ["tests"],
    ...overrides,
  };
}

export function fixtureRelated(overrides: Partial<RelatedEntityDto> = {}): RelatedEntityDto {
  return {
    entity_id: "flow-login",
    kind: "flow",
    slug: "login",
    canonical_name: "Login flow",
    relation_type: "realized_by",
    evidence_id: "ev-rel-1",
    ...overrides,
  };
}

// A fully populated feature detail: current truth (a verified invariant + a verified verification
// claim), history/uncertainty (one STALE claim that must never leak into current truth), and related
// flows / runbooks / owner. `health.stale === 1` mirrors the stale claim in `other_claims`.
export function fixtureFeature(overrides: Partial<EntityDetailDto> = {}): EntityDetailDto {
  return {
    entity: fixtureEntityCard(),
    current_claims: [
      fixtureClaim({
        claim_id: "claim-invariant",
        claim_kind: "invariant",
        content: "A request without a valid bearer token is rejected with 401 before any handler runs.",
        trust_state: "verified",
      }),
      fixtureClaim({
        claim_id: "claim-verification",
        claim_kind: "verification",
        content: "Covered by server.test.ts: rejects missing and malformed Authorization headers.",
        trust_state: "approved",
        impact_class: "medium",
      }),
    ],
    other_claims: [
      fixtureClaim({
        claim_id: "claim-stale",
        claim_kind: "behavior",
        content: "Bearer tokens are cached in-process for 24 hours.",
        trust_state: "stale",
        impact_class: "high",
      }),
    ],
    related: [
      fixtureRelated(),
      fixtureRelated({
        entity_id: "runbook-rotate",
        kind: "runbook",
        slug: "rotate-token",
        canonical_name: "Rotate machine token",
        relation_type: "operated_by",
      }),
      fixtureRelated({
        entity_id: "owner-platform",
        kind: "owner",
        slug: "platform-team",
        canonical_name: "Platform team",
        relation_type: "owned_by",
      }),
    ],
    health: fixtureHealth(),
    ...overrides,
  };
}

// A review item awaiting decision. Defaults to a HIGH-impact, owner-policy claim proposed by
// `agent:opus` that contradicts a recorded current claim — so the review UX has current knowledge,
// a proposed change, evidence, and the material for the self-approval guard. Override `proposer`
// (or the current actor) to exercise the blocked-vs-allowed accept action.
export function fixtureReviewItem(overrides: Partial<ReviewItemDto> = {}): ReviewItemDto {
  return {
    review_item_id: "ri-passkey",
    claim_id: "claim-passkey",
    entity_slug: "authentication",
    entity_kind: "feature",
    claim_content: "Authentication supports hardware passkeys as a first-class factor.",
    claim_impact: "high",
    claim_review_policy: "owner",
    current_claim_id: "claim-second-factors",
    current_claim_content: "Authentication supports TOTP and SMS second factors only.",
    evidence: [fixtureEvidence({ evidence_id: "ev-passkey", symbol: "verifyPasskey", stance: "supports" })],
    reason: "high-impact behavior change requires owner approval",
    required_role: "owner",
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: "2026-07-18T12:00:00.000Z",
    proposer: "agent:opus",
    version: "v-passkey-1",
    ...overrides,
  };
}

export function fixtureRunbook(overrides: Partial<RunbookDetailDto> = {}): RunbookDetailDto {
  const entity = fixtureEntityCard({
    entity_id: "runbook-rotate",
    kind: "runbook",
    slug: "rotate-token",
    canonical_name: "Rotate machine token",
    summary: "Rotates the daemon machine token without dropping in-flight requests.",
  });
  return {
    entity,
    runbook: entity,
    last_successful_execution: null,
    current_claims: [
      fixtureClaim({
        claim_id: "claim-step",
        claim_kind: "procedure",
        content: "Stop the daemon, regenerate the token file, then restart on loopback only.",
        trust_state: "verified",
        impact_class: "critical",
      }),
    ],
    other_claims: [],
    related: [
      fixtureRelated({
        entity_id: "feature-auth",
        kind: "feature",
        slug: "authentication",
        canonical_name: "Authentication",
        relation_type: "operates",
      }),
    ],
    health: fixtureHealth({ verified: 1, stale: 0, disputed: 0, missing_required_fields: [] }),
    ...overrides,
  };
}

export function fixtureDecision(overrides: Partial<DecisionDetailDto> = {}): DecisionDetailDto {
  const entity = fixtureEntityCard({
    entity_id: "decision-etag",
    kind: "decision",
    slug: "etag-optimistic-concurrency",
    canonical_name: "Use ETag optimistic concurrency for review mutations",
    summary: "Review mutations use a state-hash ETag instead of a new schema version column.",
  });
  return {
    entity,
    decision: entity,
    approved_by: "human:kushal",
    supersedes_claim_ids: ["claim-old-migration"],
    current_claims: [
      fixtureClaim({
        claim_id: "claim-decision",
        claim_kind: "decision",
        content: "review_items carry no version column; the 409 story uses a state-hash ETag.",
        trust_state: "approved",
        impact_class: "high",
        supersedes_claim_id: "claim-old-migration",
      }),
    ],
    other_claims: [
      fixtureClaim({
        claim_id: "claim-old-migration",
        claim_kind: "decision",
        content: "Add migration 006 with an INTEGER version column on review_items.",
        trust_state: "superseded",
        impact_class: "high",
      }),
    ],
    related: [
      fixtureRelated({
        entity_id: "feature-review",
        kind: "feature",
        slug: "review-queue",
        canonical_name: "Review queue",
        relation_type: "affects",
      }),
    ],
    health: fixtureHealth({ verified: 1, stale: 0, disputed: 0, missing_required_fields: [] }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------------------------
// Task + cost receipts — EXACT request economics kept strictly separate from COHORT outcomes.
//
// The fixture deliberately mixes exact / cohort / unavailable metrics and includes a knowledge
// change with a navigable evidence link, so the TaskReceiptPage tests can assert: the two economics
// sections are rendered under separate headings, no fused "total value created" is printed, an
// unmeasured metric renders "Unavailable", and every injected knowledge change links to evidence.
// ---------------------------------------------------------------------------------------------

export function fixtureTaskSummary(overrides: Partial<TaskSummaryDto> = {}): TaskSummaryDto {
  return {
    task_id: "task-1",
    session_id: "session-1",
    repository_id: "repo-1",
    agent_surface: "proxy",
    started_at: "2026-07-18T12:00:00.000Z",
    ended_at: "2026-07-18T12:05:00.000Z",
    outcome: "completed",
    receipt_count: 2,
    ...overrides,
  };
}

export function fixtureTaskReceipt(overrides: Partial<TaskReceiptDto> = {}): TaskReceiptDto {
  return {
    task: fixtureTaskSummary(),
    exact_request_measurements: {
      metrics: [
        {
          label: "Net input cost",
          value: -0.0004,
          unit: "usd",
          exactness: "exact",
          formula:
            "Σ(provider_input_cost_after_usd − provider_input_cost_before_usd) over requests priced on both sides",
          source_path: "mcp/vnext/gateway/cohort-metrics.ts",
        },
        {
          label: "Net input tokens",
          value: -200,
          unit: "tokens",
          exactness: "exact",
          formula: "Σ(after_input_tokens − before_input_tokens) over requests measured on both sides",
          source_path: "mcp/vnext/measurement/receipt.ts",
        },
      ],
      priced_request_count: 1,
      measured_token_request_count: 1,
      total_request_count: 2,
      requests: [
        {
          request_id: "req-both",
          provider: "anthropic",
          model: "claude-sonnet",
          mode: "assist",
          measurement_quality: "exact",
          net_input_cost_usd: -0.0004,
          net_input_tokens: -200,
          transformations: ["payload_compress"],
          created_at: "2026-07-18T12:00:01.000Z",
        },
        {
          request_id: "req-one",
          provider: "anthropic",
          model: "claude-sonnet",
          mode: "audit",
          measurement_quality: "partial",
          net_input_cost_usd: null,
          net_input_tokens: null,
          transformations: [],
          created_at: "2026-07-18T12:00:02.000Z",
        },
      ],
    },
    task_outcomes: {
      request_count: 2,
      metrics: [
        {
          label: "Output tokens (p50)",
          value: 100,
          unit: "tokens",
          exactness: "cohort",
          formula: "p50(output_tokens) over receipts that measured output tokens",
          source_path: "mcp/vnext/gateway/cohort-metrics.ts",
        },
        {
          label: "Local latency (p95)",
          value: 5,
          unit: "milliseconds",
          exactness: "cohort",
          formula: "p95(latency_ms) over all receipts",
          source_path: "mcp/vnext/gateway/cohort-metrics.ts",
        },
        {
          label: "Kage processing cost",
          value: null,
          unit: "usd",
          exactness: "unavailable",
          formula: "Σ(kage_processing_cost_usd) over receipts that measured it",
          source_path: "mcp/vnext/gateway/cohort-metrics.ts",
        },
      ],
    },
    deliveries: [
      {
        delivery_id: "d-1",
        capsule_id: "cap-1",
        injection_location: "system",
        status: "delivered",
        added_bytes: 1_200,
        added_tokens: 300,
        delivered_at: "2026-07-18T12:00:00.500Z",
        reason: "attached",
      },
    ],
    knowledge_changes: [
      {
        id: "kc-1",
        title: "Authentication now supports passkeys",
        change_kind: "claim_proposed",
        entity_kind: "feature",
        entity_slug: "authentication",
        trust_state: "proposed",
        evidence_href: "/features/authentication",
      },
    ],
    policy_mode: "advisory",
    policy_findings: [
      {
        finding_id: "f-1",
        kind: "new_dependency",
        title: "New dependency added: left-pad",
        severity: "warning",
        deterministic: true,
        changed_behavior: null,
      },
    ],
    timeline: [
      { kind: "task_started", at: "2026-07-18T12:00:00.000Z", detail: "Task started on proxy" },
      {
        kind: "capsule_delivered",
        at: "2026-07-18T12:00:00.500Z",
        detail: "Context delivered to system (1200 bytes)",
      },
      {
        kind: "request_transformed",
        at: "2026-07-18T12:00:01.000Z",
        detail: "Request req-both handled in assist mode (payload_compress)",
      },
      { kind: "task_ended", at: "2026-07-18T12:05:00.000Z", detail: "Task ended: completed" },
    ],
    ...overrides,
  };
}
