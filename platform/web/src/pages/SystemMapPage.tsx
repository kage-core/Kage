import { useState } from "react";
import type { SystemMapDto, SystemMapView } from "../api/types";
import { SystemMapSvg } from "../components/SystemMapSvg";
import { SystemMapTable } from "../components/SystemMapTable";
import { InspectorPanel } from "../components/InspectorPanel";

// The system map page. It presents a task-oriented 2D diagram AND an equivalent accessible table
// side by side (a11y parity is a gate condition — the table is never an afterthought). Five views
// re-root the two-hop window on the subgraph relevant to a task: feature structure, runtime wiring,
// sequence, ownership, and change impact. The page is presentational — a container fetches the map
// for the current view and passes navigation callbacks — so it is trivially testable in isolation.

interface SystemMapPageProps {
  model: SystemMapDto;
  onSelectView?: (view: SystemMapView) => void;
  onFocus?: (entityId: string) => void;
  onClearFocus?: () => void;
}

// View selector labels, in a fixed order. The value is the backend view enum.
const VIEW_OPTIONS: Array<{ value: SystemMapView; label: string }> = [
  { value: "feature", label: "Feature" },
  { value: "runtime", label: "Runtime" },
  { value: "sequence", label: "Sequence" },
  { value: "ownership", label: "Ownership" },
  { value: "impact", label: "Impact" },
];

export function SystemMapPage({
  model,
  onSelectView,
  onFocus,
  onClearFocus,
}: SystemMapPageProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNode = model.lanes.flatMap((l) => l.nodes).find((n) => n.entity_id === selectedId) ?? null;
  const selectedRow = model.table.find((r) => r.entity_id === selectedId) ?? null;

  return (
    <section className="system-map-page" aria-label="System map">
      <header className="system-map-header">
        <h1>System map</h1>
        <div className="system-map-views" role="group" aria-label="Map view">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={model.view === option.value}
              onClick={() => onSelectView?.(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {model.truncated && (
        <p className="system-map-notice" role="note">
          Showing two hops from this view&apos;s starting points. Select a node and expand it to reveal
          neighbors beyond the current window.
        </p>
      )}

      {model.focus_entity_id && (
        <p className="system-map-focus">
          Focused on one node.{" "}
          <button type="button" className="link-button" onClick={() => onClearFocus?.()}>
            Show the whole view
          </button>
        </p>
      )}

      <div className="system-map-body">
        <SystemMapSvg model={model} selectedId={selectedId} onSelect={setSelectedId} />
        <InspectorPanel node={selectedNode} row={selectedRow} onExpand={(id) => onFocus?.(id)} />
      </div>

      <section className="system-map-list-section" aria-label="System map as a list">
        <h2>List view</h2>
        <SystemMapTable rows={model.table} />
      </section>
    </section>
  );
}
