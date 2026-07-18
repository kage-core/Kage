import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { KAGE_PROTOCOL_VERSION, type EvidenceEvent } from "../protocol/index.js";
import type { EpisodeRecord } from "../repo-model/types.js";
import type { EpisodeContext } from "./candidates.js";
import {
  extractWithModel,
  redactSecrets,
  type ModelExtractionProvider,
  type ModelExtractionResponse,
} from "./model-extractor.js";
import {
  auditConfig,
  readVnextConfig,
  writeVnextConfig,
  VNEXT_MODEL_EXTRACTION_DEFAULT,
} from "../runtime/config.js";

const REPO = "repo";
const TASK = "task";

function event(
  type: EvidenceEvent["event_type"],
  id: string,
  payload: Record<string, unknown> = {},
): EvidenceEvent {
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    event_id: id,
    event_type: type,
    occurred_at: new Date(600_000).toISOString(),
    repository_id: REPO,
    task_id: TASK,
    privacy_class: "local_raw",
    source_fingerprint: `fp-${id}`,
    payload,
  };
}

function episodeCtx(events: EvidenceEvent[], overrides: Partial<EpisodeRecord> = {}): EpisodeContext {
  const record: EpisodeRecord = {
    episode_id: "episode-x",
    repository_id: REPO,
    task_id: TASK,
    episode_type: "investigation",
    title: "t",
    started_at: events[0]?.occurred_at ?? new Date(0).toISOString(),
    ended_at: events[events.length - 1]?.occurred_at ?? new Date(0).toISOString(),
    event_ids: events.map((e) => e.event_id),
    outcome: "success",
    ...overrides,
  };
  return { episode: record, events };
}

// A clean, already-redacted episode carrying one referenceable event id: "event-1".
function redactedEpisode(): EpisodeContext {
  return episodeCtx([
    event("prompt", "event-1", { text: "Why did we choose session storage?" }),
    event("file_edit", "event-2", { path: "src/auth/session.ts" }),
  ]);
}

// An episode whose event payload text carries a raw secret that MUST be redacted before it leaves.
function episodeContaining(secret: string): EpisodeContext {
  return episodeCtx([
    event("prompt", "event-1", { text: `Here is the header: Authorization: ${secret}` }),
  ]);
}

// A provider that returns a caller-supplied response and fixed usage numbers.
function fakeModelProvider(response: Partial<ModelExtractionResponse>): ModelExtractionProvider {
  return {
    provider_id: "fake",
    async extract() {
      return {
        response: { entities: response.entities ?? [], claims: response.claims ?? [] },
        input_tokens: 120,
        output_tokens: 40,
        cost_usd: 0.0012,
      };
    },
  };
}

// A provider that records the request it received (serialized) and returns nothing usable.
function recordingModelProvider(): ModelExtractionProvider & { lastRequest: string } {
  const provider: ModelExtractionProvider & { lastRequest: string } = {
    provider_id: "recording",
    lastRequest: "",
    async extract(request) {
      provider.lastRequest = JSON.stringify(request);
      return { response: { entities: [], claims: [] }, input_tokens: null, output_tokens: null, cost_usd: null };
    },
  };
  return provider;
}

// ---- Plan Step 1 tests ---------------------------------------------------

test("model extraction emits proposals and never establishes trust", async () => {
  const provider = fakeModelProvider({
    entities: [{ kind: "decision", name: "Session storage", evidence_event_ids: ["event-1"] }],
    claims: [
      {
        entity_name: "Session storage",
        claim_kind: "rationale",
        content: "Sessions were chosen for revocation.",
        evidence_event_ids: ["event-1"],
        impact_class: "high",
      },
    ],
  });
  const result = await extractWithModel(redactedEpisode(), provider);
  assert.equal(result.candidates[0].proposed_trust_state, "proposed");
  assert.equal(result.candidates[0].extraction_method, "model");
});

test("raw secrets are redacted before the provider request", async () => {
  const provider = recordingModelProvider();
  await extractWithModel(episodeContaining("Bearer secret-token"), provider);
  assert.doesNotMatch(provider.lastRequest, /secret-token/);
  assert.match(provider.lastRequest, /\[REDACTED\]/);
});

test("invalid evidence ids reject the model candidate", async () => {
  const result = await extractWithModel(
    redactedEpisode(),
    fakeModelProvider({
      claims: [
        {
          entity_name: "Auth",
          claim_kind: "fact",
          content: "Invented",
          evidence_event_ids: ["missing"],
          impact_class: "low",
        },
      ],
    }),
  );
  assert.equal(result.candidates.length, 0);
  assert.match(result.rejections[0], /unknown evidence_event_id/);
});

// ---- Allowlist / clamp / entity-kind gates -------------------------------

test("an entity kind outside the allowlist rejects the candidate", async () => {
  const result = await extractWithModel(
    redactedEpisode(),
    fakeModelProvider({
      entities: [{ kind: "not_a_kind" as never, name: "X", evidence_event_ids: ["event-1"] }],
      claims: [
        {
          entity_name: "X",
          claim_kind: "fact",
          content: "Something about `X`.",
          evidence_event_ids: ["event-1"],
          impact_class: "low",
        },
      ],
    }),
  );
  assert.equal(result.candidates.length, 0);
  assert.ok(result.rejections.some((r) => /entity kind/i.test(r)));
});

test("a claim whose entity was never declared is rejected, not invented", async () => {
  const result = await extractWithModel(
    redactedEpisode(),
    fakeModelProvider({
      entities: [],
      claims: [
        {
          entity_name: "Ghost",
          claim_kind: "fact",
          content: "References `event-1` but no entity.",
          evidence_event_ids: ["event-1"],
          impact_class: "low",
        },
      ],
    }),
  );
  assert.equal(result.candidates.length, 0);
  assert.ok(result.rejections.some((r) => /undeclared entity/i.test(r)));
});

test("candidate count is clamped to max_candidates", async () => {
  const claims = Array.from({ length: 10 }, (_, i) => ({
    entity_name: "Session storage",
    claim_kind: "rationale",
    content: `Distinct rationale number ${i} about \`session\`.`,
    evidence_event_ids: ["event-1"],
    impact_class: "low" as const,
  }));
  const provider = fakeModelProvider({
    entities: [{ kind: "feature", name: "Session storage", evidence_event_ids: ["event-1"] }],
    claims,
  });
  const result = await extractWithModel(redactedEpisode(), provider, { max_candidates: 3 });
  assert.equal(result.candidates.length, 3);
});

// ---- Determinism ---------------------------------------------------------

test("model extraction is deterministic: same episode + response yields identical candidate ids", async () => {
  const make = () =>
    fakeModelProvider({
      entities: [{ kind: "feature", name: "Session storage", evidence_event_ids: ["event-1"] }],
      claims: [
        {
          entity_name: "Session storage",
          claim_kind: "rationale",
          content: "Sessions support `revocation`.",
          evidence_event_ids: ["event-1"],
          impact_class: "low",
        },
      ],
    });
  const a = await extractWithModel(redactedEpisode(), make());
  const b = await extractWithModel(redactedEpisode(), make());
  assert.deepEqual(
    a.candidates.map((c) => c.candidate_id),
    b.candidates.map((c) => c.candidate_id),
  );
});

// ---- Fail-open: a provider error or garbage response changes nothing -----

test("a provider that throws leaves deterministic compilation unchanged (no candidates, error receipt)", async () => {
  const provider: ModelExtractionProvider = {
    provider_id: "boom",
    async extract() {
      throw new Error("network down");
    },
  };
  const result = await extractWithModel(redactedEpisode(), provider);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.receipt.status, "provider_error");
  // Honest cost: an error never fabricates a zero.
  assert.equal(result.receipt.cost_usd, null);
});

test("an unparseable provider response yields no candidates and an invalid_response receipt", async () => {
  const provider: ModelExtractionProvider = {
    provider_id: "garbage",
    async extract() {
      return { response: "not an object", input_tokens: null, output_tokens: null, cost_usd: null };
    },
  };
  const result = await extractWithModel(redactedEpisode(), provider);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.receipt.status, "invalid_response");
});

// ---- Processing receipt --------------------------------------------------

test("the processing receipt records provider, tokens, cost, accepted/rejected, and redactions", async () => {
  let now = 1_000;
  const provider = fakeModelProvider({
    entities: [{ kind: "feature", name: "Session storage", evidence_event_ids: ["event-1"] }],
    claims: [
      {
        entity_name: "Session storage",
        claim_kind: "rationale",
        content: "Sessions support `revocation`.",
        evidence_event_ids: ["event-1"],
        impact_class: "low",
      },
      {
        entity_name: "Session storage",
        claim_kind: "rationale",
        content: "Rejected: bad evidence.",
        evidence_event_ids: ["missing"],
        impact_class: "low",
      },
    ],
  });
  const result = await extractWithModel(episodeContaining("Bearer secret-token"), provider, {
    clock: () => (now += 5),
  });
  assert.equal(result.receipt.provider, "fake");
  assert.equal(result.receipt.input_tokens, 120);
  assert.equal(result.receipt.output_tokens, 40);
  assert.equal(result.receipt.cost_usd, 0.0012);
  assert.equal(result.receipt.accepted, 1);
  assert.equal(result.receipt.rejected, 1);
  assert.ok(result.receipt.redaction_count >= 1);
  assert.ok(result.receipt.latency_ms >= 0);
  assert.equal(result.receipt.status, "ok");
});

// ---- redactSecrets unit --------------------------------------------------

test("redactSecrets removes bearer tokens and counts redactions", () => {
  const { text, redactions } = redactSecrets("Authorization: Bearer sk-abc123DEF456ghi");
  assert.doesNotMatch(text, /sk-abc123DEF456ghi/);
  assert.match(text, /\[REDACTED\]/);
  assert.ok(redactions >= 1);
});

test("redactSecrets leaves clean prose untouched", () => {
  const { text, redactions } = redactSecrets("Run the test suite and check the exit code.");
  assert.equal(text, "Run the test suite and check the exit code.");
  assert.equal(redactions, 0);
});

// ---- Config: model_extraction is off by default -------------------------

test("model_extraction defaults to off and the audit config never enables it", () => {
  assert.equal(VNEXT_MODEL_EXTRACTION_DEFAULT, "off");
  const config = auditConfig(["claude-code"]);
  assert.equal(config.vnext.model_extraction, "off");
});

test("a config written without model_extraction reads back as off (backward compatible)", () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-model-cfg-"));
  const project = dir;
  // Write a config that predates model_extraction, then confirm it reads as off, not null.
  const legacy = auditConfig(["claude-code"]);
  const stripped = JSON.parse(JSON.stringify(legacy)) as { vnext: Record<string, unknown> };
  delete stripped.vnext.model_extraction;
  writeVnextConfig(project, stripped as never);
  const read = readVnextConfig(project);
  assert.equal(read?.vnext.model_extraction, "off");
});
