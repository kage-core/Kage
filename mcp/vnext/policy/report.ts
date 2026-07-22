import { createHash } from "node:crypto";

import type { Repository } from "../repo-model/repository.js";
import { normalizeFinding, type FindingKind, type MinimalChangeFinding, type MinimalChangeMode } from "./types.js";
import {
  DEFAULT_POST_DIFF_POLICY,
  evaluateDiff,
  applySuppressions,
  fingerprintFinding,
  type PostDiffPolicy,
  type PostDiffTask,
  type SuppressionRecord,
} from "./post-diff.js";
import { parseUnifiedDiff } from "./diff-parser.js";
import type { MinimalChangePolicy } from "./policy-config.js";

/**
 * Minimal Change Guard reporting (Phase D, Task 10).
 *
 * This module turns a set of advisory findings into a PR-check verdict and a receipt-ready projection.
 * Two honesty properties are load-bearing and enforced here in code:
 *
 *  1. ADVISORY NEVER BLOCKS. Only `enforced` mode can produce a failing report, and only for findings
 *     that are (a) deterministic ground truth and (b) explicitly listed in `enforced_rules`. Every
 *     finding is first passed through `normalizeFinding`, so a non-deterministic (model-opinion) finding
 *     can never reach the blocking set — not even when its kind is enumerated in `enforced_rules`.
 *  2. NO FABRICATED IMPACT. The receipt projection reports deterministic status, severity, and the
 *     suppression decision, but reports "did this change agent behavior" as `null` (unknown) and never
 *     emits a "lines avoided" figure — that would require a controlled comparison the guard never ran.
 */

export interface PolicyReportOptions {
  mode: MinimalChangeMode;
  enforced_rules?: FindingKind[];
}

export interface PolicyReport {
  ok: boolean;
  mode: MinimalChangeMode;
  enforced_rules: FindingKind[];
  /** Every active finding, normalized, sorted by the deterministic post-diff order they arrived in. */
  findings: MinimalChangeFinding[];
  /** The subset that blocks the check. Non-empty only in `enforced` mode for selected deterministic rules. */
  blocking: MinimalChangeFinding[];
  /** Non-blocking findings that still warrant attention (severity `warning`, or downgraded blocking). */
  warnings: MinimalChangeFinding[];
  /** Purely informational findings (severity `info`). */
  info: MinimalChangeFinding[];
  summary: string;
}

// A finding blocks iff the guard is enforced, the rule is explicitly selected, AND the finding is
// deterministic ground truth. Severity alone never blocks — enforcement is a policy decision layered on
// top of deterministic findings, and model opinion is unreachable here.
function isBlockable(finding: MinimalChangeFinding, options: PolicyReportOptions): boolean {
  if (options.mode !== "enforced") return false;
  if (!finding.deterministic) return false;
  return (options.enforced_rules ?? []).includes(finding.kind);
}

export function policyReport(
  findings: readonly MinimalChangeFinding[],
  options: PolicyReportOptions,
): PolicyReport {
  const enforced_rules = [...(options.enforced_rules ?? [])];
  // `off` disables the guard entirely: no findings are surfaced and nothing blocks.
  if (options.mode === "off") {
    return {
      ok: true,
      mode: "off",
      enforced_rules,
      findings: [],
      blocking: [],
      warnings: [],
      info: [],
      summary: "Minimal Change Guard is off.",
    };
  }

  const normalized = findings.map(normalizeFinding);
  const blocking: MinimalChangeFinding[] = [];
  const warnings: MinimalChangeFinding[] = [];
  const info: MinimalChangeFinding[] = [];

  for (const finding of normalized) {
    if (isBlockable(finding, options)) {
      // An enforced, selected, deterministic finding is elevated to a hard block.
      blocking.push(finding.severity === "blocking" ? finding : { ...finding, severity: "blocking" });
    } else if (finding.severity === "info") {
      info.push(finding);
    } else {
      warnings.push(finding);
    }
  }

  const ok = blocking.length === 0;
  const summary = ok
    ? `Minimal Change Guard (${options.mode}): ${warnings.length} warning(s), ${info.length} note(s), no blocking findings.`
    : `Minimal Change Guard (${options.mode}): ${blocking.length} blocking finding(s) must be resolved or justified.`;

  return { ok, mode: options.mode, enforced_rules, findings: normalized, blocking, warnings, info, summary };
}

// ---- Receipt projection --------------------------------------------------------------------------

export interface PolicyReceiptFinding {
  finding_id: string;
  kind: FindingKind;
  title: string;
  deterministic: boolean;
  severity: MinimalChangeFinding["severity"];
  suggested_files: string[];
  evidence_uris: string[];
  // Honesty: whether the recommendation actually changed what the agent did is UNKNOWN without a
  // controlled comparison. It is always reported as null, never a fabricated boolean.
  changed_behavior: null;
}

export interface PolicyReceiptSuppression {
  finding_id: string;
  kind: FindingKind;
  actor: string;
  reason: string;
  commit: string;
  expires_at: string;
}

export interface PolicyReceiptSection {
  mode: MinimalChangeMode;
  ok: boolean;
  findings: PolicyReceiptFinding[];
  suppressed: PolicyReceiptSuppression[];
}

function projectFinding(finding: MinimalChangeFinding): PolicyReceiptFinding {
  return {
    finding_id: finding.finding_id,
    kind: finding.kind,
    title: finding.title,
    deterministic: finding.deterministic,
    severity: finding.severity,
    suggested_files: [...finding.suggested_files],
    evidence_uris: finding.evidence.map((record) => record.source_uri),
    changed_behavior: null,
  };
}

/**
 * A JSON-friendly receipt section. It deliberately contains NO "lines avoided" or savings number — the
 * guard never ran a controlled comparison, so claiming impact would be fabrication (gate honesty rule).
 */
export function policyReportReceiptSection(
  report: PolicyReport,
  suppressed: readonly { finding: MinimalChangeFinding; suppression: SuppressionRecord }[] = [],
): PolicyReceiptSection {
  return {
    mode: report.mode,
    ok: report.ok,
    findings: report.findings.map(projectFinding),
    suppressed: suppressed.map((item) => ({
      finding_id: item.finding.finding_id,
      kind: item.finding.kind,
      actor: item.suppression.actor,
      reason: item.suppression.reason,
      commit: item.suppression.commit,
      expires_at: item.suppression.expires_at,
    })),
  };
}

// ---- End-to-end builder --------------------------------------------------------------------------

export interface MinimalChangeReportInput {
  /** Raw `git diff` text for the change under review. Parsed deterministically; never re-fetched. */
  diff_text: string;
  task: PostDiffTask;
  /** The Phase B repository model, when available. `null`/absent runs only the diff-grounded rules. */
  model?: Repository | null;
  /** Extra findings computed elsewhere (e.g. Task 8 preflight recommendations). Merged in as-is. */
  preflight?: readonly MinimalChangeFinding[];
  post_diff_policy?: PostDiffPolicy;
  policy: MinimalChangePolicy;
  suppressions?: readonly SuppressionRecord[];
  /** Explicit ISO timestamp for suppression expiry checks (keeps the builder deterministic). */
  now?: string;
}

export interface MinimalChangeReport extends PolicyReport {
  task_id: string;
  enabled: boolean;
  /** finding_id → material fingerprint, so callers can author suppression records without re-deriving. */
  fingerprints: Record<string, string>;
  suppressed: Array<{ finding: MinimalChangeFinding; suppression: SuppressionRecord }>;
  receipt_section: PolicyReceiptSection;
}

/**
 * Compose a complete Minimal Change report from a diff (+ optional preflight recommendations and repo
 * model). Pure and deterministic: no git, no filesystem, no wall-clock — callers supply the diff text
 * and an explicit `now`. A disabled policy short-circuits to an empty, passing report so an opted-out
 * repository sees no findings at all.
 */
export function buildMinimalChangeReport(input: MinimalChangeReportInput): MinimalChangeReport {
  const emptyReport = (): MinimalChangeReport => ({
    ok: true,
    mode: input.policy.mode,
    enforced_rules: [...input.policy.enforced_rules],
    findings: [],
    blocking: [],
    warnings: [],
    info: [],
    summary: "Minimal Change Guard is off.",
    task_id: input.task.task_id,
    enabled: input.policy.enabled,
    fingerprints: {},
    suppressed: [],
    receipt_section: { mode: input.policy.mode, ok: true, findings: [], suppressed: [] },
  });

  if (!input.policy.enabled || input.policy.mode === "off") return emptyReport();

  const diff = parseUnifiedDiff(input.diff_text);
  const postDiffFindings = evaluateDiff({
    task: input.task,
    diff,
    model: input.model ?? null,
    policy: input.post_diff_policy ?? DEFAULT_POST_DIFF_POLICY,
  });

  // Merge preflight recommendations (Task 8) ahead of post-diff findings, de-duplicated by finding_id so
  // the same recommendation never appears twice. Everything is normalized on the way in.
  const merged: MinimalChangeFinding[] = [];
  const seenIds = new Set<string>();
  for (const finding of [...(input.preflight ?? []), ...postDiffFindings]) {
    const normal = normalizeFinding(finding);
    if (seenIds.has(normal.finding_id)) continue;
    seenIds.add(normal.finding_id);
    merged.push(normal);
  }

  const fingerprints: Record<string, string> = {};
  for (const finding of merged) fingerprints[finding.finding_id] = fingerprintFinding(finding);

  const now = input.now ?? "1970-01-01T00:00:00.000Z";
  const { active, suppressed } = applySuppressions(merged, input.suppressions ?? [], now);

  const report = policyReport(active, { mode: input.policy.mode, enforced_rules: input.policy.enforced_rules });
  const receipt_section = policyReportReceiptSection(report, suppressed);

  return {
    ...report,
    task_id: input.task.task_id,
    enabled: true,
    fingerprints,
    suppressed,
    receipt_section,
  };
}

// A stable content hash of a report's material findings, for callers that want to compare two reports
// (e.g. "did this diff introduce a new finding?") without diffing prose. Deterministic and order-stable.
export function reportFingerprint(report: PolicyReport): string {
  const material = report.findings
    .map((finding) => fingerprintFinding(finding))
    .sort();
  return createHash("sha256").update(JSON.stringify(material), "utf8").digest("hex");
}
