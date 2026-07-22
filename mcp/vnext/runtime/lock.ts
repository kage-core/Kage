import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";

export interface RuntimeLockLease {
  path: string;
  database: LocalDatabase;
  active: boolean;
}

function isDatabaseBusy(error: unknown): boolean {
  return error instanceof Error && /\b(?:busy|locked)\b/i.test(error.message);
}

export function acquireRuntimeLock(path: string): RuntimeLockLease {
  const database = openVnextDatabase(path);
  try {
    database.exec("PRAGMA busy_timeout=0");
    database.exec("BEGIN IMMEDIATE");
    return { path, database, active: true };
  } catch (error) {
    try {
      database.close();
    } catch {
      // Preserve the acquisition failure.
    }
    if (isDatabaseBusy(error)) {
      throw new Error("Kage vNext local runtime is already running for this project.");
    }
    throw error;
  }
}

export function releaseRuntimeLock(lease: RuntimeLockLease): void {
  if (!lease.active) return;
  lease.active = false;

  let failure: unknown;
  try {
    lease.database.exec("ROLLBACK");
  } catch (error) {
    failure = error;
  }
  try {
    lease.database.close();
  } catch (error) {
    failure ??= error;
  }
  if (failure) throw failure;
}
