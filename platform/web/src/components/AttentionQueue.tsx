import type { AttentionDto } from "../api/types";
import { withBase } from "../router";

// The "what needs a human" list on the overview. Each item carries a severity (info / warning /
// critical, exposed as text, not color alone) and a link to the place the operator acts on it. An
// empty queue says so explicitly — an absent list would read as "nothing loaded," not "all clear."

interface AttentionQueueProps {
  items: AttentionDto[];
}

const SEVERITY_LABELS: Record<AttentionDto["severity"], string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export function AttentionQueue({ items }: AttentionQueueProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <p className="attention-empty muted">
        Nothing needs attention right now.
      </p>
    );
  }

  return (
    <ul className="attention-list">
      {items.map((item) => (
        <li key={item.id} className="attention-item" data-severity={item.severity}>
          <span className="attention-severity" data-severity={item.severity}>
            {SEVERITY_LABELS[item.severity]}
          </span>
          <a href={withBase(item.href)}>{item.title}</a>
        </li>
      ))}
    </ul>
  );
}
