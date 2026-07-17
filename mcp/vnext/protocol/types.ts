export const KAGE_PROTOCOL_VERSION = 1 as const;

export type ProtocolVersion = typeof KAGE_PROTOCOL_VERSION;
export type PrivacyClass = "local_raw" | "team_metadata" | "team_approved";
// TrustState is an internal repository-model lifecycle concept, NOT a wire field. It never appears on
// any frozen protocol-v1 message (EvidenceEvent/ContextCapsule/ContextDelivery/TransformationReceipt/
// AdapterHandshake); it lives here only so the model layer and the context seam share one definition.
// Only `verified` and `approved` are injectable (see isInjectableTrustState in ../repo-model/types.ts).
export type TrustState =
  | "proposed"
  | "verified"
  | "approved"
  | "disputed"
  | "stale"
  | "superseded"
  | "archived";
export type MeasurementQuality = "exact" | "partial" | "unavailable";
export type AdapterCapability =
  | "session_start"
  | "prompt"
  | "file_open"
  | "file_edit"
  | "tool_result"
  | "session_end"
  | "inject_system"
  | "inject_user_turn"
  | "provider_usage";

export interface RepositoryIdentity {
  repo_id: string;
  root: string;
  remote: string | null;
  branch: string | null;
  commit: string | null;
  worktree: string;
}

export interface TaskIdentity {
  task_id: string;
  session_id: string;
  user_id: string | null;
  agent_surface: string;
}

export interface AdapterHandshake {
  protocol_version: ProtocolVersion;
  adapter_id: string;
  agent_surface: string;
  agent_version: string | null;
  repository: RepositoryIdentity;
  task: TaskIdentity;
  capabilities: AdapterCapability[];
}

export interface EvidenceEvent {
  protocol_version: ProtocolVersion;
  event_id: string;
  event_type: "session_start" | "prompt" | "file_open" | "file_edit" | "tool_result" | "session_end";
  occurred_at: string;
  repository_id: string;
  task_id: string;
  privacy_class: PrivacyClass;
  source_fingerprint: string;
  payload: Record<string, unknown>;
}

export interface CapsuleSection {
  kind: "orientation" | "invariant" | "feature" | "entry_point" | "decision" | "verification" | "runbook" | "minimal_change";
  title: string;
  body: string;
  evidence_ids: string[];
  priority: number;
}

export interface ContextCapsule {
  protocol_version: ProtocolVersion;
  capsule_id: string;
  task_id: string;
  repository_id: string;
  query: string;
  sections: CapsuleSection[];
  token_budget: number;
  estimated_tokens: number;
  created_at: string;
  expires_at: string;
}

export interface ContextDelivery {
  delivery_id: string;
  capsule_id: string;
  task_id: string;
  adapter_id: string;
  injection_location: "system" | "user_turn" | "tool_result" | "none";
  delivered_at: string;
  added_bytes: number;
  added_tokens: number | null;
  measurement_quality: MeasurementQuality;
  status: "delivered" | "skipped" | "failed_open";
  reason: string;
}

export interface TransformationReceipt {
  receipt_id: string;
  task_id: string;
  request_id: string;
  provider: string;
  model: string | null;
  mode: "audit" | "assist" | "protect";
  measurement_quality: MeasurementQuality;
  before_input_bytes: number;
  after_input_bytes: number;
  before_input_tokens: number | null;
  after_input_tokens: number | null;
  output_tokens: number | null;
  kage_processing_cost_usd: number | null;
  provider_input_cost_before_usd: number | null;
  provider_input_cost_after_usd: number | null;
  latency_ms: number;
  transformations: string[];
  created_at: string;
}
