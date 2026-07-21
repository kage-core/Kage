-- Kage workspace service — migration 010: make subscription state MONOTONIC in event time.
--
-- WHY THIS EXISTS. Stripe does not guarantee webhook delivery order and retries a failed delivery for
-- days. Without a recorded high-water mark, the LAST DELIVERED event wins, so a delayed
-- `customer.subscription.updated` generated BEFORE a cancellation can arrive after it and re-grant a
-- cancelled plan for a whole period. That needs no attacker: it is ordinary provider behaviour.
--
-- The high-water mark is the EVENT's `created` timestamp, not the subscription object's own `created`
-- (which is when the subscription was first opened and never moves) and not our own receipt time (which
-- is exactly the ordering that is unreliable). An event older than the mark is recorded — so Stripe's
-- retries terminate — and applied to nothing.
--
-- Both columns are NULLABLE with no backfill on purpose: an existing row has no known high-water mark,
-- so the FIRST event after this migration applies normally and sets one. Inventing a mark here would
-- either drop a legitimate event or fabricate provenance for one we never saw.
ALTER TABLE workspace_subscriptions
  ADD COLUMN IF NOT EXISTS last_event_created_at TIMESTAMPTZ;

ALTER TABLE workspace_subscriptions
  ADD COLUMN IF NOT EXISTS last_event_id TEXT;

COMMENT ON COLUMN workspace_subscriptions.last_event_created_at IS
  'Generation time of the newest Stripe subscription event applied to this row. An event older than this is ignored, because Stripe does not guarantee delivery order.';
