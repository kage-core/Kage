import { openVnextDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { Repository } from "../repo-model/repository.js";

export interface OpenedModel {
  model: Repository;
  close: () => void;
}

/**
 * Open (creating and migrating if needed) the repository model for a project. This requires the vNext
 * runtime (Node 22.5+ for node:sqlite); openVnextDatabase asserts that boundary and throws a clear,
 * legacy-safe message on older Node. The database lives in the SAME per-project runtime directory the
 * rest of vNext uses (.agent_memory/daemon/vnext/local.db).
 */
export function openRepositoryModel(projectDir: string): OpenedModel {
  const paths = resolveRuntimePaths(projectDir);
  const db = openVnextDatabase(paths.databasePath);
  migrateLocalDatabase(db);
  return { model: new Repository(db), close: () => db.close() };
}

interface RepositoryIdRow {
  repository_id: string;
}

/** Distinct repository ids that have entities in the model, in stable order. */
export function repositoryIds(model: Repository): string[] {
  const rows = model.database
    .prepare(`SELECT DISTINCT repository_id FROM entities ORDER BY repository_id`)
    .all() as unknown as RepositoryIdRow[];
  return rows.map((row) => row.repository_id);
}
