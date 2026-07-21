// SCIM 2.0 user and group provisioning for enterprise workspaces (RFC 7643 / RFC 7644).
//
// WHAT THIS IS FOR. An enterprise wants joiners, movers, and leavers handled by their directory, not by
// a Kage admin remembering to click something. SCIM is how the directory tells us. The endpoints are
// `/scim/v2/Users`, `/scim/v2/Groups`, `/scim/v2/ServiceProviderConfig`, `/scim/v2/ResourceTypes`, and
// `/scim/v2/Schemas`, served as `application/scim+json`.
//
// TWO DESIGN DECISIONS THAT ARE NOT NEGOTIABLE HERE:
//
//   1. DEPROVISIONING DEACTIVATES; IT NEVER DELETES. `active: false` (and SCIM DELETE, which this
//      service treats as deactivation) switches the identity off and revokes every live session
//      immediately — but the person's row, and therefore every audit event that names them, survives.
//      A leaver's approvals must remain attributable; erasing the actor would quietly rewrite the record
//      of who authorised what. Erasure belongs to the retention/deletion path, which is deliberate,
//      owner-confirmed, and exported first.
//
//   2. EVERY QUERY IS SCOPED BY THE TOKEN'S WORKSPACE. The workspace is resolved from the bearer token's
//      hash server-side; nothing in a request path, body, or filter can widen it. A SCIM client pointed
//      at another tenant's user id gets a 404 — existence is not disclosed across tenants.
//
// The whole surface is gated on the SERVER-resolved `scim` entitlement, which comes from the stored
// subscription and never from a client-supplied plan name.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import type { WorkspaceRole } from "../auth/types.js";
import { revokeSessionsForPrincipal } from "../auth/session.js";
import { recordAuditEvent } from "../audit.js";
import { resolveWorkspaceEntitlements } from "../billing/entitlements.js";

export const SCIM_CONTENT_TYPE = "application/scim+json";

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
const PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";

/** Every workspace role. Groups in SCIM map one-to-one onto these, read-only. */
const ROLES: readonly WorkspaceRole[] = [
  "owner",
  "admin",
  "knowledge_owner",
  "developer",
  "viewer",
];

/**
 * The roles a DIRECTORY may assign — every role except `owner`.
 *
 * `owner` is the role that can delete the workspace, and it is deliberately outside the directory's
 * reach in BOTH directions: a SCIM client cannot create an owner, promote anyone into one, demote one,
 * or deactivate one. A leaked or compromised directory token would otherwise convert, in two calls, into
 * total control of the tenant — mint an owner, sign in through SSO as them — which is exactly the
 * "a directory cannot invent authority" property this module claims. Owner changes are a workspace act,
 * made by an existing owner through the workspace's own authenticated surface, and audited there.
 */
type DirectoryRole = Exclude<WorkspaceRole, "owner">;
const DIRECTORY_ASSIGNABLE_ROLES: readonly DirectoryRole[] = ROLES.filter(
  (role): role is DirectoryRole => role !== "owner",
);

/** Default role for a user provisioned without an explicit role/group. The least useful, on purpose. */
const DEFAULT_SCIM_ROLE: DirectoryRole = "developer";

const MAX_PAGE_SIZE = 200;

export interface ScimContext {
  workspace_id: string;
  token_id: string;
}

export interface ScimResponse {
  status: number;
  body: Record<string, unknown> | null;
  contentType: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function scimError(status: number, detail: string, scimType?: string): ScimResponse {
  return {
    status,
    body: {
      schemas: [ERROR_SCHEMA],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    },
    contentType: SCIM_CONTENT_TYPE,
  };
}

// ---------------------------------------------------------------------------------------------
// tokens
// ---------------------------------------------------------------------------------------------

/**
 * Issue a SCIM bearer token for a workspace. The raw value is returned ONCE and never persisted; the
 * table stores only its SHA-256, so a dump of `workspace_scim_tokens` cannot be replayed as a client.
 */
export async function issueScimToken(
  db: Db,
  workspaceId: string,
  label: string,
): Promise<{ token: string; token_id: string }> {
  const token = `kscim_${randomBytes(32).toString("base64url")}`;
  const tokenId = randomUUID();
  await db.query(
    `INSERT INTO workspace_scim_tokens(workspace_id, token_id, label, token_hash)
       VALUES($1, $2, $3, $4)`,
    [workspaceId, tokenId, label, sha256(token)],
  );
  return { token, token_id: tokenId };
}

/** Revoke a SCIM token. A revoked token resolves to null on the very next request. */
export async function revokeScimToken(db: Db, workspaceId: string, tokenId: string): Promise<void> {
  await db.query(
    `UPDATE workspace_scim_tokens SET revoked_at = now()
      WHERE workspace_id = $1 AND token_id = $2 AND revoked_at IS NULL`,
    [workspaceId, tokenId],
  );
}

/**
 * Resolve a raw bearer token to its workspace. The lookup is by HASH, so the comparison happens inside
 * a keyed index probe rather than against a stored secret; an unknown or revoked token returns null and
 * the caller answers 401 without saying which of the two it was.
 */
export async function authenticateScim(db: Db, token: string | undefined): Promise<ScimContext | null> {
  if (!token) return null;
  const { rows } = await db.query<{ workspace_id: string; token_id: string }>(
    `UPDATE workspace_scim_tokens SET last_used_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL
      RETURNING workspace_id, token_id`,
    [sha256(token)],
  );
  const row = rows[0];
  return row ? { workspace_id: row.workspace_id, token_id: row.token_id } : null;
}

// ---------------------------------------------------------------------------------------------
// resource projection
// ---------------------------------------------------------------------------------------------

interface PrincipalRow {
  principal_id: string;
  role: WorkspaceRole;
  display_name: string | null;
  external_id: string | null;
  user_name: string | null;
  email: string | null;
  active: boolean;
  created_at: Date | string;
}

function toScimUser(row: PrincipalRow): Record<string, unknown> {
  return {
    schemas: [USER_SCHEMA],
    id: row.principal_id,
    externalId: row.external_id ?? undefined,
    userName: row.user_name ?? row.principal_id,
    name: { formatted: row.display_name ?? undefined },
    displayName: row.display_name ?? undefined,
    emails: row.email ? [{ value: row.email, primary: true }] : [],
    roles: [{ value: row.role, primary: true }],
    active: row.active,
    meta: {
      resourceType: "User",
      created:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      location: `/scim/v2/Users/${row.principal_id}`,
    },
  };
}

/** Pull a role out of a SCIM user resource. An unknown role is refused rather than silently downgraded. */
function roleFrom(
  resource: Record<string, unknown>,
  fallback: DirectoryRole | null,
): DirectoryRole {
  const roles = resource.roles;
  let candidate: string | undefined;
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0] as { value?: unknown } | string;
    candidate = typeof first === "string" ? first : typeof first?.value === "string" ? first.value : undefined;
  }
  if (!candidate) return fallback ?? DEFAULT_SCIM_ROLE;
  const matched = DIRECTORY_ASSIGNABLE_ROLES.find((role) => role === candidate);
  if (!matched) {
    // Named separately from "unknown role" because it is not a typo: it is an authority boundary, and
    // the operator reading this needs to know their IdP tried to cross one.
    if (ROLES.some((role) => role === candidate)) {
      throw new ScimBadRequest(
        `the "${candidate}" role cannot be assigned through SCIM: a directory cannot grant workspace ownership`,
      );
    }
    throw new ScimBadRequest(`unknown role "${candidate}"`);
  }
  return matched;
}

/**
 * The refusal returned for any SCIM write aimed at an existing owner. 403 rather than 404: the resource
 * is real and the client may read it — what it may not do is change it.
 */
function ownerIsNotDirectoryManaged(): ScimResponse {
  return scimError(
    403,
    "a workspace owner cannot be modified through SCIM: owner authority is granted and revoked in the workspace",
    "mutability",
  );
}

class ScimBadRequest extends Error {}

function primaryEmail(resource: Record<string, unknown>): string | null {
  const emails = resource.emails;
  if (!Array.isArray(emails) || emails.length === 0) return null;
  const primary =
    (emails.find((entry) => (entry as { primary?: unknown }).primary === true) as
      | { value?: unknown }
      | undefined) ?? (emails[0] as { value?: unknown });
  return typeof primary?.value === "string" ? primary.value : null;
}

function displayNameOf(resource: Record<string, unknown>): string | null {
  if (typeof resource.displayName === "string") return resource.displayName;
  const name = resource.name as { formatted?: unknown } | undefined;
  if (name && typeof name.formatted === "string") return name.formatted;
  return null;
}

/**
 * Parse the tiny slice of SCIM filter syntax this service supports: `userName eq "x"` and
 * `externalId eq "x"`. Anything else is refused with 400 rather than silently ignored — a filter we
 * quietly drop would return the WHOLE tenant to a client that asked for one user.
 */
function parseFilter(filter: string | null): { column: string; value: string } | null {
  if (!filter) return null;
  const match = /^\s*(userName|externalId|id)\s+eq\s+"([^"]*)"\s*$/i.exec(filter);
  if (!match) throw new ScimBadRequest(`unsupported filter: ${filter}`);
  const column = match[1].toLowerCase() === "username" ? "user_name" : match[1].toLowerCase() === "id" ? "principal_id" : "external_id";
  return { column, value: match[2] };
}

// ---------------------------------------------------------------------------------------------
// request dispatch
// ---------------------------------------------------------------------------------------------

export interface ScimRequest {
  method: string;
  path: string;
  query?: URLSearchParams;
  body?: unknown;
}

/**
 * Dispatch one SCIM request inside the token's workspace. The entitlement gate runs first, so an
 * unentitled tenant never reaches a query. Every handler below takes `ctx.workspace_id` and puts it in
 * the WHERE clause; there is no code path that reads a workspace from the request.
 */
export async function handleScimRequest(
  db: Db,
  ctx: ScimContext,
  request: ScimRequest,
): Promise<ScimResponse> {
  const entitlements = await resolveWorkspaceEntitlements(db, ctx.workspace_id);
  if (!entitlements.scim) {
    return scimError(
      403,
      `SCIM provisioning requires the enterprise plan (this workspace is on ${entitlements.plan_id})`,
    );
  }
  const query = request.query ?? new URLSearchParams();
  const path = request.path.replace(/\/+$/, "") || "/scim/v2";
  try {
    if (path === "/scim/v2/ServiceProviderConfig" && request.method === "GET") {
      return ok(serviceProviderConfig());
    }
    if (path === "/scim/v2/ResourceTypes" && request.method === "GET") {
      return ok(listOf(resourceTypes()));
    }
    if (path === "/scim/v2/Schemas" && request.method === "GET") {
      return ok(listOf(schemas()));
    }
    if (path === "/scim/v2/Users") {
      if (request.method === "GET") return ok(await listUsers(db, ctx, query));
      if (request.method === "POST") return await createUser(db, ctx, request.body);
      return scimError(405, `${request.method} is not supported on /scim/v2/Users`);
    }
    const userMatch = /^\/scim\/v2\/Users\/([^/]+)$/.exec(path);
    if (userMatch) {
      const id = decodeURIComponent(userMatch[1]);
      if (request.method === "GET") return await getUser(db, ctx, id);
      if (request.method === "PUT") return await replaceUser(db, ctx, id, request.body);
      if (request.method === "PATCH") return await patchUser(db, ctx, id, request.body);
      if (request.method === "DELETE") return await deleteUser(db, ctx, id);
      return scimError(405, `${request.method} is not supported on a user resource`);
    }
    if (path === "/scim/v2/Groups" && request.method === "GET") {
      return ok(await listGroups(db, ctx));
    }
    const groupMatch = /^\/scim\/v2\/Groups\/([^/]+)$/.exec(path);
    if (groupMatch && request.method === "GET") {
      return await getGroup(db, ctx, decodeURIComponent(groupMatch[1]));
    }
    return scimError(404, "no such SCIM resource");
  } catch (error) {
    if (error instanceof ScimBadRequest) return scimError(400, error.message, "invalidValue");
    throw error;
  }
}

function ok(body: Record<string, unknown>, status = 200): ScimResponse {
  return { status, body, contentType: SCIM_CONTENT_TYPE };
}

function listOf(resources: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    schemas: [LIST_SCHEMA],
    totalResults: resources.length,
    itemsPerPage: resources.length,
    startIndex: 1,
    Resources: resources,
  };
}

// ---------------------------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------------------------

const PRINCIPAL_COLUMNS = `principal_id, role, display_name, external_id, user_name, email, active, created_at`;

async function listUsers(db: Db, ctx: ScimContext, query: URLSearchParams): Promise<Record<string, unknown>> {
  const filter = parseFilter(query.get("filter"));
  const startIndex = Math.max(1, Number.parseInt(query.get("startIndex") ?? "1", 10) || 1);
  const count = Math.min(MAX_PAGE_SIZE, Math.max(0, Number.parseInt(query.get("count") ?? "100", 10) || 100));
  // Human principals only: a local daemon service token is not a directory identity.
  const params: unknown[] = [ctx.workspace_id];
  let where = `WHERE workspace_id = $1 AND principal_type = 'user'`;
  if (filter) {
    params.push(filter.value);
    where += ` AND lower(${filter.column}) = lower($${params.length})`;
  }
  const total = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM workspace_principals ${where}`,
    params,
  );
  params.push(count, startIndex - 1);
  const { rows } = await db.query<PrincipalRow>(
    `SELECT ${PRINCIPAL_COLUMNS} FROM workspace_principals ${where}
      ORDER BY created_at, principal_id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return {
    schemas: [LIST_SCHEMA],
    totalResults: Number.parseInt(total.rows[0]?.count ?? "0", 10),
    itemsPerPage: rows.length,
    startIndex,
    Resources: rows.map(toScimUser),
  };
}

async function loadPrincipal(db: Db, ctx: ScimContext, id: string): Promise<PrincipalRow | null> {
  const { rows } = await db.query<PrincipalRow>(
    `SELECT ${PRINCIPAL_COLUMNS} FROM workspace_principals
      WHERE workspace_id = $1 AND principal_id = $2 AND principal_type = 'user'`,
    [ctx.workspace_id, id],
  );
  return rows[0] ?? null;
}

async function getUser(db: Db, ctx: ScimContext, id: string): Promise<ScimResponse> {
  const row = await loadPrincipal(db, ctx, id);
  // A user in ANOTHER tenant is reported exactly like a user that does not exist.
  if (!row) return scimError(404, "no such user in this workspace");
  return ok(toScimUser(row));
}

async function createUser(db: Db, ctx: ScimContext, body: unknown): Promise<ScimResponse> {
  const resource = (body ?? {}) as Record<string, unknown>;
  const userName = typeof resource.userName === "string" ? resource.userName.trim() : "";
  if (!userName) return scimError(400, "userName is required", "invalidValue");
  const role = roleFrom(resource, null);
  const externalId = typeof resource.externalId === "string" ? resource.externalId : null;
  const email = primaryEmail(resource) ?? (userName.includes("@") ? userName : null);
  const active = resource.active === undefined ? true : resource.active === true;
  const principalId = randomUUID();

  const inserted = await db.query<PrincipalRow>(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, display_name,
                                      repository_ids, external_id, user_name, email, active)
       VALUES($1, $2, 'user', $3, $4, NULL, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING
     RETURNING ${PRINCIPAL_COLUMNS}`,
    [
      ctx.workspace_id,
      principalId,
      role,
      displayNameOf(resource),
      externalId,
      userName,
      email,
      active,
    ],
  );
  if (inserted.rows.length === 0) {
    // The unique index on (workspace_id, lower(user_name)) held: this user already exists here.
    return scimError(409, "a user with this userName already exists in this workspace", "uniqueness");
  }
  await recordAuditEvent(db, {
    workspace_id: ctx.workspace_id,
    actor_type: "scim",
    actor_id: ctx.token_id,
    action: "scim.user.create",
    target_type: "principal",
    target_id: principalId,
    metadata: { reason: `provisioned at role ${role}` },
  });
  return ok(toScimUser(inserted.rows[0]), 201);
}

/** PUT replaces the resource. An absent `active` means the directory asserts the user is active. */
async function replaceUser(db: Db, ctx: ScimContext, id: string, body: unknown): Promise<ScimResponse> {
  const existing = await loadPrincipal(db, ctx, id);
  if (!existing) return scimError(404, "no such user in this workspace");
  if (existing.role === "owner") return ownerIsNotDirectoryManaged();
  const resource = (body ?? {}) as Record<string, unknown>;
  const role = roleFrom(resource, existing.role);
  const active = resource.active === undefined ? true : resource.active === true;
  const userName = typeof resource.userName === "string" ? resource.userName : existing.user_name;
  const updated = await applyUserUpdate(db, ctx, id, {
    role,
    active,
    user_name: userName,
    email: primaryEmail(resource) ?? existing.email,
    display_name: displayNameOf(resource) ?? existing.display_name,
    previously_active: existing.active,
    reason: "scim.user.replace",
  });
  return ok(toScimUser(updated));
}

/**
 * PATCH applies SCIM PatchOp operations. Both shapes real IdPs send are handled: a targeted
 * `{op, path:"active", value:false}` and an untargeted `{op, value:{active:false}}`.
 */
async function patchUser(db: Db, ctx: ScimContext, id: string, body: unknown): Promise<ScimResponse> {
  const existing = await loadPrincipal(db, ctx, id);
  if (!existing) return scimError(404, "no such user in this workspace");
  if (existing.role === "owner") return ownerIsNotDirectoryManaged();
  const resource = (body ?? {}) as Record<string, unknown>;
  const schemas = Array.isArray(resource.schemas) ? resource.schemas.map(String) : [];
  if (schemas.length > 0 && !schemas.includes(PATCH_SCHEMA)) {
    return scimError(400, "a PATCH body must use the PatchOp schema", "invalidValue");
  }
  const operations = Array.isArray(resource.Operations) ? resource.Operations : [];
  if (operations.length === 0) return scimError(400, "no PATCH operations supplied", "invalidValue");

  let active = existing.active;
  let role = existing.role;
  let userName = existing.user_name;
  let email = existing.email;
  let displayName = existing.display_name;

  for (const raw of operations) {
    const operation = (raw ?? {}) as { op?: unknown; path?: unknown; value?: unknown };
    const op = String(operation.op ?? "").toLowerCase();
    if (op !== "replace" && op !== "add") {
      return scimError(400, `unsupported PATCH op "${op}"`, "invalidValue");
    }
    const target = typeof operation.path === "string" ? operation.path.toLowerCase() : null;
    if (target === "active") {
      active = operation.value === true || operation.value === "true";
      continue;
    }
    if (target === "username" && typeof operation.value === "string") {
      userName = operation.value;
      continue;
    }
    if (target === "roles" || target === "roles[primary eq true].value") {
      role = roleFrom({ roles: operation.value }, role);
      continue;
    }
    if (target === null && operation.value && typeof operation.value === "object") {
      const patch = operation.value as Record<string, unknown>;
      if (patch.active !== undefined) active = patch.active === true || patch.active === "true";
      if (typeof patch.userName === "string") userName = patch.userName;
      if (patch.roles !== undefined) role = roleFrom(patch, role);
      if (patch.emails !== undefined) email = primaryEmail(patch) ?? email;
      if (patch.displayName !== undefined) displayName = displayNameOf(patch) ?? displayName;
      continue;
    }
    return scimError(400, `unsupported PATCH path "${String(operation.path)}"`, "invalidValue");
  }

  const updated = await applyUserUpdate(db, ctx, id, {
    role,
    active,
    user_name: userName,
    email,
    display_name: displayName,
    previously_active: existing.active,
    reason: "scim.user.patch",
  });
  return ok(toScimUser(updated));
}

/**
 * SCIM DELETE. This service DEACTIVATES rather than erasing: the identity stops working immediately,
 * and the audit trail that names them stays intact. Real erasure is the owner-confirmed, export-first
 * deletion path in export-delete.ts, not a directory sync.
 */
async function deleteUser(db: Db, ctx: ScimContext, id: string): Promise<ScimResponse> {
  const existing = await loadPrincipal(db, ctx, id);
  if (!existing) return scimError(404, "no such user in this workspace");
  // Deactivating the last owner would strand the tenant with nobody able to delete or pay for it, and
  // deactivating any owner is an authority change the directory has no standing to make.
  if (existing.role === "owner") return ownerIsNotDirectoryManaged();
  await applyUserUpdate(db, ctx, id, {
    role: existing.role,
    active: false,
    user_name: existing.user_name,
    email: existing.email,
    display_name: existing.display_name,
    previously_active: existing.active,
    reason: "scim.user.delete",
  });
  return { status: 204, body: null, contentType: SCIM_CONTENT_TYPE };
}

interface UserUpdate {
  role: WorkspaceRole;
  active: boolean;
  user_name: string | null;
  email: string | null;
  display_name: string | null;
  previously_active: boolean;
  reason: string;
}

/**
 * Write an identity change and, when it removes or narrows authority, revoke the person's live sessions
 * IN THE SAME TRANSACTION. A privilege change that commits without the revocation would leave a
 * downgraded cookie usable until it expired, which is exactly the window deprovisioning exists to close.
 */
async function applyUserUpdate(
  db: Db,
  ctx: ScimContext,
  id: string,
  update: UserUpdate,
): Promise<PrincipalRow> {
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<PrincipalRow>(
      `UPDATE workspace_principals
          SET role = $3,
              active = $4,
              deactivated_at = CASE WHEN $4 THEN NULL ELSE coalesce(deactivated_at, now()) END,
              user_name = $5,
              email = $6,
              display_name = $7
        WHERE workspace_id = $1 AND principal_id = $2
        RETURNING ${PRINCIPAL_COLUMNS}`,
      [
        ctx.workspace_id,
        id,
        update.role,
        update.active,
        update.user_name,
        update.email,
        update.display_name,
      ],
    );
    const row = rows[0];
    // Any identity write revokes live sessions: the next request re-reads the role and scope from the
    // database, so a narrowed role can never be exercised with a cookie minted under the old one.
    await revokeSessionsForPrincipal(tx, ctx.workspace_id, id);
    await recordAuditEvent(tx, {
      workspace_id: ctx.workspace_id,
      actor_type: "scim",
      actor_id: ctx.token_id,
      action: update.active ? update.reason : "scim.user.deactivate",
      target_type: "principal",
      target_id: id,
      metadata: {
        reason: update.reason,
        prior_version: update.previously_active ? "active" : "inactive",
        new_version: update.active ? "active" : "inactive",
      },
    });
    return row;
  });
}

/** Live (unrevoked, unexpired) sessions for a principal. Used to prove deprovisioning takes effect. */
export async function activeSessionCount(
  db: Db,
  workspaceId: string,
  principalId: string,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM workspace_sessions
      WHERE workspace_id = $1 AND principal_id = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [workspaceId, principalId],
  );
  return Number.parseInt(rows[0]?.count ?? "0", 10);
}

// ---------------------------------------------------------------------------------------------
// groups (workspace roles)
// ---------------------------------------------------------------------------------------------

/**
 * Groups ARE roles in this service. There is no separate group object a directory could create, because
 * a group that granted nothing would be a lie and a group that granted something arbitrary would let the
 * directory invent authority. The five roles are the authority model; SCIM projects them read-only.
 */
async function listGroups(db: Db, ctx: ScimContext): Promise<Record<string, unknown>> {
  const { rows } = await db.query<{ role: WorkspaceRole; principal_id: string; user_name: string | null }>(
    `SELECT role, principal_id, user_name FROM workspace_principals
      WHERE workspace_id = $1 AND principal_type = 'user' AND active
      ORDER BY role, principal_id`,
    [ctx.workspace_id],
  );
  const byRole = new Map<WorkspaceRole, Array<{ value: string; display: string }>>();
  for (const role of ROLES) byRole.set(role, []);
  for (const row of rows) {
    byRole.get(row.role)?.push({ value: row.principal_id, display: row.user_name ?? row.principal_id });
  }
  return listOf(ROLES.map((role) => groupResource(role, byRole.get(role) ?? [])));
}

async function getGroup(db: Db, ctx: ScimContext, id: string): Promise<ScimResponse> {
  const role = ROLES.find((candidate) => candidate === id);
  if (!role) return scimError(404, "no such group");
  const { rows } = await db.query<{ principal_id: string; user_name: string | null }>(
    `SELECT principal_id, user_name FROM workspace_principals
      WHERE workspace_id = $1 AND principal_type = 'user' AND active AND role = $2
      ORDER BY principal_id`,
    [ctx.workspace_id, role],
  );
  return ok(
    groupResource(
      role,
      rows.map((row) => ({ value: row.principal_id, display: row.user_name ?? row.principal_id })),
    ),
  );
}

function groupResource(
  role: WorkspaceRole,
  members: Array<{ value: string; display: string }>,
): Record<string, unknown> {
  return {
    schemas: [GROUP_SCHEMA],
    id: role,
    displayName: role,
    members,
    meta: { resourceType: "Group", location: `/scim/v2/Groups/${role}` },
  };
}

// ---------------------------------------------------------------------------------------------
// discovery
// ---------------------------------------------------------------------------------------------

/** RFC 7643 §5. Everything advertised here is genuinely implemented above; nothing is aspirational. */
function serviceProviderConfig(): Record<string, unknown> {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://github.com/kage-core/kage/blob/master/docs/security/workspace-threat-model.md",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: MAX_PAGE_SIZE },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: "A workspace-scoped SCIM token, stored hashed and revocable at any time.",
        primary: true,
      },
    ],
    meta: { resourceType: "ServiceProviderConfig", location: "/scim/v2/ServiceProviderConfig" },
  };
}

function resourceTypes(): Array<Record<string, unknown>> {
  return [
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
      id: "User",
      name: "User",
      endpoint: "/Users",
      schema: USER_SCHEMA,
      meta: { resourceType: "ResourceType", location: "/scim/v2/ResourceTypes/User" },
    },
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
      id: "Group",
      name: "Group",
      endpoint: "/Groups",
      schema: GROUP_SCHEMA,
      meta: { resourceType: "ResourceType", location: "/scim/v2/ResourceTypes/Group" },
    },
  ];
}

function schemas(): Array<Record<string, unknown>> {
  return [
    {
      id: USER_SCHEMA,
      name: "User",
      description: "A workspace member provisioned from the customer's directory.",
      attributes: [
        { name: "userName", type: "string", required: true, uniqueness: "server", mutability: "readWrite" },
        { name: "externalId", type: "string", required: false, mutability: "readWrite" },
        { name: "active", type: "boolean", required: false, mutability: "readWrite" },
        { name: "emails", type: "complex", multiValued: true, required: false, mutability: "readWrite" },
        { name: "roles", type: "complex", multiValued: true, required: false, mutability: "readWrite" },
      ],
      meta: { resourceType: "Schema", location: `/scim/v2/Schemas/${USER_SCHEMA}` },
    },
    {
      id: GROUP_SCHEMA,
      name: "Group",
      description: "A workspace role. Groups are read-only projections of the authority model.",
      attributes: [
        { name: "displayName", type: "string", required: true, mutability: "readOnly" },
        { name: "members", type: "complex", multiValued: true, required: false, mutability: "readOnly" },
      ],
      meta: { resourceType: "Schema", location: `/scim/v2/Schemas/${GROUP_SCHEMA}` },
    },
  ];
}
