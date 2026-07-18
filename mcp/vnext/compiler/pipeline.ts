import { createHash } from "node:crypto";

import type { EvidenceEvent } from "../protocol/index.js";
import type { LocalDatabase } from "../storage/database.js";
import type { EventStore } from "../storage/event-store.js";
import type { Repository, EvidenceLink } from "../repo-model/repository.js";
import type {
  ClaimRecord,
  EvidenceRecord,
  ReviewItemRecord,
} from "../repo-model/types.js";
import type { IndexedFact, RepositoryIndexSource, RepositorySnapshot } from "../repo-index/source.js";
import { buildEpisodes, persistEpisodes } from "./episode-builder.js";
import {
  eventEvidenceId,
  factEvidenceId,
  type ClaimCandidate,
  type EpisodeContext,
} from "./candidates.js";
import { extractCommandCandidates } from "./extractors/command.js";
import { extractChangeCandidates } from "./extractors/change.js";
import { extractFailureCandidates } from "./extractors/failure.js";
import { extractRepositoryCandidates } from "./extractors/repository.js";
import { admitCandidate } from "./admission.js";
import { consolidate } from "./consolidator.js";
import { EntityResolver, slugify, type EntityAnchor, type EvidenceAnchorInput } from "./entity-resolver.js";

/**
 * The repository knowledge compiler pipeline.
 *
 * It turns the append-only evidence log into repository claims through the deterministic stages built
 * in Tasks 4–7 — episodes → extraction → entity resolution → admission → consolidation — and writes
 * the results through the Repository API, which owns every honesty gate. The compiler NEVER injects:
 * it proposes, and only the store's own gate (verified/approved) decides what is ever injectable.
 *
 * Replay-idempotent by construction: episode ids, candidate ids, entity ids, and claim ids are all
 * content-derived, evidence rows dedupe on their natural key, and a re-run of the same events lands
 * every candidate back in the slot it already occupies (consolidation refreshes rather than
 * re-creating). A checkpoint records the last consumed event so status can report compilation lag; it
 * is an OPTIMIZATION for reporting, not the correctness mechanism — idempotency does not depend on it.
 *
 * Fail-open: a candidate whose declared trust cannot be grounded in verified evidence is written
 * `proposed` (non-injectable), never forced to `verified`. Nothing here presents an estimate as a
 * measurement.
 */

export const REPOSITORY_COMPILER_NAME = "repository-compiler" as const;

export interface PipelineOptions {
  model: Repository;
  events: EventStore;
  // Optional source of a deterministic repository snapshot (code-graph facts). When present, the
  // repository extractor runs and structural facts can ground verified claims. When absent, the
  // compiler works from events alone and nothing auto-verifies.
  snapshotSource?: RepositoryIndexSource | null;
  // Injectable clock for deterministic timestamps in tests. Defaults to wall-clock ISO.
  now?: () => string;
}

export interface PipelineRunResult {
  episodes: number;
  candidates: number;
  claims_created: number;
  claims_refreshed: number;
  claims_superseded: number;
  reviews_opened: number;
  rejected: number;
  last_event_id: string | null;
}

function emptyResult(): PipelineRunResult {
  return {
    episodes: 0,
    candidates: 0,
    claims_created: 0,
    claims_refreshed: 0,
    claims_superseded: 0,
    reviews_opened: 0,
    rejected: 0,
    last_event_id: null,
  };
}

export class Pipeline {
  readonly model: Repository;
  private readonly events: EventStore;
  private readonly snapshotSource: RepositoryIndexSource | null;
  private readonly now: () => string;

  constructor(options: PipelineOptions) {
    this.model = options.model;
    this.events = options.events;
    this.snapshotSource = options.snapshotSource ?? null;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async run(repositoryId: string): Promise<PipelineRunResult> {
    const events = this.events.forRepository(repositoryId);
    if (events.length === 0) {
      // Honest empty run: no episodes, no claims, and a null checkpoint cursor — never a fabricated id.
      this.model.setCheckpoint(REPOSITORY_COMPILER_NAME, repositoryId, null, this.now());
      return emptyResult();
    }

    const snapshot = this.snapshotSource ? await this.snapshotSource.scan() : undefined;
    const result = compileEvents(this.model, events, repositoryId, snapshot, this.now);

    // The last event in the repository's stable (occurred_at, event_id) order becomes the checkpoint
    // cursor. `forRepository` already returns that order, so the last row is the cursor.
    const lastEventId = events[events.length - 1].event_id;
    this.model.setCheckpoint(REPOSITORY_COMPILER_NAME, repositoryId, lastEventId, this.now());
    result.last_event_id = lastEventId;
    return result;
  }
}

/**
 * Synchronous compile of a repository's events into claims. Exposed for a runtime scheduler that wants
 * to advance compilation off the request path without the async snapshot step; the async `Pipeline`
 * wraps it. Does NOT write the checkpoint — the caller owns cursor advancement.
 */
export function compileEvents(
  model: Repository,
  events: readonly EvidenceEvent[],
  repositoryId: string,
  snapshot: RepositorySnapshot | undefined,
  now: () => string,
): PipelineRunResult {
  const result = emptyResult();
  if (events.length === 0) return result;

  const episodes = buildEpisodes([...events]);
  persistEpisodes(model.database, episodes);
  result.episodes = episodes.length;

  // Index events by id so each episode can be handed the payloads (commands, paths) its extractors need.
  const eventsById = new Map<string, EvidenceEvent>();
  for (const event of events) eventsById.set(event.event_id, event);

  // Evidence materialization map: every candidate references evidence by a deterministic id
  // (evidence:event:* / evidence:fact:*). Build the backing rows once so we can insert exactly the
  // ones a surviving candidate cites.
  const evidenceById = new Map<string, EvidenceRecord>();
  for (const event of events) {
    const record = evidenceFromEvent(event);
    evidenceById.set(record.evidence_id, record);
  }
  const facts = snapshot ? snapshot.facts : [];
  for (const fact of facts) {
    const record = evidenceFromFact(fact, repositoryId, now());
    evidenceById.set(record.evidence_id, record);
  }

  // Gather candidates deterministically: repository facts first, then per-episode extraction.
  const candidates: ClaimCandidate[] = [];
  if (snapshot) candidates.push(...extractRepositoryCandidates(snapshot));
  for (const episode of episodes) {
    const context: EpisodeContext = {
      episode,
      events: episode.event_ids.map((id) => eventsById.get(id)).filter((e): e is EvidenceEvent => Boolean(e)),
    };
    candidates.push(...extractCommandCandidates(context, snapshot));
    candidates.push(...extractChangeCandidates(context));
    candidates.push(...extractFailureCandidates(context));
  }
  // Stable processing order so consolidation decisions never depend on extractor ordering.
  candidates.sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
  result.candidates = candidates.length;

  // Seed the resolver with the repository's existing entities so a re-run folds onto the same ids.
  const seeds: EntityAnchor[] = model.listEntities(repositoryId).map((entity) => ({
    entity_id: entity.entity_id,
    kind: entity.kind,
    canonical_name: entity.canonical_name,
    slug: entity.slug,
  }));
  const resolver = new EntityResolver(repositoryId, seeds);

  for (const candidate of candidates) {
    writeCandidate(model, candidate, resolver, evidenceById, now, result);
  }
  return result;
}

function writeCandidate(
  model: Repository,
  candidate: ClaimCandidate,
  resolver: EntityResolver,
  evidenceById: Map<string, EvidenceRecord>,
  now: () => string,
  result: PipelineRunResult,
): void {
  const admission = admitCandidate(candidate);
  if (!admission.admit) {
    result.rejected += 1;
    return;
  }

  // Resolve the entity using ground-truth code anchors drawn from the candidate's evidence.
  const anchors: EvidenceAnchorInput[] = candidate.evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((e): e is EvidenceRecord => Boolean(e))
    .map((e) => ({ path: e.path, symbol: e.symbol }));
  const resolution = resolver.resolve(candidate.entity_kind, candidate.entity_name, anchors);

  const timestamp = now();
  if (resolution.created) {
    // A minted entity is inserted once; a matched entity already exists (inserting its id would
    // conflict, and the resolver already keyed on kind+slug so a slug collision cannot reach here).
    model.upsertEntity({
      entity_id: resolution.entity_id,
      repository_id: candidate.repository_id,
      kind: candidate.entity_kind,
      canonical_name: candidate.entity_name,
      slug: slugify(candidate.entity_name),
      summary: "",
      status: "active",
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  // Materialize exactly the evidence this candidate cites, and build supporting links.
  const links: EvidenceLink[] = [];
  let hasVerifiedSupport = false;
  for (const evidenceId of candidate.evidence_ids) {
    const record = evidenceById.get(evidenceId);
    if (!record) continue; // A citation with no backing row is dropped rather than invented.
    model.addEvidence(record);
    links.push({ evidence_id: evidenceId, stance: "supports" });
    if (record.verification_state === "verified") hasVerifiedSupport = true;
  }

  // Honesty floor: admission may permit `verified`, but the store only persists a verified claim when
  // a verified supporting evidence row backs it. If none survived materialization, drop to proposed
  // rather than let createClaim reject — an unbacked claim is never presented as measured.
  let trust = admission.trust_state;
  if (trust === "verified" && !hasVerifiedSupport) trust = "proposed";
  const confidence = trust === "verified" ? 1 : 0.5;

  const existing = model.currentClaimInSlot(resolution.entity_id, candidate.claim_kind);
  const action = consolidate(existing, candidate);

  switch (action.action) {
    case "create": {
      model.createClaim(
        buildClaim(resolution.entity_id, candidate, trust, confidence, admission.review_policy, timestamp, null),
        links,
      );
      result.claims_created += 1;
      return;
    }
    case "refresh_evidence": {
      // Same fact restated: keep the claim, re-link evidence, never touch trust.
      model.attachEvidence(action.claim_id, links);
      result.claims_refreshed += 1;
      return;
    }
    case "review_contradiction": {
      // Opposing supported facts are never silently merged — route to review, idempotently.
      openReview(
        model,
        action.claim_id,
        candidate.repository_id,
        admission.review_policy,
        "a compiled candidate contradicts the current claim in this slot",
        timestamp,
        result,
      );
      return;
    }
    case "supersede": {
      // A genuinely different fact in the slot. Never let an UNVERIFIED candidate retire a currently
      // injectable claim on its own say-so: that would drop trusted knowledge for an unproven guess.
      // Route those to review; supersede only when the replacement is at least as trustworthy.
      const existingInjectable = existing
        ? existing.trust_state === "verified" || existing.trust_state === "approved"
        : false;
      const replacementInjectable = trust === "verified";
      if (existingInjectable && !replacementInjectable) {
        openReview(
          model,
          action.claim_id,
          candidate.repository_id,
          admission.review_policy,
          "an unverified compiled candidate would replace a trusted claim",
          timestamp,
          result,
        );
        return;
      }
      model.supersedeClaim(
        action.claim_id,
        buildClaim(resolution.entity_id, candidate, trust, confidence, admission.review_policy, timestamp, action.claim_id),
        links,
      );
      result.claims_superseded += 1;
      return;
    }
  }
}

function buildClaim(
  entityId: string,
  candidate: ClaimCandidate,
  trust: ClaimRecord["trust_state"],
  confidence: number,
  reviewPolicy: ClaimRecord["review_policy"],
  timestamp: string,
  supersedesClaimId: string | null,
): ClaimRecord {
  return {
    claim_id: claimId(entityId, candidate.claim_kind, candidate.content),
    entity_id: entityId,
    claim_kind: candidate.claim_kind,
    normalized_content: candidate.content,
    trust_state: trust,
    confidence,
    impact_class: candidate.impact_class,
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: supersedesClaimId,
    review_policy: reviewPolicy,
    created_by: "compiler",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// Open a review item idempotently: a replay must not throw on a duplicate, so an existing item with
// the same deterministic id is a no-op.
function openReview(
  model: Repository,
  claimId: string,
  repositoryId: string,
  requiredRole: ReviewItemRecord["required_role"],
  reason: string,
  timestamp: string,
  result: PipelineRunResult,
): void {
  const reviewId = `review-${digest(`${claimId} ${reason}`)}`;
  if (model.reviewItemsForClaim(claimId).some((item) => item.review_item_id === reviewId)) return;
  model.createReviewItem({
    review_item_id: reviewId,
    repository_id: repositoryId,
    claim_id: claimId,
    reason,
    required_role: requiredRole,
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: timestamp,
  });
  result.reviews_opened += 1;
}

// ── Evidence materialization ─────────────────────────────────────────────────

function evidenceFromEvent(event: EvidenceEvent): EvidenceRecord {
  const path = typeof event.payload.path === "string" ? event.payload.path : null;
  const symbol = typeof event.payload.symbol === "string" ? event.payload.symbol : null;
  return {
    evidence_id: eventEvidenceId(event),
    repository_id: event.repository_id,
    // An agent event is a historical observation, not a re-checkable ground-truth verification.
    source_type: "agent_event",
    source_uri: `event:${event.event_id}`,
    source_fingerprint: event.source_fingerprint,
    commit: null,
    path,
    symbol,
    line_start: null,
    line_end: null,
    // Not a verification method: a past event cannot be re-verified against current ground truth, so
    // it can never, on its own, carry a claim to `verified`.
    verification_method: "agent_event",
    verification_state: "unavailable",
    privacy_class: event.privacy_class,
    observed_at: event.occurred_at,
  };
}

function evidenceFromFact(fact: IndexedFact, repositoryId: string, observedAt: string): EvidenceRecord {
  const sourceType: EvidenceRecord["source_type"] =
    fact.kind === "owner" ? "git" : fact.kind === "document" ? "document" : "source";
  const verificationMethod =
    fact.kind === "symbol"
      ? "symbol_fingerprint"
      : fact.kind === "document"
        ? "document_anchor"
        : fact.kind === "owner"
          ? "git_commit"
          : "source_fingerprint";
  return {
    evidence_id: factEvidenceId(fact),
    repository_id: repositoryId,
    source_type: sourceType,
    source_uri: `fact:${fact.fact_id}`,
    source_fingerprint: fact.fingerprint,
    commit: null,
    path: fact.path || null,
    symbol: fact.kind === "symbol" ? fact.name : null,
    line_start: fact.line,
    line_end: fact.line,
    verification_method: verificationMethod,
    // A code-graph fact is a deterministic certainty read straight off the index (confidence 1).
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: observedAt,
  };
}

// ── Deterministic ids ────────────────────────────────────────────────────────

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function claimId(entityId: string, claimKind: string, content: string): string {
  const encoded = [entityId, claimKind, content]
    .map((field) => `${Buffer.byteLength(field, "utf8")}:${field}`)
    .join("");
  return `claim-${digest(encoded)}`;
}

// ── Status helpers ───────────────────────────────────────────────────────────

interface RepoRow {
  repository_id: string;
}
interface CountRow {
  n: number;
}
interface TimestampRow {
  ts: string | null;
}

/**
 * Total events not yet reflected in the compiler's checkpoints, summed across repositories. A repo
 * with no checkpoint counts all its events as lagging; a repo caught up to its last event counts zero.
 * This is an honest measured backlog — it never guesses.
 */
export function computeModelLag(db: LocalDatabase, compilerName: string = REPOSITORY_COMPILER_NAME): number {
  const repos = db
    .prepare(`SELECT DISTINCT repository_id FROM evidence_events`)
    .all() as unknown as RepoRow[];
  let lag = 0;
  for (const { repository_id } of repos) {
    const checkpoint = db
      .prepare(`SELECT last_event_id FROM compiler_checkpoints WHERE compiler_name = ? AND repository_id = ?`)
      .get(compilerName, repository_id) as { last_event_id: string | null } | undefined;
    const lastEventId = checkpoint?.last_event_id ?? null;
    if (lastEventId === null) {
      const row = db
        .prepare(`SELECT COUNT(*) AS n FROM evidence_events WHERE repository_id = ?`)
        .get(repository_id) as unknown as CountRow;
      lag += Number(row.n);
      continue;
    }
    // Events strictly after the checkpoint cursor in the stable (occurred_at, event_id) order. If the
    // cursor event is somehow absent, treat every event as lagging rather than under-report.
    const cursor = db
      .prepare(`SELECT occurred_at, event_id FROM evidence_events WHERE event_id = ?`)
      .get(lastEventId) as { occurred_at: string; event_id: string } | undefined;
    if (!cursor) {
      const row = db
        .prepare(`SELECT COUNT(*) AS n FROM evidence_events WHERE repository_id = ?`)
        .get(repository_id) as unknown as CountRow;
      lag += Number(row.n);
      continue;
    }
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n FROM evidence_events
         WHERE repository_id = ? AND (occurred_at, event_id) > (?, ?)`,
      )
      .get(repository_id, cursor.occurred_at, cursor.event_id) as unknown as CountRow;
    lag += Number(row.n);
  }
  return lag;
}

/**
 * The most recent time any repository was compiled (the max checkpoint timestamp), or null when the
 * compiler has never run. Never a fabricated timestamp.
 */
export function latestCompiledAt(db: LocalDatabase, compilerName: string = REPOSITORY_COMPILER_NAME): string | null {
  const row = db
    .prepare(`SELECT MAX(updated_at) AS ts FROM compiler_checkpoints WHERE compiler_name = ?`)
    .get(compilerName) as unknown as TimestampRow | undefined;
  return row?.ts ?? null;
}
