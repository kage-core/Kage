// The Kage workspace HTTP service boundary.
//
// This is the team/commercial service. It is canonical for team review, ownership, policy, and
// aggregated metrics, but it is NEVER on the low-latency local context path — a local agent keeps
// working (context + export) when this service is unreachable. Phase E Task 1 establishes only the
// boundary and health check; later tasks add tenant-scoped routes behind authentication.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Db } from "./db.js";
import { currentVersion } from "./migrate.js";

export interface WorkspaceServer {
  port: number;
  close(): Promise<void>;
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

/** Build the request handler for the workspace service over a given database. */
export function createWorkspaceApp(db: Db): Handler {
  return async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/v1/health") {
      const databaseMigration = await currentVersion(db);
      json(res, 200, { status: "ok", database_migration: databaseMigration });
      return;
    }
    json(res, 404, { error: "not_found" });
  };
}

/** Start the workspace HTTP server on `127.0.0.1:<port>` (port 0 = an ephemeral port). */
export async function startWorkspaceServer(db: Db, port = 0): Promise<WorkspaceServer> {
  const handle = createWorkspaceApp(db);
  const server: Server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: "internal_error" });
      else res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  return {
    port: boundPort,
    close() {
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
