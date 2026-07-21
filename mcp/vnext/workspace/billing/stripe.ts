// The Stripe boundary: signature verification, exactly-once webhook application, and checkout.
//
// ORDER IS THE SECURITY CONTRACT, and it mirrors the GitHub webhook path deliberately:
//
//   1. VERIFY THE SIGNATURE over the EXACT raw bytes, in constant time, inside a replay window, BEFORE
//      the body is parsed. A forged or replayed delivery never reaches a JSON parser, never reaches the
//      applier, and leaves no trace that would swallow a later legitimate delivery of the same id.
//
//   2. CLAIM THE EVENT ID BEFORE APPLYING, in the SAME transaction as the state change. Stripe retries
//      for days; the claim is what makes a redelivery a no-op. Claiming OUTSIDE the transaction would
//      create the opposite bug — an apply that fails after the claim would be permanently swallowed —
//      so the insert and the subscription write commit or roll back together. Concurrent duplicates are
//      serialized by the unique key: the second inserter blocks until the first commits, then sees 0
//      rows and does nothing.
//
//   3. DERIVE STATE SERVER-SIDE. The plan comes from OUR price-id map, not from any name in the
//      payload; an unrecognised price grants nothing. The workspace comes from metadata we ourselves
//      set at checkout, or from the customer mapping we already stored — never from a free-text field a
//      request could invent.
//
// LIVE STRIPE IS AN HONEST GAP. Everything here is exercised with fixtures and a fake fetcher. No live
// key, account, product, price, or invoice has been exercised by this code.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "../db.js";
import {
  asPlanId,
  customerBoundElsewhere,
  lockSubscription,
  storeSubscription,
  workspaceForCustomer,
} from "./entitlements.js";
import type { PlanId, StoredSubscription, SubscriptionStatus } from "./types.js";

/** How far in the past a signed delivery may have been produced. Stripe's own default is 5 minutes. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/** A hostile header could carry thousands of candidate signatures; we never compare more than this. */
const MAX_SIGNATURE_CANDIDATES = 8;

/**
 * Stripe configuration. Every value is a DEPLOYMENT SECRET: nothing here is committed, and the price
 * ids in particular are per-deployment data, so the launch catalog in `types.ts` stays a description of
 * the offering rather than a hard-coded link to one Stripe account.
 */
export interface StripeConfig {
  secret_key: string;
  webhook_secret: string;
  api_base_url: string;
  /** plan → Stripe price id. A plan with no configured price simply cannot be checked out. */
  price_ids: Partial<Record<PlanId, string>>;
  success_url?: string;
  cancel_url?: string;
}

/**
 * Read Stripe configuration from the environment. Returns null when Stripe is not configured, so a
 * workspace with no billing integration still starts and still serves every local and team route —
 * billing is an add-on to the service, never a precondition for it.
 */
export function loadStripeConfig(env: NodeJS.ProcessEnv = process.env): StripeConfig | null {
  const secretKey = env.KAGE_STRIPE_SECRET_KEY;
  const webhookSecret = env.KAGE_STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  const priceIds: Partial<Record<PlanId, string>> = {};
  if (env.KAGE_STRIPE_PRICE_TEAM) priceIds.team = env.KAGE_STRIPE_PRICE_TEAM;
  if (env.KAGE_STRIPE_PRICE_BUSINESS) priceIds.business = env.KAGE_STRIPE_PRICE_BUSINESS;
  if (env.KAGE_STRIPE_PRICE_ENTERPRISE) priceIds.enterprise = env.KAGE_STRIPE_PRICE_ENTERPRISE;
  return {
    secret_key: secretKey,
    webhook_secret: webhookSecret,
    api_base_url: env.KAGE_STRIPE_API_BASE_URL ?? "https://api.stripe.com",
    price_ids: priceIds,
    success_url: env.KAGE_STRIPE_SUCCESS_URL,
    cancel_url: env.KAGE_STRIPE_CANCEL_URL,
  };
}

// ---------------------------------------------------------------------------------------------
// signature verification
// ---------------------------------------------------------------------------------------------

/** Produce the `t=<unix>,v1=<hex>` header Stripe sends. Used by tests and by nothing on the hot path. */
export function signStripePayload(
  secret: string,
  rawBody: Buffer | string,
  timestampSeconds: number,
): string {
  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const digest = createHmac("sha256", secret).update(`${timestampSeconds}.${payload}`).digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}

/** Constant-time hex/ascii compare that tolerates unequal lengths without leaking through an early exit. */
function constantTimeEquals(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  // Length inequality is already a definitive reject; timingSafeEqual requires equal lengths.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a `Stripe-Signature` header against the RAW body. Returns false — never throws — for a
 * missing, malformed, stale, or mismatched signature, so a hostile header can never become an error
 * path or a stack trace.
 *
 * The signed material is `${timestamp}.${payload}`, not the payload alone: a bare-payload HMAC would be
 * replayable forever, which is exactly what the timestamp and the tolerance window exist to prevent.
 */
export function verifyStripeSignature(
  secret: string,
  rawBody: Buffer | string,
  header: string | undefined | null,
  nowMs: number = Date.now(),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!header) return false;
  let timestamp: string | undefined;
  const candidates: string[] = [];
  for (const part of header.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (key === "t" && !timestamp) timestamp = value;
    else if (key === "v1" && candidates.length < MAX_SIGNATURE_CANDIDATES) candidates.push(value);
  }
  if (!timestamp || candidates.length === 0) return false;
  const signedAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(signedAt)) return false;
  // Reject both stale replays and implausibly future timestamps (a clock-skew forgery attempt).
  const ageSeconds = Math.abs(nowMs / 1000 - signedAt);
  if (ageSeconds > toleranceSeconds) return false;

  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = createHmac("sha256", secret).update(`${signedAt}.${payload}`).digest("hex");
  // Every candidate is compared (no early exit on the first match) so the number of comparisons does
  // not depend on which candidate matched.
  let matched = false;
  for (const candidate of candidates) {
    if (constantTimeEquals(expected, candidate)) matched = true;
  }
  return matched;
}

// ---------------------------------------------------------------------------------------------
// webhook intake
// ---------------------------------------------------------------------------------------------

export interface StripeDelivery {
  /** Exact bytes as received. The signature is computed over these, never over a re-serialized object. */
  rawBody: Buffer | string;
  signature: string | undefined | null;
}

export type StripeOutcome =
  | { status: 401; result: "invalid_signature" }
  | { status: 400; result: "malformed_body" | "missing_event_id" }
  | { status: 200; result: "duplicate_ignored" | "event_ignored" | "stale_event_ignored" }
  | {
      status: 202;
      result:
        | "processed"
        | "unmapped_customer"
        | "unknown_price"
        | "entitlement_summary_noted"
        | "customer_workspace_conflict";
    };

export interface StripeWebhookDeps {
  db: Db;
  config: StripeConfig;
  now?: () => number;
}

/** Subscription lifecycle events that actually move entitlement state. */
const SUBSCRIPTION_EVENTS: ReadonlySet<string> = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const HANDLED_EVENTS: ReadonlySet<string> = new Set([
  ...SUBSCRIPTION_EVENTS,
  "checkout.session.completed",
  // Stripe's entitlement summary. Advisory only — see `applyEntitlementSummary`.
  "entitlements.active_entitlement_summary.updated",
]);

const KNOWN_STATUSES: ReadonlySet<string> = new Set<SubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
  "incomplete_expired",
  "canceled",
]);

/** How many times an event id has been recorded. Exists so idempotency is assertable, not assumed. */
export async function billingEventCount(db: Db, eventId: string): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM billing_events WHERE event_id = $1`,
    [eventId],
  );
  return Number.parseInt(rows[0]?.count ?? "0", 10);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The plan this deployment maps a Stripe price id to. An unmapped price resolves to null: no grant. */
function planForPrice(config: StripeConfig, priceId: string | null): PlanId | null {
  if (!priceId) return null;
  for (const [plan, id] of Object.entries(config.price_ids)) {
    if (id === priceId) return asPlanId(plan);
  }
  return null;
}

/** Pull `(priceId, quantity)` out of a subscription's first line item, tolerating any shape. */
function firstItem(subscription: Record<string, unknown>): { priceId: string | null; quantity: number | null } {
  const items = asObject(subscription.items);
  const data = Array.isArray(items?.data) ? (items?.data as unknown[]) : [];
  const first = asObject(data[0]);
  const price = asObject(first?.price);
  return {
    priceId: typeof price?.id === "string" ? price.id : null,
    quantity: typeof first?.quantity === "number" ? first.quantity : null,
  };
}

/**
 * Resolve which tenant an event belongs to. Two sources, both server-owned:
 *   1. `metadata.workspace_id` — a value WE set when creating the checkout session, and which Stripe
 *      signed back to us; it is trusted only after being confirmed against the workspaces table.
 *   2. the customer → workspace mapping we already stored from an earlier event.
 * Anything else is unmapped, and an unmapped event applies nothing.
 */
async function resolveWorkspace(
  db: Db,
  object: Record<string, unknown>,
): Promise<string | null> {
  const metadata = asObject(object.metadata);
  const claimed = typeof metadata?.workspace_id === "string" ? metadata.workspace_id : "";
  if (claimed) {
    const { rows } = await db.query<{ workspace_id: string }>(
      `SELECT workspace_id FROM workspaces WHERE workspace_id::text = $1`,
      [claimed],
    );
    if (rows.length > 0) return rows[0].workspace_id;
  }
  const customer = typeof object.customer === "string" ? object.customer : null;
  return customer ? workspaceForCustomer(db, customer) : null;
}

/**
 * Process one Stripe delivery. Never throws for hostile input: it classifies and rejects. The whole
 * apply (event claim + state change) runs in ONE transaction, so an event is applied exactly once and
 * a failed apply leaves no claimed id behind to swallow Stripe's retry.
 */
export async function handleStripeEvent(
  deps: StripeWebhookDeps,
  delivery: StripeDelivery,
): Promise<StripeOutcome> {
  const now = deps.now ?? (() => Date.now());

  // 1. Signature first, over the raw bytes, before any parse.
  if (!verifyStripeSignature(deps.config.webhook_secret, delivery.rawBody, delivery.signature, now())) {
    return { status: 401, result: "invalid_signature" };
  }

  // 2. Parse only after the signature proved the bytes are Stripe's.
  let event: Record<string, unknown>;
  try {
    const text =
      typeof delivery.rawBody === "string" ? delivery.rawBody : delivery.rawBody.toString("utf8");
    const parsed = asObject(JSON.parse(text));
    if (!parsed) return { status: 400, result: "malformed_body" };
    event = parsed;
  } catch {
    return { status: 400, result: "malformed_body" };
  }

  const eventId = typeof event.id === "string" ? event.id : "";
  if (!eventId) return { status: 400, result: "missing_event_id" };
  const eventType = typeof event.type === "string" ? event.type : "";
  if (!HANDLED_EVENTS.has(eventType)) return { status: 200, result: "event_ignored" };

  const data = asObject(event.data);
  const object = asObject(data?.object);
  if (!object) return { status: 400, result: "malformed_body" };

  // Stripe's own generation time for this event. It is the ONLY ordering signal we have that survives
  // out-of-order delivery and multi-day retries; our receipt time is exactly the thing that is unreliable.
  const eventCreatedMs =
    typeof event.created === "number" && Number.isFinite(event.created) ? event.created * 1000 : null;

  // 3. Claim + apply atomically.
  try {
    return await deps.db.transaction(async (tx) => {
      const claimed = await tx.query(
        `INSERT INTO billing_events(event_id, event_type) VALUES($1, $2)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType],
      );
      if (claimed.rowCount === 0) return { status: 200, result: "duplicate_ignored" } as StripeOutcome;

      const workspaceId = await resolveWorkspace(tx, object);
      if (!workspaceId) {
        // Recorded (so Stripe's retries terminate) but nothing applied: we will not guess a tenant.
        return { status: 202, result: "unmapped_customer" } as StripeOutcome;
      }
      await tx.query(`UPDATE billing_events SET workspace_id = $1 WHERE event_id = $2`, [
        workspaceId,
        eventId,
      ]);

      if (eventType === "entitlements.active_entitlement_summary.updated") {
        return applyEntitlementSummary();
      }
      if (eventType === "checkout.session.completed") {
        return applyCheckoutCompleted(tx, workspaceId, object);
      }
      return applySubscriptionEvent(tx, deps.config, workspaceId, eventType, object, eventCreatedMs, eventId);
    });
  } catch (error) {
    // The customer→workspace uniqueness is also enforced by the database, and a concurrent delivery can
    // still lose that race after our own check passed. A constraint violation is a REFUSAL of this
    // delivery, not a fault: the transaction (including the event claim) rolled back, and answering 2xx
    // stops Stripe from retrying a delivery that will fail identically forever. This handler is
    // documented as never throwing for provider input, and that has to include losing a race.
    if (isUniqueViolation(error)) return { status: 202, result: "customer_workspace_conflict" };
    throw error;
  }
}

/** A Postgres unique-constraint violation (SQLSTATE 23505), whatever driver wrapper carries it. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Stripe's entitlement summary is ADVISORY here. Access is resolved from the subscription row this
 * service stored from a subscription event, so a summary alone can never grant a feature — which keeps
 * exactly one authority for entitlement instead of two that can disagree.
 */
function applyEntitlementSummary(): StripeOutcome {
  return { status: 202, result: "entitlement_summary_noted" };
}

/**
 * A completed checkout records the customer → workspace MAPPING only. It deliberately does not grant
 * anything: the subscription event that follows carries the authoritative status, price, and period,
 * and granting on "the customer reached the thank-you page" would entitle a payment that later failed.
 */
async function applyCheckoutCompleted(
  tx: Db,
  workspaceId: string,
  object: Record<string, unknown>,
): Promise<StripeOutcome> {
  const customer = typeof object.customer === "string" ? object.customer : null;
  const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
  if (customer && (await customerBoundElsewhere(tx, customer, workspaceId))) {
    return { status: 202, result: "customer_workspace_conflict" };
  }
  const { rows } = await tx.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM workspace_subscriptions WHERE workspace_id = $1`,
    [workspaceId],
  );
  if (rows.length === 0) {
    await storeSubscription(tx, {
      workspace_id: workspaceId,
      plan_id: null,
      status: "incomplete",
      current_period_end: null,
      cancel_at_period_end: false,
      stripe_customer_id: customer,
      stripe_subscription_id: subscriptionId,
      seats: null,
      updated_at: new Date().toISOString(),
    });
  } else {
    await tx.query(
      `UPDATE workspace_subscriptions
          SET stripe_customer_id = COALESCE($2, stripe_customer_id),
              stripe_subscription_id = COALESCE($3, stripe_subscription_id),
              updated_at = now()
        WHERE workspace_id = $1`,
      [workspaceId, customer, subscriptionId],
    );
  }
  return { status: 202, result: "processed" };
}

/**
 * Apply a subscription lifecycle event: the plan comes from OUR price map, the status from Stripe.
 *
 * TWO REFUSALS COME FIRST, both of which would otherwise be exploitable by nothing more than ordinary
 * Stripe behaviour:
 *
 *   1. STALE ORDER. Stripe does not guarantee delivery order and retries for days, so the last delivered
 *      event is NOT necessarily the newest. An event generated before the mark on the row applies
 *      nothing — otherwise a delayed `updated` that predates a cancellation re-grants a cancelled plan
 *      for a whole period. The row is locked FOR UPDATE first, so two concurrent deliveries cannot both
 *      read the same mark and both believe they are newest.
 *
 *   2. CUSTOMER COLLISION. One Stripe customer belongs to exactly one workspace (a unique index says so).
 *      A second workspace presenting an already-bound customer is refused here, rather than left to raise
 *      a constraint violation out of a handler that is documented as never throwing.
 */
async function applySubscriptionEvent(
  tx: Db,
  config: StripeConfig,
  workspaceId: string,
  eventType: string,
  object: Record<string, unknown>,
  eventCreatedMs: number | null,
  eventId: string,
): Promise<StripeOutcome> {
  const customerId = typeof object.customer === "string" ? object.customer : null;
  if (customerId && (await customerBoundElsewhere(tx, customerId, workspaceId))) {
    return { status: 202, result: "customer_workspace_conflict" };
  }

  const existing = await lockSubscription(tx, workspaceId);
  if (isStale(existing, eventCreatedMs, eventType)) {
    // Claimed (so the retries stop) and applied to nothing.
    return { status: 200, result: "stale_event_ignored" };
  }

  const { priceId, quantity } = firstItem(object);
  const plan = planForPrice(config, priceId);
  const rawStatus = typeof object.status === "string" ? object.status : "";
  // A deletion is terminal regardless of the status field; an unknown status is treated as not
  // entitling rather than optimistically accepted.
  const status: SubscriptionStatus =
    eventType === "customer.subscription.deleted"
      ? "canceled"
      : KNOWN_STATUSES.has(rawStatus)
        ? (rawStatus as SubscriptionStatus)
        : "incomplete";
  const periodEnd =
    typeof object.current_period_end === "number"
      ? new Date(object.current_period_end * 1000).toISOString()
      : null;

  const subscription: StoredSubscription = {
    workspace_id: workspaceId,
    plan_id: plan,
    status,
    current_period_end: periodEnd,
    cancel_at_period_end: object.cancel_at_period_end === true,
    stripe_customer_id: customerId,
    stripe_subscription_id: typeof object.id === "string" ? object.id : null,
    seats: quantity,
    updated_at: new Date().toISOString(),
    last_event_created_at: eventCreatedMs === null ? null : new Date(eventCreatedMs).toISOString(),
    last_event_id: eventCreatedMs === null ? null : eventId,
  };
  await storeSubscription(tx, subscription);
  // The state IS applied (so the customer mapping and status are current), but the caller is told the
  // price was not one of ours — an unmapped price grants nothing, and that is worth surfacing to ops.
  if (priceId && !plan) return { status: 202, result: "unknown_price" };
  return { status: 202, result: "processed" };
}

/** States a subscription does not come back from. A same-second tie must never reverse one of these. */
const TERMINAL_STATUSES: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  "canceled",
  "incomplete_expired",
]);

/**
 * Is this delivery older than what the row has already absorbed?
 *
 * The comparison is against `event.created`, Stripe's own generation time, which is the only ordering
 * signal that survives out-of-order delivery and multi-day retries.
 *
 *   - NO MARK (a row no subscription event has been applied to yet): never stale. The first event sets
 *     the mark; inventing an earlier one would drop a legitimate event.
 *   - NO GENERATION TIME: never stale. It cannot be ordered, and discarding a legitimately signed event
 *     would be a worse failure than the one this guard prevents.
 *   - STRICTLY OLDER: stale. This is the case that matters — a delayed `updated` generated before a
 *     cancellation must not re-grant the plan.
 *   - EXACT TIE: Stripe's timestamps have one-second granularity, so two legitimate events genuinely
 *     share a second (a checkout that creates and immediately updates a subscription). Refusing ties
 *     would drop real state, so a tie APPLIES — except that it can never resurrect a subscription that
 *     is already terminal. Within one ambiguous second, the direction that costs the customer money is
 *     the one we refuse to guess.
 */
function isStale(
  existing: StoredSubscription | null,
  eventCreatedMs: number | null,
  eventType: string,
): boolean {
  const mark = existing?.last_event_created_at ?? null;
  if (!mark || eventCreatedMs === null) return false;
  const previous = Date.parse(mark);
  if (!Number.isFinite(previous)) return false;
  if (eventCreatedMs > previous) return false;
  if (eventCreatedMs < previous) return true;
  if (eventType === "customer.subscription.deleted") return false;
  return existing !== null && TERMINAL_STATUSES.has(existing.status);
}

// ---------------------------------------------------------------------------------------------
// checkout, invoices, customer balance, and the portal
// ---------------------------------------------------------------------------------------------

/** The subset of `fetch` this module needs, so tests inject a fake transport instead of calling Stripe. */
export type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface StripeApiDeps {
  config: StripeConfig;
  fetcher?: Fetcher;
}

export interface CheckoutRequest {
  workspace_id: string;
  plan_id: PlanId;
  quantity: number;
  /**
   * Deliberately UNUSABLE. The price is server data resolved from `config.price_ids`; typing this
   * `never` means a caller cannot hand us a price id even by accident, and a reader can see at the type
   * level that the client does not choose what it is charged.
   */
  price_id?: never;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

function formEncode(fields: Record<string, string | number>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

/**
 * Create a Stripe Checkout session for a plan. The PRICE is looked up in the server's configured map;
 * a plan with no configured price is refused rather than guessed, and the workspace id travels as
 * metadata so the resulting webhook maps back to exactly one tenant.
 */
export async function createCheckoutSession(
  deps: StripeApiDeps,
  request: CheckoutRequest,
): Promise<CheckoutSession> {
  const price = deps.config.price_ids[request.plan_id];
  if (!price) {
    throw new Error(`no configured price for plan "${request.plan_id}"`);
  }
  const fetcher = deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
  const body = formEncode({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": Math.max(1, Math.floor(request.quantity)),
    "metadata[workspace_id]": request.workspace_id,
    "subscription_data[metadata][workspace_id]": request.workspace_id,
    success_url: deps.config.success_url ?? "https://kage.local/app/billing?checkout=success",
    cancel_url: deps.config.cancel_url ?? "https://kage.local/app/billing?checkout=cancelled",
  });
  const response = await fetcher(`${deps.config.api_base_url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${deps.config.secret_key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error(`stripe_checkout_failed:${response.status}`);
  const session = asObject(await response.json());
  if (typeof session?.id !== "string" || typeof session?.url !== "string") {
    throw new Error("stripe_checkout_malformed");
  }
  return { id: session.id, url: session.url };
}

/** The customer's FIRST paid invoice and what they paid US on it — the cap for the pilot guarantee. */
export interface FirstPaidInvoice {
  invoice_id: string;
  /**
   * The platform fee on that invoice, in USD. Every line on a Kage invoice IS the Kage platform fee
   * (there is no model-provider spend on it), so this is the invoice's `amount_paid` converted from
   * Stripe's minor units — not an estimate and not a share of anything.
   */
  platform_fee_usd: number;
  created_unix: number;
}

/**
 * Find the customer's earliest PAID invoice. Returns null when there is none, when the amount is not
 * positive, or when the invoice is not denominated in USD — the credit and its cap are USD figures, and
 * converting a foreign-currency invoice at an unrecorded rate would be an invented number.
 */
export async function fetchFirstPaidInvoice(
  deps: StripeApiDeps,
  customerId: string,
): Promise<FirstPaidInvoice | null> {
  const fetcher = deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
  const query = `customer=${encodeURIComponent(customerId)}&status=paid&limit=100`;
  const response = await fetcher(`${deps.config.api_base_url}/v1/invoices?${query}`, {
    method: "GET",
    headers: { authorization: `Bearer ${deps.config.secret_key}` },
  });
  if (!response.ok) throw new Error(`stripe_invoices_failed:${response.status}`);
  const list = asObject(await response.json());
  const data = Array.isArray(list?.data) ? (list?.data as unknown[]) : [];
  let earliest: FirstPaidInvoice | null = null;
  for (const item of data) {
    const invoice = asObject(item);
    if (!invoice) continue;
    if (invoice.status !== "paid") continue;
    if (typeof invoice.currency !== "string" || invoice.currency.toLowerCase() !== "usd") continue;
    if (typeof invoice.id !== "string") continue;
    const amountPaid = typeof invoice.amount_paid === "number" ? invoice.amount_paid : 0;
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) continue;
    const created = typeof invoice.created === "number" ? invoice.created : 0;
    if (earliest && created >= earliest.created_unix) continue;
    earliest = {
      invoice_id: invoice.id,
      platform_fee_usd: Math.round(amountPaid) / 100,
      created_unix: created,
    };
  }
  return earliest;
}

/**
 * Post a customer-balance CREDIT at Stripe, which is applied against the customer's invoices.
 *
 * `idempotency_key` is mandatory rather than optional: this is the one call in the service that moves
 * money, and a retry after a timeout must be a no-op at the provider even if our own bookkeeping never
 * saw the first response. The amount is negative because a negative customer balance is a credit.
 */
export async function creditCustomerBalance(
  deps: StripeApiDeps,
  request: { stripe_customer_id: string; credit_usd: number; description: string; idempotency_key: string },
): Promise<{ id: string }> {
  const cents = Math.round(request.credit_usd * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("stripe_credit_must_be_positive");
  }
  const fetcher = deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
  const response = await fetcher(
    `${deps.config.api_base_url}/v1/customers/${encodeURIComponent(request.stripe_customer_id)}/balance_transactions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${deps.config.secret_key}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": request.idempotency_key,
      },
      body: formEncode({ amount: -cents, currency: "usd", description: request.description }),
    },
  );
  if (!response.ok) throw new Error(`stripe_credit_failed:${response.status}`);
  const transaction = asObject(await response.json());
  if (typeof transaction?.id !== "string") throw new Error("stripe_credit_malformed");
  return { id: transaction.id };
}

/** Create a Stripe customer-portal session so a customer manages payment details at Stripe, not here. */
export async function createPortalSession(
  deps: StripeApiDeps,
  request: { stripe_customer_id: string; return_url?: string },
): Promise<{ url: string }> {
  const fetcher = deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
  const response = await fetcher(`${deps.config.api_base_url}/v1/billing_portal/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${deps.config.secret_key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: formEncode({
      customer: request.stripe_customer_id,
      return_url: request.return_url ?? deps.config.success_url ?? "https://kage.local/app/billing",
    }),
  });
  if (!response.ok) throw new Error(`stripe_portal_failed:${response.status}`);
  const session = asObject(await response.json());
  if (typeof session?.url !== "string") throw new Error("stripe_portal_malformed");
  return { url: session.url };
}
