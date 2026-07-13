import type { TransformationReceipt } from "../protocol/index.js";
import type { LocalDatabase } from "./database.js";
import { parseJsonStringArray, stringifyJsonStringArray } from "./json.js";

interface TransformationReceiptRow {
  receipt_id: string;
  task_id: string;
  request_id: string;
  provider: string;
  model: string | null;
  mode: TransformationReceipt["mode"];
  measurement_quality: TransformationReceipt["measurement_quality"];
  before_input_bytes: number;
  after_input_bytes: number;
  before_input_tokens: number | null;
  after_input_tokens: number | null;
  output_tokens: number | null;
  kage_processing_cost_usd: number | null;
  provider_input_cost_before_usd: number | null;
  provider_input_cost_after_usd: number | null;
  latency_ms: number;
  transformations_json: string;
  created_at: string;
}

export interface ReceiptWriteResult {
  inserted: boolean;
}

function assertNonnegativeSafeInteger(field: string, value: unknown, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value === "number" && Object.is(value, -0)) {
    throw new Error(`Invalid transformation_receipts.${field}: negative zero cannot be persisted losslessly.`);
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `Invalid transformation_receipts.${field}: expected ${nullable ? "null or " : ""}a nonnegative safe integer.`,
    );
  }
}

function assertNonnegativeFiniteNumber(field: string, value: unknown, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value === "number" && Object.is(value, -0)) {
    throw new Error(`Invalid transformation_receipts.${field}: negative zero cannot be persisted losslessly.`);
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid transformation_receipts.${field}: expected ${nullable ? "null or " : ""}a finite nonnegative number.`,
    );
  }
}

function validateReceiptMetrics(receipt: TransformationReceipt): void {
  assertNonnegativeSafeInteger("before_input_bytes", receipt.before_input_bytes);
  assertNonnegativeSafeInteger("after_input_bytes", receipt.after_input_bytes);
  assertNonnegativeSafeInteger("before_input_tokens", receipt.before_input_tokens, true);
  assertNonnegativeSafeInteger("after_input_tokens", receipt.after_input_tokens, true);
  assertNonnegativeSafeInteger("output_tokens", receipt.output_tokens, true);
  assertNonnegativeFiniteNumber("kage_processing_cost_usd", receipt.kage_processing_cost_usd, true);
  assertNonnegativeFiniteNumber("provider_input_cost_before_usd", receipt.provider_input_cost_before_usd, true);
  assertNonnegativeFiniteNumber("provider_input_cost_after_usd", receipt.provider_input_cost_after_usd, true);
  assertNonnegativeFiniteNumber("latency_ms", receipt.latency_ms);
}

export class ReceiptStore {
  constructor(private readonly db: LocalDatabase) {}

  write(receipt: TransformationReceipt): ReceiptWriteResult {
    validateReceiptMetrics(receipt);
    const transformationsJson = stringifyJsonStringArray(
      receipt.transformations,
      `transformation_receipts.transformations_json for receipt_id "${receipt.receipt_id}"`,
    );
    const result = this.db
      .prepare(`
        INSERT INTO transformation_receipts (
          receipt_id,
          task_id,
          request_id,
          provider,
          model,
          mode,
          measurement_quality,
          before_input_bytes,
          after_input_bytes,
          before_input_tokens,
          after_input_tokens,
          output_tokens,
          kage_processing_cost_usd,
          provider_input_cost_before_usd,
          provider_input_cost_after_usd,
          latency_ms,
          transformations_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(request_id) DO NOTHING
      `)
      .run(
        receipt.receipt_id,
        receipt.task_id,
        receipt.request_id,
        receipt.provider,
        receipt.model,
        receipt.mode,
        receipt.measurement_quality,
        receipt.before_input_bytes,
        receipt.after_input_bytes,
        receipt.before_input_tokens,
        receipt.after_input_tokens,
        receipt.output_tokens,
        receipt.kage_processing_cost_usd,
        receipt.provider_input_cost_before_usd,
        receipt.provider_input_cost_after_usd,
        receipt.latency_ms,
        transformationsJson,
        receipt.created_at,
      );

    return { inserted: result.changes !== 0 };
  }

  forTask(taskId: string): TransformationReceipt[] {
    const rows = this.db
      .prepare(`
        SELECT
          receipt_id,
          task_id,
          request_id,
          provider,
          model,
          mode,
          measurement_quality,
          before_input_bytes,
          after_input_bytes,
          before_input_tokens,
          after_input_tokens,
          output_tokens,
          kage_processing_cost_usd,
          provider_input_cost_before_usd,
          provider_input_cost_after_usd,
          latency_ms,
          transformations_json,
          created_at
        FROM transformation_receipts
        WHERE task_id = ?
        ORDER BY created_at, receipt_id
      `)
      .all(taskId) as unknown as TransformationReceiptRow[];

    return rows.map((row) => ({
      receipt_id: row.receipt_id,
      task_id: row.task_id,
      request_id: row.request_id,
      provider: row.provider,
      model: row.model,
      mode: row.mode,
      measurement_quality: row.measurement_quality,
      before_input_bytes: row.before_input_bytes,
      after_input_bytes: row.after_input_bytes,
      before_input_tokens: row.before_input_tokens,
      after_input_tokens: row.after_input_tokens,
      output_tokens: row.output_tokens,
      kage_processing_cost_usd: row.kage_processing_cost_usd,
      provider_input_cost_before_usd: row.provider_input_cost_before_usd,
      provider_input_cost_after_usd: row.provider_input_cost_after_usd,
      latency_ms: row.latency_ms,
      transformations: parseJsonStringArray(
        row.transformations_json,
        `transformation_receipts.transformations_json for receipt_id "${row.receipt_id}"`,
      ),
      created_at: row.created_at,
    }));
  }
}
