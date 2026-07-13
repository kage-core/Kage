import { chmodSync, closeSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import { assertVnextRuntime } from "../runtime/runtime-version.js";

export type LocalDatabase = import("node:sqlite").DatabaseSync;

function ensurePrivateDatabaseFile(path: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  chmodSync(path, 0o600);
}

export function openVnextDatabase(path: string): LocalDatabase {
  assertVnextRuntime();
  const fileBacked = path !== ":memory:";
  if (fileBacked) {
    const runtimeDirectory = dirname(path);
    const createdDirectory = mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
    if (createdDirectory !== undefined) chmodSync(runtimeDirectory, 0o700);
    ensurePrivateDatabaseFile(path);
  }

  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    return db;
  } catch (error) {
    try {
      db.close();
    } catch {
      // Preserve the initialization failure that made this handle unusable.
    }
    throw error;
  }
}
