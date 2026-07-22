-- Kage workspace service — migration 006: the GitHub App integration.
-- Tenant-scoped exactly like every other table: an installation and a delivery belong to one workspace,
-- so a webhook can never write across tenants.
--
-- github_deliveries is the idempotency ledger. GitHub retries deliveries aggressively, so the delivery
-- id is claimed (INSERT ... ON CONFLICT DO NOTHING) BEFORE the event is processed; a redelivery finds
-- the row already present and does nothing. That is what keeps a duplicate delivery processed exactly once.

CREATE TABLE github_installations (
  workspace_id UUID NOT NULL,
  installation_id TEXT NOT NULL,
  account_login TEXT NOT NULL,
  repository_selection TEXT NOT NULL,
  -- The permissions GitHub actually GRANTED (may be narrower than requested). `checks: write` is a
  -- separate opt-in; its absence makes publishCheck skip rather than fail.
  permissions JSONB NOT NULL,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, installation_id)
);

CREATE TABLE github_deliveries (
  workspace_id UUID NOT NULL,
  delivery_id TEXT NOT NULL,
  event TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, delivery_id)
);

-- Which repositories an installation permits, so webhook-driven writes stay inside the allow-list.
CREATE TABLE github_installation_repositories (
  workspace_id UUID NOT NULL,
  installation_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  PRIMARY KEY(workspace_id, installation_id, repository_id)
);
