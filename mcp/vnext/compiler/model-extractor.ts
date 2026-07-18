import type { EvidenceEvent } from "../protocol/index.js";
import type { EntityKind, ImpactClass } from "../repo-model/types.js";
import { isRecord } from "../../type-guards.js";
import {
  buildModelProcessingReceipt,
  type ModelProcessingReceipt,
  type ModelProcessingStatus,
} from "../measurement/receipt.js";
import {
  candidateId,
  eventEvidenceId,
  impactFor,
  reviewPolicyFor,
  type ClaimCandidate,
  type EpisodeContext,
} from "./candidates.js";
import type {
  ModelExtractionProvider,
  ModelExtractionRequest,
  ModelExtractionResponse,
} from "./model-provider.js";

export type {
  ModelExtractionProvider,
  ModelExtractionRequest,
  ModelExtractionResponse,
} from "./model-provider.js";

/**
 * Provider-neutral model extraction in SHADOW MODE.
 *
 * The compiler hands a redacted, metadata-level episode summary and a fixed allowlist of stable
 * evidence ids to an injected provider, and gets back a proposal. This module is the honesty gate on
 * that proposal. It never trusts a model:
 *
 *   1. Redaction. Secrets, bearer tokens, and basic-auth URLs are stripped from anything the provider
 *      sees. Raw tool output and source snippets are never included at all — only whitelisted,
 *      metadata-level fields (a prompt's text, a command, a path).
 *   2. Strict validation. Every returned entity kind must be in the allowlist; every cited evidence
 *      id must be a real event id from this episode; every claim must name a declared entity. Anything
 *      else is rejected with a reason — the model cannot invent evidence or entities.
 *   3. Trust flooring. Every surviving candidate is `proposed` with `extraction_method: "model"`. A
 *      model can never auto-verify and never auto-inject; admission (admission.ts) would floor it to
 *      `proposed` anyway, but we do not even offer it a higher state.
 *   4. Fail-open. A provider that throws, times out, or returns garbage yields zero candidates and a
 *      status-tagged receipt. Deterministic compilation is completely unaffected.
 *
 * Every consultation produces a ModelProcessingReceipt recording provider/model, measured tokens and
 * cost (or null — never a fabricated zero), latency, accepted/rejected counts, and redaction count.
 */

const DEFAULT_MAX_CANDIDATES = 16;

// The runtime allowlist of entity kinds. Mirrors the EntityKind union in repo-model/types.ts; a model
// may only ever name one of these. Kept as a Set for O(1) validation.
const ALL_ENTITY_KINDS: ReadonlySet<EntityKind> = new Set<EntityKind>([
  "repository",
  "feature",
  "component",
  "flow",
  "contract",
  "data_model",
  "invariant",
  "runbook",
  "decision",
  "incident",
  "owner",
  "dependency",
  "test_surface",
]);

const VALID_IMPACT: ReadonlySet<ImpactClass> = new Set<ImpactClass>(["low", "medium", "high", "critical"]);

export interface ModelExtractionOptions {
  /** Hard ceiling on kept candidates. Default 16. */
  max_candidates?: number;
  /** Entity kinds the provider is allowed to declare. Default: all kinds. */
  allowed_entity_kinds?: EntityKind[];
  /** The model identifier to record on the receipt. Default null. */
  model?: string | null;
  /** Monotonic millisecond clock, injectable for deterministic latency in tests. Default Date.now. */
  clock?: () => number;
}

export interface ModelExtractionResult {
  candidates: ClaimCandidate[];
  rejections: string[];
  receipt: ModelProcessingReceipt;
}

const PLACEHOLDER = "[REDACTED]";

// Secret signatures. Anything matching is replaced with [REDACTED] before it can reach a provider.
// These are deliberately conservative: over-redaction is safe, a leaked secret is not.
const REDACTION_PATTERNS: RegExp[] = [
  // Bearer / token headers with their value.
  /[Bb]earer\s+[A-Za-z0-9._~+/=-]+/g,
  // Common provider key shapes.
  /\b(?:sk|pk|rk)-[A-Za-z0-9]{6,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{6,}/g,
  // PEM private-key blocks.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  // Basic-auth credentials embedded in a URL (user:pass@host).
  /\b[A-Za-z0-9._%+-]+:[^\s@/]+@[A-Za-z0-9.-]+/g,
  // `secret=…`, `token: …`, `api_key=…` and friends.
  /\b[\w-]*(?:secret|token|password|passwd|api[_-]?key)[\w-]*\s*[:=]\s*[^\s"']+/gi,
];

/**
 * Strip secrets from a string and count how many were removed. Idempotent: an already-redacted
 * placeholder is never re-matched (so re-running does not inflate the count).
 */
export function redactSecrets(text: string): { text: string; redactions: number } {
  let redactions = 0;
  let out = text;
  for (const pattern of REDACTION_PATTERNS) {
    out = out.replace(pattern, (match) => {
      if (match.includes(PLACEHOLDER)) return match;
      redactions += 1;
      return PLACEHOLDER;
    });
  }
  return { text: out, redactions };
}

// The only payload fields the summary may read, by event type. Raw tool output (stdout/stderr) and
// arbitrary payload blobs are deliberately excluded — only metadata-level fields cross the seam.
function metadataLine(event: EvidenceEvent): string | null {
  const p = event.payload;
  switch (event.event_type) {
    case "prompt":
      return typeof p.text === "string" ? `prompt: ${p.text}` : "prompt";
    case "tool_result": {
      const command = typeof p.command === "string" ? p.command : null;
      const exit = typeof p.exit_code === "number" ? ` (exit ${p.exit_code})` : "";
      return command ? `command: ${command}${exit}` : `tool_result${exit}`;
    }
    case "file_edit":
      return typeof p.path === "string" ? `edited: ${p.path}` : "file_edit";
    case "file_open":
      return typeof p.path === "string" ? `opened: ${p.path}` : "file_open";
    case "session_start":
    case "session_end":
      return null;
    default:
      return null;
  }
}

/**
 * Build the redacted, metadata-level summary the provider will see, and the number of redactions
 * applied. Deterministic: a pure function of the episode and its events, in event order.
 */
function buildRedactedSummary(context: EpisodeContext): { summary: string; redactions: number } {
  const { episode, events } = context;
  const header = `episode ${episode.episode_type} outcome=${episode.outcome} events=${events.length}`;
  const lines = [header];
  for (const event of events) {
    const line = metadataLine(event);
    if (line !== null) lines.push(`- ${line}`);
  }
  const redacted = redactSecrets(lines.join("\n"));
  return { summary: redacted.text, redactions: redacted.redactions };
}

function isModelExtractionResponse(value: unknown): value is ModelExtractionResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value.entities) && Array.isArray(value.claims);
}

interface RawEntity {
  kind: unknown;
  name: unknown;
}

interface RawClaim {
  entity_name: unknown;
  claim_kind: unknown;
  content: unknown;
  evidence_event_ids: unknown;
  impact_class: unknown;
}

/**
 * Run one shadow-mode model consultation. Never throws: a provider failure or an invalid response is
 * captured as a fail-open receipt with zero candidates.
 */
export async function extractWithModel(
  context: EpisodeContext,
  provider: ModelExtractionProvider,
  options: ModelExtractionOptions = {},
): Promise<ModelExtractionResult> {
  const clock = options.clock ?? Date.now;
  const maxCandidates = Math.max(0, Math.floor(options.max_candidates ?? DEFAULT_MAX_CANDIDATES));
  const allowedKinds = new Set<EntityKind>(options.allowed_entity_kinds ?? [...ALL_ENTITY_KINDS]);

  const { summary, redactions } = buildRedactedSummary(context);
  const allowedEventIds = new Set(context.events.map((e) => e.event_id));
  const eventById = new Map(context.events.map((e) => [e.event_id, e] as const));

  const request: ModelExtractionRequest = {
    repository_id: context.episode.repository_id,
    episode_id: context.episode.episode_id,
    redacted_summary: summary,
    allowed_event_ids: [...allowedEventIds],
    allowed_entity_kinds: [...allowedKinds],
    max_candidates: maxCandidates,
  };

  const started = clock();

  const receiptBase = {
    repository_id: context.episode.repository_id,
    episode_id: context.episode.episode_id,
    provider: provider.provider_id,
    model: options.model ?? null,
    redaction_count: redactions,
  };

  const failOpen = (
    status: ModelProcessingStatus,
    rejection: string,
    usage: { input_tokens: number | null; output_tokens: number | null; cost_usd: number | null },
  ): ModelExtractionResult => ({
    candidates: [],
    rejections: [rejection],
    receipt: buildModelProcessingReceipt({
      ...receiptBase,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_usd: usage.cost_usd,
      latency_ms: clock() - started,
      accepted: 0,
      rejected: 0,
      status,
    }),
  });

  let outcome: Awaited<ReturnType<ModelExtractionProvider["extract"]>>;
  try {
    outcome = await provider.extract(request);
  } catch (error) {
    // Fail-open: a provider error leaves deterministic compilation entirely unchanged.
    return failOpen("provider_error", `provider extraction failed: ${(error as Error).message}`, {
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
    });
  }

  const usage = {
    input_tokens: outcome.input_tokens,
    output_tokens: outcome.output_tokens,
    cost_usd: outcome.cost_usd,
  };

  if (!isModelExtractionResponse(outcome.response)) {
    return failOpen("invalid_response", "provider response is not a valid extraction envelope", usage);
  }

  const response = outcome.response;

  // Declared entities → kind, validated against the allowlist. An out-of-allowlist kind removes the
  // entity, so any claim naming it is later rejected as undeclared.
  const declaredKind = new Map<string, EntityKind>();
  const rejections: string[] = [];
  for (const raw of response.entities as RawEntity[]) {
    if (typeof raw?.name !== "string" || raw.name.trim() === "") {
      rejections.push("entity with no name rejected");
      continue;
    }
    if (typeof raw.kind !== "string" || !allowedKinds.has(raw.kind as EntityKind)) {
      rejections.push(`entity "${raw.name}" has disallowed entity kind "${String(raw.kind)}"`);
      continue;
    }
    declaredKind.set(raw.name, raw.kind as EntityKind);
  }

  const candidates: ClaimCandidate[] = [];
  const seen = new Set<string>();

  for (const raw of response.claims as RawClaim[]) {
    if (candidates.length >= maxCandidates) break;

    const entityName = typeof raw?.entity_name === "string" ? raw.entity_name : "";
    const claimKind = typeof raw?.claim_kind === "string" ? raw.claim_kind : "";
    const content = typeof raw?.content === "string" ? raw.content : "";
    const evidenceEventIds = Array.isArray(raw?.evidence_event_ids)
      ? raw.evidence_event_ids.filter((id): id is string => typeof id === "string")
      : [];

    // 1. Evidence must be real. Checked FIRST so an invented evidence id is always the reported reason.
    const unknownEvidence = evidenceEventIds.find((id) => !allowedEventIds.has(id));
    if (evidenceEventIds.length === 0) {
      rejections.push(`claim "${claimKind}" on "${entityName}" has no evidence`);
      continue;
    }
    if (unknownEvidence !== undefined) {
      rejections.push(`unknown evidence_event_id "${unknownEvidence}"`);
      continue;
    }

    // 2. The claim must name a declared, allowed entity — a model cannot invent an entity.
    const kind = declaredKind.get(entityName);
    if (kind === undefined) {
      rejections.push(`claim references undeclared entity "${entityName}"`);
      continue;
    }

    // 3. Claim body must be non-empty prose.
    if (content.trim() === "" || claimKind.trim() === "") {
      rejections.push(`claim on "${entityName}" is missing content or kind`);
      continue;
    }

    const impact: ImpactClass = VALID_IMPACT.has(raw.impact_class as ImpactClass)
      ? (raw.impact_class as ImpactClass)
      : impactFor(kind);

    const id = candidateId({
      repository_id: context.episode.repository_id,
      entity_kind: kind,
      entity_name: entityName,
      claim_kind: claimKind,
      content,
    });
    if (seen.has(id)) continue;
    seen.add(id);

    const evidenceIds = evidenceEventIds.map((eventId) => eventEvidenceId(eventById.get(eventId)!));

    candidates.push({
      candidate_id: id,
      repository_id: context.episode.repository_id,
      entity_kind: kind,
      entity_name: entityName,
      claim_kind: claimKind,
      content,
      evidence_ids: evidenceIds,
      // A model proposal is never self-verifying. Shadow mode PROPOSES; it never injects.
      proposed_trust_state: "proposed",
      impact_class: impact,
      extraction_method: "model",
      review_policy: reviewPolicyFor(kind),
    });
  }

  return {
    candidates,
    rejections,
    receipt: buildModelProcessingReceipt({
      ...receiptBase,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_usd: usage.cost_usd,
      latency_ms: clock() - started,
      accepted: candidates.length,
      rejected: rejections.length,
      status: "ok",
    }),
  };
}
