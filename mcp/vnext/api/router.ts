// The portal read-model router: a pure mapping from a matched `/v2/...` read route to a
// `{ status, body }` result over the repository model. It owns NO transport — server.ts matches the
// route, proves the machine token, builds a `Repository`, and calls `handlePortalRoute`. Keeping the
// dispatch pure makes every route unit-testable without a live socket and keeps the honesty gates in
// one place (read-models.ts), never smeared across the HTTP handler.

import type { Repository } from "../repo-model/repository.js";
import type { ReceiptStore } from "../storage/receipt-store.js";
import type { EntityKind } from "../repo-model/types.js";
import type { SystemMapView, TeamMetricsPanelDto } from "./types.js";
import { buildSystemMap } from "./system-map.js";
import {
  buildOverview,
  decisionDetail,
  entityDetail,
  featureList,
  findTaskSummary,
  listTaskSummaries,
  reviewItems,
  runbookDetail,
} from "./read-models.js";

export type PortalRouteKind =
  | "overview"
  | "system_map"
  | "features"
  | "feature"
  | "component"
  | "flow"
  | "runbook"
  | "decision"
  | "review_items"
  | "tasks"
  | "task"
  | "integrations";

export interface PortalRoute {
  kind: PortalRouteKind;
  slug?: string;
  taskId?: string;
}

// Every portal read route is GET. `undefined` means "not a portal route" — server.ts falls through to
// its existing matcher (content, receipts, minimal-change) or 404s.
export function matchPortalRoute(pathname: string): PortalRoute | undefined {
  if (pathname === "/v2/overview") return { kind: "overview" };
  if (pathname === "/v2/system-map") return { kind: "system_map" };
  if (pathname === "/v2/features") return { kind: "features" };
  if (pathname === "/v2/review-items") return { kind: "review_items" };
  if (pathname === "/v2/tasks") return { kind: "tasks" };
  if (pathname === "/v2/integrations") return { kind: "integrations" };

  const entity = /^\/v2\/(features|components|flows|runbooks|decisions)\/([^/]+)$/.exec(pathname);
  if (entity) {
    const slug = decodeSlug(entity[2]);
    if (slug === undefined) return undefined;
    switch (entity[1]) {
      case "features":
        return { kind: "feature", slug };
      case "components":
        return { kind: "component", slug };
      case "flows":
        return { kind: "flow", slug };
      case "runbooks":
        return { kind: "runbook", slug };
      case "decisions":
        return { kind: "decision", slug };
    }
  }

  const task = /^\/v2\/tasks\/([^/]+)$/.exec(pathname);
  if (task) {
    const taskId = decodeSlug(task[1]);
    if (taskId === undefined) return undefined;
    return { kind: "task", taskId };
  }

  return undefined;
}

function decodeSlug(raw: string): string | undefined {
  try {
    const value = decodeURIComponent(raw);
    if (!value || value.includes("/")) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export interface PortalContext {
  model: Repository;
  receiptStore: ReceiptStore;
  /**
   * The team panel a connected workspace last answered with, or null/absent when this install has no
   * workspace (or the workspace is unreachable). It is a VALUE, never a fetch: the portal read path must
   * never wait on the network, so the caller supplies whatever the workspace link has cached and the
   * local overview is computed identically either way. Null renders as "no workspace connected".
   */
  team?: TeamMetricsPanelDto | null;
}

export interface PortalResult {
  status: number;
  body: unknown;
}

const VIEWS: ReadonlySet<string> = new Set(["feature", "runtime", "sequence", "ownership", "impact"]);

// The distinct repository ids that have entities in the model, in stable order. A fresh repo has none;
// the caller then returns an honest empty overview rather than a 500.
function repositoryIds(model: Repository): string[] {
  const rows = model.database
    .prepare(`SELECT DISTINCT repository_id FROM entities ORDER BY repository_id`)
    .all() as unknown as Array<{ repository_id: string }>;
  return rows.map((r) => r.repository_id);
}

function notFound(): PortalResult {
  return { status: 404, body: { ok: false, error: "not_found" } };
}

function entityKindFor(kind: PortalRoute["kind"]): EntityKind | null {
  switch (kind) {
    case "feature":
      return "feature";
    case "component":
      return "component";
    case "flow":
      return "flow";
    case "runbook":
      return "runbook";
    case "decision":
      return "decision";
    default:
      return null;
  }
}

export function handlePortalRoute(
  route: PortalRoute,
  ctx: PortalContext,
  search: URLSearchParams,
): PortalResult {
  const { model, receiptStore } = ctx;
  const repoId = repositoryIds(model)[0] ?? null;
  const receiptCount = (taskId: string): number => receiptStore.forTask(taskId).length;

  switch (route.kind) {
    case "overview":
      // `ctx.team ?? null` keeps the fail-open contract explicit: no workspace, or a workspace that
      // did not answer, yields null — never a zeroed team panel.
      return { status: 200, body: buildOverview(model, repoId, receiptStore.list(), ctx.team ?? null) };

    case "system_map": {
      const requested = search.get("view") ?? "feature";
      const view: SystemMapView = (VIEWS.has(requested) ? requested : "feature") as SystemMapView;
      const focus = search.get("focus");
      return { status: 200, body: buildSystemMap(model, repoId, view, focus) };
    }

    case "features":
      return { status: 200, body: repoId ? featureList(model, repoId) : { features: [] } };

    case "feature":
    case "component":
    case "flow":
    case "runbook":
    case "decision": {
      if (!repoId) return notFound();
      const kind = entityKindFor(route.kind)!;
      const entity = model.findEntity(repoId, kind, route.slug!);
      if (!entity) return notFound();
      if (route.kind === "decision") return { status: 200, body: decisionDetail(model, entity) };
      if (route.kind === "runbook") return { status: 200, body: runbookDetail(model, entity) };
      return { status: 200, body: entityDetail(model, entity) };
    }

    case "review_items": {
      const statusParam = search.get("status");
      const status = statusParam === "open" || statusParam === "accepted" || statusParam === "rejected" || statusParam === "superseded"
        ? statusParam
        : undefined;
      return { status: 200, body: { review_items: repoId ? reviewItems(model, repoId, status) : [] } };
    }

    case "tasks":
      return { status: 200, body: { tasks: listTaskSummaries(model, receiptCount) } };

    case "task": {
      const task = findTaskSummary(model, route.taskId!, receiptCount);
      if (!task) return notFound();
      return { status: 200, body: { task, receipt_count: task.receipt_count } };
    }

    case "integrations":
      // Integration state is wired in Task 9; an honest empty list, never a fabricated "all healthy".
      return { status: 200, body: { integrations: [] } };
  }
}
