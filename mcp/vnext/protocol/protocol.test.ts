import test from "node:test";
import assert from "node:assert/strict";
import { KAGE_PROTOCOL_VERSION, validateEvidenceEvent, validateHandshake } from "./index.js";

const completeHandshake = {
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
};

const completeEvidenceEvent = {
  protocol_version: 1,
  event_id: "event-1",
  event_type: "prompt",
  occurred_at: "2026-07-13T00:00:00.000Z",
  repository_id: "repo-1",
  task_id: "task-1",
  privacy_class: "local_raw",
  source_fingerprint: "sha256:abc123",
  payload: { text: "prompt text" },
};

test("protocol v1 accepts a complete adapter handshake", () => {
  const result = validateHandshake(completeHandshake);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, completeHandshake);
});

test("protocol v1 rejects handshakes whose required fields are inherited", () => {
  const inheritedHandshake = Object.create(completeHandshake) as unknown;
  const inheritedRepository = {
    ...completeHandshake,
    repository: Object.create(completeHandshake.repository),
  };
  const inheritedTask = {
    ...completeHandshake,
    task: Object.create(completeHandshake.task),
  };

  for (const [name, value] of [
    ["handshake", inheritedHandshake],
    ["repository", inheritedRepository],
    ["task", inheritedTask],
  ] as const) {
    const result = validateHandshake(value);
    assert.equal(result.ok, false, name);
  }
});

test("protocol v1 projects handshakes onto declared plain-object fields", () => {
  const capabilities = [...completeHandshake.capabilities];
  const input = {
    ...completeHandshake,
    extra: "discard",
    repository: { ...completeHandshake.repository, extra: "discard" },
    task: { ...completeHandshake.task, extra: "discard" },
    capabilities,
  };

  const result = validateHandshake(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, completeHandshake);
  assert.notEqual(result.value, input);
  assert.notEqual(result.value.repository, input.repository);
  assert.notEqual(result.value.task, input.task);
  assert.notEqual(result.value.capabilities, capabilities);
  assert.equal(Object.getPrototypeOf(result.value), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.value.repository), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.value.task), Object.prototype);
});

test("protocol v1 rejects inherited capability elements", () => {
  const capabilities: unknown[] = Array(1);
  const capabilityPrototype = Object.create(Array.prototype) as unknown[];
  capabilityPrototype[0] = "prompt";
  Object.setPrototypeOf(capabilities, capabilityPrototype);

  const result = validateHandshake({ ...completeHandshake, capabilities });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /capabilities\[0\]/);
});

test("protocol v1 exposes its version through the public protocol surface", () => {
  assert.equal(KAGE_PROTOCOL_VERSION, 1);
});

test("protocol v1 rejects invalid adapter handshakes", () => {
  const invalidHandshakes: Array<[string, unknown, RegExp]> = [
    ["object", null, /handshake must be an object/],
    ["version", { ...completeHandshake, protocol_version: 2 }, /protocol_version/],
    ["adapter id", { ...completeHandshake, adapter_id: " " }, /adapter_id/],
    ["agent surface", { ...completeHandshake, agent_surface: "" }, /agent_surface/],
    ["agent version", { ...completeHandshake, agent_version: 42 }, /agent_version/],
    ["repository object", { ...completeHandshake, repository: [] }, /repository must be an object/],
    [
      "repository identifiers",
      { ...completeHandshake, repository: { ...completeHandshake.repository, repo_id: "", root: "", worktree: "" } },
      /repository\.repo_id.*repository\.root.*repository\.worktree/,
    ],
    [
      "repository nullable strings",
      { ...completeHandshake, repository: { ...completeHandshake.repository, remote: 1, branch: [], commit: {} } },
      /repository\.remote.*repository\.branch.*repository\.commit/,
    ],
    ["task object", { ...completeHandshake, task: null }, /task must be an object/],
    [
      "task identifiers",
      {
        ...completeHandshake,
        task: { ...completeHandshake.task, task_id: "", session_id: "", user_id: 7, agent_surface: "" },
      },
      /task\.task_id.*task\.session_id.*task\.user_id.*task\.agent_surface/,
    ],
    ["capabilities array", { ...completeHandshake, capabilities: "prompt" }, /capabilities must be an array/],
    ["capability enum", { ...completeHandshake, capabilities: ["prompt", "unknown"] }, /capabilities\[1\]/],
    ["sparse capability", { ...completeHandshake, capabilities: Array(1) }, /capabilities\[0\]/],
  ];

  for (const [name, value, expectedError] of invalidHandshakes) {
    const result = validateHandshake(value);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.match(result.errors.join(" "), expectedError, name);
  }
});

test("protocol v1 accepts a complete evidence event", () => {
  const result = validateEvidenceEvent(completeEvidenceEvent);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, completeEvidenceEvent);
});

test("protocol v1 rejects evidence events whose required fields are inherited", () => {
  const inheritedEvent = Object.create(completeEvidenceEvent) as unknown;
  const { payload: inheritedPayload, ...ownEventFields } = completeEvidenceEvent;
  const eventWithInheritedPayload = Object.assign(
    Object.create({ payload: inheritedPayload }),
    ownEventFields,
  ) as unknown;

  for (const [name, value] of [
    ["event", inheritedEvent],
    ["payload", eventWithInheritedPayload],
  ] as const) {
    const result = validateEvidenceEvent(value);
    assert.equal(result.ok, false, name);
  }
});

test("protocol v1 projects evidence events while preserving own payload content", () => {
  const nestedPayloadValue = { approved: true };
  const payload = Object.assign(
    Object.create({ inherited_secret: "discard" }),
    { text: "prompt text", metadata: nestedPayloadValue },
  ) as Record<string, unknown>;
  const input = { ...completeEvidenceEvent, extra: "discard", payload };

  const result = validateEvidenceEvent(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    ...completeEvidenceEvent,
    payload: { text: "prompt text", metadata: nestedPayloadValue },
  });
  assert.notEqual(result.value, input);
  assert.notEqual(result.value.payload, payload);
  assert.equal(Object.getPrototypeOf(result.value), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.value.payload), Object.prototype);
  assert.equal(result.value.payload.metadata, nestedPayloadValue);
  assert.equal("inherited_secret" in result.value.payload, false);
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
  if (!result.ok) assert.match(result.errors.join(" "), /privacy_class/);
});

test("protocol v1 rejects invalid evidence events", () => {
  const invalidEvents: Array<[string, unknown, RegExp]> = [
    ["object", [], /event must be an object/],
    ["version", { ...completeEvidenceEvent, protocol_version: 2 }, /protocol_version/],
    ["event id", { ...completeEvidenceEvent, event_id: " " }, /event_id/],
    ["event type", { ...completeEvidenceEvent, event_type: "provider_usage" }, /event_type/],
    ["timestamp type", { ...completeEvidenceEvent, occurred_at: 42 }, /occurred_at/],
    ["timestamp format", { ...completeEvidenceEvent, occurred_at: "yesterday" }, /occurred_at/],
    ["timestamp date", { ...completeEvidenceEvent, occurred_at: "2026-02-30T00:00:00.000Z" }, /occurred_at/],
    ["repository id", { ...completeEvidenceEvent, repository_id: "" }, /repository_id/],
    ["task id", { ...completeEvidenceEvent, task_id: "" }, /task_id/],
    ["privacy class", { ...completeEvidenceEvent, privacy_class: "public" }, /privacy_class/],
    ["fingerprint", { ...completeEvidenceEvent, source_fingerprint: "" }, /source_fingerprint/],
    ["payload", { ...completeEvidenceEvent, payload: [] }, /payload must be an object/],
  ];

  for (const [name, value, expectedError] of invalidEvents) {
    const result = validateEvidenceEvent(value);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.match(result.errors.join(" "), expectedError, name);
  }
});
