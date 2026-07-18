import type { IntegrationDto } from "../api/types";

// Integration attachment state, rendered so meaning is carried by TEXT (and a decorative icon),
// never by color alone — an accessibility requirement of the honesty gates. The color tints in
// global.css are redundant reinforcement, not the sole signal.

export type IntegrationState = IntegrationDto["state"];

interface StatusBadgeProps {
  state: IntegrationState;
}

const LABELS: Record<IntegrationState, string> = {
  healthy: "Healthy and attaching",
  degraded: "Degraded but attaching",
  passthrough: "Passing through, not attaching",
  disconnected: "Disconnected",
};

// Distinct glyph shapes so sighted users who cannot distinguish the color tints still get a
// non-color cue. Marked aria-hidden — the adjacent text is the accessible name.
const ICONS: Record<IntegrationState, string> = {
  healthy: "●",
  degraded: "◐",
  passthrough: "○",
  disconnected: "✕",
};

export function StatusBadge({ state }: StatusBadgeProps): React.ReactElement {
  return (
    <span className="status-badge" data-state={state}>
      <span className="status-icon" aria-hidden="true">
        {ICONS[state]}
      </span>
      <span>{LABELS[state]}</span>
    </span>
  );
}
