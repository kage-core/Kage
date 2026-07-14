import { existsSync } from "node:fs";
import { readAdapterConnection } from "../adapters/client.js";
import type { TransformationReceipt } from "../protocol/index.js";
import { openVnextDatabase } from "../storage/database.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { resolveRuntimePaths } from "./paths.js";

const HEALTH_TIMEOUT_MS = 500;

export interface RuntimeHealth {
  running: boolean;
  url: string | null;
  mode: "audit" | "assist" | null;
  protocol_version: number | null;
  /** A fixed token, never a message derived from a response body. */
  reason: "healthy" | "not_running" | "unreachable" | "unhealthy";
}

export interface ReceiptQuery {
  task_id?: string;
  limit?: number;
}

/**
 * Receipts, or an explicit statement that they could not be read. `available: false` is NOT an
 * empty result: "the store is unreadable" and "no request was transformed" are different facts,
 * and collapsing them would let a broken measurement path read as a clean audit period.
 */
export interface ReceiptQueryResult {
  available: boolean;
  reason: string | null;
  receipts: TransformationReceipt[];
}

export interface RuntimeClient {
  project_dir: string;
  health(): Promise<RuntimeHealth>;
  receipts(query?: ReceiptQuery): Promise<ReceiptQueryResult>;
}

const NOT_RUNNING: RuntimeHealth = {
  running: false,
  url: null,
  mode: null,
  protocol_version: null,
  reason: "not_running",
};

/**
 * Health, from the runtime itself. Discovery reuses the adapter's rules (owned, private, alive)
 * so the CLI cannot be pointed at a stranger's port by a checked-in status file. Never throws:
 * an unreachable runtime is a reportable state, not a crashed command.
 */
export async function probeRuntimeHealth(projectDir: string): Promise<RuntimeHealth> {
  const connection = readAdapterConnection(projectDir);
  if (!connection) return NOT_RUNNING;
  try {
    const response = await fetch(`${connection.url}/v2/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { running: false, url: connection.url, mode: connection.mode, protocol_version: null, reason: "unhealthy" };
    }
    const body: unknown = await response.json().catch(() => null);
    const version = body && typeof body === "object" && "protocol_version" in body
      ? (body as { protocol_version: unknown }).protocol_version
      : null;
    return {
      running: true,
      url: connection.url,
      mode: connection.mode,
      protocol_version: typeof version === "number" ? version : null,
      reason: "healthy",
    };
  } catch {
    return { running: false, url: connection.url, mode: connection.mode, protocol_version: null, reason: "unreachable" };
  }
}

/**
 * Receipts come from the local SQLite store rather than from the runtime's HTTP surface, because
 * a receipt outlives the process that wrote it: an audit period is reportable after the daemon
 * has stopped, and the daemon does not have to be running for `kage receipts` to tell the truth.
 * Every failure to read is surfaced as `available: false` with a fixed reason token.
 */
export function readLocalReceipts(projectDir: string, query: ReceiptQuery = {}): ReceiptQueryResult {
  const paths = resolveRuntimePaths(projectDir);
  if (!existsSync(paths.databasePath)) {
    return { available: false, reason: "no_receipt_store", receipts: [] };
  }
  let database;
  try {
    database = openVnextDatabase(paths.databasePath);
  } catch (error) {
    // node:sqlite is unavailable below Node 22.5, and the runtime refuses to open a store it does
    // not own. Both are "cannot read", never "nothing happened".
    const message = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      reason: message.includes("Node 22.5") ? "runtime_unsupported" : "receipt_store_unreadable",
      receipts: [],
    };
  }
  try {
    const store = new ReceiptStore(database);
    const receipts = query.task_id ? store.forTask(query.task_id) : store.list({ limit: query.limit });
    return { available: true, reason: null, receipts };
  } catch {
    return { available: false, reason: "receipt_store_unreadable", receipts: [] };
  } finally {
    try {
      database.close();
    } catch {
      // A close failure cannot invalidate rows that were already read.
    }
  }
}

export function createRuntimeClient(projectDir: string): RuntimeClient {
  return {
    project_dir: projectDir,
    health: () => probeRuntimeHealth(projectDir),
    async receipts(query?: ReceiptQuery) {
      return readLocalReceipts(projectDir, query ?? {});
    },
  };
}
