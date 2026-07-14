import type { ContextDelivery } from "../protocol/index.js";
import type { LocalDatabase } from "./database.js";

/**
 * A context delivery, as the LOCAL STORE holds it.
 *
 * Protocol v1 is frozen: `ContextDelivery` (the wire type) has no latency field and does not gain
 * one here. The storage schema is Kage's own, so migration 002 adds `composition_latency_ms` and
 * this type — a storage record, never a wire value — carries it. Null whenever no capsule was
 * composed (a failed-open has no composition to time), because a 0 would be an invented number.
 */
export interface StoredContextDelivery extends ContextDelivery {
  composition_latency_ms: number | null;
}

interface ContextDeliveryRow {
  delivery_id: string;
  capsule_id: string;
  task_id: string;
  adapter_id: string;
  injection_location: ContextDelivery["injection_location"];
  delivered_at: string;
  added_bytes: number;
  added_tokens: number | null;
  measurement_quality: ContextDelivery["measurement_quality"];
  status: ContextDelivery["status"];
  reason: string;
  composition_latency_ms: number | null;
}

export interface DeliveryWriteResult {
  inserted: boolean;
}

const STATUSES: ReadonlySet<string> = new Set(["delivered", "skipped", "failed_open"]);
const INJECTION_LOCATIONS: ReadonlySet<string> = new Set(["system", "user_turn", "tool_result", "none"]);
const MEASUREMENT_QUALITIES: ReadonlySet<string> = new Set(["exact", "partial", "unavailable"]);

function invalid(field: string, detail: string): Error {
  return new Error(`Invalid context_deliveries.${field}: ${detail}`);
}

function assertNonnegativeSafeInteger(field: string, value: unknown, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value === "number" && Object.is(value, -0)) {
    throw invalid(field, "negative zero cannot be persisted losslessly.");
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw invalid(field, `expected ${nullable ? "null or " : ""}a nonnegative safe integer.`);
  }
}

function assertNonnegativeFiniteNumber(field: string, value: unknown, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value === "number" && Object.is(value, -0)) {
    throw invalid(field, "negative zero cannot be persisted losslessly.");
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw invalid(field, `expected ${nullable ? "null or " : ""}a finite nonnegative number.`);
  }
}

function assertNonemptyString(field: string, value: unknown): void {
  if (typeof value !== "string" || !value.trim()) throw invalid(field, "expected a nonempty string.");
}

/**
 * The invariants that stop a delivery row from claiming an attachment the user's session never saw.
 * They are enforced here, at the only door into the table, because every downstream number
 * (attachment_success_rate above all) is only as honest as these rows.
 *
 *   delivered  => context REALLY reached the agent: it went somewhere ("none" is not a place) and it
 *                 added bytes (an empty block is not an attachment; it is a skip).
 *   skipped    => Kage deliberately did NOT inject (audit mode, or an empty capsule). Nothing was
 *                 added, so it went nowhere and added zero bytes. This is the row that must never be
 *                 quietly counted as a success.
 *   failed_open => Kage could not attach and let the session continue. Same: nowhere, zero bytes.
 */
export function validateContextDelivery(delivery: StoredContextDelivery): void {
  assertNonemptyString("delivery_id", delivery.delivery_id);
  assertNonemptyString("capsule_id", delivery.capsule_id);
  assertNonemptyString("task_id", delivery.task_id);
  assertNonemptyString("adapter_id", delivery.adapter_id);
  assertNonemptyString("delivered_at", delivery.delivered_at);
  assertNonemptyString("reason", delivery.reason);
  if (!STATUSES.has(delivery.status)) throw invalid("status", "expected delivered, skipped, or failed_open.");
  if (!INJECTION_LOCATIONS.has(delivery.injection_location)) {
    throw invalid("injection_location", "expected system, user_turn, tool_result, or none.");
  }
  if (!MEASUREMENT_QUALITIES.has(delivery.measurement_quality)) {
    throw invalid("measurement_quality", "expected exact, partial, or unavailable.");
  }
  assertNonnegativeSafeInteger("added_bytes", delivery.added_bytes);
  assertNonnegativeSafeInteger("added_tokens", delivery.added_tokens, true);
  assertNonnegativeFiniteNumber("composition_latency_ms", delivery.composition_latency_ms, true);

  if (delivery.status === "delivered") {
    if (delivery.injection_location === "none") {
      throw invalid("injection_location", 'a "delivered" capsule must name where it was injected.');
    }
    if (delivery.added_bytes === 0) {
      throw invalid("added_bytes", 'a "delivered" capsule added bytes to the session; zero is a skip.');
    }
    return;
  }
  if (delivery.injection_location !== "none") {
    throw invalid(
      "injection_location",
      `a "${delivery.status}" capsule was not injected, so its location is "none".`,
    );
  }
  if (delivery.added_bytes !== 0) {
    throw invalid("added_bytes", `a "${delivery.status}" capsule added nothing to the session.`);
  }
}

/**
 * Append-only, exactly like EventStore and ReceiptStore: no update, no delete. A delivery is a
 * record of something that already happened to a user's session, so it can only ever be added.
 */
export class DeliveryStore {
  constructor(private readonly db: LocalDatabase) {}

  write(delivery: StoredContextDelivery): DeliveryWriteResult {
    validateContextDelivery(delivery);
    const result = this.db
      .prepare(`
        INSERT INTO context_deliveries (
          delivery_id,
          capsule_id,
          task_id,
          adapter_id,
          injection_location,
          delivered_at,
          added_bytes,
          added_tokens,
          measurement_quality,
          status,
          reason,
          composition_latency_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(delivery_id) DO NOTHING
      `)
      .run(
        delivery.delivery_id,
        delivery.capsule_id,
        delivery.task_id,
        delivery.adapter_id,
        delivery.injection_location,
        delivery.delivered_at,
        delivery.added_bytes,
        delivery.added_tokens,
        delivery.measurement_quality,
        delivery.status,
        delivery.reason,
        delivery.composition_latency_ms,
      );
    return { inserted: result.changes !== 0 };
  }

  forTask(taskId: string): StoredContextDelivery[] {
    const rows = this.db
      .prepare(`${SELECT_DELIVERY} WHERE task_id = ? ORDER BY delivered_at, delivery_id`)
      .all(taskId) as unknown as ContextDeliveryRow[];
    return rows.map(toDelivery);
  }

  /**
   * Every delivery, oldest first, optionally capped. Reporting surfaces read deliveries through
   * this instead of inventing their own SQL, so a delivery reaches a report only in the exact shape
   * it was written — nothing derived, defaulted, or zero-filled on the way out.
   */
  list(options: { limit?: number } = {}): StoredContextDelivery[] {
    const limit = Number.isSafeInteger(options.limit) && (options.limit as number) > 0
      ? (options.limit as number)
      : -1;
    const rows = this.db
      .prepare(`${SELECT_DELIVERY} ORDER BY delivered_at, delivery_id LIMIT ?`)
      .all(limit) as unknown as ContextDeliveryRow[];
    return rows.map(toDelivery);
  }
}

const SELECT_DELIVERY = `
  SELECT
    delivery_id,
    capsule_id,
    task_id,
    adapter_id,
    injection_location,
    delivered_at,
    added_bytes,
    added_tokens,
    measurement_quality,
    status,
    reason,
    composition_latency_ms
  FROM context_deliveries
`;

function toDelivery(row: ContextDeliveryRow): StoredContextDelivery {
  return {
    delivery_id: row.delivery_id,
    capsule_id: row.capsule_id,
    task_id: row.task_id,
    adapter_id: row.adapter_id,
    injection_location: row.injection_location,
    delivered_at: row.delivered_at,
    added_bytes: row.added_bytes,
    added_tokens: row.added_tokens,
    measurement_quality: row.measurement_quality,
    status: row.status,
    reason: row.reason,
    composition_latency_ms: row.composition_latency_ms,
  };
}
