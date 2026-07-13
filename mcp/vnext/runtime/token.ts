import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { randomBytes } from "node:crypto";

const TOKEN_PATTERN = /^klt_[A-Za-z0-9_-]{43}$/;

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

function parseToken(raw: string, path: string): string {
  const token = raw.endsWith("\n") && !raw.endsWith("\n\n") ? raw.slice(0, -1) : raw;
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error(`Kage vNext token at "${path}" is empty or malformed.`);
  }
  return token;
}

function readExistingToken(path: string): string {
  const beforeOpen = existingPath(path);
  if (!beforeOpen) throw Object.assign(new Error(`Kage vNext token at "${path}" disappeared.`), { code: "ENOENT" });
  if (!beforeOpen.isFile() || beforeOpen.isSymbolicLink()) {
    throw new Error(
      `Kage vNext token path "${path}" must be a regular file without symlinks; found ${describe(beforeOpen)}.`,
    );
  }

  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor);
    if (!opened.isFile()) {
      throw new Error(`Kage vNext token path "${path}" must be a regular file without symlinks.`);
    }
    fchmodSync(descriptor, 0o600);
    return parseToken(readFileSync(descriptor, "utf8"), path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function removeTemporaryFile(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function ensureRuntimeToken(path: string): string {
  if (existingPath(path)) return readExistingToken(path);

  const token = `klt_${randomBytes(32).toString("base64url")}`;
  const temporaryPath = `${path}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      temporaryPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, token, "utf8");
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  try {
    linkSync(temporaryPath, path);
    return token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return readExistingToken(path);
  } finally {
    removeTemporaryFile(temporaryPath);
  }
}
