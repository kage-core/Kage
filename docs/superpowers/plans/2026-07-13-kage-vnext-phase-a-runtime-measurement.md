# Kage vNext Phase A: Local Runtime and Measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, fail-open local runtime with a versioned adapter protocol, append-only event/receipt storage, two automatic integration paths, and exact-versus-partial cost measurement while preserving all legacy behavior.

**Architecture:** Build new modules under `mcp/vnext/` and make the existing daemon, proxy, CLI, and Claude hooks thin adapters. Use dynamically loaded `node:sqlite` only inside the Node 22.5+ vNext runtime. During this phase, context capsules are produced through a `ContextSource` interface backed by existing verified recall; Phase B replaces that implementation without changing adapters.

**Tech Stack:** TypeScript, Node.js 22.5+ for `kaged`, `node:http`, `node:sqlite`, `node:test`, existing Kage recall/indexing, Bash hook adapters, and existing Anthropic streaming proxy.

---

## Task 1: Freeze protocol v1

**Files:**
- Create: `mcp/vnext/protocol/types.ts`
- Create: `mcp/vnext/protocol/validate.ts`
- Create: `mcp/vnext/protocol/index.ts`
- Create: `mcp/vnext/protocol/protocol.test.ts`
- Modify: `mcp/type-guards.ts`

- [ ] **Step 1: Write the failing protocol round-trip and rejection tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { validateEvidenceEvent, validateHandshake } from "./validate.js";

test("protocol v1 accepts a complete adapter handshake", () => {
  const result = validateHandshake({
    protocol_version: 1,
    adapter_id: "claude-code:local",
    agent_surface: "claude-code",
    agent_version: "1.0.0",
    repository: {
      repo_id: "github.com/kage-core/kage",
      root: "/repo",
      remote: "https://github.com/kage-core/Kage.git",
      branch: "main",
      commit: "abc123",
      worktree: "/repo",
    },
    task: {
      task_id: "task-1",
      session_id: "session-1",
      user_id: null,
      agent_surface: "claude-code",
    },
    capabilities: ["session_start", "prompt", "tool_result", "inject_user_turn"],
  });
  assert.equal(result.ok, true);
});

test("protocol v1 rejects raw events without a privacy class", () => {
  const result = validateEvidenceEvent({
    protocol_version: 1,
    event_id: "event-1",
    event_type: "prompt",
    occurred_at: "2026-07-13T00:00:00.000Z",
    repository_id: "repo-1",
    task_id: "task-1",
    payload: { text: "secret-looking raw prompt" },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /privacy_class/);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/protocol/protocol.test.js
```

Expected: build fails because `types.ts` and `validate.ts` do not exist.

- [ ] **Step 3: Add the protocol types**

```ts
export const KAGE_PROTOCOL_VERSION = 1 as const;

export type ProtocolVersion = typeof KAGE_PROTOCOL_VERSION;
export type PrivacyClass = "local_raw" | "team_metadata" | "team_approved";
export type MeasurementQuality = "exact" | "partial" | "unavailable";
export type AdapterCapability =
  | "session_start"
  | "prompt"
  | "file_open"
  | "file_edit"
  | "tool_result"
  | "session_end"
  | "inject_system"
  | "inject_user_turn"
  | "provider_usage";

export interface RepositoryIdentity {
  repo_id: string;
  root: string;
  remote: string | null;
  branch: string | null;
  commit: string | null;
  worktree: string;
}

export interface TaskIdentity {
  task_id: string;
  session_id: string;
  user_id: string | null;
  agent_surface: string;
}

export interface AdapterHandshake {
  protocol_version: ProtocolVersion;
  adapter_id: string;
  agent_surface: string;
  agent_version: string | null;
  repository: RepositoryIdentity;
  task: TaskIdentity;
  capabilities: AdapterCapability[];
}

export interface EvidenceEvent {
  protocol_version: ProtocolVersion;
  event_id: string;
  event_type: "session_start" | "prompt" | "file_open" | "file_edit" | "tool_result" | "session_end";
  occurred_at: string;
  repository_id: string;
  task_id: string;
  privacy_class: PrivacyClass;
  source_fingerprint: string;
  payload: Record<string, unknown>;
}

export interface CapsuleSection {
  kind: "orientation" | "invariant" | "feature" | "entry_point" | "decision" | "verification" | "runbook" | "minimal_change";
  title: string;
  body: string;
  evidence_ids: string[];
  priority: number;
}

export interface ContextCapsule {
  protocol_version: ProtocolVersion;
  capsule_id: string;
  task_id: string;
  repository_id: string;
  query: string;
  sections: CapsuleSection[];
  token_budget: number;
  estimated_tokens: number;
  created_at: string;
  expires_at: string;
}

export interface ContextDelivery {
  delivery_id: string;
  capsule_id: string;
  task_id: string;
  adapter_id: string;
  injection_location: "system" | "user_turn" | "tool_result" | "none";
  delivered_at: string;
  added_bytes: number;
  added_tokens: number | null;
  measurement_quality: MeasurementQuality;
  status: "delivered" | "skipped" | "failed_open";
  reason: string;
}

export interface TransformationReceipt {
  receipt_id: string;
  task_id: string;
  request_id: string;
  provider: string;
  model: string | null;
  mode: "audit" | "assist" | "protect";
  measurement_quality: MeasurementQuality;
  before_input_bytes: number;
  after_input_bytes: number;
  before_input_tokens: number | null;
  after_input_tokens: number | null;
  output_tokens: number | null;
  kage_processing_cost_usd: number | null;
  provider_input_cost_before_usd: number | null;
  provider_input_cost_after_usd: number | null;
  latency_ms: number;
  transformations: string[];
  created_at: string;
}
```

- [ ] **Step 4: Add strict boundary validation**

`validate.ts` must return `{ ok: true, value }` or `{ ok: false, errors }`, reject unknown protocol versions, require ISO timestamps, non-empty identifiers, known enum values, and an object payload. Reuse `isRecord` by exporting it from `mcp/type-guards.ts`; do not add a schema library in Phase A.

```ts
import { isRecord } from "../../type-guards.js";
import { KAGE_PROTOCOL_VERSION, type AdapterHandshake, type EvidenceEvent } from "./types.js";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function requiredString(value: unknown, name: string, errors: string[]): value is string {
  if (typeof value === "string" && value.trim()) return true;
  errors.push(`${name} must be a non-empty string`);
  return false;
}

export function validateEvidenceEvent(value: unknown): ValidationResult<EvidenceEvent> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["event must be an object"] };
  if (value.protocol_version !== KAGE_PROTOCOL_VERSION) errors.push("unsupported protocol_version");
  requiredString(value.event_id, "event_id", errors);
  requiredString(value.repository_id, "repository_id", errors);
  requiredString(value.task_id, "task_id", errors);
  requiredString(value.source_fingerprint, "source_fingerprint", errors);
  if (!new Set(["local_raw", "team_metadata", "team_approved"]).has(String(value.privacy_class))) errors.push("privacy_class is invalid");
  if (!isRecord(value.payload)) errors.push("payload must be an object");
  return errors.length ? { ok: false, errors } : { ok: true, value: value as unknown as EvidenceEvent };
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/protocol/protocol.test.js
npm test --prefix mcp
```

Expected: protocol tests pass and the existing suite remains green.

```bash
git add mcp/vnext/protocol mcp/type-guards.ts
git commit -m "feat: define Kage vNext protocol"
```

## Task 2: Add the local SQLite boundary and migrations

**Files:**
- Create: `mcp/vnext/runtime/runtime-version.ts`
- Create: `mcp/vnext/storage/database.ts`
- Create: `mcp/vnext/storage/migrations.ts`
- Create: `mcp/vnext/storage/event-store.ts`
- Create: `mcp/vnext/storage/receipt-store.ts`
- Create: `mcp/vnext/storage/storage.test.ts`

- [ ] **Step 1: Write failing migration, deduplication, and receipt tests**

```ts
test("event store is append-only and deduplicates source fingerprints", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const event = fixtureEvidenceEvent();
  assert.equal(store.append(event).inserted, true);
  assert.equal(store.append({ ...event, event_id: "event-2" }).inserted, false);
  assert.equal(store.forTask(event.task_id).length, 1);
});

test("receipt store preserves unavailable measurement instead of estimating", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  store.write({ ...fixtureReceipt(), measurement_quality: "unavailable", before_input_tokens: null, after_input_tokens: null });
  assert.equal(store.forTask("task-1")[0].measurement_quality, "unavailable");
  assert.equal(store.forTask("task-1")[0].provider_input_cost_before_usd, null);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/storage/storage.test.js
```

Expected: failure because the database and stores do not exist.

- [ ] **Step 3: Implement the runtime gate and guarded database import**

```ts
export function assertVnextRuntime(version = process.versions.node): void {
  const [major, minor] = version.split(".").map(Number);
  if (major > 22 || (major === 22 && minor >= 5)) return;
  throw new Error("Kage vNext runtime requires Node 22.5+; legacy Kage commands remain available on Node 18+.");
}

export type LocalDatabase = import("node:sqlite").DatabaseSync;

export function openVnextDatabase(path: string): LocalDatabase {
  assertVnextRuntime();
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  return db;
}
```

Keep `require("node:sqlite")` inside `openVnextDatabase`; an import at module evaluation time repeats the Node 18 regression fixed in `mcp/cloud-server.ts`.

- [ ] **Step 4: Add migration 001 and repositories**

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  agent_surface TEXT NOT NULL,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT
);
CREATE TABLE IF NOT EXISTS evidence_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS context_deliveries (
  delivery_id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  injection_location TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  added_bytes INTEGER NOT NULL,
  added_tokens INTEGER,
  measurement_quality TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transformation_receipts (
  receipt_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT,
  mode TEXT NOT NULL,
  measurement_quality TEXT NOT NULL,
  before_input_bytes INTEGER NOT NULL,
  after_input_bytes INTEGER NOT NULL,
  before_input_tokens INTEGER,
  after_input_tokens INTEGER,
  output_tokens INTEGER,
  kage_processing_cost_usd REAL,
  provider_input_cost_before_usd REAL,
  provider_input_cost_after_usd REAL,
  latency_ms REAL NOT NULL,
  transformations_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Use prepared statements and JSON parsing inside `EventStore` and `ReceiptStore`. Never update or delete `evidence_events` in Phase A.

- [ ] **Step 5: Test legacy Node loading and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/storage/storage.test.js
npm test --prefix mcp
docker run --rm -v "$PWD:/repo" -w /repo node:18 node mcp/dist/cli.js help
```

Expected: storage and full tests pass; Node 18 prints help without loading `node:sqlite`.

```bash
git add mcp/vnext/runtime mcp/vnext/storage
git commit -m "feat: add vNext local event and receipt store"
```

## Task 3: Add authenticated local runtime endpoints

**Files:**
- Create: `mcp/vnext/runtime/paths.ts`
- Create: `mcp/vnext/runtime/token.ts`
- Create: `mcp/vnext/runtime/server.ts`
- Create: `mcp/vnext/runtime/status.ts`
- Create: `mcp/vnext/runtime/server.test.ts`
- Modify: `mcp/daemon.ts`

- [ ] **Step 1: Write failing health, authentication, event, and fail-open tests**

```ts
test("local runtime rejects event writes without its machine token", async () => {
  await withRuntime(async ({ url }) => {
    const response = await fetch(`${url}/v2/events`, { method: "POST", body: JSON.stringify(fixtureEvidenceEvent()) });
    assert.equal(response.status, 401);
  });
});

test("local runtime stores a valid adapter event", async () => {
  await withRuntime(async ({ url, token, store }) => {
    const response = await fetch(`${url}/v2/events`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(fixtureEvidenceEvent()),
    });
    assert.equal(response.status, 202);
    assert.equal(store.forTask("task-1").length, 1);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm missing runtime behavior**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/runtime/server.test.js
```

Expected: failure because `startLocalRuntime` is undefined.

- [ ] **Step 3: Implement token and status files with restrictive permissions**

Store runtime files under `.agent_memory/daemon/vnext/`:

```ts
export interface VnextRuntimeStatus {
  protocol_version: 1;
  pid: number;
  host: "127.0.0.1";
  port: number;
  mode: "audit" | "assist";
  started_at: string;
  database_path: string;
  token_path: string;
}

export function ensureRuntimeToken(path: string): string {
  if (existsSync(path)) return readFileSync(path, "utf8").trim();
  const token = `klt_${randomBytes(32).toString("base64url")}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
  return token;
}
```

- [ ] **Step 4: Implement only the Phase A `/v2` routes**

```text
GET  /v2/health
GET  /v2/status
POST /v2/handshakes
POST /v2/events
POST /v2/context
GET  /v2/tasks/:taskId/receipts
```

Use one JSON body reader with a 2 MiB limit. Return `413` beyond the limit, `400` for invalid protocol records, `401` for missing/invalid local token, `202` for accepted events, and `503` for context-source unavailability. The server must never bind outside `127.0.0.1` in Phase A.

Wire `mcp/daemon.ts` so `kage daemon start` can start the vNext server through an option, while existing `/kage/*` routes remain unchanged:

```ts
export async function startDaemon(projectDir: string, options: { host?: string; restPort?: number; viewerPort?: number; vnext?: boolean } = {}): Promise<void> {
  // existing legacy daemon setup
  if (options.vnext) await startLocalRuntime({ projectDir, mode: "audit" });
}
```

- [ ] **Step 5: Run regression tests and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/runtime/server.test.js mcp/dist/daemon.test.js
npm test --prefix mcp
```

Expected: all focused and package tests pass.

```bash
git add mcp/vnext/runtime mcp/daemon.ts mcp/daemon.test.ts
git commit -m "feat: serve authenticated vNext local runtime"
```

## Task 4: Build budgeted capsules behind a replaceable context source

**Files:**
- Create: `mcp/vnext/context/source.ts`
- Create: `mcp/vnext/context/legacy-source.ts`
- Create: `mcp/vnext/context/capsule-builder.ts`
- Create: `mcp/vnext/context/token-estimate.ts`
- Create: `mcp/vnext/context/context.test.ts`
- Modify: `mcp/vnext/runtime/server.ts`

- [ ] **Step 1: Write failing budget, trust, and empty-context tests**

```ts
test("capsule builder keeps required invariants and stays inside 1200 tokens", async () => {
  const source = new FakeContextSource([
    fixtureCandidate({ kind: "invariant", priority: 100, body: "Refunds use the ledger." }),
    ...Array.from({ length: 30 }, (_, index) => fixtureCandidate({ kind: "decision", priority: index, body: "x".repeat(400) })),
  ]);
  const capsule = await buildContextCapsule(source, fixtureContextRequest({ token_budget: 1200 }));
  assert.ok(capsule.estimated_tokens <= 1200);
  assert.ok(capsule.sections.some((section) => section.kind === "invariant"));
});

test("legacy source never emits stale or disputed packets", async () => {
  const source = new LegacyContextSource(projectWithFreshAndStalePackets());
  const candidates = await source.find(fixtureContextRequest());
  assert.equal(candidates.some((candidate) => candidate.trust_state === "stale"), false);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/context/context.test.js
```

Expected: missing source and capsule modules.

- [ ] **Step 3: Define the context seam**

```ts
export interface ContextRequest {
  repository: RepositoryIdentity;
  task: TaskIdentity;
  query: string;
  targets: string[];
  changed_files: string[];
  token_budget: number;
}

export interface ContextCandidate {
  candidate_id: string;
  kind: CapsuleSection["kind"];
  title: string;
  body: string;
  evidence_ids: string[];
  trust_state: "verified" | "approved";
  priority: number;
}

export interface ContextSource {
  find(request: ContextRequest): Promise<ContextCandidate[]>;
}
```

`LegacyContextSource` calls existing `recall`, `kageTeammateBrief`, and risk helpers, translates only verified/approved results, and contains all direct imports from `mcp/kernel.ts`. No adapter or gateway may import the kernel.

- [ ] **Step 4: Implement deterministic budgeting**

Estimate tokens as `Math.ceil(Buffer.byteLength(text, "utf8") / 4)` and sort by:

1. Required invariant.
2. Direct target-file fact.
3. Verification contract.
4. Feature/flow.
5. Decision.
6. Runbook.
7. Orientation.

Drop whole sections when they do not fit; never truncate a citation identifier or split a safety invariant. Return an empty capsule rather than filler when nothing trusted is relevant.

- [ ] **Step 5: Add `/v2/context`, run tests, and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/context/context.test.js mcp/dist/vnext/runtime/server.test.js
npm test --prefix mcp
```

Expected: budget and stale-exclusion tests pass; existing recall tests remain green.

```bash
git add mcp/vnext/context mcp/vnext/runtime/server.ts
git commit -m "feat: compose budgeted automatic context capsules"
```

## Task 5: Convert Claude hooks into a fail-open adapter

**Files:**
- Create: `mcp/vnext/adapters/client.ts`
- Create: `mcp/vnext/adapters/claude.ts`
- Create: `mcp/vnext/adapters/adapter.test.ts`
- Create: `plugin/hooks/kage-vnext-adapter.sh`
- Modify: `plugin/hooks/hooks.json`
- Modify: `plugin/hooks/session-start.sh`
- Modify: `plugin/hooks/kage-read-context.sh`
- Modify: `plugin/hooks/kage-edit-context.sh`
- Modify: `plugin/hooks/observe.sh`
- Modify: `plugin/hooks/stop.sh`
- Modify: `mcp/kernel.test.ts`

- [ ] **Step 1: Write failing Claude payload and daemon-outage tests**

```ts
test("Claude prompt payload maps to one privacy-classified event", () => {
  const event = claudeHookToEvent("prompt", {
    cwd: "/repo",
    session_id: "session-1",
    prompt: "fix the refund flow",
  }, fixtureRepositoryIdentity());
  assert.equal(event.event_type, "prompt");
  assert.equal(event.privacy_class, "local_raw");
  assert.match(event.source_fingerprint, /^[a-f0-9]{64}$/);
});

test("adapter client fails open when kaged is unavailable", async () => {
  const result = await sendAdapterEvent({ url: "http://127.0.0.1:1", token: "none", event: fixtureEvidenceEvent(), timeout_ms: 50 });
  assert.equal(result.status, "failed_open");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/adapters/adapter.test.js
```

Expected: missing adapter modules.

- [ ] **Step 3: Implement the adapter client with a hard timeout**

Use `AbortSignal.timeout(150)` for event delivery and `AbortSignal.timeout(500)` for context requests. Return a structured `failed_open` result on connection, authentication, parsing, or timeout errors. Never print raw prompt or tool output in an error.

```ts
export interface AdapterSendResult {
  status: "accepted" | "skipped" | "failed_open";
  reason: string;
}
```

- [ ] **Step 4: Replace per-hook Kage processes with one shell adapter**

`kage-vnext-adapter.sh` reads hook JSON once, finds `.agent_memory/daemon/vnext/status.json` and `token`, posts to the local daemon with `curl --max-time 0.5`, and exits `0` for every daemon/network failure. Session-start and prompt hooks print only the daemon's delimited context block when present. Legacy scripts remain callable when `vnext.runtime` is not `audit` or `assist`.

Update the committed-hook generation test so `setupAgent()` remains the source of truth and generated hooks exactly match `plugin/hooks/`.

- [ ] **Step 5: Run hook and package tests, then commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/adapters/adapter.test.js
node --test --test-name-pattern "plugin hooks are generated" mcp/dist/kernel.test.js
npm test --prefix mcp
```

Expected: adapter tests pass, generated hooks do not drift, full suite passes.

```bash
git add mcp/vnext/adapters plugin/hooks mcp/kernel.test.ts
git commit -m "feat: attach Kage context through fail-open Claude hooks"
```

## Task 6: Turn the proxy into the first exact-measurement gateway adapter

**Files:**
- Create: `mcp/vnext/measurement/token-count.ts`
- Create: `mcp/vnext/measurement/pricing.ts`
- Create: `mcp/vnext/measurement/receipt.ts`
- Create: `mcp/vnext/measurement/measurement.test.ts`
- Create: `mcp/vnext/adapters/anthropic-proxy.ts`
- Modify: `mcp/proxy.ts`
- Modify: `mcp/proxy.test.ts`

- [ ] **Step 1: Write failing exact, partial, and byte-preservation tests**

```ts
test("audit receipt never claims exact token savings without both token counts", () => {
  const receipt = buildTransformationReceipt({
    before: Buffer.from("before"),
    after: Buffer.from("after"),
    before_tokens: null,
    after_tokens: null,
    provider_usage: null,
    latency_ms: 4,
    transformations: [],
  });
  assert.equal(receipt.measurement_quality, "unavailable");
  assert.equal(receipt.provider_input_cost_before_usd, null);
});

test("audit mode forwards the exact original request bytes", async () => {
  const original = Buffer.from('{"messages":[{"role":"user","content":"hello"}]}');
  const forwarded = await captureForwardedBody({ mode: "audit", original });
  assert.deepEqual(forwarded, original);
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/measurement/measurement.test.js mcp/dist/proxy.test.js
```

Expected: missing receipt builder and audit-mode behavior.

- [ ] **Step 3: Implement receipt classification and price snapshots**

```ts
export interface ProviderPriceSnapshot {
  provider: string;
  model: string;
  input_usd_per_million: number;
  cache_read_usd_per_million: number | null;
  effective_from: string;
  source: string;
}

export function measurementQuality(before: number | null, after: number | null): MeasurementQuality {
  if (before !== null && after !== null) return "exact";
  return before !== null || after !== null ? "partial" : "unavailable";
}
```

Price snapshots are configuration records with source URL and effective date. They are not hard-coded as timeless constants. If the request model has no matching snapshot, cost fields remain `null`.

- [ ] **Step 4: Refactor proxy request handling through the adapter**

Preserve these existing invariants:

- Only exact `POST /v1/messages` is eligible.
- `/v1/messages/count_tokens` remains byte-identical passthrough.
- The system prompt remains byte-identical.
- OAuth-compatible context is appended to the last user turn only in `assist` mode.
- Streaming response chunks pass through unchanged.
- Receipt/capture failures never change the client response.

In `audit` mode, construct the candidate capsule and simulated transformed body for measurement, but forward the original bytes. In `assist` mode, forward the transformed body and record both byte counts plus provider usage when available.

- [ ] **Step 5: Run proxy regressions and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/measurement/measurement.test.js mcp/dist/proxy.test.js
npm test --prefix mcp
```

Expected: proxy streaming, OAuth system preservation, count-token passthrough, workspace routing, and receipts all pass.

```bash
git add mcp/vnext/measurement mcp/vnext/adapters/anthropic-proxy.ts mcp/proxy.ts mcp/proxy.test.ts
git commit -m "feat: record exact proxy transformation receipts"
```

## Task 7: Add connection, health, and receipt CLI surfaces

**Files:**
- Create: `mcp/vnext/runtime/config.ts`
- Create: `mcp/vnext/runtime/client.ts`
- Create: `mcp/vnext/runtime/commands.ts`
- Create: `mcp/vnext/runtime/commands.test.ts`
- Modify: `mcp/cli.ts`
- Modify: `mcp/package.json`
- Modify: `mcp/mcp.test.ts`

- [ ] **Step 1: Write failing command tests**

```ts
test("connect defaults to audit mode and never enables prompt mutation", async () => {
  const project = tempProject();
  const result = await connectProject({ project_dir: project, agents: ["claude-code"], start: false });
  assert.equal(result.config.vnext.runtime, "audit");
  assert.equal(result.config.vnext.gateway, "audit");
});

test("status reports exact measurement coverage separately", async () => {
  const report = await vnextStatus(fixtureRuntimeClient({ exact: 3, partial: 2, unavailable: 1 }));
  assert.deepEqual(report.measurement, { exact: 3, partial: 2, unavailable: 1 });
});
```

- [ ] **Step 2: Run command tests and confirm failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/runtime/commands.test.js
```

Expected: missing command functions.

- [ ] **Step 3: Implement the new small command surface**

Add:

```text
kage connect --project <dir> [--agents claude-code,proxy] [--no-start] [--json]
kage status --project <dir> [--json]
kage open --project <dir>
kage receipts --project <dir> [--task <id>] [--json]
```

`connect` initializes existing memory if needed, writes the vNext config in audit mode, installs selected adapters, and starts the vNext daemon only on a supported runtime. `status` combines legacy memory health and vNext attachment/measurement health. `open` launches the current viewer until Phase C replaces it. `receipts` prints measured fields without inventing unavailable costs.

- [ ] **Step 4: Keep the default MCP surface stable in Phase A**

Do not remove MCP tools yet. Add a test documenting that Phase A changes no default MCP tool names; tool reduction occurs only after the vNext adapters have usage evidence and a major-version migration path.

- [ ] **Step 5: Run CLI smoke tests and commit**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/runtime/commands.test.js mcp/dist/mcp.test.js
node mcp/dist/cli.js connect --project . --no-start --json
node mcp/dist/cli.js status --project . --json
npm test --prefix mcp
```

Expected: commands return valid JSON, remain in audit mode, and the full suite passes.

```bash
git add mcp/vnext/runtime mcp/cli.ts mcp/package.json mcp/mcp.test.ts
git commit -m "feat: add Kage connect status and receipt commands"
```

## Task 8: Add Phase A CI, fixtures, and gate report

**Files:**
- Create: `mcp/vnext/fixtures/protocol-v1/handshake.json`
- Create: `mcp/vnext/fixtures/protocol-v1/event.json`
- Create: `mcp/vnext/fixtures/protocol-v1/capsule.json`
- Create: `mcp/vnext/fixtures/protocol-v1/receipt.json`
- Create: `mcp/vnext/phase-a-gate.test.ts`
- Create: `scripts/vnext-phase-a-report.mjs`
- Modify: `.github/workflows/ci.yml`
- Modify: `mcp/package.json`
- Create: `docs/migration/vnext-audit-preview.md`

- [ ] **Step 1: Write a failing phase-gate test**

The test must start a real runtime, post a handshake and prompt event, request a capsule, store a delivery, send one audit proxy request to a fake upstream, and assert:

```ts
assert.equal(result.agent_request_unchanged, true);
assert.equal(result.receipts.length, 1);
assert.equal(result.receipts[0].mode, "audit");
assert.equal(result.daemon_outage_result, "failed_open");
assert.equal(result.mcp_calls_required, 0);
```

- [ ] **Step 2: Run the phase gate and confirm the first failing assertion**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/phase-a-gate.test.js
```

Expected: at least one Gate A assertion fails before CI/report integration is complete.

- [ ] **Step 3: Add dual-runtime CI**

Add a Node 18 job that builds on Node 22, then runs the built legacy CLI under Node 18 without touching a vNext command. Keep the full test job on Node 22. Add `test:vnext`:

```json
{
  "scripts": {
    "test:vnext": "npm run build && node --test dist/vnext/**/*.test.js"
  }
}
```

- [ ] **Step 4: Add a reproducible audit report**

`scripts/vnext-phase-a-report.mjs` reads receipts and prints JSON with:

```json
{
  "tasks": 0,
  "attachment_success_rate": null,
  "measurement": { "exact": 0, "partial": 0, "unavailable": 0 },
  "context_latency_p50_ms": null,
  "context_latency_p95_ms": null,
  "failed_open_requests": 0,
  "prompt_mutations": 0
}
```

For an empty audit period, values remain `null` rather than appearing as successful zero-cost metrics.

- [ ] **Step 5: Run all Phase A verification and commit**

Run:

```bash
npm run test:vnext --prefix mcp
npm test --prefix mcp
node scripts/vnext-phase-a-report.mjs --project . --json
node mcp/dist/cli.js refresh --project . --json
node mcp/dist/cli.js pr check --project . --json
```

Expected: all tests and Kage checks pass; report says audit mode and contains no fabricated savings.

```bash
git add mcp/vnext scripts/vnext-phase-a-report.mjs .github/workflows/ci.yml mcp/package.json docs/migration/vnext-audit-preview.md
git commit -m "test: enforce Kage vNext Phase A gate"
```

## Phase A completion gate

Do not start Phase B until:

- At least two automatic paths—Claude hooks and the Anthropic proxy—produce events without MCP recall calls.
- Daemon and receipt tests demonstrate fail-open behavior.
- A seven-day internal audit produces measurement-quality counts and latency percentiles.
- No request body is mutated in audit mode.
- Node 18 legacy load smoke passes.
- The existing MCP package suite passes unchanged.
