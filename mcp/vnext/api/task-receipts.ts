import type { TransformationReceipt } from "../protocol/index.js";
import type { Repository } from "../repo-model/repository.js";
import { buildMinimalChangeReport, type PolicyReceiptSection } from "../policy/report.js";
import type { MinimalChangePolicy } from "../policy/policy-config.js";
import type { SuppressionRecord } from "../policy/post-diff.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import { calculateCohort } from "../gateway/cohort-metrics.js";
import type {
  DeliveryRecordDto,
  ExactRequestMeasurementsDto,
  KnowledgeChangeDto,
  PolicyFindingSummaryDto,
  ReceiptMetricDto,
  RequestMeasurementDto,
  TaskOutcomesDto,
  TaskReceiptDto,
  TaskSummaryDto,
  TaskTimelineEventDto,
} from "./types.js";

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

// =================================================================================================
// The aggregate task receipt (Phase C, Task 8).
//
// `buildTaskReceiptAggregate` rolls one task's stored records — transformation receipts, context
// deliveries, linked knowledge changes, and the Minimal Change Guard's findings — into an auditable
// receipt DTO. It is a PURE function: no I/O, no wall-clock, no randomness, so the honesty gates are
// unit-testable without a socket. The router fetches the records and calls it.
//
// The single discipline it never breaks: EXACT request economics (what a transform did to the prompt,
// measured) are reported in `exact_request_measurements`, apart from the COHORT outcome trends
// (`task_outcomes`). A net input cost/token delta is summed ONLY over requests measured on BOTH sides
// (a one-sided cost is `null`, never `before − 0`), and there is NO fused "total value created" number
// anywhere — a change in model output can never be dressed up as a prompt saving.
// =================================================================================================

const COHORT_SOURCE = "mcp/vnext/gateway/cohort-metrics.ts";
const RECEIPT_SOURCE = "mcp/vnext/measurement/receipt.ts";

export interface TaskReceiptAggregateInput {
  task: TaskSummaryDto;
  receipts: readonly TransformationReceipt[];
  deliveries: readonly StoredContextDelivery[];
  /** Knowledge changes already resolved to their portal evidence links by the caller. */
  knowledgeChanges: readonly KnowledgeChangeDto[];
  /** The Minimal Change Guard section for the task's change, or null when the guard is disabled. */
  policySection: PolicyReceiptSection | null;
}

// A receipt's exact net input cost, present ONLY when it was priced on BOTH sides. A one-sided cost is
// unusable (`before − 0` would book the whole request as a saving), so it is null.
function netInputCost(receipt: TransformationReceipt): number | null {
  if (receipt.provider_input_cost_before_usd === null || receipt.provider_input_cost_after_usd === null) {
    return null;
  }
  return receipt.provider_input_cost_after_usd - receipt.provider_input_cost_before_usd;
}

// A receipt's exact net input token delta, present ONLY when measured on BOTH sides.
function netInputTokens(receipt: TransformationReceipt): number | null {
  if (receipt.before_input_tokens === null || receipt.after_input_tokens === null) return null;
  return receipt.after_input_tokens - receipt.before_input_tokens;
}

function exactMeasurements(receipts: readonly TransformationReceipt[]): ExactRequestMeasurementsDto {
  const cohort = calculateCohort(receipts);

  const tokenDeltas = receipts
    .map(netInputTokens)
    .filter((value): value is number => value !== null);
  const tokenTotal = tokenDeltas.length ? tokenDeltas.reduce((sum, value) => sum + value, 0) : null;

  const priced = cohort.cost_delta_receipts;
  const costMetric: ReceiptMetricDto = {
    label: "Net input cost",
    value: priced > 0 ? cohort.total_net_input_cost_delta_usd : null,
    unit: "usd",
    exactness: priced > 0 ? "exact" : "unavailable",
    formula: "Σ(provider_input_cost_after_usd − provider_input_cost_before_usd) over requests priced on both sides",
    source_path: COHORT_SOURCE,
  };
  const tokenMetric: ReceiptMetricDto = {
    label: "Net input tokens",
    value: tokenDeltas.length ? tokenTotal : null,
    unit: "tokens",
    exactness: tokenDeltas.length ? "exact" : "unavailable",
    formula: "Σ(after_input_tokens − before_input_tokens) over requests measured on both sides",
    source_path: RECEIPT_SOURCE,
  };

  const requests: RequestMeasurementDto[] = receipts.map((receipt) => ({
    request_id: receipt.request_id,
    provider: receipt.provider,
    model: receipt.model,
    mode: receipt.mode,
    measurement_quality: receipt.measurement_quality,
    net_input_cost_usd: netInputCost(receipt),
    net_input_tokens: netInputTokens(receipt),
    transformations: [...receipt.transformations],
    created_at: receipt.created_at,
  }));

  return {
    metrics: [costMetric, tokenMetric],
    priced_request_count: priced,
    measured_token_request_count: tokenDeltas.length,
    total_request_count: receipts.length,
    requests,
  };
}

function cohortMetric(
  label: string,
  value: number | null,
  count: number,
  unit: ReceiptMetricDto["unit"],
  formula: string,
): ReceiptMetricDto {
  return {
    label,
    value: count > 0 ? value : null,
    unit,
    exactness: count > 0 ? "cohort" : "unavailable",
    formula,
    source_path: COHORT_SOURCE,
  };
}

function taskOutcomes(receipts: readonly TransformationReceipt[]): TaskOutcomesDto {
  const cohort = calculateCohort(receipts);
  return {
    request_count: receipts.length,
    metrics: [
      cohortMetric(
        "Output tokens (p50)",
        cohort.p50_output_tokens,
        cohort.output_token_receipts,
        "tokens",
        "p50(output_tokens) over receipts that measured output tokens",
      ),
      cohortMetric(
        "Output tokens (p95)",
        cohort.p95_output_tokens,
        cohort.output_token_receipts,
        "tokens",
        "p95(output_tokens) over receipts that measured output tokens",
      ),
      cohortMetric(
        "Local latency (p50)",
        cohort.p50_latency_ms,
        cohort.latency_samples,
        "milliseconds",
        "p50(latency_ms) over all receipts",
      ),
      cohortMetric(
        "Local latency (p95)",
        cohort.p95_latency_ms,
        cohort.latency_samples,
        "milliseconds",
        "p95(latency_ms) over all receipts",
      ),
      cohortMetric(
        "Kage processing cost",
        cohort.kage_processing_cost_total_usd,
        cohort.kage_processing_cost_receipts,
        "usd",
        "Σ(kage_processing_cost_usd) over receipts that measured it",
      ),
    ],
  };
}

function deliveryRecords(deliveries: readonly StoredContextDelivery[]): DeliveryRecordDto[] {
  return deliveries.map((delivery) => ({
    delivery_id: delivery.delivery_id,
    capsule_id: delivery.capsule_id,
    injection_location: delivery.injection_location,
    status: delivery.status,
    added_bytes: delivery.added_bytes,
    added_tokens: delivery.added_tokens,
    delivered_at: delivery.delivered_at,
    reason: delivery.reason,
  }));
}

function policyFindings(section: PolicyReceiptSection | null): PolicyFindingSummaryDto[] {
  if (!section) return [];
  return section.findings.map((finding) => ({
    finding_id: finding.finding_id,
    kind: finding.kind,
    title: finding.title,
    severity: finding.severity,
    deterministic: finding.deterministic,
    // Honesty carried verbatim from the guard: behavior change is unknown without a controlled
    // comparison, so it is always null — never a fabricated boolean.
    changed_behavior: null,
  }));
}

// The receipt timeline, ordered by timestamp. Every event is derived from a real stored record; a
// record with no timestamp sorts last and renders "unavailable" rather than being dropped.
function buildTimeline(input: TaskReceiptAggregateInput): TaskTimelineEventDto[] {
  const events: TaskTimelineEventDto[] = [];
  events.push({
    kind: "task_started",
    at: input.task.started_at,
    detail: `Task started on ${input.task.agent_surface}`,
  });
  for (const delivery of input.deliveries) {
    events.push({
      kind: "capsule_delivered",
      at: delivery.delivered_at,
      detail:
        delivery.status === "delivered"
          ? `Context delivered to ${delivery.injection_location} (${delivery.added_bytes} bytes)`
          : `Context ${delivery.status} (${delivery.reason})`,
    });
  }
  for (const receipt of input.receipts) {
    const transforms = receipt.transformations.length ? receipt.transformations.join(", ") : "no transform";
    events.push({
      kind: "request_transformed",
      at: receipt.created_at,
      detail: `Request ${receipt.request_id} handled in ${receipt.mode} mode (${transforms})`,
    });
  }
  for (const change of input.knowledgeChanges) {
    events.push({
      kind: "knowledge_changed",
      at: null,
      detail: `${change.change_kind}: ${change.title}`,
    });
  }
  for (const finding of policyFindings(input.policySection)) {
    events.push({
      kind: "policy_finding",
      at: null,
      detail: `${finding.severity}: ${finding.title}`,
    });
  }
  if (input.task.ended_at) {
    events.push({
      kind: "task_ended",
      at: input.task.ended_at,
      detail: input.task.outcome ? `Task ended: ${input.task.outcome}` : "Task ended",
    });
  }
  // Stable order: by timestamp; a null timestamp sorts last (its record has no honest position).
  return events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const leftAt = left.event.at;
      const rightAt = right.event.at;
      if (leftAt === null && rightAt === null) return left.index - right.index;
      if (leftAt === null) return 1;
      if (rightAt === null) return -1;
      if (leftAt < rightAt) return -1;
      if (leftAt > rightAt) return 1;
      return left.index - right.index;
    })
    .map(({ event }) => event);
}

export function buildTaskReceiptAggregate(input: TaskReceiptAggregateInput): TaskReceiptDto {
  return {
    task: input.task,
    exact_request_measurements: exactMeasurements(input.receipts),
    task_outcomes: taskOutcomes(input.receipts),
    deliveries: deliveryRecords(input.deliveries),
    knowledge_changes: [...input.knowledgeChanges],
    policy_mode: input.policySection?.mode ?? null,
    policy_findings: policyFindings(input.policySection),
    timeline: buildTimeline(input),
  };
}
