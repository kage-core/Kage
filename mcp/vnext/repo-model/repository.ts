import type { LocalDatabase } from "../storage/database.js";
import { isInjectableTrustState } from "./types.js";
import type {
  ClaimRecord,
  EntityKind,
  EntityRecord,
  EvidenceRecord,
  RelationRecord,
  ReviewItemRecord,
  TrustState,
} from "./types.js";

export type EvidenceStance = "supports" | "contradicts";
export type EvidenceLink = { evidence_id: string; stance: EvidenceStance };

interface EntityRow {
  entity_id: string;
  repository_id: string;
  kind: EntityKind;
  canonical_name: string;
  slug: string;
  summary: string;
  status: EntityRecord["status"];
  created_at: string;
  updated_at: string;
}

interface ClaimRow {
  claim_id: string;
  entity_id: string;
  claim_kind: string;
  normalized_content: string;
  trust_state: TrustState;
  confidence: number;
  impact_class: ClaimRecord["impact_class"];
  valid_from_commit: string | null;
  valid_to_commit: string | null;
  supersedes_claim_id: string | null;
  review_policy: ClaimRecord["review_policy"];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EvidenceRow {
  evidence_id: string;
  repository_id: string;
  source_type: EvidenceRecord["source_type"];
  source_uri: string;
  source_fingerprint: string;
  commit_hash: string | null;
  path: string | null;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  verification_method: string;
  verification_state: EvidenceRecord["verification_state"];
  privacy_class: EvidenceRecord["privacy_class"];
  observed_at: string;
}

interface RelationRow {
  relation_id: string;
  repository_id: string;
  from_entity_id: string;
  relation_type: string;
  to_entity_id: string;
  evidence_id: string | null;
  created_at: string;
}

interface ReviewItemRow {
  review_item_id: string;
  repository_id: string;
  claim_id: string;
  reason: string;
  required_role: string;
  status: ReviewItemRecord["status"];
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

// Terminal states can never transition out — history is preserved, never rewritten.
const TERMINAL_STATES: ReadonlySet<TrustState> = new Set(["superseded", "archived"]);

/**
 * Versioned repository-model API over the Phase B schema.
 *
 * Every honesty gate lives here, not in callers:
 *  - a claim is injectable only when its trust_state is `verified` or `approved`;
 *  - a `verified` claim must be backed by at least one verified supporting evidence row;
 *  - `proposed -> approved` requires a completed (accepted) review item;
 *  - `superseded`/`archived` are terminal — no transition leaves them;
 *  - claim content is never mutated in place: supersession mints a new version and links back.
 *
 * All multi-row writes run inside a single `BEGIN IMMEDIATE`/`COMMIT` transaction so a rejected
 * honesty gate rolls the whole write back — a half-written claim can never survive.
 */
export class Repository {
  constructor(private readonly db: LocalDatabase) {}

  // -- Entities ------------------------------------------------------------

  upsertEntity(input: EntityRecord): EntityRecord {
    return this.tx(() => {
      const existing = this.findEntity(input.repository_id, input.kind, input.slug);
      if (existing) {
        this.db
          .prepare(
            `UPDATE entities
             SET canonical_name = ?, summary = ?, status = ?, updated_at = ?
             WHERE entity_id = ?`,
          )
          .run(input.canonical_name, input.summary, input.status, input.updated_at, existing.entity_id);
        const updated = this.getEntity(existing.entity_id);
        if (!updated) throw new Error(`Entity ${existing.entity_id} disappeared during upsert.`);
        return updated;
      }
      this.db
        .prepare(
          `INSERT INTO entities
             (entity_id, repository_id, kind, canonical_name, slug, summary, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.entity_id,
          input.repository_id,
          input.kind,
          input.canonical_name,
          input.slug,
          input.summary,
          input.status,
          input.created_at,
          input.updated_at,
        );
      return { ...input };
    });
  }

  getEntity(entityId: string): EntityRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM entities WHERE entity_id = ?`)
      .get(entityId) as EntityRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findEntity(repositoryId: string, kind: EntityKind, slug: string): EntityRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM entities WHERE repository_id = ? AND kind = ? AND slug = ?`)
      .get(repositoryId, kind, slug) as EntityRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  listEntities(repositoryId: string, kind?: EntityKind): EntityRecord[] {
    const rows = kind
      ? (this.db
          .prepare(`SELECT * FROM entities WHERE repository_id = ? AND kind = ? ORDER BY slug, entity_id`).all(repositoryId, kind) as unknown as EntityRow[])
      : (this.db
          .prepare(`SELECT * FROM entities WHERE repository_id = ? ORDER BY kind, slug, entity_id`).all(repositoryId) as unknown as EntityRow[]);
    return rows.map((row) => this.toEntity(row));
  }

  // -- Evidence ------------------------------------------------------------

  addEvidence(input: EvidenceRecord): EvidenceRecord {
    return this.tx(() => {
      const result = this.db
        .prepare(
          `INSERT INTO evidence
             (evidence_id, repository_id, source_type, source_uri, source_fingerprint, commit_hash,
              path, symbol, line_start, line_end, verification_method, verification_state, privacy_class, observed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(repository_id, source_type, source_uri, source_fingerprint) DO NOTHING`,
        )
        .run(
          input.evidence_id,
          input.repository_id,
          input.source_type,
          input.source_uri,
          input.source_fingerprint,
          input.commit,
          input.path,
          input.symbol,
          input.line_start,
          input.line_end,
          input.verification_method,
          input.verification_state,
          input.privacy_class,
          input.observed_at,
        );
      if (result.changes === 0) {
        // A row with the same natural key already exists: return the stored one, never a duplicate.
        const existing = this.db
          .prepare(
            `SELECT * FROM evidence
             WHERE repository_id = ? AND source_type = ? AND source_uri = ? AND source_fingerprint = ?`,
          )
          .get(input.repository_id, input.source_type, input.source_uri, input.source_fingerprint) as
          | EvidenceRow
          | undefined;
        if (!existing) throw new Error("Evidence conflict reported but stored row not found.");
        return this.toEvidence(existing);
      }
      return { ...input };
    });
  }

  getEvidence(evidenceId: string): EvidenceRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM evidence WHERE evidence_id = ?`)
      .get(evidenceId) as EvidenceRow | undefined;
    return row ? this.toEvidence(row) : null;
  }

  countEvidence(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM evidence`).get() as { n: number };
    return Number(row.n);
  }

  // -- Claims --------------------------------------------------------------

  createClaim(input: ClaimRecord, evidence: EvidenceLink[] = []): ClaimRecord {
    return this.tx(() => {
      this.insertClaimRow(input);
      this.linkEvidence(input.claim_id, evidence);
      this.enforceTrustEvidence(input.claim_id, input.trust_state);
      const created = this.getClaim(input.claim_id);
      if (!created) throw new Error(`Claim ${input.claim_id} disappeared during creation.`);
      return created;
    });
  }

  supersedeClaim(claimId: string, replacement: ClaimRecord, evidence: EvidenceLink[] = []): ClaimRecord {
    return this.tx(() => {
      const original = this.getClaim(claimId);
      if (!original) throw new Error(`Cannot supersede unknown claim ${claimId}.`);
      if (TERMINAL_STATES.has(original.trust_state)) {
        throw new Error(`Claim ${claimId} is ${original.trust_state}; a terminal claim cannot be superseded.`);
      }
      // Never mutate content in place: mint a new version linked back to the original.
      const linked: ClaimRecord = { ...replacement, supersedes_claim_id: claimId };
      this.insertClaimRow(linked);
      this.linkEvidence(linked.claim_id, evidence);
      this.enforceTrustEvidence(linked.claim_id, linked.trust_state);
      // Retire the original: superseded is terminal and non-injectable.
      this.db
        .prepare(`UPDATE claims SET trust_state = 'superseded', updated_at = ? WHERE claim_id = ?`)
        .run(new Date().toISOString(), claimId);
      const created = this.getClaim(linked.claim_id);
      if (!created) throw new Error(`Replacement claim ${linked.claim_id} disappeared during supersession.`);
      return created;
    });
  }

  transitionClaim(claimId: string, to: TrustState, actor: string): ClaimRecord {
    return this.tx(() => {
      const current = this.getClaim(claimId);
      if (!current) throw new Error(`Cannot transition unknown claim ${claimId}.`);
      const from = current.trust_state;
      if (from === to) return current;
      if (TERMINAL_STATES.has(from)) {
        throw new Error(`Claim ${claimId} is ${from}; no transition is allowed out of a terminal claim.`);
      }
      if (to === "approved" && from === "proposed" && !this.hasAcceptedReview(claimId)) {
        throw new Error(
          `Claim ${claimId} cannot move proposed -> approved without a completed (accepted) review item.`,
        );
      }
      if (to === "verified" && !this.hasVerifiedSupportingEvidence(claimId)) {
        throw new Error(`Claim ${claimId} cannot become verified without verified supporting evidence.`);
      }
      this.db
        .prepare(`UPDATE claims SET trust_state = ?, created_by = ?, updated_at = ? WHERE claim_id = ?`)
        .run(to, actor, new Date().toISOString(), claimId);
      const updated = this.getClaim(claimId);
      if (!updated) throw new Error(`Claim ${claimId} disappeared during transition.`);
      return updated;
    });
  }

  getClaim(claimId: string): ClaimRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM claims WHERE claim_id = ?`)
      .get(claimId) as ClaimRow | undefined;
    return row ? this.toClaim(row) : null;
  }

  claimsForEntity(entityId: string): ClaimRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM claims WHERE entity_id = ? ORDER BY created_at, claim_id`).all(entityId) as unknown as ClaimRow[];
    return rows.map((row) => this.toClaim(row));
  }

  injectableClaims(entityId: string): ClaimRecord[] {
    return this.claimsForEntity(entityId).filter((claim) => isInjectableTrustState(claim.trust_state));
  }

  evidenceForClaim(claimId: string): Array<{ evidence: EvidenceRecord; stance: EvidenceStance }> {
    const rows = this.db
      .prepare(
        `SELECT e.*, ce.stance AS stance
         FROM claim_evidence ce
         JOIN evidence e ON e.evidence_id = ce.evidence_id
         WHERE ce.claim_id = ?
         ORDER BY e.observed_at, e.evidence_id`,
      ).all(claimId) as unknown as Array<EvidenceRow & { stance: EvidenceStance }>;
    return rows.map((row) => ({ evidence: this.toEvidence(row), stance: row.stance }));
  }

  // -- Relations -----------------------------------------------------------

  addRelation(input: RelationRecord): RelationRecord {
    return this.tx(() => {
      // The table's UNIQUE(from, type, to, evidence_id) constraint dedupes edges — but SQLite treats
      // NULL as distinct in unique indexes, so an edge with no backing evidence would slip past it.
      // Guard the logical edge identity explicitly with `IS` (null-safe) so addRelation is idempotent
      // even for evidence-less edges, and return the already-stored row rather than a duplicate.
      const existing = this.db
        .prepare(
          `SELECT * FROM relations
           WHERE from_entity_id = ? AND relation_type = ? AND to_entity_id = ? AND evidence_id IS ?`,
        )
        .get(input.from_entity_id, input.relation_type, input.to_entity_id, input.evidence_id) as
        | RelationRow
        | undefined;
      if (existing) return this.toRelation(existing);
      this.db
        .prepare(
          `INSERT INTO relations
             (relation_id, repository_id, from_entity_id, relation_type, to_entity_id, evidence_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.relation_id,
          input.repository_id,
          input.from_entity_id,
          input.relation_type,
          input.to_entity_id,
          input.evidence_id,
          input.created_at,
        );
      return { ...input };
    });
  }

  relationsFrom(entityId: string): RelationRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM relations WHERE from_entity_id = ? ORDER BY relation_type, to_entity_id`).all(entityId) as unknown as RelationRow[];
    return rows.map((row) => this.toRelation(row));
  }

  // -- Review items --------------------------------------------------------

  createReviewItem(input: ReviewItemRecord): ReviewItemRecord {
    return this.tx(() => {
      this.db
        .prepare(
          `INSERT INTO review_items
             (review_item_id, repository_id, claim_id, reason, required_role, status,
              assigned_to, decided_by, decided_at, decision_note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.review_item_id,
          input.repository_id,
          input.claim_id,
          input.reason,
          input.required_role,
          input.status,
          input.assigned_to,
          input.decided_by,
          input.decided_at,
          input.decision_note,
          input.created_at,
        );
      return { ...input };
    });
  }

  reviewItemsForClaim(claimId: string): ReviewItemRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM review_items WHERE claim_id = ? ORDER BY created_at, review_item_id`).all(claimId) as unknown as ReviewItemRow[];
    return rows.map((row) => this.toReviewItem(row));
  }

  // -- Internals -----------------------------------------------------------

  private insertClaimRow(input: ClaimRecord): void {
    this.db
      .prepare(
        `INSERT INTO claims
           (claim_id, entity_id, claim_kind, normalized_content, trust_state, confidence, impact_class,
            valid_from_commit, valid_to_commit, supersedes_claim_id, review_policy, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.claim_id,
        input.entity_id,
        input.claim_kind,
        input.normalized_content,
        input.trust_state,
        input.confidence,
        input.impact_class,
        input.valid_from_commit,
        input.valid_to_commit,
        input.supersedes_claim_id,
        input.review_policy,
        input.created_by,
        input.created_at,
        input.updated_at,
      );
  }

  private linkEvidence(claimId: string, evidence: EvidenceLink[]): void {
    for (const link of evidence) {
      this.db
        .prepare(
          `INSERT INTO claim_evidence (claim_id, evidence_id, stance)
           VALUES (?, ?, ?)
           ON CONFLICT(claim_id, evidence_id) DO UPDATE SET stance = excluded.stance`,
        )
        .run(claimId, link.evidence_id, link.stance);
    }
  }

  // A claim may only be born `verified` when a verified supporting evidence row backs it. Any other
  // trust state (including `approved`, which is a human acceptance rather than an evidence assertion)
  // is accepted as given by the caller; the transition guards police later lifecycle moves.
  private enforceTrustEvidence(claimId: string, trustState: TrustState): void {
    if (trustState === "verified" && !this.hasVerifiedSupportingEvidence(claimId)) {
      throw new Error(
        `Claim ${claimId} is marked verified but has no verified supporting evidence; refusing to persist.`,
      );
    }
  }

  private hasVerifiedSupportingEvidence(claimId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM claim_evidence ce
         JOIN evidence e ON e.evidence_id = ce.evidence_id
         WHERE ce.claim_id = ? AND ce.stance = 'supports' AND e.verification_state = 'verified'`,
      )
      .get(claimId) as { n: number };
    return Number(row.n) > 0;
  }

  private hasAcceptedReview(claimId: string): boolean {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM review_items WHERE claim_id = ? AND status = 'accepted'`)
      .get(claimId) as { n: number };
    return Number(row.n) > 0;
  }

  private tx<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private toEntity(row: EntityRow): EntityRecord {
    return {
      entity_id: row.entity_id,
      repository_id: row.repository_id,
      kind: row.kind,
      canonical_name: row.canonical_name,
      slug: row.slug,
      summary: row.summary,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private toClaim(row: ClaimRow): ClaimRecord {
    return {
      claim_id: row.claim_id,
      entity_id: row.entity_id,
      claim_kind: row.claim_kind,
      normalized_content: row.normalized_content,
      trust_state: row.trust_state,
      confidence: row.confidence,
      impact_class: row.impact_class,
      valid_from_commit: row.valid_from_commit,
      valid_to_commit: row.valid_to_commit,
      supersedes_claim_id: row.supersedes_claim_id,
      review_policy: row.review_policy,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private toEvidence(row: EvidenceRow): EvidenceRecord {
    return {
      evidence_id: row.evidence_id,
      repository_id: row.repository_id,
      source_type: row.source_type,
      source_uri: row.source_uri,
      source_fingerprint: row.source_fingerprint,
      commit: row.commit_hash,
      path: row.path,
      symbol: row.symbol,
      line_start: row.line_start,
      line_end: row.line_end,
      verification_method: row.verification_method,
      verification_state: row.verification_state,
      privacy_class: row.privacy_class,
      observed_at: row.observed_at,
    };
  }

  private toRelation(row: RelationRow): RelationRecord {
    return {
      relation_id: row.relation_id,
      repository_id: row.repository_id,
      from_entity_id: row.from_entity_id,
      relation_type: row.relation_type,
      to_entity_id: row.to_entity_id,
      evidence_id: row.evidence_id,
      created_at: row.created_at,
    };
  }

  private toReviewItem(row: ReviewItemRow): ReviewItemRecord {
    return {
      review_item_id: row.review_item_id,
      repository_id: row.repository_id,
      claim_id: row.claim_id,
      reason: row.reason,
      required_role: row.required_role,
      status: row.status,
      assigned_to: row.assigned_to,
      decided_by: row.decided_by,
      decided_at: row.decided_at,
      decision_note: row.decision_note,
      created_at: row.created_at,
    };
  }
}
