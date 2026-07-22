// Phase E Task 4 — team review authority, ownership, and an append-only audit log, proven against a
// REAL embedded PostgreSQL.
//
// The guarantees here are only meaningful against a real engine: ownership resolution is a query over
// assigned owners, self-approval and version drift are enforced before any write lands, and the audit
// log's append-only property is enforced by a database trigger (an UPDATE/DELETE must be rejected by
// Postgres itself, not merely by application code). The suite provisions an ephemeral real PostgreSQL
// when KAGE_TEST_DATABASE_URL is absent. Each test uses its OWN repository so ownership assignments in
// one case can never leak into another.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "./test-support/pg.js";
import { createDb, type Db } from "./db.js";
import { migrate } from "./migrate.js";
import { reviewClaim } from "./review.js";
import { assignOwner } from "./ownership.js";
import { forTarget } from "./audit.js";
import { startWorkspaceServer, type WorkspaceServer } from "./server.js";
import { createSession, type SessionCredentials } from "./auth/session.js";
import type { Principal, WorkspaceRole } from "./auth/types.js";
import { makeClaim } from "../sync/fixtures.js";
import type { ClaimRecord } from "../repo-model/types.js";

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;

const workspaceA = randomUUID();

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  await seedWorkspace(workspaceA, "alpha");
  server = await startWorkspaceServer(db);
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

/** Persist a real principal and open a browser session for HTTP end-to-end tests. */
async function seedSession(role: WorkspaceRole): Promise<{ principal_id: string; session: SessionCredentials }> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', $3, NULL)`,
    [workspaceA, principalId, role],
  );
  const session = await createSession(db, { workspace_id: workspaceA, principal_id: principalId });
  return { principal_id: principalId, session };
}

async function reviewOverHttp(
  session: SessionCredentials,
  repositoryId: string,
  claimId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(
    `http://127.0.0.1:${server.port}/v1/repositories/${repositoryId}/claims/${claimId}/review`,
    {
      method: "POST",
      headers: { cookie: `kage_session=${session.token}`, "x-kage-csrf": session.csrf, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body: parsed };
}

async function seedWorkspace(id: string, slug: string): Promise<void> {
  await db.query(
    `INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'team')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id, slug, `${slug}-${id.slice(0, 8)}`],
  );
  // The team routes are ENTITLED routes: since Task 7's hardening, team sync and team review are refused
  // with 402 on a workspace whose subscription lapsed (see billing/hardening.test.ts, which owns that
  // rule). This suite is about AUTHORITY and TENANCY on a paying workspace, so it states the paid state
  // explicitly rather than relying on an unentitled workspace being allowed to do team work.
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end)
       VALUES($1, 'team', 'active', now() + interval '30 days')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id],
  );
}

/** A fresh, isolated repository for a single test, so ownership assignments never bleed across cases. */
async function freshRepository(): Promise<string> {
  const repositoryId = `repo-${randomUUID().slice(0, 8)}`;
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceA, repositoryId],
  );
  return repositoryId;
}

/** A server-resolved principal. Ownership/authority is enforced from these fields, never client input. */
function principal(role: WorkspaceRole, id = randomUUID()): Principal {
  return {
    principal_id: id,
    workspace_id: workspaceA,
    principal_type: "user",
    role,
    repository_ids: "all",
  };
}

/** Insert a claim directly into the workspace store so a review decision has a target to act on. */
async function seedClaim(claim: ClaimRecord, repositoryId: string): Promise<string> {
  await db.query(
    `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state, impact_class, record_json, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workspace_id, repository_id, claim_id)
       DO UPDATE SET record_json = EXCLUDED.record_json, updated_at = EXCLUDED.updated_at`,
    [workspaceA, repositoryId, claim.claim_id, claim.entity_id, claim.trust_state, claim.impact_class, JSON.stringify(claim), claim.updated_at],
  );
  return claim.updated_at; // the version token the reviewer sees
}

function securityClaim(id: string, createdBy = "agent"): ClaimRecord {
  return {
    ...makeClaim(id, { entity_id: "entity-sec" }),
    impact_class: "high",
    review_policy: "security",
    created_by: createdBy,
  };
}

function ownerClaim(id: string, entityId: string, createdBy = "agent"): ClaimRecord {
  return { ...makeClaim(id, { entity_id: entityId }), impact_class: "high", review_policy: "owner", created_by: createdBy };
}

test("a security claim cannot be approved by a plain developer", async () => {
  const repo = await freshRepository();
  const claim = securityClaim("sec-dev");
  const version = await seedClaim(claim, repo);
  const developer = principal("developer");
  const result = await reviewClaim(db, developer, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "looks fine",
  });
  assert.equal(result.status, 403);
});

test("a security claim requires the security-scope owner, not just any knowledge owner", async () => {
  const repo = await freshRepository();
  const claim = securityClaim("sec-owned");
  const version = await seedClaim(claim, repo);
  const securityOwner = principal("knowledge_owner");
  const otherOwner = principal("knowledge_owner");
  // Assign a SECURITY-scope owner for this repository. Now only that owner satisfies the security policy.
  await assignOwner(db, {
    workspace_id: workspaceA,
    repository_id: repo,
    scope_type: "security",
    scope_ref: repo,
    principal_id: securityOwner.principal_id,
  });

  const refused = await reviewClaim(db, otherOwner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "not my scope",
  });
  assert.equal(refused.status, 403);

  const accepted = await reviewClaim(db, securityOwner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "security reviewed",
  });
  assert.equal(accepted.status, 202);
});

test("the most specific owner scope wins over a repository-level owner", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("owner-specific", "entity-comp");
  const version = await seedClaim(claim, repo);
  const componentOwner = principal("knowledge_owner");
  const repositoryOwner = principal("knowledge_owner");
  await assignOwner(db, {
    workspace_id: workspaceA,
    repository_id: repo,
    scope_type: "repository",
    scope_ref: repo,
    principal_id: repositoryOwner.principal_id,
  });
  await assignOwner(db, {
    workspace_id: workspaceA,
    repository_id: repo,
    scope_type: "component",
    scope_ref: claim.entity_id,
    principal_id: componentOwner.principal_id,
  });

  // The repository owner is NOT the most specific owner for this component -> refused.
  const refused = await reviewClaim(db, repositoryOwner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "too broad",
  });
  assert.equal(refused.status, 403);

  const accepted = await reviewClaim(db, componentOwner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "component owner reviewed",
  });
  assert.equal(accepted.status, 202);
});

test("with no owner assigned, review falls back to any workspace knowledge owner", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("owner-fallback", "entity-unowned");
  const version = await seedClaim(claim, repo);
  const anyOwner = principal("knowledge_owner");
  const result = await reviewClaim(db, anyOwner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "fallback review",
  });
  assert.equal(result.status, 202);
});

test("a proposer cannot approve their own claim", async () => {
  const repo = await freshRepository();
  const owner = principal("knowledge_owner");
  const claim = ownerClaim("self-approve", "entity-self", owner.principal_id);
  const version = await seedClaim(claim, repo);
  const result = await reviewClaim(db, owner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "approving my own",
  });
  assert.equal(result.status, 403);
  assert.equal(result.error, "self_approval_blocked");
});

test("a stale expected version is a 409 conflict", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("stale-version", "entity-stale");
  await seedClaim(claim, repo);
  const owner = principal("knowledge_owner");
  const result = await reviewClaim(db, owner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: "1999-01-01T00:00:00.000Z",
    action: "accept",
    decision_note: "acting on a stale view",
  });
  assert.equal(result.status, 409);
  assert.equal(result.error, "version_conflict");
});

test("reviewing a claim in another workspace's repository is a 404", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("cross-tenant", "entity-x");
  const version = await seedClaim(claim, repo);
  const foreign = principal("owner");
  foreign.workspace_id = randomUUID();
  const result = await reviewClaim(db, foreign, {
    workspace_id: foreign.workspace_id,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "cross tenant",
  });
  assert.equal(result.status, 404);
});

test("every review decision creates an immutable audit event", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("audited", "entity-audit");
  const version = await seedClaim(claim, repo);
  const owner = principal("knowledge_owner");
  const result = await reviewClaim(db, owner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "auditable acceptance",
  });
  assert.equal(result.status, 202);

  const events = await forTarget(db, workspaceA, "claim", claim.claim_id);
  const last = events.at(-1);
  assert.equal(last?.action, "knowledge.review.accept");
  assert.equal(last?.actor_id, owner.principal_id);
  // The audit metadata records prior/new version and the reason — never any raw prompt/tool content.
  assert.equal(last?.metadata.reason, "auditable acceptance");
  assert.equal(last?.metadata.prior_version, version);
  assert.ok(last?.metadata.new_version && last.metadata.new_version !== version);
});

test("audit events are append-only: an UPDATE or DELETE is rejected by the database", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("immutable", "entity-immutable");
  const version = await seedClaim(claim, repo);
  const owner = principal("knowledge_owner");
  await reviewClaim(db, owner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "accept",
    decision_note: "cannot be altered later",
  });
  const events = await forTarget(db, workspaceA, "claim", claim.claim_id);
  const auditId = events.at(-1)?.audit_id;
  assert.ok(auditId);

  await assert.rejects(
    () => db.query(`UPDATE audit_events SET action = 'tampered' WHERE audit_id = $1`, [auditId]),
    /append-only|audit/i,
  );
  await assert.rejects(
    () => db.query(`DELETE FROM audit_events WHERE audit_id = $1`, [auditId]),
    /append-only|audit/i,
  );
});

test("a reject decision withholds trust and is audited", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("rejected", "entity-reject");
  const version = await seedClaim(claim, repo);
  const owner = principal("knowledge_owner");
  const result = await reviewClaim(db, owner, {
    workspace_id: workspaceA,
    repository_id: repo,
    claim_id: claim.claim_id,
    expected_version: version,
    action: "reject",
    decision_note: "insufficient evidence",
  });
  assert.equal(result.status, 202);
  const { rows } = await db.query<{ trust_state: string }>(
    `SELECT trust_state FROM workspace_claims WHERE workspace_id = $1 AND repository_id = $2 AND claim_id = $3`,
    [workspaceA, repo, claim.claim_id],
  );
  assert.equal(rows[0].trust_state, "disputed");
  const events = await forTarget(db, workspaceA, "claim", claim.claim_id);
  assert.equal(events.at(-1)?.action, "knowledge.review.reject");
});

test("HTTP: an authorized owner accepts a claim end-to-end and can read the audit trail", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("http-accept", "entity-http");
  const version = await seedClaim(claim, repo);
  const { session } = await seedSession("knowledge_owner");

  const accepted = await reviewOverHttp(session, repo, claim.claim_id, {
    action: "accept",
    expected_version: version,
    decision_note: "reviewed over http",
  });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.body.claim_id, claim.claim_id);

  const audit = await fetch(
    `http://127.0.0.1:${server.port}/v1/repositories/${repo}/claims/${claim.claim_id}/audit`,
    { headers: { cookie: `kage_session=${session.token}` } },
  );
  assert.equal(audit.status, 200);
  const auditBody = (await audit.json()) as { events: Array<{ action: string }> };
  assert.equal(auditBody.events.at(-1)?.action, "knowledge.review.accept");
});

test("HTTP: a viewer cannot record a review decision", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("http-viewer", "entity-http-viewer");
  const version = await seedClaim(claim, repo);
  const { session } = await seedSession("viewer");
  const result = await reviewOverHttp(session, repo, claim.claim_id, {
    action: "accept",
    expected_version: version,
    decision_note: "should be refused",
  });
  assert.equal(result.status, 403);
});

test("HTTP: a malformed review request is a 400", async () => {
  const repo = await freshRepository();
  const claim = ownerClaim("http-bad", "entity-http-bad");
  await seedClaim(claim, repo);
  const { session } = await seedSession("knowledge_owner");
  const result = await reviewOverHttp(session, repo, claim.claim_id, {
    action: "not-an-action",
    expected_version: "",
    decision_note: "",
  });
  assert.equal(result.status, 400);
});
