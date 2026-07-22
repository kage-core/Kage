-- Kage workspace service — migration 003: the sync landing zone.
-- Everything here is tenant-scoped by workspace_id (+ repository_id) exactly like migration 001, so a
-- pushed batch can only ever land in its own tenant's rows and a pull can only ever read them back.
--
-- sync_batches is the idempotency ledger: a batch_id applies exactly once. A replayed push finds the id
-- already present and applies nothing, which is what keeps duplicate_sync_records at zero. The remaining
-- tables extend the knowledge store the outbox replicates (relations, review decisions, aggregated
-- measurements) plus a conflict table that PRESERVES both sides of a concurrent claim divergence.

CREATE TABLE sync_batches (
  workspace_id UUID NOT NULL,
  batch_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  base_cursor TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_counts JSONB NOT NULL,
  PRIMARY KEY(workspace_id, batch_id)
);

-- A monotonic per-row sequence so a pull can return "everything after cursor N" in a stable order.
CREATE TABLE workspace_relations (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  relation_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  record_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, relation_id)
);

CREATE TABLE workspace_review_decisions (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  expected_version TEXT,
  decision_note TEXT,
  decided_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, decision_id),
  CONSTRAINT workspace_review_decisions_action_check
    CHECK (action IN ('accept', 'reject', 'supersede'))
);

-- Aggregated, privacy-safe measurements ONLY. There is deliberately no column for a raw prompt/tool body:
-- the schema itself makes a raw payload unrepresentable here.
CREATE TABLE workspace_measurements (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  sample_count INTEGER NOT NULL,
  values_json JSONB NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, measurement_id)
);

-- When two versions of a claim diverge concurrently, BOTH are preserved here for a human to reconcile,
-- rather than one silently overwriting the other. The stored head in workspace_claims is left untouched.
CREATE TABLE workspace_claim_conflicts (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  conflict_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  incoming_json JSONB NOT NULL,
  existing_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, repository_id, conflict_id)
);
