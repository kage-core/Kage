import type { TeamReportDto } from "../api/types";

// T5 — persona views on one panel, one honesty contract.
//
// LEAD view: is shared memory helping? Measured counts (recalls served, stale withheld) rendered
// apart from ESTIMATED token figures (labelled as estimates, exactly like `kage gains`); store
// composition by derivability; dark areas (subsystems with zero approved memory); review health.
//
// IC view: can I trust what lands in my prompts? The live injection-gate section shows the real
// rate + confidence and the most recent decisions — including the "injected nothing" ones, which
// are the point. An unexercised gate says so; it never renders a fabricated 100%-healthy state.

export function TeamValuePanel({ report }: { report: TeamReportDto | null }) {
  if (!report) {
    return (
      <section aria-label="Team value">
        <h2>Team value</h2>
        <p role="status">Report unavailable — the value ledger could not be assembled for this repository.</p>
      </section>
    );
  }
  const gate = report.injection_gate;
  return (
    <section aria-label="Team value">
      <h2>Team value</h2>

      <section aria-label="Measured value">
        <h3>Measured</h3>
        <dl>
          <dt>Recalls served</dt>
          <dd>{report.value.recalls_served}</dd>
          <dt>Stale memory withheld</dt>
          <dd>{report.value.stale_withheld}</dd>
        </dl>
        <p>
          Estimated (labelled, never mixed with measured): read-vs-source {report.value.tokens_saved_estimated} tokens,
          knowledge replay {report.value.replay_tokens_estimated} tokens.
        </p>
      </section>

      <section aria-label="Injection decisions">
        <h3>Injection gate (live)</h3>
        {gate.available ? (
          <>
            <p>
              {gate.injected}/{gate.gates} requests injected (rate {gate.injection_rate}), average confidence{" "}
              {gate.average_confidence}
            </p>
            <ul>
              {gate.recent.map((decision, index) => (
                <li key={`${decision.at}-${index}`}>
                  {decision.injected ? "injected" : "injected nothing"} · confidence {decision.confidence} ·{" "}
                  {decision.at.slice(0, 19)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p role="status">{gate.note}</p>
        )}
      </section>

      <section aria-label="Store composition">
        <h3>Store composition</h3>
        <p>
          {report.composition.total_packets} packets — {Math.round(report.composition.non_derivable_share * 100)}%
          non-derivable (what code cannot say), {Math.round(report.composition.derivable_risk_share * 100)}%
          derivable-risk
        </p>
      </section>

      <section aria-label="Coverage">
        <h3>Coverage</h3>
        {report.coverage.dark_areas.length ? (
          <p>
            Dark areas (no approved memory): <strong>{report.coverage.dark_areas.join(", ")}</strong>
          </p>
        ) : (
          <p>Every top-level area has at least one approved memory citing it.</p>
        )}
      </section>

      <section aria-label="Review health">
        <h3>Review health</h3>
        <p>
          {report.review_health.pending} pending
          {report.review_health.oldest_pending_days !== null
            ? ` (oldest ${report.review_health.oldest_pending_days}d)`
            : ""}
          , {report.review_health.contradictions} contradiction link(s)
        </p>
      </section>
    </section>
  );
}
