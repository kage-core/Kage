-- Kage workspace service — migration 002: identity, roles, and sessions.
-- Principals are tenant-scoped (workspace_id is part of the primary key) so a principal id can never be
-- resolved outside its own workspace. Sessions store ONLY a token hash; the raw token is never persisted.
-- Both tables are SEPARATE from the local sqlite storage (which stays at its own version).

CREATE TABLE workspace_principals (
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  principal_id TEXT NOT NULL,
  principal_type TEXT NOT NULL DEFAULT 'user',
  role TEXT NOT NULL,
  display_name TEXT,
  -- NULL => every repository in the workspace; a JSON array => an explicit allow-list of repository ids.
  repository_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, principal_id),
  CONSTRAINT workspace_principals_type_check CHECK (principal_type IN ('user', 'service')),
  CONSTRAINT workspace_principals_role_check
    CHECK (role IN ('owner', 'admin', 'knowledge_owner', 'developer', 'viewer'))
);

CREATE TABLE workspace_sessions (
  session_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  principal_id TEXT NOT NULL,
  -- SHA-256 hex of the raw token. The raw token is returned once at creation and never stored.
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(workspace_id, principal_id)
    REFERENCES workspace_principals(workspace_id, principal_id)
);

CREATE INDEX workspace_sessions_token_hash_idx ON workspace_sessions(token_hash);
CREATE INDEX workspace_sessions_principal_idx ON workspace_sessions(workspace_id, principal_id);
