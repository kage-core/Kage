// Shared test fixtures for the knowledge portal. These build DTOs from the generated `api/types.ts`
// so component tests exercise the exact wire shapes the backend read-model emits.

import type {
  AttentionDto,
  IntegrationDto,
  MetricDto,
  OverviewDto,
  RepositoryDto,
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
