import { assertVnextRuntime } from "../runtime/runtime-version.js";

export type LocalDatabase = import("node:sqlite").DatabaseSync;

export function openVnextDatabase(path: string): LocalDatabase {
  assertVnextRuntime();
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  return db;
}
