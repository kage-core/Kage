// Billing vocabulary for the Kage workspace: plans, subscription state, and what a plan entitles.
//
// TWO INVARIANTS ARE ENCODED IN THESE TYPES, not merely in the code that uses them.
//
//   1. `local_runtime` and `workspace_export` are typed as the literal `true`. They are not booleans
//      that happen to be true today: no subscription state, expiry, payment failure, or downgrade can
//      make them false, and the type system refuses any attempt to write one. A customer's own agent
//      loop and their own data leaving the product are never for sale.
//
//   2. A plan's PRICE is server data, not a claim a client can make. `StoredSubscription` is what this
//      service wrote after verifying a Stripe webhook signature; nothing on the request path can
//      construct one. Entitlements are resolved from it and from nothing else.
//
// The catalog below is an explicit LAUNCH HYPOTHESIS. It can change for new subscriptions without
// rewriting historical invoices, and the Stripe price ids that back it live in deployment secrets —
// never in this file, and never in repository configuration.

/** The published plan tiers. `local` is the unpaid tier every install has by default. */
export type PlanId = "local" | "team" | "business" | "enterprise";

export interface LaunchPlan {
  /**
   * List price per ACTIVE DEVELOPER per month, in USD. An active developer is a member who started an
   * agent task or made a knowledge review decision during the billing month — see
   * `countActiveDevelopers`. `null` for enterprise: that tier is quoted, not listed, and inventing a
   * number here would be a fabricated price.
   */
  usd_per_active_developer_month: number | null;
  /** Read-only viewers never consume a paid seat, on every tier. */
  viewers_included: true;
}

export const LAUNCH_PLANS: Readonly<Record<PlanId, LaunchPlan>> = Object.freeze({
  local: { usd_per_active_developer_month: 0, viewers_included: true },
  team: { usd_per_active_developer_month: 29, viewers_included: true },
  business: { usd_per_active_developer_month: 59, viewers_included: true },
  enterprise: { usd_per_active_developer_month: null, viewers_included: true },
});

export const PLAN_IDS: ReadonlySet<string> = new Set<PlanId>(["local", "team", "business", "enterprise"]);

/** Subscription lifecycle states we accept from Stripe. Anything else is treated as not entitled. */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "paused"
  | "incomplete"
  | "incomplete_expired"
  | "canceled";

/**
 * The subscription row this service stored after verifying a webhook. It is the ONLY input to an
 * entitlement decision. `plan_id` is null when the price id on the subscription is not one this
 * deployment recognises — an unmapped price grants nothing rather than defaulting to something.
 */
export interface StoredSubscription {
  workspace_id: string;
  plan_id: PlanId | null;
  status: SubscriptionStatus;
  /** ISO-8601 end of the paid period, as Stripe reported it. Null when Stripe reported none. */
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** Seats Stripe is billing. Informational: access is never gated on it, only reported. */
  seats: number | null;
  updated_at: string;
}

/** Whether the stored subscription currently entitles anything. */
export type EntitlementState = "active" | "expired" | "none";

/**
 * What a workspace may do right now. Resolved server-side from `StoredSubscription`; a client-provided
 * plan name is never an input. The first two fields are literal `true` by design (see the header).
 */
export interface WorkspaceEntitlements {
  local_runtime: true;
  workspace_export: true;
  team_sync: boolean;
  team_review: boolean;
  github_checks: boolean;
  advanced_policy: boolean;
  sso: boolean;
  scim: boolean;
  self_host_support: boolean;
  /** The plan actually in force after expiry is applied — `local` when nothing is entitled. */
  plan_id: PlanId;
  state: EntitlementState;
}

/** Why the pilot guarantee produced (or did not produce) a credit. Every branch is machine-readable. */
export type PilotCreditReason =
  | "measured_positive_context_overhead"
  | "capped_at_first_invoice_platform_fee"
  | "no_measured_overhead"
  | "no_exact_measurements"
  | "no_invoice_to_credit";

export interface PilotCreditResult {
  pilot_id: string;
  workspace_id: string;
  /**
   * The credit to apply, in USD. Never negative, never null: this is a money decision and "no credit"
   * is 0. It is a different fact from `measured_overhead_usd`, which is null when nothing measured it.
   */
  credit_usd: number;
  reason: PilotCreditReason;
  /**
   * The overhead actually measured, reported IN FULL even when the credit is capped below it. Null —
   * never 0 — when no receipt measured both sides, because "we did not measure" and "we measured zero"
   * are different statements and only one of them is an outcome.
   */
  measured_overhead_usd: number | null;
  /** Receipts that measured BOTH input cost and Kage processing cost, i.e. the ones that counted. */
  exact_receipts: number;
  /** Receipts excluded for being partial, unavailable, or half-measured. They change nothing. */
  excluded_receipts: number;
  capped: boolean;
  /** The arithmetic, spelled out, so a customer can re-derive or reject the number. */
  formula: string;
}

export interface PilotCreditInput {
  pilot_id: string;
  workspace_id: string;
  /** Privacy-safe task outcomes measured during the pilot. Identifiers, classes, and numbers only. */
  outcomes: readonly import("../metrics.js").TeamTaskOutcomeRecord[];
  /**
   * The platform fee on the customer's FIRST paid invoice. The credit is capped at it so the guarantee
   * can never exceed what the customer paid us — it can waive our fee, never create a cash liability.
   * Null when there is no invoice yet, in which case there is nothing to credit against.
   */
  first_invoice_platform_fee_usd: number | null;
}
