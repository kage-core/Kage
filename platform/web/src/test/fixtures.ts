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
  RelatedEntityDto,
  RepositoryDto,
  RunbookDetailDto,
  SystemMapDto,
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
