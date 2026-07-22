-- Kage workspace service — migration 007: privacy-safe team task outcomes.
--
-- ORDERED, IDEMPOTENT and version-tracked exactly like 001-006, and SEPARATE from the local sqlite
-- storage (which stays at its own version). Migrations 001-006 have already been applied by deployed
-- databases and are immutable, so this table lands HERE rather than by editing 001.
--
-- WHAT THIS TABLE CAN AND CANNOT HOLD. Every column is an identifier, a class, a count, or a measured
-- number. There is deliberately NO column that can hold a prompt, a tool payload, a model response, file
-- contents, or a claim body — the schema itself makes a raw payload unrepresentable, which is the same
-- structural discipline workspace_measurements carries in migration 003.
--
-- HONESTY IN THE TYPES. The measured numbers are NULLABLE on purpose: a task whose request was not
-- measured on both sides stores NULL, never 0. A 0 here would be indistinguishable from "measured, and
-- exactly break-even", and the aggregate would silently book unmeasured tasks as a wash.
--
-- TENANCY. workspace_id + repository_id are part of the primary key and of the foreign key into
-- repositories, so a row can only ever exist inside one tenant's repository and every query that scopes
-- to (workspace_id, repository_id) can only ever return that tenant's rows.

CREATE TABLE workspace_task_outcomes (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  agent_surface TEXT NOT NULL,
  mode TEXT NOT NULL,
  measurement_quality TEXT NOT NULL,

  -- Exact request economics: measured on BOTH sides or NULL. DOUBLE PRECISION (not NUMERIC) so the
  -- driver returns a JS number and the aggregation layer never parses a string into a silent NaN.
  net_input_cost_delta_usd DOUBLE PRECISION,
  kage_processing_cost_usd DOUBLE PRECISION,
  latency_ms INTEGER,

  delivery_status TEXT NOT NULL,
  verification_outcome TEXT NOT NULL,

  -- Identifiers of reused knowledge records — ids only. The bodies live in workspace_claims, which is
  -- already permission-scoped; repeating them here would duplicate content into the metrics surface.
  knowledge_ids_reused TEXT[] NOT NULL DEFAULT '{}',
  review_decisions INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,

  PRIMARY KEY(workspace_id, repository_id, task_id),
  FOREIGN KEY(workspace_id, repository_id) REFERENCES repositories(workspace_id, repository_id),
  CONSTRAINT workspace_task_outcomes_quality_check
    CHECK (measurement_quality IN ('exact', 'partial', 'unavailable')),
  CONSTRAINT workspace_task_outcomes_mode_check
    CHECK (mode IN ('audit', 'assist', 'protect')),
  CONSTRAINT workspace_task_outcomes_delivery_check
    CHECK (delivery_status IN ('delivered', 'failed_open', 'skipped')),
  CONSTRAINT workspace_task_outcomes_verification_check
    CHECK (verification_outcome IN ('verified', 'unverified', 'failed', 'unavailable'))
);

-- The window query is always (workspace, repository, time-ordered).
CREATE INDEX workspace_task_outcomes_window_idx
  ON workspace_task_outcomes(workspace_id, repository_id, started_at);
