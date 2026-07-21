// The workspace service's process entry point: what the container actually runs.
//
// THE ORDER IS THE CONTRACT. A pod that opens its port before its migrations finish will take traffic
// against a half-built schema, and the errors that follow look like application bugs rather than a
// deploy race. So this module migrates FIRST, checks the resulting version, and only then listens. The
// health probe the container runs reports that same version, so an orchestrator can distinguish
// "starting" from "serving" without guessing.
//
// IT REFUSES A DATABASE IT DOES NOT UNDERSTAND. During a rolling deploy both the old and the new image
// are alive at once. The new image migrates forward; the OLD image then finds a schema newer than the
// migrations it ships. It must not serve that database — an old build writing against a new schema is
// how a rollback turns into data corruption. It exits instead, loudly, and the orchestrator keeps the
// new pods.
//
// CONFIGURATION IS EXPLICIT. There is no default database URL. A service that silently falls back to
// `postgres://localhost/kage` when its configuration is missing will happily come up pointing at the
// wrong database, and the first sign of it is a customer's missing knowledge.
import { createDb, type Db } from "./db.js";
import { LATEST_MIGRATION, migrate } from "./migrate.js";
import { startWorkspaceServer, type WorkspaceServer, type WorkspaceServerOptions } from "./server.js";

export type BootErrorCode = "missing_database_url" | "invalid_port" | "schema_newer_than_build";

export class BootError extends Error {
  constructor(
    readonly code: BootErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BootError";
  }
}

/** The port the image listens on by default, and the port the compose file and health probe assume. */
export const DEFAULT_WORKSPACE_PORT = 8787;

export type BootPhase = "migrating" | "migrated" | "listening" | "stopping" | "stopped";

export interface BootEvent {
  phase: BootPhase;
  schema_version?: number;
  port?: number;
}

export interface BootOptions {
  connectionString: string;
  port?: number;
  /** Injected connection factory, so a test can observe the boot ordering. Defaults to `createDb`. */
  createDbFn?: (connectionString: string) => Db;
  serverOptions?: WorkspaceServerOptions;
  onEvent?: (event: BootEvent) => void;
}

export interface BootedWorkspace {
  port: number;
  schema_version: number;
  db: Db;
  /** Stop listening and release the pool. Idempotent, so SIGTERM and SIGINT can both call it. */
  close(): Promise<void>;
}

/**
 * Migrate, verify, then listen — in that order, always. Rejects (without ever having listened) when the
 * database is at a schema this build does not ship.
 */
export async function bootWorkspaceService(options: BootOptions): Promise<BootedWorkspace> {
  const emit = options.onEvent ?? (() => {});
  const db = (options.createDbFn ?? createDb)(options.connectionString);
  let schemaVersion: number;
  emit({ phase: "migrating" });
  try {
    schemaVersion = await migrate(db);
    if (schemaVersion > LATEST_MIGRATION) {
      throw new BootError(
        "schema_newer_than_build",
        `database schema is at version ${schemaVersion}, but this build ships migrations up to ` +
          `${LATEST_MIGRATION}. Refusing to serve a database a newer build already migrated; deploy ` +
          `that build, or restore a backup taken at version ${LATEST_MIGRATION} or lower.`,
      );
    }
  } catch (error) {
    // Nothing is listening yet, so the only thing to unwind is the pool. Leaving it open would keep the
    // process alive after a fatal configuration error, and a hung pod is harder to diagnose than a dead one.
    await db.close().catch(() => {});
    throw error;
  }
  emit({ phase: "migrated", schema_version: schemaVersion });

  let server: WorkspaceServer;
  try {
    server = await startWorkspaceServer(db, options.port ?? DEFAULT_WORKSPACE_PORT, options.serverOptions);
  } catch (error) {
    await db.close().catch(() => {});
    throw error;
  }
  emit({ phase: "listening", schema_version: schemaVersion, port: server.port });

  let closed = false;
  return {
    port: server.port,
    schema_version: schemaVersion,
    db,
    async close() {
      if (closed) return;
      closed = true;
      emit({ phase: "stopping" });
      // Stop accepting first, then drain the pool: in-flight requests finish against a live connection.
      await server.close();
      await db.close().catch(() => {});
      emit({ phase: "stopped" });
    },
  };
}

export interface BootConfig {
  connectionString: string;
  port: number;
}

/** Read the boot configuration from the environment. Refuses to invent a database URL. */
export function readBootConfigFromEnv(env: Record<string, string | undefined>): BootConfig {
  const connectionString = env.KAGE_WORKSPACE_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new BootError(
      "missing_database_url",
      "KAGE_WORKSPACE_DATABASE_URL is required. There is deliberately no default: a workspace that " +
        "guesses its database can come up pointing at the wrong one.",
    );
  }
  const raw = env.KAGE_WORKSPACE_PORT?.trim();
  const port = raw ? Number(raw) : DEFAULT_WORKSPACE_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new BootError("invalid_port", `KAGE_WORKSPACE_PORT is not a valid port: ${raw}`);
  }
  return { connectionString, port };
}

/**
 * The container entry point. Logs one structured line per phase (no secrets, no connection string) and
 * shuts down gracefully on SIGTERM/SIGINT so a rolling deploy drains instead of dropping connections.
 */
export async function main(env: Record<string, string | undefined> = process.env): Promise<void> {
  const log = (event: Record<string, unknown>): void => {
    process.stdout.write(`${JSON.stringify({ service: "kage-workspace", ...event })}\n`);
  };
  let config: BootConfig;
  try {
    config = readBootConfigFromEnv(env);
  } catch (error) {
    log({ level: "fatal", error: (error as Error).message });
    process.exitCode = 78; // EX_CONFIG
    return;
  }
  let booted: BootedWorkspace;
  try {
    booted = await bootWorkspaceService({
      connectionString: config.connectionString,
      port: config.port,
      onEvent: (event) => log({ level: "info", ...event }),
    });
  } catch (error) {
    log({ level: "fatal", error: (error as Error).message });
    process.exitCode = 1;
    return;
  }
  log({ level: "info", phase: "ready", port: booted.port, schema_version: booted.schema_version });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    log({ level: "info", phase: "signal", signal });
    void booted
      .close()
      .catch((error) => log({ level: "error", error: (error as Error).message }))
      .finally(() => {
        process.exitCode = 0;
      });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/* istanbul ignore next -- process entry point */
if (require.main === module) {
  void main();
}
