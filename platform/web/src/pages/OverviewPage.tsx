import type { MetricDto, MetricId, OverviewDto } from "../api/types";
import { AttentionQueue } from "../components/AttentionQueue";
import { IntegrationStrip } from "../components/IntegrationStrip";
import { MetricCard } from "../components/MetricCard";

// The repository value overview. Top to bottom:
//   1. Repository / branch / commit identity, so the reader knows exactly what they are looking at.
//   2. Four PRIMARY metrics — net context cost, verified reuse, time to verified change,
//      understanding coverage — each carrying its own exactness label and provenance.
//   3. Four SECONDARY metrics — attach reliability, open contradictions, stale critical claims,
//      runbook health.
//   4. The attention queue (what needs a human) and integration health.
//
// Honesty invariants (enforced by MetricCard + the page tests): an unmeasured metric renders
// "Unavailable", never a fabricated `$0.00`; exact dollar economics and cohort time outcomes are
// shown as separate cards with their own exactness labels and are NEVER fused into one ROI number.

interface OverviewPageProps {
  overview: OverviewDto;
}

// The four headline metrics, in fixed display order. Everything else is a secondary metric.
const PRIMARY_ORDER: MetricId[] = [
  "net_context_cost",
  "verified_reuse",
  "time_to_verified_change",
  "understanding_coverage",
];

const SECONDARY_ORDER: MetricId[] = [
  "attach_reliability",
  "open_contradictions",
  "stale_critical",
  "runbook_health",
];

// Partition the backend metrics into (primary, secondary) using the fixed orders above, preserving
// that order. Any metric the backend adds that is not in either list falls through to the secondary
// group rather than being silently dropped.
function partition(metrics: MetricDto[]): { primary: MetricDto[]; secondary: MetricDto[] } {
  const byId = new Map(metrics.map((m) => [m.id, m]));
  const primary = PRIMARY_ORDER.map((id) => byId.get(id)).filter(
    (m): m is MetricDto => m !== undefined,
  );
  const secondaryFromOrder = SECONDARY_ORDER.map((id) => byId.get(id)).filter(
    (m): m is MetricDto => m !== undefined,
  );
  const known = new Set<MetricId>([...PRIMARY_ORDER, ...SECONDARY_ORDER]);
  const extras = metrics.filter((m) => !known.has(m.id));
  return { primary, secondary: [...secondaryFromOrder, ...extras] };
}

function MetricGrid({ metrics }: { metrics: MetricDto[] }): React.ReactElement {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

export function OverviewPage({ overview }: OverviewPageProps): React.ReactElement {
  const { repository, metrics, attention, integrations } = overview;
  const { primary, secondary } = partition(metrics);

  return (
    <div className="overview-page">
      <section className="repo-identity" aria-label="Repository identity">
        <h1>{repository.name}</h1>
        <dl className="repo-identity-meta">
          <div>
            <dt>Branch</dt>
            <dd className="mono">{repository.branch ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Commit</dt>
            <dd className="mono">{repository.commit ?? "unknown"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Value metrics">
        <h2>Repository value</h2>
        {primary.length > 0 ? (
          <MetricGrid metrics={primary} />
        ) : (
          <p className="muted">
            No metrics have been measured yet. They appear once the daemon records its first receipts.
          </p>
        )}
        {secondary.length > 0 && (
          <>
            <h3 className="metric-subheading">Reliability and hygiene</h3>
            <MetricGrid metrics={secondary} />
          </>
        )}
      </section>

      <section aria-label="Needs attention">
        <h2>Needs attention</h2>
        <AttentionQueue items={attention} />
      </section>

      <section aria-label="Integrations">
        <h2>Integrations</h2>
        <IntegrationStrip integrations={integrations} />
      </section>
    </div>
  );
}
