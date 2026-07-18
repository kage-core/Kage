import type { TransformationReceipt } from "../protocol/index.js";
import type { Repository } from "../repo-model/repository.js";
import { buildMinimalChangeReport, type PolicyReceiptSection } from "../policy/report.js";
import type { MinimalChangePolicy } from "../policy/policy-config.js";
import type { SuppressionRecord } from "../policy/post-diff.js";

/**
 * The task-receipts surface (Phase D, Task 10, Step 4).
 *
 * `GET /v2/tasks/:taskId/receipts` returns the task's transformation receipts AND, when the Minimal
 * Change Guard is enabled for the repository, the guard's receipt-section projection for that task's
 * change. Wiring the projection into the real receipts endpoint — not only the separate
 * `/minimal-change` route — is what actually satisfies the spec's "add findings to task receipts":
 * an operator reading task receipts sees deterministic status, severity, and the suppression decision
 * per finding, in the same place they read the transformation economics.
 *
 * Two properties are load-bearing and preserved here:
 *
 *  1. BACKWARD COMPATIBLE. When the guard is disabled (the default) — or the task is unknown to the
 *     runtime — the body is exactly `{ receipts }`, byte-identical to the pre-Task-10 shape. No
 *     `minimal_change` section is fabricated for a repository that has not opted in.
 *  2. NO FABRICATED IMPACT. The section is `buildMinimalChangeReport(...).receipt_section`, whose
 *     honesty rules carry over verbatim: each finding reports `changed_behavior: null` (unknown
 *     without a controlled comparison) and the section never emits a "lines avoided" figure.
 */

export interface TaskReceiptsBody {
  receipts: TransformationReceipt[];
  /** Present only when the guard is enabled for a known task; the guard's per-task receipt projection. */
  minimal_change?: PolicyReceiptSection;
}

export interface TaskReceiptsInput {
  taskId: string;
  /** The task's transformation receipts, exactly as stored. */
  receipts: TransformationReceipt[];
  /** The task's persisted repository id, or null when the task is unknown to the runtime. */
  repositoryId: string | null;
  policy: MinimalChangePolicy;
  /** Unified-diff text for the task's change. Only consulted when the guard is enabled. */
  diffText: string;
  model?: Repository | null;
  suppressions?: readonly SuppressionRecord[];
  /** Explicit ISO timestamp for suppression expiry checks (keeps composition deterministic). */
  now?: string;
}

export function buildTaskReceiptsBody(input: TaskReceiptsInput): TaskReceiptsBody {
  const body: TaskReceiptsBody = { receipts: input.receipts };

  // A task the runtime never saw carries no minimal-change section — there is no change to report on.
  if (!input.repositoryId) return body;
  // A disabled/off guard leaves the receipts surface exactly as it was before Task 10: transformation
  // receipts only. Opting in — and moving to enforced — is a separate, explicit config edit.
  if (!input.policy.enabled || input.policy.mode === "off") return body;

  const report = buildMinimalChangeReport({
    diff_text: input.diffText,
    task: { task_id: input.taskId, repository_id: input.repositoryId, declared_components: [] },
    model: input.model ?? null,
    policy: input.policy,
    suppressions: input.suppressions,
    now: input.now,
  });

  return { ...body, minimal_change: report.receipt_section };
}
