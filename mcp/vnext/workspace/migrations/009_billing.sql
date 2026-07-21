-- Kage workspace service — migration 009: subscriptions, the Stripe event ledger, and pilot credits.
--
-- ORDERED, IDEMPOTENT and version-tracked exactly like 001-008, and SEPARATE from the local sqlite
-- storage (which stays at its own version). Migrations 001-008 have already been applied by deployed
-- databases and are immutable, so billing lands HERE rather than by editing 001 — an edit to an applied
-- migration would never re-run and would silently diverge deployments from this source tree.
--
-- WHY billing_events IS KEYED ON THE EVENT ID ALONE, not on (workspace_id, event_id) like every
-- knowledge table. A Stripe event id is globally unique and the TENANT IS DERIVED FROM THE EVENT — we
-- do not know which workspace it belongs to until after we have parsed and mapped it. Keying the
-- idempotency ledger on a workspace we have not resolved yet would let the SAME event apply twice under
-- two different mappings, which is precisely the double-charge/double-grant this table exists to
-- prevent. The workspace is recorded alongside (nullable, filled in once resolved) for provenance, and
-- this table holds no knowledge and no measurement — only provider bookkeeping.
--
-- WHAT IS NOT HERE. No card numbers, no bank details, no raw Stripe payloads, no customer PII: this
-- service stores an opaque customer id, a plan, a status, and dates. Payment instruments live at
-- Stripe, and the customer manages them through Stripe's own portal.

CREATE TABLE workspace_subscriptions (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(workspace_id),
  -- NULL means "no plan this deployment recognises". An unmapped Stripe price must grant NOTHING, so
  -- there is deliberately no default value here that could become an accidental entitlement.
  plan_id TEXT,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- Seats Stripe bills. Informational only: access is never gated on it, so a seat-count drift can
  -- never lock a paying team out of its own workspace.
  seats INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_subscriptions_plan_check
    CHECK (plan_id IS NULL OR plan_id IN ('local', 'team', 'business', 'enterprise')),
  CONSTRAINT workspace_subscriptions_status_check
    CHECK (status IN ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete',
                      'incomplete_expired', 'canceled')),
  CONSTRAINT workspace_subscriptions_seats_check CHECK (seats IS NULL OR seats >= 0)
);

-- One Stripe customer belongs to exactly one workspace. Without this, a customer id could be mapped to
-- two tenants and a single webhook would grant a plan to a workspace that never paid for it.
CREATE UNIQUE INDEX workspace_subscriptions_customer_idx
  ON workspace_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- The idempotency ledger. The row is inserted BEFORE the state change and in the SAME transaction, so
-- an event applies exactly once: a redelivery finds the id present and does nothing, while an apply
-- that fails rolls the claim back with it rather than swallowing Stripe's retry.
CREATE TABLE billing_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(workspace_id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX billing_events_workspace_idx ON billing_events(workspace_id, received_at);

-- The no-overhead pilot guarantee, recorded once per (workspace, pilot).
--
-- credit_usd is a MONEY decision and is never negative: "we measured a saving" is 0, not a charge.
-- measured_overhead_usd is a MEASUREMENT and is NULLABLE on purpose: NULL means no receipt measured
-- both sides, which is a different fact from a measured 0.00 and must never be collapsed into one.
CREATE TABLE workspace_billing_credits (
  credit_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  pilot_id TEXT NOT NULL,
  credit_usd NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  measured_overhead_usd NUMERIC(12, 2),
  exact_receipts INTEGER NOT NULL,
  excluded_receipts INTEGER NOT NULL,
  capped BOOLEAN NOT NULL DEFAULT false,
  applied_invoice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Exactly one credit per pilot per workspace: a re-run of the calculation can never double-credit.
  CONSTRAINT workspace_billing_credits_pilot_key UNIQUE (workspace_id, pilot_id),
  CONSTRAINT workspace_billing_credits_non_negative CHECK (credit_usd >= 0),
  CONSTRAINT workspace_billing_credits_reason_check
    CHECK (reason IN ('measured_positive_context_overhead', 'capped_at_first_invoice_platform_fee',
                      'no_measured_overhead', 'no_exact_measurements', 'no_invoice_to_credit'))
);
