// A thin, tenant-agnostic PostgreSQL access seam for the Kage workspace service.
//
// Every workspace repository method is REQUIRED to pass a workspace_id and to scope its query by it;
// this module deliberately exposes only a parameterized `query` primitive and no unscoped helpers, so
// tenant scoping is enforced at each call site rather than hidden behind a convenience method that
// could omit it.
import pg from "pg";

const { Pool } = pg;

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

/** Create a pooled Postgres connection for the given connection string. */
export function createDb(connectionString: string): Db {
  const pool = new Pool({ connectionString });
  return {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pool.query(text, params as unknown[]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async close() {
      await pool.end();
    },
  };
}
