// Deterministic fixtures for sync tests. Not a test file (no `.test` suffix) so the runner ignores it.
import type { PrivacyClass, TrustState } from "../protocol/types.js";
import type { EntityRecord, EvidenceRecord } from "../repo-model/types.js";
import { buildSyncBatch } from "./outbox.js";
import type { ClaimRecord, LocalModelSnapshot, SyncBatch } from "./types.js";

const T = "2026-07-20T00:00:00.000Z";

export function makeEntity(id: string, repositoryId = "repo-a1"): EntityRecord {
  return {
    entity_id: id,
    repository_id: repositoryId,
    kind: "component",
    canonical_name: `Component ${id}`,
    slug: id,
    summary: `summary for ${id}`,
    status: "active",
    created_at: T,
    updated_at: T,
  };
}

export function makeClaim(
  id: string,
  options: {
    content?: string;
    trust_state?: TrustState;
    supersedes?: string | null;
    entity_id?: string;
    updated_at?: string;
  } = {},
): ClaimRecord {
  return {
    claim_id: id,
    entity_id: options.entity_id ?? "entity-1",
    claim_kind: "behavior",
    normalized_content: options.content ?? `content of ${id}`,
    trust_state: options.trust_state ?? "verified",
    confidence: 0.9,
    impact_class: "medium",
    valid_from_commit: "abc123",
    valid_to_commit: null,
    supersedes_claim_id: options.supersedes ?? null,
    review_policy: "owner",
    created_by: "agent",
    created_at: T,
    updated_at: options.updated_at ?? T,
  };
}

export function makeEvidence(id: string, privacyClass: PrivacyClass, repositoryId = "repo-a1"): EvidenceRecord {
  return {
    evidence_id: id,
    repository_id: repositoryId,
    source_type: "source",
    source_uri: `file://${id}`,
    source_fingerprint: `fp-${id}`,
    commit: "abc123",
    path: `src/${id}.ts`,
    symbol: null,
    line_start: 1,
    line_end: 10,
    verification_method: "static",
    verification_state: "verified",
    privacy_class: privacyClass,
    observed_at: T,
  };
}

/** A snapshot whose evidence spans the given privacy classes — used to prove local_raw never syncs. */
export function fixtureModelWithEvidence(classes: PrivacyClass[]): LocalModelSnapshot {
  return {
    workspace_id: "00000000-0000-0000-0000-000000000000",
    repository_id: "repo-a1",
    base_cursor: null,
    entities: [makeEntity("entity-1")],
    claims: [makeClaim("claim-1")],
    evidence: classes.map((cls, index) => makeEvidence(`ev-${index}-${cls}`, cls)),
    relations: [],
  };
}

/** A ready-to-apply batch with two verified claims and a single team_metadata evidence record. */
export function fixtureSyncBatch(workspaceId: string, repositoryId = "repo-a1"): SyncBatch {
  const snapshot: LocalModelSnapshot = {
    workspace_id: workspaceId,
    repository_id: repositoryId,
    base_cursor: null,
    entities: [makeEntity("entity-1", repositoryId)],
    claims: [
      makeClaim("claim-1", { entity_id: "entity-1" }),
      makeClaim("claim-2", { entity_id: "entity-1" }),
    ],
    evidence: [makeEvidence("ev-meta", "team_metadata", repositoryId)],
    relations: [],
    review_decisions: [],
    measurements: [],
  };
  return buildSyncBatch(snapshot, T);
}
