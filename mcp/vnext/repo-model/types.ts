import type { PrivacyClass, TrustState } from "../protocol/types.js";

export type { PrivacyClass, TrustState } from "../protocol/types.js";

export type EntityKind =
  | "repository"
  | "feature"
  | "component"
  | "flow"
  | "contract"
  | "data_model"
  | "invariant"
  | "runbook"
  | "decision"
  | "incident"
  | "owner"
  | "dependency"
  | "test_surface";

export type ImpactClass = "low" | "medium" | "high" | "critical";

export interface EntityRecord {
  entity_id: string;
  repository_id: string;
  kind: EntityKind;
  canonical_name: string;
  slug: string;
  summary: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface ClaimRecord {
  claim_id: string;
  entity_id: string;
  claim_kind: string;
  normalized_content: string;
  trust_state: TrustState;
  confidence: number;
  impact_class: ImpactClass;
  valid_from_commit: string | null;
  valid_to_commit: string | null;
  supersedes_claim_id: string | null;
  review_policy: "automatic" | "owner" | "security" | "operations";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRecord {
  evidence_id: string;
  repository_id: string;
  source_type: "source" | "git" | "test" | "ci" | "document" | "pr" | "agent_event" | "human";
  source_uri: string;
  source_fingerprint: string;
  commit: string | null;
  path: string | null;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  verification_method: string;
  verification_state: "verified" | "failed" | "unavailable";
  privacy_class: PrivacyClass;
  observed_at: string;
}

export interface RelationRecord {
  relation_id: string;
  repository_id: string;
  from_entity_id: string;
  relation_type: string;
  to_entity_id: string;
  evidence_id: string | null;
  created_at: string;
}

export interface ReviewItemRecord {
  review_item_id: string;
  repository_id: string;
  claim_id: string;
  reason: string;
  required_role: string;
  status: "open" | "accepted" | "rejected" | "superseded";
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface EpisodeRecord {
  episode_id: string;
  repository_id: string;
  task_id: string | null;
  episode_type: string;
  title: string;
  started_at: string;
  ended_at: string;
  event_ids: string[];
  outcome: string;
}

export interface CompilerCheckpointRecord {
  compiler_name: string;
  repository_id: string;
  last_event_id: string | null;
  updated_at: string;
}

export interface ClaimWithEvidence {
  claim: ClaimRecord;
  evidence: Array<{ evidence: EvidenceRecord; stance: "supports" | "contradicts" }>;
}

export interface RelatedEntity {
  entity: EntityRecord;
  relation_type: string;
  evidence_id: string | null;
}

// The single honesty gate for injection: a claim may enter an agent's context only when it is
// `verified` (backed by verified evidence) or `approved` (an authorized human accepted it). Every
// other lifecycle state — proposed, disputed, stale, superseded, archived — is non-injectable.
export function isInjectableTrustState(state: TrustState): boolean {
  return state === "verified" || state === "approved";
}
