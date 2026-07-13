import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { randomBytes } from "node:crypto";

export interface VnextRuntimeStatus {
  protocol_version: 1;
  pid: number;
  host: "127.0.0.1";
  port: number;
  mode: "audit" | "assist";
  started_at: string;
  database_path: string;
  token_path: string;
}

export interface RuntimeStatusLease {
  path: string;
  contents: string;
  device: number;
  inode: number;
}

function existingPath(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function describe(stats: Stats): string {
  if (stats.isSymbolicLink()) return "symbolic link";
  if (stats.isDirectory()) return "directory";
  if (stats.isFIFO()) return "FIFO";
  if (stats.isSocket()) return "socket";
  return "special filesystem object";
}

function removeTemporaryFile(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function writeRuntimeStatus(path: string, status: VnextRuntimeStatus): RuntimeStatusLease {
  const existing = existingPath(path);
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) {
    throw new Error(
      `Kage vNext status path "${path}" must be a regular file without symlinks; found ${describe(existing)}.`,
    );
  }

  const contents = `${JSON.stringify(status, null, 2)}\n`;
  const temporaryPath = `${path}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      temporaryPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, contents, "utf8");
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  try {
    renameSync(temporaryPath, path);
  } catch (error) {
    removeTemporaryFile(temporaryPath);
    throw error;
  }

  const written = lstatSync(path);
  return { path, contents, device: written.dev, inode: written.ino };
}

export function removeRuntimeStatus(lease: RuntimeStatusLease): void {
  const current = existingPath(lease.path);
  if (
    !current
    || !current.isFile()
    || current.isSymbolicLink()
    || current.dev !== lease.device
    || current.ino !== lease.inode
  ) return;

  let descriptor: number | undefined;
  try {
    descriptor = openSync(lease.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor);
    if (opened.dev !== lease.device || opened.ino !== lease.inode) return;
    if (readFileSync(descriptor, "utf8") !== lease.contents) return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ELOOP") return;
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  const beforeRemove = existingPath(lease.path);
  if (
    beforeRemove?.isFile()
    && !beforeRemove.isSymbolicLink()
    && beforeRemove.dev === lease.device
    && beforeRemove.ino === lease.inode
  ) unlinkSync(lease.path);
}
