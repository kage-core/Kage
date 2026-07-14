import {
  kageRisk as legacyKageRisk,
  kageTeammateBrief as legacyKageTeammateBrief,
  packetVerificationLabel as legacyPacketVerificationLabel,
  recall as legacyRecall,
  type KageRiskReport,
  type MemoryPacket,
  type RecallResult,
} from "../../kernel.js";
import type { CapsuleSection } from "../protocol/index.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";

export interface LegacyPacket {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  scope: string;
  status: string;
  paths: string[];
  // Optional on purpose: packets written by older kernels (or hand-edited on disk) can be
  // missing these entirely. Every read here goes through `?? {}`.
  quality?: Record<string, unknown>;
  freshness?: Record<string, unknown>;
}

export type LegacyVerificationLabel = "verified" | "unverified" | "stale";

interface LegacyRecallResult {
  results: Array<{ packet: LegacyPacket; score: number }>;
  suppressed?: Array<{ id: string; title: string; reason: string }>;
}

interface LegacyRiskReport {
  targets: Record<string, { target: string; risk_summary: string }>;
}

interface LegacyVerificationContract {
  focus_files: string[];
  related_tests: Array<{ test_path: string; title: string; covers: string | null }>;
  test_gap_files: string[];
  required_actions: string[];
}

interface LegacyTeammateBrief {
  verification_contract: LegacyVerificationContract;
}

export interface LegacyKernelFunctions {
  recall(projectDir: string, query: string, limit: number): LegacyRecallResult;
  kageRisk(projectDir: string, targets: string[], changedFiles: string[]): LegacyRiskReport;
  kageTeammateBrief(projectDir: string, options: {
    query: string;
    targets: string[];
    changedFiles: string[];
    recallResult?: LegacyRecallResult;
    riskResult?: LegacyRiskReport;
  }): LegacyTeammateBrief;
  // The kernel's only real verification signal. Routed through the seam so trust has a
  // single source of truth and tests can fake it.
  packetVerificationLabel(packet: LegacyPacket): LegacyVerificationLabel;
}

const DEFAULT_KERNEL: LegacyKernelFunctions = {
  // The kernel results are returned as-is (they are structurally LegacyRecallResult /
  // LegacyRiskReport) so find() can forward them to kageTeammateBrief instead of making the
  // kernel recompute recall and risk.
  recall(projectDir, query, limit) {
    return legacyRecall(projectDir, query, limit);
  },
  kageRisk(projectDir, targets, changedFiles) {
    return legacyKageRisk(projectDir, targets, changedFiles);
  },
  kageTeammateBrief(projectDir, options) {
    const result = legacyKageTeammateBrief(projectDir, {
      query: options.query,
      targets: options.targets,
      changedFiles: options.changedFiles,
      // Under this kernel the seam values are the kernel's own results; the cast restores
      // the concrete types the narrow seam deliberately forgets.
      recallResult: options.recallResult as RecallResult | undefined,
      riskResult: options.riskResult as KageRiskReport | undefined,
    });
    return { verification_contract: result.verification_contract };
  },
  packetVerificationLabel(packet) {
    return legacyPacketVerificationLabel(packet as MemoryPacket);
  },
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function positiveNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function disputedOrStale(packet: LegacyPacket): boolean {
  const quality = packet.quality ?? {};
  const freshness = packet.freshness ?? {};
  const reports = quality.reports;
  const feedback = quality.feedback;
  return quality.stale === true
    || freshness.stale === true
    || quality.disputed === true
    || quality.rejected === true
    || quality.wrong === true
    || positiveNumber(quality.reports_stale)
    || positiveNumber(quality.votes_down)
    || positiveNumber(quality.wrong_votes)
    || (Array.isArray(quality.contradicts) && quality.contradicts.length > 0)
    || (typeof reports === "object" && reports !== null && positiveNumber((reports as Record<string, unknown>).stale))
    || (Array.isArray(feedback) && feedback.some((item) => item === "wrong" || item === "stale" || item === "disputed"));
}

function trustedRepoPacket(packet: LegacyPacket): boolean {
  return packet.status === "approved"
    && packet.scope === "repo"
    && packet.id.trim().length > 0
    && packet.title.trim().length > 0
    && packet.summary.trim().length > 0
    && !disputedOrStale(packet);
}

function packetKind(type: string): CapsuleSection["kind"] {
  switch (type) {
    case "convention":
    case "policy":
    case "constraint":
    case "gotcha":
    case "negative_result":
      return "invariant";
    case "decision":
    case "rationale":
      return "decision";
    case "runbook":
    case "workflow":
      return "runbook";
    case "repo_map":
    case "reference":
      return "orientation";
    default:
      return "feature";
  }
}

// Trust follows the kernel label, not fields nobody writes: "verified" means an evidence
// check actually verified the claim, "stale" means the packet must not be emitted at all,
// and everything else is approved-but-unverified.
function memoryCandidate(
  entry: LegacyRecallResult["results"][number],
  label: LegacyVerificationLabel,
): ContextCandidate | undefined {
  if (label === "stale") return undefined;
  if (!trustedRepoPacket(entry.packet)) return undefined;
  return {
    candidate_id: `memory:${entry.packet.id}`,
    kind: packetKind(entry.packet.type),
    title: entry.packet.title,
    body: entry.packet.summary,
    evidence_ids: [entry.packet.id],
    trust_state: label === "verified" ? "verified" : "approved",
    priority: Number.isFinite(entry.score) ? entry.score : 0,
  };
}

function verificationCandidate(contract: LegacyVerificationContract): ContextCandidate | undefined {
  const testPaths = unique(contract.related_tests.map((test) => test.test_path));
  const evidenceIds = unique([...testPaths, ...contract.focus_files, ...contract.test_gap_files]);
  const actions = unique(contract.required_actions);
  if (!evidenceIds.length || (!testPaths.length && !actions.length)) return undefined;
  const body = [
    ...(testPaths.length ? [`Related tests: ${testPaths.join(", ")}.`] : []),
    ...(actions.length ? [`Required actions: ${actions.join(" ")}`] : []),
  ].join("\n");
  return {
    candidate_id: "verification:legacy-contract",
    kind: "verification",
    title: "Verification contract",
    body,
    evidence_ids: evidenceIds,
    trust_state: "verified",
    priority: 80,
  };
}

function riskCandidates(
  report: LegacyRiskReport,
  changedFiles: ReadonlySet<string>,
): ContextCandidate[] {
  return Object.values(report.targets)
    .filter((target) => target.target.trim() && target.risk_summary.trim())
    .sort((left, right) => left.target < right.target ? -1 : left.target > right.target ? 1 : 0)
    .map((target) => ({
      candidate_id: `risk:${target.target}`,
      kind: changedFiles.has(target.target) ? "minimal_change" : "entry_point",
      title: `Target context: ${target.target}`,
      body: target.risk_summary,
      evidence_ids: [target.target],
      trust_state: "verified",
      priority: 70,
    }));
}

export class LegacyContextSource implements ContextSource {
  constructor(
    private readonly projectDir: string,
    private readonly kernel: LegacyKernelFunctions = DEFAULT_KERNEL,
  ) {}

  // `async` in signature only: recall, kageRisk (which can fall back to a full code-graph
  // build) and kageTeammateBrief are synchronous kernel calls that occupy the runtime's
  // single event loop for their whole duration. They cannot be preempted by a timeout, so
  // the caller's protection is the input caps enforced in validateContextRequest — see the
  // Phase A limitation recorded there.
  async find(request: ContextRequest): Promise<ContextCandidate[]> {
    const recallResult = this.kernel.recall(this.projectDir, request.query, 12);
    const targets = unique([...request.targets, ...request.changed_files]);
    const riskResult = this.kernel.kageRisk(this.projectDir, targets, request.changed_files);
    const brief = this.kernel.kageTeammateBrief(this.projectDir, {
      query: request.query,
      targets: request.targets,
      changedFiles: request.changed_files,
      // Reuse what we already computed: the kernel needs these to produce memory warnings
      // and risk-derived test gaps, and recomputing them would double the synchronous cost.
      recallResult,
      riskResult,
    });
    const memories = recallResult.results
      .map((entry) => memoryCandidate(entry, this.kernel.packetVerificationLabel(entry.packet)))
      .filter((candidate): candidate is ContextCandidate => candidate !== undefined);
    const verification = verificationCandidate(brief.verification_contract);
    return [
      ...memories,
      ...(verification ? [verification] : []),
      ...riskCandidates(riskResult, new Set(request.changed_files)),
    ];
  }
}
