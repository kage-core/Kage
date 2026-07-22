-- Kage workspace service — migration 001.
-- Tenant-scoped team knowledge store. Every knowledge/measurement table carries workspace_id (and,
-- where the record belongs to a repository, repository_id) as part of its primary key, so a query
-- can only ever return rows for the tenant it explicitly scopes to.

CREATE TABLE workspaces (
  workspace_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repositories (
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  repository_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  default_branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, repository_id)
);

CREATE TABLE workspace_entities (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  model_version INTEGER NOT NULL,
  record_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, entity_id),
  FOREIGN KEY(workspace_id, repository_id) REFERENCES repositories(workspace_id, repository_id)
);

CREATE TABLE workspace_claims (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  impact_class TEXT NOT NULL,
  record_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, claim_id)
);

CREATE TABLE workspace_evidence (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  object_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, evidence_id)
);

CREATE TABLE audit_events (
  audit_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
