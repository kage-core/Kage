import {
  kageRisk as legacyKageRisk,
  kageTeammateBrief as legacyKageTeammateBrief,
  recall as legacyRecall,
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
  quality: Record<string, unknown>;
  freshness?: Record<string, unknown>;
}

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
  }): LegacyTeammateBrief;
}

const DEFAULT_KERNEL: LegacyKernelFunctions = {
  recall(projectDir, query, limit) {
    const result = legacyRecall(projectDir, query, limit);
    return {
      results: result.results.map((entry) => ({ packet: entry.packet, score: entry.score })),
      suppressed: result.suppressed,
    };
  },
  kageRisk(projectDir, targets, changedFiles) {
    const result = legacyKageRisk(projectDir, targets, changedFiles);
    return {
      targets: Object.fromEntries(Object.entries(result.targets).map(([path, target]) => [
        path,
        { target: target.target, risk_summary: target.risk_summary },
      ])),
    };
  },
  kageTeammateBrief(projectDir, options) {
    const result = legacyKageTeammateBrief(projectDir, options);
    return { verification_contract: result.verification_contract };
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

function packetTrust(packet: LegacyPacket): ContextCandidate["trust_state"] {
  return packet.quality.verified === true || packet.quality.verification_status === "verified"
    ? "verified"
    : "approved";
}

function memoryCandidate(entry: LegacyRecallResult["results"][number]): ContextCandidate | undefined {
  if (!trustedRepoPacket(entry.packet)) return undefined;
  return {
    candidate_id: `memory:${entry.packet.id}`,
    kind: packetKind(entry.packet.type),
    title: entry.packet.title,
    body: entry.packet.summary,
    evidence_ids: [entry.packet.id],
    trust_state: packetTrust(entry.packet),
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

  async find(request: ContextRequest): Promise<ContextCandidate[]> {
    const recallResult = this.kernel.recall(this.projectDir, request.query, 12);
    const targets = unique([...request.targets, ...request.changed_files]);
    const riskResult = this.kernel.kageRisk(this.projectDir, targets, request.changed_files);
    const brief = this.kernel.kageTeammateBrief(this.projectDir, {
      query: request.query,
      targets: request.targets,
      changedFiles: request.changed_files,
    });
    const memories = recallResult.results
      .map(memoryCandidate)
      .filter((candidate): candidate is ContextCandidate => candidate !== undefined);
    const verification = verificationCandidate(brief.verification_contract);
    return [
      ...memories,
      ...(verification ? [verification] : []),
      ...riskCandidates(riskResult, new Set(request.changed_files)),
    ];
  }
}
