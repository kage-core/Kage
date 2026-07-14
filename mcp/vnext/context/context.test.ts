import assert from "node:assert/strict";
import test from "node:test";
import { packetVerificationLabel, type MemoryPacket } from "../../kernel.js";
import type { CapsuleSection } from "../protocol/index.js";
import {
  MAX_CAPSULE_ENVELOPE_TOKENS,
  buildContextCapsule,
  renderCapsuleSection,
} from "./capsule-builder.js";
import { LegacyContextSource, type LegacyKernelFunctions, type LegacyPacket } from "./legacy-source.js";
import {
  MAX_CONTEXT_IDENTIFIER_BYTES,
  MAX_CONTEXT_PATHS,
  MAX_CONTEXT_PATH_BYTES,
  MAX_CONTEXT_QUERY_BYTES,
  MAX_CONTEXT_TOKEN_BUDGET,
  validateContextRequest,
  type ContextCandidate,
  type ContextRequest,
  type ContextSource,
} from "./source.js";
import { estimateTokens } from "./token-estimate.js";

const NOW = new Date("2026-07-13T06:00:00.000Z");

function fixtureContextRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    repository: {
      repo_id: "repo-1",
      root: "/repo",
      remote: null,
      branch: "main",
      commit: "abc123",
      worktree: "/repo",
    },
    task: {
      task_id: "task-1",
      session_id: "session-1",
      user_id: null,
      agent_surface: "codex",
    },
    query: "change the refund flow",
    targets: ["src/refunds.ts"],
    changed_files: [],
    token_budget: 1_200,
    ...overrides,
  };
}

function fixtureCandidate(overrides: Partial<ContextCandidate> = {}): ContextCandidate {
  const kind = overrides.kind ?? "decision";
  const priority = overrides.priority ?? 10;
  const title = overrides.title ?? "Candidate";
  return {
    candidate_id: overrides.candidate_id ?? `${kind}-${priority}-${title}`,
    kind,
    title,
    body: "Use the established flow.",
    evidence_ids: ["packet-1"],
    trust_state: "verified",
    priority,
    ...overrides,
  };
}

class FakeContextSource implements ContextSource {
  constructor(private readonly candidates: ContextCandidate[]) {}

  async find(_request: ContextRequest): Promise<ContextCandidate[]> {
    return this.candidates;
  }
}

test("context request validation projects a fresh strict protocol value", () => {
  const request = fixtureContextRequest();
  const result = validateContextRequest(request);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, request);
  assert.notEqual(result.value, request);
  assert.notEqual(result.value.repository, request.repository);
  assert.notEqual(result.value.task, request.task);
  assert.notEqual(result.value.targets, request.targets);

  request.targets.push("src/late-mutation.ts");
  assert.deepEqual(result.value.targets, ["src/refunds.ts"]);
});

test("context request validation rejects inherited, extra, sparse, and oversized values", () => {
  const inherited = Object.assign(Object.create({ query: "inherited query" }) as object, {
    ...fixtureContextRequest(),
    query: undefined,
  });
  delete (inherited as { query?: unknown }).query;

  const sparseTargets: string[] = [];
  sparseTargets.length = 1;

  const invalidValues: unknown[] = [
    inherited,
    { ...fixtureContextRequest(), unexpected: "trusted-by-accident" },
    { ...fixtureContextRequest(), repository: { ...fixtureContextRequest().repository, unexpected: true } },
    { ...fixtureContextRequest(), task: { ...fixtureContextRequest().task, unexpected: true } },
    { ...fixtureContextRequest(), targets: sparseTargets },
    { ...fixtureContextRequest(), changed_files: [""] },
    { ...fixtureContextRequest(), query: "  " },
    { ...fixtureContextRequest(), token_budget: 0 },
    { ...fixtureContextRequest(), token_budget: 1.5 },
    { ...fixtureContextRequest(), token_budget: MAX_CONTEXT_TOKEN_BUDGET + 1 },
  ];

  for (const value of invalidValues) {
    assert.equal(validateContextRequest(value).ok, false, JSON.stringify(value));
  }
});

test("token estimate uses exact UTF-8 bytes for multibyte text", () => {
  assert.equal(Buffer.byteLength("ééé", "utf8"), 6);
  assert.equal(estimateTokens("ééé"), 2);
  assert.equal(estimateTokens("abcdé"), 2);
});

test("capsule builder keeps required invariants and stays inside 1200 tokens", async () => {
  const source = new FakeContextSource([
    fixtureCandidate({ candidate_id: "invariant", kind: "invariant", priority: 100, body: "Refunds use the ledger." }),
    ...Array.from({ length: 30 }, (_, index) => fixtureCandidate({
      candidate_id: `decision-${index}`,
      kind: "decision",
      priority: index,
      title: `Decision ${index}`,
      body: "x".repeat(400),
    })),
  ]);

  const capsule = await buildContextCapsule(source, fixtureContextRequest({ token_budget: 1_200 }), { now: () => NOW });

  assert.ok(capsule.estimated_tokens <= 1_200);
  assert.ok(capsule.sections.some((section) => section.kind === "invariant"));
  assert.equal(capsule.estimated_tokens, serializedSectionTokens(capsule.sections));
});

// The bytes the sections array actually costs on the wire, excluding the enclosing brackets,
// which belong to the envelope. Derived from JSON.stringify, not from the builder's own
// accounting, so it cannot agree with the builder by construction.
function serializedSectionTokens(sections: readonly CapsuleSection[]): number {
  if (!sections.length) return 0;
  const serialized = JSON.stringify(sections);
  return estimateTokens(serialized.slice(1, -1));
}

test("capsule budget accounting does not overshoot on exact token boundaries", async () => {
  // Sections whose rendered length lands so that per-section token rounding would leave no
  // slack: charging each section its own ceil() and the array its brackets used to push the
  // real serialized array one token past the budget.
  for (let bodyLength = 1; bodyLength <= 64; bodyLength += 1) {
    const source = new FakeContextSource(Array.from({ length: 12 }, (_, index) => fixtureCandidate({
      candidate_id: `decision-${index}`,
      kind: "decision",
      priority: index,
      title: `D${index}`,
      body: "x".repeat(bodyLength),
    })));
    const capsule = await buildContextCapsule(
      source,
      fixtureContextRequest({ token_budget: 40 }),
      { now: () => NOW },
    );
    assert.equal(capsule.estimated_tokens, serializedSectionTokens(capsule.sections));
    assert.ok(
      capsule.estimated_tokens <= 40,
      `bodyLength ${bodyLength}: ${capsule.estimated_tokens} > 40`,
    );
  }
});

test("capsule payload honours its budget in the bytes actually serialized", async () => {
  // Worst-case legal input: identifiers and a query at their validated caps, made of
  // control characters so JSON escaping expands every input byte six-fold.
  const query = "\u0001".repeat(MAX_CONTEXT_QUERY_BYTES);
  const identifier = "\u0001".repeat(MAX_CONTEXT_IDENTIFIER_BYTES);
  const request = fixtureContextRequest({
    repository: { ...fixtureContextRequest().repository, repo_id: identifier },
    task: { ...fixtureContextRequest().task, task_id: identifier },
    query,
    token_budget: 1_200,
  });
  assert.equal(validateContextRequest(request).ok, true);

  const source = new FakeContextSource(Array.from({ length: 200 }, (_, index) => fixtureCandidate({
    candidate_id: `decision-${index}`,
    kind: "decision",
    priority: index,
    title: `Decision ${index}`,
    body: "x".repeat(60),
  })));

  const capsule = await buildContextCapsule(source, request, { now: () => NOW });
  const serialized = JSON.stringify(capsule);

  assert.ok(capsule.sections.length > 1);
  // The sections cost, measured on the real serialized bytes, stays inside the budget...
  assert.equal(capsule.estimated_tokens, serializedSectionTokens(capsule.sections));
  assert.ok(
    capsule.estimated_tokens <= capsule.token_budget,
    `${capsule.estimated_tokens} > ${capsule.token_budget}`,
  );
  // ...and the whole capsule stays inside budget plus the documented envelope ceiling.
  assert.ok(
    estimateTokens(serialized) <= capsule.token_budget + MAX_CAPSULE_ENVELOPE_TOKENS,
    `${estimateTokens(serialized)} > ${capsule.token_budget + MAX_CAPSULE_ENVELOPE_TOKENS}`,
  );
  // Every section field that reaches the wire is paid for, priority included.
  for (const section of capsule.sections) {
    assert.equal(renderCapsuleSection(section), JSON.stringify(section));
  }
});

test("context request validation rejects payloads disguised as query, targets, or paths", () => {
  const oversizedQuery = "x".repeat(MAX_CONTEXT_QUERY_BYTES + 1);
  const multibyteQuery = "界".repeat(Math.ceil(MAX_CONTEXT_QUERY_BYTES / 3));
  const invalidValues: unknown[] = [
    { ...fixtureContextRequest(), query: oversizedQuery },
    { ...fixtureContextRequest(), query: multibyteQuery },
    { ...fixtureContextRequest(), targets: Array.from({ length: MAX_CONTEXT_PATHS + 1 }, (_, i) => `src/${i}.ts`) },
    { ...fixtureContextRequest(), changed_files: Array.from({ length: MAX_CONTEXT_PATHS + 1 }, (_, i) => `src/${i}.ts`) },
    { ...fixtureContextRequest(), targets: ["x".repeat(MAX_CONTEXT_PATH_BYTES + 1)] },
    { ...fixtureContextRequest(), changed_files: ["x".repeat(MAX_CONTEXT_PATH_BYTES + 1)] },
    {
      ...fixtureContextRequest(),
      repository: { ...fixtureContextRequest().repository, repo_id: "x".repeat(MAX_CONTEXT_IDENTIFIER_BYTES + 1) },
    },
    {
      ...fixtureContextRequest(),
      task: { ...fixtureContextRequest().task, task_id: "x".repeat(MAX_CONTEXT_IDENTIFIER_BYTES + 1) },
    },
  ];

  for (const value of invalidValues) {
    assert.equal(validateContextRequest(value).ok, false, JSON.stringify(value).slice(0, 80));
  }

  assert.equal(validateContextRequest(fixtureContextRequest({
    query: "x".repeat(MAX_CONTEXT_QUERY_BYTES),
    targets: Array.from({ length: MAX_CONTEXT_PATHS }, (_, index) => `src/${index}.ts`),
  })).ok, true);
});

test("capsule ordering is deterministic by rank, descending priority, and candidate id", async () => {
  const candidates = [
    fixtureCandidate({ candidate_id: "z", kind: "orientation", priority: 99, title: "Orientation" }),
    fixtureCandidate({ candidate_id: "verify", kind: "verification", priority: 1, title: "Verification" }),
    fixtureCandidate({ candidate_id: "b", kind: "entry_point", priority: 5, title: "Entry B" }),
    fixtureCandidate({ candidate_id: "a", kind: "minimal_change", priority: 5, title: "Entry A" }),
    fixtureCandidate({ candidate_id: "low", kind: "invariant", priority: 1, title: "Invariant" }),
    fixtureCandidate({ candidate_id: "high", kind: "decision", priority: 20, title: "Decision high" }),
    fixtureCandidate({ candidate_id: "lower", kind: "decision", priority: 10, title: "Decision low" }),
  ];
  const request = fixtureContextRequest({ token_budget: 10_000 });

  const first = await buildContextCapsule(new FakeContextSource(candidates), request, { now: () => NOW });
  const second = await buildContextCapsule(new FakeContextSource([...candidates].reverse()), request, { now: () => NOW });

  assert.deepEqual(first.sections.map((section) => section.title), [
    "Invariant",
    "Entry A",
    "Entry B",
    "Verification",
    "Decision high",
    "Decision low",
    "Orientation",
  ]);
  assert.deepEqual(second.sections, first.sections);
  assert.equal(second.capsule_id, first.capsule_id);
});

test("capsule builder removes duplicate candidate ids deterministically", async () => {
  const lower = fixtureCandidate({ candidate_id: "same", priority: 1, title: "Lower priority" });
  const higher = fixtureCandidate({ candidate_id: "same", priority: 100, title: "Higher priority" });
  const request = fixtureContextRequest({ token_budget: 10_000 });

  const forward = await buildContextCapsule(new FakeContextSource([lower, higher]), request, { now: () => NOW });
  const reverse = await buildContextCapsule(new FakeContextSource([higher, lower]), request, { now: () => NOW });

  assert.deepEqual(forward.sections.map((section) => section.title), ["Higher priority"]);
  assert.deepEqual(reverse.sections, forward.sections);
  assert.equal(reverse.capsule_id, forward.capsule_id);
});

test("capsule builder does not let a skipped duplicate suppress a duplicate that fits", async () => {
  // Same candidate_id, ranked first because of its higher priority, but too large for
  // the budget. Skipping it must not consume the id: the smaller duplicate still fits.
  const oversized = fixtureCandidate({
    candidate_id: "same",
    kind: "decision",
    priority: 100,
    title: "Oversized duplicate",
    body: "x".repeat(400),
  });
  const fitting = fixtureCandidate({
    candidate_id: "same",
    kind: "decision",
    priority: 1,
    title: "Fitting duplicate",
    body: "Fits.",
  });

  const capsule = await buildContextCapsule(
    new FakeContextSource([oversized, fitting]),
    fixtureContextRequest({ token_budget: 40 }),
    { now: () => NOW },
  );

  assert.deepEqual(capsule.sections.map((section) => section.title), ["Fitting duplicate"]);
  assert.ok(capsule.estimated_tokens <= 40);
});

test("capsule builder drops oversized whole sections without splitting citations", async () => {
  const oversizedEvidence = `packet-${"界".repeat(400)}`;
  const source = new FakeContextSource([
    fixtureCandidate({
      candidate_id: "oversized",
      kind: "invariant",
      priority: 100,
      title: "Oversized invariant",
      body: "Must remain whole.",
      evidence_ids: [oversizedEvidence],
    }),
    fixtureCandidate({
      candidate_id: "small",
      kind: "orientation",
      priority: 1,
      title: "Small",
      body: "Fits.",
      evidence_ids: ["packet-small"],
    }),
  ]);

  const capsule = await buildContextCapsule(source, fixtureContextRequest({ token_budget: 40 }), { now: () => NOW });

  assert.deepEqual(capsule.sections.map((section) => section.title), ["Small"]);
  assert.equal(JSON.stringify(capsule).includes(oversizedEvidence.slice(0, 50)), false);
  assert.ok(capsule.estimated_tokens <= 40);
});

test("capsule builder excludes invalid and untrusted candidates and returns honest empty context", async () => {
  const invalid = [
    fixtureCandidate({ candidate_id: "no-title", title: "" }),
    fixtureCandidate({ candidate_id: "no-body", body: "" }),
    fixtureCandidate({ candidate_id: "no-evidence", evidence_ids: [] }),
    fixtureCandidate({ candidate_id: "blank-evidence", evidence_ids: [" "] }),
    { ...fixtureCandidate({ candidate_id: "pending" }), trust_state: "pending" },
    { ...fixtureCandidate({ candidate_id: "unsafe-priority" }), priority: Number.NaN },
  ] as ContextCandidate[];

  const capsule = await buildContextCapsule(
    new FakeContextSource(invalid),
    fixtureContextRequest({ token_budget: 1_200 }),
    { now: () => NOW },
  );

  assert.deepEqual(capsule.sections, []);
  assert.equal(capsule.estimated_tokens, 0);
  assert.equal(capsule.created_at, "2026-07-13T06:00:00.000Z");
  assert.equal(capsule.expires_at, "2026-07-13T06:05:00.000Z");
});

test("capsule id is content-derived and independent of creation time", async () => {
  const source = new FakeContextSource([fixtureCandidate({ candidate_id: "stable" })]);
  const request = fixtureContextRequest();
  const first = await buildContextCapsule(source, request, { now: () => NOW });
  const later = await buildContextCapsule(source, request, {
    now: () => new Date("2026-07-13T07:00:00.000Z"),
  });

  assert.match(first.capsule_id, /^capsule_[a-f0-9]{64}$/);
  assert.equal(later.capsule_id, first.capsule_id);
  assert.notEqual(later.created_at, first.created_at);
});

test("capsule builder propagates source failure without inventing filler", async () => {
  const source: ContextSource = {
    async find() {
      throw new Error("source exploded");
    },
  };

  await assert.rejects(buildContextCapsule(source, fixtureContextRequest()), /source exploded/);
});

function fixtureLegacyPacket(overrides: Partial<LegacyPacket> = {}): LegacyPacket {
  return {
    id: "packet-fresh",
    type: "convention",
    title: "Ledger invariant",
    summary: "Refunds use the ledger.",
    body: "Long-form packet body that should not be copied as raw transcript.",
    scope: "repo",
    status: "approved",
    paths: ["src/refunds.ts"],
    quality: {},
    ...overrides,
  };
}

function fixtureLegacyKernel(packets: LegacyPacket[]): LegacyKernelFunctions {
  return {
    // The real kernel signal, not a re-implementation: trust must track what Kage
    // actually records about verification.
    packetVerificationLabel: (packet) => packetVerificationLabel(packet as unknown as MemoryPacket),
    recall: () => ({
      results: packets.map((packet, index) => ({ packet, score: 100 - index })),
      suppressed: [{ id: "packet-suppressed", title: "Suppressed", reason: "stale" }],
    }),
    kageRisk: () => ({
      targets: {
        "src/refunds.ts": {
          target: "src/refunds.ts",
          risk_summary: "High-coupling entry point with one related test.",
        },
      },
    }),
    kageTeammateBrief: () => ({
      verification_contract: {
        focus_files: ["src/refunds.ts"],
        related_tests: [{ test_path: "src/refunds.test.ts", title: "refund flow", covers: "src/refunds.ts" }],
        test_gap_files: [],
        required_actions: ["Run the refund flow test."],
      },
    }),
  };
}

test("legacy source never emits stale, disputed, unapproved, or non-repo packets", async () => {
  const packets = [
    fixtureLegacyPacket(),
    fixtureLegacyPacket({ id: "packet-stale", quality: { stale: true } }),
    fixtureLegacyPacket({ id: "packet-reported", quality: { reports_stale: 1 } }),
    fixtureLegacyPacket({ id: "packet-downvoted", quality: { votes_down: 1 } }),
    fixtureLegacyPacket({ id: "packet-disputed", quality: { contradicts: ["packet-other"] } }),
    fixtureLegacyPacket({ id: "packet-pending", status: "pending" }),
    fixtureLegacyPacket({ id: "packet-personal", scope: "personal" }),
  ];
  const source = new LegacyContextSource("/repo", fixtureLegacyKernel(packets));

  const candidates = await source.find(fixtureContextRequest());
  const ids = candidates.map((candidate) => candidate.candidate_id);

  assert.ok(ids.includes("memory:packet-fresh"));
  for (const excluded of [
    "memory:packet-stale",
    "memory:packet-reported",
    "memory:packet-downvoted",
    "memory:packet-disputed",
    "memory:packet-pending",
    "memory:packet-personal",
    "memory:packet-suppressed",
  ]) assert.equal(ids.includes(excluded), false, excluded);
  assert.equal(candidates.some((candidate) => !["verified", "approved"].includes(candidate.trust_state)), false);
});

test("legacy source translates memory, verification, and target risk through the narrow seam", async () => {
  const calls: string[] = [];
  const kernel = fixtureLegacyKernel([
    fixtureLegacyPacket({ id: "policy", type: "policy" }),
    fixtureLegacyPacket({ id: "workflow", type: "workflow", title: "Deploy workflow" }),
    fixtureLegacyPacket({ id: "decision", type: "decision", title: "ADR" }),
    fixtureLegacyPacket({ id: "map", type: "repo_map", title: "Repository map" }),
  ]);
  const tracked: LegacyKernelFunctions = {
    packetVerificationLabel: kernel.packetVerificationLabel,
    recall: (...args) => {
      calls.push("recall");
      return kernel.recall(...args);
    },
    kageRisk: (...args) => {
      calls.push("risk");
      return kernel.kageRisk(...args);
    },
    kageTeammateBrief: (...args) => {
      calls.push("brief");
      return kernel.kageTeammateBrief(...args);
    },
  };
  const source = new LegacyContextSource("/repo", tracked);

  const candidates = await source.find(fixtureContextRequest({ changed_files: ["src/refunds.ts"] }));

  assert.deepEqual(calls, ["recall", "risk", "brief"]);
  assert.equal(candidates.find((candidate) => candidate.candidate_id === "memory:policy")?.kind, "invariant");
  assert.equal(candidates.find((candidate) => candidate.candidate_id === "memory:workflow")?.kind, "runbook");
  assert.equal(candidates.find((candidate) => candidate.candidate_id === "memory:decision")?.kind, "decision");
  assert.equal(candidates.find((candidate) => candidate.candidate_id === "memory:map")?.kind, "orientation");
  assert.equal(candidates.find((candidate) => candidate.candidate_id === "risk:src/refunds.ts")?.kind, "minimal_change");

  const verification = candidates.find((candidate) => candidate.kind === "verification");
  assert.ok(verification);
  assert.deepEqual(verification.evidence_ids, ["src/refunds.test.ts", "src/refunds.ts"]);
  assert.match(verification.body, /Run the refund flow test/);

  const memory = candidates.find((candidate) => candidate.candidate_id === "memory:policy");
  assert.equal(memory?.body, "Refunds use the ledger.");
  assert.deepEqual(memory?.evidence_ids, ["policy"]);
});

test("legacy source trust tiers follow the kernel verification label", async () => {
  const packets = [
    fixtureLegacyPacket({
      id: "packet-verified",
      quality: {},
      freshness: { verification: "citation_check", last_verified_at: "2026-07-12T00:00:00.000Z" },
    }),
    fixtureLegacyPacket({
      id: "packet-captured",
      quality: {},
      freshness: { verification: "repo_local_agent_capture", last_verified_at: "2026-07-12T00:00:00.000Z" },
    }),
    fixtureLegacyPacket({ id: "packet-unverified", quality: {}, freshness: {} }),
    fixtureLegacyPacket({ id: "packet-kernel-stale", quality: { stale: true } }),
  ];
  const source = new LegacyContextSource("/repo", fixtureLegacyKernel(packets));

  const candidates = await source.find(fixtureContextRequest());
  const byId = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));

  // The "verified" tier must be reachable: a packet an evidence check actually verified.
  assert.equal(byId.get("memory:packet-verified")?.trust_state, "verified");
  // Capture-time provenance is not verification.
  assert.equal(byId.get("memory:packet-captured")?.trust_state, "approved");
  assert.equal(byId.get("memory:packet-unverified")?.trust_state, "approved");
  assert.equal(byId.has("memory:packet-kernel-stale"), false);
});

test("legacy source survives a packet with no quality or freshness metadata", async () => {
  const malformed = { ...fixtureLegacyPacket({ id: "packet-malformed" }) } as Partial<LegacyPacket>;
  delete malformed.quality;
  delete malformed.freshness;
  const source = new LegacyContextSource("/repo", fixtureLegacyKernel([malformed as LegacyPacket]));

  const candidates = await source.find(fixtureContextRequest());

  // One malformed packet on disk must not take the whole context endpoint down.
  const memory = candidates.find((candidate) => candidate.candidate_id === "memory:packet-malformed");
  assert.equal(memory?.trust_state, "approved");
});

test("legacy source reuses its recall and risk results when composing the brief", async () => {
  const kernel = fixtureLegacyKernel([fixtureLegacyPacket()]);
  let briefOptions: Parameters<LegacyKernelFunctions["kageTeammateBrief"]>[1] | undefined;
  const tracked: LegacyKernelFunctions = {
    ...kernel,
    kageTeammateBrief: (projectDir, options) => {
      briefOptions = options;
      return kernel.kageTeammateBrief(projectDir, options);
    },
  };
  const source = new LegacyContextSource("/repo", tracked);

  await source.find(fixtureContextRequest({ changed_files: ["src/refunds.ts"] }));

  // The kernel accepts these precisely so callers do not recompute recall and risk;
  // without them memory_warnings and risk-derived test gaps come back empty.
  assert.equal(briefOptions?.recallResult?.results.length, 1);
  assert.ok(briefOptions?.riskResult?.targets["src/refunds.ts"]);
});

test("canonical rendered section contains every complete evidence identifier", () => {
  const section: CapsuleSection = {
    kind: "verification",
    title: "Verify",
    body: "Run focused tests.",
    evidence_ids: ["test:one", "evidence:界:two"],
    priority: 5,
  };
  const rendered = renderCapsuleSection(section);

  assert.match(rendered, /verification/);
  assert.match(rendered, /Verify/);
  assert.match(rendered, /Run focused tests/);
  assert.ok(rendered.includes("test:one"));
  assert.ok(rendered.includes("evidence:界:two"));
});
