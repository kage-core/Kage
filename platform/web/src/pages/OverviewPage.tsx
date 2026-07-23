import type { MetricDto, MetricId, OverviewDto, TeamMetricsPanelDto, TeamReportDto } from "../api/types";
import { AttentionQueue } from "../components/AttentionQueue";
import { IntegrationStrip } from "../components/IntegrationStrip";
import { MetricCard } from "../components/MetricCard";

// The repository value overview. It LEADS with the value Kage has actually measured for this repo —
// recalls served, stale claims caught, knowledge captured — because that is the honest, provable
// story and it is the reason a lead keeps the tool. The provider-cost metrics (net context cost,
// verified reuse) come AFTER, and an unmeasured one shows the concrete step that unlocks it rather
// than a dead "Unavailable". Nothing here is fabricated: measured numbers are measured, estimates are
// labelled, and an absent measurement says how to produce it.

interface OverviewPageProps {
  overview: OverviewDto;
  // The value ledger for this repo, or null when it could not be assembled. Supplied by the caller so
  // the page stays a pure render. Optional (defaults null) so the page still renders its overview
  // sections when the ledger is absent.
  report?: TeamReportDto | null;
}

// The workspace team panel — aggregated cross-repo metrics, present ONLY when a workspace is connected.
// A local install has none, and an absent team is stated plainly, never drawn as a team that did
// nothing. Distinct from the value ledger (report), which is this repo's own measured value.
function TeamPanel({ team }: { team: TeamMetricsPanelDto | null }): React.ReactElement {
  if (!team) {
    return (
      <p className="muted">
        No workspace connected. Link a workspace to see team-wide metrics across every repository.
      </p>
    );
  }
  return (
    <>
      <p className="team-scope">
        {team.tasks} tasks across {team.repositories} repositories and {team.agents} agents
        {team.window_start && team.window_end
          ? `, ${team.window_start.slice(0, 10)} to ${team.window_end.slice(0, 10)}`
          : ""}
        .
      </p>
      {team.suppression_reason && (
        <p className="team-suppression">
          Cohort trends are withheld for this window: <code>{team.suppression_reason}</code>
        </p>
      )}
      <div className="metric-grid">
        {team.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      {team.caveats.length > 0 && (
        <ul className="team-caveats">
          {team.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `${value}`;
}

// One big stat in the value hero. `tone` colours the number; `note` is the one-line provenance so the
// tile never floats a number without saying what it is.
function StatTile({
  label,
  value,
  note,
  tone = "accent",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "accent" | "plain";
}): React.ReactElement {
  return (
    <div className="stat-tile" data-tone={tone}>
      <p className="stat-tile-value">{value}</p>
      <p className="stat-tile-label">{label}</p>
      <p className="stat-tile-note">{note}</p>
    </div>
  );
}

// The headline: what Kage has measurably done for this repository. Built only from real ledger data;
// estimates are shown separately and explicitly labelled.
function ValueHero({ report }: { report: TeamReportDto }): React.ReactElement {
  const { value, composition } = report;
  const tokensSaved = value.tokens_saved_estimated + value.replay_tokens_estimated;
  return (
    <section className="value-hero" aria-label="Measured value">
      <p className="value-hero-lede">
        Kage served <strong>{value.recalls_served.toLocaleString()}</strong> recalls and withheld{" "}
        <strong>{value.stale_withheld.toLocaleString()}</strong> stale claims across{" "}
        <strong>{composition.total_packets.toLocaleString()}</strong> captured memories.
      </p>
      <div className="stat-tiles">
        <StatTile
          label="Recalls served"
          value={compactNumber(value.recalls_served)}
          note="Measured — memory the agents reused instead of rediscovering"
        />
        <StatTile
          label="Stale claims caught"
          value={compactNumber(value.stale_withheld)}
          note="Measured — memory withheld because its cited code moved"
        />
        <StatTile
          label="Knowledge captured"
          value={compactNumber(composition.total_packets)}
          note={`${Math.round(composition.non_derivable_share * 100)}% is what code cannot say`}
        />
        <StatTile
          label="Tokens saved"
          value={`~${compactNumber(tokensSaved)}`}
          note="Estimated — read-vs-source + knowledge replay, never counted as measured"
          tone="plain"
        />
      </div>
    </section>
  );
}

// The concrete step that turns an Unavailable provider-cost metric into a real number. Honest, not a
// sales line: each names the input the metric needs. Only used when a metric is genuinely unmeasured.
const UNLOCK_HINTS: Partial<Record<MetricId, string>> = {
  net_context_cost: "Run `kage up --mode assist` — cost is measured per request once memory is injected.",
  verified_reuse: "Approve claims in the Review Queue — reuse counts only verified memory.",
  time_to_verified_change: "Lands once the first change is verified against its cited code.",
  understanding_coverage: "Grows as features gain owner and test-surface relations.",
  attach_reliability: "Measured from attach telemetry once sessions run through the proxy.",
  runbook_health: "Rises as runbook claims are verified in review.",
};

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

function ordered(metrics: MetricDto[], order: MetricId[]): MetricDto[] {
  const byId = new Map(metrics.map((m) => [m.id, m]));
  return order.map((id) => byId.get(id)).filter((m): m is MetricDto => m !== undefined);
}

function MetricGrid({ metrics }: { metrics: MetricDto[] }): React.ReactElement {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} unlockHint={UNLOCK_HINTS[metric.id]} />
      ))}
    </div>
  );
}

// The live injection gate + what's been most useful. Kept from the ledger; the headline counts moved
// into the hero, so this is the depth beneath it.
function LedgerDetail({ report }: { report: TeamReportDto }): React.ReactElement {
  const gate = report.injection_gate;
  return (
    <div className="ledger-detail">
      <div className="card">
        <h3>Injection gate (live)</h3>
        {gate.available ? (
          <p>
            <strong>
              {gate.injected}/{gate.gates}
            </strong>{" "}
            requests injected (rate {gate.injection_rate}), average confidence {gate.average_confidence}.
          </p>
        ) : (
          <p className="muted">{gate.note}</p>
        )}
      </div>
      {report.top_memories.length > 0 && (
        <div className="card">
          <h3>Most-used memory (30d)</h3>
          <ul className="top-memories">
            {report.top_memories.slice(0, 5).map((m, i) => (
              <li key={`${m.title}-${i}`}>
                <span className="tm-uses">{m.uses_30d}×</span>
                <span className="tm-type">{m.type}</span>
                <span className="tm-title">{m.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h3>Review &amp; coverage</h3>
        <p>
          {report.review_health.pending} pending review
          {report.review_health.oldest_pending_days !== null
            ? ` (oldest ${report.review_health.oldest_pending_days}d)`
            : ""}
          , {report.review_health.contradictions} contradiction link(s).
        </p>
        {report.coverage.dark_areas.length > 0 && (
          <p className="muted">No approved memory yet in: {report.coverage.dark_areas.join(", ")}.</p>
        )}
      </div>
    </div>
  );
}

export function OverviewPage({ overview, report = null }: OverviewPageProps): React.ReactElement {
  const { repository, metrics, attention, integrations, team } = overview;
  const primary = ordered(metrics, PRIMARY_ORDER);
  const secondary = ordered(metrics, SECONDARY_ORDER);

  return (
    <div className="overview-page">
      <section className="ov-head" aria-label="Repository identity">
        <div>
          <h1>{repository.name}</h1>
          <p className="ov-sub">Repository knowledge</p>
        </div>
        <div className="ov-chips">
          <span className="ov-chip">
            branch <b>{repository.branch ?? "—"}</b>
          </span>
          <span className="ov-chip">
            commit <b>{repository.commit ? repository.commit.slice(0, 10) : "—"}</b>
          </span>
        </div>
      </section>

      {report ? (
        <ValueHero report={report} />
      ) : (
        <p className="muted">The value ledger could not be assembled for this repository.</p>
      )}

      {(primary.length > 0 || secondary.length > 0) && (
        <section aria-label="Provider-cost metrics">
          <h2>Cost &amp; trust</h2>
          <p className="section-lede muted">
            Measured against your provider traffic. An unmeasured metric shows what unlocks it.
          </p>
          {primary.length > 0 && <MetricGrid metrics={primary} />}
          {secondary.length > 0 && (
            <>
              <h3 className="metric-subheading">Reliability and hygiene</h3>
              <MetricGrid metrics={secondary} />
            </>
          )}
        </section>
      )}

      {report && (
        <section aria-label="Ledger detail">
          <h2>What's being used</h2>
          <LedgerDetail report={report} />
        </section>
      )}

      <section aria-label="Team">
        <h2>Team</h2>
        <TeamPanel team={team} />
      </section>

      {attention.length > 0 && (
        <section aria-label="Needs attention">
          <h2>Needs attention</h2>
          <AttentionQueue items={attention} />
        </section>
      )}

      {integrations.length > 0 && (
        <section aria-label="Integrations">
          <h2>Integrations</h2>
          <IntegrationStrip integrations={integrations} />
        </section>
      )}
    </div>
  );
}
