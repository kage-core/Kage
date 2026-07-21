// Phase E Task 8 — enterprise identity (OIDC + SCIM), retention, and data controls, proven against a
// REAL embedded PostgreSQL.
//
// WHAT THIS SUITE CAN AND CANNOT PROVE. Everything here runs without a live identity provider: the
// OIDC tests mint a REAL RS256 keypair with `jose`, sign REAL ID tokens with it, and serve a REAL JWKS
// through an injected fetcher, so signature/issuer/audience/nonce/expiry validation is exercised end to
// end against the same verifier production uses. What is NOT proven here is interoperability with a
// specific vendor's IdP (Okta/Entra/Google) — that needs a real tenant and is an honest gap.
//
// The retention/export/delete tests run against real Postgres because their guarantees are database
// guarantees: an audit row can only be removed through the explicit purge path, a delete removes every
// tenant table in one transaction, and a neighbouring tenant's rows are untouched by any of it.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startTestPostgres, type TestPostgres } from "../test-support/pg.js";
import { createDb, type Db } from "../db.js";
import { migrate } from "../migrate.js";
import { createSession, resolveSession } from "../auth/session.js";
import { forActor, forTarget, recordAuditEvent } from "../audit.js";
import { startWorkspaceServer, type WorkspaceServer } from "../server.js";
import {
  beginOidcLogin,
  completeOidcLogin,
  storeOidcProvider,
  loadOidcProvider,
  discoverOidc,
  OidcError,
  type OidcProviderConfig,
  type Fetcher as OidcFetcher,
} from "./oidc.js";
import {
  activeSessionCount,
  authenticateScim,
  handleScimRequest,
  issueScimToken,
  SCIM_CONTENT_TYPE,
} from "./scim.js";
import {
  applyRetention,
  DEFAULT_RETENTION_DAYS,
  loadRetentionPolicies,
  MINIMUM_RETENTION_DAYS,
  RETENTION_CATEGORIES,
  RetentionPolicyError,
  setRetentionPolicy,
} from "./retention.js";
import {
  deleteWorkspace,
  exportWorkspace,
  objectKeysForWorkspace,
  readWorkspaceExport,
  WorkspaceDeletionError,
  workspaceExists,
  type ObjectStore,
} from "./export-delete.js";

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;
let exportDir: string;

/** The enterprise-entitled tenant most tests run in. */
const enterpriseWorkspace = randomUUID();
/** A paid-but-not-enterprise tenant, used to prove SSO/SCIM are gated to the enterprise plan. */
const teamWorkspace = randomUUID();
/** A neighbouring enterprise tenant, used to prove every control stays inside one tenant. */
const neighbourWorkspace = randomUUID();

const ISSUER = "https://idp.example.com";
const CLIENT_ID = "kage-workspace-client";

let signingKey: CryptoKey;
let jwks: { keys: unknown[] };

const EXPORT_KEY = randomBytes(32);

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  exportDir = mkdtempSync(join(tmpdir(), "kage-workspace-export-"));
  await seedWorkspace(enterpriseWorkspace, "enterprise-tenant", "enterprise");
  await seedWorkspace(teamWorkspace, "team-tenant", "team");
  await seedWorkspace(neighbourWorkspace, "neighbour-tenant", "enterprise");
  const jose = await import("jose");
  const pair = await jose.generateKeyPair("RS256", { extractable: true });
  signingKey = pair.privateKey as CryptoKey;
  const jwk = (await jose.exportJWK(pair.publicKey)) as Record<string, unknown>;
  jwk.kid = "kage-test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";
  jwks = { keys: [jwk] };
  server = await startWorkspaceServer(db);
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
  if (exportDir) rmSync(exportDir, { recursive: true, force: true });
});

async function seedWorkspace(id: string, slug: string, plan: "team" | "enterprise"): Promise<void> {
  await db.query(`INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, $4)`, [
    id,
    slug,
    slug,
    plan,
  ]);
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, external_id, name, default_branch)
       VALUES($1, 'repo-main', 'github', '1', 'main-repo', 'main')`,
    [id],
  );
  // A REAL stored subscription: entitlements are resolved from this row alone, never from a request.
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end, seats)
       VALUES($1, $2, 'active', now() + interval '30 days', 10)`,
    [id, plan],
  );
}

async function seedPrincipal(
  workspaceId: string,
  role: string,
  extra: { external_id?: string; user_name?: string; email?: string } = {},
): Promise<string> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids,
                                      external_id, user_name, email)
       VALUES($1, $2, 'user', $3, NULL, $4, $5, $6)`,
    [
      workspaceId,
      principalId,
      role,
      extra.external_id ?? null,
      extra.user_name ?? null,
      extra.email ?? null,
    ],
  );
  return principalId;
}

// ---------------------------------------------------------------------------------------------
// OIDC
// ---------------------------------------------------------------------------------------------

function providerFor(workspaceId: string, overrides: Partial<OidcProviderConfig> = {}): OidcProviderConfig {
  return {
    workspace_id: workspaceId,
    issuer: ISSUER,
    client_id: CLIENT_ID,
    client_secret: "test-client-secret",
    redirect_uri: "https://workspace.kage.dev/v1/auth/oidc/callback",
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    jwks_uri: `${ISSUER}/jwks`,
    jwks: jwks as never,
    allowed_email_domains: ["example.com"],
    default_role: "developer",
    allow_jit_provisioning: true,
    ...overrides,
  };
}

interface TokenClaims {
  issuer?: string;
  audience?: string;
  nonce?: string;
  subject?: string;
  email?: string;
  email_verified?: boolean;
  expiresIn?: string;
  key?: CryptoKey;
}

async function signIdToken(claims: TokenClaims): Promise<string> {
  const jose = await import("jose");
  return new jose.SignJWT({
    nonce: claims.nonce,
    email: claims.email ?? "person@example.com",
    email_verified: claims.email_verified ?? true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "kage-test-key" })
    .setIssuer(claims.issuer ?? ISSUER)
    .setAudience(claims.audience ?? CLIENT_ID)
    .setSubject(claims.subject ?? "idp-subject-1")
    .setIssuedAt()
    .setExpirationTime(claims.expiresIn ?? "5m")
    .sign(claims.key ?? signingKey);
}

/** A token endpoint that returns exactly the id token the test wants, recording what was sent. */
function tokenFetcher(idToken: string, sent: { body?: string } = {}): OidcFetcher {
  return async (url, init) => {
    sent.body = init?.body;
    if (url.endsWith("/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id_token: idToken, access_token: "opaque", token_type: "Bearer" }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

test("OIDC authorization request uses PKCE S256 and a single-use state", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const url = new URL(started.authorization_url);
  assert.equal(url.origin + url.pathname, `${ISSUER}/authorize`);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok((url.searchParams.get("code_challenge") ?? "").length >= 43);
  assert.equal(url.searchParams.get("state"), started.state);
  assert.equal(url.searchParams.get("nonce"), started.nonce);
  // The verifier itself is never put on the wire to the browser.
  assert.equal(url.searchParams.get("code_verifier"), null);
});

test("OIDC callback rejects a wrong audience", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, audience: "some-other-client" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-1", fetcher: tokenFetcher(idToken) }),
    /audience/,
  );
});

test("OIDC callback rejects a wrong nonce", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: "not-the-nonce-we-issued" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-2", fetcher: tokenFetcher(idToken) }),
    /nonce/,
  );
});

test("OIDC callback rejects a wrong issuer", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, issuer: "https://evil.example.com" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-3", fetcher: tokenFetcher(idToken) }),
    /issuer/,
  );
});

test("OIDC callback rejects a token signed by a key the IdP does not publish", async () => {
  const jose = await import("jose");
  const rogue = await jose.generateKeyPair("RS256", { extractable: true });
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, key: rogue.privateKey as CryptoKey });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-4", fetcher: tokenFetcher(idToken) }),
    /signature/,
  );
});

test("OIDC callback rejects an expired token", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, expiresIn: "-1m" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-5", fetcher: tokenFetcher(idToken) }),
    /expired/,
  );
});

test("OIDC callback rejects an unknown or replayed state", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const strayToken = await signIdToken({ nonce: "x" });
  await assert.rejects(
    () =>
      completeOidcLogin(db, provider, {
        state: "state-we-never-issued",
        code: "code-6",
        fetcher: tokenFetcher(strayToken),
      }),
    /state/,
  );

  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, subject: "replay-subject" });
  const first = await completeOidcLogin(db, provider, {
    state: started.state,
    code: "code-7",
    fetcher: tokenFetcher(idToken),
  });
  assert.ok(first.session.token);
  await assert.rejects(
    () =>
      completeOidcLogin(db, provider, { state: started.state, code: "code-7", fetcher: tokenFetcher(idToken) }),
    /state/,
  );
});

test("OIDC callback enforces the configured email domain restriction", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, email: "person@not-allowed.test" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-8", fetcher: tokenFetcher(idToken) }),
    /domain/,
  );
});

test("OIDC login sends the PKCE verifier and issues a session for the mapped principal", async () => {
  const provider = providerFor(enterpriseWorkspace);
  const principalId = await seedPrincipal(enterpriseWorkspace, "developer", {
    external_id: "idp-subject-mapped",
    user_name: "mapped@example.com",
    email: "mapped@example.com",
  });
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({
    nonce: started.nonce,
    subject: "idp-subject-mapped",
    email: "mapped@example.com",
  });
  const sent: { body?: string } = {};
  const result = await completeOidcLogin(db, provider, {
    state: started.state,
    code: "code-9",
    fetcher: tokenFetcher(idToken, sent),
  });
  assert.equal(result.principal_id, principalId);
  const exchanged = new URLSearchParams(sent.body ?? "");
  assert.equal(exchanged.get("grant_type"), "authorization_code");
  assert.equal(exchanged.get("code"), "code-9");
  assert.ok((exchanged.get("code_verifier") ?? "").length >= 43);
  const resolved = await resolveSession(db, result.session.token);
  assert.equal(resolved?.principal.principal_id, principalId);
  assert.equal(resolved?.principal.workspace_id, enterpriseWorkspace);
});

test("OIDC login is gated to the enterprise plan", async () => {
  const provider = providerFor(teamWorkspace);
  const started = await beginOidcLogin(db, provider);
  const idToken = await signIdToken({ nonce: started.nonce, subject: "team-subject" });
  await assert.rejects(
    () => completeOidcLogin(db, provider, { state: started.state, code: "code-10", fetcher: tokenFetcher(idToken) }),
    (error: unknown) => error instanceof OidcError && error.code === "sso_requires_enterprise_plan",
  );
});

test("OIDC discovery refuses a document whose issuer does not match", async () => {
  const fetcher: OidcFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      issuer: "https://someone-else.example.com",
      authorization_endpoint: `${ISSUER}/authorize`,
      token_endpoint: `${ISSUER}/token`,
      jwks_uri: `${ISSUER}/jwks`,
    }),
  });
  await assert.rejects(() => discoverOidc(ISSUER, fetcher), /issuer/);
});

test("a stored OIDC provider keeps its client secret in a deployment secret, not the database", async () => {
  await storeOidcProvider(db, {
    workspace_id: enterpriseWorkspace,
    issuer: ISSUER,
    client_id: CLIENT_ID,
    client_secret_ref: "KAGE_TEST_OIDC_SECRET",
    redirect_uri: "https://workspace.kage.dev/v1/auth/oidc/callback",
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    jwks_uri: `${ISSUER}/jwks`,
    allowed_email_domains: ["example.com"],
    default_role: "developer",
    allow_jit_provisioning: false,
  });
  const columns = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'workspace_oidc_providers'`,
  );
  const names = columns.rows.map((row) => row.column_name);
  assert.ok(!names.includes("client_secret"), `client secret column must not exist: ${names.join(",")}`);
  process.env.KAGE_TEST_OIDC_SECRET = "resolved-from-env";
  const loaded = await loadOidcProvider(db, enterpriseWorkspace);
  assert.equal(loaded?.client_secret, "resolved-from-env");
  delete process.env.KAGE_TEST_OIDC_SECRET;
  // Another tenant's config is never returned.
  assert.equal(await loadOidcProvider(db, neighbourWorkspace), null);
});

// ---------------------------------------------------------------------------------------------
// SCIM
// ---------------------------------------------------------------------------------------------

async function scim(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Record<string, unknown>; contentType: string | null }> {
  const response = await fetch(`http://127.0.0.1:${server.port}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": SCIM_CONTENT_TYPE,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body: parsed, contentType: response.headers.get("content-type") };
}

test("SCIM requires a valid bearer token", async () => {
  const result = await scim("not-a-real-token", "GET", "/scim/v2/Users");
  assert.equal(result.status, 401);
});

test("a SCIM token is stored hashed and resolves only its own workspace", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "primary-idp");
  const rows = await db.query<{ token_hash: string }>(
    `SELECT token_hash FROM workspace_scim_tokens WHERE workspace_id = $1 AND token_id = $2`,
    [enterpriseWorkspace, issued.token_id],
  );
  assert.equal(rows.rows.length, 1);
  assert.notEqual(rows.rows[0].token_hash, issued.token);
  const ctx = await authenticateScim(db, issued.token);
  assert.equal(ctx?.workspace_id, enterpriseWorkspace);
  assert.equal(await authenticateScim(db, `${issued.token}x`), null);
});

test("SCIM provisioning is gated to the enterprise plan", async () => {
  const issued = await issueScimToken(db, teamWorkspace, "team-idp");
  const result = await scim(issued.token, "GET", "/scim/v2/Users");
  assert.equal(result.status, 403);
});

test("SCIM discovery endpoints are served as application/scim+json", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "discovery-idp");
  for (const path of ["/scim/v2/ServiceProviderConfig", "/scim/v2/ResourceTypes", "/scim/v2/Schemas"]) {
    const result = await scim(issued.token, "GET", path);
    assert.equal(result.status, 200, `${path} should be served`);
    assert.ok((result.contentType ?? "").startsWith(SCIM_CONTENT_TYPE), `${path} content-type`);
  }
});

test("SCIM creates, reads, filters, and replaces a user inside one tenant", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "crud-idp");
  const created = await scim(issued.token, "POST", "/scim/v2/Users", {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: "ada@example.com",
    externalId: "idp-ada",
    name: { formatted: "Ada Lovelace" },
    emails: [{ value: "ada@example.com", primary: true }],
    active: true,
    roles: [{ value: "knowledge_owner" }],
  });
  assert.equal(created.status, 201);
  const id = String(created.body.id);
  assert.equal(created.body.userName, "ada@example.com");

  const read = await scim(issued.token, "GET", `/scim/v2/Users/${id}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.active, true);

  const filtered = await scim(
    issued.token,
    "GET",
    `/scim/v2/Users?filter=${encodeURIComponent('userName eq "ada@example.com"')}`,
  );
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.totalResults, 1);

  const replaced = await scim(issued.token, "PUT", `/scim/v2/Users/${id}`, {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: "ada@example.com",
    active: true,
    roles: [{ value: "viewer" }],
  });
  assert.equal(replaced.status, 200);
  const role = await db.query<{ role: string }>(
    `SELECT role FROM workspace_principals WHERE workspace_id = $1 AND principal_id = $2`,
    [enterpriseWorkspace, id],
  );
  assert.equal(role.rows[0].role, "viewer");

  // A neighbouring tenant's token can neither see nor fetch this user.
  const neighbourToken = await issueScimToken(db, neighbourWorkspace, "neighbour-idp");
  const crossRead = await scim(neighbourToken.token, "GET", `/scim/v2/Users/${id}`);
  assert.equal(crossRead.status, 404);
  const crossList = await scim(
    neighbourToken.token,
    "GET",
    `/scim/v2/Users?filter=${encodeURIComponent('userName eq "ada@example.com"')}`,
  );
  assert.equal(crossList.body.totalResults, 0);
});

test("SCIM deactivation revokes sessions without deleting audit history", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "deactivate-idp");
  const principalId = await seedPrincipal(enterpriseWorkspace, "developer", {
    external_id: "idp-deactivate",
    user_name: "leaver@example.com",
    email: "leaver@example.com",
  });
  // A real decision this person made, so there is history that must survive their deactivation.
  await recordAuditEvent(db, {
    workspace_id: enterpriseWorkspace,
    actor_type: "user",
    actor_id: principalId,
    action: "claim.review.accept",
    target_type: "claim",
    target_id: "claim-1",
    metadata: { reason: "verified against the repository" },
  });
  const session = await createSession(db, { workspace_id: enterpriseWorkspace, principal_id: principalId });
  assert.equal(await activeSessionCount(db, enterpriseWorkspace, principalId), 1);

  const patched = await scim(issued.token, "PATCH", `/scim/v2/Users/${principalId}`, {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    Operations: [{ op: "replace", path: "active", value: false }],
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.active, false);

  assert.equal(await activeSessionCount(db, enterpriseWorkspace, principalId), 0);
  // The revoked cookie stops working immediately, and a deactivated principal can never re-resolve.
  assert.equal(await resolveSession(db, session.token), null);
  const history = await forActor(db, enterpriseWorkspace, principalId);
  assert.ok(history.length > 0, "audit history must survive deactivation");
  assert.equal(history[0].action, "claim.review.accept");
  // The deactivation itself is audited against the person as the TARGET — the actor is the directory.
  const aboutThem = await forTarget(db, enterpriseWorkspace, "principal", principalId);
  assert.ok(aboutThem.some((event) => event.action === "scim.user.deactivate"));
});

test("SCIM DELETE deactivates rather than erasing the person's audit trail", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "delete-idp");
  const principalId = await seedPrincipal(enterpriseWorkspace, "developer", {
    external_id: "idp-deleted",
    user_name: "deleted@example.com",
  });
  await recordAuditEvent(db, {
    workspace_id: enterpriseWorkspace,
    actor_type: "user",
    actor_id: principalId,
    action: "claim.review.reject",
    target_type: "claim",
    target_id: "claim-2",
    metadata: { reason: "not reproducible" },
  });
  const removed = await scim(issued.token, "DELETE", `/scim/v2/Users/${principalId}`);
  assert.equal(removed.status, 204);
  const row = await db.query<{ active: boolean }>(
    `SELECT active FROM workspace_principals WHERE workspace_id = $1 AND principal_id = $2`,
    [enterpriseWorkspace, principalId],
  );
  assert.equal(row.rows[0].active, false);
  assert.ok((await forActor(db, enterpriseWorkspace, principalId)).length > 0);
});

test("SCIM Groups expose workspace roles with their members", async () => {
  const issued = await issueScimToken(db, enterpriseWorkspace, "groups-idp");
  const groups = await scim(issued.token, "GET", "/scim/v2/Groups");
  assert.equal(groups.status, 200);
  const resources = groups.body.Resources as Array<{ displayName: string }>;
  assert.ok(resources.some((group) => group.displayName === "developer"));
  const one = await scim(issued.token, "GET", "/scim/v2/Groups/developer");
  assert.equal(one.status, 200);
  assert.ok(Array.isArray((one.body as { members?: unknown[] }).members));
});

test("a direct SCIM handler call cannot be pointed at another tenant", async () => {
  const issued = await issueScimToken(db, neighbourWorkspace, "isolation-idp");
  const ctx = await authenticateScim(db, issued.token);
  assert.ok(ctx);
  const listed = await handleScimRequest(db, ctx, { method: "GET", path: "/scim/v2/Users", query: new URLSearchParams() });
  const resources = (listed.body as { Resources: Array<{ id: string }> }).Resources;
  const foreign = await db.query<{ principal_id: string }>(
    `SELECT principal_id FROM workspace_principals WHERE workspace_id = $1`,
    [enterpriseWorkspace],
  );
  const foreignIds = new Set(foreign.rows.map((row) => row.principal_id));
  assert.equal(resources.filter((entry) => foreignIds.has(entry.id)).length, 0);
});

// ---------------------------------------------------------------------------------------------
// retention
// ---------------------------------------------------------------------------------------------

test("retention policies default to a documented value per category", async () => {
  const policies = await loadRetentionPolicies(db, enterpriseWorkspace);
  assert.equal(policies.length, RETENTION_CATEGORIES.length);
  for (const policy of policies) {
    assert.equal(policy.retention_days, DEFAULT_RETENTION_DAYS[policy.category]);
    assert.equal(policy.source, "default");
  }
});

test("a retention policy below the category floor is refused", async () => {
  await assert.rejects(
    () =>
      setRetentionPolicy(db, {
        workspace_id: enterpriseWorkspace,
        category: "audit",
        retention_days: MINIMUM_RETENTION_DAYS.audit - 1,
        actor_id: "owner-1",
      }),
    (error: unknown) => error instanceof RetentionPolicyError && error.code === "below_minimum",
  );
});

test("retention deletes only rows past the cutoff, only in its own tenant", async () => {
  const workspaceId = randomUUID();
  const other = randomUUID();
  await seedWorkspace(workspaceId, `retention-${workspaceId.slice(0, 8)}`, "enterprise");
  await seedWorkspace(other, `retention-other-${other.slice(0, 8)}`, "enterprise");
  for (const tenant of [workspaceId, other]) {
    await db.query(
      `INSERT INTO workspace_evidence(workspace_id, repository_id, evidence_id, privacy_class, metadata_json, object_key, updated_at)
         VALUES($1, 'repo-main', 'old-evidence', 'metadata', '{}'::jsonb, 'obj/old', now() - interval '400 days'),
               ($1, 'repo-main', 'new-evidence', 'metadata', '{}'::jsonb, 'obj/new', now())`,
      [tenant],
    );
    await db.query(
      `INSERT INTO workspace_task_outcomes(workspace_id, repository_id, task_id, agent_surface, mode,
                                           measurement_quality, delivery_status, verification_outcome,
                                           actor_id, started_at)
         VALUES($1, 'repo-main', 'old-task', 'claude-code', 'assist', 'exact', 'delivered', 'verified', 'actor-1', now() - interval '400 days'),
               ($1, 'repo-main', 'new-task', 'claude-code', 'assist', 'exact', 'delivered', 'verified', 'actor-1', now())`,
      [tenant],
    );
    await db.query(
      `INSERT INTO audit_events(audit_id, workspace_id, actor_type, actor_id, action, target_type, target_id, metadata_json, occurred_at)
         VALUES(gen_random_uuid(), $1, 'user', 'actor-1', 'claim.review.accept', 'claim', 'c1', '{}'::jsonb, now() - interval '4000 days'),
               (gen_random_uuid(), $1, 'user', 'actor-1', 'claim.review.accept', 'claim', 'c2', '{}'::jsonb, now())`,
      [tenant],
    );
  }
  await setRetentionPolicy(db, {
    workspace_id: workspaceId,
    category: "evidence_metadata",
    retention_days: 30,
    actor_id: "owner-1",
  });
  await setRetentionPolicy(db, {
    workspace_id: workspaceId,
    category: "task_receipts",
    retention_days: 30,
    actor_id: "owner-1",
  });
  await setRetentionPolicy(db, {
    workspace_id: workspaceId,
    category: "audit",
    retention_days: MINIMUM_RETENTION_DAYS.audit,
    actor_id: "owner-1",
  });

  const run = await applyRetention(db, workspaceId);
  assert.equal(run.deleted.evidence_metadata, 1);
  assert.equal(run.deleted.task_receipts, 1);
  assert.equal(run.deleted.audit, 1);

  const kept = await db.query<{ evidence_id: string }>(
    `SELECT evidence_id FROM workspace_evidence WHERE workspace_id = $1`,
    [workspaceId],
  );
  assert.deepEqual(
    kept.rows.map((row) => row.evidence_id),
    ["new-evidence"],
  );
  // The neighbouring tenant is untouched: its old rows are still there.
  const neighbour = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM workspace_evidence WHERE workspace_id = $1`,
    [other],
  );
  assert.equal(neighbour.rows[0].count, "2");
  const neighbourAudit = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM audit_events WHERE workspace_id = $1`,
    [other],
  );
  assert.equal(neighbourAudit.rows[0].count, "2");

  const runs = await db.query<{ category: string; deleted_count: number }>(
    `SELECT category, deleted_count FROM workspace_retention_runs WHERE workspace_id = $1`,
    [workspaceId],
  );
  assert.ok(runs.rows.length >= 3);
});

test("an audit row still cannot be deleted or updated outside the retention purge", async () => {
  const auditId = await recordAuditEvent(db, {
    workspace_id: enterpriseWorkspace,
    actor_type: "user",
    actor_id: "tamper-target",
    action: "claim.review.accept",
    target_type: "claim",
    target_id: "claim-tamper",
    metadata: {},
  });
  await assert.rejects(
    () => db.query(`DELETE FROM audit_events WHERE audit_id = $1`, [auditId]),
    /append-only/,
  );
  await assert.rejects(
    () => db.query(`UPDATE audit_events SET action = 'tampered' WHERE audit_id = $1`, [auditId]),
    /append-only/,
  );
});

// ---------------------------------------------------------------------------------------------
// export and deletion
// ---------------------------------------------------------------------------------------------

class FakeObjectStore implements ObjectStore {
  readonly keys = new Set<string>();
  async deleteKeys(keys: readonly string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.keys.delete(key)) removed += 1;
    }
    return removed;
  }
}

async function seedDeletableWorkspace(): Promise<{ workspaceId: string; ownerId: string; store: FakeObjectStore }> {
  const workspaceId = randomUUID();
  await seedWorkspace(workspaceId, `deletable-${workspaceId.slice(0, 8)}`, "enterprise");
  const ownerId = await seedPrincipal(workspaceId, "owner", { user_name: "owner@example.com" });
  await db.query(
    `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state, impact_class, record_json, updated_at)
       VALUES($1, 'repo-main', 'claim-x', 'entity-x', 'verified', 'high', '{"statement":"a very distinctive claim body"}'::jsonb, now())`,
    [workspaceId],
  );
  const store = new FakeObjectStore();
  store.keys.add(`${workspaceId}/evidence/one`);
  store.keys.add(`${workspaceId}/evidence/two`);
  await db.query(
    `INSERT INTO workspace_evidence(workspace_id, repository_id, evidence_id, privacy_class, metadata_json, object_key, updated_at)
       VALUES($1, 'repo-main', 'e1', 'metadata', '{}'::jsonb, $2, now()),
             ($1, 'repo-main', 'e2', 'metadata', '{}'::jsonb, $3, now())`,
    [workspaceId, `${workspaceId}/evidence/one`, `${workspaceId}/evidence/two`],
  );
  await recordAuditEvent(db, {
    workspace_id: workspaceId,
    actor_type: "user",
    actor_id: ownerId,
    action: "claim.review.accept",
    target_type: "claim",
    target_id: "claim-x",
    metadata: {},
  });
  return { workspaceId, ownerId, store };
}

test("a workspace export is encrypted at rest and decrypts to that tenant's rows only", async () => {
  const { workspaceId } = await seedDeletableWorkspace();
  const result = await exportWorkspace(db, workspaceId, {
    directory: exportDir,
    encryption_key: EXPORT_KEY,
  });
  const bytes = readFileSync(result.export_path);
  assert.equal(bytes.length, result.byte_size);
  assert.ok(!bytes.includes("a very distinctive claim body"), "export must not be plaintext on disk");

  const opened = await readWorkspaceExport(result.export_path, EXPORT_KEY);
  assert.equal(opened.manifest.workspace_id, workspaceId);
  assert.equal(opened.manifest.schema_version, result.schema_version);
  const claims = opened.data.workspace_claims as Array<{ workspace_id: string }>;
  assert.equal(claims.length, 1);
  assert.ok(claims.every((row) => row.workspace_id === workspaceId));
  // Secrets are deliberately never exported.
  assert.equal(opened.data.workspace_sessions, undefined);
  assert.equal(opened.data.workspace_scim_tokens, undefined);

  await assert.rejects(() => readWorkspaceExport(result.export_path, randomBytes(32)), /decrypt/);
});

test("workspace deletion refuses a non-owner and a stale re-authentication", async () => {
  const { workspaceId, ownerId, store } = await seedDeletableWorkspace();
  const developerId = await seedPrincipal(workspaceId, "developer");
  await assert.rejects(
    () =>
      deleteWorkspace(db, workspaceId, {
        confirmed_by: developerId,
        reauthenticated_at: new Date().toISOString(),
        directory: exportDir,
        encryption_key: EXPORT_KEY,
        object_store: store,
      }),
    (error: unknown) => error instanceof WorkspaceDeletionError && error.code === "owner_required",
  );
  await assert.rejects(
    () =>
      deleteWorkspace(db, workspaceId, {
        confirmed_by: ownerId,
        reauthenticated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        directory: exportDir,
        encryption_key: EXPORT_KEY,
        object_store: store,
      }),
    (error: unknown) => error instanceof WorkspaceDeletionError && error.code === "reauthentication_required",
  );
  assert.equal(await workspaceExists(db, workspaceId), true);
});

test("workspace deletion exports then removes tenant data and object keys", async () => {
  const { workspaceId, ownerId, store } = await seedDeletableWorkspace();
  const neighbourBefore = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM workspace_claims WHERE workspace_id = $1`,
    [neighbourWorkspace],
  );
  const result = await deleteWorkspace(db, workspaceId, {
    confirmed_by: ownerId,
    reauthenticated_at: new Date().toISOString(),
    directory: exportDir,
    encryption_key: EXPORT_KEY,
    object_store: store,
  });
  assert.ok(result.export_path);
  assert.equal(await workspaceExists(db, workspaceId), false);
  assert.deepEqual(await objectKeysForWorkspace(db, workspaceId), []);
  assert.equal(store.keys.size, 0);

  // The export written before the delete still opens.
  const opened = await readWorkspaceExport(result.export_path, EXPORT_KEY);
  assert.equal(opened.manifest.workspace_id, workspaceId);

  // The terminal record survives OUTSIDE the deleted tenant partition.
  const terminal = await db.query<{ confirmed_by: string; export_sha256: string }>(
    `SELECT confirmed_by, export_sha256 FROM workspace_deletions WHERE workspace_id = $1`,
    [workspaceId],
  );
  assert.equal(terminal.rows.length, 1);
  assert.equal(terminal.rows[0].confirmed_by, ownerId);
  assert.equal(terminal.rows[0].export_sha256, result.export_sha256);

  // Nothing outside the tenant moved.
  const neighbourAfter = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM workspace_claims WHERE workspace_id = $1`,
    [neighbourWorkspace],
  );
  assert.equal(neighbourAfter.rows[0].count, neighbourBefore.rows[0].count);

  // Every tenant table is empty for the deleted workspace.
  for (const table of [
    "workspace_claims",
    "workspace_evidence",
    "workspace_principals",
    "workspace_sessions",
    "audit_events",
    "repositories",
    "workspace_subscriptions",
  ]) {
    const rows = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${table} WHERE workspace_id = $1`,
      [workspaceId],
    );
    assert.equal(rows.rows[0].count, "0", `${table} must be empty after deletion`);
  }
});

test("the workspace export route stays available even when a subscription has lapsed", async () => {
  const workspaceId = randomUUID();
  await seedWorkspace(workspaceId, `lapsed-${workspaceId.slice(0, 8)}`, "enterprise");
  await db.query(
    `UPDATE workspace_subscriptions SET status = 'canceled', current_period_end = now() - interval '1 day'
      WHERE workspace_id = $1`,
    [workspaceId],
  );
  const ownerId = await seedPrincipal(workspaceId, "owner");
  const session = await createSession(db, { workspace_id: workspaceId, principal_id: ownerId });
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/export`, {
    method: "POST",
    headers: {
      cookie: `kage_session=${session.token}`,
      "x-kage-csrf": session.csrf,
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { export_path?: string; sha256?: string };
  assert.ok(body.sha256, "an export must still be produced after an entitlement lapses");
});

test("retention policy routes are tenant-scoped and gated on policy authority", async () => {
  const ownerId = await seedPrincipal(enterpriseWorkspace, "owner");
  const viewerId = await seedPrincipal(enterpriseWorkspace, "viewer");
  const ownerSession = await createSession(db, {
    workspace_id: enterpriseWorkspace,
    principal_id: ownerId,
  });
  const viewerSession = await createSession(db, {
    workspace_id: enterpriseWorkspace,
    principal_id: viewerId,
  });
  const read = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${enterpriseWorkspace}/retention`,
    { headers: { cookie: `kage_session=${ownerSession.token}` } },
  );
  assert.equal(read.status, 200);
  const viewerRead = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${enterpriseWorkspace}/retention`,
    { headers: { cookie: `kage_session=${viewerSession.token}` } },
  );
  assert.equal(viewerRead.status, 403);
  const crossTenant = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${neighbourWorkspace}/retention`,
    { headers: { cookie: `kage_session=${ownerSession.token}` } },
  );
  assert.equal(crossTenant.status, 404);
});
