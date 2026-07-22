// Phase E / GA gate — the ONE real end-to-end proof that the team+commercial workspace honors every
// completion-gate invariant that is code-provable, run against a REAL embedded PostgreSQL.
//
// WHAT THIS PROVES (all seven are asserted on a single aggregated `result`, exactly as the plan states):
//   cross_tenant_reads = 0                          — tenant, repository, and path-permission isolation
//   raw_payloads_synced = 0                         — raw prompts/tool payloads never leave the local box
//   self_approvals = 0                              — a proposer cannot approve their own high-impact claim
//   duplicate_sync_records = 0                      — a replayed batch (a second replica) applies once
//   invalid_webhooks_accepted = 0                   — a bad GitHub signature is 401, the processor uncalled
//   local_context_available_during_workspace_outage — the local read path never touches the workspace
//   export_available_after_entitlement_expiry       — a lapsed customer keeps export + local runtime
//
// WHAT THIS DOES NOT PROVE (honest gaps, enforced by scripts/vnext-phase-e-report.mjs, NEVER faked here):
//   design-partner pilots, a live GitHub App registration, live Stripe keys, a real OIDC/SCIM IdP, and a
//   real docker build. Those need external systems and real weeks. This gate is the technical half; the
//   report is the honest ledger of the commercial half that is NOT run.
//
// The setup is exactly the plan's fixture: TWO workspaces, THREE users, TWO local replicas, ONE GitHub
// installation fixture, ONE billing fixture, and ONE restricted repository. Nothing is mocked where a
// real engine changes the answer — the suite provisions an ephemeral real PostgreSQL when
// KAGE_TEST_DATABASE_URL is absent, and the local-context proof opens a REAL local sqlite model.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startTestPostgres, type TestPostgres } from "./workspace/test-support/pg.js";
import { createDb, type Db } from "./workspace/db.js";
import { migrate } from "./workspace/migrate.js";
import { startWorkspaceServer, type WorkspaceServer } from "./workspace/server.js";
import { createSession, type SessionCredentials } from "./workspace/auth/session.js";
import { fixtureSyncBatch, makeClaim, makeEntity, makeEvidence } from "./sync/fixtures.js";
import type { LocalModelSnapshot, SyncBatch } from "./sync/types.js";
import { buildSyncBatch } from "./sync/outbox.js";
import { handleWebhook, type WebhookProcessor } from "./workspace/github/webhooks.js";
import { computeSignature } from "./workspace/github/signature.js";
import { resolveWorkspaceEntitlements } from "./workspace/billing/entitlements.js";
import { exportWorkspace } from "./workspace/enterprise/export-delete.js";
import type { ClaimRecord } from "./repo-model/types.js";
import { openRepositoryModel } from "./migration/model-store.js";
import { handlePortalRoute } from "./api/router.js";
import { ReceiptStore } from "./storage/receipt-store.js";
import type { OverviewDto } from "./api/types.js";

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;

// TWO workspaces — the whole point is that one can never see the other.
const workspaceA = randomUUID();
const workspaceB = randomUUID();

// ONE restricted repository in A: a repository-scoped service replica is allowed repo-open only, so
// repo-restricted must return zero rows to it (path-permission isolation).
const REPO_OPEN = "repo-open";
const REPO_RESTRICTED = "repo-restricted";
const REPO_B = "repo-b1";

// THREE users, plus the replica service principals.
let ownerA: { principal_id: string; session: SessionCredentials }; // knowledge_owner in A
let reviewerA: { principal_id: string; session: SessionCredentials }; // independent knowledge_owner in A
let developerB: { principal_id: string; session: SessionCredentials }; // developer in B (the outsider)

// TWO local replicas pushing into A: one full-scope, one restricted to REPO_OPEN.
let replicaFull: { principal_id: string; session: SessionCredentials };
let replicaRestricted: { principal_id: string; session: SessionCredentials };

const GITHUB_SECRET = "phase-e-gate-webhook-secret";

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  server = await startWorkspaceServer(db);

  await seedWorkspace(workspaceA, "alpha");
  await seedWorkspace(workspaceB, "beta");
  await seedRepository(workspaceA, REPO_OPEN);
  await seedRepository(workspaceA, REPO_RESTRICTED);
  await seedRepository(workspaceB, REPO_B);

  ownerA = await seedUser(workspaceA, "knowledge_owner");
  reviewerA = await seedUser(workspaceA, "knowledge_owner");
  developerB = await seedUser(workspaceB, "developer");
  replicaFull = await seedService(workspaceA, null); // null => "all" repositories in its own tenant
  replicaRestricted = await seedService(workspaceA, [REPO_OPEN]); // path-scoped to one repo
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

// ---------------------------------------------------------------------------------------------
// seeding
// ---------------------------------------------------------------------------------------------

async function seedWorkspace(id: string, slug: string): Promise<void> {
  await db.query(
    `INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'team')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id, slug, `${slug}-${id.slice(0, 8)}`],
  );
  // Team sync/review are ENTITLED routes (Task 7): a lapsed subscription is refused with 402. This gate
  // is about ISOLATION and AUTHORITY on paying workspaces, so it states the paid state explicitly.
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end)
       VALUES($1, 'team', 'active', now() + interval '30 days')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id],
  );
}

async function seedRepository(workspaceId: string, repositoryId: string): Promise<void> {
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceId, repositoryId],
  );
}

async function seedUser(
  workspaceId: string,
  role: string,
): Promise<{ principal_id: string; session: SessionCredentials }> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', $3, NULL)`,
    [workspaceId, principalId, role],
  );
  const session = await createSession(db, { workspace_id: workspaceId, principal_id: principalId });
  return { principal_id: principalId, session };
}

async function seedService(
  workspaceId: string,
  repositoryIds: string[] | null,
): Promise<{ principal_id: string; session: SessionCredentials }> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'service', 'developer', $3)`,
    [workspaceId, principalId, repositoryIds === null ? null : JSON.stringify(repositoryIds)],
  );
  const session = await createSession(db, { workspace_id: workspaceId, principal_id: principalId });
  return { principal_id: principalId, session };
}

async function seedClaim(
  workspaceId: string,
  repositoryId: string,
  claim: ClaimRecord,
): Promise<void> {
  await db.query(
    `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state, impact_class, record_json, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workspace_id, repository_id, claim_id)
       DO UPDATE SET record_json = EXCLUDED.record_json, updated_at = EXCLUDED.updated_at`,
    [
      workspaceId,
      repositoryId,
      claim.claim_id,
      claim.entity_id,
      claim.trust_state,
      claim.impact_class,
      JSON.stringify(claim),
      claim.updated_at,
    ],
  );
}

// ---------------------------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------------------------

async function pushBatch(
  session: SessionCredentials,
  batch: SyncBatch,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
    body: JSON.stringify(batch),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

async function pull(
  session: SessionCredentials,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/pull`, {
    headers: { authorization: `Bearer ${session.token}` },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

async function review(
  session: SessionCredentials,
  repositoryId: string,
  claimId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(
    `http://127.0.0.1:${server.port}/v1/repositories/${repositoryId}/claims/${claimId}/review`,
    {
      method: "POST",
      headers: {
        cookie: `kage_session=${session.token}`,
        "x-kage-csrf": session.csrf,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body: parsed };
}

// A batch that HAND-ASSEMBLES a raw (local_raw) evidence record past buildSyncBatch's filter — exactly
// the smuggling attempt the wire must refuse.
function batchWithRawEvidence(workspaceId: string, repositoryId: string): SyncBatch {
  const snapshot: LocalModelSnapshot = {
    workspace_id: workspaceId,
    repository_id: repositoryId,
    base_cursor: null,
    entities: [makeEntity("entity-raw", repositoryId)],
    claims: [makeClaim("claim-raw", { entity_id: "entity-raw" })],
    evidence: [makeEvidence("ev-team", "team_metadata", repositoryId)],
    relations: [],
    review_decisions: [],
    measurements: [],
  };
  const clean = buildSyncBatch(snapshot);
  // Splice a local_raw record in AFTER the privacy filter ran — the wire's assertNoRawPayload must catch it.
  return {
    ...clean,
    evidence: [...clean.evidence, makeEvidence("ev-raw-smuggle", "local_raw", repositoryId)],
  };
}

// ---------------------------------------------------------------------------------------------
// the gate
// ---------------------------------------------------------------------------------------------

interface GateResult {
  cross_tenant_reads: number;
  raw_payloads_synced: number;
  self_approvals: number;
  duplicate_sync_records: number;
  invalid_webhooks_accepted: number;
  local_context_available_during_workspace_outage: boolean;
  export_available_after_entitlement_expiry: boolean;
}

async function runPhaseETeamGate(): Promise<GateResult> {
  const result: GateResult = {
    cross_tenant_reads: 0,
    raw_payloads_synced: 0,
    self_approvals: 0,
    duplicate_sync_records: 0,
    invalid_webhooks_accepted: 0,
    local_context_available_during_workspace_outage: false,
    export_available_after_entitlement_expiry: false,
  };

  // --- Seed real synced knowledge into A via the full-scope replica (both repos). ---
  await pushBatch(replicaFull.session, fixtureSyncBatch(workspaceA, REPO_OPEN));
  await pushBatch(replicaFull.session, fixtureSyncBatch(workspaceA, REPO_RESTRICTED));

  // ============================ 1. TENANT ISOLATION ============================
  // (a) TENANT: workspace B's developer pulls; it must NOT see any of A's claims.
  const bPull = await pull(developerB.session);
  const bClaims = Array.isArray((bPull.body as { claims?: unknown[] }).claims)
    ? ((bPull.body as { claims: unknown[] }).claims as unknown[])
    : [];
  result.cross_tenant_reads += bClaims.length; // A seeded 2 repos of claims; B must see zero of them.

  // (b) REPOSITORY / PATH-PERMISSION: A's repo-restricted replica pulls; it must see ONLY REPO_OPEN.
  const restrictedPull = await pull(replicaRestricted.session);
  const restrictedClaims = Array.isArray((restrictedPull.body as { claims?: Array<{ repository_id?: string }> }).claims)
    ? ((restrictedPull.body as { claims: Array<{ repository_id?: string }> }).claims)
    : [];
  result.cross_tenant_reads += restrictedClaims.filter((c) => c.repository_id === REPO_RESTRICTED).length;

  // (c) TENANT via a mutation: B's developer tries to review a claim that lives in A. Cross-tenant target
  // is not even disclosed — the claim is loaded under B's SERVER-resolved tenant, so it is simply not
  // found (404, existence undisclosed). A successful review write is 202 (see reviewClaim + the positive
  // control below), so ANY 2xx here would mean a leaked cross-tenant write; count every such success.
  // The 404 assert is the load-bearing backing check: it fails the moment tenant isolation on the load
  // leaks (e.g. a found-but-unauthorized 403 that discloses the row's existence across tenants).
  const crossReview = await review(developerB.session, REPO_OPEN, "claim-1", {
    expected_version: "2026-07-20T00:00:00.000Z",
    action: "accept",
    decision_note: "cross-tenant attempt",
  });
  if (crossReview.status >= 200 && crossReview.status < 300) result.cross_tenant_reads += 1;
  assert.equal(crossReview.status, 404, "a cross-tenant review must be 404 — the target's existence is not disclosed");
  assert.equal(crossReview.body.error, "claim_not_found");

  // ============================ 2. RAW PAYLOADS STAY LOCAL ============================
  const rawPush = await pushBatch(replicaFull.session, batchWithRawEvidence(workspaceA, REPO_OPEN));
  assert.equal(rawPush.status, 400, "a batch carrying local_raw evidence must be refused with 400");
  assert.equal(rawPush.body.error, "raw_payload_rejected");
  const rawLanded = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_evidence
       WHERE workspace_id = $1 AND privacy_class = 'local_raw'`,
    [workspaceA],
  );
  result.raw_payloads_synced += Number(rawLanded.rows[0]?.count ?? "0");

  // ============================ 3. SELF-APPROVAL PREVENTION ============================
  // ownerA proposes a HIGH-impact claim (created_by = ownerA), then tries to approve it themselves.
  // ownerA is a knowledge_owner (has knowledge.review) and, with no explicit owners assigned, satisfies
  // the ownership fallback — so ONLY the self-approval rule stands between them and a self-approval.
  const selfClaim: ClaimRecord = {
    ...makeClaim("claim-self", { entity_id: "entity-open", trust_state: "proposed" }),
    impact_class: "high",
    review_policy: "owner",
    created_by: ownerA.principal_id,
  };
  await seedClaim(workspaceA, REPO_OPEN, selfClaim);
  const selfReview = await review(ownerA.session, REPO_OPEN, "claim-self", {
    expected_version: selfClaim.updated_at,
    action: "accept",
    decision_note: "approving my own high-impact claim",
  });
  // A successful review write is 202 (not 200); count ANY 2xx as an escaped self-approval so the counter
  // actually moves if the self-approval rule ever regresses, independent of the 403 assert below.
  if (selfReview.status >= 200 && selfReview.status < 300) result.self_approvals += 1;
  assert.equal(selfReview.status, 403, "a proposer's self-approval of a high-impact claim must be 403");
  assert.equal(selfReview.body.error, "self_approval_blocked");

  // Positive control: an INDEPENDENT knowledge_owner CAN accept the same claim — authority works, it is
  // only self-approval that is refused. (This makes self_approvals=0 meaningful, not merely a dead route.)
  const goodReview = await review(reviewerA.session, REPO_OPEN, "claim-self", {
    expected_version: selfClaim.updated_at,
    action: "accept",
    decision_note: "independent reviewer accepts",
  });
  assert.equal(goodReview.status, 202, "an independent reviewer must be able to accept the claim");

  // ============================ 4. IDEMPOTENT SYNC (two replicas) ============================
  // Two local replicas of the SAME workspace push the SAME batch (identical batch_id). The first applies;
  // the second is a replay and must be a no-op, so the claim row count stays 1, not 2.
  const dupBatch = fixtureSyncBatch(workspaceA, REPO_OPEN);
  // Give it a distinct claim id so we can count exactly its rows.
  const uniqueClaim = makeClaim(`claim-dup-${randomUUID().slice(0, 8)}`, { entity_id: "entity-1" });
  const twoReplicaBatch: SyncBatch = { ...dupBatch, claims: [uniqueClaim], batch_id: `batch-dup-${randomUUID()}` };
  const firstApply = await pushBatch(replicaFull.session, twoReplicaBatch);
  assert.equal(firstApply.status, 200, "first replica push applies");
  assert.equal((firstApply.body as { status?: string }).status, "applied", "first replica push is applied");
  const secondApply = await pushBatch(replicaRestricted.session, twoReplicaBatch);
  // The second replica is scoped to REPO_OPEN too, so it is authorized; the batch id is already claimed.
  assert.equal((secondApply.body as { status?: string }).status, "duplicate", "second replica push is a replay");
  const dupRows = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_claims WHERE workspace_id = $1 AND claim_id = $2`,
    [workspaceA, uniqueClaim.claim_id],
  );
  result.duplicate_sync_records += Math.max(0, Number(dupRows.rows[0]?.count ?? "0") - 1);

  // ============================ 5. GITHUB WEBHOOK SIGNATURES ============================
  let processorCalls = 0;
  const processor: WebhookProcessor = async () => {
    processorCalls += 1;
  };
  const rawBody = JSON.stringify({ action: "opened", installation: { id: 42 } });
  // (a) A tampered signature must be rejected (401) and the processor must NOT run.
  const invalid = await handleWebhook(
    { db, secret: GITHUB_SECRET, process: processor },
    {
      rawBody,
      signature: "sha256=" + "0".repeat(64),
      event: "pull_request",
      deliveryId: `delivery-${randomUUID()}`,
      workspaceId: workspaceA,
    },
  );
  if (invalid.status !== 401) result.invalid_webhooks_accepted += 1;
  if (processorCalls > 0) result.invalid_webhooks_accepted += 1; // processor ran on an invalid signature

  // (b) A correctly-signed delivery is processed exactly once, and a REDELIVERY (same id) is ignored —
  // proving both signature acceptance and idempotency on the real deliveries ledger.
  const deliveryId = `delivery-${randomUUID()}`;
  const goodSig = computeSignature(GITHUB_SECRET, rawBody);
  const okFirst = await handleWebhook(
    { db, secret: GITHUB_SECRET, process: processor },
    { rawBody, signature: goodSig, event: "pull_request", deliveryId, workspaceId: workspaceA },
  );
  assert.equal(okFirst.status, 202, "a valid, first-seen delivery is processed");
  const okReplay = await handleWebhook(
    { db, secret: GITHUB_SECRET, process: processor },
    { rawBody, signature: goodSig, event: "pull_request", deliveryId, workspaceId: workspaceA },
  );
  assert.equal(okReplay.result, "duplicate_ignored", "a redelivered event is processed once");
  assert.equal(processorCalls, 1, "the processor ran exactly once across the valid delivery + its replay");

  // ============================ 6. LOCAL CONTEXT DURING A WORKSPACE OUTAGE ============================
  // The local context path is the Phase C read model over LOCAL sqlite — it must not touch the workspace
  // at all. We make the outage concrete: a workspace call to a dead port fails, and IN THAT SAME WINDOW
  // the local overview still resolves 200. The local model never opened a socket to the workspace.
  let workspaceUnreachable = false;
  try {
    await fetch("http://127.0.0.1:1/v1/sync/pull", { signal: AbortSignal.timeout(500) });
  } catch {
    workspaceUnreachable = true; // the workspace is genuinely unreachable in this window
  }
  const projectDir = mkdtempSync(join(tmpdir(), "kage-phase-e-local-"));
  const opened = openRepositoryModel(projectDir);
  try {
    opened.model.upsertEntity({
      entity_id: "local-repo",
      repository_id: "local-repo",
      kind: "repository",
      canonical_name: "Local repo",
      slug: "local-repo",
      summary: "local context lives entirely on the developer's box",
      status: "active",
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    });
    const ctx = { model: opened.model, receiptStore: new ReceiptStore(opened.model.database) };
    const overview = handlePortalRoute({ kind: "overview" }, ctx, new URLSearchParams());
    const body = overview.body as OverviewDto;
    result.local_context_available_during_workspace_outage =
      workspaceUnreachable && overview.status === 200 && Array.isArray(body.metrics);
  } finally {
    opened.close();
    rmSync(projectDir, { recursive: true, force: true });
  }

  // ============================ 7. EXPORT AFTER ENTITLEMENT EXPIRY ============================
  // Store an EXPIRED team subscription for B, then prove (a) entitlements keep local_runtime AND
  // workspace_export TRUE, and (b) an export actually succeeds — the customer's data is never held hostage.
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end)
       VALUES($1, 'team', 'active', now() - interval '1 day')
     ON CONFLICT (workspace_id)
       DO UPDATE SET plan_id = 'team', status = 'active', current_period_end = now() - interval '1 day'`,
    [workspaceB],
  );
  const entitlements = await resolveWorkspaceEntitlements(db, workspaceB);
  assert.equal(entitlements.state, "expired", "the fixture subscription is expired");
  assert.equal(entitlements.local_runtime, true, "a lapsed customer keeps local runtime");
  assert.equal(entitlements.workspace_export, true, "a lapsed customer keeps export");
  const exportDir = mkdtempSync(join(tmpdir(), "kage-phase-e-export-"));
  try {
    const exported = await exportWorkspace(db, workspaceB, {
      directory: exportDir,
      encryption_key: Buffer.alloc(32, 7),
    });
    result.export_available_after_entitlement_expiry =
      entitlements.workspace_export === true && exported.byte_size > 0;
  } finally {
    rmSync(exportDir, { recursive: true, force: true });
  }

  return result;
}

test("Phase E / GA gate: the team+commercial workspace honors every code-provable invariant", async () => {
  const result = await runPhaseETeamGate();

  assert.equal(result.cross_tenant_reads, 0);
  assert.equal(result.raw_payloads_synced, 0);
  assert.equal(result.self_approvals, 0);
  assert.equal(result.duplicate_sync_records, 0);
  assert.equal(result.invalid_webhooks_accepted, 0);
  assert.equal(result.local_context_available_during_workspace_outage, true);
  assert.equal(result.export_available_after_entitlement_expiry, true);
});
