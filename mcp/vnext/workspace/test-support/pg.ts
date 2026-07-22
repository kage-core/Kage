// Ephemeral REAL PostgreSQL for workspace integration tests.
//
// The Phase E workspace is a genuine Postgres service, so its tests must run against a real database,
// not a mock. `embedded-postgres` ships an actual PostgreSQL 18 binary and runs it in-process on a
// TCP port — no system install required. It is ESM-only; under this package's `module: Node16` the
// dynamic `import()` below is preserved (not downleveled to `require`), so the ESM module loads.
//
// Each call provisions an isolated instance (unique port + temp dir) so parallel test files never
// collide. The binary is cached after first download, so subsequent starts take ~1-2s.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

export interface TestPostgres {
  /** A `postgres://…` URL for the `kage_test` database on this instance. */
  url: string;
  /** Stop the server and delete its data directory. Safe to call more than once. */
  stop(): Promise<void>;
}

/** Reserve a free localhost TCP port by binding to :0 and reading the assigned port. */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

/**
 * Start an isolated real PostgreSQL instance with a fresh `kage_test` database.
 * Returns its connection URL and a `stop()` that tears everything down.
 */
export async function startTestPostgres(): Promise<TestPostgres> {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = mkdtempSync(join(tmpdir(), "kage-workspace-pg-"));
  const port = await freePort();
  const instance = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });
  await instance.initialise();
  await instance.start();
  await instance.createDatabase("kage_test");
  let stopped = false;
  return {
    url: `postgres://postgres:postgres@127.0.0.1:${port}/kage_test`,
    async stop() {
      if (stopped) return;
      stopped = true;
      try {
        await instance.stop();
      } finally {
        rmSync(databaseDir, { recursive: true, force: true });
      }
    },
  };
}
