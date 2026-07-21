import { useId, useState } from "react";
import type { MetricDto, MetricExactness } from "../api/types";

// A single overview metric, rendered with its honest provenance. The card ALWAYS exposes:
//   - the value, formatted for its unit — or the literal word "Unavailable" when the backend could
//     not measure it (`value: null`). We never fall back to a fabricated `$0.00` / `0%` that would
//     imply a real, successful measurement.
//   - an exactness label (`Exact request measurement` / `Cohort trend` / `Structural coverage`), so
//     the reader knows whether a number is an exact request measurement, a cohort trend, or a
//     structural coverage ratio. An unavailable metric carries no such badge — its value IS the
//     "Unavailable" signal, and a second "Unavailable" badge would be noise.
//   - a collapsible "How this is measured" disclosure revealing the exact formula and a link to the
//     source records that produced it.

interface MetricCardProps {
  metric: MetricDto;
}

// Distinct, human-readable exactness labels. Unavailable is intentionally absent: unavailable
// metrics render "Unavailable" as their value, so a badge would duplicate that single signal.
const EXACTNESS_LABELS: Record<Exclude<MetricExactness, "unavailable">, string> = {
  exact: "Exact request measurement",
  cohort: "Cohort trend",
  structural: "Structural coverage",
};

// A null value has two very different causes and they are never conflated: "Unavailable" means nothing
// measured it; "Withheld" means it WAS measured but is suppressed to protect a cohort too small to
// publish, and the reason is shown next to it.
function isWithheld(metric: MetricDto): boolean {
  return metric.value === null && Boolean(metric.suppression_reason);
}

function formatValue(metric: MetricDto): string {
  if (metric.value === null) return isWithheld(metric) ? "Withheld" : "Unavailable";
  const v = metric.value;
  switch (metric.unit) {
    case "usd":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
    case "percent":
      return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
    case "milliseconds":
      return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;
    case "count":
      return `${v}`;
  }
}

// Trend is a signed delta vs the prior period, expressed in the metric's own unit for percent/count
// and as a magnitude otherwise. Null means we have no comparable prior period — shown as such.
function formatTrend(metric: MetricDto): string | null {
  if (metric.trend === null) return null;
  const t = metric.trend;
  const sign = t > 0 ? "+" : t < 0 ? "−" : "";
  const magnitude = Math.abs(t);
  const rendered =
    metric.unit === "percent" || metric.unit === "count"
      ? `${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(1)}`
      : magnitude.toFixed(2);
  return `${sign}${rendered}`;
}

export function MetricCard({ metric }: MetricCardProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const unavailable = metric.value === null;
  const trend = formatTrend(metric);

  return (
    <article className="metric-card" aria-labelledby={`${detailsId}-label`}>
      <h3 className="metric-label" id={`${detailsId}-label`}>
        {metric.label}
      </h3>

      <p className="metric-value" data-unavailable={unavailable || undefined}>
        {formatValue(metric)}
      </p>

      {isWithheld(metric) && (
        <p className="metric-suppression">
          Withheld for privacy: <code>{metric.suppression_reason}</code>
        </p>
      )}

      <p className="metric-meta">
        {!unavailable && (
          <span className="metric-exactness" data-exactness={metric.exactness}>
            {metric.exactness === "unavailable"
              ? "Unavailable"
              : EXACTNESS_LABELS[metric.exactness]}
          </span>
        )}
        {trend !== null && (
          <span className="metric-trend">
            <span className="visually-hidden">Change since last period: </span>
            {trend}
          </span>
        )}
      </p>

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
