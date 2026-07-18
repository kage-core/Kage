import type { EntityHealthDto } from "../api/types";

// The knowledge-health summary for a detail page. It reports the entity's claim hygiene over the
// FULL claim set — verified, stale, and disputed counts — so a reader sees exactly how much of the
// current truth is contested, WITHOUT letting stale/disputed claims leak into the primary body.
// Missing required fields (e.g. a feature with no linked tests or owner) are named explicitly rather
// than implied by omission: silence here would read as "complete", the opposite of the truth.

interface KnowledgeHealthProps {
  health: EntityHealthDto;
}

interface Figure {
  label: string;
  value: number;
  tone: "verified" | "stale" | "disputed";
}

export function KnowledgeHealth({ health }: KnowledgeHealthProps): React.ReactElement {
  const figures: Figure[] = [
    { label: "Verified", value: health.verified, tone: "verified" },
    { label: "Stale", value: health.stale, tone: "stale" },
    { label: "Disputed", value: health.disputed, tone: "disputed" },
  ];

  return (
    <div className="knowledge-health">
      <dl className="knowledge-health-figures">
        {figures.map((f) => (
          <div key={f.label} className="knowledge-health-figure" data-tone={f.tone}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      {health.missing_required_fields.length > 0 ? (
        <p className="knowledge-health-missing">
          Missing required: {health.missing_required_fields.join(", ")}
        </p>
      ) : (
        <p className="knowledge-health-missing muted">No required fields missing</p>
      )}
    </div>
  );
}
