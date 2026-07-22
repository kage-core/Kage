// Task-oriented 2D system map — PURE + DETERMINISTIC (no wall-clock, no randomness, no force
// simulation). Given the repository model and a view, it emits layered node coordinates, typed
// edges, and a row-per-node table that is a complete accessible equivalent of the 2D rendering.
//
// Two honesty/robustness disciplines are baked in:
//   1. Determinism — every list is sorted by canonical name then stable entity id (the codebase's
//      standard tiebreak), so two calls on the same model are byte-identical and diffs are stable.
//   2. Windowing — the initial view is limited to TWO hops from the view's roots. Nodes with hidden
//      neighbors are marked `truncated`, and the caller can re-root the window on any node via
//      `focus`, rather than dumping the entire repository into one unreadable canvas.

import type { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EntityRecord } from "../repo-model/types.js";
import type {
  SystemMapDto,
  SystemMapEdgeDto,
  SystemMapLane,
  SystemMapLaneDto,
  SystemMapNodeDto,
  SystemMapNodeHealth,
  SystemMapTableRowDto,
  SystemMapView,
} from "./types.js";
import { SYSTEM_MAP_LANES } from "./types.js";

const LANE_SET: ReadonlySet<string> = new Set(SYSTEM_MAP_LANES);
const LANE_INDEX: ReadonlyMap<string, number> = new Map(SYSTEM_MAP_LANES.map((lane, i) => [lane, i]));

// Human-readable lane headings for the frontend and the accessible table.
const LANE_LABELS: Record<SystemMapLane, string> = {
  feature: "Features",
  flow: "Flows",
  component: "Components",
  contract: "Contracts",
  data_model: "Data models",
  owner: "Owners",
};

// Each view re-roots the two-hop window on the lane that is task-relevant for it, so the same model
// yields genuinely different, focused subgraphs without ever fabricating edges the model lacks.
const VIEW_ROOT_LANE: Record<SystemMapView, SystemMapLane> = {
  feature: "feature",
  runtime: "component",
  sequence: "flow",
  ownership: "owner",
  impact: "feature",
};

// Kinds with a dedicated detail page. Owners/contracts/data models have none yet — their href is a
// null we surface honestly rather than a link that would 404.
const HREF_SECTION: Partial<Record<SystemMapLane, string>> = {
  feature: "features",
  component: "components",
  flow: "flows",
};

const MAX_HOPS = 2;
const LANE_X_ORIGIN = 40;
const LANE_X_STEP = 240;
const NODE_Y_ORIGIN = 40;
const NODE_Y_STEP = 96;

function byNameThenId(a: EntityRecord, b: EntityRecord): number {
  return a.canonical_name.localeCompare(b.canonical_name) || a.entity_id.localeCompare(b.entity_id);
}

// Health from the FULL claim set (the current-truth gate lives in the model; we never re-derive it).
// Priority: an unresolved contradiction (disputed) or a decayed claim (stale) outranks the presence
// of injectable truth, so a node is only "verified" when it has injectable truth and nothing pulling
// against it.
function healthFor(claims: readonly ClaimRecord[]): SystemMapNodeHealth {
  if (claims.some((c) => c.trust_state === "disputed")) return "disputed";
  if (claims.some((c) => c.trust_state === "stale")) return "stale";
  if (claims.some((c) => c.trust_state === "verified" || c.trust_state === "approved")) return "verified";
  return "unverified";
}

function hrefFor(entity: EntityRecord): string | null {
  const section = HREF_SECTION[entity.kind as SystemMapLane];
  return section ? `/${section}/${entity.slug}` : null;
}

export function buildSystemMap(
  model: Repository,
  repoId: string | null,
  view: SystemMapView,
  focus?: string | null,
): SystemMapDto {
  const lanes: SystemMapLaneDto[] = SYSTEM_MAP_LANES.map((lane) => ({ lane, label: LANE_LABELS[lane], nodes: [] }));
  const empty: SystemMapDto = {
    view,
    focus_entity_id: null,
    max_hops: MAX_HOPS,
    lanes,
    edges: [],
    table: [],
    truncated: false,
  };
  if (!repoId) return empty;

  // Only entities that belong to a canonical lane appear on the map, sorted deterministically.
  const laneEntities = model
    .listEntities(repoId)
    .filter((e) => LANE_SET.has(e.kind))
    .sort(byNameThenId);
  if (laneEntities.length === 0) return empty;

  const byId = new Map(laneEntities.map((e) => [e.entity_id, e] as const));
  const included = new Set(byId.keys());

  // Directed edges between two included nodes, de-duplicated and sorted for determinism.
  const directed: SystemMapEdgeDto[] = [];
  const edgeKeys = new Set<string>();
  const undirected = new Map<string, Set<string>>();
  for (const id of included) undirected.set(id, new Set());
  for (const entity of laneEntities) {
    for (const relation of model.relationsFrom(entity.entity_id)) {
      if (!included.has(relation.to_entity_id)) continue;
      const key = `${relation.from_entity_id}|${relation.relation_type}|${relation.to_entity_id}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      directed.push({
        from_entity_id: relation.from_entity_id,
        to_entity_id: relation.to_entity_id,
        relation_type: relation.relation_type,
      });
      undirected.get(relation.from_entity_id)!.add(relation.to_entity_id);
      undirected.get(relation.to_entity_id)!.add(relation.from_entity_id);
    }
  }

  // Resolve the focus (entity id or slug) to an included entity; ignore an unknown focus.
  const focusEntity = focus
    ? laneEntities.find((e) => e.entity_id === focus || e.slug === focus) ?? null
    : null;

  // Roots: the focused entity, else every entity in the view's task-relevant lane. If that lane is
  // empty, fall back to all entities so a repo without that kind still renders something honest.
  let rootIds: string[];
  if (focusEntity) {
    rootIds = [focusEntity.entity_id];
  } else {
    const rootLane = VIEW_ROOT_LANE[view];
    const inLane = laneEntities.filter((e) => e.kind === rootLane).map((e) => e.entity_id);
    rootIds = inLane.length > 0 ? inLane : laneEntities.map((e) => e.entity_id);
  }

  // Undirected BFS from the roots, limited to MAX_HOPS. `hops` is distance from the nearest root.
  const hops = new Map<string, number>();
  let frontier = rootIds.filter((id) => included.has(id));
  for (const id of frontier) hops.set(id, 0);
  for (let depth = 1; depth <= MAX_HOPS && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of undirected.get(id) ?? []) {
        if (hops.has(neighbor)) continue;
        hops.set(neighbor, depth);
        next.push(neighbor);
      }
    }
    frontier = next.sort();
  }

  const shown = new Set(hops.keys());

  // A node is truncated when it has ANY neighbor that fell outside the window.
  const truncatedIds = new Set<string>();
  for (const id of shown) {
    for (const neighbor of undirected.get(id) ?? []) {
      if (!shown.has(neighbor)) {
        truncatedIds.add(id);
        break;
      }
    }
  }

  // Lay out shown nodes: x by lane column, y by row within the lane (in deterministic order).
  const laneCursors = new Map<string, number>();
  const nodeById = new Map<string, SystemMapNodeDto>();
  for (const entity of laneEntities) {
    if (!shown.has(entity.entity_id)) continue;
    const laneIndex = LANE_INDEX.get(entity.kind)!;
    const row = laneCursors.get(entity.kind) ?? 0;
    laneCursors.set(entity.kind, row + 1);
    const node: SystemMapNodeDto = {
      entity_id: entity.entity_id,
      kind: entity.kind,
      slug: entity.slug,
      canonical_name: entity.canonical_name,
      lane: entity.kind as SystemMapLane,
      x: LANE_X_ORIGIN + laneIndex * LANE_X_STEP,
      y: NODE_Y_ORIGIN + row * NODE_Y_STEP,
      health: healthFor(model.claimsForEntity(entity.entity_id)),
      href: hrefFor(entity),
      hops: hops.get(entity.entity_id)!,
      truncated: truncatedIds.has(entity.entity_id),
    };
    nodeById.set(entity.entity_id, node);
    lanes[laneIndex].nodes.push(node);
  }

  // Edges restricted to shown endpoints, already deterministically ordered by construction; re-sort
  // to be safe against future changes.
  const edges = directed
    .filter((e) => shown.has(e.from_entity_id) && shown.has(e.to_entity_id))
    .sort(
      (a, b) =>
        a.from_entity_id.localeCompare(b.from_entity_id) ||
        a.relation_type.localeCompare(b.relation_type) ||
        a.to_entity_id.localeCompare(b.to_entity_id),
    );

  // Table: one row per shown node, carrying upstream/downstream neighbor NAMES so relations survive
  // without the 2D view. Sorted by canonical name for a stable, scannable reading order.
  const table: SystemMapTableRowDto[] = [];
  for (const entity of laneEntities) {
    const node = nodeById.get(entity.entity_id);
    if (!node) continue;
    const downstream: string[] = [];
    const upstream: string[] = [];
    for (const edge of edges) {
      if (edge.from_entity_id === entity.entity_id) downstream.push(byId.get(edge.to_entity_id)!.canonical_name);
      if (edge.to_entity_id === entity.entity_id) upstream.push(byId.get(edge.from_entity_id)!.canonical_name);
    }
    table.push({
      entity_id: entity.entity_id,
      node: entity.canonical_name,
      kind: entity.kind,
      lane: entity.kind as SystemMapLane,
      health: node.health,
      href: node.href,
      upstream: [...new Set(upstream)].sort(),
      downstream: [...new Set(downstream)].sort(),
      // Carry the node's truncation into the row so the accessible table shows the same "+more" signal
      // the diagram does — an empty relation cell on a truncated node is windowed, not a true leaf.
      truncated: node.truncated,
    });
  }
  table.sort((a, b) => a.node.localeCompare(b.node) || a.entity_id.localeCompare(b.entity_id));

  return {
    view,
    focus_entity_id: focusEntity ? focusEntity.entity_id : null,
    max_hops: MAX_HOPS,
    lanes,
    edges,
    table,
    truncated: truncatedIds.size > 0,
  };
}
