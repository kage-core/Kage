import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  type Stats,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface VnextRuntimePaths {
  projectRoot: string;
  runtimeDirectory: string;
  tokenPath: string;
  lockPath: string;
  databasePath: string;
  statusPath: string;
}

export interface RuntimeDirectoryLease {
  path: string;
  device: number;
  inode: number;
  uid: number;
}

// This lease is the runtime's trusted parent boundary: a current-user-owned
// directory locked to 0700 plus explicit device/inode checks around path-based
// operations. It detects replacement; it is not a claim of generic openat-style
// guarantees that Node's portable filesystem API cannot provide.

function existingPath(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function resolveRuntimePaths(projectDir: string): VnextRuntimePaths {
  const projectRoot = resolve(projectDir);
  const runtimeDirectory = join(projectRoot, ".agent_memory", "daemon", "vnext");
  return {
    projectRoot,
    runtimeDirectory,
    tokenPath: join(runtimeDirectory, "token"),
    lockPath: join(runtimeDirectory, "runtime-lock.db"),
    databasePath: join(runtimeDirectory, "local.db"),
    statusPath: join(runtimeDirectory, "status.json"),
  };
}

function assertDirectoryAncestors(directories: readonly string[]): void {
  for (const directory of directories) {
    const existing = existingPath(directory);
    if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
      throw new Error(`Kage vNext runtime ancestor "${directory}" must be a directory without symlinks.`);
    }
  }
}

function isSameDirectory(stats: Stats, lease: RuntimeDirectoryLease): boolean {
  return stats.isDirectory()
    && !stats.isSymbolicLink()
    && stats.dev === lease.device
    && stats.ino === lease.inode;
}

export function ensureRuntimeDirectory(path: string): RuntimeDirectoryLease {
  const directories = [dirname(dirname(path)), dirname(path), path];
  assertDirectoryAncestors(directories);

  mkdirSync(path, { recursive: true, mode: 0o700 });
  assertDirectoryAncestors(directories);

  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor);
    if (!opened.isDirectory()) {
      throw new Error(`Kage vNext runtime path "${path}" must be a directory without symlinks.`);
    }
    const currentUid = process.getuid?.();
    if (currentUid !== undefined && opened.uid !== currentUid) {
      throw new Error(`Kage vNext runtime directory "${path}" must be owned by the current user before permissions are changed.`);
    }
    assertDirectoryAncestors(directories);
    const lease = { path, device: opened.dev, inode: opened.ino, uid: opened.uid };
    if (!isSameDirectory(lstatSync(path), lease)) {
      throw new Error(`Kage vNext runtime directory "${path}" was replaced while it was being secured.`);
    }
    fchmodSync(descriptor, 0o700);
    const secured = fstatSync(descriptor);
    if ((secured.mode & 0o777) !== 0o700 || !isSameDirectory(lstatSync(path), lease)) {
      throw new Error(`Kage vNext runtime directory "${path}" was replaced while it was being secured.`);
    }
    return lease;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function assertRuntimeDirectoryLease(lease: RuntimeDirectoryLease): void {
  let runtime: Stats;
  try {
    runtime = lstatSync(lease.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Kage vNext runtime directory "${lease.path}" was replaced or removed.`);
    }
    throw error;
  }
  if (!isSameDirectory(runtime, lease)) {
    throw new Error(`Kage vNext runtime directory "${lease.path}" was replaced or removed.`);
  }
  const currentUid = process.getuid?.();
  if ((currentUid !== undefined && runtime.uid !== currentUid) || runtime.uid !== lease.uid) {
    throw new Error(`Kage vNext runtime directory "${lease.path}" is no longer owned by the secured user.`);
  }
  if ((runtime.mode & 0o777) !== 0o700) {
    throw new Error(`Kage vNext runtime directory "${lease.path}" is no longer secured with mode 0700.`);
  }
}
