// The command line behind `deploy/workspace/backup.sh` and `restore.sh`.
//
// The shell scripts are deliberately thin: they check that the required environment is present and then
// exec this. All the behaviour that matters — encryption, checksums, schema-compatibility refusals,
// the single restore transaction — lives in `backup.ts`, which is what the tests exercise. A shell
// script containing its own logic would be a second implementation nobody tests.
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { createDb } from "./db.js";
import { createBackup, restoreBackup, verifyBackup, BackupError } from "./backup.js";

export interface CliResult {
  code: number;
  output: string[];
}

function resolveKey(env: Record<string, string | undefined>): string {
  if (env.KAGE_BACKUP_KEY_FILE) return readFileSync(env.KAGE_BACKUP_KEY_FILE, "utf8").trim();
  const key = env.KAGE_BACKUP_KEY?.trim();
  if (!key) {
    throw new BackupError(
      "unreadable",
      "KAGE_BACKUP_KEY (or KAGE_BACKUP_KEY_FILE) is required: a backup is never written unencrypted.",
    );
  }
  return key;
}

/**
 * `backup <path>` | `restore <path>` | `verify <path>`.
 *
 * Restore accepts `--allow-nonempty` and `--migration-plan <from>:<to>`; both are explicit operator
 * statements, never defaults. The expected file hash comes from `KAGE_BACKUP_SHA256` when the operator's
 * catalogue records one.
 */
export async function runBackupCli(
  argv: readonly string[],
  env: Record<string, string | undefined> = process.env,
): Promise<CliResult> {
  const output: string[] = [];
  const [command, target, ...rest] = argv;
  if (!command || !["backup", "restore", "verify"].includes(command)) {
    output.push("usage: backup-cli <backup|restore|verify> <path> [--allow-nonempty] [--migration-plan from:to]");
    return { code: 2, output };
  }
  if (!target) {
    output.push(`${command} requires a file path`);
    return { code: 2, output };
  }
  const connectionString = env.KAGE_WORKSPACE_DATABASE_URL?.trim();
  if (!connectionString && command !== "verify") {
    output.push("KAGE_WORKSPACE_DATABASE_URL is required");
    return { code: 2, output };
  }
  let key: string;
  try {
    key = resolveKey(env);
  } catch (error) {
    output.push((error as Error).message);
    return { code: 2, output };
  }
  const expectSha = env.KAGE_BACKUP_SHA256?.trim() || undefined;

  if (command === "verify") {
    try {
      const verified = await verifyBackup(target, key, { expect_sha256: expectSha });
      output.push(
        JSON.stringify({
          ok: true,
          sha256: verified.sha256,
          sha256_verified: verified.sha256_verified,
          byte_size: verified.byte_size,
          schema_version: verified.manifest.schema_version,
          app_version: verified.manifest.app_version,
          rows: verified.rows,
          object_keys_expected: verified.manifest.object_manifest.length,
          object_bytes_included: verified.manifest.object_bytes_included,
        }),
      );
      return { code: 0, output };
    } catch (error) {
      output.push(JSON.stringify({ ok: false, error: errorPayload(error) }));
      return { code: 1, output };
    }
  }

  const db = createDb(connectionString as string);
  try {
    if (command === "backup") {
      const result = await createBackup(db, {
        directory: dirname(target),
        encryption_key: key,
        file_name: basename(target),
      });
      output.push(
        JSON.stringify({
          ok: true,
          backup_path: result.backup_path,
          sha256: result.sha256,
          byte_size: result.byte_size,
          schema_version: result.manifest.schema_version,
          app_version: result.manifest.app_version,
          tables: result.manifest.tables,
          // Stated on every backup so nobody assumes the blobs came with it.
          object_keys_expected: result.manifest.object_manifest.length,
          object_bytes_included: result.manifest.object_bytes_included,
        }),
      );
      return { code: 0, output };
    }

    const plan = parseMigrationPlan(rest);
    const result = await restoreBackup(db, target, key, {
      allow_nonempty: rest.includes("--allow-nonempty"),
      migration_plan: plan,
      expect_sha256: expectSha,
    });
    output.push(
      JSON.stringify({
        ok: true,
        schema_version: result.schema_version,
        rows_restored: result.rows_restored,
        tables: result.tables,
        sequences_advanced: result.sequences_advanced,
        // The operator still has to confirm the bucket: the backup never contained the blobs.
        object_keys_expected: result.object_keys_expected,
      }),
    );
    return { code: 0, output };
  } catch (error) {
    output.push(JSON.stringify({ ok: false, error: errorPayload(error) }));
    return { code: 1, output };
  } finally {
    await db.close().catch(() => {});
  }
}

function parseMigrationPlan(args: readonly string[]): { from: number; to: number } | undefined {
  const index = args.indexOf("--migration-plan");
  if (index === -1) return undefined;
  const value = args[index + 1] ?? "";
  const [from, to] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(from) || !Number.isInteger(to)) return undefined;
  return { from, to };
}

function errorPayload(error: unknown): { code: string; message: string } {
  if (error instanceof BackupError) return { code: error.code, message: error.message };
  return { code: "failed", message: (error as Error).message };
}

/* istanbul ignore next -- process entry point */
if (require.main === module) {
  void runBackupCli(process.argv.slice(2)).then((result) => {
    for (const line of result.output) process.stdout.write(`${line}\n`);
    process.exitCode = result.code;
  });
}
