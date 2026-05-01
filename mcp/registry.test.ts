import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalJson,
  createPublicCandidateBundleManifest,
  createSignedManifest,
  generateOrgRegistryManifest,
  validatePublicCandidateBundle,
  verifySignedManifest,
} from "./registry/index.js";

const candidate = {
  id: "runbook:stripe-webhooks",
  title: "Stripe webhook replay",
  summary: "Replay webhook fixtures before changing billing handlers.",
  body: "Run the webhook replay suite after editing billing webhook handlers.",
  type: "runbook",
  tags: ["billing", "webhook", "billing"],
  stack: ["stripe", "node"],
  license: "MIT",
  visibility: "public",
  sensitivity: "public",
  paths: ["backend/billing/webhooks.ts"],
  source_url: "https://example.com/kage/stripe-webhooks",
  source_refs: [
    {
      kind: "local_packet",
      repo_path: "backend/billing/webhooks.ts",
      public_url: "https://example.com/docs/webhooks",
    },
  ],
};

test("canonicalJson sorts object keys recursively", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');
});

test("signed-ish manifests verify stable payload digests", () => {
  const manifest = createSignedManifest({
    kind: "org_registry",
    name: "Acme registry",
    version: "2026.05.01",
    generatedAt: "2026-05-01T00:00:00.000Z",
    keyId: "acme-local",
    payload: { org: "acme", entries: [{ id: "docs:nextjs" }] },
  });

  assert.equal(verifySignedManifest(manifest).ok, true);

  const tampered = { ...manifest, payload: { org: "acme", entries: [] } };
  const result = verifySignedManifest(tampered);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /payload_sha256/);
});

test("public candidate bundle validation sanitizes private local metadata", () => {
  const result = validatePublicCandidateBundle({ candidates: [candidate] });

  assert.equal(result.ok, true);
  assert.ok(result.value);
  const sanitized = result.value.candidates[0] as unknown as Record<string, unknown>;
  assert.equal(sanitized.visibility, undefined);
  assert.equal(sanitized.sensitivity, undefined);
  assert.equal("paths" in sanitized, false);
  assert.deepEqual(result.value.candidates[0].tags, ["billing", "webhook"]);
  assert.equal(result.value.candidates[0].source_refs[0].repo_path, undefined);
  assert.equal(result.value.candidates[0].source_refs[0].public_url, "https://example.com/docs/webhooks");
  assert.equal(result.warnings.some((warning) => warning.includes("paths were omitted")), true);
});

test("public candidate bundle validation rejects sensitive content", () => {
  const result = validatePublicCandidateBundle({
    candidates: [
      {
        ...candidate,
        id: "runbook:leaky",
        body: "Use Authorization: Bearer abcdefghijklmnopqrstuvwxyz to test locally.",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /sensitive content/);
});

test("public candidate bundle manifest signs sanitized bundle", () => {
  const result = createPublicCandidateBundleManifest(
    { candidates: [candidate] },
    {
      name: "public candidates",
      version: "1.0.0",
      generatedAt: "2026-05-01T00:00:00.000Z",
      keyId: "local-test",
    }
  );

  assert.equal(result.ok, true);
  assert.ok(result.value);
  assert.equal(result.value.kind, "public_candidate_bundle");
  assert.equal(verifySignedManifest(result.value).ok, true);
});

test("org registry manifest indexes sanitized candidates deterministically", () => {
  const bundle = validatePublicCandidateBundle({
    candidates: [
      { ...candidate, id: "runbook:stripe-webhooks" },
      { ...candidate, id: "docs:billing-overview", type: "reference" },
    ],
  });
  assert.ok(bundle.value);

  const manifest = generateOrgRegistryManifest({
    org: "acme",
    version: "2026.05.01",
    generatedAt: "2026-05-01T00:00:00.000Z",
    keyId: "acme-local",
    bundles: [bundle.value],
  });

  assert.equal(manifest.kind, "org_registry");
  assert.equal(manifest.payload.org, "acme");
  assert.deepEqual(manifest.payload.metrics.by_type, { reference: 1, runbook: 1 });
  assert.equal(manifest.payload.metrics.entry_count, 2);
  assert.deepEqual(
    manifest.payload.entries.map((entry) => entry.id),
    ["docs:billing-overview", "runbook:stripe-webhooks"]
  );
  assert.equal(manifest.payload.entries[0].manifest_sha256, undefined);
  assert.equal(manifest.payload.entries[0].trust_level, "community");
  assert.equal(manifest.payload.entries[0].review_status, "needs_public_review");
  assert.equal(verifySignedManifest(manifest).ok, true);
});
