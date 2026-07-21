// The Kage workspace HTTP service boundary.
//
// This is the team/commercial service. It is canonical for team review, ownership, policy, and
// aggregated metrics, but it is NEVER on the low-latency local context path — a local agent keeps
// working (context + export) when this service is unreachable. Phase E Task 2 adds authenticated
// sessions, roles, and TENANT ENFORCEMENT: every route resolves a server-side Principal and scopes
// every query to that principal's workspace and repository allow-list. A client can never widen its own
// scope, so a cross-tenant or cross-repository read returns 404 (existence is not even disclosed).
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { Db } from "./db.js";
import { currentVersion } from "./migrate.js";
import { resolveSession, csrfMatches, type ResolvedSession } from "./auth/session.js";
import { can, scopeAllows } from "./auth/authorize.js";
import type { Principal } from "./auth/types.js";
import { applyBatch, pullChanges, ReviewAuthorityError } from "./sync-routes.js";
import { reviewClaim, type ReviewAction } from "./review.js";
import {
  loadTaskOutcomes,
  loadTeamMetrics,
  MetricsWindowError,
  TaskOutcomeValidationError,
} from "./metrics.js";
import { forTarget } from "./audit.js";
import { assertNoRawPayload } from "../sync/outbox.js";
import type { SyncBatch } from "../sync/types.js";
import {
  countActiveDevelopers,
  loadSubscription,
  resolveEntitlements,
  resolveWorkspaceEntitlements,
} from "./billing/entitlements.js";
import { applyPilotCredit } from "./billing/pilot-credit.js";
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeEvent,
  type Fetcher as StripeFetcher,
  type StripeConfig,
} from "./billing/stripe.js";
import { LAUNCH_PLANS, PLAN_IDS, type PlanId } from "./billing/types.js";
import {
  authenticateScim,
  handleScimRequest,
  SCIM_CONTENT_TYPE,
} from "./enterprise/scim.js";
import {
  applyRetention,
  loadRetentionPolicies,
  RETENTION_CATEGORIES,
  RetentionPolicyError,
  setRetentionPolicy,
  type RetentionCategory,
} from "./enterprise/retention.js";
import {
  deleteWorkspace,
  exportWorkspace,
  registerExportDownload,
  resolveExportDownload,
  WorkspaceDeletionError,
  type ObjectStore,
} from "./enterprise/export-delete.js";
import {
  beginOidcLogin,
  completeOidcLogin,
  loadOidcProvider,
  LOGIN_REQUEST_TTL_MS,
  OidcError,
  type Fetcher as OidcFetcher,
} from "./enterprise/oidc.js";
import { verifySignature } from "./github/signature.js";
import { handleWebhook } from "./github/webhooks.js";
import type { GitHubAppConfig } from "./github/config.js";

const REVIEW_ACTIONS: ReadonlySet<string> = new Set<ReviewAction>(["accept", "reject", "supersede"]);

export interface WorkspaceServer {
  port: number;
  /** The address the listener actually bound. See `startWorkspaceServer` for why this defaults wide. */
  host: string;
  close(): Promise<void>;
}

/**
 * Optional service integrations. Billing is genuinely optional: with no Stripe configuration the
 * workspace still starts and every knowledge, review, sync, and metrics route keeps working — the
 * billing routes simply report the unpaid local plan. A missing payment provider must never be able to
 * take a team's own knowledge service down.
 */
export interface WorkspaceServerOptions {
  stripe?: StripeConfig;
  /** Injected HTTP transport for provider calls, so tests never reach a live Stripe. */
  fetcher?: StripeFetcher;
  /**
   * GitHub App configuration. Present exactly when the deployment supplied app id, private key, and
   * webhook secret (see `loadGitHubAppConfig`). Absent, the `/v1/github/webhook` route answers 404 —
   * an unconfigured integration is simply not there, mirroring the Stripe webhook.
   */
  github?: GitHubAppConfig;
  /**
   * Where exports are written and how blobs are removed.
   *
   * `export_directory` is optional deliberately: an export must never depend on optional configuration,
   * because `workspace_export` is a promise this product makes unconditionally. Unset, exports land in
   * an unpredictable 0700 directory created once per process (see `exportDirectory`).
   *
   * `object_store` is optional too, but its absence is NOT free: a tenant that references object-storage
   * keys cannot be deleted without one (409 `object_store_required`). Skipping blob deletion and
   * reporting the tenant deleted anyway would put a false removal in the ledger that outlives it.
   */
  dataControls?: {
    export_directory?: string;
    object_store?: ObjectStore;
  };

  /** Injected HTTP transport for the identity provider, so tests never reach a live IdP. */
  oidcFetcher?: OidcFetcher;
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

/** Pull one named cookie out of the Cookie header. */
function cookieValue(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [candidate, ...rest] = part.trim().split("=");
    if (candidate === name) return rest.join("=");
  }
  return undefined;
}

/** Pull the `kage_session` value out of the Cookie header (browser sessions). */
function cookieToken(req: IncomingMessage): string | undefined {
  return cookieValue(req, "kage_session");
}

/** The `Authorization: Bearer` service token, if one is present. Non-Bearer schemes are not tokens. */
function bearerToken(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return undefined;
}

/** A raw token from either the session cookie or an `Authorization: Bearer` header (service tokens). */
function requestToken(req: IncomingMessage): string | undefined {
  const bearer = bearerToken(req);
  if (bearer !== undefined) return bearer;
  return cookieToken(req);
}

/**
 * The ingest ceiling for the UNAUTHENTICATED Stripe webhook.
 *
 * This limit cannot live after the parse, and it cannot live after authentication. Stripe authenticates
 * by signing the whole raw body, so the body must be fully buffered BEFORE authority is known — which
 * means an anonymous request can make the service allocate whatever it sends unless the ceiling is
 * enforced as the bytes arrive. Stripe's own event payloads are orders of magnitude below this.
 */
export const MAX_WEBHOOK_BODY_BYTES = 1_048_576; // 1 MiB

/**
 * The ingest ceiling for AUTHENTICATED JSON routes. Higher than the webhook because a sync batch is a
 * legitimately large body, but still bounded: an authenticated principal must not be able to exhaust a
 * multi-tenant service's memory either.
 */
export const MAX_JSON_BODY_BYTES = 16_777_216; // 16 MiB

/** A request that exceeded the ingest ceiling. Carries the limit so the refusal can state it. */
class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`request body exceeds ${limit} bytes`);
    this.name = "BodyTooLargeError";
  }
}

/**
 * The EXACT bytes of the request body, up to `limit`. A signature must be verified over these, never
 * over a re-parse.
 *
 * Two checks, because either alone is bypassable: a declared `Content-Length` over the ceiling is
 * refused before a byte is read, and the running total is checked as chunks arrive so a chunked body
 * with no declared length is refused mid-flight rather than after it has all been buffered.
 */
function readRawBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number.parseInt(String(req.headers["content-length"] ?? ""), 10);
    if (Number.isFinite(declared) && declared > limit) {
      reject(new BodyTooLargeError(limit));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const done = (error: Error | null, body?: Buffer): void => {
      if (settled) return;
      settled = true;
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
      if (error) reject(error);
      else resolve(body as Buffer);
    };
    const onData = (chunk: Buffer): void => {
      total += chunk.length;
      if (total > limit) {
        // Stop consuming immediately: the caller answers 413 and closes the connection, so the rest of
        // the flood is never read and never allocated.
        req.pause();
        done(new BodyTooLargeError(limit));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = (): void => done(null, Buffer.concat(chunks));
    const onError = (error: Error): void => done(error);
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

/**
 * Grace period between answering 413 and tearing the connection down.
 *
 * Destroying the socket the instant the response is written sends an RST while the client is still
 * uploading, and an RST discards data the client has not read yet — including our own 413. The client is
 * given a moment to read the refusal, and the connection is destroyed regardless afterwards. Nothing is
 * being buffered in the meantime: reading has already stopped, so the flood stalls on TCP backpressure
 * in the kernel rather than growing the heap.
 */
const OVERSIZE_CLOSE_GRACE_MS = 250;

/** Answer an oversize request and close the connection instead of draining what it is still sending. */
function rejectTooLarge(req: IncomingMessage, res: ServerResponse, limit: number): void {
  const teardown = (): void => {
    const timer = setTimeout(() => req.destroy(), OVERSIZE_CLOSE_GRACE_MS);
    // Never hold the event loop open on a client that already went away.
    timer.unref();
  };
  if (!res.headersSent) {
    res.writeHead(413, { "content-type": "application/json", connection: "close" });
    res.end(JSON.stringify({ error: "payload_too_large", limit_bytes: limit }), teardown);
    return;
  }
  res.end(teardown);
}

async function readJsonBody(req: IncomingMessage, limit: number = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const raw = await readRawBody(req, limit);
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw.toString("utf8"));
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
  // A request authenticates via cookie exactly when requestToken() would fall back to the cookie:
  // no valid `Bearer ` token present. A non-Bearer Authorization header does NOT exempt CSRF, since
  // such a request still authenticated through the session cookie.
  const usedCookie = bearerToken(req) === undefined && Boolean(cookieToken(req));
  if (!usedCookie) return null;
  const header = req.headers["x-kage-csrf"];
  const provided = Array.isArray(header) ? header[0] : header;
  return csrfMatches(session.csrf, provided) ? null : "csrf_required";
}

/** Build the request handler for the workspace service over a given database. */
export function createWorkspaceApp(db: Db, options: WorkspaceServerOptions = {}): Handler {
  const route = async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";
    const path = url.pathname;

    // Health is unauthenticated: it must answer even when identity/session tables are empty.
    if (method === "GET" && path === "/v1/health") {
      const databaseMigration = await currentVersion(db);
      json(res, 200, { status: "ok", database_migration: databaseMigration });
      return;
    }

    // POST /v1/billing/stripe/webhook — Stripe authenticates with a SIGNATURE, not a session, so this
    // route sits deliberately before the session gate (Stripe has no cookie and no service token).
    // Authority comes from the signature over the raw bytes; CSRF does not apply for the same reason.
    if (method === "POST" && path === "/v1/billing/stripe/webhook") {
      await handleStripeWebhook(db, options, req, res);
      return;
    }

    // POST /v1/github/webhook — GitHub authenticates with an HMAC signature over the raw bytes, not a
    // session, so it sits before the session gate for the same reason the Stripe webhook does.
    if (method === "POST" && path === "/v1/github/webhook") {
      await handleGitHubWebhook(db, options, req, res);
      return;
    }

    // /scim/v2/* — the customer's DIRECTORY authenticates here, with a workspace-scoped SCIM bearer
    // token, not a user session. It sits before the session gate for the same reason the Stripe webhook
    // does: there is no cookie and no browser, so CSRF does not apply and a session lookup would fail.
    if (path === "/scim/v2" || path.startsWith("/scim/v2/")) {
      await handleScim(db, req, res, path, url.searchParams);
      return;
    }

    // OIDC login is by definition unauthenticated: the whole point is that the caller has no session yet.
    if (method === "POST" && path === "/v1/auth/oidc/start") {
      await handleOidcStart(db, options, req, res);
      return;
    }
    if (method === "GET" && path === "/v1/auth/oidc/callback") {
      await handleOidcCallback(db, options, url, req, res);
      return;
    }

    // GET /v1/exports/:exportId/download — authenticated by the export's own TICKET, not by a session,
    // and therefore placed before the session gate. This is the only way the export a deletion produced
    // can be fetched at all: by then the tenant, its principals, and its sessions are gone.
    const downloadMatch = /^\/v1\/exports\/([^/]+)\/download$/.exec(path);
    if (downloadMatch && method === "GET") {
      await handleExportDownload(db, downloadMatch[1], req, res);
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

    // POST /v1/repositories/:repositoryId/claims/:claimId/review — the authoritative team review write.
    // The route only proves the principal may reach this repository; reviewClaim owns the real authority
    // decision (ownership scope, self-approval, optimistic version) and the audit write.
    const claimReviewMatch = /^\/v1\/repositories\/([^/]+)\/claims\/([^/]+)\/review$/.exec(path);
    if (claimReviewMatch && method === "POST") {
      await handleClaimReview(db, principal, claimReviewMatch[1], claimReviewMatch[2], req, res);
      return;
    }

    // GET /v1/repositories/:repositoryId/claims/:claimId/audit — the append-only audit trail for a claim.
    const claimAuditMatch = /^\/v1\/repositories\/([^/]+)\/claims\/([^/]+)\/audit$/.exec(path);
    if (claimAuditMatch && method === "GET") {
      if (!scopeAllows(principal, claimAuditMatch[1])) {
        json(res, 404, { error: "not_found" });
        return;
      }
      if (!can(principal, "audit.read", claimAuditMatch[1])) {
        json(res, 403, { error: "forbidden", action: "audit.read" });
        return;
      }
      const events = await forTarget(db, principal.workspace_id, "claim", claimAuditMatch[2]);
      json(res, 200, { events });
      return;
    }

    // POST /v1/sync/push — a local daemon pushes an idempotent, permission-scoped batch.
    if (method === "POST" && path === "/v1/sync/push") {
      await handleSyncPush(db, principal, req, res);
      return;
    }

    // GET /v1/sync/pull — pull the changes this principal is permitted to see.
    if (method === "GET" && path === "/v1/sync/pull") {
      if (!can(principal, "sync.pull")) {
        json(res, 403, { error: "forbidden", action: "sync.pull" });
        return;
      }
      if (!(await entitled(db, principal, "team_sync", res))) return;
      const cursor = url.searchParams.get("cursor");
      const result = await pullChanges(db, principal, cursor);
      json(res, 200, result);
      return;
    }

    // GET /v1/workspaces/:workspaceId/metrics — aggregated, privacy-safe team metrics.
    const metricsMatch = /^\/v1\/workspaces\/([^/]+)\/metrics$/.exec(path);
    if (metricsMatch && method === "GET") {
      await handleTeamMetrics(db, principal, metricsMatch[1], url, res);
      return;
    }

    // GET /v1/workspaces/:workspaceId/billing — the SERVER-resolved plan and entitlements.
    const billingMatch = /^\/v1\/workspaces\/([^/]+)\/billing$/.exec(path);
    if (billingMatch && method === "GET") {
      await handleBillingRead(db, principal, billingMatch[1], res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/billing/checkout — start a Stripe Checkout for a PLAN. The
    // client names a plan; the SERVER chooses the price. There is deliberately no route that writes an
    // entitlement: only a signature-verified Stripe webhook can do that.
    const checkoutMatch = /^\/v1\/workspaces\/([^/]+)\/billing\/checkout$/.exec(path);
    if (checkoutMatch && method === "POST") {
      await handleCheckout(db, options, principal, checkoutMatch[1], req, res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/billing/portal — hand the customer to Stripe's own portal, so
    // payment instruments are managed there and never touch this service.
    const portalMatch = /^\/v1\/workspaces\/([^/]+)\/billing\/portal$/.exec(path);
    if (portalMatch && method === "POST") {
      await handlePortal(db, options, principal, portalMatch[1], res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/billing/pilot-credit — compute, record, and APPLY the no-overhead
    // pilot credit. This is the production caller for the guarantee: without it the credit is arithmetic
    // nobody can act on.
    const creditMatch = /^\/v1\/workspaces\/([^/]+)\/billing\/pilot-credit$/.exec(path);
    if (creditMatch && method === "POST") {
      await handlePilotCredit(db, options, principal, creditMatch[1], req, res);
      return;
    }

    // GET|PUT /v1/workspaces/:workspaceId/retention — the retention policy actually in force.
    const retentionMatch = /^\/v1\/workspaces\/([^/]+)\/retention$/.exec(path);
    if (retentionMatch && (method === "GET" || method === "PUT")) {
      await handleRetention(db, principal, retentionMatch[1], method, req, res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/retention/apply — run the purge now.
    const retentionApplyMatch = /^\/v1\/workspaces\/([^/]+)\/retention\/apply$/.exec(path);
    if (retentionApplyMatch && method === "POST") {
      await handleRetentionApply(db, principal, retentionApplyMatch[1], res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/export — ALWAYS available. This route is deliberately not behind
    // `entitled(...)`: taking your own data out is not a paid feature and never lapses.
    const exportMatch = /^\/v1\/workspaces\/([^/]+)\/export$/.exec(path);
    if (exportMatch && method === "POST") {
      await handleExport(db, options, principal, exportMatch[1], res);
      return;
    }

    // POST /v1/workspaces/:workspaceId/delete — irreversible, owner-confirmed, export-first.
    const deleteMatch = /^\/v1\/workspaces\/([^/]+)\/delete$/.exec(path);
    if (deleteMatch && method === "POST") {
      await handleDelete(db, options, principal, session, deleteMatch[1], req, res);
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

  // An oversize body is refused in ONE place, so no route can forget to bound its own ingest.
  return async function handle(req, res) {
    try {
      await route(req, res);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        rejectTooLarge(req, res, error.limit);
        return;
      }
      throw error;
    }
  };
}

/**
 * The paid, TEAM-SCOPED features an entitlement can gate. `local_runtime` and `workspace_export` are
 * deliberately absent: they are typed `true` and are never withheld, whatever the subscription says.
 *
 * Two things this service deliberately does NOT gate, so the code and the customer-facing promise agree:
 *   - READS of a team's own already-synced data (the metrics report, the billing page). Withdrawing
 *     access to what a customer already produced is the same confiscation `workspace_export` exists to
 *     rule out; what lapses is new team-scoped writes and the sync of them.
 *   - `github_checks`, because this service exposes no check-publishing route yet (Task 5 built the App
 *     client, not an endpoint). The feature is listed here so the gate is one line when that route
 *     lands — not because a gate is silently in force somewhere.
 */
type GatedFeature = "team_sync" | "team_review" | "github_checks" | "advanced_policy";

/**
 * Enforce a paid entitlement, resolved SERVER-SIDE from the stored subscription. Answers 402 (not 403)
 * when the workspace is not entitled, because "you may do this but the plan lapsed" is a different fact
 * from "you are not allowed to do this" — and it is checked AFTER the authority gate, so a role that may
 * not act at all still sees 403 rather than a price tag.
 *
 * This is the enforcement half of what docs/commercial/no-overhead-pilot.md promises a customer: the
 * team features switch OFF when a subscription lapses, rather than merely being displayed as off.
 */
async function entitled(
  db: Db,
  principal: Principal,
  feature: GatedFeature,
  res: ServerResponse,
): Promise<boolean> {
  const entitlements = await resolveWorkspaceEntitlements(db, principal.workspace_id);
  if (entitlements[feature]) return true;
  json(res, 402, {
    error: "entitlement_required",
    feature,
    plan_id: entitlements.plan_id,
    state: entitlements.state,
  });
  return false;
}

/**
 * Land a pushed sync batch. Authority is gated three ways: the principal must be allowed to sync at all
 * (403 otherwise); the batch's workspace must be the principal's own and its repository within scope
 * (404 otherwise — existence is never disclosed cross-tenant); and the batch must carry no raw payload
 * (400 otherwise). Only then does the idempotent, tenant-scoped apply run.
 */
async function handleSyncPush(
  db: Db,
  principal: Principal,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!can(principal, "sync.push")) {
    json(res, 403, { error: "forbidden", action: "sync.push" });
    return;
  }
  // Team sync is a PAID feature, and a lapsed subscription switches it off here — on the route — not
  // only on the billing page. Authority first, then entitlement: a viewer still gets 403.
  if (!(await entitled(db, principal, "team_sync", res))) return;
  const body = (await readJsonBody(req)) as Partial<SyncBatch> | undefined;
  if (!body || typeof body !== "object" || typeof body.batch_id !== "string" || typeof body.repository_id !== "string") {
    json(res, 400, { error: "invalid_batch" });
    return;
  }
  // The tenant and scope are decided by the SERVER-resolved principal, never by the client's payload.
  if (body.workspace_id !== principal.workspace_id || !scopeAllows(principal, body.repository_id)) {
    json(res, 404, { error: "not_found" });
    return;
  }
  const batch = normalizeBatch(body);
  try {
    assertNoRawPayload(batch);
  } catch (error) {
    // Both refusals are the CLIENT's error and both happen before any row is touched. They are reported
    // distinctly so a daemon can tell "you tried to send raw evidence" from "this record is malformed".
    if (error instanceof TaskOutcomeValidationError) {
      json(res, 400, { error: "invalid_task_outcome", field: error.field });
      return;
    }
    json(res, 400, { error: "raw_payload_rejected" });
    return;
  }
  try {
    const result = await applyBatch(db, principal, batch);
    json(res, 200, result);
  } catch (error) {
    // A pushed review decision that fails the review-authority gate is a 403 — the batch already rolled
    // back inside applyBatch, so nothing landed. Any other error is a real fault and rethrows.
    if (error instanceof ReviewAuthorityError) {
      json(res, 403, { error: error.code });
      return;
    }
    // A malformed task outcome is the CLIENT's error, not a server fault: it is refused structurally
    // before any row lands (the batch rolls back), so it must answer 400. Letting it escape as a 500
    // would let any authenticated principal fault the workspace at will.
    if (error instanceof TaskOutcomeValidationError) {
      json(res, 400, { error: "invalid_task_outcome", field: error.field });
      return;
    }
    throw error;
  }
}

/**
 * Land a team review decision over HTTP. The route-level gate is deliberately thin — only "may this
 * principal reach this repository" (a cross-tenant/out-of-scope target is 404, existence undisclosed).
 * The authoritative decision — ownership scope, self-approval, optimistic version, and the atomic audit
 * write — lives in reviewClaim, whose status is returned verbatim so authority never drifts by endpoint.
 */
async function handleClaimReview(
  db: Db,
  principal: Principal,
  repositoryId: string,
  claimId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!scopeAllows(principal, repositoryId)) {
    json(res, 404, { error: "not_found" });
    return;
  }
  // Team review authority is a paid feature; a lapsed workspace stops making team decisions rather than
  // quietly continuing to record them. The knowledge itself stays readable and exportable.
  if (!(await entitled(db, principal, "team_review", res))) return;
  const body = (await readJsonBody(req)) as
    | { action?: unknown; expected_version?: unknown; decision_note?: unknown; request_id?: unknown }
    | undefined;
  const action = typeof body?.action === "string" ? body.action : "";
  const expectedVersion = typeof body?.expected_version === "string" ? body.expected_version : "";
  const decisionNote = typeof body?.decision_note === "string" ? body.decision_note.trim() : "";
  if (!REVIEW_ACTIONS.has(action) || !expectedVersion || !decisionNote) {
    json(res, 400, { error: "invalid_review_request" });
    return;
  }
  const outcome = await reviewClaim(db, principal, {
    workspace_id: principal.workspace_id,
    repository_id: repositoryId,
    claim_id: claimId,
    expected_version: expectedVersion,
    action: action as ReviewAction,
    decision_note: decisionNote,
    request_id: typeof body?.request_id === "string" ? body.request_id : undefined,
  });
  const responseBody: Record<string, unknown> = { claim_id: outcome.claim_id };
  if (outcome.error) responseBody.error = outcome.error;
  if (outcome.version) responseBody.version = outcome.version;
  json(res, outcome.status, responseBody);
}

/**
 * Serve the aggregated team metrics for a workspace. Three gates, in this order:
 *   1. TENANCY — another workspace's metrics are a 404 (existence is never disclosed cross-tenant), and
 *      the report is always built from the SERVER-resolved principal, never the path parameter;
 *   2. AUTHORITY — `metrics.read` (a viewer does not have it);
 *   3. SCOPE — a `repository` filter outside the principal's allow-list yields an empty report from the
 *      query layer itself, not a filtered-after-the-fact list.
 * The response body is aggregate only: counts, classes, and measured numbers, never a task-level row.
 */
async function handleTeamMetrics(
  db: Db,
  principal: Principal,
  workspaceId: string,
  url: URL,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "metrics.read")) {
    json(res, 403, { error: "forbidden", action: "metrics.read" });
    return;
  }
  const repositoryId = url.searchParams.get("repository") ?? undefined;
  if (repositoryId && !scopeAllows(principal, repositoryId)) {
    json(res, 404, { error: "not_found" });
    return;
  }
  try {
    const metrics = await loadTeamMetrics(db, principal, {
      repository_id: repositoryId,
      since: url.searchParams.get("since") ?? undefined,
      until: url.searchParams.get("until") ?? undefined,
    });
    json(res, 200, { metrics });
  } catch (error) {
    // An unparseable window bound is a bad request, not a server fault.
    if (error instanceof MetricsWindowError) {
      json(res, 400, { error: "invalid_window", field: error.field });
      return;
    }
    throw error;
  }
}

/**
 * Take a Stripe webhook. Three properties this handler exists to hold:
 *   1. It reads the RAW bytes and hands them to the verifier untouched — no parse, no re-serialize.
 *   2. With no Stripe configured it answers 404 rather than 500: an unconfigured integration is simply
 *      not there, and an unconfigured deployment must not be probeable for a secret it does not have.
 *   3. It returns the handler's own status verbatim (401 forged, 200 duplicate, 202 applied), so the
 *      authority decision lives in one place and cannot drift by endpoint.
 */
async function handleStripeWebhook(
  db: Db,
  options: WorkspaceServerOptions,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!options.stripe) {
    json(res, 404, { error: "not_found" });
    return;
  }
  // The ceiling is enforced HERE, on ingest, because the signature can only be checked over the whole
  // body — so "authenticate first" is impossible and an anonymous flood would otherwise be buffered.
  const rawBody = await readRawBody(req, MAX_WEBHOOK_BODY_BYTES);
  const header = req.headers["stripe-signature"];
  const outcome = await handleStripeEvent(
    { db, config: options.stripe },
    { rawBody, signature: Array.isArray(header) ? header[0] : header },
  );
  json(res, outcome.status, { result: outcome.result });
}

/** The single header value for a name, collapsing the array Node hands back for repeated headers. */
function headerValue(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Map a GitHub installation id to the workspace that installed it. Installation ids are globally unique
 * on GitHub, so this is the ONE lookup that crosses from an external identifier to a tenant — it reads a
 * single mapping row, never any tenant's knowledge. An unmapped installation returns null so a webhook
 * can never invent a tenant that did not install the app.
 */
async function resolveInstallationWorkspace(db: Db, installationId: string): Promise<string | null> {
  const { rows } = await db.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM github_installations WHERE installation_id = $1`,
    [installationId],
  );
  return rows[0]?.workspace_id ?? null;
}

/**
 * Take a GitHub webhook. The order is the security contract, and it is the same as the Stripe path:
 *   1. Unconfigured deployment → 404, never 500, and never probeable for a secret it does not hold.
 *   2. Verify the signature over the RAW bytes BEFORE any parse (`handleWebhook` enforces this; the
 *      installation lookup below parses only after we ourselves confirm the signature).
 *   3. Resolve the tenant from the installation id. An installation this deployment never mapped is
 *      ACCEPTED (so GitHub stops retrying) but writes nothing — a webhook must not create a tenant.
 * The per-tenant idempotency ledger (`github_deliveries`) then makes a redelivery a no-op.
 */
async function handleGitHubWebhook(
  db: Db,
  options: WorkspaceServerOptions,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!options.github) {
    json(res, 404, { error: "not_found" });
    return;
  }
  const rawBody = await readRawBody(req, MAX_WEBHOOK_BODY_BYTES);
  const signature = headerValue(req, "x-hub-signature-256");
  // Signature first, over the raw bytes, before we parse anything to find the installation.
  if (!verifySignature(options.github.webhook_secret, rawBody, signature)) {
    json(res, 401, { result: "invalid_signature" });
    return;
  }
  let installationId: string | null = null;
  try {
    const parsed = JSON.parse(rawBody.toString("utf8")) as { installation?: { id?: unknown } };
    const rawId = parsed?.installation?.id;
    if (typeof rawId === "number" || typeof rawId === "string") installationId = String(rawId);
  } catch {
    json(res, 400, { result: "malformed_body" });
    return;
  }
  const workspaceId = installationId
    ? await resolveInstallationWorkspace(db, installationId)
    : null;
  if (!workspaceId) {
    // Accepted so GitHub stops retrying; dropped because there is no tenant to attribute it to.
    json(res, 202, { result: "installation_unmapped" });
    return;
  }
  const outcome = await handleWebhook(
    {
      db,
      secret: options.github.webhook_secret,
      // The delivery ledger is the durable record for this phase; event fan-out lives in the ingest
      // modules (github/checks.ts, github/auth.ts) and is added as those events are handled.
      process: async () => {},
    },
    {
      rawBody,
      signature,
      event: headerValue(req, "x-github-event"),
      deliveryId: headerValue(req, "x-github-delivery"),
      workspaceId,
    },
  );
  json(res, outcome.status, { result: outcome.result });
}

/**
 * Serve the billing state for a workspace. Three gates in this order: TENANCY (another workspace is a
 * 404 — existence is never disclosed across a tenant boundary), AUTHORITY (`billing.manage`, i.e. the
 * owner; a developer gets 403), and only then the read. Every value in the response is resolved from
 * the stored subscription; nothing in the request can influence it.
 */
async function handleBillingRead(
  db: Db,
  principal: Principal,
  workspaceId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "billing.manage")) {
    json(res, 403, { error: "forbidden", action: "billing.manage" });
    return;
  }
  const subscription = await loadSubscription(db, principal.workspace_id);
  const entitlements = resolveEntitlements(subscription);
  const window = currentBillingMonth();
  const activeDevelopers = await countActiveDevelopers(db, principal.workspace_id, window);
  const credit = await loadLatestCredit(db, principal.workspace_id);
  json(res, 200, {
    billing: {
      plan_id: entitlements.plan_id,
      state: entitlements.state,
      entitlements,
      current_period_end: subscription?.current_period_end ?? null,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
      seats: subscription?.seats ?? null,
      active_developers: activeDevelopers,
      usd_per_active_developer_month:
        LAUNCH_PLANS[entitlements.plan_id].usd_per_active_developer_month,
      credit,
    },
  });
}

/** The current calendar month in UTC — the window an "active developer" is counted over. */
function currentBillingMonth(now: Date = new Date()): { since: string; until: string } {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { since: since.toISOString(), until: until.toISOString() };
}

/** The most recent pilot credit recorded for a workspace, or null when none has been computed. */
async function loadLatestCredit(
  db: Db,
  workspaceId: string,
): Promise<{ credit_usd: number; reason: string; measured_overhead_usd: number | null } | null> {
  const { rows } = await db.query<{
    credit_usd: string | number;
    reason: string;
    measured_overhead_usd: string | number | null;
  }>(
    `SELECT credit_usd, reason, measured_overhead_usd
       FROM workspace_billing_credits WHERE workspace_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [workspaceId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    credit_usd: Number(row.credit_usd),
    reason: row.reason,
    measured_overhead_usd: row.measured_overhead_usd === null ? null : Number(row.measured_overhead_usd),
  };
}

/**
 * Start a Stripe Checkout session. The client names a PLAN; the price comes from the server's
 * configured map, so a request can never choose what it is charged, and it can never grant itself
 * anything — a checkout only starts a payment, and only the signed webhook that follows moves state.
 */
async function handleCheckout(
  db: Db,
  options: WorkspaceServerOptions,
  principal: Principal,
  workspaceId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "billing.manage")) {
    json(res, 403, { error: "forbidden", action: "billing.manage" });
    return;
  }
  if (!options.stripe) {
    json(res, 404, { error: "billing_not_configured" });
    return;
  }
  const body = (await readJsonBody(req)) as { plan_id?: unknown } | undefined;
  const planId = typeof body?.plan_id === "string" && PLAN_IDS.has(body.plan_id) ? (body.plan_id as PlanId) : null;
  if (!planId || planId === "local") {
    json(res, 400, { error: "invalid_plan" });
    return;
  }
  // Seats are the SERVER's count of people who actually worked this month, never a client-supplied
  // quantity: a client that could name its own seat count could under-buy at will.
  const quantity = Math.max(1, await countActiveDevelopers(db, principal.workspace_id, currentBillingMonth()));
  try {
    const session = await createCheckoutSession(
      { config: options.stripe, fetcher: options.fetcher },
      { workspace_id: principal.workspace_id, plan_id: planId, quantity },
    );
    json(res, 200, { checkout: session });
  } catch (error) {
    // A plan with no configured price is a deployment gap, not a client error, and it must not look
    // like a successful checkout.
    json(res, 503, { error: "checkout_unavailable", detail: (error as Error).message });
  }
}

/**
 * Open a Stripe customer-portal session. Owner-gated and tenant-scoped like every other billing route,
 * and it can only ever be opened for the customer id THIS service stored from a signed webhook — a
 * request cannot name a customer.
 */
async function handlePortal(
  db: Db,
  options: WorkspaceServerOptions,
  principal: Principal,
  workspaceId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "billing.manage")) {
    json(res, 403, { error: "forbidden", action: "billing.manage" });
    return;
  }
  if (!options.stripe) {
    json(res, 404, { error: "billing_not_configured" });
    return;
  }
  const subscription = await loadSubscription(db, principal.workspace_id);
  if (!subscription?.stripe_customer_id) {
    json(res, 409, { error: "no_stripe_customer" });
    return;
  }
  try {
    const session = await createPortalSession(
      { config: options.stripe, fetcher: options.fetcher },
      { stripe_customer_id: subscription.stripe_customer_id },
    );
    json(res, 200, { portal: session });
  } catch (error) {
    json(res, 503, { error: "portal_unavailable", detail: (error as Error).message });
  }
}

/**
 * Compute, record, and apply the no-overhead pilot credit for this workspace.
 *
 * Four gates before any money is considered: TENANCY (another workspace is a 404), AUTHORITY (owner
 * only), SCOPE (a repository-scoped owner is refused rather than silently under-crediting from a partial
 * view of the pilot), and CONFIGURATION (no Stripe, no crediting). The credit itself is derived only
 * from measured receipts this principal may read, and the response reports the LEDGER row.
 */
async function handlePilotCredit(
  db: Db,
  options: WorkspaceServerOptions,
  principal: Principal,
  workspaceId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "billing.manage")) {
    json(res, 403, { error: "forbidden", action: "billing.manage" });
    return;
  }
  if (principal.repository_ids !== "all") {
    // A credit computed from part of the pilot is a wrong number, not a smaller one. Refuse instead.
    json(res, 403, { error: "pilot_credit_requires_workspace_scope" });
    return;
  }
  if (!options.stripe) {
    json(res, 404, { error: "billing_not_configured" });
    return;
  }
  const body = (await readJsonBody(req)) as
    | { pilot_id?: unknown; since?: unknown; until?: unknown }
    | undefined;
  const pilotId = typeof body?.pilot_id === "string" ? body.pilot_id.trim() : "";
  if (!pilotId) {
    json(res, 400, { error: "invalid_pilot_id" });
    return;
  }
  try {
    const outcomes = await loadTaskOutcomes(db, principal, {
      since: typeof body?.since === "string" ? body.since : undefined,
      until: typeof body?.until === "string" ? body.until : undefined,
    });
    const application = await applyPilotCredit(
      db,
      { config: options.stripe, fetcher: options.fetcher },
      { workspace_id: principal.workspace_id, pilot_id: pilotId, outcomes },
    );
    json(res, 200, {
      credit: {
        status: application.status,
        credit_usd: application.result.credit_usd,
        reason: application.result.reason,
        measured_overhead_usd: application.result.measured_overhead_usd,
        exact_receipts: application.result.exact_receipts,
        excluded_receipts: application.result.excluded_receipts,
        capped: application.result.capped,
        formula: application.result.formula,
        applied_invoice_id: application.applied_invoice_id,
      },
    });
  } catch (error) {
    if (error instanceof MetricsWindowError) {
      json(res, 400, { error: "invalid_window", field: error.field });
      return;
    }
    // A provider failure must not look like a credit that was applied.
    json(res, 503, { error: "credit_unavailable", detail: (error as Error).message });
  }
}

/** Coerce a parsed body into a full SyncBatch, defaulting every collection so apply never dereferences null. */
function normalizeBatch(body: Partial<SyncBatch>): SyncBatch {
  return {
    protocol_version: 1,
    batch_id: String(body.batch_id),
    workspace_id: String(body.workspace_id),
    repository_id: String(body.repository_id),
    base_cursor: body.base_cursor ?? null,
    entities: body.entities ?? [],
    claims: body.claims ?? [],
    evidence: body.evidence ?? [],
    relations: body.relations ?? [],
    review_decisions: body.review_decisions ?? [],
    measurements: body.measurements ?? [],
    task_outcomes: body.task_outcomes ?? [],
    created_at: body.created_at ?? new Date().toISOString(),
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

// ---------------------------------------------------------------------------------------------
// enterprise: SCIM, OIDC, retention, export, deletion
// ---------------------------------------------------------------------------------------------

/**
 * Dispatch a SCIM request. The bearer token resolves to exactly one workspace SERVER-SIDE, and that
 * workspace is the only one the handler can read or write — nothing in the path or body can widen it.
 */
async function handleScim(
  db: Db,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  query: URLSearchParams,
): Promise<void> {
  const context = await authenticateScim(db, bearerToken(req));
  if (!context) {
    res.writeHead(401, {
      "content-type": SCIM_CONTENT_TYPE,
      "www-authenticate": 'Bearer realm="scim"',
    });
    res.end(
      JSON.stringify({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "401",
        detail: "a valid SCIM bearer token is required",
      }),
    );
    return;
  }
  const method = req.method ?? "GET";
  const body = method === "GET" || method === "DELETE" ? undefined : await readJsonBody(req);
  const result = await handleScimRequest(db, context, { method, path, query, body });
  if (result.body === null) {
    res.writeHead(result.status, { "content-type": result.contentType });
    res.end();
    return;
  }
  res.writeHead(result.status, { "content-type": result.contentType });
  res.end(JSON.stringify(result.body));
}

/** Look up a workspace id from the slug a login form supplies. Returns null when there is no such slug. */
async function workspaceIdForSlug(db: Db, slug: string): Promise<string | null> {
  const { rows } = await db.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM workspaces WHERE slug = $1`,
    [slug],
  );
  return rows[0]?.workspace_id ?? null;
}

/**
 * Begin an SSO login. Answers the same 404 for "no such workspace" and "this workspace has no SSO", so
 * an anonymous caller cannot enumerate which customers exist or which of them bought enterprise.
 */
async function handleOidcStart(
  db: Db,
  options: WorkspaceServerOptions,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = ((await readJsonBody(req)) ?? {}) as { workspace_slug?: unknown };
  const slug = typeof body.workspace_slug === "string" ? body.workspace_slug : "";
  const workspaceId = slug ? await workspaceIdForSlug(db, slug) : null;
  const provider = workspaceId ? await loadOidcProvider(db, workspaceId) : null;
  if (!provider) {
    json(res, 404, { error: "not_found" });
    return;
  }
  const started = await beginOidcLogin(db, provider);
  // The nonce stays server-side: the browser needs only the URL it is being sent to, plus the binding
  // cookie that proves — at the callback — that this browser is the one that started the login. The
  // cookie is scoped to the OIDC path and expires with the login request, so it is not a second
  // long-lived credential lying around.
  res.writeHead(200, {
    "content-type": "application/json",
    "set-cookie": `${OIDC_BINDING_COOKIE}=${started.binding}; Path=/v1/auth/oidc; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(
      LOGIN_REQUEST_TTL_MS / 1000,
    )}`,
  });
  res.end(
    JSON.stringify({ authorization_url: started.authorization_url, expires_at: started.expires_at }),
  );
}

/**
 * Complete an SSO login and set the session cookie. Every failure answers 401 with the machine-readable
 * reason code but no detail an attacker could probe with — the codes are for the operator's logs and the
 * error page, not a discovery channel.
 */
async function handleOidcCallback(
  db: Db,
  options: WorkspaceServerOptions,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const slug = url.searchParams.get("workspace") ?? "";
  const workspaceId = slug ? await workspaceIdForSlug(db, slug) : null;
  const provider = workspaceId ? await loadOidcProvider(db, workspaceId) : null;
  if (!provider || !state || !code) {
    json(res, 400, { error: "invalid_request" });
    return;
  }
  // The binding cookie is what distinguishes "the user came back from their IdP" from "the user was
  // navigated here by somebody else's login". Absent, it is answered exactly like a bad one: 401.
  const binding = cookieValue(req, OIDC_BINDING_COOKIE) ?? "";
  const clearBinding = `${OIDC_BINDING_COOKIE}=; Path=/v1/auth/oidc; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  if (!binding) {
    res.writeHead(401, { "content-type": "application/json", "set-cookie": clearBinding });
    res.end(JSON.stringify({ error: "sso_login_failed", code: "oidc_binding_invalid" }));
    return;
  }
  const fetcher =
    options.oidcFetcher ?? ((target, init) => fetch(target, init) as unknown as ReturnType<OidcFetcher>);
  try {
    const completed = await completeOidcLogin(db, provider, { state, code, binding, fetcher });
    res.writeHead(200, {
      "content-type": "application/json",
      // The single-use binding is cleared the moment it is spent, so a second callback cannot reuse it.
      "set-cookie": [
        `kage_session=${completed.session.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(
          (completed.session.expires_at.getTime() - Date.now()) / 1000,
        )}`,
        clearBinding,
      ],
    });
    res.end(
      JSON.stringify({
        principal_id: completed.principal_id,
        workspace_id: completed.workspace_id,
        csrf: completed.session.csrf,
        provisioned: completed.provisioned,
      }),
    );
  } catch (error) {
    if (error instanceof OidcError) {
      res.writeHead(401, { "content-type": "application/json", "set-cookie": clearBinding });
      res.end(JSON.stringify({ error: "sso_login_failed", code: error.code }));
      return;
    }
    throw error;
  }
}

/** Read or set retention policy. Tenant-scoped, and gated on `policy.manage` authority. */
async function handleRetention(
  db: Db,
  principal: Principal,
  workspaceId: string,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "policy.manage")) {
    json(res, 403, { error: "forbidden", action: "policy.manage" });
    return;
  }
  if (method === "GET") {
    json(res, 200, { policies: await loadRetentionPolicies(db, principal.workspace_id) });
    return;
  }
  const body = ((await readJsonBody(req)) ?? {}) as { category?: unknown; retention_days?: unknown };
  const category = String(body.category ?? "") as RetentionCategory;
  if (!RETENTION_CATEGORIES.includes(category)) {
    json(res, 400, { error: "unknown_category" });
    return;
  }
  const days =
    body.retention_days === null || body.retention_days === undefined
      ? null
      : Number(body.retention_days);
  try {
    const policy = await setRetentionPolicy(db, {
      workspace_id: principal.workspace_id,
      category,
      retention_days: days,
      actor_id: principal.principal_id,
    });
    json(res, 200, { policy });
  } catch (error) {
    if (error instanceof RetentionPolicyError) {
      json(res, 400, { error: error.code, message: error.message });
      return;
    }
    throw error;
  }
}

/** Run the retention purge for this tenant now. */
async function handleRetentionApply(
  db: Db,
  principal: Principal,
  workspaceId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "policy.manage")) {
    json(res, 403, { error: "forbidden", action: "policy.manage" });
    return;
  }
  json(res, 200, await applyRetention(db, principal.workspace_id));
}

/**
 * The cookie the browser that STARTED an SSO login carries back to the callback. Nothing else may
 * complete a login.
 */
const OIDC_BINDING_COOKIE = "kage_oidc_binding";

/**
 * Where exports land when a deployment has not configured a directory.
 *
 * NOT a fixed, guessable path under the shared OS temp dir. `/tmp/kage-workspace-exports` sits inside a
 * world-writable parent, which means any local user can create it first (or point it somewhere) and read
 * every tenant export this service writes; `mkdir` with a tight mode does not fix a directory somebody
 * else already owns. `mkdtempSync` creates an unpredictable directory at 0700 owned by this process's
 * user, once per process, and a deployment that wants a durable location sets `export_directory` or
 * `KAGE_WORKSPACE_EXPORT_DIR`.
 */
let processExportDirectory: string | null = null;
function exportDirectory(options: WorkspaceServerOptions): string {
  const configured = options.dataControls?.export_directory ?? process.env.KAGE_WORKSPACE_EXPORT_DIR;
  if (configured) return configured;
  if (!processExportDirectory || !existsSync(processExportDirectory)) {
    processExportDirectory = mkdtempSync(join(tmpdir(), "kage-workspace-exports-"));
  }
  return processExportDirectory;
}

/**
 * Serve an export to whoever holds its ticket.
 *
 * There is no session check here on purpose, and it is not a weakening: the ticket IS the credential,
 * it is bound to exactly one export row, it is stored hashed, and it expires. A session check would make
 * the deletion export — the one case where the customer has no account left — undeliverable, which is
 * how a "downloadable encrypted export" turns into a path in a support ticket.
 */
async function handleExportDownload(
  db: Db,
  exportId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const resolved = await resolveExportDownload(db, exportId, bearerToken(req));
  // Unknown id, wrong ticket, and expired ticket are one answer: an id is not a probe oracle.
  if (!resolved) {
    json(res, 401, { error: "unauthenticated" });
    return;
  }
  if (!existsSync(resolved.export_path)) {
    json(res, 410, { error: "export_no_longer_available", export_id: resolved.export_id });
    return;
  }
  res.writeHead(200, {
    "content-type": "application/octet-stream",
    "content-length": String(resolved.byte_size),
    "content-disposition": `attachment; filename="${basename(resolved.export_path)}"`,
    // So the caller can verify what they received without trusting the transport.
    "x-kage-export-sha256": resolved.sha256,
  });
  const stream = createReadStream(resolved.export_path);
  stream.on("error", () => res.end());
  stream.pipe(res);
  await new Promise<void>((resolve) => res.on("close", () => resolve()));
}

/**
 * Export a workspace. The encryption key is minted PER EXPORT, returned once to the authenticated
 * requester, and never stored — so the file at rest is useless to anyone who obtains only the file, and
 * this service cannot later decrypt a customer's export on its own.
 */
async function handleExport(
  db: Db,
  options: WorkspaceServerOptions,
  principal: Principal,
  workspaceId: string,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (!can(principal, "workspace.manage")) {
    json(res, 403, { error: "forbidden", action: "workspace.manage" });
    return;
  }
  const key = randomBytes(32);
  const result = await exportWorkspace(db, principal.workspace_id, {
    directory: exportDirectory(options),
    encryption_key: key,
  });
  // An export the customer cannot fetch is not an export. The ticket is minted here and shown once.
  const download = await registerExportDownload(db, {
    workspace_id: principal.workspace_id,
    workspace_slug: result.manifest.workspace_slug,
    kind: "export",
    export_path: result.export_path,
    sha256: result.sha256,
    byte_size: result.byte_size,
  });
  json(res, 200, {
    export_id: download.export_id,
    download_url: `/v1/exports/${download.export_id}/download`,
    // Shown exactly once, like the decryption key. Presented as `Authorization: Bearer` to the download.
    download_token: download.token,
    download_expires_at: download.expires_at,
    // The server-side path, kept for operators. It is not how the customer gets the file.
    export_path: result.export_path,
    sha256: result.sha256,
    byte_size: result.byte_size,
    schema_version: result.schema_version,
    tables: result.manifest.tables,
    // Shown exactly once. Losing it means the export cannot be opened — by the customer OR by us.
    decryption_key: key.toString("base64"),
  });
}

/**
 * Delete a workspace. Three authority checks stack, and none of them reads a claim from the request:
 * the ROLE must be owner (re-read inside `deleteWorkspace` from the database); the caller's SESSION must
 * carry a `reauthenticated_at` this server wrote inside the last five minutes (the request body cannot
 * express it — an earlier cut took the instant from the body, which is not a check at all); and the
 * caller must type the workspace slug.
 */
async function handleDelete(
  db: Db,
  options: WorkspaceServerOptions,
  principal: Principal,
  session: ResolvedSession,
  workspaceId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (workspaceId !== principal.workspace_id) {
    json(res, 404, { error: "not_found" });
    return;
  }
  if (principal.role !== "owner" || principal.principal_type !== "user") {
    json(res, 403, { error: "forbidden", action: "workspace.delete" });
    return;
  }
  // `reauthenticated_at` is deliberately NOT read from here. The only accepted proof is the session row.
  const body = ((await readJsonBody(req)) ?? {}) as { confirm_slug?: unknown };
  // Typing the slug is the human confirmation step: it makes an accidental or scripted POST inert.
  const slug = await db.query<{ slug: string }>(`SELECT slug FROM workspaces WHERE workspace_id = $1`, [
    principal.workspace_id,
  ]);
  if (String(body.confirm_slug ?? "") !== (slug.rows[0]?.slug ?? " ")) {
    json(res, 400, { error: "confirmation_required" });
    return;
  }
  const key = randomBytes(32);
  try {
    const result = await deleteWorkspace(db, principal.workspace_id, {
      confirmed_by: principal.principal_id,
      session_id: session.session_id,
      directory: exportDirectory(options),
      encryption_key: key,
      object_store: options.dataControls?.object_store,
    });
    json(res, 200, {
      workspace_id: result.workspace_id,
      export_path: result.export_path,
      export_sha256: result.export_sha256,
      rows_deleted: result.rows_deleted,
      // Two numbers, never merged: what the tenant had, and what the store said it removed.
      object_keys_total: result.object_keys_total,
      object_keys_deleted: result.object_keys_deleted,
      object_store_configured: Boolean(options.dataControls?.object_store),
      // The tenant no longer exists, so this ticket is the ONLY way to fetch the export. Shown once.
      export_id: result.download.export_id,
      download_url: `/v1/exports/${result.download.export_id}/download`,
      download_token: result.download.token,
      download_expires_at: result.download.expires_at,
      decryption_key: key.toString("base64"),
    });
  } catch (error) {
    if (error instanceof WorkspaceDeletionError) {
      // 409 for the object store: the request was legitimate and the caller had the authority — the
      // DEPLOYMENT cannot honour it, which an operator must fix, not the caller.
      const status =
        error.code === "unknown_workspace" ? 404 : error.code === "object_store_required" ? 409 : 403;
      json(res, status, { error: error.code, message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * Start the workspace HTTP server (port 0 = an ephemeral port).
 *
 * The default bind address is `0.0.0.0`, NOT loopback, and that is a packaging requirement rather than a
 * preference: inside a container Docker DNATs a published port to the container's bridge IP, so a
 * process bound to 127.0.0.1 is not listening where the published port arrives — every external request
 * is refused while the in-container healthcheck (which does hit 127.0.0.1) still reports healthy. The
 * service speaks plain HTTP and expects a TLS terminator in front of it; where that terminator sits, and
 * therefore how narrowly the HOST publishes the port, is the operator's decision (see the compose file's
 * `KAGE_WORKSPACE_PUBLISH_ADDR`), not something this process can make by binding loopback.
 */
export async function startWorkspaceServer(
  db: Db,
  port = 0,
  options: WorkspaceServerOptions = {},
  host = "0.0.0.0",
): Promise<WorkspaceServer> {
  const handle = createWorkspaceApp(db, options);
  const server: Server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: "internal_error" });
      else res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  return {
    port: boundPort,
    host,
    close() {
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
