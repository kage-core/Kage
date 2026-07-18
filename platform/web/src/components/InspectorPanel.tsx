import type { SystemMapNodeDto, SystemMapTableRowDto } from "../api/types";
import { HEALTH_ICONS, HEALTH_LABELS } from "./health";

// The detail pane for the currently selected map node. It shows the node's identity, its knowledge
// health (as text, never color alone), a link to its full page when one exists, and its upstream /
// downstream relations. When the node has neighbors hidden by the two-hop window it offers an
// "expand" action that re-roots the map on that node rather than dumping the whole repository.

interface InspectorPanelProps {
  node: SystemMapNodeDto | null;
  row: SystemMapTableRowDto | null;
  onExpand: (entityId: string) => void;
}

function Relations({ label, names }: { label: string; names: string[] }): React.ReactElement {
  return (
    <div className="inspector-relations">
      <h3>{label}</h3>
      {names.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul>
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InspectorPanel({ node, row, onExpand }: InspectorPanelProps): React.ReactElement {
  if (!node) {
    return (
      <aside className="inspector-panel" aria-label="Node inspector">
        <p className="muted">Select a node to inspect its health, links, and relations.</p>
      </aside>
    );
  }

  return (
    <aside className="inspector-panel" aria-label="Node inspector">
      <h2>{node.canonical_name}</h2>
      <dl className="inspector-meta">
        <div>
          <dt>Kind</dt>
          <dd>{node.kind}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>
            <span className="health-badge" data-health={node.health}>
              <span className="health-icon" aria-hidden="true">
                {HEALTH_ICONS[node.health]}
              </span>
              {HEALTH_LABELS[node.health]}
            </span>
          </dd>
        </div>
      </dl>

      {node.href && (
        <p>
          <a href={node.href}>Open full page</a>
        </p>
      )}

      <Relations label="Upstream" names={row?.upstream ?? []} />
      <Relations label="Downstream" names={row?.downstream ?? []} />

      {node.truncated && (
        <button type="button" className="inspector-expand" onClick={() => onExpand(node.entity_id)}>
          Expand from this node
        </button>
      )}
    </aside>
  );
}
