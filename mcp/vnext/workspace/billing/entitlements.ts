// Server-side entitlement resolution and the no-overhead pilot credit.
//
// THE ONE RULE THAT MATTERS HERE: an entitlement is a function of the subscription row THIS SERVICE
// wrote after verifying a Stripe webhook signature, and of nothing else. No function in this module
// accepts a plan name, a feature flag, or an entitlement object from a caller's request. A client that
// posts `{"plan_id":"enterprise"}` changes nothing, because there is no code path from a request body
// to a stored subscription — only a signed webhook writes one.
//
// THE SECOND RULE: an expiry never confiscates the customer's own work. `local_runtime` and
// `workspace_export` are typed `true` and returned `true` for every state, including "no subscription",
// "cancelled", and "payment failed". A lapsed customer keeps running Kage locally and keeps being able
// to take their knowledge out. Only the team-scoped features switch off.
//
// THE THIRD RULE, for the pilot guarantee: money follows measurement. A credit is derived ONLY from
// receipts that measured BOTH the input-cost delta and Kage's own processing cost. A partial or
// unavailable receipt creates nothing and reduces nothing, an unmeasured pilot reports overhead as null
// (never 0), and the credit is capped at the first invoice's platform fee so the guarantee can waive our
// fee but can never become a cash liability.
import { randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import type { TeamTaskOutcomeRecord } from "../metrics.js";
import {
  PLAN_IDS,
  type EntitlementState,
  type PilotCreditInput,
  type PilotCreditResult,
  type PlanId,
  type StoredSubscription,
  type SubscriptionStatus,
  type WorkspaceEntitlements,
} from "./types.js";

/** Statuses Stripe reports for a subscription that is currently paid for (or in an agreed trial). */
const ENTITLING_STATUSES: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  "active",
  "trialing",
]);

/** The paid features each plan grants. `local_runtime`/`workspace_export` are never in this table. */
type PaidFeatures = Omit<WorkspaceEntitlements, "local_runtime" | "workspace_export" | "plan_id" | "state">;

const PLAN_FEATURES: Readonly<Record<PlanId, PaidFeatures>> = Object.freeze({
  local: {
    team_sync: false,
    team_review: false,
    github_checks: false,
    advanced_policy: false,
    sso: false,
    scim: false,
    self_host_support: false,
  },
  team: {
    team_sync: true,
    team_review: true,
    github_checks: true,
    advanced_policy: false,
    sso: false,
    scim: false,
    self_host_support: false,
  },
  business: {
    team_sync: true,
    team_review: true,
    github_checks: true,
    advanced_policy: true,
    sso: false,
    scim: false,
    self_host_support: false,
  },
  enterprise: {
    team_sync: true,
    team_review: true,
    github_checks: true,
    advanced_policy: true,
    sso: true,
    scim: true,
    self_host_support: true,
  },
});

/** Coerce an arbitrary string to a known plan id, or null. An unrecognised price grants nothing. */
export function asPlanId(value: unknown): PlanId | null {
  return typeof value === "string" && PLAN_IDS.has(value) ? (value as PlanId) : null;
}

/**
 * Resolve what a workspace may do from its stored subscription. PURE: no I/O, no clock beyond the
 * `nowMs` argument, no defaults pulled from anywhere a client can reach.
 *
 * A subscription entitles its plan only while Stripe says it is `active`/`trialing` AND its reported
 * period has not ended. `cancel_at_period_end` is deliberately NOT an expiry: the customer paid through
 * the end of the period and keeps the features until then.
 */
export function resolveEntitlements(
  subscription: StoredSubscription | null | undefined,
  nowMs: number = Date.now(),
): WorkspaceEntitlements {
  const state: EntitlementState = !subscription
    ? "none"
    : entitles(subscription, nowMs)
      ? "active"
      : "expired";
  const plan: PlanId = state === "active" ? (subscription?.plan_id ?? "local") : "local";
  return {
    // Never conditional. A customer's local loop and their own data are not a subscription feature.
    local_runtime: true,
    workspace_export: true,
    ...PLAN_FEATURES[plan],
    plan_id: plan,
    state,
  };
}

/** True when this subscription is currently paid for and its period has not ended. */
function entitles(subscription: StoredSubscription, nowMs: number): boolean {
  if (!subscription.plan_id || subscription.plan_id === "local") return false;
  if (!ENTITLING_STATUSES.has(subscription.status)) return false;
  if (subscription.current_period_end) {
    const endsAt = Date.parse(subscription.current_period_end);
    // An unparseable expiry is treated as expired: fail closed on the PAID features (never on local).
    if (!Number.isFinite(endsAt) || endsAt <= nowMs) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// storage — tenant-scoped, one subscription per workspace
// ---------------------------------------------------------------------------------------------

interface SubscriptionRow {
  workspace_id: string;
  plan_id: string | null;
  status: string;
  current_period_end: Date | string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seats: number | null;
  updated_at: Date | string;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToSubscription(row: SubscriptionRow): StoredSubscription {
  return {
    workspace_id: row.workspace_id,
    plan_id: asPlanId(row.plan_id),
    status: row.status as SubscriptionStatus,
    current_period_end: toIso(row.current_period_end),
    cancel_at_period_end: row.cancel_at_period_end,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id,
    seats: row.seats,
    updated_at: toIso(row.updated_at) ?? new Date(0).toISOString(),
  };
}

/** Upsert the subscription for a workspace. Called only from the verified-webhook path. */
export async function storeSubscription(db: Db, subscription: StoredSubscription): Promise<void> {
  await db.query(
    `INSERT INTO workspace_subscriptions(
       workspace_id, plan_id, status, current_period_end, cancel_at_period_end,
       stripe_customer_id, stripe_subscription_id, seats, updated_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (workspace_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       seats = EXCLUDED.seats,
       updated_at = now()`,
    [
      subscription.workspace_id,
      subscription.plan_id,
      subscription.status,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      subscription.stripe_customer_id,
      subscription.stripe_subscription_id,
      subscription.seats,
    ],
  );
}

/** Load one workspace's subscription. Always scoped by workspace id; there is no unscoped variant. */
export async function loadSubscription(db: Db, workspaceId: string): Promise<StoredSubscription | null> {
  const { rows } = await db.query<SubscriptionRow>(
    `SELECT workspace_id, plan_id, status, current_period_end, cancel_at_period_end,
            stripe_customer_id, stripe_subscription_id, seats, updated_at
       FROM workspace_subscriptions WHERE workspace_id = $1`,
    [workspaceId],
  );
  return rows.length === 0 ? null : rowToSubscription(rows[0]);
}

/** Map a Stripe customer back to the workspace it belongs to, or null when we have never seen it. */
export async function workspaceForCustomer(db: Db, customerId: string): Promise<string | null> {
  const { rows } = await db.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM workspace_subscriptions WHERE stripe_customer_id = $1`,
    [customerId],
  );
  return rows[0]?.workspace_id ?? null;
}

/** The authoritative access answer for a workspace: load the stored state, then resolve from it. */
export async function resolveWorkspaceEntitlements(
  db: Db,
  workspaceId: string,
  nowMs: number = Date.now(),
): Promise<WorkspaceEntitlements> {
  return resolveEntitlements(await loadSubscription(db, workspaceId), nowMs);
}

// ---------------------------------------------------------------------------------------------
// active developers — who actually consumes a seat
// ---------------------------------------------------------------------------------------------

export interface BillingWindow {
  /** ISO-8601 inclusive start of the billing month. */
  since: string;
  /** ISO-8601 exclusive end of the billing month. */
  until: string;
}

/**
 * Count the DISTINCT people who did billable work in the window: started an agent task, or made a
 * knowledge review decision. A read-only viewer performs neither and therefore never consumes a seat —
 * which is the promise the price list makes, enforced here rather than in marketing copy.
 *
 * Task actors are salted pseudonyms and review actors are principal ids; they are counted in separate
 * namespaces and unioned, so the number can only ever over-count a person who appears in both, never
 * under-count. Both halves are tenant-scoped.
 */
export async function countActiveDevelopers(
  db: Db,
  workspaceId: string,
  window: BillingWindow,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM (
       SELECT DISTINCT 'task:' || actor_id AS actor
         FROM workspace_task_outcomes
        WHERE workspace_id = $1 AND started_at >= $2 AND started_at < $3
       UNION
       SELECT DISTINCT 'review:' || actor_id AS actor
         FROM audit_events
        WHERE workspace_id = $1 AND occurred_at >= $2 AND occurred_at < $3
          AND action LIKE 'knowledge.review.%'
     ) AS active_actors`,
    [workspaceId, window.since, window.until],
  );
  return Number.parseInt(rows[0]?.count ?? "0", 10);
}

// ---------------------------------------------------------------------------------------------
// the no-overhead pilot credit
// ---------------------------------------------------------------------------------------------

/**
 * A receipt counts toward the guarantee ONLY when it measured both halves of the overhead: the net
 * input-cost delta AND Kage's own processing cost. A receipt classed `partial`/`unavailable`, or an
 * `exact` one missing either number, is excluded — it neither creates a credit nor reduces one. Half a
 * measurement is not a measurement, and a missing half must not be silently read as zero.
 */
function isExactlyMeasured(outcome: TeamTaskOutcomeRecord): boolean {
  return (
    outcome.measurement_quality === "exact" &&
    typeof outcome.net_input_cost_delta_usd === "number" &&
    Number.isFinite(outcome.net_input_cost_delta_usd) &&
    typeof outcome.kage_processing_cost_usd === "number" &&
    Number.isFinite(outcome.kage_processing_cost_usd)
  );
}

/** Round a money figure to cents, avoiding float dust like 12.499999999999998. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute the no-overhead pilot credit. PURE: the same receipts always produce the same number, and
 * nothing here reads a clock, a config default, or a client claim.
 *
 * credit = min(Σ over exactly-measured receipts of (net_input_cost_delta + kage_processing_cost),
 *              first invoice platform fee), floored at 0.
 */
export function calculatePilotCredit(input: PilotCreditInput): PilotCreditResult {
  const exact = input.outcomes.filter(isExactlyMeasured);
  const excluded = input.outcomes.length - exact.length;
  const base = {
    pilot_id: input.pilot_id,
    workspace_id: input.workspace_id,
    exact_receipts: exact.length,
    excluded_receipts: excluded,
    capped: false,
    formula:
      "Σ(net_input_cost_delta_usd + kage_processing_cost_usd) over receipts measuring BOTH; capped at the first invoice platform fee; partial/unavailable receipts contribute nothing",
  };

  if (exact.length === 0) {
    // No measurement at all. The overhead is UNKNOWN (null), not zero, and no credit is issued —
    // a guarantee paid on an unmeasured pilot would be a number we made up.
    return {
      ...base,
      credit_usd: 0,
      reason: "no_exact_measurements",
      measured_overhead_usd: null,
    };
  }

  const overhead = toCents(
    exact.reduce(
      (sum, outcome) => sum + (outcome.net_input_cost_delta_usd ?? 0) + (outcome.kage_processing_cost_usd ?? 0),
      0,
    ),
  );

  if (overhead <= 0) {
    // Kage measurably did not add cost. Nothing to refund — and a negative "credit" (i.e. a charge for
    // having saved the customer money) is not a thing this guarantee can produce.
    return { ...base, credit_usd: 0, reason: "no_measured_overhead", measured_overhead_usd: overhead };
  }

  const fee = input.first_invoice_platform_fee_usd;
  if (fee === null || !Number.isFinite(fee) || fee <= 0) {
    // The guarantee waives OUR fee. With no invoice there is no fee to waive, and paying cash instead
    // would convert a marketing promise into a liability.
    return { ...base, credit_usd: 0, reason: "no_invoice_to_credit", measured_overhead_usd: overhead };
  }

  if (overhead > fee) {
    return {
      ...base,
      credit_usd: toCents(fee),
      reason: "capped_at_first_invoice_platform_fee",
      // Reported IN FULL: the cap limits what we credit, never what we admit we measured.
      measured_overhead_usd: overhead,
      capped: true,
    };
  }

  return {
    ...base,
    credit_usd: overhead,
    reason: "measured_positive_context_overhead",
    measured_overhead_usd: overhead,
  };
}

/**
 * Compute and PERSIST the credit for a pilot, exactly once per (workspace, pilot). Re-running the
 * calculation is safe: the unique key makes the second write a no-op, so a retried job, a re-imported
 * receipt set, or a curious operator can never double-credit an account. The stored row keeps the
 * measurement and the reason alongside the money, so a credit is always auditable back to its receipts.
 */
export async function recordPilotCredit(db: Db, input: PilotCreditInput): Promise<PilotCreditResult> {
  const result = calculatePilotCredit(input);
  await db.query(
    `INSERT INTO workspace_billing_credits(
       credit_id, workspace_id, pilot_id, credit_usd, reason, measured_overhead_usd,
       exact_receipts, excluded_receipts, capped)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (workspace_id, pilot_id) DO NOTHING`,
    [
      randomUUID(),
      input.workspace_id,
      input.pilot_id,
      result.credit_usd,
      result.reason,
      result.measured_overhead_usd,
      result.exact_receipts,
      result.excluded_receipts,
      result.capped,
    ],
  );
  return result;
}

/** The credit already recorded for a workspace's pilot, or null when none has been computed. */
export async function loadPilotCredit(
  db: Db,
  workspaceId: string,
  pilotId: string,
): Promise<{ credit_usd: number; reason: string; measured_overhead_usd: number | null } | null> {
  const { rows } = await db.query<{
    credit_usd: string | number;
    reason: string;
    measured_overhead_usd: string | number | null;
  }>(
    `SELECT credit_usd, reason, measured_overhead_usd
       FROM workspace_billing_credits WHERE workspace_id = $1 AND pilot_id = $2`,
    [workspaceId, pilotId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    credit_usd: Number(row.credit_usd),
    reason: row.reason,
    measured_overhead_usd: row.measured_overhead_usd === null ? null : Number(row.measured_overhead_usd),
  };
}
