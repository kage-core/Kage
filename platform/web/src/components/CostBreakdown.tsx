import { useId, useState } from "react";
import type { MetricExactness, ReceiptMetricDto, TaskReceiptDto } from "../api/types";

// The two economics sections of a task receipt, rendered under SEPARATE headings so exact request
// economics can never be confused with cohort outcome trends. This is the honesty spine of the whole
// receipt: there is deliberately NO combined "total value created" / ROI number anywhere — an
// output-token change is a task OUTCOME, an input-cost delta is a request MEASUREMENT, and the two
// are never fused into a single flattering figure.
//
// Every metric carries its exactness label and a collapsible provenance (formula + source records).
// A metric the backend could not measure renders the literal "Unavailable", never a fabricated $0.00
// or 0% that would imply a real, successful measurement.

// Distinct, human-readable exactness labels. Unavailable is intentionally absent — an unavailable
// metric renders "Unavailable" as its value, so a badge would duplicate that single signal.
const EXACTNESS_LABELS: Record<Exclude<MetricExactness, "unavailable">, string> = {
  exact: "Exact request measurement",
  cohort: "Cohort trend",
  structural: "Structural coverage",
};

function formatValue(metric: ReceiptMetricDto): string {
  if (metric.value === null) return "Unavailable";
  const v = metric.value;
  switch (metric.unit) {
    case "usd":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(4)}`;
    case "tokens":
      return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`;
    case "milliseconds":
      return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;
    case "count":
      return `${v}`;
  }
}

function ReceiptMetricCard({ metric }: { metric: ReceiptMetricDto }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const unavailable = metric.value === null;

  return (
    <article className="metric-card" aria-labelledby={`${detailsId}-label`}>
      <h4 className="metric-label" id={`${detailsId}-label`}>
        {metric.label}
      </h4>
      <p className="metric-value" data-unavailable={unavailable || undefined}>
        {formatValue(metric)}
      </p>
      {!unavailable && (
        <p className="metric-meta">
          <span className="metric-exactness" data-exactness={metric.exactness}>
            {metric.exactness === "unavailable" ? "Unavailable" : EXACTNESS_LABELS[metric.exactness]}
          </span>
        </p>
      )}
      <button
        type="button"
        className="metric-disclosure-toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((prev) => !prev)}
      >
        How this is measured
      </button>
      {open && (
        <div className="metric-disclosure" id={detailsId}>
          <dl>
            <dt>Formula</dt>
            <dd>
              <code>{metric.formula}</code>
            </dd>
          </dl>
          <a className="metric-source-link" href={metric.source_path}>
            View source records
          </a>
        </div>
      )}
    </article>
  );
}

function MetricGrid({ metrics }: { metrics: ReceiptMetricDto[] }): React.ReactElement {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <ReceiptMetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}

// A single request row's exact economics — kept accessible so an operator can audit each request and
// see, per request, whether a net cost/token delta was measured on both sides. A one-sided request
// renders "Unavailable", never `before − 0`.
function RequestTable({ receipt }: { receipt: TaskReceiptDto }): React.ReactElement {
  const rows = receipt.exact_request_measurements.requests;
  if (rows.length === 0) {
    return <p className="muted">No transformed requests were recorded for this task.</p>;
  }
  return (
    <table className="request-table" aria-label="Per-request measurements">
      <thead>
        <tr>
          <th scope="col">Request</th>
          <th scope="col">Mode</th>
          <th scope="col">Measurement</th>
          <th scope="col">Net cost</th>
          <th scope="col">Net tokens</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.request_id}>
            <th scope="row" className="mono">
              {row.request_id}
            </th>
            <td>{row.mode}</td>
            <td>{row.measurement_quality}</td>
            <td>
              {row.net_input_cost_usd === null
                ? "Unavailable"
                : `${row.net_input_cost_usd < 0 ? "−" : ""}$${Math.abs(row.net_input_cost_usd).toFixed(4)}`}
            </td>
            <td>
              {row.net_input_tokens === null
                ? "Unavailable"
                : `${row.net_input_tokens > 0 ? "+" : row.net_input_tokens < 0 ? "−" : ""}${Math.abs(
                    row.net_input_tokens,
                  )}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface CostBreakdownProps {
  receipt: TaskReceiptDto;
}

export function CostBreakdown({ receipt }: CostBreakdownProps): React.ReactElement {
  const exact = receipt.exact_request_measurements;
  const outcomes = receipt.task_outcomes;

  return (
    <div className="cost-breakdown">
      <section aria-label="Exact request measurements">
        <h3>Exact request measurements</h3>
        <p className="muted">
          What Kage's transforms did to the request, measured. Totals cover the{" "}
          {exact.priced_request_count} of {exact.total_request_count} request(s) priced on both sides;
          a one-sided request contributes no cost delta.
        </p>
        <MetricGrid metrics={exact.metrics} />
        <RequestTable receipt={receipt} />
      </section>

      <section aria-label="Task outcomes">
        <h3>Task outcomes</h3>
        <p className="muted">
          Cohort trends across {outcomes.request_count} request(s): output tokens, latency, and Kage's
          own processing cost. These are outcome distributions, never fused with the input economics
          above.
        </p>
        <MetricGrid metrics={outcomes.metrics} />
      </section>
    </div>
  );
}
