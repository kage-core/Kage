-- Kage workspace service — migration 012: closing six holes found reviewing migration 011's features.
--
-- ORDERED, IDEMPOTENT and version-tracked exactly like 001-011, and SEPARATE from the local sqlite
-- storage (which stays at its own version). 011 is already applied by deployed databases and is
-- immutable, so every correction lands here.
--
-- WHAT ARRIVES AND WHY EACH IS A SECURITY FIX RATHER THAN A FEATURE:
--
--   1. workspace_sessions.reauthenticated_at — the server's OWN record of when the credential behind a
--      session was last presented. Deletion previously trusted an instant supplied in the request body,
--      which is not a check at all: the caller writes the value the check reads. NULLABLE on purpose,
--      and NULL means "never corroborated", so every session that predates this migration fails the
--      re-authentication gate rather than being grandfathered into passing it.
--   2. oidc_login_requests.binding_hash — a per-login secret held only by the browser that STARTED the
--      login, stored here as a SHA-256. Without it, `state` is an attacker-known value and a callback
--      can be forced into a victim's browser (SameSite=Lax permits top-level navigation), silently
--      logging them into the attacker's identity. NULLABLE for the same fail-closed reason: a row with
--      no binding can no longer be consumed, so in-flight logins from before this migration expire
--      instead of completing unbound.
--   3. workspace_deletions.object_keys_total — the ledger recorded how many blob keys the tenant HAD as
--      though that were how many were removed. The two numbers are now separate columns, so a partial
--      or skipped blob deletion is visible in the compliance record that outlives the tenant.
--   4. workspace_exports — the export was written to a path and the path was handed to the customer.
--      A path on our disk is not a deliverable, and after an irreversible deletion the customer has no
--      session left to authenticate with anyway. This table carries a hashed, expiring DOWNLOAD TICKET
--      per export. It deliberately has NO foreign key to workspaces, for the same reason
--      workspace_deletions has none: the export of a deleted tenant must outlive the tenant.

-- 1. server-side re-authentication ---------------------------------------------------------------

-- NULL = this session has never been corroborated as freshly authenticated. Fail-closed by default.
ALTER TABLE workspace_sessions ADD COLUMN reauthenticated_at TIMESTAMPTZ;

-- 2. OIDC browser binding -------------------------------------------------------------------------

-- SHA-256 hex of the per-login secret set as a short-lived cookie on the browser that started it.
ALTER TABLE oidc_login_requests ADD COLUMN binding_hash TEXT;

-- 3. an honest deletion ledger ---------------------------------------------------------------------

-- How many object keys the tenant HAD. `object_keys_deleted` now means what its name says: how many the
-- object store reported it actually removed.
ALTER TABLE workspace_deletions ADD COLUMN object_keys_total INTEGER NOT NULL DEFAULT 0;

-- 4. deliverable exports ---------------------------------------------------------------------------

CREATE TABLE workspace_exports (
  export_id UUID PRIMARY KEY,
  -- NO foreign key, deliberately: a deletion's export must remain downloadable after the tenant row is
  -- gone. That is the entire point of exporting before deleting.
  workspace_id UUID NOT NULL,
  workspace_slug TEXT,
  kind TEXT NOT NULL,
  export_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  -- SHA-256 hex of the one download ticket, exactly like session and SCIM tokens. The raw ticket is
  -- returned once, to the authenticated requester, and never stored.
  download_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_downloaded_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT workspace_exports_kind_check CHECK (kind IN ('export', 'deletion'))
);

CREATE INDEX workspace_exports_workspace_idx ON workspace_exports(workspace_id, created_at);
CREATE INDEX workspace_exports_expiry_idx ON workspace_exports(expires_at);
