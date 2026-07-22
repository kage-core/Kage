import type { IntegrationDto } from "../api/types";
import { StatusBadge } from "./StatusBadge";

// Integration health on the overview. Each adapter is shown with its name and a StatusBadge whose
// meaning is carried by text (and a decorative glyph), never color alone. With no integrations we
// say the reality — "No integrations are attached" — rather than rendering an empty row that could
// be misread as healthy silence.

interface IntegrationStripProps {
  integrations: IntegrationDto[];
}

export function IntegrationStrip({ integrations }: IntegrationStripProps): React.ReactElement {
  if (integrations.length === 0) {
    return (
      <p className="integration-empty muted">
        No integrations are attached yet.
      </p>
    );
  }

  return (
    <ul className="integration-strip">
      {integrations.map((integration) => (
        <li key={integration.id} className="integration-item">
          <span className="integration-name">{integration.name}</span>
          <StatusBadge state={integration.state} />
        </li>
      ))}
    </ul>
  );
}
