import assert from "node:assert/strict";
import { test } from "node:test";

import type { MemoryPacket } from "./kernel.js";
import {
  kageType,
  lintOkfConcept,
  okfConceptFileName,
  okfConceptToPacket,
  okfType,
  packetToOkfConcept,
} from "./okf.js";

function samplePacket(): MemoryPacket {
  return {
    schema_version: 2,
    id: "repo:demo:decision:use-okf-as-the-standard-1",
    title: "Adopt OKF as the standard: it's \"format, not platform\"",
    summary: "Kage stores memory as OKF concept files; trust rides in x-kage-* fields.",
    body: "We adopt Google's Open Knowledge Format as Kage's on-disk standard.\nVerification metadata is carried in custom x-kage-* frontmatter.",
    type: "decision",
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.7,
    tags: ["okf", "standard", "memory"],
    paths: ["mcp/okf.ts", "OKF_STANDARD.md"],
    stack: ["typescript", "okf"],
    source_refs: [{ kind: "explicit_capture", captured_at: "2026-06-29T00:00:00.000Z" }],
    context: {
      fact: "OKF is Kage's standard memory format.",
      why: "Google standardized the store and left verification out of scope.",
      verification: "round-trip test in okf.test.ts",
      rejected_alternatives: ["keep proprietary JSON packets", "invent a new format"],
    },
    freshness: {
      ttl_days: 365,
      last_verified_at: "2026-06-29T00:00:00.000Z",
      path_fingerprints: [{ path: "mcp/okf.ts", sha256: "abc123", size: 4242 }],
    },
    edges: [],
    quality: { reviewer: null, votes_up: 0, votes_down: 0, uses_30d: 0, reports_stale: 0 },
    created_at: "2026-06-29T00:00:00.000Z",
    updated_at: "2026-06-29T00:00:00.000Z",
  };
}

test("packet -> OKF concept -> packet is lossless", () => {
  const packet = samplePacket();
  const concept = packetToOkfConcept(packet);
  const restored = okfConceptToPacket(concept, { projectDir: "/demo" });
  assert.deepStrictEqual(restored, packet);
});

test("rendered concept is OKF-conformant (frontmatter + non-empty type)", () => {
  const concept = packetToOkfConcept(samplePacket());
  assert.ok(concept.startsWith("---\n"), "starts with YAML frontmatter");
  assert.match(concept, /\ntype: "Decision"\n/, "has OKF display type");
  assert.match(concept, /\ntitle: /, "has title");
  assert.match(concept, /\nresource: "mcp\/okf\.ts"\n/, "first path becomes the OKF resource anchor");
  assert.match(concept, /\nx-kage-status: "approved"\n/, "carries trust extension fields");
  assert.match(concept, /# Citations/, "renders citations section");
  const lint = lintOkfConcept(concept);
  assert.ok(lint.ok, `conformant: ${lint.errors.join("; ")}`);
});

test("type vocabulary maps both directions", () => {
  assert.equal(okfType("bug_fix"), "Bug Fix");
  assert.equal(kageType("Bug Fix"), "bug_fix");
  assert.equal(kageType("Negative Result"), "negative_result");
  assert.equal(kageType("Something Unknown"), "reference");
  assert.equal(okfType("proposal"), "Proposal");
  assert.equal(kageType("Proposal"), "proposal");
});

test("foreign OKF concept (no kage-state block) imports best-effort", () => {
  const foreign = [
    "---",
    'type: "BigQuery Table"',
    'title: "Orders"',
    'description: "One row per completed order."',
    'resource: "bigquery://acme/sales/orders"',
    "tags: [sales, revenue]",
    'timestamp: "2026-05-28T14:30:00Z"',
    "---",
    "",
    "# Orders",
    "",
    "One row per completed customer order.",
    "",
    "# Schema",
    "",
    "| column | type |",
    "| --- | --- |",
    "| id | STRING |",
    "",
  ].join("\n");
  const packet = okfConceptToPacket(foreign, { projectDir: "/demo", sourcePath: "/demo/tables/orders.md" });
  assert.ok(packet, "imports a foreign concept");
  assert.equal(packet!.title, "Orders");
  assert.equal(packet!.type, "reference", "unknown OKF type falls back to a safe Kage type");
  assert.equal(packet!.summary, "One row per completed order.");
  assert.deepStrictEqual(packet!.paths, ["bigquery://acme/sales/orders"], "resource becomes the anchor path");
  assert.equal(packet!.source_refs[0].kind, "okf_import");
});

test("concept filename is a stable .md slug", () => {
  const name = okfConceptFileName(samplePacket());
  assert.match(name, /^adopt-okf-as-the-standard-its-format-not-platform-[0-9a-f]{8}\.md$/);
});
