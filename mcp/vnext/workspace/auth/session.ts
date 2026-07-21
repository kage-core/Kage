// Short-lived, hash-stored workspace sessions.
//
// The raw session token is returned to the caller exactly once, at creation, and is set as a
// Secure/HttpOnly/SameSite=Lax cookie for browsers; the database stores ONLY its SHA-256 hash, so a
// leak of the sessions table cannot be replayed as a login. Resolving a request re-loads the principal's
// role and repository scope from the database every time (never from the client), which is why a
// privilege change takes effect on the next request and why `rotateSession` exists to invalidate the
// old token immediately on such a change. Sessions expire; expired or revoked rows resolve to null.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "../db.js";
import type { Principal, PrincipalType, WorkspaceRole } from "./types.js";

/** Default session lifetime. Kept short so a stolen cookie has a small window; browsers re-auth after. */
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface SessionCredentials {
  /** The raw bearer/cookie token. Shown once; only its hash is persisted. */
  token: string;
  /** CSRF token required as a header on browser (cookie) mutations. */
  csrf: string;
  session_id: string;
  expires_at: Date;
}

export interface ResolvedSession {
  principal: Principal;
  session_id: string;
  csrf: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseScope(raw: unknown): string[] | "all" {
  // NULL in the DB means "all repositories in the workspace"; an array means an explicit allow-list.
  if (raw === null || raw === undefined) return "all";
  if (Array.isArray(raw)) return raw.map((item) => String(item));
  return "all";
}

/**
 * Create a session for an existing principal. Verifies the principal exists in THIS workspace, then
 * stores only the token hash. Returns the raw token + CSRF token to hand to the caller once.
 */
export async function createSession(
  db: Db,
  input: { workspace_id: string; principal_id: string; ttlMs?: number },
): Promise<SessionCredentials> {
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  const sessionId = randomBytes(16).toString("hex");
  const ttl = input.ttlMs ?? DEFAULT_SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  const inserted = await db.query(
    `INSERT INTO workspace_sessions(session_id, workspace_id, principal_id, token_hash, csrf_token, expires_at)
     SELECT $1, $2, $3, $4, $5, $6
     WHERE EXISTS (
       SELECT 1 FROM workspace_principals WHERE workspace_id = $2 AND principal_id = $3
     )
     RETURNING session_id`,
    [sessionId, input.workspace_id, input.principal_id, sha256(token), csrf, expiresAt.toISOString()],
  );
  if (inserted.rowCount === 0) {
    throw new Error(`no such principal ${input.principal_id} in workspace ${input.workspace_id}`);
  }
  return { token, csrf, session_id: sessionId, expires_at: expiresAt };
}

/**
 * Resolve a raw token to its principal, loading role + scope from the database. Returns null for an
 * unknown, expired, or revoked token. The lookup is by hash; a constant-time compare guards the CSRF
 * check at the call site, not here (the hash lookup itself is a keyed index probe).
 */
export async function resolveSession(db: Db, token: string | undefined): Promise<ResolvedSession | null> {
  if (!token) return null;
  const { rows } = await db.query<{
    session_id: string;
    workspace_id: string;
    principal_id: string;
    csrf_token: string;
    principal_type: PrincipalType;
    role: WorkspaceRole;
    repository_ids: unknown;
  }>(
    `SELECT s.session_id, s.workspace_id, s.principal_id, s.csrf_token,
            p.principal_type, p.role, p.repository_ids
       FROM workspace_sessions s
       JOIN workspace_principals p
         ON p.workspace_id = s.workspace_id AND p.principal_id = s.principal_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        -- A deprovisioned identity (SCIM active=false) can never resolve, even if a cookie survived
        -- the revocation sweep. The switch is checked on EVERY request, not only at deactivation time.
        AND p.active`,
    [sha256(token)],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    session_id: row.session_id,
    csrf: row.csrf_token,
    principal: {
      principal_id: row.principal_id,
      workspace_id: row.workspace_id,
      principal_type: row.principal_type,
      role: row.role,
      repository_ids: parseScope(row.repository_ids),
    },
  };
}

/** Revoke every live session for a principal — call on any privilege (role/scope) change. */
export async function revokeSessionsForPrincipal(
  db: Db,
  workspaceId: string,
  principalId: string,
): Promise<void> {
  await db.query(
    `UPDATE workspace_sessions SET revoked_at = now()
      WHERE workspace_id = $1 AND principal_id = $2 AND revoked_at IS NULL`,
    [workspaceId, principalId],
  );
}

/**
 * Rotate a principal's session on a privilege change: revoke all existing tokens, then issue a fresh one.
 * The old cookie stops working immediately, closing the window where a downgraded user keeps old rights.
 */
export async function rotateSession(
  db: Db,
  input: { workspace_id: string; principal_id: string; ttlMs?: number },
): Promise<SessionCredentials> {
  await revokeSessionsForPrincipal(db, input.workspace_id, input.principal_id);
  return createSession(db, input);
}

/** Constant-time equality for CSRF tokens, avoiding a timing side channel on the compare. */
export function csrfMatches(expected: string, provided: string | undefined): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
