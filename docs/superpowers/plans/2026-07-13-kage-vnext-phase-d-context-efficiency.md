# Kage vNext Phase D: Context Budget Engine and Minimal Change Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kage net-negative context overhead through cache-aware, type-specific, reversible transformations and guide agents toward the smallest repository-native change without allowing model opinion to block work.

**Architecture:** Insert a deterministic transformation pipeline between Phase B context composition and provider-specific gateway adapters. Store exact originals in a local content-addressed store, attach retrieval references to every lossy transform, enforce budgets from measured receipts, and add repository-specific preflight/post-diff policy findings. The existing proxy remains byte-preserving on failure and the built-in compressors remain the default.

**Tech Stack:** TypeScript, Node.js, `node:crypto`, filesystem content-addressed storage, existing proxy, Phase A receipts, Phase B repository model, Git diffs, Node test runner, and portal task receipts. The design follows transparent, live-zone, reversible-compression patterns documented by Headroom without making it a required dependency: <https://headroomlabs-ai.github.io/headroom/ARCHITECTURE/>.

---

## Task 1: Add the reversible content-addressed evidence store

**Files:**
- Create: `mcp/vnext/gateway/content-store.ts`
- Create: `mcp/vnext/gateway/content-store.test.ts`
- Modify: `mcp/vnext/runtime/paths.ts`

- [ ] **Step 1: Write failing identity, retrieval, corruption, and retention tests**

```ts
test("same bytes produce one stable retrieval id", () => {
  const store = fixtureContentStore();
  const first = store.put(Buffer.from("full test output"), { media_type: "text/plain", task_id: "task-1" });
  const second = store.put(Buffer.from("full test output"), { media_type: "text/plain", task_id: "task-1" });
  assert.equal(first.retrieval_id, second.retrieval_id);
  assert.equal(store.get(first.retrieval_id).body.toString("utf8"), "full test output");
});

test("tampered content is rejected on retrieval", () => {
  const store = fixtureContentStore();
  const saved = store.put(Buffer.from("original"), fixtureMetadata());
  overwriteStoredBody(saved.retrieval_id, Buffer.from("tampered"));
  assert.throws(() => store.get(saved.retrieval_id), /fingerprint mismatch/);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/content-store.test.js
```

- [ ] **Step 3: Define the stored-object contract**

```ts
export interface StoredContentMetadata {
  retrieval_id: string;
  sha256: string;
  byte_length: number;
  media_type: string;
  task_id: string;
  privacy_class: "local_raw";
  created_at: string;
  expires_at: string;
}

export interface StoredContent {
  metadata: StoredContentMetadata;
  body: Buffer;
}
```

The retrieval ID is `kage-content:<sha256>`. Store objects beneath `.agent_memory/content/sha256/<first-two>/<hash>` and metadata beside the object. Write with a temporary file plus atomic rename and mode `0600`.

- [ ] **Step 4: Implement bounded retention**

Default raw evidence retention is seven days. Approved evidence is copied through the repository-model evidence policy, not retained by extending raw task content indefinitely. Garbage collection never deletes content referenced by an active task receipt before its retention deadline.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/content-store.test.js
npm test --prefix mcp
git add mcp/vnext/gateway/content-store.ts mcp/vnext/gateway/content-store.test.ts mcp/vnext/runtime/paths.ts
git commit -m "feat: add reversible context content store"
```

## Task 2: Implement deterministic type-specific compressors

**Files:**
- Create: `mcp/vnext/gateway/compressors/types.ts`
- Create: `mcp/vnext/gateway/compressors/provider.ts`
- Create: `mcp/vnext/gateway/compressors/logs.ts`
- Create: `mcp/vnext/gateway/compressors/json.ts`
- Create: `mcp/vnext/gateway/compressors/test-output.ts`
- Create: `mcp/vnext/gateway/compressors/diff.ts`
- Create: `mcp/vnext/gateway/compressors/stack-trace.ts`
- Create: `mcp/vnext/gateway/compressors/compressors.test.ts`

- [ ] **Step 1: Write failing golden tests for each payload class**

```ts
test("log compressor folds repeated lines but preserves first last and errors", () => {
  const result = compressLogs(fixtureRepeatedLogs());
  assert.match(result.output, /repeated 98 times/);
  assert.match(result.output, /first startup line/);
  assert.match(result.output, /final shutdown line/);
  assert.match(result.output, /ERROR database unavailable/);
});

test("JSON compressor preserves errors ids statuses and schema", () => {
  const result = compressJson(fixtureLargeJson());
  assert.match(result.output, /request_id/);
  assert.match(result.output, /status/);
  assert.match(result.output, /error/);
  assert.equal(result.lossy, true);
});

test("diff compressor keeps every changed hunk header", () => {
  const result = compressDiff(fixtureLargeDiff());
  for (const header of ["@@ -10,3 +10,4 @@", "@@ -200,5 +201,5 @@"]) assert.match(result.output, new RegExp(escapeRegExp(header)));
});

test("compressors fail open on arbitrary UTF-8 payloads", () => {
  for (let index = 0; index < 200; index += 1) {
    const body = `${String.fromCodePoint(32 + (index % 90))}`.repeat(index * 13);
    for (const compressor of builtinCompressors()) assert.doesNotThrow(() => compressor.compress({ body, media_type: "text/plain", task_id: "task-fuzz", token_budget: 500 }));
  }
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/compressors/compressors.test.js
```

- [ ] **Step 3: Define a uniform transform contract**

```ts
export interface CompressionInput {
  body: string;
  media_type: string;
  task_id: string;
  token_budget: number;
}

export interface CompressionResult {
  compressor: "logs" | "json" | "test_output" | "diff" | "stack_trace" | "none";
  output: string;
  lossy: boolean;
  original_bytes: number;
  output_bytes: number;
  warnings: string[];
}

export interface Compressor {
  supports(input: CompressionInput): boolean;
  compress(input: CompressionInput): CompressionResult;
}

export interface CompressorProvider {
  provider_id: string;
  compressors(): Compressor[];
  health(): Promise<{ ok: boolean; reason: string }>;
}
```

- [ ] **Step 4: Implement conservative preservation rules**

- Logs preserve all error/fatal/panic lines, first/last occurrences, timestamps around errors, and unique lines.
- JSON preserves object shape, keys, IDs, statuses, errors, counts, and the first/last array items; invalid JSON returns `none`.
- Test output groups identical failure signatures but preserves failing test names, locations, assertions, and summary counts.
- Diffs preserve filenames, modes, every hunk header, added/removed lines, and configurable context; binary diffs are not transformed.
- Stack traces preserve the root message, first application frames, boundary frames, and unique caused-by chains.

Register deterministic built-ins through `CompressorProvider`. An external provider uses the same interface but remains disabled unless repository policy selects it and its privacy, license, latency, retrieval, and golden-output checks pass. No external compressor is a core runtime dependency.

- [ ] **Step 5: Run golden and fuzz tests, then commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/compressors/compressors.test.js
npm test --prefix mcp
git add mcp/vnext/gateway/compressors
git commit -m "feat: add deterministic context compressors"
```

## Task 3: Add the budget decision engine

**Files:**
- Create: `mcp/vnext/gateway/budget-policy.ts`
- Create: `mcp/vnext/gateway/budget-engine.ts`
- Create: `mcp/vnext/gateway/budget-engine.test.ts`
- Modify: `mcp/vnext/runtime/config.ts`

- [ ] **Step 1: Write failing budget and automatic-backoff tests**

```ts
test("budget keeps Kage additions below the configured task share", () => {
  const decision = decideBudget(fixtureBudgetInput({ context_window: 100_000, requested_capsule_tokens: 8_000 }), fixturePolicy({ max_context_share: 0.01 }));
  assert.equal(decision.capsule_token_budget, 1_000);
});

test("positive cost and latency cohort enters protect mode", () => {
  const decision = decideMode(fixtureCohort({ p50_net_cost_delta_usd: 0.02, p95_latency_ms: 220 }), fixturePolicy({ max_p95_latency_ms: 150 }));
  assert.equal(decision.mode, "protect");
  assert.ok(decision.disabled_features.includes("optional_context"));
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/budget-engine.test.js
```

- [ ] **Step 3: Define explicit policy**

```ts
export interface ContextBudgetPolicy {
  mode: "off" | "audit" | "assist" | "protect";
  default_capsule_tokens: number;
  max_capsule_tokens: number;
  max_context_share: number;
  max_p95_latency_ms: number;
  min_payload_tokens_for_compression: number;
  lossy_compression: boolean;
  raw_content_retention_days: number;
  protect_window_tasks: number;
}
```

Default values: audit mode, 800 default capsule tokens, 1,200 maximum, 2% maximum context share, 150 ms p95 local transformation latency, 500-token minimum payload, lossy compression disabled until retrieval tests pass, seven-day raw retention, and 30-task protect window.

- [ ] **Step 4: Implement degradation order**

When cost or latency fails, disable in this order:

1. Optional orientation.
2. Historical decisions.
3. Lossy compression.
4. Non-critical feature context.
5. All context except critical invariants and verification contract.
6. Full passthrough.

Never remove a critical safety invariant to retain a lower-priority feature summary.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/budget-engine.test.js
npm test --prefix mcp
git add mcp/vnext/gateway mcp/vnext/runtime/config.ts
git commit -m "feat: enforce context cost and latency budgets"
```

## Task 4: Build the cache-aware transformation pipeline

**Files:**
- Create: `mcp/vnext/gateway/live-zone.ts`
- Create: `mcp/vnext/gateway/transform.ts`
- Create: `mcp/vnext/gateway/transform.test.ts`

- [ ] **Step 1: Write failing prefix and reversibility tests**

```ts
test("transform preserves system tools and older turns byte-for-byte", async () => {
  const request = fixtureProviderRequest();
  const result = await transformRequest(request, fixtureTransformContext());
  assert.deepEqual(result.request.system, request.system);
  assert.deepEqual(result.request.tools, request.tools);
  assert.deepEqual(result.request.messages.slice(0, -1), request.messages.slice(0, -1));
});

test("every lossy transform includes a retrievable exact original", async () => {
  const store = fixtureContentStore();
  const result = await transformToolResult(fixtureLargeToolResult(), fixtureTransformContext({ lossy: true, store }));
  assert.match(result.output, /kage-content:[a-f0-9]{64}/);
  const id = result.retrieval_ids[0];
  assert.deepEqual(store.get(id).body, fixtureLargeToolResult().body);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/transform.test.js
```

- [ ] **Step 3: Define live-zone boundaries per adapter**

```ts
export interface LiveZone {
  stable_prefix_end: number;
  mutable_start: number;
  mutable_end: number;
  injection_location: "system" | "user_turn" | "tool_result";
}
```

The Anthropic proxy marks system/tools/older messages stable and the final user message mutable. Native hooks declare their supported injection point during handshake. Unknown adapters receive no mutation.

- [ ] **Step 4: Implement transformations in deterministic order**

1. Detect live zone.
2. Deduplicate already delivered content by capsule/evidence ID.
3. Budget capsule sections.
4. Detect eligible tool payloads.
5. Store original before lossy transformation.
6. Compress.
7. Attach retrieval references.
8. Recount exact tokens where supported.
9. Enforce final budget.
10. Produce receipt and transformed bytes.

If any step fails, return original bytes plus a failed-open receipt.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/transform.test.js
npm test --prefix mcp
git add mcp/vnext/gateway/live-zone.ts mcp/vnext/gateway/transform.ts mcp/vnext/gateway/transform.test.ts
git commit -m "feat: transform only cache-safe live context"
```

## Task 5: Integrate assist/protect modes with the Anthropic proxy

**Files:**
- Create: `mcp/vnext/gateway/providers/provider.ts`
- Create: `mcp/vnext/gateway/providers/anthropic.ts`
- Create: `mcp/vnext/gateway/providers/anthropic.test.ts`
- Modify: `mcp/proxy.ts`
- Modify: `mcp/proxy.test.ts`
- Modify: `mcp/cli.ts`

- [ ] **Step 1: Write failing mode and streaming tests**

```ts
test("assist mode transforms only messages requests and stores a receipt", async () => {
  const result = await proxyRoundTrip({ mode: "assist", path: "/v1/messages", body: fixtureProviderRequest() });
  assert.equal(result.receipts.length, 1);
  assert.ok(result.receipts[0].transformations.length > 0);
});

test("protect passthrough keeps streaming body and headers valid", async () => {
  const result = await proxyRoundTrip({ mode: "protect", force_passthrough: true, body: fixtureProviderRequest() });
  assert.deepEqual(result.forwardedBody, result.originalBody);
  assert.equal(result.clientStreamComplete, true);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/providers/anthropic.test.js mcp/dist/proxy.test.js
```

- [ ] **Step 3: Implement provider adapter boundary**

```ts
export interface GatewayProviderAdapter<TRequest> {
  provider: string;
  isEligible(method: string, path: string): boolean;
  parse(body: Buffer): TRequest | null;
  liveZone(request: TRequest): LiveZone;
  tokenCount(request: TRequest): Promise<number | null>;
  usage(responseBody: string): { input_tokens: number | null; output_tokens: number | null };
  serialize(request: TRequest): Buffer;
}
```

The built-in Anthropic adapter is the only provider enabled in Phase D. Additional provider adapters require their own fixtures and cache/injection contract.

- [ ] **Step 4: Add explicit CLI mode selection**

```text
kage proxy --project <dir> --mode audit|assist|protect
```

Default remains `audit` until Gate D. The CLI refuses `assist` when reversible storage or receipt storage is unhealthy.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/providers/anthropic.test.js mcp/dist/proxy.test.js
npm test --prefix mcp
git add mcp/vnext/gateway/providers mcp/proxy.ts mcp/proxy.test.ts mcp/cli.ts
git commit -m "feat: enable measured assist and protect proxy modes"
```

## Task 6: Certify agent-surface capabilities without pretending fallback is automatic

**Files:**
- Create: `mcp/vnext/adapters/capability-matrix.ts`
- Create: `mcp/vnext/adapters/cursor-hooks.ts`
- Create: `mcp/vnext/adapters/codex-otel.ts`
- Create: `mcp/vnext/adapters/surface-certification.test.ts`
- Create: `plugin/cursor/hooks.json`
- Create: `plugin/cursor/kage-hook.sh`
- Create: `plugin/codex/otel-config.toml`
- Modify: `mcp/kernel.ts`
- Modify: `mcp/kernel.test.ts`
- Create: `docs/integrations/agent-surface-capabilities.md`

- [ ] **Step 1: Write failing capability-truth tests**

```ts
test("surface is automatic only after an injection sentinel reaches its transcript", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.equal(result.injection, "automatic_session");
});

test("Codex telemetry is automatic capture but does not imply automatic injection", () => {
  const result = certifySurface({
    surface: "codex",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "no injected sentinel",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.equal(result.injection, "mcp_fallback");
  assert.equal(result.counts_as_automatic_attachment, false);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/adapters/surface-certification.test.js
```

- [ ] **Step 3: Define a capability matrix that the UI and installer must honor**

```ts
export type CaptureLevel = "automatic" | "manual" | "unavailable";
export type InjectionLevel = "automatic_task" | "automatic_session" | "gateway" | "mcp_fallback" | "unavailable";

export interface AgentSurfaceCertification {
  surface: "claude-code" | "anthropic-proxy" | "cursor" | "codex" | "other";
  surface_version: string;
  capture: CaptureLevel;
  injection: InjectionLevel;
  counts_as_automatic_attachment: boolean;
  certified_at: string;
  fixture_fingerprint: string;
  limitations: string[];
}
```

The installer, status page, and sales report read this matrix. They cannot label a surface automatic based only on installed configuration.

- [ ] **Step 4: Implement honest Cursor and Codex adapters**

For Cursor, install project-level `.cursor/hooks.json` with `sessionStart`, `beforeSubmitPrompt`, tool, and stop hooks. `sessionStart` may return session-level context only when the certification smoke test proves the configured Cursor version delivers it. `beforeSubmitPrompt` records the task event but does not claim prompt-specific injection because Cursor's currently documented hook output does not reliably support that path. Cursor's official examples place configuration in `.cursor/hooks.json`: <https://cursor.com/blog/agent-best-practices>.

For Codex, receive configured OpenTelemetry events for prompt/tool/result capture and retain the existing plugin/MCP path for context retrieval. OpenAI documents Codex OpenTelemetry events for prompts, approvals, tool results, MCP usage, and proxy decisions, but plugins package skills/apps/MCP rather than establishing a general Kage-owned session injection hook. Therefore Codex is reported as automatic capture plus MCP fallback until a transcript-based injection certification passes: <https://openai.com/index/running-codex-safely/> and <https://help.openai.com/en/articles/20001256-plugins-in-codex/>.

- [ ] **Step 5: Add the three-surface certification gate and commit**

Require successful transcript-based certification for:

1. Claude Code native hooks.
2. A proxy-compatible agent using the measured gateway.
3. Cursor session-start injection on a certified version.

Codex is visible in the matrix but is not counted as automatic attachment while it remains MCP fallback. If Cursor certification fails, the release gate remains failed instead of changing the label.

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/adapters/surface-certification.test.js
node --test --test-name-pattern "setup supports|plugin hooks" mcp/dist/kernel.test.js
npm test --prefix mcp
git add mcp/vnext/adapters plugin/cursor plugin/codex mcp/kernel.ts mcp/kernel.test.ts docs/integrations/agent-surface-capabilities.md
git commit -m "feat: certify agent attachment capabilities honestly"
```

## Task 7: Add exact evidence retrieval and the reduced MCP compatibility surface

**Files:**
- Create: `mcp/vnext/api/retrieve.ts`
- Create: `mcp/vnext/api/retrieve.test.ts`
- Modify: `mcp/vnext/api/router.ts`
- Modify: `mcp/index.ts`
- Modify: `mcp/mcp.test.ts`
- Modify: `mcp/tool-coverage.test.ts`

- [ ] **Step 1: Write failing retrieval authorization tests**

```ts
test("task can retrieve its exact compressed original", async () => {
  const response = await retrieve("kage-content:abc", { task_id: "task-1", token: fixtureToken() });
  assert.equal(response.status, 200);
  assert.equal(response.headers["x-kage-sha256"], "abc");
});

test("another task cannot retrieve local raw content", async () => {
  const response = await retrieve("kage-content:abc", { task_id: "task-2", token: fixtureToken() });
  assert.equal(response.status, 403);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/retrieve.test.js
```

- [ ] **Step 3: Add retrieval routes and tool**

```text
GET /v2/content/:sha256?task_id=<id>
```

Add `kage_retrieve` with `project_dir`, `retrieval_id`, and `task_id`. It reads only through the local daemon/content store and returns exact content plus fingerprint. It never fetches a public or team asset implicitly.

- [ ] **Step 4: Add a vNext MCP mode without deleting legacy full mode**

`KAGE_TOOLS=vnext` exposes only:

```text
kage_context
kage_retrieve
kage_feedback
```

The default remains the existing core surface until major-version migration. `KAGE_TOOLS=full` remains available for compatibility during v4.

- [ ] **Step 5: Run MCP coverage and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/api/retrieve.test.js mcp/dist/mcp.test.js mcp/dist/tool-coverage.test.js
npm test --prefix mcp
git add mcp/vnext/api mcp/index.ts mcp/mcp.test.ts mcp/tool-coverage.test.ts
git commit -m "feat: add reversible retrieval and vNext MCP surface"
```

## Task 8: Add repository-specific Minimal Change preflight

**Files:**
- Create: `mcp/vnext/policy/types.ts`
- Create: `mcp/vnext/policy/preflight.ts`
- Create: `mcp/vnext/policy/preflight.test.ts`
- Modify: `mcp/vnext/context/capsule-builder.ts`

- [ ] **Step 1: Write failing reuse-ladder tests**

```ts
test("preflight recommends existing helper before new abstraction", async () => {
  const result = await minimalChangePreflight(fixtureTask("add authenticated fetch"), fixtureModelWithHelper("authenticatedFetch"));
  assert.equal(result.recommendations[0].kind, "reuse_existing");
  assert.match(result.recommendations[0].evidence[0].source_uri, /authenticatedFetch/);
});

test("preflight does not invent a reusable helper without evidence", async () => {
  const result = await minimalChangePreflight(fixtureTask("add CSV export"), emptyModel());
  assert.equal(result.recommendations.some((item) => item.kind === "reuse_existing"), false);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/policy/preflight.test.js
```

- [ ] **Step 3: Define findings and policy modes**

```ts
import type { EvidenceRecord } from "../repo-model/types.js";

export type MinimalChangeMode = "off" | "advisory" | "pr_warning" | "enforced";
export type FindingKind =
  | "no_change"
  | "reuse_existing"
  | "use_standard_library"
  | "use_platform"
  | "use_existing_dependency"
  | "minimal_local_change"
  | "new_abstraction"
  | "new_dependency"
  | "duplicate_symbol"
  | "scope_expansion"
  | "public_contract"
  | "missing_verification";

export interface MinimalChangeFinding {
  finding_id: string;
  kind: FindingKind;
  title: string;
  explanation: string;
  evidence: EvidenceRecord[];
  deterministic: boolean;
  severity: "info" | "warning" | "blocking";
  suggested_files: string[];
}
```

- [ ] **Step 4: Implement the ordered ladder**

Evaluate no change, existing feature/configuration, repository helper/extension point, standard library, platform capability, current dependency, minimal local change, then justified new abstraction. Stop recommending a lower rung after a higher rung is sufficiently supported. Add the top findings as `minimal_change` capsule sections.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/policy/preflight.test.js mcp/dist/vnext/context/context.test.js
npm test --prefix mcp
git add mcp/vnext/policy mcp/vnext/context/capsule-builder.ts
git commit -m "feat: guide agents toward repository-native changes"
```

## Task 9: Add deterministic post-diff policy checks

**Files:**
- Create: `mcp/vnext/policy/diff-parser.ts`
- Create: `mcp/vnext/policy/rules/new-dependency.ts`
- Create: `mcp/vnext/policy/rules/duplicate-symbol.ts`
- Create: `mcp/vnext/policy/rules/scope-expansion.ts`
- Create: `mcp/vnext/policy/rules/public-contract.ts`
- Create: `mcp/vnext/policy/post-diff.ts`
- Create: `mcp/vnext/policy/post-diff.test.ts`

- [ ] **Step 1: Write failing deterministic rule tests**

```ts
test("new dependency finding cites package diff and requires justification", () => {
  const findings = evaluateDiff(fixtureDiffAddingDependency("left-pad"), fixturePolicy());
  const finding = findings.find((item) => item.kind === "new_dependency");
  assert.equal(finding?.deterministic, true);
  assert.match(finding?.evidence[0].source_uri ?? "", /package.json/);
});

test("unrelated changed component creates scope warning", () => {
  const findings = evaluateDiff(fixtureTaskScopedTo("auth"), fixtureDiffChanging(["auth", "billing"]), fixtureModel());
  assert.ok(findings.some((item) => item.kind === "scope_expansion"));
});

test("model-only duplicate suggestion cannot be blocking", () => {
  const finding = normalizeFinding({ ...fixtureFinding(), deterministic: false, severity: "blocking" });
  assert.equal(finding.severity, "warning");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/policy/post-diff.test.js
```

- [ ] **Step 3: Implement deterministic checks**

Check package manifests/lockfiles, new exported symbols, duplicate signatures from the code graph, files outside the declared component set, public API/schema changes, missing related tests, and changed critical contracts without knowledge updates.

- [ ] **Step 4: Add justification and suppression records**

Every dismissed warning records actor, reason, finding fingerprint, affected commit, and expiration. A suppression cannot match a materially changed finding fingerprint.

- [ ] **Step 5: Test and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/policy/post-diff.test.js
npm test --prefix mcp
git add mcp/vnext/policy
git commit -m "feat: detect unnecessary and out-of-scope diffs"
```

## Task 10: Integrate Minimal Change Guard with PR checks and receipts

**Files:**
- Create: `mcp/vnext/policy/report.ts`
- Create: `mcp/vnext/policy/report.test.ts`
- Modify: `mcp/vnext/api/task-receipts.ts`
- Modify: `mcp/vnext/api/router.ts`
- Modify: `mcp/cli.ts`
- Modify: `mcp/kernel.ts`
- Modify: `mcp/kernel.test.ts`
- Modify: `.github/workflows/kage-pr.yml`

- [ ] **Step 1: Write failing advisory and enforcement tests**

```ts
test("advisory findings never fail PR check", () => {
  const report = policyReport([fixtureFinding({ deterministic: true, severity: "warning" })], { mode: "advisory" });
  assert.equal(report.ok, true);
});

test("enforced mode blocks only selected deterministic rules", () => {
  const report = policyReport([
    fixtureFinding({ kind: "new_dependency", deterministic: true, severity: "blocking" }),
    fixtureFinding({ kind: "duplicate_symbol", deterministic: false, severity: "warning" }),
  ], { mode: "enforced", enforced_rules: ["new_dependency"] });
  assert.equal(report.ok, false);
  assert.deepEqual(report.blocking.map((item) => item.kind), ["new_dependency"]);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/policy/report.test.js
```

- [ ] **Step 3: Add CLI and API surfaces**

```text
kage minimal-change check --project <dir> [--base <ref>] [--json]
GET /v2/tasks/:taskId/minimal-change
```

The existing `pr check` includes the report only when vNext policy is enabled. The default is advisory. The GitHub workflow posts findings with evidence and justification instructions.

- [ ] **Step 4: Add findings to task receipts**

Show preflight recommendations, post-diff findings, deterministic status, severity, decision/suppression, and whether a finding changed agent behavior. Do not claim “lines avoided” without a controlled comparison.

- [ ] **Step 5: Run PR regression tests and commit**

```bash
npm run build --prefix mcp
node --test --test-name-pattern "pr check" mcp/dist/vnext/policy/report.test.js mcp/dist/kernel.test.js
npm test --prefix mcp
git add mcp/vnext/policy mcp/vnext/api mcp/cli.ts mcp/kernel.ts mcp/kernel.test.ts .github/workflows/kage-pr.yml
git commit -m "feat: surface minimal-change policy in PR review"
```

## Task 11: Add cost cohorts, protect-mode automation, and Phase D gate

**Files:**
- Create: `mcp/vnext/gateway/cohort-metrics.ts`
- Create: `mcp/vnext/gateway/cohort-metrics.test.ts`
- Create: `mcp/vnext/phase-d-gate.test.ts`
- Create: `scripts/vnext-phase-d-report.mjs`
- Modify: `mcp/vnext/api/read-models.ts`
- Modify: `platform/web/src/pages/OverviewPage.tsx`
- Modify: `platform/web/src/pages/TaskReceiptPage.tsx`
- Create: `docs/migration/context-budget-preview.md`

- [ ] **Step 1: Write failing cohort and protect tests**

```ts
test("cohort percentiles exclude unavailable receipts from exact savings", () => {
  const metrics = calculateCohort([exactReceipt(-0.02), exactReceipt(-0.01), unavailableReceipt()]);
  assert.equal(metrics.exact_receipts, 2);
  assert.equal(metrics.unavailable_receipts, 1);
  assert.equal(metrics.p50_net_input_cost_delta_usd, -0.015);
});

test("protect mode persists its reason and automatically expires after a healthy window", () => {
  const controller = fixtureProtectController();
  controller.observe(unhealthyCohort());
  assert.equal(controller.state().mode, "protect");
  controller.observe(healthyCohort({ tasks: 30 }));
  assert.equal(controller.state().mode, "assist");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/gateway/cohort-metrics.test.js mcp/dist/vnext/phase-d-gate.test.js
```

- [ ] **Step 3: Calculate honest cohort metrics**

Report exact receipts, partial receipts, unavailable receipts, p50/p95 input-token delta, p50/p95 cost delta, p50/p95 latency, retrieval rate, failed-open count, verification success, and output-token/task-cost trends separately.

- [ ] **Step 4: Implement the Gate D replay corpus**

Replay at least 30 recorded or synthetic tool-heavy tasks in audit and assist mode against a fake provider. Assert byte preservation, exact original retrieval, invariant retention, successful verification, and cost/latency thresholds. Keep the corpus free of secrets and customer code.

- [ ] **Step 5: Run all Phase D verification and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/phase-d-gate.test.js
npm test --prefix mcp
npm test --prefix platform/web
node scripts/vnext-phase-d-report.mjs --project . --json
node mcp/dist/cli.js refresh --project . --json
node mcp/dist/cli.js pr check --project . --json
git add mcp/vnext scripts/vnext-phase-d-report.mjs platform/web/src docs/migration/context-budget-preview.md
git commit -m "test: enforce Kage vNext Phase D efficiency gate"
```

## Phase D completion gate

Do not enable assist mode by default until:

- Every lossy transform retrieves an exact fingerprint-verified original.
- System/tools/cache-stable prefix preservation passes provider fixtures.
- The target cohort reaches at least 20% p50 provider-input cost reduction.
- Kage processing cost is below 10% of measured provider-input savings.
- Local transformation latency is below 150 ms p95.
- Protect mode automatically backs off and records its reason.
- Minimal Change Guard is advisory by default and model-only findings cannot block.
- Exact request economics remain separate from outcome trends in every UI and report.
