# Kage vNext Phase E: Team Workspace and Commercialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure shared workspace with permission-aware knowledge sync, review authority, GitHub integration, honest aggregated metrics, billing/entitlements, enterprise identity, self-hosting, and a measured commercial pilot.

**Architecture:** Run a separate Node workspace service backed by PostgreSQL. Local daemons push an idempotent outbox of approved model records and permitted measurements; the workspace is canonical for team review, ownership, policy, and aggregated metrics but never required for low-latency local context. GitHub App, billing, OIDC, and SCIM integrate through explicit provider boundaries and audit logs.

**Tech Stack:** TypeScript, Node.js 22+, `node:http`, PostgreSQL with `pg`, GitHub App REST/webhooks, Stripe Billing and Entitlements, OpenID Connect, SCIM 2.0, React portal, Docker, Node test runner, and PostgreSQL integration tests. Primary references: GitHub least-privilege permissions and installation tokens (<https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app>, <https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app>), Stripe subscription/entitlement webhooks (<https://docs.stripe.com/billing/subscriptions/webhooks>), OpenID Connect Core (<https://openid.net/specs/openid-connect-core-1_0-18.html>), and SCIM RFC 7644 (<https://www.rfc-editor.org/info/rfc7644/>).

---

## Task 1: Add PostgreSQL workspace schema and server boundary

**Files:**
- Create: `mcp/vnext/workspace/db.ts`
- Create: `mcp/vnext/workspace/migrations/001_workspace.sql`
- Create: `mcp/vnext/workspace/migrate.ts`
- Create: `mcp/vnext/workspace/server.ts`
- Create: `mcp/vnext/workspace/server.test.ts`
- Modify: `mcp/package.json`
- Modify: `mcp/tsconfig.json`

- [ ] **Step 1: Add pinned dependencies through npm**

Run:

```bash
npm install --prefix mcp pg stripe jose
npm install --prefix mcp --save-dev @types/pg
```

Commit the resolved lockfile. Do not place credentials in package scripts or repository configuration.

- [ ] **Step 2: Write failing tenant-schema and health tests**

```ts
test("workspace health checks database migration version", async () => {
  const response = await workspaceRequest("GET", "/v1/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.database_migration, 1);
});

test("knowledge tables require workspace and repository identifiers", async () => {
  await assert.rejects(
    () => db.query("INSERT INTO entities(entity_id, kind, canonical_name) VALUES('e1','feature','Auth')"),
    /workspace_id|not-null/i,
  );
});
```

- [ ] **Step 3: Run integration test and confirm failure**

Run with a temporary PostgreSQL database:

```bash
KAGE_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/kage_test npm run build --prefix mcp
KAGE_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/kage_test node --test mcp/dist/vnext/workspace/server.test.js
```

Expected: missing workspace migration/server.

- [ ] **Step 4: Add tenant-scoped schema**

Create:

```sql
CREATE TABLE workspaces (
  workspace_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE repositories (
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  repository_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  default_branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, repository_id)
);
CREATE TABLE workspace_entities (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  model_version INTEGER NOT NULL,
  record_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, entity_id),
  FOREIGN KEY(workspace_id, repository_id) REFERENCES repositories(workspace_id, repository_id)
);
CREATE TABLE workspace_claims (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  impact_class TEXT NOT NULL,
  record_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, claim_id)
);
CREATE TABLE workspace_evidence (
  workspace_id UUID NOT NULL,
  repository_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  object_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(workspace_id, repository_id, evidence_id)
);
CREATE TABLE audit_events (
  audit_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Every query repository method requires `workspace_id`; there is no unscoped list method.

- [ ] **Step 5: Test and commit**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/server.test.js
npm test --prefix mcp
git add mcp/vnext/workspace mcp/package.json mcp/package-lock.json mcp/tsconfig.json
git commit -m "feat: add tenant-scoped Kage workspace service"
```

## Task 2: Implement identity, sessions, roles, and tenant enforcement

**Files:**
- Create: `mcp/vnext/workspace/auth/types.ts`
- Create: `mcp/vnext/workspace/auth/session.ts`
- Create: `mcp/vnext/workspace/auth/authorize.ts`
- Create: `mcp/vnext/workspace/auth/auth.test.ts`
- Modify: `mcp/vnext/workspace/migrations/001_workspace.sql`
- Modify: `mcp/vnext/workspace/server.ts`

- [ ] **Step 1: Write failing role and cross-tenant tests**

```ts
test("viewer cannot mutate review state", async () => {
  const response = await authedRequest(viewerSession(), "POST", "/v1/review-items/item-1/accept", { note: "approve" });
  assert.equal(response.status, 403);
});

test("workspace session cannot read another workspace by guessed id", async () => {
  const response = await authedRequest(workspaceASession(), "GET", `/v1/workspaces/${workspaceB}/repositories`);
  assert.equal(response.status, 404);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/auth/auth.test.js
```

- [ ] **Step 3: Define roles and authorization actions**

```ts
export type WorkspaceRole = "owner" | "admin" | "knowledge_owner" | "developer" | "viewer";
export type WorkspaceAction =
  | "workspace.manage"
  | "repository.connect"
  | "knowledge.read"
  | "knowledge.review"
  | "policy.manage"
  | "metrics.read"
  | "billing.manage"
  | "audit.read";

export interface Principal {
  principal_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  repository_ids: string[] | "all";
}
```

- [ ] **Step 4: Add short-lived hashed sessions**

Store only session-token hashes, rotate on privilege change, set Secure/HttpOnly/SameSite=Lax cookies, and require CSRF tokens for browser mutations. Local daemon service tokens are distinct principals restricted to their repository and sync actions.

- [ ] **Step 5: Test and commit**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/auth/auth.test.js
npm test --prefix mcp
git add mcp/vnext/workspace/auth mcp/vnext/workspace/server.ts mcp/vnext/workspace/migrations
git commit -m "feat: enforce workspace identity and roles"
```

## Task 3: Implement idempotent permission-aware synchronization

**Files:**
- Create: `mcp/vnext/sync/types.ts`
- Create: `mcp/vnext/sync/outbox.ts`
- Create: `mcp/vnext/sync/client.ts`
- Create: `mcp/vnext/sync/conflicts.ts`
- Create: `mcp/vnext/sync/sync.test.ts`
- Create: `mcp/vnext/workspace/sync-routes.ts`
- Create: `mcp/vnext/workspace/sync-routes.test.ts`
- Modify: `mcp/vnext/storage/migrations.ts`
- Modify: `mcp/vnext/workspace/server.ts`

- [ ] **Step 1: Write failing retry, privacy, and conflict tests**

```ts
test("retrying one outbox batch does not duplicate records", async () => {
  const batch = fixtureSyncBatch();
  await workspace.applyBatch(batch);
  await workspace.applyBatch(batch);
  assert.equal(await workspace.countClaims(batch.workspace_id), batch.claims.length);
});

test("local_raw evidence never enters a sync batch", () => {
  const batch = buildSyncBatch(fixtureModelWithEvidence(["local_raw", "team_metadata", "team_approved"]));
  assert.equal(batch.evidence.some((item) => item.privacy_class === "local_raw"), false);
});

test("concurrent claim versions preserve both and create review conflict", async () => {
  const result = await mergeConcurrentClaims(claimVersion("A"), claimVersion("B"));
  assert.equal(result.action, "review_conflict");
  assert.equal(result.preserved_versions.length, 2);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/sync/sync.test.js
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/sync-routes.test.js
```

- [ ] **Step 3: Define sync envelope**

```ts
export interface SyncBatch {
  protocol_version: 1;
  batch_id: string;
  workspace_id: string;
  repository_id: string;
  base_cursor: string | null;
  entities: EntityRecord[];
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  relations: RelationRecord[];
  review_decisions: ReviewDecisionRecord[];
  measurements: AggregatedMeasurementRecord[];
  created_at: string;
}
```

- [ ] **Step 4: Implement outbox and cursor protocol**

Local writes enqueue one immutable outbox record in the same transaction. Workspace `/v1/sync/push` accepts idempotency key `batch_id`; `/v1/sync/pull?cursor=` returns changes the principal may see. The local replica re-verifies source-linked claims against the local checkout before injection.

- [ ] **Step 5: Test offline recovery and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/sync/sync.test.js
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/sync-routes.test.js
npm test --prefix mcp
git add mcp/vnext/sync mcp/vnext/workspace mcp/vnext/storage/migrations.ts
git commit -m "feat: synchronize permission-aware repository knowledge"
```

## Task 4: Add team review authority, ownership, and audit

**Files:**
- Create: `mcp/vnext/workspace/review.ts`
- Create: `mcp/vnext/workspace/review.test.ts`
- Create: `mcp/vnext/workspace/ownership.ts`
- Create: `mcp/vnext/workspace/audit.ts`
- Modify: `mcp/vnext/workspace/migrations/001_workspace.sql`
- Modify: `mcp/vnext/workspace/server.ts`
- Modify: `platform/web/src/pages/ReviewQueuePage.tsx`

- [ ] **Step 1: Write failing authority and audit tests**

```ts
test("security claim requires a security-authorized knowledge owner", async () => {
  const developer = principal({ role: "developer" });
  const response = await reviewClaim(securityClaim(), developer, "accept");
  assert.equal(response.status, 403);
});

test("every review decision creates an immutable audit event", async () => {
  const result = await reviewClaim(normalClaim(), knowledgeOwner(), "accept");
  const events = await audit.forTarget("claim", result.claim_id);
  assert.equal(events.at(-1)?.action, "knowledge.review.accept");
  assert.equal(events.at(-1)?.actor_id, knowledgeOwner().principal_id);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/review.test.js
```

- [ ] **Step 3: Add ownership scopes**

Owners may be assigned to repository, feature, component, runbook, security, or operations scopes. Required reviewer resolution follows the most specific applicable scope and falls back to workspace knowledge owners. The proposer cannot satisfy the required independent review.

- [ ] **Step 4: Make audit append-only**

The application role receives `INSERT` and `SELECT` on `audit_events`, not `UPDATE` or `DELETE`. Audit metadata excludes raw prompt/tool content and stores request ID, actor, action, target, prior/new version IDs, reason, and timestamp.

- [ ] **Step 5: Test and commit**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/review.test.js
npm test --prefix mcp
npm test --prefix platform/web
git add mcp/vnext/workspace platform/web/src/pages/ReviewQueuePage.tsx
git commit -m "feat: enforce team knowledge review authority"
```

## Task 5: Build the least-privilege GitHub App integration

**Files:**
- Create: `mcp/vnext/workspace/github/config.ts`
- Create: `mcp/vnext/workspace/github/signature.ts`
- Create: `mcp/vnext/workspace/github/auth.ts`
- Create: `mcp/vnext/workspace/github/webhooks.ts`
- Create: `mcp/vnext/workspace/github/checks.ts`
- Create: `mcp/vnext/workspace/github/github.test.ts`
- Modify: `mcp/vnext/workspace/server.ts`
- Modify: `platform/web/src/pages/OnboardingPage.tsx`
- Create: `docs/integrations/github-app.md`

- [ ] **Step 1: Write failing signature, permission, and delivery tests**

```ts
test("GitHub webhook rejects an invalid sha256 signature before parsing", async () => {
  const response = await webhookRequest({ signature: "sha256=invalid", body: fixtureWebhookBody() });
  assert.equal(response.status, 401);
  assert.equal(webhookProcessor.calls, 0);
});

test("duplicate GitHub delivery id is processed once", async () => {
  await signedWebhook({ delivery: "delivery-1" });
  await signedWebhook({ delivery: "delivery-1" });
  assert.equal(webhookProcessor.calls, 1);
});

test("read-only installation does not attempt PR check writes", async () => {
  const result = await publishCheck(readOnlyInstallation(), fixtureCheck());
  assert.equal(result.status, "skipped_missing_permission");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/workspace/github/github.test.js
```

- [ ] **Step 3: Implement app and installation authentication**

Generate short-lived app JWTs, exchange them for installation tokens, cache tokens only until their server-reported expiry, and never assume token length or format. Request read-only metadata/contents/pull-request permissions initially; Checks write permission is a separate opt-in.

- [ ] **Step 4: Handle only required events**

Process installation, installation_repositories, push, pull_request, check_suite/check_run where enabled, and repository rename/archive. Store delivery ID before processing. Verify signature using constant-time comparison. PR checks link the task receipt and knowledge diff but never publish raw prompts.

Extend onboarding so a workspace owner installs the GitHub App, selects one permitted repository, confirms read-only permissions, connects at least one local agent adapter, enters audit mode, and receives the first task receipt before any prompt transformation or PR write permission is offered.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/workspace/github/github.test.js
npm test --prefix mcp
git add mcp/vnext/workspace/github mcp/vnext/workspace/server.ts docs/integrations/github-app.md
git commit -m "feat: integrate Kage through a least-privilege GitHub App"
```

## Task 6: Aggregate privacy-safe team metrics and pilot reports

**Files:**
- Create: `mcp/vnext/workspace/metrics.ts`
- Create: `mcp/vnext/workspace/metrics.test.ts`
- Create: `mcp/vnext/workspace/pilot-report.ts`
- Create: `mcp/vnext/workspace/pilot-report.test.ts`
- Modify: `mcp/vnext/workspace/migrations/001_workspace.sql`
- Modify: `mcp/vnext/api/read-models.ts`
- Modify: `platform/web/src/pages/OverviewPage.tsx`

- [ ] **Step 1: Write failing exactness and minimum-cohort tests**

```ts
test("team report never derives exact savings from partial receipts", () => {
  const report = buildTeamMetrics([exactReceipt(-0.01), partialReceipt(), unavailableReceipt()]);
  assert.equal(report.exact_cost.receipts, 1);
  assert.equal(report.measurement_quality.partial, 1);
  assert.equal(report.measurement_quality.unavailable, 1);
});

test("outcome trend is hidden below the privacy cohort threshold", () => {
  const report = buildTeamMetrics(Array.from({ length: 4 }, () => fixtureTaskOutcome()));
  assert.equal(report.time_to_verified_change, null);
  assert.equal(report.suppression_reason, "minimum_cohort_5");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/metrics.test.js
```

- [ ] **Step 3: Store aggregated measurement records**

Sync exact request totals, quality class, latency, delivery status, knowledge IDs reused, verification outcome, and task timestamps. Do not sync prompt text, raw tool output, model response, file contents, or retrieved evidence bodies for metrics.

- [ ] **Step 4: Generate the audit/assist pilot comparison**

The report includes task counts, repositories, agents, measurement coverage, p50/p95 exact input-cost delta, p50/p95 latency, verified reuse, time-to-verified-change trend, review burden, failed-open rate, and caveats. It never converts cohort time trends into dollar savings unless the customer explicitly configures a cost model.

- [ ] **Step 5: Test and commit**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/metrics.test.js mcp/dist/vnext/workspace/pilot-report.test.js
npm test --prefix mcp
npm test --prefix platform/web
git add mcp/vnext/workspace mcp/vnext/api platform/web/src/pages/OverviewPage.tsx
git commit -m "feat: report privacy-safe team agent outcomes"
```

## Task 7: Add subscriptions, entitlements, and the no-overhead credit

**Files:**
- Create: `mcp/vnext/workspace/billing/types.ts`
- Create: `mcp/vnext/workspace/billing/entitlements.ts`
- Create: `mcp/vnext/workspace/billing/stripe.ts`
- Create: `mcp/vnext/workspace/billing/billing.test.ts`
- Modify: `mcp/vnext/workspace/migrations/001_workspace.sql`
- Modify: `mcp/vnext/workspace/server.ts`
- Create: `platform/web/src/pages/BillingPage.tsx`
- Create: `docs/commercial/no-overhead-pilot.md`

- [ ] **Step 1: Write failing idempotency and entitlement tests**

```ts
test("Stripe webhook is idempotent by event id", async () => {
  await handleStripeEvent(fixtureStripeEvent("evt_1"));
  await handleStripeEvent(fixtureStripeEvent("evt_1"));
  assert.equal(await billingEventCount("evt_1"), 1);
});

test("expired team entitlement keeps export and local operation available", () => {
  const access = resolveEntitlements(expiredSubscription());
  assert.equal(access.team_sync, false);
  assert.equal(access.workspace_export, true);
  assert.equal(access.local_runtime, true);
});

test("positive measured pilot overhead creates one usage credit", async () => {
  const result = await calculatePilotCredit(fixturePilot({ exact_net_cost_delta_usd: 12.50 }));
  assert.equal(result.credit_usd, 12.50);
  assert.equal(result.reason, "measured_positive_context_overhead");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/workspace/billing/billing.test.js
```

- [ ] **Step 3: Define plan entitlements**

```ts
export interface WorkspaceEntitlements {
  local_runtime: true;
  workspace_export: true;
  team_sync: boolean;
  team_review: boolean;
  github_checks: boolean;
  advanced_policy: boolean;
  sso: boolean;
  scim: boolean;
  self_host_support: boolean;
}
```

Local runtime and export are always true. Resolve paid features from stored active entitlement state, not from client-provided plan names.

Use this launch catalog as configurable server data, with Stripe product/price IDs supplied through deployment secrets rather than committed values:

```ts
export const LAUNCH_PLANS = {
  local: { usd_per_active_developer_month: 0, viewers_included: true },
  team: { usd_per_active_developer_month: 29, viewers_included: true },
  business: { usd_per_active_developer_month: 59, viewers_included: true },
  enterprise: { usd_per_active_developer_month: null, viewers_included: true },
} as const;
```

An active developer is a member who starts an agent task or performs a knowledge review during the billing month. Read-only viewers do not consume a paid seat. The catalog remains a launch hypothesis and can change for new subscriptions without rewriting historical invoices.

- [ ] **Step 4: Implement webhook-driven subscription state**

Verify Stripe signature against the raw body, store event ID before applying, and handle subscription status plus `entitlements.active_entitlement_summary.updated`. The portal can create checkout/customer-portal sessions, but access decisions use the workspace entitlement table. Pilot credits use only exact measured positive input cost plus Kage processing; unavailable/partial receipts do not create or reduce a credit. Apply the credit to the first paid invoice, capped at that invoice's platform fee, so the guarantee cannot create a cash liability beyond the customer's payment.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/workspace/billing/billing.test.js
npm test --prefix mcp
npm test --prefix platform/web
git add mcp/vnext/workspace/billing mcp/vnext/workspace/server.ts mcp/vnext/workspace/migrations platform/web/src/pages/BillingPage.tsx docs/commercial/no-overhead-pilot.md
git commit -m "feat: add Kage workspace billing and entitlements"
```

## Task 8: Add enterprise OIDC, SCIM, retention, and security controls

**Files:**
- Create: `mcp/vnext/workspace/enterprise/oidc.ts`
- Create: `mcp/vnext/workspace/enterprise/scim.ts`
- Create: `mcp/vnext/workspace/enterprise/retention.ts`
- Create: `mcp/vnext/workspace/enterprise/export-delete.ts`
- Create: `mcp/vnext/workspace/enterprise/enterprise.test.ts`
- Modify: `mcp/vnext/workspace/server.ts`
- Create: `docs/security/workspace-threat-model.md`
- Create: `docs/security/data-retention.md`

- [ ] **Step 1: Write failing OIDC, SCIM, and deletion tests**

```ts
test("OIDC callback validates issuer audience nonce state and signature", async () => {
  await assert.rejects(() => completeOidcLogin(fixtureIdToken({ audience: "wrong" })), /audience/);
  await assert.rejects(() => completeOidcLogin(fixtureIdToken({ nonce: "wrong" })), /nonce/);
});

test("SCIM deactivation revokes sessions without deleting audit history", async () => {
  await scimPatchUser(fixtureScimPatch({ active: false }));
  assert.equal(await activeSessionCount("user-1"), 0);
  assert.ok((await audit.forActor("user-1")).length > 0);
});

test("workspace deletion exports then removes tenant data and object keys", async () => {
  const result = await deleteWorkspace(workspaceFixture(), { confirmed_by: "owner-1" });
  assert.ok(result.export_path);
  assert.equal(await workspaceExists(result.workspace_id), false);
  assert.deepEqual(await objectKeysForWorkspace(result.workspace_id), []);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/enterprise/enterprise.test.js
```

- [ ] **Step 3: Implement standards boundaries**

OIDC uses discovery, authorization code with PKCE, signed ID-token validation, issuer/audience/nonce/state checks, and configured domain restrictions. SCIM exposes `/scim/v2/Users`, `/scim/v2/Groups`, `/scim/v2/ServiceProviderConfig`, `/scim/v2/ResourceTypes`, and `/scim/v2/Schemas` with `application/scim+json`; support GET, POST, PUT, PATCH, and DELETE according to the workspace membership model.

- [ ] **Step 4: Implement retention and deletion jobs**

Retention policies separately control raw evidence metadata, task receipts, aggregated metrics, audit, and approved knowledge. Deletion first creates a downloadable encrypted export, requires recent owner re-authentication, records a terminal audit event outside the deleted tenant partition, deletes object keys, then deletes relational rows in a transaction.

- [ ] **Step 5: Run security tests and commit**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/workspace/enterprise/enterprise.test.js
npm test --prefix mcp
git add mcp/vnext/workspace/enterprise mcp/vnext/workspace/server.ts docs/security
git commit -m "feat: add enterprise identity and data controls"
```

## Task 9: Package managed and self-hosted workspace operations

**Files:**
- Create: `deploy/workspace/Dockerfile`
- Create: `deploy/workspace/docker-compose.yml`
- Create: `deploy/workspace/entrypoint.sh`
- Create: `deploy/workspace/healthcheck.mjs`
- Create: `deploy/workspace/backup.sh`
- Create: `deploy/workspace/restore.sh`
- Create: `deploy/workspace/env.example`
- Create: `deploy/workspace/deploy.test.mjs`
- Create: `docs/deployment/workspace-self-hosted.md`
- Create: `docs/deployment/workspace-backup-restore.md`
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Write failing container and backup tests**

```js
test("workspace image starts only after migrations and health passes", async () => {
  const result = await runComposeFixture();
  assert.equal(result.migrationVersion, 1);
  assert.equal(result.health.ok, true);
});

test("backup restores knowledge audit and entitlements into an empty database", async () => {
  const restored = await backupRestoreRoundTrip(fixtureWorkspace());
  assert.equal(restored.claims, fixtureWorkspace().claims);
  assert.equal(restored.auditEvents, fixtureWorkspace().auditEvents);
  assert.equal(restored.entitlements, fixtureWorkspace().entitlements);
});
```

- [x] **Step 2: Run deployment tests and confirm failure**

```bash
node --test deploy/workspace/deploy.test.mjs
```

- [x] **Step 3: Build a non-root production image**

Use a pinned Node 22 base digest, multi-stage build, non-root runtime user, read-only root filesystem compatibility, `/healthz` health check, graceful SIGTERM, database migration before listen, and no source maps containing customer data.

- [x] **Step 4: Add tested backup and restore**

Back up PostgreSQL plus workspace object storage manifest, encrypt at rest, record schema/app version, and verify checksums. Restore refuses incompatible major schema without an explicit migration plan.

- [x] **Step 5: Run deployment verification and commit**

```bash
docker compose -f deploy/workspace/docker-compose.yml build
docker compose -f deploy/workspace/docker-compose.yml up -d
node --test deploy/workspace/deploy.test.mjs
docker compose -f deploy/workspace/docker-compose.yml down -v
git add deploy/workspace docs/deployment .github/workflows/ci.yml
git commit -m "ops: package Kage workspace deployment and recovery"
```

## Task 10: Cut over the default product surface and quarantine legacy tools

**Files:**
- Create: `mcp/vnext/migration/legacy-command-map.ts`
- Create: `mcp/vnext/migration/legacy-command-map.test.ts`
- Modify: `mcp/index.ts`
- Modify: `mcp/mcp.test.ts`
- Modify: `mcp/tool-coverage.test.ts`
- Modify: `mcp/cli.ts`
- Modify: `mcp/package.json`
- Create: `docs/migration/v4-command-map.md`
- Create: `docs/migration/v4-upgrade.md`

- [ ] **Step 1: Write failing default-surface and compatibility tests**

```ts
test("v4 default MCP surface is context retrieve and feedback", () => {
  const names = listTools().map((tool) => tool.name);
  assert.deepEqual(names, ["kage_context", "kage_retrieve", "kage_feedback"]);
});

test("legacy mode keeps old tools for one major version with deprecation metadata", () => {
  const names = listTools({ mode: "legacy" });
  assert.ok(names.some((tool) => tool.name === "kage_memory_timeline" && tool.description.includes("Deprecated")));
});

test("removed daily command points to one supported replacement", () => {
  const result = mapLegacyCommand(["memory-timeline", "--project", "."]);
  assert.deepEqual(result.replacement, ["open", "--project", "."]);
});
```

- [ ] **Step 2: Run tests and confirm the current oversized defaults fail**

```bash
npm run build --prefix mcp
node --test mcp/dist/mcp.test.js mcp/dist/vnext/migration/legacy-command-map.test.js
```

- [ ] **Step 3: Change the default MCP and CLI surfaces**

The v4 default MCP tools are exactly `kage_context`, `kage_retrieve`, and `kage_feedback`. `KAGE_TOOLS=legacy` exposes the old registry with deprecation descriptions through v4; `KAGE_TOOLS=full` remains an internal development alias during the transition.

Primary `kage help` shows:

```text
kage connect
kage status
kage open
kage doctor
kage export
kage migrate
```

Legacy commands remain callable through v4 when safe but are absent from primary help. Work-item orchestration, community registry, competitor audit, inferred savings, and diagnostic graph utilities are moved to `kage legacy ...` or removed when they have no safe migration value.

- [ ] **Step 4: Add deterministic replacement messaging and telemetry**

Every deprecated invocation prints one replacement command, a v5 removal notice, and a documentation link. Record only the deprecated command name and version locally; never record arguments that may contain private paths or query text. The migration report lists scripts/config files that still invoke legacy commands.

- [ ] **Step 5: Run compatibility tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/mcp.test.js mcp/dist/tool-coverage.test.js mcp/dist/vnext/migration/legacy-command-map.test.js
node mcp/dist/cli.js help
KAGE_TOOLS=legacy node --test --test-name-pattern "legacy mode" mcp/dist/mcp.test.js
npm test --prefix mcp
git add mcp/vnext/migration mcp/index.ts mcp/mcp.test.ts mcp/tool-coverage.test.ts mcp/cli.ts mcp/package.json docs/migration
git commit -m "feat: make the focused vNext surface the default"
```

## Task 11: Run design-partner pilots and enforce the Phase E/GA gate

**Files:**
- Create: `mcp/vnext/phase-e-gate.test.ts`
- Create: `scripts/vnext-phase-e-report.mjs`
- Create: `docs/commercial/design-partner-pilot.md`
- Create: `docs/commercial/ga-checklist.md`
- Modify: `docs/migration/v4-upgrade.md`
- Modify: `mcp/package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing end-to-end team gate**

The test creates two workspaces, three users, two local replicas, one GitHub installation fixture, one billing fixture, and one restricted repository. Assert:

```ts
assert.equal(result.cross_tenant_reads, 0);
assert.equal(result.raw_payloads_synced, 0);
assert.equal(result.self_approvals, 0);
assert.equal(result.duplicate_sync_records, 0);
assert.equal(result.invalid_webhooks_accepted, 0);
assert.equal(result.local_context_available_during_workspace_outage, true);
assert.equal(result.export_available_after_entitlement_expiry, true);
```

- [ ] **Step 2: Run the gate and confirm the first failure**

```bash
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" npm run build --prefix mcp
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/phase-e-gate.test.js
```

- [ ] **Step 3: Execute the pilot protocol**

For each of at least three design partners:

1. Obtain written repository/data permission and identify the buyer and success owner.
2. Run seven audit days.
3. Review measurement coverage and exclude unsupported agent surfaces from exact savings.
4. Run fourteen assist days with protect mode enabled.
5. Measure exact request economics, verified reuse, time-to-verified-change trend, review burden, attach reliability, and security incidents.
6. Conduct developer, reviewer, and lead interviews.
7. Offer Team pricing in the validated USD 24–30 active-developer range.
8. Record paid conversion, rejection reason, or required product change.

- [ ] **Step 4: Generate the GA decision report**

`vnext-phase-e-report.mjs` must include every Gate A–E result, pilot cohort distributions, exactness coverage, security/load/restore results, design-partner conversion, open critical issues, and kill criteria. It exits non-zero if any required gate fails.

- [ ] **Step 5: Run final verification and commit**

```bash
npm test --prefix mcp
npm test --prefix platform/web
npm run test:e2e --prefix platform/web
KAGE_TEST_DATABASE_URL="$KAGE_TEST_DATABASE_URL" node --test mcp/dist/vnext/phase-e-gate.test.js
node --test deploy/workspace/deploy.test.mjs
node scripts/vnext-phase-e-report.mjs --project . --json
node mcp/dist/cli.js migrate plan --project . --json
node mcp/dist/cli.js refresh --project . --json
node mcp/dist/cli.js pr check --project . --json
git add mcp/vnext/phase-e-gate.test.ts scripts/vnext-phase-e-report.mjs docs/commercial docs/migration/v4-upgrade.md mcp/package.json .github/workflows/ci.yml
git commit -m "test: enforce Kage vNext commercial readiness gate"
```

## Phase E completion gate

Do not launch v4 GA until:

- Cross-tenant, repository, and path-permission isolation tests pass.
- Raw prompts/tool payloads remain local unless an explicit evidence policy permits sync.
- GitHub signatures, least-privilege permissions, installation-token expiry, and delivery idempotency pass.
- Review authority and self-approval prevention pass.
- Stripe webhook idempotency and server-side entitlements pass.
- OIDC/SCIM tests pass for enterprise-enabled plans.
- Backup/restore, export/delete, retention, and workspace-outage local operation are exercised.
- Three design partners complete pilots and at least one accepts paid terms.
- The pilot report proves Kage does not increase exact measured context cost over the enabled cohort or issues the documented credit.
