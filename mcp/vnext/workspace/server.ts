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
import { applyBatch, pullChanges, ReviewAuthorityError } from "./sync-routes.js";
import { reviewClaim, type ReviewAction } from "./review.js";
import { loadTeamMetrics, MetricsWindowError, TaskOutcomeValidationError } from "./metrics.js";
import { forTarget } from "./audit.js";
import { assertNoRawPayload } from "../sync/outbox.js";
import type { SyncBatch } from "../sync/types.js";
import { countActiveDevelopers, loadSubscription, resolveEntitlements } from "./billing/entitlements.js";
import {
  createCheckoutSession,
  handleStripeEvent,
  type Fetcher as StripeFetcher,
  type StripeConfig,
} from "./billing/stripe.js";
import { LAUNCH_PLANS, PLAN_IDS, type PlanId } from "./billing/types.js";

const REVIEW_ACTIONS: ReadonlySet<string> = new Set<ReviewAction>(["accept", "reject", "supersede"]);

export interface WorkspaceServer {
  port: number;
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

/** The EXACT bytes of the request body. A signature must be verified over these, never over a re-parse. */
async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const raw = await readRawBody(req);
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

    // POST /v1/billing/stripe/webhook — Stripe authenticates with a SIGNATURE, not a session, so this
    // route sits deliberately before the session gate (Stripe has no cookie and no service token).
    // Authority comes from the signature over the raw bytes; CSRF does not apply for the same reason.
    if (method === "POST" && path === "/v1/billing/stripe/webhook") {
      await handleStripeWebhook(db, options, req, res);
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
  const rawBody = await readRawBody(req);
  const header = req.headers["stripe-signature"];
  const outcome = await handleStripeEvent(
    { db, config: options.stripe },
    { rawBody, signature: Array.isArray(header) ? header[0] : header },
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

/** Start the workspace HTTP server on `127.0.0.1:<port>` (port 0 = an ephemeral port). */
export async function startWorkspaceServer(
  db: Db,
  port = 0,
  options: WorkspaceServerOptions = {},
): Promise<WorkspaceServer> {
  const handle = createWorkspaceApp(db, options);
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
