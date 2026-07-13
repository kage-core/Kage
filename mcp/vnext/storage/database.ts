import { chmodSync, closeSync, lstatSync, mkdirSync, openSync, type Stats } from "node:fs";
import { dirname } from "node:path";
import { assertVnextRuntime } from "../runtime/runtime-version.js";

export type LocalDatabase = import("node:sqlite").DatabaseSync;

type DatabaseFileRole = "database" | "WAL sidecar" | "SHM sidecar";

interface DatabaseFile {
  path: string;
  role: DatabaseFileRole;
  required: boolean;
}

function existingPath(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function fileKind(stats: Stats): string {
  if (stats.isSymbolicLink()) return "symbolic link";
  if (stats.isDirectory()) return "directory";
  if (stats.isFIFO()) return "FIFO";
  if (stats.isSocket()) return "socket";
  if (stats.isCharacterDevice()) return "character device";
  if (stats.isBlockDevice()) return "block device";
  return "special filesystem object";
}

function validateAndTightenFiles(files: readonly DatabaseFile[]): void {
  const existingFiles: DatabaseFile[] = [];
  for (const file of files) {
    const stats = existingPath(file.path);
    if (!stats) {
      if (file.required) {
        throw new Error(`Kage vNext ${file.role} path "${file.path}" disappeared before it could be opened.`);
      }
      continue;
    }
    if (!stats.isFile()) {
      throw new Error(
        `Kage vNext ${file.role} path "${file.path}" must be a regular file without symlinks; found ${fileKind(stats)}.`,
      );
    }
    existingFiles.push(file);
  }

  for (const file of existingFiles) chmodSync(file.path, 0o600);
}

function ensureDatabaseFileExists(path: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function databaseFiles(path: string): readonly DatabaseFile[] {
  return [
    { path, role: "database", required: true },
    { path: `${path}-wal`, role: "WAL sidecar", required: false },
    { path: `${path}-shm`, role: "SHM sidecar", required: false },
  ];
}

function sidecarFiles(path: string): readonly DatabaseFile[] {
  return databaseFiles(path).slice(1);
}

export function openVnextDatabase(path: string): LocalDatabase {
  assertVnextRuntime();
  const fileBacked = path !== ":memory:";
  if (fileBacked) {
    const runtimeDirectory = dirname(path);
    const createdDirectory = mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
    if (createdDirectory !== undefined) chmodSync(runtimeDirectory, 0o700);
    ensureDatabaseFileExists(path);
    validateAndTightenFiles(databaseFiles(path));
  }

  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    if (fileBacked) validateAndTightenFiles(sidecarFiles(path));
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
