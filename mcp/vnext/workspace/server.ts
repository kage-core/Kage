// The Kage workspace HTTP service boundary.
//
// This is the team/commercial service. It is canonical for team review, ownership, policy, and
// aggregated metrics, but it is NEVER on the low-latency local context path — a local agent keeps
// working (context + export) when this service is unreachable. Phase E Task 2 adds authenticated
// sessions, roles, and TENANT ENFORCEMENT: every route resolves a server-side Principal and scopes
// every query to that principal's workspace and repository allow-list. A client can never widen its own
// scope, so a cross-tenant or cross-repository read returns 404 (existence is not even disclosed).
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Db } from "./db.js";
import { currentVersion } from "./migrate.js";
import { resolveSession, csrfMatches, type ResolvedSession } from "./auth/session.js";
import { can, scopeAllows } from "./auth/authorize.js";
import type { Principal } from "./auth/types.js";

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

/** Pull the `kage_session` value out of the Cookie header (browser sessions). */
function cookieToken(req: IncomingMessage): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "kage_session") return rest.join("=");
  }
  return undefined;
}

/** A raw token from either the session cookie or an `Authorization: Bearer` header (service tokens). */
function requestToken(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return cookieToken(req);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Enforce CSRF for browser (cookie) mutations. A cookie-authenticated mutating request MUST carry a
 * matching `x-kage-csrf` header; a service principal presenting a Bearer token is exempt (not a browser).
 * Returns null when the request may proceed, or an error code to reject with 403.
 */
function csrfError(req: IncomingMessage, session: ResolvedSession): "csrf_required" | null {
  if (!MUTATING_METHODS.has(req.method ?? "GET")) return null;
  const usedCookie = req.headers.authorization ? false : Boolean(cookieToken(req));
  if (!usedCookie) return null;
  const header = req.headers["x-kage-csrf"];
  const provided = Array.isArray(header) ? header[0] : header;
  return csrfMatches(session.csrf, provided) ? null : "csrf_required";
}

/** Build the request handler for the workspace service over a given database. */
export function createWorkspaceApp(db: Db): Handler {
  return async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";
    const path = url.pathname;

    // Health is unauthenticated: it must answer even when identity/session tables are empty.
    if (method === "GET" && path === "/v1/health") {
      const databaseMigration = await currentVersion(db);
      json(res, 200, { status: "ok", database_migration: databaseMigration });
      return;
    }

    // Every other route requires an authenticated, server-resolved principal.
    const session = await resolveSession(db, requestToken(req));
    if (!session) {
      json(res, 401, { error: "unauthenticated" });
      return;
    }
    const principal = session.principal;

    const csrf = csrfError(req, session);
    if (csrf) {
      json(res, 403, { error: csrf });
      return;
    }

    // POST /v1/review-items/:id/accept — gated by knowledge.review authority (Task 4 adds the real store).
    const reviewMatch = /^\/v1\/review-items\/([^/]+)\/accept$/.exec(path);
    if (reviewMatch && method === "POST") {
      if (!can(principal, "knowledge.review")) {
        json(res, 403, { error: "forbidden", action: "knowledge.review" });
        return;
      }
      await readJsonBody(req);
      json(res, 202, { status: "accepted", item_id: reviewMatch[1] });
      return;
    }

    // GET /v1/workspaces/:workspaceId/repositories — list, tenant- and scope-filtered.
    const reposMatch = /^\/v1\/workspaces\/([^/]+)\/repositories$/.exec(path);
    if (reposMatch && method === "GET") {
      await listRepositories(db, principal, reposMatch[1], res);
      return;
    }

    // GET /v1/workspaces/:workspaceId/repositories/:repositoryId — single, tenant- and scope-filtered.
    const repoMatch = /^\/v1\/workspaces\/([^/]+)\/repositories\/([^/]+)$/.exec(path);
    if (repoMatch && method === "GET") {
      await getRepository(db, principal, repoMatch[1], repoMatch[2], res);
      return;
    }

    json(res, 404, { error: "not_found" });
  };
}

/**
 * List repositories the principal may see. Cross-tenant is 404 (never confirm another workspace exists),
 * and a repository-scoped principal only ever gets its allow-listed repositories.
 */
async function listRepositories(
  db: Db,
  principal: Principal,
  workspaceId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  // The workspace filter is ALWAYS the server-resolved workspace id, never the path parameter alone.
  const { rows } = await db.query<{ repository_id: string; provider: string; name: string }>(
    `SELECT repository_id, provider, name FROM repositories WHERE workspace_id = $1 ORDER BY repository_id`,
    [principal.workspace_id],
  );
  const visible = rows.filter((row) => scopeAllows(principal, row.repository_id));
  json(res, 200, { repositories: visible });
}

/** Fetch one repository, enforcing both workspace tenancy and the principal's repository scope. */
async function getRepository(
  db: Db,
  principal: Principal,
  workspaceId: string,
  repositoryId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id || !scopeAllows(principal, repositoryId)) {
    json(res, 404, { error: "not_found" });
    return;
  }
  const { rows } = await db.query<{ repository_id: string; provider: string; name: string }>(
    `SELECT repository_id, provider, name FROM repositories WHERE workspace_id = $1 AND repository_id = $2`,
    [principal.workspace_id, repositoryId],
  );
  if (rows.length === 0) {
    json(res, 404, { error: "not_found" });
    return;
  }
  json(res, 200, { repository: rows[0] });
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
