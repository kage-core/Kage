-- Kage workspace service — migration 005: team review ownership and an append-only audit log.
--
-- This is ORDERED and IDEMPOTENT and version-tracked exactly like 001-004, and SEPARATE from the local
-- sqlite storage (which stays at its own version). Migration 001 already shipped the audit_events table
-- and is immutable (a deployed database has already applied it), so append-only enforcement, a monotonic
-- ordering column, and a lookup index are added HERE rather than by editing 001.
--
-- Two capabilities land:
--   1. OWNERSHIP. workspace_owners maps a (scope_type, scope_ref) within a repository to a principal.
--      Required-reviewer resolution walks from the most specific scope (component/feature/runbook, keyed
--      by entity) out to the repository/security/operations scope, and falls back to any workspace
--      knowledge owner when nothing is assigned. Tenant-scoped: workspace_id is part of the primary key.
--   2. APPEND-ONLY AUDIT. Every review decision writes an audit_events row. The log must be immutable:
--      the intended production posture is that the application DB role holds only INSERT + SELECT on
--      audit_events (no UPDATE/DELETE) — but a GRANT cannot be proven against a superuser test session,
--      so immutability is ALSO enforced structurally by a trigger that raises on any UPDATE or DELETE.
--      That trigger holds regardless of the connecting role, which is what the test exercises.

CREATE TABLE workspace_owners (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  -- For component/feature/runbook this is the entity id; for repository/security/operations it is the
  -- repository id (the scope is repo-wide). Never nullable, so the primary key is always well-defined.
  scope_ref TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, repository_id, scope_type, scope_ref, principal_id),
  FOREIGN KEY(workspace_id, repository_id) REFERENCES repositories(workspace_id, repository_id),
  CONSTRAINT workspace_owners_scope_check
    CHECK (scope_type IN ('repository', 'feature', 'component', 'runbook', 'security', 'operations'))
);

CREATE INDEX workspace_owners_lookup_idx
  ON workspace_owners(workspace_id, repository_id, scope_type, scope_ref);

-- A monotonic per-row sequence so forTarget() returns audit events in a stable, deterministic order even
-- when two events share an occurred_at timestamp to the millisecond.
ALTER TABLE audit_events ADD COLUMN audit_seq BIGSERIAL;

-- The lookup index for forTarget(): every audit query is tenant-scoped and filtered by target.
CREATE INDEX audit_events_target_idx
  ON audit_events(workspace_id, target_type, target_id, audit_seq);

-- Structural append-only enforcement. An UPDATE or DELETE on audit_events raises, so the log can only
-- ever grow. This is defense-in-depth alongside the least-privilege GRANT posture described above.
CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_mutate
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
