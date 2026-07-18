import type { SystemMapTableRowDto } from "../api/types";
import { HEALTH_ICONS, HEALTH_LABELS } from "./health";

// The accessible equivalent of the 2D map: ONE row per shown node (never an edge dump), carrying the
// node's kind, health, and its upstream/downstream neighbor names. Screen-reader and keyboard users
// get the complete graph — including isolated nodes an edge-only table would silently drop — without
// depending on the SVG at all. This is a hard gate condition of the phase.

interface SystemMapTableProps {
  rows: SystemMapTableRowDto[];
}

function NeighborList({ names }: { names: string[] }): React.ReactElement {
  if (names.length === 0) return <span className="muted">None</span>;
  return (
    <ul className="neighbor-list">
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

export function SystemMapTable({ rows }: SystemMapTableProps): React.ReactElement {
  return (
    <table className="system-map-table" aria-label="System map list">
      <caption className="visually-hidden">
        Every node currently shown on the system map, with its knowledge health and its upstream and
        downstream relations.
      </caption>
      <thead>
        <tr>
          <th scope="col">Node</th>
          <th scope="col">Kind</th>
          <th scope="col">Health</th>
          <th scope="col">Upstream</th>
          <th scope="col">Downstream</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.entity_id}>
            <th scope="row">
              {row.href ? <a href={row.href}>{row.node}</a> : <span>{row.node}</span>}
            </th>
            <td>{row.kind}</td>
            <td>
              <span className="health-badge" data-health={row.health}>
                <span className="health-icon" aria-hidden="true">
                  {HEALTH_ICONS[row.health]}
                </span>
                {HEALTH_LABELS[row.health]}
              </span>
            </td>
            <td>
              <NeighborList names={row.upstream} />
            </td>
            <td>
              <NeighborList names={row.downstream} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
