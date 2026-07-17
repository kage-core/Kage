import test from "node:test";
import assert from "node:assert/strict";

import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { KAGE_PROTOCOL_VERSION, type EvidenceEvent } from "../protocol/index.js";
import { buildEpisodes, persistEpisodes } from "./episode-builder.js";

// `time` is minutes from an arbitrary epoch so the 30-minute inactivity boundary is expressible.
function event(
  type: EvidenceEvent["event_type"],
  time: number,
  payload: Record<string, unknown> = {},
  repository = "repo",
  task = "task",
): EvidenceEvent {
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    event_id: `${repository}-${task}-${type}-${time}`,
    event_type: type,
    occurred_at: new Date(time * 60_000).toISOString(),
    repository_id: repository,
    task_id: task,
    privacy_class: "local_raw",
    source_fingerprint: `fp-${repository}-${task}-${type}-${time}`,
    payload,
  };
}

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

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
  const episodes = buildEpisodes([
    event("prompt", 0, {}, "repo-a"),
    event("file_edit", 2, {}, "repo-b"),
  ]);
  assert.equal(episodes.length, 2);
});

test("events from different tasks in the same repository never share an episode", () => {
  const episodes = buildEpisodes([
    event("prompt", 0, {}, "repo", "task-a"),
    event("file_edit", 2, {}, "repo", "task-b"),
  ]);
  assert.equal(episodes.length, 2);
});

test("thirty minutes of inactivity closes an episode", () => {
  const episodes = buildEpisodes([
    event("prompt", 0),
    event("file_edit", 5),
    // 60-minute gap -> new episode
    event("file_edit", 65),
    event("file_edit", 70),
  ]);
  assert.equal(episodes.length, 2);
  assert.equal(episodes[0].event_ids.length, 2);
  assert.equal(episodes[1].event_ids.length, 2);
});

test("edits without any failure classify as implementation with a success outcome", () => {
  const episodes = buildEpisodes([
    event("prompt", 0),
    event("file_edit", 5),
    event("tool_result", 10, { command: "npm test", exit_code: 0 }),
    event("session_end", 15),
  ]);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episode_type, "implementation");
  assert.equal(episodes[0].outcome, "success");
});

test("an unresolved command failure classifies as an incident and does not report success", () => {
  const episodes = buildEpisodes([
    event("prompt", 0),
    event("tool_result", 5, { command: "deploy", exit_code: 1 }),
    event("session_end", 10),
  ]);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episode_type, "incident");
  assert.equal(episodes[0].outcome, "failure");
});

test("a lone session_end never opens a substantive episode", () => {
  const episodes = buildEpisodes([event("session_end", 0)]);
  assert.equal(episodes.length, 0);
});

test("episode ids are deterministic across repeated compilation", () => {
  const events = [event("prompt", 0), event("file_edit", 10), event("session_end", 20)];
  const first = buildEpisodes(events);
  const second = buildEpisodes(events);
  assert.deepEqual(
    first.map((e) => e.episode_id),
    second.map((e) => e.episode_id),
  );
});

test("out-of-order events are grouped by chronological order within a task", () => {
  const episodes = buildEpisodes([
    event("session_end", 50),
    event("file_edit", 30),
    event("prompt", 0),
    event("tool_result", 40, { command: "npm test", exit_code: 0 }),
    event("tool_result", 20, { command: "npm test", exit_code: 1 }),
    event("file_edit", 10),
  ]);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episode_type, "debugging");
  assert.equal(episodes[0].outcome, "verified_success");
});

test("reprocessing the same events persists no duplicate episode", () => {
  const db = migratedDatabase();
  try {
    const events = [event("prompt", 0), event("file_edit", 10), event("session_end", 20)];
    const episodes = buildEpisodes(events);
    assert.equal(episodes.length, 1);

    const first = persistEpisodes(db, episodes);
    assert.equal(first.inserted, 1);

    const second = persistEpisodes(db, buildEpisodes(events));
    assert.equal(second.inserted, 0);

    const count = db.prepare("SELECT COUNT(*) AS n FROM episodes").get() as { n: number };
    assert.equal(count.n, 1);
  } finally {
    db.close();
  }
});
