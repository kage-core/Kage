import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ContentStore } from "../gateway/content-store.js";
import { contentObjectPaths, contentRoot } from "../runtime/paths.js";
import { matchContentRoute, retrieve, retrieveFromProject } from "./retrieve.js";

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "kage-retrieve-"));
}

function storeOriginal(root: string, taskId: string, body: string, mediaType = "text/plain"): string {
  const store = new ContentStore({ root });
  return store.put(Buffer.from(body, "utf8"), { media_type: mediaType, task_id: taskId }).retrieval_id;
}

test("a task can retrieve the exact original it stored, fingerprint-verified", () => {
  const project = tempProject();
  try {
    const root = contentRoot(project);
    const original = "the exact pre-compression payload\nline two\n";
    const id = storeOriginal(root, "task-1", original);
    const store = new ContentStore({ root });

    const response = retrieve(id, { store, task_id: "task-1" });

    assert.equal(response.status, 200);
    assert.equal(response.headers["x-kage-sha256"], id.slice("kage-content:".length));
    assert.equal(response.headers["x-kage-retrieval-id"], id);
    assert.equal(response.headers["content-type"], "text/plain");
    assert.ok(response.body);
    assert.equal(response.body!.toString("utf8"), original);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("another task cannot retrieve local raw content owned by a different task (403)", () => {
  const project = tempProject();
  try {
    const root = contentRoot(project);
    const id = storeOriginal(root, "task-1", "secret original bytes");
    const store = new ContentStore({ root });

    const response = retrieve(id, { store, task_id: "task-2" });

    assert.equal(response.status, 403);
    assert.equal(response.error, "forbidden");
    assert.equal(response.body, null);
    // Must not leak the bytes or the fingerprint of another task's content.
    assert.equal(response.headers["x-kage-sha256"], undefined);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a malformed retrieval id is rejected with 400 before any filesystem access", () => {
  const project = tempProject();
  try {
    const store = new ContentStore({ root: contentRoot(project) });
    for (const bad of ["", "abc", "kage-content:abc", "kage-content:" + "z".repeat(64), "sha256:" + "a".repeat(64)]) {
      const response = retrieve(bad, { store, task_id: "task-1" });
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(bad)}`);
      assert.equal(response.error, "invalid_retrieval_id");
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a well-formed but absent retrieval id is 404, not 403 (absence is distinguishable from denial)", () => {
  const project = tempProject();
  try {
    const store = new ContentStore({ root: contentRoot(project) });
    const absent = "kage-content:" + "a".repeat(64);
    const response = retrieve(absent, { store, task_id: "task-1" });
    assert.equal(response.status, 404);
    assert.equal(response.error, "not_found");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a missing task_id is refused (retrieval is always task-scoped)", () => {
  const project = tempProject();
  try {
    const root = contentRoot(project);
    const id = storeOriginal(root, "task-1", "payload");
    const store = new ContentStore({ root });
    const response = retrieve(id, { store, task_id: "" });
    assert.equal(response.status, 400);
    assert.equal(response.error, "missing_task_id");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a tampered object surfaces as 502 fingerprint_mismatch, never silently-wrong bytes", () => {
  const project = tempProject();
  try {
    const root = contentRoot(project);
    const id = storeOriginal(root, "task-1", "authentic original");
    const sha = id.slice("kage-content:".length);
    // Corrupt the stored object body under its content-addressed path.
    const { objectPath } = contentObjectPaths(root, sha);
    writeFileSync(objectPath, Buffer.from("tampered replacement of equal-ish length"), { mode: 0o600 });
    const store = new ContentStore({ root });

    const response = retrieve(id, { store, task_id: "task-1" });
    assert.equal(response.status, 502);
    assert.equal(response.error, "fingerprint_mismatch");
    assert.equal(response.body, null);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("retrieveFromProject resolves the project content root and enforces the same ownership check", () => {
  const project = tempProject();
  try {
    const root = contentRoot(project);
    const id = storeOriginal(root, "task-9", "project-scoped original");

    const owner = retrieveFromProject(project, id, "task-9");
    assert.equal(owner.status, 200);
    assert.equal(owner.body!.toString("utf8"), "project-scoped original");

    const intruder = retrieveFromProject(project, id, "task-10");
    assert.equal(intruder.status, 403);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("matchContentRoute matches GET /v2/content/:sha256 and rejects non-content paths", () => {
  const sha = "a".repeat(64);
  assert.deepEqual(matchContentRoute(`/v2/content/${sha}`), { sha256: sha });
  assert.equal(matchContentRoute("/v2/content/"), undefined);
  assert.equal(matchContentRoute("/v2/content"), undefined);
  assert.equal(matchContentRoute(`/v2/content/${sha}/extra`), undefined);
  assert.equal(matchContentRoute("/v2/health"), undefined);
  // A non-hex or wrong-length segment is not a valid content id.
  assert.equal(matchContentRoute("/v2/content/not-a-sha"), undefined);
  assert.equal(matchContentRoute(`/v2/content/${"a".repeat(63)}`), undefined);
});
