import { chmodSync, lstatSync, mkdirSync, type Stats } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface VnextRuntimePaths {
  projectRoot: string;
  runtimeDirectory: string;
  tokenPath: string;
  databasePath: string;
  statusPath: string;
}

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
    databasePath: join(runtimeDirectory, "local.db"),
    statusPath: join(runtimeDirectory, "status.json"),
  };
}

export function ensureRuntimeDirectory(path: string): void {
  const directories = [dirname(dirname(path)), dirname(path), path];
  const runtimeExisted = existingPath(path) !== undefined;
  for (const directory of directories) {
    const existing = existingPath(directory);
    if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
      throw new Error(`Kage vNext runtime ancestor "${directory}" must be a directory without symlinks.`);
    }
  }

  mkdirSync(path, { recursive: true, mode: 0o700 });
  for (const directory of directories) {
    const created = lstatSync(directory);
    if (!created.isDirectory() || created.isSymbolicLink()) {
      throw new Error(`Kage vNext runtime ancestor "${directory}" must be a directory without symlinks.`);
    }
  }
  if (!runtimeExisted) chmodSync(path, 0o700);
}
