import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { assertVnextRuntime } from "../runtime/runtime-version.js";

export type LocalDatabase = import("node:sqlite").DatabaseSync;

export function openVnextDatabase(path: string): LocalDatabase {
  assertVnextRuntime();
  const fileBacked = path !== ":memory:";
  if (fileBacked) {
    const runtimeDirectory = dirname(path);
    mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
    chmodSync(runtimeDirectory, 0o700);
  }

  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(path);
  try {
    if (fileBacked) chmodSync(path, 0o600);
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
