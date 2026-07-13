# Kage vNext Phase C: Knowledge Portal and Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the packet/graph diagnostic viewer with a feature-first knowledge portal for system understanding, runbooks, decisions, review, agent-task receipts, costs, and integration health.

**Architecture:** Add stable local read/mutation APIs over the Phase B repository model, then build a separate React/Vite application consuming those APIs. The portal uses task-oriented 2D SVG maps and list equivalents, keeps internal graph/storage diagnostics in an admin area, and never participates in the context-delivery critical path.

**Tech Stack:** TypeScript, Node.js local API, React with TypeScript, Vite, native `fetch`, semantic HTML/CSS, Node test runner for backend read models, Vitest with Testing Library for components, and Playwright for browser journeys. React's official TypeScript guidance and build-tool guidance support this choice: <https://react.dev/learn/typescript> and <https://react.dev/learn/build-a-react-app-from-scratch>.

---

## Task 1: Add portal read-model APIs

**Files:**
- Create: `mcp/vnext/api/types.ts`
- Create: `mcp/vnext/api/read-models.ts`
- Create: `mcp/vnext/api/router.ts`
- Create: `mcp/vnext/api/router.test.ts`
- Modify: `mcp/vnext/runtime/server.ts`

- [ ] **Step 1: Write failing overview, feature, map, and receipt API tests**

```ts
test("overview exposes formulas and source links for every metric", async () => {
  const response = await apiRequest("GET", "/v2/overview");
  assert.equal(response.status, 200);
  for (const metric of response.body.metrics) {
    assert.ok(metric.formula.length > 0);
    assert.ok(metric.source_path.length > 0);
    assert.notEqual(metric.value, undefined);
  }
});

test("feature endpoint excludes stale claims from current truth and reports them in health", async () => {
  const response = await apiRequest("GET", "/v2/features/authentication");
  assert.equal(response.body.current_claims.some((claim: { trust_state: string }) => claim.trust_state === "stale"), false);
  assert.equal(response.body.health.stale, 1);
});
```

- [ ] **Step 2: Run backend API tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/router.test.js
```

Expected: missing API router.

- [ ] **Step 3: Define stable portal DTOs**

```ts
export interface MetricDto {
  id: "net_context_cost" | "verified_reuse" | "time_to_verified_change" | "understanding_coverage" | "attach_reliability" | "open_contradictions" | "stale_critical" | "runbook_health";
  label: string;
  value: number | null;
  unit: "usd" | "percent" | "milliseconds" | "count";
  exactness: "exact" | "cohort" | "structural" | "unavailable";
  formula: string;
  source_path: string;
  trend: number | null;
}

export interface OverviewDto {
  repository: { id: string; name: string; branch: string | null; commit: string | null };
  metrics: MetricDto[];
  attention: Array<{ id: string; kind: "review" | "stale" | "integration" | "cost"; title: string; severity: "info" | "warning" | "critical"; href: string }>;
  integrations: Array<{ id: string; name: string; state: "healthy" | "degraded" | "passthrough" | "disconnected"; last_success_at: string | null }>;
}
```

- [ ] **Step 4: Add only the portal v1 routes**

```text
GET  /v2/overview
GET  /v2/system-map?view=feature|runtime|sequence|ownership|impact
GET  /v2/features
GET  /v2/features/:slug
GET  /v2/components/:slug
GET  /v2/flows/:slug
GET  /v2/runbooks/:slug
GET  /v2/decisions/:slug
GET  /v2/review-items
GET  /v2/tasks
GET  /v2/tasks/:taskId
GET  /v2/integrations
```

Reuse the Phase A machine-token authentication locally. Do not expose raw event payloads through these routes.

- [ ] **Step 5: Run API tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/router.test.js mcp/dist/vnext/runtime/server.test.js
npm test --prefix mcp
git add mcp/vnext/api mcp/vnext/runtime/server.ts
git commit -m "feat: expose repository knowledge read APIs"
```

## Task 2: Scaffold the typed portal application

**Files:**
- Create: `platform/web/package.json`
- Create: `platform/web/tsconfig.json`
- Create: `platform/web/vite.config.ts`
- Create: `platform/web/index.html`
- Create: `platform/web/src/main.tsx`
- Create: `platform/web/src/App.tsx`
- Create: `platform/web/src/api/client.ts`
- Create: `platform/web/src/api/types.ts`
- Create: `platform/web/src/test/setup.ts`
- Create: `platform/web/src/App.test.tsx`
- Modify: `.gitignore`

- [ ] **Step 1: Create package scripts and dependencies**

```json
{
  "name": "@kage-core/knowledge-portal",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

Resolve and commit exact versions through `npm install`; do not hand-edit the resulting lockfile.

- [ ] **Step 2: Write the failing shell render test**

```tsx
test("renders repository navigation and a loading status", () => {
  render(<App api={fakeApi.pending()} />);
  expect(screen.getByRole("navigation", { name: "Repository knowledge" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading repository knowledge");
});
```

- [ ] **Step 3: Run the test and confirm failure**

```bash
npm install --prefix platform/web
npm test --prefix platform/web
```

Expected: failure because the application shell is absent.

- [ ] **Step 4: Implement a typed API client and minimal application**

```ts
export class KageApi {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: { authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error(`Kage API ${response.status}`);
    return response.json() as Promise<T>;
  }
}
```

Copy protocol DTOs through a generated JSON schema or a checked type-sync script. Do not manually allow backend and frontend types to drift.

- [ ] **Step 5: Build, test, and commit**

```bash
npm test --prefix platform/web
npm run build --prefix platform/web
git add platform/web .gitignore
git commit -m "feat: scaffold Kage knowledge portal"
```

## Task 3: Build design tokens, shell, routing, and accessible navigation

**Files:**
- Create: `platform/web/src/styles/tokens.css`
- Create: `platform/web/src/styles/global.css`
- Create: `platform/web/src/components/AppShell.tsx`
- Create: `platform/web/src/components/RepositorySwitcher.tsx`
- Create: `platform/web/src/components/StatusBadge.tsx`
- Create: `platform/web/src/router.ts`
- Create: `platform/web/src/components/AppShell.test.tsx`
- Create: `platform/web/src/pages/OnboardingPage.tsx`
- Create: `platform/web/src/pages/OnboardingPage.test.tsx`
- Modify: `platform/web/src/App.tsx`

- [ ] **Step 1: Write failing keyboard and status tests**

```tsx
test("primary navigation exposes the product information architecture", () => {
  render(<AppShell repository={fixtureRepository()} route="/overview"><div /></AppShell>);
  for (const label of ["Overview", "System Map", "Features", "Components", "Flows", "Runbooks", "Decisions", "Review Queue", "Agent Tasks", "Costs and Outcomes", "Integrations", "Settings"]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});

test("integration state is not conveyed by color alone", () => {
  render(<StatusBadge state="degraded" />);
  expect(screen.getByText("Degraded but attaching")).toBeInTheDocument();
});

test("onboarding starts in audit mode and explains when requests will change", async () => {
  render(<OnboardingPage detectedRepository={fixtureRepository()} />);
  expect(screen.getByText("Audit mode")).toBeInTheDocument();
  expect(screen.getByText(/does not modify agent requests/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Connect repository" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm test --prefix platform/web -- --run src/components/AppShell.test.tsx
```

- [ ] **Step 3: Add semantic tokens**

Use CSS custom properties for background, surface, text, muted text, border, focus, success, warning, critical, accent, spacing, radius, typography, and shadows. Maintain minimum AA contrast and a visible `:focus-visible` outline. Status components include icon, text, and accessible label.

- [ ] **Step 4: Implement history-based routing without a routing dependency**

```ts
export type Route =
  | { page: "overview" }
  | { page: "system-map"; view: string }
  | { page: "feature"; slug: string }
  | { page: "runbook"; slug: string }
  | { page: "decision"; slug: string }
  | { page: "review" }
  | { page: "task"; id: string }
  | { page: "integrations" }
  | { page: "settings" };
```

Unknown routes render a useful not-found page with a link to Overview.

Implement local onboarding as four explicit steps: confirm detected repository, choose supported agent adapters, start the daemon in audit mode, and wait for the first health/measurement receipt. Do not ask for a team account or GitHub write permission in the local flow. Phase E extends this page with managed workspace and GitHub App installation.

- [ ] **Step 5: Test and commit**

```bash
npm test --prefix platform/web
npm run build --prefix platform/web
git add platform/web/src
git commit -m "feat: add accessible knowledge portal shell"
```

## Task 4: Implement the overview and metric explanations

**Files:**
- Create: `platform/web/src/pages/OverviewPage.tsx`
- Create: `platform/web/src/components/MetricCard.tsx`
- Create: `platform/web/src/components/AttentionQueue.tsx`
- Create: `platform/web/src/components/IntegrationStrip.tsx`
- Create: `platform/web/src/pages/OverviewPage.test.tsx`

- [ ] **Step 1: Write failing honesty tests**

```tsx
test("unavailable cost is displayed as unavailable instead of zero", () => {
  render(<MetricCard metric={fixtureMetric({ id: "net_context_cost", value: null, exactness: "unavailable" })} />);
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
});

test("metric explanation exposes formula and source", async () => {
  render(<MetricCard metric={fixtureMetric()} />);
  await userEvent.click(screen.getByRole("button", { name: /how this is measured/i }));
  expect(screen.getByText(/formula/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view source records/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm test --prefix platform/web -- --run src/pages/OverviewPage.test.tsx
```

- [ ] **Step 3: Build the overview hierarchy**

Render repository/branch/commit at the top, then four primary cards—net context cost, verified reuse, time to verified change, understanding coverage—followed by attach reliability, contradictions, stale critical claims, and runbook health. Below metrics, show attention items and integration states.

- [ ] **Step 4: Add exactness labels**

Use visible labels `Exact request measurement`, `Cohort trend`, `Structural coverage`, or `Unavailable`. Never combine exact dollar savings and cohort time outcomes into one total ROI number.

- [ ] **Step 5: Test and commit**

```bash
npm test --prefix platform/web
npm run build --prefix platform/web
git add platform/web/src/pages/OverviewPage.tsx platform/web/src/pages/OverviewPage.test.tsx platform/web/src/components
git commit -m "feat: show honest repository value overview"
```

## Task 5: Implement task-oriented system maps with list equivalents

**Files:**
- Create: `mcp/vnext/api/system-map.ts`
- Create: `mcp/vnext/api/system-map.test.ts`
- Create: `platform/web/src/pages/SystemMapPage.tsx`
- Create: `platform/web/src/components/SystemMapSvg.tsx`
- Create: `platform/web/src/components/SystemMapTable.tsx`
- Create: `platform/web/src/components/InspectorPanel.tsx`
- Create: `platform/web/src/pages/SystemMapPage.test.tsx`

- [ ] **Step 1: Write failing deterministic layout and accessibility tests**

```ts
test("feature map uses stable lanes and ordering", () => {
  const first = buildSystemMap(fixtureModel(), "feature");
  const second = buildSystemMap(fixtureModel(), "feature");
  assert.deepEqual(first, second);
  assert.deepEqual(first.lanes.map((lane) => lane.kind), ["feature", "flow", "component", "contract", "data_model", "owner"]);
});
```

```tsx
test("system map has a table with the same nodes and relations", () => {
  render(<SystemMapPage model={fixtureSystemMap()} />);
  expect(screen.getByRole("table", { name: "System map list" })).toBeInTheDocument();
  expect(screen.getAllByText("Authentication").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run backend and frontend tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/system-map.test.js
npm test --prefix platform/web -- --run src/pages/SystemMapPage.test.tsx
```

- [ ] **Step 3: Build server-side layered coordinates**

Return stable nodes with `x`, `y`, `lane`, kind, label, health, and href plus typed edges. Layout order uses canonical name and stable ID as tiebreakers. Limit the initial view to two hops and provide expand actions instead of rendering the entire repository.

- [ ] **Step 4: Render SVG and table views**

The SVG supports pan, zoom, keyboard node traversal, selection, and an inspector. It does not use force simulation or 3D. The table view contains equivalent nodes, upstream/downstream relations, and links.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/system-map.test.js
npm test --prefix platform/web
npm run build --prefix platform/web
git add mcp/vnext/api platform/web/src
git commit -m "feat: add task-oriented repository system map"
```

## Task 6: Implement feature, runbook, and decision pages

**Files:**
- Create: `platform/web/src/pages/FeaturePage.tsx`
- Create: `platform/web/src/pages/RunbookPage.tsx`
- Create: `platform/web/src/pages/DecisionPage.tsx`
- Create: `platform/web/src/components/EvidenceList.tsx`
- Create: `platform/web/src/components/KnowledgeHealth.tsx`
- Create: `platform/web/src/pages/KnowledgePages.test.tsx`

- [ ] **Step 1: Write failing current-truth and evidence tests**

```tsx
test("feature page leads with purpose flow invariants tests and runbooks", () => {
  render(<FeaturePage feature={fixtureFeature()} />);
  for (const heading of ["Purpose", "Flow", "Invariants", "Verification", "Runbooks", "Recent changes", "Knowledge health"]) {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  }
});

test("runbook marks missing successful execution evidence", () => {
  render(<RunbookPage runbook={fixtureRunbook({ last_successful_execution: null })} />);
  expect(screen.getByText("No successful execution has been recorded")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm test --prefix platform/web -- --run src/pages/KnowledgePages.test.tsx
```

- [ ] **Step 3: Implement feature page sections**

Use the exact information order from the approved specification. Current verified/approved truth is primary. Proposed, stale, disputed, superseded, and historical content appears in separately labeled panels.

- [ ] **Step 4: Implement runbook and decision safety details**

Runbooks show prerequisites, environment, safety class, steps, expected output, rollback, escalation, owner, last success, and invalidation triggers. Decisions show status, rationale, alternatives, affected entities, evidence, supersession, and approver.

- [ ] **Step 5: Test and commit**

```bash
npm test --prefix platform/web
npm run build --prefix platform/web
git add platform/web/src/pages platform/web/src/components
git commit -m "feat: add feature runbook and decision knowledge pages"
```

## Task 7: Implement the review queue and authorized mutations

**Files:**
- Create: `mcp/vnext/api/review.ts`
- Create: `mcp/vnext/api/review.test.ts`
- Modify: `mcp/vnext/api/router.ts`
- Create: `platform/web/src/pages/ReviewQueuePage.tsx`
- Create: `platform/web/src/components/KnowledgeDiff.tsx`
- Create: `platform/web/src/pages/ReviewQueuePage.test.tsx`

- [ ] **Step 1: Write failing self-approval and contradiction tests**

```ts
test("high-impact claim cannot be approved by its proposer", async () => {
  const response = await reviewRequest("approve", { actor: "alice", proposed_by: "alice", role: "owner" });
  assert.equal(response.status, 403);
  assert.equal(response.body.error, "self_approval_blocked");
});

test("accepting one contradiction supersedes the opposing current claim", async () => {
  const result = await decideContradiction(fixtureContradiction(), { action: "accept", actor: "owner-bob" });
  assert.equal(result.accepted.trust_state, "approved");
  assert.equal(result.replaced.trust_state, "superseded");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/review.test.js
npm test --prefix platform/web -- --run src/pages/ReviewQueuePage.test.tsx
```

- [ ] **Step 3: Add review mutations**

```text
POST /v2/review-items/:id/accept
POST /v2/review-items/:id/edit-and-accept
POST /v2/review-items/:id/reject
POST /v2/review-items/:id/supersede
POST /v2/review-items/:id/assign
POST /v2/review-items/:id/request-evidence
```

Each mutation requires actor identity, expected review-item version, decision note, and local authorization. Use optimistic concurrency; return `409` on version drift.

- [ ] **Step 4: Build evidence-first review UX**

Show current knowledge, proposed change, reason, supporting/contradicting evidence, affected entities, required role, impact, and audit history. Disable actions the current user cannot perform and explain why.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/review.test.js
npm test --prefix platform/web
npm run build --prefix platform/web
git add mcp/vnext/api platform/web/src
git commit -m "feat: add evidence-backed knowledge review queue"
```

## Task 8: Implement agent task and cost receipts

**Files:**
- Create: `mcp/vnext/api/task-receipts.ts`
- Create: `mcp/vnext/api/task-receipts.test.ts`
- Create: `platform/web/src/pages/AgentTasksPage.tsx`
- Create: `platform/web/src/pages/TaskReceiptPage.tsx`
- Create: `platform/web/src/components/CostBreakdown.tsx`
- Create: `platform/web/src/pages/TaskReceiptPage.test.tsx`

- [ ] **Step 1: Write failing exactness and provenance tests**

```tsx
test("receipt separates exact request savings from outcome trends", () => {
  render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
  expect(screen.getByRole("heading", { name: "Exact request measurements" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Task outcomes" })).toBeInTheDocument();
  expect(screen.queryByText(/total value created/i)).not.toBeInTheDocument();
});

test("receipt links every injected section to evidence", () => {
  render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
  expect(screen.getAllByRole("link", { name: /view evidence/i }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/task-receipts.test.js
npm test --prefix platform/web -- --run src/pages/TaskReceiptPage.test.tsx
```

- [ ] **Step 3: Build task receipt aggregation**

Aggregate deliveries, transformations, provider usage, Kage processing, verification, minimal-change findings, and knowledge changes by `task_id`. Keep request-level rows accessible. Calculate exact net input cost only for receipts with exact counts and a valid price snapshot.

- [ ] **Step 4: Render the receipt timeline**

Timeline events include task start, capsule delivery, tool transformations, evidence retrieval, verification, knowledge proposal, review status, and task outcome. Missing data appears as unavailable, not omitted in a way that implies success.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/task-receipts.test.js
npm test --prefix platform/web
npm run build --prefix platform/web
git add mcp/vnext/api platform/web/src
git commit -m "feat: show auditable agent task value receipts"
```

## Task 9: Add live updates, admin diagnostics, browser tests, and Phase C gate

**Files:**
- Create: `mcp/vnext/api/events.ts`
- Create: `mcp/vnext/api/events.test.ts`
- Create: `platform/web/src/pages/IntegrationsPage.tsx`
- Create: `platform/web/src/pages/SettingsPage.tsx`
- Create: `platform/web/src/pages/AdminDiagnosticsPage.tsx`
- Create: `platform/web/playwright.config.ts`
- Create: `platform/web/e2e/onboarding.spec.ts`
- Create: `platform/web/e2e/review.spec.ts`
- Create: `platform/web/e2e/runbook.spec.ts`
- Create: `platform/web/e2e/receipt.spec.ts`
- Create: `mcp/vnext/phase-c-gate.test.ts`
- Modify: `mcp/daemon.ts`
- Modify: `mcp/package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write failing SSE and browser journeys**

SSE test asserts `review_item_created`, `claim_updated`, `task_receipt_updated`, and `integration_state_changed` events include identifiers but no raw prompt text.

Playwright review journey:

```ts
test("owner reviews a high-impact decision with evidence", async ({ page }) => {
  await page.goto("/review");
  await page.getByRole("link", { name: "Authentication session decision" }).click();
  await expect(page.getByRole("heading", { name: "Supporting evidence" })).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByLabel("Decision note").fill("Matches the current auth implementation and tests.");
  await page.getByRole("button", { name: "Confirm acceptance" }).click();
  await expect(page.getByText("Approved")).toBeVisible();
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/events.test.js
npm test --prefix platform/web
npm run test:e2e --prefix platform/web
```

- [ ] **Step 3: Add live updates and admin separation**

Serve `/v2/events` as authenticated SSE with heartbeat and resume ID. Integration/settings pages show adapter configuration, privacy modes, budgets, retention, and health. Packet files, raw graph edges, compiler checkpoints, and database diagnostics appear only under `/admin/diagnostics`.

- [ ] **Step 4: Serve the built portal from the daemon**

The daemon serves `platform/web/dist` under `/app/`, redirects `kage open` there, applies the existing security headers, and keeps the legacy viewer under `/viewer/` during the compatibility release.

- [ ] **Step 5: Run Phase C verification and commit**

```bash
npm run build --prefix mcp
npm test --prefix mcp
npm test --prefix platform/web
npm run build --prefix platform/web
npm run test:e2e --prefix platform/web
node --test mcp/dist/vnext/phase-c-gate.test.js
node mcp/dist/cli.js refresh --project . --json
node mcp/dist/cli.js pr check --project . --json
git add mcp/vnext/api mcp/vnext/phase-c-gate.test.ts mcp/daemon.ts mcp/package.json platform/web .github/workflows/ci.yml
git commit -m "test: enforce Kage vNext Phase C portal gate"
```

## Phase C completion gate

Do not replace the legacy viewer by default until:

- Overview metrics expose formulas, exactness, and source records.
- System maps have equivalent accessible tables.
- Feature, runbook, and decision pages show current truth separately from history or uncertainty.
- Review mutations enforce role, version, and self-approval boundaries.
- Task receipts separate exact request economics from cohort outcomes.
- Playwright onboarding, review, runbook, receipt, keyboard, and degraded-daemon journeys pass.
