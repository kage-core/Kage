// A thin, tenant-agnostic PostgreSQL access seam for the Kage workspace service.
//
// Every workspace repository method is REQUIRED to pass a workspace_id and to scope its query by it;
// this module deliberately exposes only a parameterized `query` primitive and no unscoped helpers, so
// tenant scoping is enforced at each call site rather than hidden behind a convenience method that
// could omit it.
//
// TRANSACTIONS OWN A CONNECTION. `query` runs on a POOLED connection, which means consecutive calls may
// land on different backends. Sending BEGIN / INSERT / COMMIT / ROLLBACK through it therefore does not
// create a transaction at all: under concurrency the ROLLBACK can execute on somebody else's backend,
// leaving the "rolled back" rows committed, while the BEGIN's own backend is returned to the pool with
// an open transaction. `transaction()` is the only correct way to run multi-statement atomic work here:
// it checks out ONE client, runs the whole unit on it, commits or rolls back on that same client, and
// releases it. Anything that must be all-or-nothing (a sync batch, a review decision + its audit row, a
// migration) uses it; nothing in this service is allowed to hand-roll BEGIN through `query`.
import pg from "pg";

const { Pool } = pg;

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  /**
   * Run `fn` inside a real transaction on a single dedicated connection. The `tx` handle passed to `fn`
   * MUST be used for every statement in the unit — using the outer `Db` inside the callback silently
   * escapes the transaction. Commits when `fn` resolves, rolls back and rethrows when it rejects.
   */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Create a pooled Postgres connection for the given connection string. */
export function createDb(connectionString: string): Db {
  const pool = new Pool({ connectionString });

  /** A Db bound to ONE checked-out client: every statement runs on the same backend. */
  function clientDb(client: pg.PoolClient): Db {
    return {
      async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
        const result = await client.query(text, params as unknown[]);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      },
      // A nested call reuses the SAME client and the SAME transaction: the outermost transaction owns
      // the commit/rollback boundary, so an inner unit can never commit half of an outer one.
      async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
        return fn(clientDb(client));
      },
      async close() {
        // The client belongs to the enclosing transaction, which releases it; closing the pool from a
        // transaction handle would tear down connections other requests are still using.
      },
    };
  }

  return {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pool.query(text, params as unknown[]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      // A connection whose ROLLBACK failed may still hold an open transaction; it is destroyed rather
      // than returned to the pool, so the next caller never inherits somebody else's transaction state.
      let poisoned = false;
      try {
        await client.query("BEGIN");
        const result = await fn(clientDb(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        // A rollback that itself fails (a dead connection) must not mask the original failure.
        try {
          await client.query("ROLLBACK");
        } catch {
          poisoned = true;
        }
        throw error;
      } finally {
        client.release(poisoned || undefined);
      }
    },
    async close() {
      await pool.end();
    },
  };
}
