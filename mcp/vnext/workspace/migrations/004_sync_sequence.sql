-- Kage workspace service — migration 004: a monotonic per-row sync cursor.
--
-- Migration 003's comment promised "a monotonic per-row sequence so a pull can return everything after
-- cursor N in a stable order", but no such column existed: pullChanges paginated on the non-unique,
-- client-supplied updated_at timestamp. Any row written with an updated_at equal to a prior pull's
-- boundary max (e.g. every record in a batch sharing one timestamp) was silently and permanently dropped
-- from delivery until a from-scratch resync — the workspace and the local replica diverged.
--
-- The fix is a single shared BIGINT sequence stamped onto every pull-visible row (claims + entities). It
-- is unique and strictly increasing, so "everything after cursor N" (sync_seq > N) can never skip a row
-- that merely shares a wall-clock timestamp with the boundary. An UPSERT bumps sync_seq to a fresh value
-- (see sync-routes.ts) so an updated row is re-delivered exactly once on the next pull.
--
-- Idempotent: guarded with IF NOT EXISTS so re-application is a no-op (the migrate() runner already gates
-- by version, but the guards keep the file safe to replay directly).

CREATE SEQUENCE IF NOT EXISTS workspace_sync_seq AS BIGINT;

-- A volatile default (nextval) is evaluated per existing row on ADD COLUMN, so every pre-existing row
-- gets its own distinct, ordered sync_seq; new inserts get the next value from the same shared sequence.
ALTER TABLE workspace_claims
  ADD COLUMN IF NOT EXISTS sync_seq BIGINT NOT NULL DEFAULT nextval('workspace_sync_seq');

ALTER TABLE workspace_entities
  ADD COLUMN IF NOT EXISTS sync_seq BIGINT NOT NULL DEFAULT nextval('workspace_sync_seq');

-- Pull filters `workspace_id = $1 [AND repository_id = ANY(...)] AND sync_seq > $cursor ORDER BY sync_seq`.
CREATE INDEX IF NOT EXISTS workspace_claims_sync_seq_idx ON workspace_claims(workspace_id, sync_seq);
CREATE INDEX IF NOT EXISTS workspace_entities_sync_seq_idx ON workspace_entities(workspace_id, sync_seq);
