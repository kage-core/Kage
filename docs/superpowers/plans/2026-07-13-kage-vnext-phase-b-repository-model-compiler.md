# Kage vNext Phase B: Repository Model and Knowledge Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace packet-first operational memory with an evidence-backed repository model and compiler that turns repository/agent events into current features, components, flows, claims, decisions, and runbooks.

**Architecture:** Extend the Phase A SQLite database with versioned entities, claims, evidence, relations, episodes, review items, and compiler checkpoints. Reuse the existing code graph and verified packet reader through narrow adapters, then consolidate deterministic facts and model proposals through explicit trust policies. Switch context from legacy recall to the model only after shadow comparisons pass.

**Tech Stack:** TypeScript, Node.js, `node:sqlite`, existing code graph/OKF functions behind adapters, Node test runner, deterministic extractors, and a provider-neutral optional extraction interface.

---

## Task 1: Add repository-model schema and domain types

**Files:**
- Create: `mcp/vnext/repo-model/types.ts`
- Create: `mcp/vnext/repo-model/schema.ts`
- Create: `mcp/vnext/repo-model/model.test.ts`
- Modify: `mcp/vnext/storage/migrations.ts`

- [ ] **Step 1: Write failing schema and trust-state tests**

```ts
test("model migration creates versioned entity and claim tables", () => {
  const db = migratedDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => String(row.name));
  for (const table of ["entities", "claims", "evidence", "relations", "episodes", "review_items", "compiler_checkpoints"]) {
    assert.ok(tables.includes(table), table);
  }
});

test("only verified and approved claims are injectable", () => {
  assert.equal(isInjectableTrustState("verified"), true);
  assert.equal(isInjectableTrustState("approved"), true);
  for (const state of ["proposed", "disputed", "stale", "superseded", "archived"] as const) {
    assert.equal(isInjectableTrustState(state), false, state);
  }
});
```

- [ ] **Step 2: Run tests and confirm missing schema failure**

Run:

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/repo-model/model.test.js
```

Expected: missing repository-model modules.

- [ ] **Step 3: Define stable model types**

```ts
import type { PrivacyClass, TrustState } from "../protocol/types.js";

export type EntityKind =
  | "repository"
  | "feature"
  | "component"
  | "flow"
  | "contract"
  | "data_model"
  | "invariant"
  | "runbook"
  | "decision"
  | "incident"
  | "owner"
  | "dependency"
  | "test_surface";

export type ImpactClass = "low" | "medium" | "high" | "critical";

export interface EntityRecord {
  entity_id: string;
  repository_id: string;
  kind: EntityKind;
  canonical_name: string;
  slug: string;
  summary: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface ClaimRecord {
  claim_id: string;
  entity_id: string;
  claim_kind: string;
  normalized_content: string;
  trust_state: TrustState;
  confidence: number;
  impact_class: ImpactClass;
  valid_from_commit: string | null;
  valid_to_commit: string | null;
  supersedes_claim_id: string | null;
  review_policy: "automatic" | "owner" | "security" | "operations";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRecord {
  evidence_id: string;
  repository_id: string;
  source_type: "source" | "git" | "test" | "ci" | "document" | "pr" | "agent_event" | "human";
  source_uri: string;
  source_fingerprint: string;
  commit: string | null;
  path: string | null;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  verification_method: string;
  verification_state: "verified" | "failed" | "unavailable";
  privacy_class: PrivacyClass;
  observed_at: string;
}

export interface RelationRecord {
  relation_id: string;
  repository_id: string;
  from_entity_id: string;
  relation_type: string;
  to_entity_id: string;
  evidence_id: string | null;
  created_at: string;
}

export interface ReviewItemRecord {
  review_item_id: string;
  repository_id: string;
  claim_id: string;
  reason: string;
  required_role: string;
  status: "open" | "accepted" | "rejected" | "superseded";
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface ClaimWithEvidence {
  claim: ClaimRecord;
  evidence: Array<{ evidence: EvidenceRecord; stance: "supports" | "contradicts" }>;
}

export interface RelatedEntity {
  entity: EntityRecord;
  relation_type: string;
  evidence_id: string | null;
}

export function isInjectableTrustState(state: TrustState): boolean {
  return state === "verified" || state === "approved";
}
```

- [ ] **Step 4: Add migration 002**

Use normalized tables and foreign keys. Important constraints:

```sql
CREATE TABLE entities (
  entity_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(repository_id, kind, slug)
);
CREATE TABLE claims (
  claim_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  claim_kind TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  impact_class TEXT NOT NULL,
  valid_from_commit TEXT,
  valid_to_commit TEXT,
  supersedes_claim_id TEXT REFERENCES claims(claim_id),
  review_policy TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE evidence (
  evidence_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  commit_hash TEXT,
  path TEXT,
  symbol TEXT,
  line_start INTEGER,
  line_end INTEGER,
  verification_method TEXT NOT NULL,
  verification_state TEXT NOT NULL,
  privacy_class TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  UNIQUE(repository_id, source_type, source_uri, source_fingerprint)
);
CREATE TABLE claim_evidence (
  claim_id TEXT NOT NULL REFERENCES claims(claim_id),
  evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id),
  stance TEXT NOT NULL CHECK(stance IN ('supports','contradicts')),
  PRIMARY KEY(claim_id, evidence_id)
);
CREATE TABLE relations (
  relation_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  relation_type TEXT NOT NULL,
  to_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
  evidence_id TEXT REFERENCES evidence(evidence_id),
  created_at TEXT NOT NULL,
  UNIQUE(from_entity_id, relation_type, to_entity_id, evidence_id)
);
CREATE TABLE episodes (
  episode_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  task_id TEXT,
  episode_type TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  event_ids_json TEXT NOT NULL,
  outcome TEXT NOT NULL
);
CREATE TABLE review_items (
  review_item_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  claim_id TEXT NOT NULL REFERENCES claims(claim_id),
  reason TEXT NOT NULL,
  required_role TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_to TEXT,
  decided_by TEXT,
  decided_at TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE compiler_checkpoints (
  compiler_name TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  last_event_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(compiler_name, repository_id)
);
```

- [ ] **Step 5: Run storage/model tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/storage/storage.test.js mcp/dist/vnext/repo-model/model.test.js
npm test --prefix mcp
git add mcp/vnext/repo-model mcp/vnext/storage/migrations.ts
git commit -m "feat: add canonical repository model schema"
```

## Task 2: Implement the repository-model API

**Files:**
- Create: `mcp/vnext/repo-model/repository.ts`
- Create: `mcp/vnext/repo-model/queries.ts`
- Create: `mcp/vnext/repo-model/repository.test.ts`

- [ ] **Step 1: Write failing versioning and evidence tests**

```ts
test("superseding a claim preserves history and excludes the old claim", () => {
  const model = fixtureModel();
  const first = model.createClaim(fixtureClaim({ normalized_content: "Auth uses sessions." }));
  const second = model.supersedeClaim(first.claim_id, fixtureClaim({ normalized_content: "Auth uses signed sessions." }));
  assert.equal(model.getClaim(first.claim_id)?.trust_state, "superseded");
  assert.equal(second.supersedes_claim_id, first.claim_id);
  assert.deepEqual(model.injectableClaims(first.entity_id).map((claim) => claim.claim_id), [second.claim_id]);
});

test("a verified claim requires verified supporting evidence", () => {
  const model = fixtureModel();
  assert.throws(() => model.createClaim(fixtureClaim({ trust_state: "verified" })), /supporting evidence/);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/repo-model/repository.test.js
```

Expected: repository implementation missing.

- [ ] **Step 3: Implement transaction-bound writes**

Expose only:

```ts
export interface RepositoryModel {
  upsertEntity(input: EntityRecord): EntityRecord;
  getEntity(entityId: string): EntityRecord | null;
  findEntity(repositoryId: string, kind: EntityKind, slug: string): EntityRecord | null;
  listEntities(repositoryId: string, kind?: EntityKind): EntityRecord[];
  addEvidence(input: EvidenceRecord): EvidenceRecord;
  createClaim(input: ClaimRecord, evidence: Array<{ evidence_id: string; stance: "supports" | "contradicts" }>): ClaimRecord;
  supersedeClaim(claimId: string, replacement: ClaimRecord, evidence: Array<{ evidence_id: string; stance: "supports" | "contradicts" }>): ClaimRecord;
  transitionClaim(claimId: string, to: TrustState, actor: string): ClaimRecord;
  addRelation(input: RelationRecord): RelationRecord;
  createReviewItem(input: ReviewItemRecord): ReviewItemRecord;
  injectableClaims(entityId: string): ClaimRecord[];
}
```

Trust transitions are explicit. Disallow `proposed -> approved` without a completed review item and disallow transitions out of `superseded` or `archived`.

- [ ] **Step 4: Add read models for features and runbooks**

```ts
export interface FeatureReadModel {
  feature: EntityRecord;
  claims: ClaimWithEvidence[];
  components: RelatedEntity[];
  flows: RelatedEntity[];
  contracts: RelatedEntity[];
  owners: RelatedEntity[];
  tests: RelatedEntity[];
  decisions: RelatedEntity[];
  runbooks: RelatedEntity[];
  incidents: RelatedEntity[];
  health: { verified: number; stale: number; disputed: number; missing_required_fields: string[] };
}
```

Queries must not silently include proposed, stale, disputed, superseded, or archived claims in `current` views.

- [ ] **Step 5: Run tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/repo-model/repository.test.js
npm test --prefix mcp
git add mcp/vnext/repo-model
git commit -m "feat: add versioned repository model API"
```

## Task 3: Adapt existing code and document indexes into evidence

**Files:**
- Create: `mcp/vnext/repo-index/source.ts`
- Create: `mcp/vnext/repo-index/legacy-code-graph.ts`
- Create: `mcp/vnext/repo-index/git-index.ts`
- Create: `mcp/vnext/repo-index/document-index.ts`
- Create: `mcp/vnext/repo-index/repository-scanner.ts`
- Create: `mcp/vnext/repo-index/repo-index.test.ts`

- [ ] **Step 1: Write failing route, symbol, test, ownership, and document evidence tests**

```ts
test("scanner emits route-to-handler and handler-to-test evidence", async () => {
  const project = fixtureRepository({ route: "POST /refunds", handler: "createRefund", test: "refund.test.ts" });
  const snapshot = await scanRepository(project);
  assert.ok(snapshot.facts.some((fact) => fact.kind === "route" && fact.name === "POST /refunds"));
  assert.ok(snapshot.relations.some((relation) => relation.type === "verified_by" && relation.to.includes("refund.test.ts")));
});

test("scanner keeps code graph certainty separate from inferred feature grouping", async () => {
  const snapshot = await scanRepository(fixtureRepository());
  assert.ok(snapshot.facts.every((fact) => fact.confidence === 1));
  assert.ok(snapshot.proposals.every((proposal) => proposal.trust_state === "proposed"));
});
```

- [ ] **Step 2: Run tests and confirm missing scanner**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/repo-index/repo-index.test.js
```

- [ ] **Step 3: Define the index snapshot**

```ts
export interface IndexedFact {
  fact_id: string;
  kind: "file" | "symbol" | "route" | "test" | "script" | "document" | "owner" | "dependency";
  name: string;
  path: string;
  line: number | null;
  fingerprint: string;
  confidence: 1;
}

export interface IndexedRelation {
  from: string;
  type: "contains" | "calls" | "imports" | "exposes" | "verified_by" | "owned_by" | "depends_on";
  to: string;
  evidence_fact_ids: string[];
}

export interface RepositorySnapshot {
  repository: RepositoryIdentity;
  facts: IndexedFact[];
  relations: IndexedRelation[];
  proposals: Array<{ kind: "feature" | "flow"; name: string; evidence_fact_ids: string[]; trust_state: "proposed" }>;
}
```

- [ ] **Step 4: Wrap existing graph functions narrowly**

`legacy-code-graph.ts` may call current graph/index functions, but exports only `RepositorySnapshot`. Normalize repository-relative paths, preserve parser/source confidence, and create evidence fingerprints from current source content. `git-index.ts` adds author/co-change evidence without converting bus-factor heuristics into facts. `document-index.ts` preserves heading anchors.

- [ ] **Step 5: Run graph regressions and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/repo-index/repo-index.test.js
node --test --test-name-pattern "code graph|docs index|contributors" mcp/dist/kernel.test.js
npm test --prefix mcp
git add mcp/vnext/repo-index
git commit -m "feat: adapt repository indexes into evidence snapshots"
```

## Task 4: Group evidence events into episodes

**Files:**
- Create: `mcp/vnext/compiler/episode-builder.ts`
- Create: `mcp/vnext/compiler/episode-builder.test.ts`

- [ ] **Step 1: Write failing grouping tests**

```ts
test("prompt edits test failure and fix become one debugging episode", () => {
  const episodes = buildEpisodes([
    event("prompt", 0),
    event("file_edit", 10),
    event("tool_result", 20, { command: "npm test", exit_code: 1 }),
    event("file_edit", 30),
    event("tool_result", 40, { command: "npm test", exit_code: 0 }),
    event("session_end", 50),
  ]);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episode_type, "debugging");
  assert.equal(episodes[0].outcome, "verified_success");
});

test("events from different repositories never share an episode", () => {
  const episodes = buildEpisodes([event("prompt", 0, {}, "repo-a"), event("file_edit", 2, {}, "repo-b")]);
  assert.equal(episodes.length, 2);
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/episode-builder.test.js
```

- [ ] **Step 3: Implement deterministic episode boundaries**

Group by repository and task. Close an episode on session end, 30 minutes of inactivity, explicit task change, or successful verification following a failure. Classify from event sequence as `implementation`, `debugging`, `review`, `runbook_execution`, `incident`, or `investigation`.

- [ ] **Step 4: Persist episodes idempotently**

Derive `episode_id` from repository, task, first event, and last event. Reprocessing the same checkpoint must produce no duplicate episode.

- [ ] **Step 5: Run tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/episode-builder.test.js
npm test --prefix mcp
git add mcp/vnext/compiler/episode-builder.ts mcp/vnext/compiler/episode-builder.test.ts
git commit -m "feat: compile agent events into work episodes"
```

## Task 5: Add deterministic claim extractors and admission policy

**Files:**
- Create: `mcp/vnext/compiler/candidates.ts`
- Create: `mcp/vnext/compiler/extractors/command.ts`
- Create: `mcp/vnext/compiler/extractors/change.ts`
- Create: `mcp/vnext/compiler/extractors/failure.ts`
- Create: `mcp/vnext/compiler/extractors/repository.ts`
- Create: `mcp/vnext/compiler/admission.ts`
- Create: `mcp/vnext/compiler/extractors.test.ts`

- [ ] **Step 1: Write failing junk-rejection and evidence tests**

```ts
test("failed command alone is evidence, not a runbook", () => {
  const candidates = extractCommandCandidates(episodeWithCommand("npm test", 1));
  assert.equal(candidates.some((candidate) => candidate.entity_kind === "runbook"), false);
});

test("successful repeated command with repository declaration becomes a verified runbook candidate", () => {
  const candidates = extractCommandCandidates(episodeWithCommand("npm test", 0), repositoryWithScript("test"));
  const runbook = candidates.find((candidate) => candidate.entity_kind === "runbook");
  assert.equal(runbook?.proposed_trust_state, "verified");
  assert.ok(runbook?.evidence_ids.length);
});

test("raw tool dumps are rejected from durable candidate content", () => {
  assert.equal(admitCandidate(candidate({ content: "Tool failed cwd=/tmp duration_ms=123 " + "x".repeat(4000) })).admit, false);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/extractors.test.js
```

- [ ] **Step 3: Define compiler candidates**

```ts
export interface ClaimCandidate {
  candidate_id: string;
  repository_id: string;
  entity_kind: EntityKind;
  entity_name: string;
  claim_kind: string;
  content: string;
  evidence_ids: string[];
  proposed_trust_state: "proposed" | "verified";
  impact_class: ImpactClass;
  extraction_method: "deterministic" | "model";
  review_policy: ClaimRecord["review_policy"];
}
```

- [ ] **Step 4: Implement admission rules**

Automatically verified candidates must be deterministic, low/medium impact, and backed by current direct evidence. Decisions, ownership, security/privacy rules, production operations, and critical invariants always remain proposed with the corresponding review role. Reject session bookkeeping, generic prompts, file lists, raw payloads, failed commands presented as procedures, and content without a reusable trigger or repository entity.

- [ ] **Step 5: Run existing distillation regressions and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/extractors.test.js
node --test --test-name-pattern "distillation|admission|dump-like" mcp/dist/kernel.test.js
npm test --prefix mcp
git add mcp/vnext/compiler
git commit -m "feat: extract evidence-gated repository claims"
```

## Task 6: Add provider-neutral model extraction in shadow mode

**Files:**
- Create: `mcp/vnext/compiler/model-provider.ts`
- Create: `mcp/vnext/compiler/model-extractor.ts`
- Create: `mcp/vnext/compiler/model-extractor.test.ts`
- Modify: `mcp/vnext/runtime/config.ts`
- Modify: `mcp/vnext/measurement/receipt.ts`

- [ ] **Step 1: Write failing schema, privacy, trust, and cost tests**

```ts
test("model extraction emits proposals and never establishes trust", async () => {
  const provider = fakeModelProvider({
    entities: [{ kind: "decision", name: "Session storage" }],
    claims: [{ entity_name: "Session storage", claim_kind: "rationale", content: "Sessions were chosen for revocation.", evidence_event_ids: ["event-1"] }],
  });
  const result = await extractWithModel(redactedEpisode(), provider);
  assert.equal(result.candidates[0].proposed_trust_state, "proposed");
  assert.equal(result.candidates[0].extraction_method, "model");
});

test("raw secrets are redacted before the provider request", async () => {
  const provider = recordingModelProvider();
  await extractWithModel(episodeContaining("Authorization: Bearer secret-token"), provider);
  assert.doesNotMatch(provider.lastRequest, /secret-token/);
  assert.match(provider.lastRequest, /\[REDACTED\]/);
});

test("invalid evidence ids reject the model candidate", async () => {
  const result = await extractWithModel(redactedEpisode(), fakeModelProvider({ claims: [{ entity_name: "Auth", claim_kind: "fact", content: "Invented", evidence_event_ids: ["missing"] }] }));
  assert.equal(result.candidates.length, 0);
  assert.match(result.rejections[0], /unknown evidence_event_id/);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/model-extractor.test.js
```

- [ ] **Step 3: Define the provider and response schema**

```ts
export interface ModelExtractionRequest {
  repository_id: string;
  episode_id: string;
  redacted_summary: string;
  allowed_event_ids: string[];
  allowed_entity_kinds: EntityKind[];
  max_candidates: number;
}

export interface ModelExtractionResponse {
  entities: Array<{ kind: EntityKind; name: string; evidence_event_ids: string[] }>;
  claims: Array<{ entity_name: string; claim_kind: string; content: string; evidence_event_ids: string[]; impact_class: ImpactClass }>;
}

export interface ModelExtractionProvider {
  provider_id: string;
  extract(request: ModelExtractionRequest): Promise<{ response: unknown; input_tokens: number | null; output_tokens: number | null; cost_usd: number | null }>;
}
```

- [ ] **Step 4: Implement shadow-mode safeguards**

The compiler sends a redacted episode summary and stable evidence IDs, not a raw transcript. `model_extraction` defaults to `off`; `local` permits a configured local model, and `remote_approved` requires workspace policy explicitly permitting each evidence class. Source snippets, private URLs, secrets, and raw tool payloads are excluded unless that policy allows them. Validate the response with strict allowlists, reject unknown evidence or entity kinds, clamp candidate count, and route every accepted model candidate to `proposed`. Record provider/model, tokens, cost, latency, accepted/rejected counts, and redaction count in a processing receipt. A timeout or invalid response leaves deterministic compilation unchanged.

- [ ] **Step 5: Run tests and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/model-extractor.test.js
npm test --prefix mcp
git add mcp/vnext/compiler/model-provider.ts mcp/vnext/compiler/model-extractor.ts mcp/vnext/compiler/model-extractor.test.ts mcp/vnext/runtime/config.ts mcp/vnext/measurement/receipt.ts
git commit -m "feat: extract model-assisted knowledge as untrusted proposals"
```

## Task 7: Resolve entities and consolidate claims

**Files:**
- Create: `mcp/vnext/compiler/entity-resolver.ts`
- Create: `mcp/vnext/compiler/consolidator.ts`
- Create: `mcp/vnext/compiler/consolidation.test.ts`

- [ ] **Step 1: Write failing alias and duplicate tests**

```ts
test("auth service aliases resolve to one component", () => {
  const resolver = fixtureResolver([{ entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" }]);
  for (const name of ["auth service", "auth-service", "packages/auth"]) {
    assert.equal(resolver.resolve("component", name, [evidenceFor("packages/auth")]).entity_id, "component-auth");
  }
});

test("same supported fact refreshes evidence instead of appending a duplicate claim", () => {
  const result = consolidate(existingClaim("Tests run with npm test"), candidate("Tests run with npm test"));
  assert.equal(result.action, "refresh_evidence");
});

test("opposing supported facts create a contradiction review item", () => {
  const result = consolidate(existingClaim("Auth uses sessions"), candidate("Auth does not use sessions"));
  assert.equal(result.action, "review_contradiction");
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/consolidation.test.js
```

- [ ] **Step 3: Implement deterministic entity keys first**

Resolve exact stable IDs, path/symbol anchors, canonical slug, and declared aliases before any semantic comparison. Model-assisted alias suggestions may create proposed aliases but cannot merge entities automatically.

- [ ] **Step 4: Implement four consolidation outcomes**

```ts
export type ConsolidationAction =
  | { action: "create"; candidate: ClaimCandidate }
  | { action: "refresh_evidence"; claim_id: string; evidence_ids: string[] }
  | { action: "supersede"; claim_id: string; replacement: ClaimCandidate }
  | { action: "review_contradiction"; claim_id: string; candidate: ClaimCandidate };
```

Never overwrite claim content in place. Content changes create a new version and supersession link after policy permits it.

- [ ] **Step 5: Run contradiction regressions and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/consolidation.test.js
node --test --test-name-pattern "contradiction" mcp/dist/kernel.test.js
npm test --prefix mcp
git add mcp/vnext/compiler/entity-resolver.ts mcp/vnext/compiler/consolidator.ts mcp/vnext/compiler/consolidation.test.ts
git commit -m "feat: consolidate repository entities and claims"
```

## Task 8: Add evidence verification, staleness, and compiler pipeline

**Files:**
- Create: `mcp/vnext/compiler/verifier.ts`
- Create: `mcp/vnext/compiler/staleness.ts`
- Create: `mcp/vnext/compiler/pipeline.ts`
- Create: `mcp/vnext/compiler/pipeline.test.ts`
- Modify: `mcp/vnext/runtime/server.ts`

- [ ] **Step 1: Write failing verification and invalidation tests**

```ts
test("changed cited symbol marks only dependent claims stale", async () => {
  const model = fixtureModelWithTwoClaims();
  await invalidateChangedEvidence(model, ["src/auth.ts#login"]);
  assert.equal(model.getClaim("login-claim")?.trust_state, "stale");
  assert.equal(model.getClaim("billing-claim")?.trust_state, "verified");
});

test("compiler checkpoint makes replay idempotent", async () => {
  const pipeline = fixturePipeline();
  await pipeline.run("repo-1");
  const first = pipeline.model.countClaims();
  await pipeline.run("repo-1");
  assert.equal(pipeline.model.countClaims(), first);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/pipeline.test.js
```

- [ ] **Step 3: Implement verification methods**

Support exact source fingerprint, symbol fingerprint, package script, test pass, CI run, Git commit/diff, document anchor, and authorized human review. Model assertions are extraction metadata, not verification methods.

- [ ] **Step 4: Implement incremental pipeline scheduling**

The daemon schedules compilation after event batches and source changes. Context requests never wait for compilation. Use the last verified model replica and expose `model_lag_events` plus `last_compiled_at` in status.

- [ ] **Step 5: Run trajectory and pipeline tests, then commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/compiler/pipeline.test.js mcp/dist/trajectory.test.js
npm test --prefix mcp
git add mcp/vnext/compiler mcp/vnext/runtime/server.ts
git commit -m "feat: verify and incrementally compile repository knowledge"
```

## Task 9: Import packets and export model knowledge through OKF

**Files:**
- Create: `mcp/vnext/migration/packet-importer.ts`
- Create: `mcp/vnext/migration/migration-report.ts`
- Create: `mcp/vnext/migration/packet-importer.test.ts`
- Create: `mcp/vnext/okf/model-export.ts`
- Create: `mcp/vnext/okf/model-export.test.ts`
- Modify: `mcp/vnext/storage/migrations.ts`
- Modify: `mcp/okf.ts`
- Modify: `mcp/cli.ts`

- [ ] **Step 1: Write failing lossless migration tests**

```ts
test("packet import preserves identity status attribution and original content", () => {
  const packet = fixturePacket({ id: "packet-1", status: "superseded", author_name: "A. Dev" });
  const result = importPacket(packet, fixtureModel());
  assert.equal(result.legacy_packet_id, "packet-1");
  assert.equal(result.claim.trust_state, "superseded");
  assert.equal(result.claim.created_by, "A. Dev");
  assert.equal(result.original_packet.body, packet.body);
});

test("legacy quality score never establishes vNext trust", () => {
  const result = importPacket(fixturePacket({ quality: { score: 100 }, paths: [] }), fixtureModel());
  assert.equal(result.claim.trust_state, "proposed");
});
```

- [ ] **Step 2: Run migration tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/migration/packet-importer.test.js
```

- [ ] **Step 3: Implement dry-run migration planning**

Add:

```text
kage migrate plan --project <dir> [--json]
kage migrate apply --project <dir> --plan <path> [--json]
kage export --project <dir> --format okf --out <dir>
```

The plan reports create, merge, archive, review, ungrounded, and rejected-junk counts. `apply` accepts only a plan whose source packet fingerprints still match. It records each mapping in `legacy_packet_migrations` and never deletes packet files.

```sql
CREATE TABLE legacy_packet_migrations (
  legacy_packet_id TEXT PRIMARY KEY,
  source_fingerprint TEXT NOT NULL,
  entity_id TEXT REFERENCES entities(entity_id),
  claim_id TEXT REFERENCES claims(claim_id),
  disposition TEXT NOT NULL,
  original_packet_json TEXT NOT NULL,
  migrated_at TEXT NOT NULL
);
```

- [ ] **Step 4: Export current model records as OKF concepts**

Each exported concept includes current claims in the body, source-backed evidence references, trust/freshness in `x-kage-*` fields, and legacy packet IDs where applicable. Round-trip tests must preserve vNext identifiers even when imported by a foreign OKF consumer that ignores Kage extensions.

- [ ] **Step 5: Run OKF and migration tests, then commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/migration/packet-importer.test.js mcp/dist/vnext/okf/model-export.test.js mcp/dist/okf.test.js
npm test --prefix mcp
git add mcp/vnext/migration mcp/vnext/okf mcp/okf.ts mcp/cli.ts
git commit -m "feat: migrate packet memory into the repository model"
```

## Task 10: Add model-backed context and the Phase B gate

**Files:**
- Create: `mcp/vnext/context/model-source.ts`
- Create: `mcp/vnext/context/context-comparison.ts`
- Create: `mcp/vnext/context/model-source.test.ts`
- Create: `mcp/vnext/phase-b-gate.test.ts`
- Create: `scripts/vnext-phase-b-report.mjs`
- Modify: `mcp/vnext/runtime/config.ts`
- Modify: `mcp/vnext/runtime/server.ts`
- Modify: `mcp/cli.ts`
- Create: `docs/migration/packet-model-migration.md`

- [ ] **Step 1: Write failing model-source and comparison tests**

```ts
test("model source returns current architecture rather than historical implementation notes", async () => {
  const source = fixtureModelSource(repositoryModelFixture());
  const candidates = await source.find(fixtureContextRequest({ query: "how does authentication work?" }));
  assert.equal(candidates[0].kind, "feature");
  assert.match(candidates[0].body, /entry point|flow|invariant/i);
  assert.equal(candidates.some((candidate) => candidate.trust_state !== "verified" && candidate.trust_state !== "approved"), false);
});

test("compare mode records both sources but delivers legacy only", async () => {
  const result = await compareContextSources(fixtureRequest(), legacySource(), modelSource());
  assert.equal(result.delivered_source, "legacy");
  assert.ok(result.comparison.model_candidate_ids.length > 0);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/context/model-source.test.js
```

- [ ] **Step 3: Implement graph expansion and trust filtering**

Seed exact task targets and feature matches, expand at most two relation hops, prioritize critical invariants and verification surfaces, then budget with the existing Phase A builder. Store candidate IDs and rejection reasons for every comparison.

- [ ] **Step 4: Add controlled source progression**

`context_source=compare` delivers legacy context and records the model candidate set. Switch to `model` only when the frozen evaluation corpus meets:

- No stale/disputed injection.
- At least the legacy source's answer-support rate.
- Lower or equal median capsule size.
- Higher feature/runbook entity coverage.
- No critical invariant regression.

Add `kage model export-fixture --project <dir> --out <path>` to serialize a deterministic repository-model v1 fixture for cross-phase compatibility tests. The command sorts every entity, claim, evidence record, and relation by stable ID and excludes local paths, raw payloads, and generated timestamps.

- [ ] **Step 5: Run the Phase B gate and commit**

```bash
npm run build --prefix mcp
node --test mcp/dist/vnext/phase-b-gate.test.js
npm test --prefix mcp
node scripts/vnext-phase-b-report.mjs --project . --json
node mcp/dist/cli.js migrate plan --project . --json
node mcp/dist/cli.js refresh --project . --json
node mcp/dist/cli.js pr check --project . --json
git add mcp/vnext scripts/vnext-phase-b-report.mjs docs/migration/packet-model-migration.md
git commit -m "test: enforce Kage vNext Phase B gate"
```

Expected: repository-model fixtures, packet migration, compiler idempotency, staleness, and context comparison all pass.

## Phase B completion gate

Do not make the portal or gateway depend on the model until:

- The model schema and protocol fixtures are frozen as version 1.
- Packet migration is dry-run first, fingerprint guarded, and reversible by OKF export.
- Deterministic low-risk facts auto-verify; high-impact facts always route to review.
- New events consolidate rather than accumulate duplicate claims.
- The model source passes shadow comparison against legacy recall.
- Real repository fixtures produce feature, component, flow, decision, test, owner, and runbook read models.
