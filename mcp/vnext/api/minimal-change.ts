import type { Repository } from "../repo-model/repository.js";
import { buildMinimalChangeReport } from "../policy/report.js";
import type { MinimalChangePolicy } from "../policy/policy-config.js";

/**
 * The task-scoped Minimal Change Guard API (Phase D, Task 10).
 *
 * `GET /v2/tasks/:taskId/minimal-change` returns the guard's advisory report for a task's change. The
 * route is pure over its inputs — the caller supplies the task's persisted `repository_id`, the diff
 * text, the repository model (or null), and the policy — so it is deterministic and unit-testable
 * without a live HTTP server. Honesty rules carry over from `buildMinimalChangeReport`: nothing blocks
 * outside `enforced` mode, and the receipt section never fabricates an impact figure.
 */

const ROUTE = /^\/v2\/tasks\/([^/]+)\/minimal-change$/;

export function matchMinimalChangeRoute(pathname: string): { taskId: string } | null {
  const match = ROUTE.exec(pathname);
  if (!match) return null;
  try {
    const taskId = decodeURIComponent(match[1]);
    if (!taskId || taskId.includes("/")) return null;
    return { taskId };
  } catch {
    return null;
  }
}

export interface MinimalChangeRouteResult {
  status: number;
  body?: unknown;
  error?: string;
}

export interface MinimalChangeForTaskInput {
  taskId: string;
  /** The task's persisted repository id, or null when the task is unknown to the runtime. */
  repositoryId: string | null;
  policy: MinimalChangePolicy;
  diffText: string;
  model?: Repository | null;
  /** Explicit ISO timestamp for suppression expiry checks. */
  now?: string;
}

export function minimalChangeForTask(input: MinimalChangeForTaskInput): MinimalChangeRouteResult {
  // A task the runtime never saw cannot be reported on — 404, distinct from "guard disabled".
  if (!input.repositoryId) return { status: 404, error: "unknown_task" };

  // A disabled guard returns an explicit, honest envelope rather than a fabricated empty report.
  if (!input.policy.enabled || input.policy.mode === "off") {
    return { status: 200, body: { task_id: input.taskId, enabled: false } };
  }

  const report = buildMinimalChangeReport({
    diff_text: input.diffText,
    task: { task_id: input.taskId, repository_id: input.repositoryId, declared_components: [] },
    model: input.model ?? null,
    policy: input.policy,
    now: input.now,
  });

  return { status: 200, body: { task_id: input.taskId, enabled: true, report } };
}
