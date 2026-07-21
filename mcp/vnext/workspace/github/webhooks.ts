// GitHub webhook intake.
//
// Order matters and is the security contract:
//   1. Verify the signature against the RAW bytes — before any parsing. An invalid signature is 401 and
//      the processor is never called.
//   2. Record the delivery id BEFORE processing. The insert is the idempotency gate, so a redelivered
//      event (GitHub retries aggressively) is processed exactly once.
//   3. Only then parse, and only dispatch events we actually subscribe to.
import type { Db } from "../db.js";
import { verifySignature } from "./signature.js";
import { HANDLED_EVENTS } from "./config.js";

export interface WebhookDelivery {
  /** Exact bytes as received — the signature is computed over these, not over a re-serialized object. */
  rawBody: Buffer | string;
  signature: string | undefined | null;
  /** `X-GitHub-Event` */
  event: string | undefined;
  /** `X-GitHub-Delivery` — the idempotency key. */
  deliveryId: string | undefined;
  workspaceId: string;
}

export type WebhookOutcome =
  | { status: 401; result: "invalid_signature" }
  | { status: 400; result: "missing_delivery_id" | "malformed_body" }
  | { status: 202; result: "processed" }
  | { status: 200; result: "duplicate_ignored" | "event_ignored" };

/** Handles a parsed, verified, first-seen event. Implemented by the workspace ingest layer. */
export type WebhookProcessor = (event: {
  name: string;
  deliveryId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
}) => Promise<void>;

export interface WebhookDeps {
  db: Db;
  secret: string;
  process: WebhookProcessor;
}

/**
 * Claim a delivery id for this workspace. Returns true when this call is the one that recorded it
 * (i.e. the event is new), false when it was already present (a redelivery).
 */
async function claimDelivery(
  db: Db,
  workspaceId: string,
  deliveryId: string,
  event: string,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO github_deliveries(workspace_id, delivery_id, event)
     VALUES($1, $2, $3)
     ON CONFLICT (workspace_id, delivery_id) DO NOTHING`,
    [workspaceId, deliveryId, event],
  );
  return rowCount > 0;
}

/** Process one webhook delivery. Never throws for hostile input — it classifies and rejects. */
export async function handleWebhook(deps: WebhookDeps, delivery: WebhookDelivery): Promise<WebhookOutcome> {
  // 1. Signature first, over the raw bytes, before any parse.
  if (!verifySignature(deps.secret, delivery.rawBody, delivery.signature)) {
    return { status: 401, result: "invalid_signature" };
  }
  if (!delivery.deliveryId) {
    return { status: 400, result: "missing_delivery_id" };
  }
  const eventName = delivery.event ?? "";

  // 2. Idempotency gate before any side effect.
  const isNew = await claimDelivery(deps.db, delivery.workspaceId, delivery.deliveryId, eventName);
  if (!isNew) {
    return { status: 200, result: "duplicate_ignored" };
  }

  if (!HANDLED_EVENTS.has(eventName)) {
    return { status: 200, result: "event_ignored" };
  }

  // 3. Parse only after the signature proved the bytes are ours.
  let payload: Record<string, unknown>;
  try {
    const text =
      typeof delivery.rawBody === "string" ? delivery.rawBody : delivery.rawBody.toString("utf8");
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { status: 400, result: "malformed_body" };
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return { status: 400, result: "malformed_body" };
  }

  await deps.process({
    name: eventName,
    deliveryId: delivery.deliveryId,
    workspaceId: delivery.workspaceId,
    payload,
  });
  return { status: 202, result: "processed" };
}
