// Enterprise single sign-on: OIDC authorization-code login with PKCE.
//
// THREE THINGS THIS MODULE REFUSES TO DO, because each is a real way SSO integrations get broken into:
//
//   1. It never trusts an ID token's own claims to decide who signed it. The signature is verified
//      against the key set the CONFIGURED issuer publishes; a token signed by any other key is rejected
//      before a single claim is read as identity.
//   2. It never accepts a callback it did not start. `state` is minted server-side, stored, and consumed
//      in a single atomic statement, so a replayed or forged callback finds nothing. The `nonce` is
//      stored alongside and compared in constant time, which is what binds the returned token to THIS
//      login attempt rather than to a token the attacker obtained elsewhere.
//   3. It never lets a login decide its own privileges. The principal's role comes from the workspace's
//      own membership table (SCIM-provisioned, or explicitly JIT-provisioned at a configured default
//      role) — never from a claim in the token. An IdP can say who you are; it cannot say what you may do.
//
// It is also gated to the enterprise plan, and the gate reads the SERVER-resolved entitlement from the
// stored subscription — never a plan name from the request.
//
// WHAT IS NOT PROVEN WITHOUT A LIVE IdP. The suite signs real RS256 tokens with a real key and serves a
// real JWKS through the injected fetcher, so validation is exercised end to end. Vendor-specific
// behaviour (Okta/Entra/Google discovery quirks, key rotation cadence, claim naming) needs a real tenant
// and is recorded as an honest gap rather than asserted here.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "../db.js";
import type { WorkspaceRole } from "../auth/types.js";
import { createSession, type SessionCredentials } from "../auth/session.js";
import { resolveWorkspaceEntitlements } from "../billing/entitlements.js";
import { recordAuditEvent } from "../audit.js";

// `jose` is ESM-only and this package compiles to CommonJS, so it is loaded through a dynamic import
// (preserved as a real `import()` under `module: Node16`) rather than a static one.

/** The subset of `fetch` this module needs, so tests can inject a transport with no network. */
export type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Machine-readable failure reasons. Every rejection this module raises carries one. */
export type OidcErrorCode =
  | "sso_requires_enterprise_plan"
  | "oidc_not_configured"
  | "oidc_state_invalid"
  | "oidc_issuer_mismatch"
  | "oidc_audience_mismatch"
  | "oidc_nonce_mismatch"
  | "oidc_signature_invalid"
  | "oidc_token_expired"
  | "oidc_token_exchange_failed"
  | "oidc_email_domain_not_allowed"
  | "oidc_email_unverified"
  | "oidc_unknown_principal"
  | "oidc_principal_inactive";

export class OidcError extends Error {
  constructor(
    readonly code: OidcErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OidcError";
  }
}

/** A JSON Web Key Set, as published at the provider's `jwks_uri`. */
export interface JsonWebKeySet {
  keys: unknown[];
}

/**
 * The runtime OIDC configuration for one workspace. `client_secret` is a VALUE here but is never a
 * column: `loadOidcProvider` resolves it from the deployment environment via the stored
 * `client_secret_ref`, so a database dump carries no OAuth client credential.
 */
export interface OidcProviderConfig {
  workspace_id: string;
  issuer: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  /** Pre-fetched keys. When absent, the key set is fetched from `jwks_uri` with the injected fetcher. */
  jwks?: JsonWebKeySet;
  /** Empty means unrestricted — an explicit choice, not a silent default. */
  allowed_email_domains: string[];
  default_role: WorkspaceRole;
  allow_jit_provisioning: boolean;
}

/** What is persisted for a provider. Note the absence of a secret VALUE — only its reference. */
export interface StoredOidcProvider {
  workspace_id: string;
  issuer: string;
  client_id: string;
  client_secret_ref: string;
  redirect_uri: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  allowed_email_domains: string[];
  default_role: WorkspaceRole;
  allow_jit_provisioning: boolean;
}

/** How long an in-flight login may sit before its state expires. Short: a login is a seconds-long act. */
export const LOGIN_REQUEST_TTL_MS = 10 * 60 * 1000;

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function constantTimeEquals(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------------------------
// configuration
// ---------------------------------------------------------------------------------------------

/**
 * Fetch and validate an OIDC discovery document.
 *
 * The one check that matters: the document's own `issuer` MUST equal the issuer we asked about. A
 * discovery document that names a different issuer is either a misconfiguration or a redirect into
 * somebody else's IdP, and either way it must not be used to derive endpoints we will trust tokens from.
 */
export async function discoverOidc(
  issuer: string,
  fetcher: Fetcher,
): Promise<{
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}> {
  const base = issuer.replace(/\/$/, "");
  const response = await fetcher(`${base}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new OidcError("oidc_not_configured", `oidc discovery failed with status ${response.status}`);
  }
  const body = (await response.json()) as Record<string, unknown>;
  if (typeof body.issuer !== "string" || body.issuer.replace(/\/$/, "") !== base) {
    throw new OidcError(
      "oidc_issuer_mismatch",
      `discovery document issuer ${String(body.issuer)} does not match ${issuer}`,
    );
  }
  for (const field of ["authorization_endpoint", "token_endpoint", "jwks_uri"]) {
    if (typeof body[field] !== "string") {
      throw new OidcError("oidc_not_configured", `discovery document is missing ${field}`);
    }
  }
  return {
    issuer: body.issuer,
    authorization_endpoint: body.authorization_endpoint as string,
    token_endpoint: body.token_endpoint as string,
    jwks_uri: body.jwks_uri as string,
  };
}

/** Upsert a workspace's provider configuration. Tenant-scoped by primary key. */
export async function storeOidcProvider(db: Db, provider: StoredOidcProvider): Promise<void> {
  await db.query(
    `INSERT INTO workspace_oidc_providers(workspace_id, issuer, client_id, client_secret_ref, redirect_uri,
                                          authorization_endpoint, token_endpoint, jwks_uri,
                                          allowed_email_domains, default_role, allow_jit_provisioning)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (workspace_id) DO UPDATE SET
       issuer = EXCLUDED.issuer,
       client_id = EXCLUDED.client_id,
       client_secret_ref = EXCLUDED.client_secret_ref,
       redirect_uri = EXCLUDED.redirect_uri,
       authorization_endpoint = EXCLUDED.authorization_endpoint,
       token_endpoint = EXCLUDED.token_endpoint,
       jwks_uri = EXCLUDED.jwks_uri,
       allowed_email_domains = EXCLUDED.allowed_email_domains,
       default_role = EXCLUDED.default_role,
       allow_jit_provisioning = EXCLUDED.allow_jit_provisioning,
       updated_at = now()`,
    [
      provider.workspace_id,
      provider.issuer,
      provider.client_id,
      provider.client_secret_ref,
      provider.redirect_uri,
      provider.authorization_endpoint,
      provider.token_endpoint,
      provider.jwks_uri,
      provider.allowed_email_domains,
      provider.default_role,
      provider.allow_jit_provisioning,
    ],
  );
}

/**
 * Load a workspace's provider, resolving the client secret from the deployment environment. Returns
 * null when the tenant has no provider — including when the caller asks about somebody else's tenant,
 * because the query is scoped by workspace_id and nothing else.
 */
export async function loadOidcProvider(
  db: Db,
  workspaceId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OidcProviderConfig | null> {
  const { rows } = await db.query<{
    issuer: string;
    client_id: string;
    client_secret_ref: string;
    redirect_uri: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
    allowed_email_domains: string[];
    default_role: WorkspaceRole;
    allow_jit_provisioning: boolean;
  }>(
    `SELECT issuer, client_id, client_secret_ref, redirect_uri, authorization_endpoint, token_endpoint,
            jwks_uri, allowed_email_domains, default_role, allow_jit_provisioning
       FROM workspace_oidc_providers
      WHERE workspace_id = $1`,
    [workspaceId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    workspace_id: workspaceId,
    issuer: row.issuer,
    client_id: row.client_id,
    // An unset deployment secret resolves to an empty string rather than to `undefined`, so a
    // misconfiguration fails at the token exchange with a provider error instead of sending "undefined".
    client_secret: env[row.client_secret_ref] ?? "",
    redirect_uri: row.redirect_uri,
    authorization_endpoint: row.authorization_endpoint,
    token_endpoint: row.token_endpoint,
    jwks_uri: row.jwks_uri,
    allowed_email_domains: row.allowed_email_domains ?? [],
    default_role: row.default_role,
    allow_jit_provisioning: row.allow_jit_provisioning,
  };
}

// ---------------------------------------------------------------------------------------------
// the login flow
// ---------------------------------------------------------------------------------------------

export interface StartedLogin {
  authorization_url: string;
  state: string;
  /** Returned to the SERVER-side caller only. It is a request parameter, never a browser-held secret. */
  nonce: string;
  expires_at: string;
}

/**
 * Begin an authorization-code login with PKCE. The verifier stays in the database; only its S256
 * challenge goes on the wire, so an attacker who intercepts the authorization code still cannot
 * exchange it.
 */
export async function beginOidcLogin(
  db: Db,
  provider: OidcProviderConfig,
  options: { ttlMs?: number; scope?: string } = {},
): Promise<StartedLogin> {
  const state = base64url(randomBytes(32));
  const nonce = base64url(randomBytes(32));
  const codeVerifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(codeVerifier).digest());
  const expiresAt = new Date(Date.now() + (options.ttlMs ?? LOGIN_REQUEST_TTL_MS));
  await db.query(
    `INSERT INTO oidc_login_requests(state, workspace_id, nonce, code_verifier, redirect_uri, expires_at)
       VALUES($1, $2, $3, $4, $5, $6)`,
    [state, provider.workspace_id, nonce, codeVerifier, provider.redirect_uri, expiresAt.toISOString()],
  );
  const url = new URL(provider.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", provider.client_id);
  url.searchParams.set("redirect_uri", provider.redirect_uri);
  url.searchParams.set("scope", options.scope ?? "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { authorization_url: url.toString(), state, nonce, expires_at: expiresAt.toISOString() };
}

interface ConsumedLogin {
  workspace_id: string;
  nonce: string;
  code_verifier: string;
  redirect_uri: string;
}

/**
 * Consume a login request ATOMICALLY. The UPDATE ... RETURNING both marks the row used and hands back
 * its secrets in one statement, so two concurrent callbacks cannot both succeed: the second sees
 * `consumed_at IS NOT NULL` and matches nothing.
 */
async function consumeLoginRequest(db: Db, state: string, workspaceId: string): Promise<ConsumedLogin> {
  const { rows } = await db.query<ConsumedLogin>(
    `UPDATE oidc_login_requests
        SET consumed_at = now()
      WHERE state = $1
        AND workspace_id = $2
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING workspace_id, nonce, code_verifier, redirect_uri`,
    [state, workspaceId],
  );
  const row = rows[0];
  if (!row) {
    throw new OidcError("oidc_state_invalid", "unknown, expired, or already-used login state");
  }
  return row;
}

/** Exchange the authorization code for tokens, sending the PKCE verifier that proves we started this. */
async function exchangeCode(
  provider: OidcProviderConfig,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  fetcher: Fetcher,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: provider.client_id,
    client_secret: provider.client_secret,
    code_verifier: codeVerifier,
  });
  const response = await fetcher(provider.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new OidcError("oidc_token_exchange_failed", `token endpoint returned ${response.status}`);
  }
  const parsed = (await response.json()) as { id_token?: unknown };
  if (typeof parsed.id_token !== "string") {
    throw new OidcError("oidc_token_exchange_failed", "token response carried no id_token");
  }
  return parsed.id_token;
}

export interface VerifiedIdToken {
  subject: string;
  email: string | null;
  email_verified: boolean;
  claims: Record<string, unknown>;
}

/**
 * Verify an ID token's SIGNATURE first, then its claims explicitly.
 *
 * The claim checks are deliberately done here rather than through jose's `issuer`/`audience` options:
 * jose reports every claim failure as one generic "claim validation failed", and an operator debugging
 * a broken SSO rollout needs to know WHICH check failed — audience, issuer, or nonce are three very
 * different misconfigurations. The checks themselves are identical; only the reporting differs.
 */
export async function verifyIdToken(
  idToken: string,
  provider: OidcProviderConfig,
  expected: { nonce: string; fetcher?: Fetcher; nowMs?: number },
): Promise<VerifiedIdToken> {
  const jose = await import("jose");
  const keys = await keySetFor(provider, expected.fetcher);
  let claims: Record<string, unknown>;
  try {
    const verified = await jose.jwtVerify(idToken, jose.createLocalJWKSet(keys as never), {
      currentDate: expected.nowMs === undefined ? undefined : new Date(expected.nowMs),
    });
    claims = verified.payload as Record<string, unknown>;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ERR_JWT_EXPIRED") {
      throw new OidcError("oidc_token_expired", "id token has expired");
    }
    throw new OidcError(
      "oidc_signature_invalid",
      `id token signature could not be verified: ${(error as Error).message}`,
    );
  }

  const issuer = String(claims.iss ?? "");
  if (issuer.replace(/\/$/, "") !== provider.issuer.replace(/\/$/, "")) {
    throw new OidcError("oidc_issuer_mismatch", `id token issuer ${issuer} is not the configured issuer`);
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud ?? "")];
  if (!audiences.includes(provider.client_id)) {
    throw new OidcError("oidc_audience_mismatch", "id token audience is not this client");
  }

  const nonce = typeof claims.nonce === "string" ? claims.nonce : "";
  if (!constantTimeEquals(expected.nonce, nonce)) {
    throw new OidcError("oidc_nonce_mismatch", "id token nonce does not match the login request");
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  return {
    subject: String(claims.sub ?? ""),
    email,
    email_verified: claims.email_verified === true,
    claims,
  };
}

/** Build a verification key set: the configured static keys, or the ones the issuer publishes now. */
async function keySetFor(provider: OidcProviderConfig, fetcher?: Fetcher): Promise<JsonWebKeySet> {
  if (provider.jwks) return provider.jwks;
  if (!fetcher) throw new OidcError("oidc_not_configured", "no jwks and no fetcher to retrieve one");
  const response = await fetcher(provider.jwks_uri, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new OidcError("oidc_not_configured", `jwks endpoint returned ${response.status}`);
  }
  const body = (await response.json()) as JsonWebKeySet;
  if (!body || !Array.isArray(body.keys)) {
    throw new OidcError("oidc_not_configured", "jwks endpoint returned no keys");
  }
  return body;
}

export interface CompletedLogin {
  session: SessionCredentials;
  principal_id: string;
  workspace_id: string;
  subject: string;
  email: string | null;
  provisioned: boolean;
}

/**
 * Complete a login: entitlement gate, state consumption, code exchange, token verification, identity
 * mapping, session issue. The order is deliberate — the enterprise gate and the state check both run
 * BEFORE any network call, so an unentitled or forged callback costs nothing and reveals nothing.
 */
export async function completeOidcLogin(
  db: Db,
  provider: OidcProviderConfig,
  input: { state: string; code: string; fetcher: Fetcher; nowMs?: number; sessionTtlMs?: number },
): Promise<CompletedLogin> {
  const entitlements = await resolveWorkspaceEntitlements(db, provider.workspace_id);
  if (!entitlements.sso) {
    throw new OidcError(
      "sso_requires_enterprise_plan",
      `single sign-on requires the enterprise plan (this workspace is on ${entitlements.plan_id})`,
    );
  }

  const login = await consumeLoginRequest(db, input.state, provider.workspace_id);
  const idToken = await exchangeCode(
    provider,
    input.code,
    login.code_verifier,
    login.redirect_uri,
    input.fetcher,
  );
  const verified = await verifyIdToken(idToken, provider, {
    nonce: login.nonce,
    fetcher: input.fetcher,
    nowMs: input.nowMs,
  });

  if (provider.allowed_email_domains.length > 0) {
    const domain = (verified.email ?? "").split("@")[1]?.toLowerCase() ?? "";
    if (!provider.allowed_email_domains.some((allowed) => allowed.toLowerCase() === domain)) {
      throw new OidcError(
        "oidc_email_domain_not_allowed",
        `email domain ${domain || "(none)"} is not in this workspace's allowed domain list`,
      );
    }
    // A domain restriction is meaningless if the IdP never verified the address it is derived from.
    if (!verified.email_verified) {
      throw new OidcError("oidc_email_unverified", "the identity provider did not verify this email");
    }
  }

  const mapped = await mapSubjectToPrincipal(db, provider, verified);
  const session = await createSession(db, {
    workspace_id: provider.workspace_id,
    principal_id: mapped.principal_id,
    ttlMs: input.sessionTtlMs,
  });
  return {
    session,
    principal_id: mapped.principal_id,
    workspace_id: provider.workspace_id,
    subject: verified.subject,
    email: verified.email,
    provisioned: mapped.provisioned,
  };
}

/**
 * Resolve the IdP subject to a workspace principal.
 *
 * The role NEVER comes from the token. An existing member keeps the role the workspace gave them; a
 * new subject is either refused (the default) or created at the configured `default_role` — which an
 * administrator chose, not the IdP.
 */
async function mapSubjectToPrincipal(
  db: Db,
  provider: OidcProviderConfig,
  verified: VerifiedIdToken,
): Promise<{ principal_id: string; provisioned: boolean }> {
  const existing = await db.query<{ principal_id: string; active: boolean }>(
    `SELECT principal_id, active FROM workspace_principals
      WHERE workspace_id = $1 AND external_id = $2`,
    [provider.workspace_id, verified.subject],
  );
  if (existing.rows[0]) {
    if (!existing.rows[0].active) {
      throw new OidcError("oidc_principal_inactive", "this identity has been deprovisioned");
    }
    return { principal_id: existing.rows[0].principal_id, provisioned: false };
  }

  // Fall back to an email match so a member provisioned before SSO was enabled is adopted rather than
  // duplicated. The adoption writes the external id, so it happens at most once.
  if (verified.email) {
    const byEmail = await db.query<{ principal_id: string; active: boolean }>(
      `UPDATE workspace_principals SET external_id = $3
        WHERE workspace_id = $1 AND lower(user_name) = lower($2) AND external_id IS NULL
        RETURNING principal_id, active`,
      [provider.workspace_id, verified.email, verified.subject],
    );
    if (byEmail.rows[0]) {
      if (!byEmail.rows[0].active) {
        throw new OidcError("oidc_principal_inactive", "this identity has been deprovisioned");
      }
      return { principal_id: byEmail.rows[0].principal_id, provisioned: false };
    }
  }

  if (!provider.allow_jit_provisioning) {
    throw new OidcError(
      "oidc_unknown_principal",
      "no workspace member matches this identity and just-in-time provisioning is disabled",
    );
  }

  const principalId = verified.subject;
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids,
                                      external_id, user_name, email)
       VALUES($1, $2, 'user', $3, NULL, $4, $5, $5)`,
    [provider.workspace_id, principalId, provider.default_role, verified.subject, verified.email],
  );
  await recordAuditEvent(db, {
    workspace_id: provider.workspace_id,
    actor_type: "oidc",
    actor_id: provider.issuer,
    action: "oidc.principal.provision",
    target_type: "principal",
    target_id: principalId,
    metadata: { reason: `just-in-time provisioned at role ${provider.default_role}` },
  });
  return { principal_id: principalId, provisioned: true };
}
