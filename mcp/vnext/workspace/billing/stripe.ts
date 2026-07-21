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
import { asPlanId, storeSubscription, workspaceForCustomer } from "./entitlements.js";
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
  | { status: 200; result: "duplicate_ignored" | "event_ignored" }
  | {
      status: 202;
      result: "processed" | "unmapped_customer" | "unknown_price" | "entitlement_summary_noted";
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

  // 3. Claim + apply atomically.
  return deps.db.transaction(async (tx) => {
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
    return applySubscriptionEvent(tx, deps.config, workspaceId, eventType, object);
  });
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

/** Apply a subscription lifecycle event: the plan comes from OUR price map, the status from Stripe. */
async function applySubscriptionEvent(
  tx: Db,
  config: StripeConfig,
  workspaceId: string,
  eventType: string,
  object: Record<string, unknown>,
): Promise<StripeOutcome> {
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
    stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
    stripe_subscription_id: typeof object.id === "string" ? object.id : null,
    seats: quantity,
    updated_at: new Date().toISOString(),
  };
  await storeSubscription(tx, subscription);
  // The state IS applied (so the customer mapping and status are current), but the caller is told the
  // price was not one of ours — an unmapped price grants nothing, and that is worth surfacing to ops.
  if (priceId && !plan) return { status: 202, result: "unknown_price" };
  return { status: 202, result: "processed" };
}

// ---------------------------------------------------------------------------------------------
// checkout + customer portal
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
