import { ContentStore, RETRIEVAL_ID_PREFIX } from "../gateway/content-store.js";
import { contentRoot } from "../runtime/paths.js";

// Exact evidence retrieval — the practical half of the Phase D reversibility contract.
//
// Every lossy transform in the gateway pipeline stores its exact pre-compression bytes in the
// content-addressed store and embeds a `kage-content:<sha256>` reference next to the compressed
// output. This module is how those originals come back: a task retrieves ONLY the raw content it
// stored, the store re-hashes the object and refuses to return anything whose fingerprint disagrees
// with its id, and nothing is ever fetched from a public or team asset implicitly. It reads only the
// local content store — pure `node:fs` + `node:crypto`, Node 18 safe.

const SHA256_HEX = /^[0-9a-f]{64}$/;

export type RetrieveErrorCode =
  | "invalid_retrieval_id"
  | "missing_task_id"
  | "not_found"
  | "forbidden"
  | "fingerprint_mismatch";

export interface RetrieveRequest {
  store: ContentStore;
  task_id: string;
}

export interface RetrieveResult {
  // 200 ok; 400 malformed request; 403 owned by another task; 404 absent; 502 fingerprint mismatch.
  status: 200 | 400 | 403 | 404 | 502;
  headers: Record<string, string>;
  body: Buffer | null;
  error?: RetrieveErrorCode;
}

// The SHA-256 hex of a `kage-content:<sha256>` retrieval id, or null when the id is not a well-formed
// content reference. Validated in-process before any filesystem access.
export function parseRetrievalId(retrievalId: string): string | null {
  if (typeof retrievalId !== "string" || !retrievalId.startsWith(RETRIEVAL_ID_PREFIX)) return null;
  const sha = retrievalId.slice(RETRIEVAL_ID_PREFIX.length);
  return SHA256_HEX.test(sha) ? sha : null;
}

// Matches `GET /v2/content/:sha256` where the parameter is a bare 64-char SHA-256 hex. Returns the
// sha so the caller can rebuild the `kage-content:` id; undefined for any other path shape.
export function matchContentRoute(pathname: string): { sha256: string } | undefined {
  const match = /^\/v2\/content\/([^/]+)$/.exec(pathname);
  if (!match) return undefined;
  const sha256 = match[1];
  if (!SHA256_HEX.test(sha256)) return undefined;
  return { sha256 };
}

function denied(status: RetrieveResult["status"], error: RetrieveErrorCode): RetrieveResult {
  return { status, headers: {}, body: null, error };
}

// Retrieve one exact stored original, enforcing task ownership. A well-formed but absent id is 404
// (distinguishable from denial); an id owned by a different task is 403 and leaks neither the bytes
// nor the fingerprint; a stored object whose bytes no longer hash to its id is 502, never returned as
// silently-wrong "original" content.
export function retrieve(retrievalId: string, request: RetrieveRequest): RetrieveResult {
  const sha = parseRetrievalId(retrievalId);
  if (!sha) return denied(400, "invalid_retrieval_id");
  if (!request.task_id) return denied(400, "missing_task_id");

  const id = `${RETRIEVAL_ID_PREFIX}${sha}`;
  if (!request.store.has(id)) return denied(404, "not_found");

  let stored;
  try {
    stored = request.store.get(id);
  } catch {
    // get() throws /fingerprint mismatch/ for a tampered object and a generic not-found if the pair
    // vanished between has() and get(). Treat a surviving-but-corrupt object as 502; a disappeared
    // object as 404. Distinguish by re-checking presence.
    return request.store.has(id) ? denied(502, "fingerprint_mismatch") : denied(404, "not_found");
  }

  // Local raw content is owned by the task that stored it. A different task may not read it.
  if (stored.metadata.task_id !== request.task_id) return denied(403, "forbidden");

  return {
    status: 200,
    headers: {
      "x-kage-sha256": stored.metadata.sha256,
      "x-kage-retrieval-id": stored.metadata.retrieval_id,
      "content-type": stored.metadata.media_type,
    },
    body: stored.body,
  };
}

// Convenience for callers that only have a project directory (the MCP tool). Resolves the project's
// content root and applies the identical ownership + fingerprint enforcement. Never reaches the
// network or a shared/team asset — retrieval is strictly local.
export function retrieveFromProject(projectDir: string, retrievalId: string, taskId: string): RetrieveResult {
  const store = new ContentStore({ root: contentRoot(projectDir) });
  return retrieve(retrievalId, { store, task_id: taskId });
}
