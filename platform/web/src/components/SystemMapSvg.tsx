import { useMemo, useRef, useState } from "react";
import type { SystemMapDto, SystemMapNodeDto } from "../api/types";
import { HEALTH_LABELS } from "./health";

// The 2D system map rendering. It is a deterministic layered diagram — NO force simulation, NO 3D,
// NO randomness (the server already assigned every coordinate). It adds three interactions on top:
//   - selection (click or Enter/Space on a focused node),
//   - keyboard traversal between nodes with the arrow keys,
//   - pan and zoom via explicit controls (not scroll-jacking).
// The diagram is an ENHANCEMENT; the SystemMapTable beside it is the accessible source of truth, so
// the SVG is marked as a labelled group rather than pretending to be self-describing.

const NODE_WIDTH = 168;
const NODE_HEIGHT = 52;
const PADDING = 48;
const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.4;

interface SystemMapSvgProps {
  model: SystemMapDto;
  selectedId: string | null;
  onSelect: (entityId: string) => void;
}

function center(node: SystemMapNodeDto): { cx: number; cy: number } {
  return { cx: node.x + NODE_WIDTH / 2, cy: node.y + NODE_HEIGHT / 2 };
}

export function SystemMapSvg({ model, selectedId, onSelect }: SystemMapSvgProps): React.ReactElement {
  const [zoom, setZoom] = useState(1);
  const nodeRefs = useRef(new Map<string, SVGGElement>());

  // Nodes in a stable keyboard-traversal order: lane column, then row within the lane.
  const nodes = useMemo(
    () =>
      model.lanes.flatMap((lane) => lane.nodes).sort((a, b) => a.x - b.x || a.y - b.y || a.entity_id.localeCompare(b.entity_id)),
    [model],
  );
  const byId = useMemo(() => new Map(nodes.map((n) => [n.entity_id, n] as const)), [nodes]);

  const width = nodes.reduce((max, n) => Math.max(max, n.x + NODE_WIDTH), 0) + PADDING;
  const height = nodes.reduce((max, n) => Math.max(max, n.y + NODE_HEIGHT), 0) + PADDING;

  function focusNode(entityId: string): void {
    nodeRefs.current.get(entityId)?.focus();
  }

  function onNodeKeyDown(event: React.KeyboardEvent<SVGGElement>, node: SystemMapNodeDto): void {
    const index = nodes.findIndex((n) => n.entity_id === node.entity_id);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(node.entity_id);
      return;
    }
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = nodes.length - 1;
    if (nextIndex !== null && nextIndex >= 0 && nextIndex < nodes.length) {
      event.preventDefault();
      focusNode(nodes[nextIndex].entity_id);
    }
  }

  return (
    <div className="system-map-svg">
      <div className="system-map-controls" role="group" aria-label="Diagram zoom">
        <button type="button" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}>
          Zoom out
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Reset view
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}>
          Zoom in
        </button>
      </div>
      <div className="system-map-viewport">
        <svg
          role="group"
          aria-label="System map diagram"
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
        >
          <g>
            {model.edges.map((edge) => {
              const from = byId.get(edge.from_entity_id);
              const to = byId.get(edge.to_entity_id);
              if (!from || !to) return null;
              const a = center(from);
              const b = center(to);
              return (
                <line
                  key={`${edge.from_entity_id}-${edge.relation_type}-${edge.to_entity_id}`}
                  className="system-map-edge"
                  x1={a.cx}
                  y1={a.cy}
                  x2={b.cx}
                  y2={b.cy}
                />
              );
            })}
          </g>
          <g>
            {nodes.map((node) => {
              const selected = node.entity_id === selectedId;
              return (
                <g
                  key={node.entity_id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(node.entity_id, el);
                    else nodeRefs.current.delete(node.entity_id);
                  }}
                  className="system-map-node"
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${node.canonical_name}, ${node.kind}, ${HEALTH_LABELS[node.health]}${node.truncated ? ", has hidden neighbors" : ""}`}
                  data-entity-id={node.entity_id}
                  data-health={node.health}
                  data-selected={selected}
                  onClick={() => onSelect(node.entity_id)}
                  onKeyDown={(event) => onNodeKeyDown(event, node)}
                >
                  <rect x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx={8} />
                  <text x={node.x + 12} y={node.y + 22} className="system-map-node-name">
                    {node.canonical_name}
                  </text>
                  <text x={node.x + 12} y={node.y + 40} className="system-map-node-meta">
                    {node.kind} · {HEALTH_LABELS[node.health]}
                    {node.truncated ? " · +more" : ""}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
