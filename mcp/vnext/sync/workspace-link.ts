// The local end of the workspace connection: push knowledge out, cache the team panel for the portal.
//
// The architectural rule this file exists to obey: THE WORKSPACE IS NEVER ON THE LOCAL CRITICAL PATH.
// A workspace outage must leave local context, the local portal and export completely working. So:
//
//   - `syncOnce` builds a batch, enqueues it in the idempotent outbox, and drains. A transport failure
//     is swallowed: the batch stays pending and the next attempt redelivers it. Because the batch id is
//     a content hash and the workspace applies it exactly once, a redelivery is a no-op.
//   - `teamPanel()` is a pure memory read — the portal request path never awaits the network. The panel
//     is refreshed out of band by `refreshTeamPanel()`, which swallows failures.
//   - A cached panel EXPIRES. Serving last week's team numbers as current is a quieter lie than saying
//     "no workspace connected", so past the freshness window the panel is withdrawn.
import { Outbox, buildSyncBatch } from "./outbox.js";
import { drainOutbox, type DrainSummary, type SyncTransport } from "./client.js";
import { teamMetricsPanel } from "../api/read-models.js";
import type { TeamMetricsPanelDto } from "../api/types.js";
import type { TeamMetricsReport } from "../workspace/metrics.js";
import type { LocalModelSnapshot } from "./types.js";

/** How long a fetched team panel may be presented as current. */
export const DEFAULT_PANEL_MAX_AGE_MS = 5 * 60_000;

export interface WorkspaceLinkOptions {
  transport: SyncTransport;
  /** Fetch the workspace's team metrics report. Rejects on any transport/authorization failure. */
  fetchTeamMetrics: () => Promise<TeamMetricsReport>;
  maxPanelAgeMs?: number;
  now?: () => number;
  /** Share an existing outbox (a durable one, later) instead of the default in-memory store. */
  outbox?: Outbox;
}

export interface WorkspaceLink {
  /** Build + enqueue + drain. Never throws on a transport failure; reports `offline` instead. */
  syncOnce(snapshot: LocalModelSnapshot): Promise<DrainSummary>;
  /** Refresh the cached team panel. Never throws: an outage simply leaves the cache unchanged/expired. */
  refreshTeamPanel(): Promise<void>;
  /** The cached panel, or null when there is none or it is past its freshness window. */
  teamPanel(): TeamMetricsPanelDto | null;
  outbox: Outbox;
}

export function createWorkspaceLink(options: WorkspaceLinkOptions): WorkspaceLink {
  const outbox = options.outbox ?? new Outbox();
  const maxAge = options.maxPanelAgeMs ?? DEFAULT_PANEL_MAX_AGE_MS;
  const now = options.now ?? Date.now;
  let cached: { panel: TeamMetricsPanelDto; fetchedAt: number } | null = null;

  return {
    outbox,
    async syncOnce(snapshot: LocalModelSnapshot): Promise<DrainSummary> {
      // buildSyncBatch applies the privacy filter (local_raw evidence dropped, task outcomes checked
      // against the allow-list) and produces a content-hashed id, so re-syncing an unchanged snapshot
      // re-enqueues the SAME batch rather than a second copy of the same data.
      outbox.enqueue(buildSyncBatch(snapshot));
      return drainOutbox(outbox, options.transport);
    },
    async refreshTeamPanel(): Promise<void> {
      try {
        const report = await options.fetchTeamMetrics();
        cached = { panel: teamMetricsPanel(report), fetchedAt: now() };
      } catch {
        // Fail-open: the portal keeps working without a team panel. An outage must never propagate an
        // exception into a local read path, and it must never invent a panel either.
      }
    },
    teamPanel(): TeamMetricsPanelDto | null {
      if (!cached) return null;
      if (now() - cached.fetchedAt > maxAge) return null;
      return cached.panel;
    },
  };
}
