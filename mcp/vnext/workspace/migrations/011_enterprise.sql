-- Kage workspace service — migration 011: enterprise identity, retention, and data controls.
--
-- ORDERED, IDEMPOTENT and version-tracked exactly like 001-010, and SEPARATE from the local sqlite
-- storage (which stays at its own version). Migrations 001-010 have already been applied by deployed
-- databases and are immutable, so everything Task 8 needs lands HERE rather than by editing them.
--
-- FOUR THINGS ARRIVE:
--   1. IDENTITY LIFECYCLE on workspace_principals. SCIM deprovisioning must be able to switch a person
--      OFF without erasing who they were: `active` is the switch, and `deactivated_at` records when.
--      Deletion is deliberately NOT how a leaver is handled — their review decisions are in an
--      append-only audit log that references them, and deleting the person would orphan the record of
--      who approved what. `external_id` is the IdP's stable identifier (SCIM externalId / OIDC `sub`).
--   2. OIDC. A provider config per workspace and a short-lived, SINGLE-USE login request row holding the
--      state, the nonce, and the PKCE verifier. NOTE THE ABSENT COLUMN: there is no `client_secret`.
--      The row stores the NAME of a deployment secret (`client_secret_ref`); the value is resolved from
--      the process environment at use time, so a database dump contains no OAuth client credential.
--   3. SCIM tokens, stored as a SHA-256 hash exactly like session tokens. The raw token is shown once,
--      at issue, and never persisted, so a leak of this table cannot be replayed against /scim/v2.
--   4. RETENTION + DELETION bookkeeping, including a `workspace_deletions` ledger that deliberately has
--      NO foreign key to `workspaces`: it must survive the deletion of the tenant it describes, which is
--      the whole point of a terminal record.

-- 1. identity lifecycle -------------------------------------------------------------------------

ALTER TABLE workspace_principals ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE workspace_principals ADD COLUMN deactivated_at TIMESTAMPTZ;
-- The IdP's stable id for this person. NULL for locally created principals (service tokens, founders).
ALTER TABLE workspace_principals ADD COLUMN external_id TEXT;
ALTER TABLE workspace_principals ADD COLUMN user_name TEXT;
ALTER TABLE workspace_principals ADD COLUMN email TEXT;

-- Unique WITHIN a workspace only: two tenants federating from the same IdP legitimately see the same
-- subject, and a globally unique constraint would let one tenant's provisioning break another's.
CREATE UNIQUE INDEX workspace_principals_external_idx
  ON workspace_principals(workspace_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX workspace_principals_user_name_idx
  ON workspace_principals(workspace_id, lower(user_name))
  WHERE user_name IS NOT NULL;

-- 2. OIDC ---------------------------------------------------------------------------------------

CREATE TABLE workspace_oidc_providers (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(workspace_id),
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  -- The NAME of a deployment secret, never the secret. See the header.
  client_secret_ref TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  authorization_endpoint TEXT NOT NULL,
  token_endpoint TEXT NOT NULL,
  jwks_uri TEXT NOT NULL,
  -- Empty array => no domain restriction, which is a deliberate, explicit choice rather than a default.
  allowed_email_domains TEXT[] NOT NULL DEFAULT '{}',
  default_role TEXT NOT NULL DEFAULT 'developer',
  -- When false, a subject with no provisioned principal is REFUSED rather than silently created.
  allow_jit_provisioning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_oidc_providers_role_check
    CHECK (default_role IN ('owner', 'admin', 'knowledge_owner', 'developer', 'viewer'))
);

-- A login in flight. Single use: `consumed_at` is set in the same statement that reads the row, so a
-- replayed callback finds nothing and the authorization code cannot be exchanged twice.
CREATE TABLE oidc_login_requests (
  state TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  nonce TEXT NOT NULL,
  -- The PKCE verifier. Short-lived and single-use; it never leaves the server toward the browser.
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX oidc_login_requests_expiry_idx ON oidc_login_requests(expires_at);

-- 3. SCIM tokens --------------------------------------------------------------------------------

CREATE TABLE workspace_scim_tokens (
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  token_id UUID NOT NULL,
  label TEXT NOT NULL,
  -- SHA-256 hex of the raw token, exactly like workspace_sessions. The raw value is never stored.
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY(workspace_id, token_id)
);

CREATE INDEX workspace_scim_tokens_hash_idx ON workspace_scim_tokens(token_hash);

-- 4. retention and deletion ---------------------------------------------------------------------

CREATE TABLE workspace_retention_policies (
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  category TEXT NOT NULL,
  -- NULL means "keep indefinitely". It is a real, explicit choice, not a missing value.
  retention_days INTEGER,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, category),
  CONSTRAINT workspace_retention_policies_category_check
    CHECK (category IN ('evidence_metadata', 'task_receipts', 'aggregated_metrics', 'audit',
                        'approved_knowledge')),
  CONSTRAINT workspace_retention_policies_days_check
    CHECK (retention_days IS NULL OR retention_days > 0)
);

CREATE TABLE workspace_retention_runs (
  run_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  category TEXT NOT NULL,
  cutoff TIMESTAMPTZ,
  deleted_count INTEGER NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workspace_retention_runs_workspace_idx ON workspace_retention_runs(workspace_id, ran_at);

-- The terminal record of a deleted tenant. DELIBERATELY NO FOREIGN KEY to workspaces: this row exists
-- precisely to outlive the workspace it names. It holds no tenant knowledge — only the fact of the
-- deletion, who confirmed it, and the checksum of the export handed back before anything was removed.
CREATE TABLE workspace_deletions (
  deletion_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  workspace_slug TEXT,
  confirmed_by TEXT NOT NULL,
  reauthenticated_at TIMESTAMPTZ NOT NULL,
  export_path TEXT NOT NULL,
  export_sha256 TEXT NOT NULL,
  export_bytes BIGINT NOT NULL,
  object_keys_deleted INTEGER NOT NULL DEFAULT 0,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX workspace_deletions_workspace_idx ON workspace_deletions(workspace_id);

-- 5. audit: still append-only, with ONE narrow, explicit removal path -----------------------------
--
-- Migration 005 made audit_events reject every UPDATE and DELETE. An UPDATE stays rejected forever: an
-- audit row's content must never change, and there is no legitimate reason to rewrite history.
--
-- A DELETE, however, has exactly one legitimate cause — a retention policy the workspace owner set,
-- which a data-protection obligation may actually REQUIRE us to honour. Rather than granting the
-- application blanket DELETE (which would make the append-only property a comment), the trigger permits
-- a delete ONLY while the transaction-local setting `kage.retention_purge` is 'on'. That flag is set by
-- `applyRetention`/`deleteWorkspace` with `set_config(..., true)`, so it exists for the duration of one
-- transaction and cannot leak to another connection or outlive the purge. Any other DELETE — a
-- compromised session, an ad-hoc psql, an ORM cascade — still raises.
CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND coalesce(current_setting('kage.retention_purge', true), 'off') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- forActor(): the audit trail for one person, used to prove a deprovisioned user's history survives.
CREATE INDEX audit_events_actor_idx ON audit_events(workspace_id, actor_id, audit_seq);
