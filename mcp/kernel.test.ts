import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { availableParallelism, tmpdir } from "node:os";
import vm from "node:vm";
import {
  SETUP_AGENTS,
  benchmarkTaskComparison,
  benchmarkCodingMemoryQuality,
  benchmarkMemoryScale,
  benchmarkProject,
  buildEmbeddingIndex,
  buildCodeGraph,
  buildIndexes,
  approvePending,
  createDenseEmbeddingProvider,
  buildKnowledgeGraph,
  buildBranchOverlay,
  buildStructuralIndex,
  auditProject,
  capture,
  kageActivity,
  catalogDomainNodeCount,
  createReviewArtifact,
  createPublicCandidate,
  distillSession,
  doctorProject,
  ensureTreeSitterLanguages,
  exportPublicBundle,
  codeGraphDir,
  graphDir,
  graphMermaid,
  gcProject,
  compactProject,
  verifyCitations,
  benchmarkTrust,
  kageSuppressedMemory,
  runDemo,
  initProject,
  indexProject,
  installAgentPolicy,
  kageCleanupCandidates,
  kageCapabilityAudit,
  kageContributors,
  kageContextSlots,
  kageDecisionIntelligence,
  deleteContextSlot,
  kageDependencyPath,
  kageGraphInsights,
  kageMemoryLifecycle,
  kageMemoryLineage,
  kageMemoryTimeline,
  kageMemoryAccess,
  kageMemoryAudit,
  kageMemoryHandoff,
  kageHookInstall,
  kageHookStatus,
  kageHookUninstall,
  kageMemoryReconciliation,
  kageRisk,
  kageSessionCaptureReport,
  kageSessionReplay,
  kageMetrics,
  kageModuleHealth,
  kageProjectProfile,
  kageRepoXray,
  kageReviewerSuggestions,
  kageWorkspace,
  kageWorkspaceRecall,
  learn,
  loadApprovedPackets,
  memoryInbox,
  observe,
  packetsDir,
  pendingDir,
  prCheck,
  prSummarize,
  proposeFromDiff,
  queryCodeGraph,
  queryGraph,
  recall,
  recallWithEmbeddings,
  recordValueEvent,
  valueSummary,
  formatTokenCount,
  recordFeedback,
  refreshProject,
  rejectPending,
  registryRecommendations,
  scanSensitiveText,
  setupAgent,
  setupDoctor,
  setContextSlot,
  supersedeMemory,
  structuralIndexDir,
  qualityReport,
  evaluateMemoryAdmission,
  verifyAgentActivation,
  validatePacket,
  validateProject,
  writeCodeIndex,
  writeLspSymbolIndex,
} from "./kernel.js";
import { buildGraphRegistryManifest } from "./graph-registry.js";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-test-"));
  mkdirSync(join(dir, ".agent_memory", "nodes"), { recursive: true });
  return dir;
}

const gitIdentityEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function commitAll(project: string, message: string): void {
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: project, stdio: "ignore", env: gitIdentityEnv });
}

test("migrates legacy markdown nodes into approved packets", () => {
  const project = tempProject();
  writeFileSync(
    join(project, ".agent_memory", "nodes", "tenant-header.md"),
    `---
title: "Tenant header is required"
category: repo_context
tags: ["api", "tenant"]
paths: "backend/api"
date: "2026-04-12"
---

# Tenant header is required

All backend API calls require x-tenant-id except health checks.
`,
    "utf8"
  );

  const result = indexProject(project);
  assert.equal(result.migrated, 1);
  const packets = loadApprovedPackets(project);
  assert.equal(packets.length >= 1, true);
  const imported = packets.find((packet) => packet.title === "Tenant header is required");
  assert.ok(imported);
  assert.equal(imported.status, "approved");
  assert.equal(imported.source_refs[0]?.kind, "legacy_markdown");
});

test("migrates inline legacy metadata from markdown body", () => {
  const project = tempProject();
  mkdirSync(join(project, "src", "app", "api", "stripe", "webhook"), { recursive: true });
  writeFileSync(join(project, "src", "app", "api", "stripe", "webhook", "route.ts"), "", "utf8");
  writeFileSync(
    join(project, ".agent_memory", "nodes", "stripe-webhook-runbook.md"),
    `# Stripe webhook runbook

Type: runbook
Tags: stripe, webhook, tests
Paths: src/app/api/stripe/webhook/route.ts

Use npm run test:webhook when changing webhook verification.
`,
    "utf8"
  );

  indexProject(project);
  const imported = loadApprovedPackets(project).find((packet) => packet.title === "Stripe webhook runbook");
  assert.ok(imported);
  assert.equal(imported.type, "runbook");
  assert.deepEqual(imported.tags, ["stripe", "webhook", "tests"]);
  assert.deepEqual(imported.paths, ["src/app/api/stripe/webhook/route.ts"]);
  assert.doesNotMatch(imported.body, /^Type:/m);
});

test("builds generated indexes after indexing", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "demo.test.ts"), "test('demo', () => {});\n", "utf8");
  const result = indexProject(project);
  assert.equal(result.indexes.some((path) => path.endsWith("indexes/catalog.json")), true);
  assert.equal(result.indexes.some((path) => path.endsWith("indexes/vector-local.json")), true);
  const catalog = JSON.parse(readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8"));
  const vectorIndex = JSON.parse(readFileSync(join(project, ".agent_memory", "indexes", "vector-local.json"), "utf8"));
  assert.equal(catalog.packet_count >= 2, true);
  assert.equal(vectorIndex.packet_count, catalog.packet_count);
  assert.equal(Array.isArray(vectorIndex.documents), true);
  assert.equal(catalog.packets.some((packet: { title: string }) => packet.title.includes("repo structure")), true);
  const firstCatalog = readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8");
  indexProject(project);
  assert.equal(readFileSync(join(project, ".agent_memory", "indexes", "catalog.json"), "utf8"), firstCatalog);
  assert.equal("generated_at" in catalog, false);
  writeFileSync(join(project, "README.md"), "# Demo\n\nNew setup flow lives here.\n", "utf8");
  indexProject(project);
  const overview = loadApprovedPackets(project).find((packet) => packet.title.includes("repo overview"));
  assert.match(overview?.body ?? "", /New setup flow/);
  assert.deepEqual(overview?.paths.sort(), ["README.md", "package.json"]);
  const structure = loadApprovedPackets(project).find((packet) => packet.title.includes("repo structure"));
  assert.match(overview?.context?.why ?? "", /repo orientation/i);
  assert.match(structure?.context?.verification ?? "", /Generated from files present/);
  // Indexing must never write agent-policy files into the repo (explicit opt-in only).
  assert.equal(existsSync(join(project, "AGENTS.md")), false);
  assert.equal(existsSync(join(project, "CLAUDE.md")), false);
});

test("installs and updates Codex agent policy idempotently", () => {
  const project = tempProject();
  const created = installAgentPolicy(project);
  assert.equal(created.created, true);
  assert.equal(created.updated, false);
  const first = readFileSync(join(project, "AGENTS.md"), "utf8");
  assert.match(first, /Automatic Recall/);
  assert.match(first, /kage_context/);

  const second = installAgentPolicy(project);
  assert.equal(second.created, false);
  assert.equal(second.updated, false);
  assert.equal(readFileSync(join(project, "AGENTS.md"), "utf8"), first);
});

test("recall returns run command context from repo overview", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest", dev: "vite" } }), "utf8");
  const result = recall(project, "how do I run tests");
  assert.match(result.context_block, /vitest|test/i);
  assert.equal(result.results.length > 0, true);
});

test("pinned context slots are reviewable and included in recall", () => {
  const project = tempProject();
  const saved = setContextSlot(project, {
    label: "project_context",
    content: "Always run checkout retry tests after touching retry modules.",
    description: "High-signal repo guidance for agents.",
    paths: ["src/retry.ts"],
    tags: ["checkout", "tests"],
  });
  assert.equal(saved.ok, true);

  const report = kageContextSlots(project);
  assert.equal(report.totals.slots, 1);
  assert.equal(report.totals.pinned, 1);
  assert.match(report.pinned_context_block, /Always run checkout retry tests/);

  const result = recall(project, "change retry code");
  assert.match(result.context_block, /Pinned Repo Context/);
  assert.match(result.context_block, /project_context/);
  assert.match(result.context_block, /Always run checkout retry tests/);

  const deleted = deleteContextSlot(project, "project_context");
  assert.equal(deleted.ok, true);
  assert.equal(kageContextSlots(project).totals.slots, 0);
});

test("recall reuses current graph artifacts without rewriting them", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  const captured = capture({
    projectDir: project,
    title: "Run tests",
    body: "Run tests with npm test. Verified by package scripts.",
    type: "runbook",
    paths: ["package.json"],
    tags: ["tests"],
  });
  assert.equal(captured.ok, true);
  buildIndexes(project);

  const codeGraphPath = join(codeGraphDir(project), "graph.json");
  const memoryGraphPath = join(graphDir(project), "graph.json");
  const codeGraph = JSON.parse(readFileSync(codeGraphPath, "utf8"));
  const memoryGraph = JSON.parse(readFileSync(memoryGraphPath, "utf8"));
  codeGraph.generated_at = "sentinel-code";
  memoryGraph.generated_at = "sentinel-memory";
  writeFileSync(codeGraphPath, JSON.stringify(codeGraph, null, 2), "utf8");
  writeFileSync(memoryGraphPath, JSON.stringify(memoryGraph, null, 2), "utf8");

  const result = recall(project, "how do I run tests");

  assert.equal(result.results[0]?.packet.title, "Run tests");
  assert.equal(JSON.parse(readFileSync(codeGraphPath, "utf8")).generated_at, "sentinel-code");
  assert.equal(JSON.parse(readFileSync(memoryGraphPath, "utf8")).generated_at, "sentinel-memory");
});

test("recall uses BM25 lexical ranking for repeated body evidence", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A sparse unrelated note",
    summary: "Operational note",
    body: "Cache eviction appears once. Verified by: npm test.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z repeated unrelated note",
    summary: "Operational note",
    body: "Cache eviction cache eviction cache eviction cache eviction cache eviction. Verified by: npm test.",
    type: "reference",
  });

  const result = recall(project, "cache eviction", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z repeated unrelated note");
  assert.equal(result.explanations?.[0]?.provider, "bm25");
  assert.equal((result.results[0]?.score_breakdown?.bm25 ?? 0) > 0, true);
});

test("recall tokenizes multilingual memory without requiring spaces", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A unrelated deployment note",
    summary: "Operational note",
    body: "Deployment assets are uploaded after npm run build.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z multilingual checkout note",
    summary: "支付重试说明",
    body: "支付重试逻辑必须保留幂等键检查。Verified by checkout retry tests.",
    type: "reference",
  });

  const result = recall(project, "支付重试", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z multilingual checkout note");
  assert.equal((result.results[0]?.score_breakdown?.bm25 ?? 0) > 0, true);
});

test("recall records local access without mutating shareable packet files", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Webhook retry gotcha",
    body: "Webhook retries use idempotency keys. Run webhook retry tests before changing this flow.",
    type: "gotcha",
    tags: ["webhook", "retry"],
    paths: ["src/webhook.ts"],
  });
  const packet = loadApprovedPackets(project).find((item) => item.title === "Webhook retry gotcha");
  assert.ok(packet);
  const fileName = readdirSync(packetsDir(project)).find((name) => name.includes("webhook-retry-gotcha"));
  assert.ok(fileName);
  const packetPath = join(packetsDir(project), fileName);
  const before = readFileSync(packetPath, "utf8");

  const first = recall(project, "webhook retry idempotency", 2, true);
  assert.equal(first.results[0]?.packet.id, packet.id);
  assert.equal(readFileSync(packetPath, "utf8"), before);

  const access = kageMemoryAccess(project);
  const entry = access.entries.find((item) => item.packet_id === packet.id);
  assert.ok(entry);
  assert.equal(entry.total_uses, 1);
  assert.equal(entry.uses_30d, 1);
  assert.equal(access.totals.tracked_packets, 1);

  const second = recall(project, "webhook retry idempotency", 2, true);
  assert.equal((second.results[0]?.score_breakdown?.usage ?? 0) > 0, true);
  assert.equal(second.results[0]?.why_matched.some((item) => item.startsWith("usage:")), true);
});

test("memory access report recommends hot promotion and cold review actions", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Webhook retry gotcha",
    body: "Webhook retries use idempotency keys. Run webhook retry tests before changing this flow.",
    type: "gotcha",
    tags: ["webhook", "retry"],
    paths: ["src/webhook.ts"],
  });
  capture({
    projectDir: project,
    title: "Old setup note",
    body: "Legacy setup note that has not been recalled by an agent yet.",
    type: "reference",
    tags: ["setup"],
    paths: [],
  });

  for (let index = 0; index < 3; index += 1) {
    recall(project, "webhook retry idempotency", 1, true);
  }

  const access = kageMemoryAccess(project);
  assert.equal(access.totals.hot_packets, 1);
  assert.equal(access.totals.cold_packets >= 1, true);
  assert.ok(access.recommendations.some((item) => item.kind === "promote_hot" && item.title === "Webhook retry gotcha"));
  assert.ok(access.recommendations.some((item) => item.kind === "review_cold" && item.title === "Old setup note"));
  assert.ok(access.recommendations.some((item) => item.kind === "connect_paths" && item.title === "Old setup note"));
});

test("memory access report asks users to build telemetry when no recall usage exists", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Checkout runbook",
    body: "Run checkout tests before changing checkout state transitions.",
    type: "runbook",
    tags: ["checkout"],
    paths: ["src/checkout.ts"],
  });

  const access = kageMemoryAccess(project);
  assert.equal(access.totals.tracked_packets, 0);
  assert.ok(access.recommendations.some((item) => item.kind === "seed_usage"));
});

test("memory lifecycle report turns packet state into review actions", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "checkout.ts"), "export const checkout = true;\n", "utf8");
  writeFileSync(join(project, "src", "webhook.ts"), "export const webhook = true;\n", "utf8");

  const hot = capture({
    projectDir: project,
    title: "Checkout retry runbook",
    body: "Checkout retries use session state. Run checkout retry tests before changing this flow.",
    type: "runbook",
    tags: ["checkout", "retry"],
    paths: ["src/checkout.ts"],
  });
  const stale = capture({
    projectDir: project,
    title: "Webhook callback gotcha",
    body: "Webhook callbacks use idempotency keys. Verify callback retry tests before changing this flow.",
    type: "gotcha",
    tags: ["webhook", "retry"],
    paths: ["src/webhook.ts"],
  });
  const ungrounded = capture({
    projectDir: project,
    title: "Broad architecture note",
    body: "A broad note with no direct path grounding yet.",
    type: "reference",
    tags: ["architecture"],
    paths: [],
  });
  assert.ok(hot.packet);
  assert.ok(stale.packet);
  assert.ok(ungrounded.packet);

  for (let index = 0; index < 3; index += 1) recall(project, "checkout retry session state", 1, true);
  recordFeedback(project, stale.packet.id, "stale");

  const staleFile = readFileSync(stale.path!, "utf8");
  const stalePacket = JSON.parse(staleFile);
  stalePacket.freshness.ttl_days = 1;
  stalePacket.freshness.last_verified_at = "2024-01-01T00:00:00.000Z";
  writeFileSync(stale.path!, `${JSON.stringify(stalePacket, null, 2)}\n`, "utf8");

  const lifecycle = kageMemoryLifecycle(project);
  assert.equal(lifecycle.totals.approved >= 3, true);
  assert.equal(lifecycle.totals.hot, 1);
  assert.equal(lifecycle.totals.stale, 1);
  assert.equal(lifecycle.totals.ungrounded, 1);
  assert.equal(lifecycle.totals.disputed, 1);
  assert.ok(lifecycle.items.some((item) => item.packet_id === hot.packet!.id && item.health === "hot" && item.recommended_action === "promote_hot"));
  assert.ok(lifecycle.items.some((item) => item.packet_id === stale.packet!.id && item.health === "disputed" && item.recommended_action === "resolve_feedback"));
  assert.ok(lifecycle.items.some((item) => item.packet_id === ungrounded.packet!.id && item.recommended_action === "add_grounding"));
  assert.ok(lifecycle.recommendations.some((item) => item.kind === "resolve_feedback"));
  assert.ok(lifecycle.recommendations.some((item) => item.kind === "promote_hot"));
});

test("memory timeline report shows recent collaborative memory activity", () => {
  const project = tempProject();
  const added = capture({
    projectDir: project,
    title: "Checkout retry decision",
    body: "Checkout retries keep session state separate from callback retries.",
    type: "decision",
    tags: ["checkout", "retry"],
    paths: ["src/checkout.ts"],
  });
  const updated = capture({
    projectDir: project,
    title: "Webhook callback runbook",
    body: "Run callback retry tests after touching webhook callbacks.",
    type: "runbook",
    tags: ["webhook"],
    paths: ["src/webhook.ts"],
  });
  assert.ok(added.packet);
  assert.ok(updated.packet);

  const updatedPacket = JSON.parse(readFileSync(updated.path!, "utf8"));
  updatedPacket.created_at = "2024-01-01T00:00:00.000Z";
  updatedPacket.updated_at = new Date().toISOString();
  writeFileSync(updated.path!, `${JSON.stringify(updatedPacket, null, 2)}\n`, "utf8");

  const timeline = kageMemoryTimeline(project, 7);
  assert.equal(timeline.schema_version, 1);
  assert.equal(timeline.totals.added >= 1, true);
  assert.equal(timeline.totals.updated >= 1, true);
  assert.ok(timeline.entries.some((entry) => entry.kind === "added" && entry.packet_id === added.packet!.id));
  assert.ok(timeline.entries.some((entry) => entry.kind === "updated" && entry.packet_id === updated.packet!.id));
  assert.equal(timeline.entries[0].date >= timeline.entries.at(-1)!.date, true);
  assert.ok(timeline.recommendations.some((item) => item.includes("Review recent memory changes")));
});

test("memory supersession records lineage and removes old packet from active recall", () => {
  const project = tempProject();
  const oldPacket = capture({
    projectDir: project,
    title: "Old checkout retry note",
    body: "Old note says checkout retry logic can be merged.",
    type: "decision",
    tags: ["checkout", "retry"],
    paths: ["src/checkout.ts"],
  });
  const replacement = capture({
    projectDir: project,
    title: "Checkout retry split decision",
    body: "Callback retries use idempotency keys, while checkout retries use session state. Do not merge these paths.",
    type: "decision",
    tags: ["checkout", "retry"],
    paths: ["src/checkout.ts"],
  });
  assert.ok(oldPacket.packet);
  assert.ok(replacement.packet);

  const result = supersedeMemory(project, oldPacket.packet.id, replacement.packet.id, "Newer debugging proved the retry paths must stay separate.");
  assert.equal(result.ok, true);
  assert.ok(result.old_packet);
  assert.ok(result.replacement_packet);
  assert.equal(result.old_packet.status, "superseded");
  assert.equal(result.replacement_packet.status, "approved");
  assert.equal(result.old_packet.quality.superseded_by, replacement.packet.id);
  assert.equal(result.replacement_packet.edges.some((edge) => edge.relation === "supersedes" && edge.to === oldPacket.packet!.id), true);

  const active = loadApprovedPackets(project);
  assert.equal(active.some((packet) => packet.id === oldPacket.packet!.id), false);
  assert.equal(active.some((packet) => packet.id === replacement.packet!.id), true);

  const lineage = kageMemoryLineage(project);
  assert.equal(lineage.totals.superseded, 1);
  assert.equal(lineage.totals.chains, 1);
  assert.ok(lineage.chains.some((chain) => chain.current_packet_id === replacement.packet!.id && chain.superseded_packet_ids.includes(oldPacket.packet!.id)));
  assert.ok(lineage.recommendations.some((item) => item.includes("current replacement")));
});

test("memory lineage report flags superseded packets without replacement links", () => {
  const project = tempProject();
  const packet = capture({
    projectDir: project,
    title: "Retired setup note",
    body: "Old setup note that should no longer be used.",
    type: "runbook",
    tags: ["setup"],
    paths: ["README.md"],
  });
  assert.ok(packet.packet);
  const raw = JSON.parse(readFileSync(packet.path!, "utf8"));
  raw.status = "superseded";
  raw.updated_at = new Date().toISOString();
  writeFileSync(packet.path!, `${JSON.stringify(raw, null, 2)}\n`, "utf8");

  const lineage = kageMemoryLineage(project);
  assert.equal(lineage.totals.orphans, 1);
  assert.ok(lineage.orphans.some((item) => item.packet_id === packet.packet!.id));
  assert.ok(lineage.recommendations.some((item) => item.includes("replacement link")));
});

test("memory audit report records explicit memory mutations", () => {
  const project = tempProject();
  const first = capture({
    projectDir: project,
    title: "Checkout retry note",
    body: "Checkout retries use session state and should be tested after checkout changes.",
    type: "decision",
    paths: ["src/checkout.ts"],
  });
  const replacement = capture({
    projectDir: project,
    title: "Checkout retry split",
    body: "Callback retries use idempotency keys while checkout retries use session state.",
    type: "decision",
    paths: ["src/checkout.ts"],
  });
  assert.ok(first.packet);
  assert.ok(replacement.packet);

  const feedback = recordFeedback(project, first.packet.id, "helpful");
  assert.equal(feedback.ok, true);
  const superseded = supersedeMemory(project, first.packet.id, replacement.packet.id, "Replacement has the verified retry split.");
  assert.equal(superseded.ok, true);

  const report = kageMemoryAudit(project);
  assert.equal(report.schema_version, 1);
  assert.equal(report.totals.capture, 2);
  assert.equal(report.totals.feedback, 1);
  assert.equal(report.totals.supersede, 1);
  assert.ok(report.entries.some((entry) => entry.operation === "capture" && entry.packet_ids.includes(first.packet!.id)));
  assert.ok(report.entries.some((entry) => entry.operation === "feedback" && entry.details.feedback === "helpful"));
  assert.ok(report.entries.some((entry) => entry.operation === "supersede" && entry.packet_ids.includes(replacement.packet!.id)));
  assert.ok(report.recommendations.some((item) => item.includes("audit")));
});

test("memory audit report records pending review actions", () => {
  const project = tempProject();
  const approved = capture({
    projectDir: project,
    title: "Pending review packet",
    body: "Review this packet before sharing it with future agents.",
    type: "runbook",
    paths: ["README.md"],
  });
  const rejected = capture({
    projectDir: project,
    title: "Rejected review packet",
    body: "Reject this packet because it is not durable enough.",
    type: "reference",
    paths: ["README.md"],
  });
  assert.ok(approved.packet);
  assert.ok(rejected.packet);
  mkdirSync(pendingDir(project), { recursive: true });
  writeFileSync(join(pendingDir(project), "approve-me.json"), `${JSON.stringify({ ...approved.packet, status: "pending" }, null, 2)}\n`, "utf8");
  writeFileSync(join(pendingDir(project), "reject-me.json"), `${JSON.stringify({ ...rejected.packet, status: "pending" }, null, 2)}\n`, "utf8");

  approvePending(project, approved.packet.id);
  rejectPending(project, rejected.packet.id);

  const report = kageMemoryAudit(project);
  assert.equal(report.totals.approve, 1);
  assert.equal(report.totals.reject, 1);
  assert.ok(report.entries.some((entry) => entry.operation === "approve" && entry.packet_ids.includes(approved.packet!.id)));
  assert.ok(report.entries.some((entry) => entry.operation === "reject" && entry.packet_ids.includes(rejected.packet!.id)));
});

test("memory handoff combines review blockers and recent memory mutations", () => {
  const project = tempProject();
  const packet = capture({
    projectDir: project,
    title: "Ungrounded checkout memory",
    body: "Checkout retry behavior is important but this memory still needs path grounding.",
    type: "decision",
  });
  assert.ok(packet.packet);
  mkdirSync(pendingDir(project), { recursive: true });
  writeFileSync(join(pendingDir(project), "pending-review.json"), `${JSON.stringify({ ...packet.packet, id: `${packet.packet.id}-pending`, status: "pending" }, null, 2)}\n`, "utf8");

  const handoff = kageMemoryHandoff(project);
  assert.equal(handoff.schema_version, 1);
  assert.equal(handoff.ok, false);
  assert.equal(handoff.totals.open_items > 0, true);
  assert.equal(handoff.totals.recent_mutations >= 1, true);
  assert.equal(handoff.primary_action.target, "review");
  assert.equal(handoff.primary_action.severity, "warning");
  assert.ok(handoff.primary_action.label.includes("Resolve"));
  assert.ok(handoff.items.some((item) => item.kind === "inbox" && item.action.includes("Approve")));
  assert.ok(handoff.items.some((item) => item.kind === "lifecycle" && item.action.includes("paths")));
  assert.ok(handoff.items.some((item) => item.kind === "audit" && item.summary.includes("capture")));
});

test("memory handoff warns when observed sessions still have distillable learnings", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "handoff-session",
    agent: "codex",
    command: "npm test -- checkout",
    exit_code: 0,
    summary: "Use this command after changing checkout retry behavior.",
    timestamp: "2026-05-17T10:01:00.000Z",
  }).ok, true);

  const handoff = kageMemoryHandoff(project);

  assert.equal(handoff.ok, false);
  assert.equal(handoff.totals.distillable_sessions, 1);
  assert.equal(handoff.totals.durable_observations, 1);
  assert.ok(handoff.items.some((item) => item.kind === "session" && item.title === "handoff-session" && item.action.includes("kage distill")));
  assert.equal(handoff.primary_action.target, "memory");
});

test("recall keeps reference packets text-led instead of graph-led", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A broad reference index",
    summary: "Session note",
    body: "Retry behavior appears once. Verified by: npm test.",
    type: "reference",
    tags: ["retry", "architecture", "reference"],
    paths: ["docs/retry.md"],
  });
  capture({
    projectDir: project,
    title: "Z exact reference evidence",
    summary: "Session note",
    body: "Retry behavior retry behavior retry behavior retry behavior retry behavior. Verified by: npm test.",
    type: "reference",
  });

  const result = recall(project, "retry behavior", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z exact reference evidence");
  assert.equal((result.results[0]?.score_breakdown?.bm25 ?? 0) > (result.results[1]?.score_breakdown?.bm25 ?? 0), true);
});

test("recall expands relative temporal queries when a question date is supplied", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A nearby but wrong session",
    summary: "Temporal note",
    body: "Session date: 2023/03/20\nI mentioned an ordinary planning update.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z target-dated session",
    summary: "Temporal note",
    body: "Session date: 2023/02/28\nI signed a contract with my first client.",
    type: "reference",
  });

  const result = recall(project, "What was the significant business milestone I mentioned four weeks ago?\nQuestion date: 2023/03/28 (Tue)", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z target-dated session");
  assert.equal((result.results[0]?.score_breakdown?.temporal ?? 0) > 0, true);
});

test("recall expands common memory concepts without requiring exact wording", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A generic dinner note",
    summary: "Food note",
    body: "We discussed dinner plans and a restaurant reservation.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z garden produce note",
    summary: "Food note",
    body: "The user harvested tomatoes and herbs from the garden and wanted recipes using that produce.",
    type: "reference",
  });

  const result = recall(project, "What should I serve for dinner with homegrown ingredients?", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z garden produce note");
  assert.equal((result.results[0]?.score_breakdown?.bm25 ?? 0) > 0, true);
  assert.equal((result.results[0]?.score_breakdown?.semantic ?? 0) > 0, true);
  assert.equal((result.results[0]?.score_breakdown?.vector ?? 0) > 0, true);
  assert.equal(result.results[0]?.why_matched.some((why) => why === "semantic-concept:garden-produce"), true);
});

test("recall can disable semantic concept expansion for strict external benchmarks", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A generic dinner note",
    summary: "Food note",
    body: "We discussed dinner plans and a restaurant reservation.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z garden produce note",
    summary: "Food note",
    body: "The user harvested tomatoes and herbs from the garden and wanted recipes using that produce.",
    type: "reference",
  });

  const strict = recall(project, "What should I serve for dinner with homegrown ingredients?", 2, true, {
    semanticExpansion: false,
  });

  assert.equal(strict.results.some((entry) => (entry.score_breakdown?.semantic ?? 0) > 0), false);
  assert.equal(strict.results.some((entry) => entry.why_matched.some((why) => why.startsWith("semantic-concept:"))), false);
});

test("recall reuses persisted sparse vector index when current", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A generic dinner note",
    summary: "Food note",
    body: "We discussed dinner plans and a restaurant reservation.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z garden produce note",
    summary: "Food note",
    body: "The user harvested tomatoes and herbs from the garden and wanted recipes using that produce.",
    type: "reference",
  });
  buildIndexes(project);

  const result = recall(project, "What should I serve for dinner with homegrown ingredients?", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z garden produce note");
  assert.equal((result.results[0]?.score_breakdown?.vector ?? 0) > 0, true);
  assert.equal(result.results[0]?.why_matched.some((why) => why.startsWith("vector-local-index:")), true);
});

test("embedding recall uses optional dense embedding artifact", async () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A unrelated deployment note",
    summary: "Deploy note",
    body: "The release job uploads static assets.",
    type: "reference",
  });
  capture({
    projectDir: project,
    title: "Z latent checkout note",
    summary: "Checkout behavior",
    body: "The idempotency callback path must stay separate from session retry logic.",
    type: "reference",
  });
  const provider = {
    name: "test",
    model: "deterministic",
    dimensions: 2,
    async embedBatch(texts: string[]) {
      return texts.map((text) => /idempotency|checkout|duplicate charge/i.test(text) ? [1, 0] : [0, 1]);
    },
  };

  const built = await buildEmbeddingIndex(project, { provider });
  assert.equal(built.ok, true);
  assert.equal(existsSync(join(project, ".agent_memory", "indexes", "embeddings-local.json")), true);

  const result = await recallWithEmbeddings(project, "avoid duplicate charge", 2, true, { provider });
  assert.equal(result.results[0]?.packet.title, "Z latent checkout note");
  assert.equal((result.results[0]?.score_breakdown?.vector ?? 0) > 0, true);
  assert.equal(result.results[0]?.why_matched.some((why) => why.startsWith("vector-external:test:deterministic")), true);
});

test("dense embedding provider factory is reusable and lazy", async () => {
  const provider = await createDenseEmbeddingProvider("Xenova/test-model");
  assert.equal(provider.name, "xenova");
  assert.equal(provider.model, "Xenova/test-model");
  assert.equal(provider.dimensions, 384);
});

test("recall prioritizes runbooks for command-intent queries", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A release proof note",
    summary: "Operational note",
    body: "Verified by npm test. npm test passed. npm test was run again.",
    type: "decision",
  });
  capture({
    projectDir: project,
    title: "A ranking bug note",
    summary: "BM25 bug note",
    body: "A previous bug made how do I run tests return release proof instead of runbooks. Verified by npm test.",
    type: "bug_fix",
  });
  capture({
    projectDir: project,
    title: "Z local command guide",
    summary: "Operational note",
    body: "Use npm test to run the suite.",
    type: "runbook",
  });

  const result = recall(project, "how do I run tests", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z local command guide");
  assert.equal((result.results[0]?.score_breakdown?.intent ?? 0) > 0, true);
});

test("recall applies type intent for gotcha queries", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "A noisy branch note",
    summary: "Branch gotchas gotchas gotchas",
    body: "This branch note mentions gotchas several times but is not itself a gotcha.",
    type: "workflow",
  });
  capture({
    projectDir: project,
    title: "Z config gotcha",
    summary: "Remember the config ordering issue.",
    body: "The config loader reads local overrides after defaults. Verified by: npm test.",
    type: "gotcha",
  });

  const result = recall(project, "what gotchas exist", 2, true);
  assert.equal(result.results[0]?.packet.title, "Z config gotcha");
  assert.equal((result.results[0]?.score_breakdown?.intent ?? 0) > 0, true);
});

test("recall diversifies results across observed session sources", () => {
  const project = tempProject();
  const writeSessionPacket = (title: string, sessionId: string) => {
    const result = capture({
      projectDir: project,
      title,
      summary: "Checkout retry memory",
      body: "Checkout retry idempotency behavior must stay split between callback retries and user checkout retries.",
      type: "bug_fix",
      tags: ["checkout", "retry"],
    });
    assert.ok(result.packet);
    assert.ok(result.path);
    const packet = JSON.parse(readFileSync(result.path, "utf8"));
    packet.source_refs = [{ kind: "observation_session", session_id: sessionId }];
    writeFileSync(result.path, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  };

  writeSessionPacket("A checkout retry session note", "noisy-session");
  writeSessionPacket("B checkout retry session note", "noisy-session");
  writeSessionPacket("C checkout retry session note", "noisy-session");
  writeSessionPacket("D checkout retry session note", "noisy-session");
  writeSessionPacket("Z checkout retry independent note", "independent-session");

  const result = recall(project, "checkout retry idempotency", 4);

  assert.deepEqual(result.results.map((entry) => entry.packet.title), [
    "A checkout retry session note",
    "B checkout retry session note",
    "C checkout retry session note",
    "Z checkout retry independent note",
  ]);
});

test("builds an evidence-backed local knowledge graph", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" }, dependencies: { next: "15.0.0" } }), "utf8");
  indexProject(project);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.entities.some((entity) => entity.type === "memory"), true);
  assert.equal(graph.entities.some((entity) => entity.type === "command" && entity.name === "npm run test"), true);
  assert.equal(graph.entities.some((entity) => entity.type === "package" && entity.name === "next"), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "defines_command" && edge.evidence.length > 0), true);
  assert.equal(graph.episodes.some((episode) => episode.kind === "memory_packet"), true);
  const graphArtifact = JSON.parse(readFileSync(join(graphDir(project), "graph.json"), "utf8"));
  assert.equal(graphArtifact.compact, true);
  assert.equal(Array.isArray(graphArtifact.entities), false);
  assert.equal(graphArtifact.refs.entities, "entities.json");
  assert.ok(graphDir(project));
});

test("builds a source-derived code graph for JS projects", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({ name: "demo", scripts: { test: "node --test" }, dependencies: { express: "4.0.0" } }),
    "utf8"
  );
  writeFileSync(
    join(project, "src", "taskStore.js"),
    `export function createTaskStore() {
  return {
    list() { return []; },
    complete(id) { return id; }
  };
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "src", "server.js"),
    `import { createTaskStore } from './taskStore.js';
export function createApp(taskStore = createTaskStore()) {
  if (req.method === 'GET' && url.pathname === '/tasks') taskStore.list();
  if (req.method === 'POST' && url.pathname === '/summary') taskStore.complete(1);
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "test", "server.test.js"),
    `import test from 'node:test';
import { createApp } from '../src/server.js';
test('createApp routes tasks', () => createApp());
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.some((file) => file.path === "src/server.js"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "createTaskStore" && symbol.export), true);
  assert.equal(graph.imports.some((edge) => edge.from_path === "src/server.js" && edge.to_path === "src/taskStore.js"), true);
  assert.equal(graph.routes.some((route) => route.method === "GET" && route.path === "/tasks"), true);
  const createTaskCall = graph.calls.find((call) => call.to_symbol.includes("createtaskstore"));
  assert.equal(Boolean(createTaskCall), true);
  // Import-resolved cross-file call: higher confidence than a name-only match.
  assert.equal(createTaskCall?.confidence, 0.85);
  assert.equal(createTaskCall?.resolution, "typescript_ast_name");
  assert.equal(graph.tests.some((edge) => edge.covers_symbol === "createApp"), true);
});

test("risk report combines code dependents with git ownership and co-change signals", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  writeFileSync(join(project, "test", "core.test.js"), "import { core } from '../src/core.js';\ntest('core', () => core());\n", "utf8");
  commitAll(project, "initial core");
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 2; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core() + 1; }\n", "utf8");
  commitAll(project, "adjust core and app together");

  buildCodeGraph(project, { force: true });
  const report = kageRisk(project, ["src/core.js"]);
  const target = report.targets["src/core.js"];

  assert.ok(target);
  assert.equal(target.exists_in_code_graph, true);
  assert.equal(target.dependents.includes("src/app.js"), true);
  assert.equal(target.test_gap, false);
  assert.equal(target.git.commit_count_total >= 2, true);
  assert.equal(target.git.primary_owner, "Test <test@example.com>");
  assert.equal(target.git.co_change_partners.some((partner) => partner.file_path === "src/app.js"), true);
  assert.equal(target.co_change_warnings.some((partner) => partner.file_path === "src/app.js" && partner.included_in_change === false), true);
  assert.equal(report.ownership_silos.some((silo) => silo.file_path === "src/core.js" && silo.primary_owner === "Test <test@example.com>"), false);

  writeFileSync(join(project, "src", "core.js"), "export function core() { return 3; }\n", "utf8");
  const changedReport = kageRisk(project);
  assert.ok(changedReport.targets["src/core.js"]);
  assert.equal(changedReport.targets["rc/core.js"], undefined);
});

test("dependency path reports forward reverse and undirected code graph connections", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.ts"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "service.ts"), "import { core } from './core.js';\nexport function service() { return core(); }\n", "utf8");
  writeFileSync(join(project, "src", "app.ts"), "import { service } from './service.js';\nexport function app() { return service(); }\n", "utf8");
  writeFileSync(join(project, "src", "sibling.ts"), "import { service } from './service.js';\nexport function sibling() { return service(); }\n", "utf8");
  buildCodeGraph(project, { force: true });

  const forward = kageDependencyPath(project, "src/app.ts", "src/core.ts");
  assert.equal(forward.relation, "source_depends_on_target");
  assert.deepEqual(forward.path, ["src/app.ts", "src/service.ts", "src/core.ts"]);
  assert.equal(forward.distance, 2);

  const reverse = kageDependencyPath(project, "src/core.ts", "src/app.ts");
  assert.equal(reverse.relation, "target_depends_on_source");
  assert.deepEqual(reverse.path, ["src/core.ts", "src/service.ts", "src/app.ts"]);

  const undirected = kageDependencyPath(project, "src/app.ts", "src/sibling.ts");
  assert.equal(undirected.relation, "connected_undirected");
  assert.deepEqual(undirected.path, ["src/app.ts", "src/service.ts", "src/sibling.ts"]);
});

test("cleanup candidates conservatively reports unreferenced source files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { used } from './used.js';\nused();\n", "utf8");
  writeFileSync(join(project, "src", "used.js"), "export function used() { return true; }\nexport function spare() { return false; }\nfunction _orphanHelper() { return false; }\n", "utf8");
  writeFileSync(join(project, "src", "unused.js"), "export function unused() { return false; }\n", "utf8");
  writeFileSync(join(project, "src", "job.ts"), "export function runJob() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export const jobPath = 'job.js';\n", "utf8");
  buildCodeGraph(project, { force: true });

  const report = kageCleanupCandidates(project);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/unused.js"), true);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/used.js" && candidate.kind === "unreferenced_file"), false);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/job.ts"), false);
  assert.equal(report.skipped_runtime_references.includes("src/job.ts"), true);
  assert.equal(report.skipped_entrypoints.includes("src/index.js"), true);
  const unused = report.candidates.find((candidate) => candidate.path === "src/unused.js");
  assert.equal(unused?.kind, "unreferenced_file");
  assert.equal(unused?.inbound_imports, 0);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/used.js" && candidate.kind === "unused_export" && candidate.symbol_name === "spare"), true);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/used.js" && candidate.kind === "unused_internal_symbol" && candidate.symbol_name === "_orphanHelper"), true);
  assert.equal(report.candidates.some((candidate) => candidate.path === "src/used.js" && candidate.symbol_name === "used"), false);
});

test("reviewer suggestions rank local git authors and co-change owners", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "alice owns core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 2; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core() + 1; }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "bob updates app with core"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Bob", GIT_AUTHOR_EMAIL: "bob@example.com", GIT_COMMITTER_NAME: "Bob", GIT_COMMITTER_EMAIL: "bob@example.com" },
  });
  buildCodeGraph(project, { force: true });

  const report = kageReviewerSuggestions(project, ["src/core.js"]);
  assert.equal(report.suggestions.some((suggestion) => suggestion.reviewer === "Alice <alice@example.com>"), true);
  assert.equal(report.suggestions.some((suggestion) => suggestion.reviewer === "Bob <bob@example.com>"), true);
  assert.equal(report.suggestions[0].authored_targets.includes("src/core.js"), true);
});

test("contributor profiles summarize local git activity ownership and modules", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src", "api"), { recursive: true });
  writeFileSync(join(project, "src", "api", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "api", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "feat: alice owns api"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
  });
  for (let i = 0; i < 5; i += 1) {
    writeFileSync(join(project, "src", "api", "core.js"), `export function core() { return ${i + 2}; }\n`, "utf8");
    execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", `fix: alice updates core ${i}`], {
      cwd: project,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_NAME: "Alice", GIT_AUTHOR_EMAIL: "alice@example.com", GIT_COMMITTER_NAME: "Alice", GIT_COMMITTER_EMAIL: "alice@example.com" },
    });
  }
  buildCodeGraph(project, { force: true });

  const report = kageContributors(project);
  const alice = report.contributors.find((profile) => profile.contributor === "Alice <alice@example.com>");
  assert.ok(alice);
  assert.equal(alice.commits_total >= 6, true);
  assert.equal(alice.files_touched.some((file) => file.path === "src/api/core.js"), true);
  assert.equal(alice.modules_touched.some((module) => module.module === "src" || module.module === "src/api"), true);
  assert.equal(alice.primary_owned_files >= 1, true);
  assert.equal(alice.silo_files.some((file) => file.path === "src/api/core.js"), true);
  assert.equal(alice.commit_categories.fix >= 5, true);
});

test("project profile summarizes repo concepts key files and memory focus", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test", build: "tsc" } }), "utf8");
  writeFileSync(join(project, "src", "auth.js"), "export function verifyToken(token) { return token.length > 0; }\n", "utf8");
  writeFileSync(join(project, "src", "api.js"), "import { verifyToken } from './auth.js';\nexport function handler(req) { return verifyToken(req.token); }\n", "utf8");
  const captured = capture({
    projectDir: project,
    title: "Auth token invariant",
    body: "When editing src/auth.js, keep token verification side-effect free because API handlers retry requests.",
    type: "decision",
    paths: ["src/auth.js"],
    tags: ["auth", "api"],
  });
  assert.equal(captured.ok, true);
  buildStructuralIndex(project);
  buildCodeGraph(project, { force: true });

  const profile = kageProjectProfile(project);

  assert.equal(profile.totals.approved_memory, 1);
  assert.equal(profile.totals.decision_memory, 1);
  assert.equal(profile.run_commands.some((command) => command.name === "test" && command.command === "node --test"), true);
  assert.equal(profile.top_concepts.some((item) => item.concept === "auth" && item.sources.includes("memory")), true);
  assert.equal(profile.key_files.some((file) => file.path === "src/auth.js" && file.memory_packets === 1), true);
  assert.equal(profile.memory_focus.high_value_packets[0].title, "Auth token invariant");
  assert.match(profile.summary, /memory packet/);
});

test("capability audit maps memory benchmark dashboard and viewer readiness to evidence", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  writeFileSync(join(project, "src", "retry.ts"), "export function retry() { return true; }\n", "utf8");
  indexProject(project);
  const captured = capture({
    projectDir: project,
    title: "Retry flow gotcha",
    body: "When editing src/retry.ts, keep callback retry tests paired with checkout retry tests because the flows retry different state.",
    type: "gotcha",
    paths: ["src/retry.ts"],
    tags: ["retry", "tests"],
  });
  assert.equal(captured.ok, true);
  assert.equal(setContextSlot(project, {
    label: "project_context",
    content: "Always run retry tests after changing src/retry.ts.",
    paths: ["src/retry.ts"],
    tags: ["retry"],
  }).ok, true);
  assert.equal(observe(project, {
    type: "file_change",
    session_id: "capability-session",
    agent: "codex",
    path: "src/retry.ts",
    summary: "src/retry.ts must keep retry tests paired with callback changes.",
  }).ok, true);

  const report = kageCapabilityAudit(project);

  assert.equal(report.schema_version, 1);
  assert.equal(report.pillars.length, 4);
  assert.ok(report.overall_score > 0);
  assert.ok(report.checklist.some((item) => item.requirement === "reviewable repo memory" && item.pass));
  assert.ok(report.checklist.some((item) => item.requirement === "privacy-preserving session proof" && item.pass));
  assert.ok(report.pillars.find((pillar) => pillar.id === "memory")?.evidence.some((item) => item.label === "Approved memory"));
  assert.ok(report.pillars.find((pillar) => pillar.id === "dashboard_viewer")?.evidence.some((item) => item.label === "Viewer app"));
  assert.ok(report.next_actions.length);
});

test("decision intelligence surfaces why-memory coverage and gaps", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "checkout.js"), "export function checkout() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "callbacks.js"), "export function callback() { return true; }\n", "utf8");
  commitAll(project, "checkout flow");
  buildCodeGraph(project, { force: true });
  const captured = capture({
    projectDir: project,
    title: "Checkout retry paths stay separate",
    body: "The checkout retry paths look duplicated, but one path uses callback idempotency and the other uses user session state. Keep them separate and run checkout retry tests when touching this file.",
    type: "decision",
    paths: ["src/checkout.js"],
    context: {
      why: "Callback and user checkout retries carry different state.",
      risk_if_forgotten: "A cleanup can merge incompatible retry semantics.",
      verification: "checkout retry tests",
    },
  });
  assert.equal(captured.ok, true);

  const report = kageDecisionIntelligence(project);
  assert.equal(report.decision_memory_count, 1);
  assert.equal(report.code_paths_with_memory, 1);
  assert.equal(report.top_decisions[0].title, "Checkout retry paths stay separate");
  assert.equal(report.top_decisions[0].why, "Callback and user checkout retries carry different state.");
  assert.equal(report.coverage_gaps.some((gap) => gap.path === "src/callbacks.js"), true);
});

test("module health rolls up graph test cleanup and git signals", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src", "payments"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "payments", "checkout.js"), "export function checkout() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "payments", "unused.js"), "export function unused() { return false; }\n", "utf8");
  writeFileSync(join(project, "test", "checkout.test.js"), "import { checkout } from '../src/payments/checkout.js';\ntest('checkout', () => checkout());\n", "utf8");
  commitAll(project, "payments module");
  writeFileSync(join(project, "src", "payments", "checkout.js"), "export function checkout() { return 'ok'; }\n", "utf8");
  commitAll(project, "touch checkout");
  buildCodeGraph(project, { force: true });

  const report = kageModuleHealth(project);
  const module = report.modules.find((item) => item.module === "src");
  assert.ok(module);
  assert.equal(module.cleanup_candidates >= 1, true);
  assert.equal(module.churn_90d >= 2, true);
  assert.equal(module.primary_owners.some((owner) => owner.owner === "Test <test@example.com>"), true);
  assert.equal(module.score < 100, true);
});

test("graph insights report central files cycles communities and entry flows", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "index.js"), "import { a } from './a.js';\na();\n", "utf8");
  writeFileSync(join(project, "src", "a.js"), "import { b } from './b.js';\nexport function a() { return b(); }\n", "utf8");
  writeFileSync(join(project, "src", "b.js"), "import { a } from './a.js';\nexport function b() { return a; }\n", "utf8");
  writeFileSync(join(project, "src", "server.js"), "import { a } from './a.js';\nconst app = { get() {} };\nfunction handler() { return a(); }\napp.get('/health', handler);\n", "utf8");

  const report = kageGraphInsights(project);
  assert.equal(report.edge_mix.imports >= 3, true);
  assert.equal(report.language_coverage.some((item) => item.language === "javascript" && item.files === 4), true);
  assert.equal(report.central_files.some((file) => file.path === "src/a.js"), true);
  assert.equal(report.dependency_cycles.some((cycle) => cycle.files.includes("src/a.js") && cycle.files.includes("src/b.js")), true);
  assert.equal(report.communities.some((community) => community.files.includes("src/index.js") && community.files.includes("src/server.js")), true);
  assert.equal(report.entry_flows.some((flow) => flow.entry === "src/server.js" && flow.path.includes("src/a.js")), true);
});

test("repo x-ray gives first-use code structure map", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "auth.js"), "export function verifyToken(token) { return token.length > 0; }\n", "utf8");
  writeFileSync(join(project, "src", "server.js"), "import { verifyToken } from './auth.js';\nconst app = { get() {} };\nfunction handler(req) { return verifyToken(req.token); }\napp.get('/health', handler);\n", "utf8");
  writeFileSync(join(project, "test", "auth.test.js"), "import { verifyToken } from '../src/auth.js';\ntest('auth', () => verifyToken('token'));\n", "utf8");
  commitAll(project, "auth server");
  const captured = capture({
    projectDir: project,
    title: "Auth token invariant",
    body: "When editing src/auth.js, keep token verification side-effect free because middleware callers retry requests.",
    type: "decision",
    paths: ["src/auth.js"],
    tags: ["auth"],
  });
  assert.equal(captured.ok, true);
  buildStructuralIndex(project);
  buildCodeGraph(project, { force: true });

  const report = kageRepoXray(project);

  assert.equal(report.schema_version, 1);
  assert.ok(report.layers.some((layer) => layer.id === "entry_points" && layer.items.some((item) => item.path === "src/server.js")));
  assert.ok(report.layers.some((layer) => layer.id === "core_modules" && layer.items.some((item) => item.path === "src/auth.js")));
  assert.ok(report.layers.some((layer) => layer.id === "test_map" && layer.items.some((item) => item.path === "test/auth.test.js")));
  assert.ok(report.layers.some((layer) => layer.id === "memory_overlay" && layer.items.some((item) => item.path === "src/auth.js")));
  assert.ok(report.layers.some((layer) => layer.id === "change_risk" && layer.items.every((item) => !item.path.startsWith(".agent_memory/"))));
  assert.ok(report.first_use_script.some((line) => /I mapped your repo/.test(line)));
  assert.ok(report.next_actions.length);
});

test("workspace summarizes sibling repos and recalls across repo memory", () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kage-workspace-test-"));
  const api = join(workspaceRoot, "api");
  const web = join(workspaceRoot, "web");
  mkdirSync(join(api, "src"), { recursive: true });
  mkdirSync(join(web, "src"), { recursive: true });
  execFileSync("git", ["init"], { cwd: api, stdio: "ignore" });
  execFileSync("git", ["init"], { cwd: web, stdio: "ignore" });
  writeFileSync(join(api, "package.json"), JSON.stringify({ name: "@demo/api" }), "utf8");
  writeFileSync(join(web, "package.json"), JSON.stringify({ name: "@demo/web", dependencies: { "@demo/api": "workspace:*" } }), "utf8");
  writeFileSync(join(api, "src", "auth.js"), "export function auth() { return true; }\n", "utf8");
  writeFileSync(join(api, "src", "server.js"), "const app = { get() {} };\nfunction handler() {}\napp.get('/auth/user', handler);\n", "utf8");
  writeFileSync(join(api, "src", "events.js"), "export function created(bus) { bus.publish('auth.user.created', { id: 1 }); }\n", "utf8");
  writeFileSync(join(web, "src", "client.js"), "export function client() { return fetch('/auth/user'); }\n", "utf8");
  writeFileSync(join(web, "src", "events.js"), "export function listen(bus) { bus.subscribe('auth.user.created', () => true); }\n", "utf8");
  commitAll(api, "initial api workspace files");
  commitAll(web, "initial web workspace files");
  writeFileSync(join(api, "src", "auth.js"), "export function auth() { return 'v2'; }\n", "utf8");
  writeFileSync(join(web, "src", "client.js"), "export function client() { return fetch('/auth/user?version=2'); }\n", "utf8");
  commitAll(api, "update api auth contract");
  commitAll(web, "update web auth contract");
  buildCodeGraph(api, { force: true });
  buildCodeGraph(web, { force: true });
  learn({
    projectDir: api,
    title: "API auth middleware contract",
    learning: "The auth middleware must keep the x-user-id header contract because web clients depend on it.",
    type: "decision",
    paths: ["src/auth.js"],
    verifiedBy: "workspace test",
  });
  learn({
    projectDir: web,
    title: "Web client auth dependency",
    learning: "The web client expects API auth responses to preserve the user id header.",
    type: "decision",
    paths: ["src/client.js"],
    verifiedBy: "workspace test",
  });

  const workspace = kageWorkspace(workspaceRoot);
  assert.equal(workspace.repos.length, 2);
  const webRepo = workspace.repos.find((repo) => repo.alias === "web");
  assert.equal(webRepo?.dependencies_on_workspace_repos.some((dep) => dep.alias === "api"), true);
  assert.equal(workspace.package_dependencies.some((dep) => dep.from === "web" && dep.to === "api"), true);
  assert.equal(workspace.route_contracts.some((contract) => contract.provider_repo === "api" && contract.consumer_repo === "web" && contract.path === "/auth/user"), true);
  assert.equal(workspace.topic_contracts.some((contract) => contract.producer_repo === "api" && contract.consumer_repo === "web" && contract.topic === "auth.user.created"), true);
  assert.equal(workspace.co_changes.some((link) => link.source_repo === "api" && link.source_file === "src/auth.js" && link.target_repo === "web" && link.target_file === "src/client.js"), true);

  const recalled = kageWorkspaceRecall(workspaceRoot, "auth header contract", 5);
  assert.equal(recalled.repos_searched, 2);
  assert.equal(recalled.hits.some((hit) => hit.repo === "api" && /auth middleware/i.test(hit.title)), true);
  assert.match(recalled.context_block, /\[api\]/);
});

test("code graph represents huge source blobs without structurally extracting them", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "small.js"), "export function small() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "bundle.js"), `export const blob = "${"x".repeat(600_000)}";\n`, "utf8");

  const graph = buildCodeGraph(project);

  assert.equal(graph.files.some((file) => file.path === "src/small.js"), true);
  assert.equal(graph.files.some((file) => file.path === "src/bundle.js" && file.parser === "metadata"), true);
  const manifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(manifest.mode, "structural");
  assert.equal(manifest.coverage.indexed_files, 2);
  assert.equal(manifest.coverage.deferred_files, 1);
  assert.equal(manifest.deferred_files[0].path, "src/bundle.js");
  assert.equal(manifest.deferred_files[0].reason, "over_structural_extract_file_size_limit");
});

test("code graph caps noisy call extraction", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  const functions = Array.from({ length: 360 }, (_, index) => `export function target${index}() { return ${index}; }`).join("\n");
  const calls = Array.from({ length: 360 }, (_, index) => `  target${index}();`).join("\n");
  writeFileSync(join(project, "src", "calls.js"), `${functions}\nexport function run() {\n${calls}\n}\n`, "utf8");

  const graph = buildCodeGraph(project);

  assert.equal(graph.calls.length <= 250, true);
});

test("code graph keeps complete structural coverage for large file counts", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  for (let index = 0; index < 2003; index++) {
    writeFileSync(join(project, "src", `unit-${String(index).padStart(4, "0")}.js`), `export const value${index} = ${index};\n`, "utf8");
  }

  const graph = buildCodeGraph(project);
  const manifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));

  assert.equal(graph.files.length, 2003);
  assert.equal(manifest.coverage.indexable_files, 2003);
  assert.equal(manifest.coverage.indexed_files, 2003);
  assert.equal(manifest.coverage.deferred_files, 0);
  assert.equal(manifest.coverage.coverage_percent, 100);
  assert.equal(manifest.coverage.complete, true);
  assert.equal(manifest.deferred_files.length, 0);
});

test("structural index is the source for large-repo code graph coverage", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  for (let index = 0; index < 2003; index++) {
    writeFileSync(join(project, "src", `unit-${String(index).padStart(4, "0")}.js`), `export const value${index} = ${index};\n`, "utf8");
  }

  const graph = buildCodeGraph(project);
  const structural = buildStructuralIndex(project);

  assert.equal(graph.files.length, 2003);
  assert.equal(structural.files.length, 2003);
  assert.equal(structural.symbols.some((symbol) => symbol.name === "value2002"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "value2002"), true);
  if (availableParallelism() > 2) assert.equal(structural.manifest.worker_count > 1, true);
  assert.equal(existsSync(join(structuralIndexDir(project), "report.md")), true);
  assert.equal(existsSync(join(project, ".agent_memory", "indexes", "structural.json")), true);

  const result = queryCodeGraph(project, "value2002", 5, graph);
  assert.equal(result.symbols.some((symbol) => symbol.name === "value2002"), true);
  assert.match(result.context_block, /\[symbol\] constant value2002/);
});

test("structural index reuses cached file facts and updates changed files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "a.ts"), "export function alpha() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "b.ts"), "export function beta() { return 2; }\n", "utf8");

  buildStructuralIndex(project);
  const cached = buildStructuralIndex(project);
  assert.equal(cached.manifest.cache.hits, 2);
  assert.equal(cached.manifest.cache.misses, 0);
  const cachePath = join(project, ".agent_memory", "structural", "file-cache.json");
  assert.equal(Object.keys(JSON.parse(readFileSync(cachePath, "utf8")).entries).length, 2);
  assert.equal(existsSync(join(project, ".agent_memory", "structural", "file-cache")), false);

  writeFileSync(join(project, "src", "b.ts"), "export function betaChanged() { return 3; }\n", "utf8");
  const changed = buildStructuralIndex(project);
  assert.equal(changed.manifest.cache.hits, 1);
  assert.equal(changed.manifest.cache.misses, 1);
  assert.equal(changed.symbols.some((symbol) => symbol.name === "betaChanged"), true);
  assert.equal(Object.keys(JSON.parse(readFileSync(cachePath, "utf8")).entries).length, 2);
});

test("structural index honors .kageignore", () => {
  const project = tempProject();
  mkdirSync(join(project, "src", "ignored"), { recursive: true });
  writeFileSync(join(project, ".kageignore"), "src/ignored/\n", "utf8");
  writeFileSync(join(project, "src", "kept.ts"), "export function kept() { return true; }\n", "utf8");
  writeFileSync(join(project, "src", "ignored", "skipped.ts"), "export function skipped() { return false; }\n", "utf8");

  const structural = buildStructuralIndex(project);

  assert.equal(structural.files.some((file) => file.path === "src/kept.ts"), true);
  assert.equal(structural.files.some((file) => file.path === "src/ignored/skipped.ts"), false);
  assert.equal(structural.manifest.ignored_summary.kageignore, 1);
});

test("structural index skips broken symlinks instead of crashing", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "kept.ts"), "export function kept() { return true; }\n", "utf8");
  symlinkSync("missing-target.md", join(project, "README.md"));

  const structural = buildStructuralIndex(project);

  assert.equal(structural.files.some((file) => file.path === "src/kept.ts"), true);
  assert.equal(structural.files.some((file) => file.path === "README.md"), false);
  assert.equal(structural.manifest.ignored_summary.symlink, 1);
});

test("structural-backed code graph reuses per-file structural facts until source content changes", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  const cachePath = join(project, ".agent_memory", "structural", "file-cache.json");
  const packed = JSON.parse(readFileSync(cachePath, "utf8"));
  const cacheEntry = Object.entries(packed.entries).find(([, value]) => (value as { path?: string }).path === "src/worker.ts");
  assert.ok(cacheEntry);
  const cached = cacheEntry[1] as { schema_version: number; edges?: unknown; symbols: unknown[] };
  assert.equal(cached.schema_version, 2);
  assert.equal(cached.edges, undefined);
  cached.symbols.push(["symbol:src-worker-ts:function:cache-only:99", "cacheOnly", "function", "typescript-ast", true, 99, null, "cacheOnly()", "EXTRACTED"]);
  packed.entries[cacheEntry[0]] = cached;
  writeFileSync(cachePath, JSON.stringify(packed, null, 2), "utf8");
  unlinkSync(join(project, ".agent_memory", "code_graph", "graph.json"));

  const cachedGraph = buildCodeGraph(project);
  const cachedManifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(cachedGraph.symbols.some((symbol) => symbol.name === "cacheOnly"), true);
  assert.equal(cachedManifest.cache.hits, 1);
  assert.equal(cachedManifest.cache.misses, 0);

  writeFileSync(join(project, "src", "worker.ts"), "export function workChanged() { return 2; }\n", "utf8");
  const changedGraph = buildCodeGraph(project);
  const changedManifest = JSON.parse(readFileSync(join(project, ".agent_memory", "code_graph", "index-manifest.json"), "utf8"));
  assert.equal(changedGraph.symbols.some((symbol) => symbol.name === "cacheOnly"), false);
  assert.equal(changedGraph.symbols.some((symbol) => symbol.name === "workChanged"), true);
  assert.equal(changedManifest.cache.hits, 0);
  assert.equal(changedManifest.cache.misses, 1);
});

test("code graph returns cached graph when source stat fingerprint is unchanged", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  const first = buildCodeGraph(project);
  const graphPath = join(codeGraphDir(project), "graph.json");
  const graphJson = JSON.parse(readFileSync(graphPath, "utf8"));
  assert.equal(graphJson.compact, true);
  assert.equal(graphJson.artifact_format, 2);
  assert.equal(Array.isArray(graphJson.files), false);
  assert.equal(graphJson.refs.files, "../structural/files.json");
  assert.equal(existsSync(join(codeGraphDir(project), "files.json")), false);
  assert.equal(existsSync(join(codeGraphDir(project), "symbols.json")), false);
  graphJson.generated_at = "sentinel-code-graph";
  writeFileSync(graphPath, JSON.stringify(graphJson, null, 2), "utf8");

  const second = buildCodeGraph(project);
  const manifest = JSON.parse(readFileSync(join(codeGraphDir(project), "index-manifest.json"), "utf8"));

  assert.equal(second.generated_at, "sentinel-code-graph");
  assert.equal(second.files.length, first.files.length);
  assert.equal(manifest.cache.hits, 1);
  assert.equal(manifest.cache.misses, 0);
  assert.equal(typeof manifest.fingerprint, "string");
});

test("read-only code graph queries rebuild stale structural artifacts after source changes", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  writeFileSync(join(project, "src", "worker.ts"), "export function changedWork() { return 2; }\n", "utf8");

  const result = queryCodeGraph(project, "changedWork", 5);
  assert.equal(result.symbols.some((symbol) => symbol.name === "changedWork"), true);
  assert.equal(result.symbols.some((symbol) => symbol.name === "work"), false);
});

test("code graph natural language queries prefer exact symbol identifiers over generic words", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "feature.ts"), "export function feature1999() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "worker.ts"), "export function Worker0() { return 2; }\n", "utf8");

  const graph = buildCodeGraph(project);
  const result = queryCodeGraph(project, "how does feature1999 work", 5, graph);

  assert.equal(result.symbols[0]?.name, "feature1999");
});

test("code graph force option bypasses unchanged graph reuse", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "worker.ts"), "export function work() { return 1; }\n", "utf8");

  buildCodeGraph(project);
  const graphPath = join(codeGraphDir(project), "graph.json");
  const graphJson = JSON.parse(readFileSync(graphPath, "utf8"));
  graphJson.generated_at = "sentinel-code-graph";
  writeFileSync(graphPath, JSON.stringify(graphJson, null, 2), "utf8");

  const rebuilt = buildCodeGraph(project, { force: true });

  assert.notEqual(rebuilt.generated_at, "sentinel-code-graph");
  assert.equal(rebuilt.symbols.some((symbol) => symbol.name === "work"), true);
});

test("builds a multi-language code graph with generic static extractors", () => {
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  mkdirSync(join(project, "pkg"), { recursive: true });
  mkdirSync(join(project, "tests"), { recursive: true });
  writeFileSync(
    join(project, "app", "service.py"),
    `from fastapi import APIRouter
from pkg.store import TaskStore

router = APIRouter()

def normalize_task(value):
    return value

@router.get("/tasks/{task_id}")
def read_task(task_id):
    return normalize_task(task_id)

class TaskService:
    def list_tasks(self):
        return normalize_task(TaskStore().list())
`,
    "utf8"
  );
  writeFileSync(
    join(project, "pkg", "store.go"),
    `package pkg

import "context"

type TaskStore struct {}

func ListTasks(ctx context.Context) []string {
  return []string{}
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "tests", "test_service.py"),
    `from app.service import normalize_task

def test_normalize_task():
    return normalize_task([])
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.language, "python");
  assert.equal(graph.files.find((file) => file.path === "app/service.py")?.parser, "generic-static");
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "TaskService" && symbol.kind === "class"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "app/service.py" && symbol.name === "list_tasks" && symbol.kind === "function"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "tests/test_service.py" && symbol.name === "test_normalize_task" && symbol.kind === "test"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.path === "pkg/store.go" && symbol.name === "TaskStore" && symbol.kind === "class"), true);
  assert.equal(graph.imports.some((edge) => edge.from_path === "app/service.py" && edge.specifier === "pkg.store"), true);
  const normalizeCall = graph.calls.find((edge) => edge.path === "app/service.py" && edge.to_symbol.includes(":normalize-task:"));
  assert.equal(Boolean(normalizeCall), true);
  assert.equal(normalizeCall?.confidence, 0.7);
  assert.equal(normalizeCall?.resolution, "generic_static_name");
  assert.equal(graph.routes.some((route) => route.file_path === "app/service.py" && route.framework === "fastapi" && route.method === "GET" && route.path === "/tasks/:task_id" && route.handler_symbol?.includes(":read-task:")), true);
  assert.equal(graph.tests.some((edge) => edge.test_path === "tests/test_service.py" && edge.covers_path === "app/service.py"), true);
});

test("code graph extracts Python framework routes", () => {
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  writeFileSync(
    join(project, "app", "web.py"),
    `from flask import Flask

app = Flask(__name__)

@app.route("/checkout/<session_id>", methods=["POST"])
def create_checkout(session_id):
    return session_id
`,
    "utf8"
  );
  writeFileSync(
    join(project, "app", "urls.py"),
    `from django.urls import path
from . import views

urlpatterns = [
    path("orders/<int:order_id>/", views.order_detail),
]
`,
    "utf8"
  );
  writeFileSync(join(project, "app", "views.py"), "def order_detail(request, order_id):\n    return order_id\n", "utf8");

  const graph = buildCodeGraph(project);
  assert.equal(graph.routes.some((route) => route.file_path === "app/web.py" && route.framework === "flask" && route.method === "POST" && route.path === "/checkout/:session_id" && route.handler_symbol?.includes(":create-checkout:")), true);
  assert.equal(graph.routes.some((route) => route.file_path === "app/urls.py" && route.framework === "django" && route.method === "ANY" && route.path === "/orders/:order_id"), true);
});

test("code graph extracts mixed-language framework routes", () => {
  const project = tempProject();
  mkdirSync(join(project, "config"), { recursive: true });
  mkdirSync(join(project, "routes"), { recursive: true });
  mkdirSync(join(project, "src", "main", "java", "app"), { recursive: true });
  mkdirSync(join(project, "cmd"), { recursive: true });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "Controllers"), { recursive: true });

  writeFileSync(
    join(project, "config", "routes.rb"),
    `Rails.application.routes.draw do
  get "/checkout/:id", to: "checkout#show"
end
`,
    "utf8"
  );
  writeFileSync(
    join(project, "routes", "web.php"),
    `<?php
use Illuminate\\Support\\Facades\\Route;

Route::post('/orders/{order}', [OrderController::class, 'store']);
`,
    "utf8"
  );
  writeFileSync(
    join(project, "src", "main", "java", "app", "OrderController.java"),
    `class OrderController {
  @GetMapping("/orders/{id}")
  public String showOrder() { return ""; }
}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "cmd", "server.go"),
    `package main

func main() {
  r.GET("/health/:id", health)
}

func health() {}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "src", "main.rs"),
    `fn app() {
  Router::new().route("/users/:id", get(show_user));
}

#[post("/jobs/{id}")]
async fn create_job() {}
`,
    "utf8"
  );
  writeFileSync(
    join(project, "Controllers", "CheckoutController.cs"),
    `class CheckoutController {
  void Configure() {
    app.MapPost("/checkout/{id}", HandleCheckout);
  }

  [HttpGet("/users/{id}")]
  public string GetUser() { return ""; }
}
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.routes.some((route) => route.file_path === "config/routes.rb" && route.framework === "rails" && route.method === "GET" && route.path === "/checkout/:id"), true);
  assert.equal(graph.routes.some((route) => route.file_path === "routes/web.php" && route.framework === "laravel" && route.method === "POST" && route.path === "/orders/:order"), true);
  assert.equal(graph.routes.some((route) => route.file_path.endsWith("OrderController.java") && route.framework === "spring" && route.method === "GET" && route.path === "/orders/:id" && route.handler_symbol?.includes(":showorder:")), true);
  assert.equal(graph.routes.some((route) => route.file_path === "cmd/server.go" && route.framework === "go-router" && route.method === "GET" && route.path === "/health/:id"), true);
  assert.equal(graph.routes.some((route) => route.file_path === "src/main.rs" && route.framework === "rust-router" && route.method === "GET" && route.path === "/users/:id"), true);
  assert.equal(graph.routes.some((route) => route.file_path === "src/main.rs" && route.framework === "rust-router" && route.method === "POST" && route.path === "/jobs/:id"), true);
  assert.equal(graph.routes.some((route) => route.file_path === "Controllers/CheckoutController.cs" && route.framework === "aspnet" && route.method === "POST" && route.path === "/checkout/:id"), true);
  assert.equal(graph.routes.some((route) => route.file_path === "Controllers/CheckoutController.cs" && route.framework === "aspnet" && route.method === "GET" && route.path === "/users/:id" && route.handler_symbol?.includes(":getuser:")), true);
});

test("code graph consumes Tree-sitter, SCIP, and LSP index artifacts when present", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, ".agent_memory", "code_index"), { recursive: true });
  writeFileSync(join(project, "src", "worker.py"), "def fallback_name():\n    return True\n", "utf8");
  writeFileSync(
    join(project, ".agent_memory", "code_index", "tree-sitter.json"),
    JSON.stringify({
      symbols: [{ path: "src/worker.py", name: "treeSitterSymbol", kind: "function", line: 1, signature: "def treeSitterSymbol()" }],
    }),
    "utf8"
  );
  writeFileSync(
    join(project, ".agent_memory", "code_index", "scip.json"),
    JSON.stringify({
      imports: [{ from_path: "src/worker.py", specifier: "src.worker", to_path: "src/worker.py", kind: "import", line: 1 }],
    }),
    "utf8"
  );
  writeFileSync(
    join(project, ".agent_memory", "code_index", "lsp-symbols.json"),
    JSON.stringify({
      documents: [
        {
          path: "src/worker.py",
          symbols: [{ name: "LspWorker", kind: "class", range: { start: { line: 0 } }, detail: "class LspWorker" }],
        },
      ],
    }),
    "utf8"
  );

  const graph = buildCodeGraph(project);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "treeSitterSymbol" && symbol.parser === "tree-sitter"), true);
  assert.equal(graph.symbols.some((symbol) => symbol.name === "LspWorker" && symbol.parser === "lsp"), true);
  assert.equal(graph.imports.some((edge) => edge.parser === "scip" && edge.specifier === "src.worker"), true);
  assert.equal(graph.files.find((file) => file.path === "src/worker.py")?.parser, "scip");
});

test("generated LSP symbol index upgrades code graph parser coverage", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  const before = buildCodeGraph(project);
  assert.equal(before.files.find((file) => file.path === "src/server.ts")?.parser, "typescript-ast");

  const result = writeLspSymbolIndex(project);
  assert.equal(result.ok, true);
  assert.equal(result.documents, 1);
  assert.equal(result.symbols >= 1, true);

  const graph = buildCodeGraph(project);
  assert.equal(graph.files.find((file) => file.path === "src/server.ts")?.parser, "lsp");
  assert.equal(graph.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "lsp"), true);

  const cached = buildCodeGraph(project);
  assert.equal(cached.files.find((file) => file.path === "src/server.ts")?.parser, "lsp");
  assert.equal(cached.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "lsp"), true);
});

test("code index prefers scip-typescript when available", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "bin"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  writeFileSync(
    join(project, "bin", "scip-typescript"),
    `#!/usr/bin/env node
const fs = require("fs");
fs.writeFileSync("index.scip", "fake scip");
`,
    "utf8"
  );
  writeFileSync(
    join(project, "bin", "scip"),
    `#!/usr/bin/env node
console.log(JSON.stringify({
  documents: [{
    relativePath: "src/server.ts",
    occurrences: [{
      symbol: "scip-typescript npm demo 1.0.0 src/server.ts/createApp().",
      symbolRoles: 1,
      range: [0, 16, 25]
    }]
  }]
}));
`,
    "utf8"
  );
  chmodSync(join(project, "bin", "scip-typescript"), 0o755);
  chmodSync(join(project, "bin", "scip"), 0o755);

  const previousPath = process.env.PATH;
  process.env.PATH = `${join(project, "bin")}${delimiter}${previousPath ?? ""}`;
  try {
    const result = writeCodeIndex(project);
    assert.equal(result.ok, true);
    assert.equal(result.parser, "scip");
    assert.match(result.path, /code_index\/scip\.json$/);

    const graph = buildCodeGraph(project);
    assert.equal(graph.files.find((file) => file.path === "src/server.ts")?.parser, "scip");
    assert.equal(graph.symbols.some((symbol) => symbol.path === "src/server.ts" && symbol.name === "createApp" && symbol.parser === "scip"), true);
  } finally {
    process.env.PATH = previousPath;
  }
});

test("audit precision coverage ignores metadata-only files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");
  writeLspSymbolIndex(project);

  const audit = auditProject(project);
  assert.equal(audit.checks.code_graph.files, 2);
  assert.equal(audit.checks.code_graph.precise_files, 1);
  assert.equal(audit.checks.code_graph.precise_coverage_percent, 100);
  assert.equal(audit.recommendations.some((item) => item.includes("SCIP/LSIF/LSP")), false);
});

test("code graph query returns routes, symbols, and tests", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { if (req.method === 'GET' && url.pathname === '/summary') return {}; }\n", "utf8");
  writeFileSync(join(project, "test", "server.test.js"), "import test from 'node:test';\nimport { createApp } from '../src/server.js';\ntest('summary route', () => createApp());\n", "utf8");

  const result = queryCodeGraph(project, "summary createApp test");
  assert.match(result.context_block, /Kage Code Graph Context/);
  assert.equal(result.routes.some((route) => route.path === "/summary"), true);
  assert.equal(result.symbols.some((symbol) => symbol.name === "createApp"), true);
  assert.equal(result.tests.some((edge) => edge.title === "summary route"), true);
});

test("call resolution follows imports and rejects external/name-only ghosts", () => {
  const project = tempProject();
  mkdirSync(join(project, "lib"), { recursive: true });
  mkdirSync(join(project, "examples", "mvc"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  // Real target imported and called.
  writeFileSync(join(project, "lib", "router.ts"), "export function handle(req: unknown) { return req; }\n", "utf8");
  // Same-name decoy in an unrelated package — must NOT become a call target.
  writeFileSync(join(project, "examples", "mvc", "controller.ts"), "export function handle(x: unknown) { return x; }\n", "utf8");
  writeFileSync(
    join(project, "lib", "app.ts"),
    "import { handle } from './router.js';\nexport function dispatch(req: unknown) { return handle(req); }\n",
    "utf8",
  );
  // External import: calling a same-name repo symbol must yield NO edge.
  writeFileSync(
    join(project, "lib", "external.ts"),
    "import { handle } from 'some-external-pkg';\nexport function run() { return handle(1); }\n",
    "utf8",
  );

  const graph = buildCodeGraph(project);
  const symbolPath = (id: string) => graph.symbols.find((s) => s.id === id)?.path ?? id;
  const dispatchCalls = graph.calls.filter((c) => c.path === "lib/app.ts" && symbolPath(c.to_symbol).includes("handle") === false ? false : c.path === "lib/app.ts");
  const targets = graph.calls.filter((c) => c.path === "lib/app.ts").map((c) => symbolPath(c.to_symbol));
  assert.equal(targets.includes("lib/router.ts"), true, "import-resolved edge missing");
  assert.equal(targets.includes("examples/mvc/controller.ts"), false, "cross-package ghost edge present");
  const externalEdges = graph.calls.filter((c) => c.path === "lib/external.ts");
  assert.equal(externalEdges.length, 0, "external import produced a repo edge");
  void dispatchCalls;
});

test("caller-intent queries answer from the call-edge index", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  writeFileSync(join(project, "src", "delay.ts"), "export function calculateRetryDelay(n: number) { return n * 2; }\n", "utf8");
  writeFileSync(
    join(project, "src", "client.ts"),
    "import { calculateRetryDelay } from './delay.js';\nexport function retryRequest() { return calculateRetryDelay(3); }\n",
    "utf8",
  );

  const result = queryCodeGraph(project, "which functions call calculateRetryDelay");
  assert.match(result.context_block, /## Callers/);
  assert.match(result.context_block, /defined in src\/delay\.ts/);
  assert.match(result.context_block, /src\/client\.ts:2/);
});

test("symbol extraction captures method-assignment patterns (app.use = function)", () => {
  const project = tempProject();
  mkdirSync(join(project, "lib"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  writeFileSync(
    join(project, "lib", "application.js"),
    [
      "var app = exports = module.exports = {};",
      "app.use = function use(fn) { return this; };",
      "app.handle = (req, res) => { res.end(); };",
      "Router.prototype.route = function route(path) { return path; };",
    ].join("\n") + "\n",
    "utf8",
  );

  const result = queryCodeGraph(project, "use handle route application");
  assert.equal(result.symbols.some((s) => s.name === "use" && s.kind === "method"), true);
  assert.equal(result.symbols.some((s) => s.name === "handle" && s.kind === "method"), true);
  assert.equal(result.symbols.some((s) => s.name === "route" && s.kind === "method" && s.export === true), true);
});

test("metrics summarize code graph, memory graph, and harness readiness", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.js"), "export function createApp() { return {}; }\n", "utf8");
  installAgentPolicy(project); // policy is explicit now; indexing never writes it
  indexProject(project);

  const metrics = kageMetrics(project);
  assert.equal(metrics.code_graph.files >= 2, true);
  assert.equal(metrics.code_graph.languages.javascript, 1);
  assert.equal(metrics.code_graph.parsers["typescript-ast"], 1);
  assert.equal(metrics.code_graph.indexer_coverage_percent, 100);
  assert.equal(metrics.memory_graph.evidence_coverage_percent, 100);
  assert.equal(metrics.memory_graph.average_quality_score > 0, true);
  assert.equal(metrics.savings.estimated_tokens_saved_per_recall >= 0, true);
  assert.equal(metrics.harness.policy_installed, true);
  assert.equal(metrics.harness.readiness_score > 0, true);
  assert.equal(typeof metrics.quality?.useful_memory_ratio_percent, "number");
  assert.equal(typeof metrics.pain?.estimated_tokens_saved, "number");
});

test("setup generates all-agent MCP configuration and writes Codex config idempotently", () => {
  const project = tempProject();
  const home = mkdtempSync(join(tmpdir(), "kage-home-"));
  for (const agent of SETUP_AGENTS) {
    const result = setupAgent(agent, project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home });
    assert.equal(result.agent, agent);
    assert.equal(result.config.length > 0, true);
    assert.equal(result.instructions.length > 0, true);
  }

  const first = setupAgent("codex", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(first.wrote, true);
  const second = setupAgent("codex", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(second.wrote, true);
  const config = readFileSync(join(home, ".codex", "config.toml"), "utf8");
  assert.equal((config.match(/\[mcp_servers\.kage\]/g) ?? []).length, 1);

  const claude = setupAgent("claude-code", project, { serverPath: "/tmp/kage/dist/index.js", homeDir: home, write: true });
  assert.equal(claude.wrote, true);
  const claudeConfig = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
  assert.equal(claudeConfig.mcpServers.kage.command, "node");
  assert.equal(claudeConfig.mcpServers.kage.args[0], "/tmp/kage/dist/index.js");
  assert.equal(claudeConfig.mcpServers.kage.alwaysLoad, true);
  const claudeSettings = JSON.parse(readFileSync(join(home, ".claude", "settings.json"), "utf8"));
  assert.equal(Array.isArray(claudeSettings.hooks.SessionStart), true);
  assert.equal(Array.isArray(claudeSettings.hooks.UserPromptSubmit), true);
  assert.equal(Array.isArray(claudeSettings.hooks.PostToolUse), true);
  assert.equal(Array.isArray(claudeSettings.hooks.PostToolUseFailure), true);
  assert.equal(Array.isArray(claudeSettings.hooks.PreCompact), true);
  assert.equal(Array.isArray(claudeSettings.hooks.Stop), true);
  assert.equal(Array.isArray(claudeSettings.hooks.SessionEnd), true);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "session-start.sh"), "utf8"), /KAGE_MEMORY_POLICY_V1/);
  const observeHook = readFileSync(join(home, ".claude", "kage", "hooks", "observe.sh"), "utf8");
  assert.match(observeHook, /kage observe/);
  assert.match(observeHook, /additionalContext/);
  assert.match(observeHook, /kage distill/);
  execFileSync("bash", ["-n", join(home, ".claude", "kage", "hooks", "session-start.sh")]);
  const observeHookPath = join(home, ".claude", "kage", "hooks", "observe.sh");
  execFileSync("bash", ["-n", observeHookPath]);
  execFileSync("bash", ["-n", join(home, ".claude", "kage", "hooks", "stop.sh")]);
  const fakeBin = join(home, "bin");
  mkdirSync(fakeBin, { recursive: true });
  const fakeLog = join(home, "kage.log");
  const fakeKage = join(fakeBin, "kage");
  writeFileSync(fakeKage, `#!/usr/bin/env bash
echo "$@" >> "$KAGE_FAKE_LOG"
case "$*" in
  recall*) printf '%s' '{"results":[{"packet":{"title":"Auth runbook"}}],"context_block":"# Kage Context\\nRemember auth tests."}' ;;
  *) exit 0 ;;
esac
`, "utf8");
  chmodSync(fakeKage, 0o755);
  const hookEnv = { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`, KAGE_FAKE_LOG: fakeLog };
  const promptOutput = execFileSync("bash", [observeHookPath], {
    input: JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: project, session_id: "session-a", prompt: "auth tests" }),
    env: hookEnv,
  }).toString();
  assert.match(promptOutput, /additionalContext/);
  execFileSync("bash", [observeHookPath], {
    input: JSON.stringify({ hook_event_name: "PreCompact", cwd: project, session_id: "session-a" }),
    env: hookEnv,
  });
  const fakeCalls = readFileSync(fakeLog, "utf8");
  assert.match(fakeCalls, /observe/);
  assert.match(fakeCalls, /recall/);
  assert.match(fakeCalls, /distill/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /kage refresh/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /kage pr summarize/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /kage reconcile/);
  assert.match(readFileSync(join(home, ".claude", "kage", "hooks", "stop.sh"), "utf8"), /exit 2/);

  const doctor = setupDoctor(project, { homeDir: home });
  assert.equal(doctor.length, SETUP_AGENTS.length);
  const claudeDoctor = doctor.find((item) => item.agent === "claude-code");
  assert.equal(claudeDoctor?.configured, true);
  assert.equal(claudeDoctor?.hook_summary?.ready, true);

  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const cliVerify = verifyAgentActivation("codex", project, { homeDir: home });
  assert.equal(cliVerify.status, "restart_required");
  assert.equal(cliVerify.checks.config_mentions_kage, true);
  assert.equal(cliVerify.checks.policy_installed, true);
  assert.equal(cliVerify.checks.recall_works, true);
  const claudeVerify = verifyAgentActivation("claude-code", project, { homeDir: home });
  assert.equal(claudeVerify.checks.ambient_hooks_present, true);
  assert.equal(claudeVerify.hook_summary?.missing.length, 0);

  const brokenClaudeHome = mkdtempSync(join(tmpdir(), "kage-broken-claude-home-"));
  mkdirSync(brokenClaudeHome, { recursive: true });
  writeFileSync(join(brokenClaudeHome, ".claude.json"), JSON.stringify({ mcpServers: { kage: { type: "stdio", command: "node", args: ["/tmp/kage/dist/index.js"] } } }), "utf8");
  const brokenClaudeVerify = verifyAgentActivation("claude-code", project, { homeDir: brokenClaudeHome });
  assert.equal(brokenClaudeVerify.status, "needs_setup");
  assert.equal(brokenClaudeVerify.checks.ambient_hooks_present, false);
  assert.equal(brokenClaudeVerify.hook_summary?.missing.includes("UserPromptSubmit"), true);
  const brokenDoctor = setupDoctor(project, { homeDir: brokenClaudeHome });
  const brokenClaudeDoctor = brokenDoctor.find((item) => item.agent === "claude-code");
  assert.equal(brokenClaudeDoctor?.configured, false);
  assert.equal(brokenClaudeDoctor?.hook_summary?.missing.includes("observe.sh"), true);
  assert.equal(cliVerify.checks.code_graph_works, true);
  assert.equal(cliVerify.checks.mcp_tool_reachable, false);
  assert.equal(cliVerify.next_steps.some((step) => step.includes("kage_verify_agent")), true);

  const mcpVerify = verifyAgentActivation("codex", project, { homeDir: home, mcpToolReachable: true });
  assert.equal(mcpVerify.status, "ready");
});

test("git hook manager installs status and uninstall while preserving existing hooks", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const hookPath = join(project, ".git", "hooks", "post-commit");
  writeFileSync(hookPath, "#!/bin/sh\nprintf existing-hook\\n\n", "utf8");
  chmodSync(hookPath, 0o755);

  const install = kageHookInstall(project);
  assert.equal(install.ok, true);
  assert.equal(install.installed, true);
  assert.equal(install.changed, true);
  assert.equal(install.hook_path, hookPath);
  const installed = readFileSync(hookPath, "utf8");
  assert.match(installed, /printf existing-hook/);
  assert.match(installed, /KAGE_POST_COMMIT_HOOK_V1/);
  assert.match(installed, /KAGE_SKIP_HOOK/);
  assert.match(installed, /"\$KAGE_BIN" refresh/);
  assert.match(installed, /pr summarize/);
  assert.equal(installed.includes(project), true);

  const reinstall = kageHookInstall(project);
  assert.equal(reinstall.ok, true);
  assert.equal(reinstall.changed, false);

  const status = kageHookStatus(project);
  assert.equal(status.ok, true);
  assert.equal(status.installed, true);

  const uninstall = kageHookUninstall(project);
  assert.equal(uninstall.ok, true);
  assert.equal(uninstall.changed, true);
  const removed = readFileSync(hookPath, "utf8");
  assert.match(removed, /printf existing-hook/);
  assert.doesNotMatch(removed, /KAGE_POST_COMMIT_HOOK_V1/);
  assert.equal(kageHookStatus(project).installed, false);
});

test("observations are privacy-scanned, deduplicated, and generic commands stay telemetry", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const event = {
    type: "command_result" as const,
    session_id: "s1",
    agent: "codex",
    command: "npm test",
    exit_code: 0,
    summary: "Tests passed after updating harness setup.",
    timestamp: "2026-05-02T10:00:00.000Z",
  };
  const stored = observe(project, event);
  assert.equal(stored.ok, true);
  assert.equal(stored.stored, true);
  const duplicate = observe(project, event);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);

  const blocked = observe(project, {
    type: "tool_result",
    session_id: "s1",
    text: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors.join("\n"), /Sensitive content blocked/);

  const distilled = distillSession(project, "s1");
  assert.equal(distilled.ok, true);
  assert.equal(distilled.observations, 1);
  assert.equal(distilled.candidates.length, 0);
});

test("distillation creates command memory only for reusable command learnings", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "cmd-meaningful",
    command: "npm test -- webhooks",
    exit_code: 0,
    summary: "Use this command after changing webhook signature verification.",
  }).ok, true);

  const distilled = distillSession(project, "cmd-meaningful");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "runbook");
  assert.match(packet?.title ?? "", /webhook signature verification/);
  assert.doesNotMatch(packet?.title ?? "", /Session .* command runbook/);
  assert.equal(packet?.source_refs[0]?.kind, "observation_session");
  assert.deepEqual(packet?.source_refs[0]?.session_id, "cmd-meaningful");
  assert.equal((packet?.quality.admission as { admit?: boolean } | undefined)?.admit, true);
});

test("distillation does not create useless touched-file memory", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "", "utf8");
  assert.equal(observe(project, {
    type: "file_change",
    session_id: "s-file",
    path: "src/server.ts",
    summary: "Edited file",
  }).ok, true);
  let distilled = distillSession(project, "s-file");
  assert.equal(distilled.ok, true);
  assert.equal(distilled.candidates.length, 0);

  assert.equal(observe(project, {
    type: "file_change",
    session_id: "s-meaningful",
    path: "src/server.ts",
    summary: "Server dispatcher maps GET /tasks and GET /summary through createApp.",
  }).ok, true);
  distilled = distillSession(project, "s-meaningful");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "workflow");
  assert.match(packet?.title ?? "", /Server dispatcher maps/);
  assert.doesNotMatch(packet?.title ?? "", /touched 1 repo paths/);
  assert.deepEqual(packet?.paths, ["src/server.ts"]);
});

test("distillation keeps ordinary prompts episodic and admits durable prompt learnings", () => {
  const project = tempProject();
  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-generic",
    text: "Build a todo app and show me the graph.",
  }).ok, true);
  let distilled = distillSession(project, "prompt-generic");
  assert.equal(distilled.candidates.length, 0);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-durable",
    text: "Decision: prefer kage_learn for durable session discoveries; avoid saving raw task prompts as memory.",
  }).ok, true);
  distilled = distillSession(project, "prompt-durable");
  const packet = distilled.candidates[0]?.packet;
  assert.equal(packet?.type, "decision");
  assert.match(packet?.title ?? "", /Decision/);
  assert.doesNotMatch(packet?.title ?? "", /user intent/);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-explanation",
    text: "Code explanation: createApp owns HTTP app wiring. Why: callers need one setup point for middleware and routes.",
  }).ok, true);
  distilled = distillSession(project, "prompt-explanation");
  const explanation = distilled.candidates[0]?.packet;
  assert.equal(explanation?.type, "code_explanation");
  assert.match(explanation?.context?.why ?? "", /callers need one setup point/);

  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "prompt-issue",
    text: "Issue context: Upload retries still fail after token refresh. Hypothesis: the refresh path does not update queued request metadata.",
  }).ok, true);
  distilled = distillSession(project, "prompt-issue");
  const issue = distilled.candidates[0]?.packet;
  assert.equal(issue?.type, "issue_context");
  assert.match(issue?.body ?? "", /Hypothesis/);
});

test("session capture report shows distillable observations without raw replay", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  assert.equal(observe(project, {
    type: "session_start",
    session_id: "session-report",
    agent: "codex",
    timestamp: "2026-05-17T10:00:00.000Z",
  }).ok, true);
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "session-report",
    agent: "codex",
    command: "npm test -- webhooks",
    exit_code: 0,
    summary: "Use this command after changing webhook signature verification.",
    timestamp: "2026-05-17T10:01:00.000Z",
  }).ok, true);

  const report = kageSessionCaptureReport(project);
  assert.equal(report.totals.sessions, 1);
  assert.equal(report.totals.observations, 2);
  assert.equal(report.totals.sessions_with_candidates, 1);
  assert.equal(report.sessions[0]?.session_id, "session-report");
  assert.equal(report.sessions[0]?.durable_observations, 1);
  assert.deepEqual(report.sessions[0]?.candidate_types, ["runbook"]);
  assert.match(report.sessions[0]?.next_action ?? "", /kage distill/);
  assert.match(report.privacy_model, /raw transcript replay is not the product surface/);
});

test("session replay digest shows a privacy-preserving timeline without raw transcript text", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");

  assert.equal(observe(project, {
    type: "session_start",
    session_id: "replay-session",
    agent: "codex",
    summary: "Started retry cleanup investigation.",
    timestamp: "2026-05-18T00:00:00.000Z",
  }).ok, true);
  assert.equal(observe(project, {
    type: "user_prompt",
    session_id: "replay-session",
    agent: "codex",
    text: "Private prompt body. Internal raw prompt omitted from replay.",
    summary: "Asked agent to inspect retry flow.",
    timestamp: "2026-05-18T00:00:01.000Z",
  }).ok, true);
  assert.equal(observe(project, {
    type: "file_change",
    session_id: "replay-session",
    agent: "codex",
    path: "src/retry.ts",
    summary: "src/retry.ts must keep callback retries separate because idempotency keys differ.",
    timestamp: "2026-05-18T00:00:03.000Z",
  }).ok, true);
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "replay-session",
    agent: "codex",
    command: "npm test -- retry",
    exit_code: 0,
    summary: "Run after changing retry code because it covers callback and checkout paths.",
    timestamp: "2026-05-18T00:00:05.000Z",
  }).ok, true);

  const replay = kageSessionReplay(project, { sessionId: "replay-session", limit: 10 });

  assert.equal(replay.totals.sessions, 1);
  assert.equal(replay.totals.events, 4);
  assert.equal(replay.sessions[0]?.session_id, "replay-session");
  assert.equal(replay.sessions[0]?.durable_candidates, 2);
  assert.deepEqual(replay.sessions[0]?.commands, ["npm test -- retry"]);
  assert.deepEqual(replay.sessions[0]?.paths, ["src/retry.ts"]);
  assert.match(replay.sessions[0]?.distill_command ?? "", /kage distill --project \. --session replay-session/);
  assert.equal(replay.events.length, 4);
  assert.equal(replay.events[1]?.raw_text_included, false);
  assert.equal(replay.events[1]?.summary.includes("Internal raw prompt"), false);
  assert.equal(replay.events[2]?.durable_candidate, true);
  assert.equal(replay.events[2]?.candidate_type, "workflow");
  assert.equal(replay.events[3]?.candidate_type, "runbook");
  assert.match(replay.privacy_model, /raw transcript text is not included/i);
});

test("memory admission rejects session bookkeeping and accepts durable repo knowledge", () => {
  const project = tempProject();
  const bad = capture({
    projectDir: project,
    title: "Session abc command runbook",
    summary: "Observed commands: npm test",
    body: "Observed during session abc:\n- npm test (exit 0)",
    type: "runbook",
  });
  assert.equal(bad.ok, true);
  assert.equal(evaluateMemoryAdmission(project, bad.packet!).admit, false);

  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "", "utf8");
  const good = capture({
    projectDir: project,
    title: "Webhook replay tests verify signatures",
    summary: "Use npm test -- webhooks after changing webhook signature verification.",
    body: "Use npm test -- webhooks after changing webhook signature verification because the normal suite does not replay signed payload fixtures. Verified by: npm test -- webhooks.",
    type: "runbook",
    paths: ["src/server.ts"],
    tags: ["webhook", "tests"],
  });
  assert.equal(good.ok, true);
  assert.equal(evaluateMemoryAdmission(project, good.packet!).admit, true);
});

test("recall explanations, quality, and benchmark expose proof metrics", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);

  const result = recall(project, "how do I run tests", 5, true);
  assert.equal(result.explanations?.length! > 0, true);
  assert.equal(typeof result.results[0]?.score_breakdown?.final, "number");

  const quality = qualityReport(project);
  assert.equal(typeof quality.useful_memory_ratio_percent, "number");
  assert.equal(typeof quality.evidence_coverage_percent, "number");

  const benchmark = benchmarkProject(project);
  assert.equal(typeof benchmark.overall_score, "number");
  assert.equal(Array.isArray(benchmark.gates), true);
  assert.equal(benchmark.gates.some((gate) => gate.name === "recall_hit_rate"), true);
  assert.equal(typeof benchmark.pain_metrics.recall_hit_rate_percent, "number");
  assert.equal(typeof benchmark.pain_metrics.estimated_tokens_saved, "number");

  const comparison = benchmarkTaskComparison(project, "how do I run tests");
  assert.equal(comparison.task, "how do I run tests");
  assert.equal(comparison.baseline_without_kage.files_examined > 0, true);
  assert.equal(comparison.with_kage.context_tokens > 0, true);
  assert.equal(typeof comparison.delta.context_reduction_percent, "number");
  assert.equal(comparison.evidence.kage_memory.length > 0, true);
});

test("coding memory quality benchmark is package-callable", () => {
  const report = benchmarkCodingMemoryQuality({ packetsPerTopic: 2, distractorsPerTopic: 1, topK: 5 });

  assert.equal(report.benchmark, "Kage coding memory quality");
  assert.equal(report.summary.retrieval_mode, "kage-recall-default");
  assert.equal(report.dataset.queries, 20);
  assert.equal(report.dataset.observations, 60);
  assert.equal(report.summary.recall_at_5_percent, 100);
  assert.equal(report.summary.ndcg_at_10, 1);
  assert.equal(report.summary.context_reduction_percent > 0, true);
  assert.equal(report.summary.source_diversity_pass, true);
  assert.equal(report.source_diversity.pass, true);
  assert.equal(report.source_diversity.independent_source_rank, 4);
  assert.equal(report.source_diversity.max_results_from_one_source, 3);
  assert.equal(report.workdir, null);
});

test("memory scale benchmark is package-callable", () => {
  const report = benchmarkMemoryScale({ sizes: [24, 60], topK: 5 });

  assert.equal(report.benchmark, "Kage synthetic memory scale");
  assert.deepEqual(report.sizes, [24, 60]);
  assert.equal(report.results.length, 2);
  assert.equal(report.summary.largest_packets, 60);
  assert.equal(report.summary.largest_hit_rate_percent, 100);
  assert.equal(report.summary.largest_context_reduction_percent > 0, true);
  assert.equal(report.workdir, null);
});

test("capture extracts structured engineering memory context", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");

  const result = capture({
    projectDir: project,
    title: "Decision: keep code facts separate from memory facts",
    body: "Decision: keep source-derived code facts separate from learned memory facts.\n\nWhy: parser facts should stay rebuildable and should not be overwritten by stale human notes.\n\nVerified by: npm test\n\nRisk if forgotten: future agents may collapse code graph and memory graph into one untrusted store.\n\nStale when: memory packets can directly overwrite generated code facts.",
    type: "decision",
    paths: ["src/server.ts"],
  });

  assert.equal(result.ok, true);
  assert.equal(result.packet?.context?.why?.includes("parser facts"), true);
  assert.equal(result.packet?.context?.risk_if_forgotten?.includes("collapse code graph"), true);
  assert.equal(result.packet?.context?.verification, "npm test");
  assert.equal(result.packet?.context?.stale_when?.includes("overwrite generated code facts"), true);
});

test("knowledge graph links structured memory to source symbols and verification commands", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export const graph = {};\nexport function createApp() { return {}; }\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Code explanation: createApp owns HTTP app wiring",
    body: "The createApp function owns HTTP app wiring. Why: callers need one setup point for middleware and routes. Verified by: node mcp/dist/cli.js audit --project . --json. Risk if forgotten: callers may bypass shared app setup.",
    type: "code_explanation",
    paths: ["src/server.ts"],
  });
  assert.equal(result.ok, true);
  assert.match(result.packet?.context?.verification ?? "", /cli\.js audit --project \. --json/);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.entities.some((entity) => entity.type === "symbol" && entity.name === "createApp"), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "explains_symbol" && edge.fact.includes("createApp")), true);
  assert.equal(graph.edges.some((edge) => edge.relation === "explains_symbol" && edge.fact.includes("graph in src/server.ts")), false);
  assert.equal(graph.edges.some((edge) => edge.relation === "verified_by" && edge.fact.includes("cli.js audit --project . --json")), true);
});

test("auditProject reports trust and concrete memory/code graph recommendations", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = capture({
    projectDir: project,
    title: "Architecture note",
    body: "The architecture note explains a design choice but has no structured why or risk fields.",
    type: "reference",
  });
  assert.equal(result.ok, true);

  const audit = auditProject(project);
  assert.equal(audit.ok, true);
  assert.equal(typeof audit.trust_score, "number");
  assert.equal(audit.trust_score < 100, true);
  assert.equal(audit.checks.structured_memory.total_packets >= 1, true);
  assert.equal(audit.checks.memory_inbox.pending_packets, 0);
  assert.equal(audit.checks.code_graph.precise_files >= 0, true);
  assert.equal(audit.recommendations.some((item) => item.includes("structured context") || item.includes("SCIP")), true);
});

test("memoryInbox consolidates pending stale and structured-context work", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "server.ts"), "export function start() { return true; }\n", "utf8");

  const missingContext = capture({
    projectDir: project,
    title: "Architecture note",
    body: "This packet has a useful note but no rationale, verification, or stale condition.",
    type: "reference",
    paths: ["src/server.ts"],
  });
  assert.equal(missingContext.ok, true);

  const stale = capture({
    projectDir: project,
    title: "Decision: removed file owned startup",
    body: "Why: the removed file used to own startup wiring.\n\nVerified by: historical review",
    type: "decision",
    paths: ["src/removed.ts"],
  });
  assert.equal(stale.ok, true);

  const pending = capture({
    projectDir: project,
    title: "Decision: review before promotion",
    body: "Why: org/global memory needs human review.\n\nVerified by: policy review",
    type: "decision",
    paths: ["src/server.ts"],
  });
  assert.equal(pending.ok, true);
  mkdirSync(pendingDir(project), { recursive: true });
  writeFileSync(join(pendingDir(project), "pending-review.json"), JSON.stringify({ ...pending.packet, status: "pending" }, null, 2), "utf8");

  const inbox = memoryInbox(project);
  assert.equal(inbox.ok, false);
  assert.equal(inbox.counts.pending, 1);
  assert.equal(inbox.items.some((item) => item.kind === "pending" && item.packet_id === pending.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "stale" && item.packet_id === stale.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "missing_context" && item.packet_id === missingContext.packet?.id), true);
  assert.equal(inbox.items.some((item) => item.kind === "validation_warning"), true);
  assert.equal(inbox.recommendations.length > 0, true);
});

test("graph query returns relevant typed facts", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const result = queryGraph(project, "run tests");
  assert.match(result.context_block, /Kage Graph Context/);
  assert.equal(result.edges.some((edge) => edge.fact.includes("npm run test")), true);
});

test("exports the knowledge graph as Mermaid", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const visual = graphMermaid(project);
  assert.match(visual.mermaid, /flowchart LR/);
  assert.match(visual.mermaid, /documents_command|defines_command/);
  assert.equal(visual.edges > 0, true);
});

test("learn captures actual session learning with inferred type", () => {
  const project = tempProject();
  mkdirSync(join(project, "mcp"), { recursive: true });
  writeFileSync(join(project, "mcp", "index.ts"), "", "utf8");
  const result = learn({
    projectDir: project,
    learning: "Decision: agents should use kage_learn for actual session discoveries and diff proposal only as a fallback. Why: session learnings can capture cause and rationale that raw diffs cannot.",
    paths: ["mcp/index.ts"],
    tags: ["session-learning"],
    verifiedBy: "npm test",
  });
  assert.equal(result.ok, true);
  assert.equal(result.packet?.type, "decision");
  assert.equal(result.packet?.tags.includes("session-learning"), true);
  assert.match(result.packet?.body ?? "", /Verified by: npm test/);
  assert.match(result.packet?.context?.why ?? "", /cause and rationale/);
  assert.equal(result.packet?.context?.verification, "npm test");
});

test("graph command extraction ignores prose and file references", () => {
  const project = tempProject();
  mkdirSync(join(project, "scripts"), { recursive: true });
  writeFileSync(join(project, "scripts", "stop.sh"), "#!/bin/sh\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Session dedupe",
    body: "The `stop.sh` hook prevents duplicate memory nodes. Store state in `~/.claude/kage/.processed_sessions`. Use npm run test to verify.",
    type: "convention",
    paths: ["scripts/stop.sh"],
  });
  assert.equal(result.ok, true);

  const graph = buildKnowledgeGraph(project);
  const commandNames = graph.entities.filter((entity) => entity.type === "command").map((entity) => entity.name);
  assert.deepEqual(commandNames, ["npm run test"]);
});

test("graph skips missing path edges even when packets warn about them", () => {
  const project = tempProject();
  mkdirSync(join(project, "node_modules", "debug"), { recursive: true });
  writeFileSync(join(project, "node_modules", "debug", "README.md"), "dependency docs\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Old backend flow",
    body: "This memory references a path that no longer exists.",
    type: "workflow",
    paths: ["backend", "node_modules/debug/README.md"],
  });
  assert.equal(result.ok, true);

  const graph = buildKnowledgeGraph(project);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("backend")), false);
  assert.equal(graph.edges.some((edge) => edge.relation === "affects_path" && edge.fact.includes("node_modules")), false);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
});

test("capture blocks sensitive content before writing repo memory", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Secret handling",
    body: "The api_key = sk_live_123456789 should never be saved.",
    type: "gotcha",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Sensitive content blocked/);
});

test("capture writes valid repo-local packet for safe memory", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Use webhook replay tests",
    body: "Run pnpm test:api -- webhooks after changing billing webhooks.",
    type: "runbook",
    tags: ["billing", "webhook"],
    paths: ["backend/billing"],
  });
  assert.equal(result.ok, true);
  assert.ok(result.path);
  assert.equal(result.packet?.status, "approved");
  assert.match(result.path!, /\/packets\//);
  assert.match(readFileSync(result.path!, "utf8"), /Use webhook replay tests/);
});

test("records usefulness feedback on approved packets", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project)[0];
  const result = recordFeedback(project, packet.id, "stale");
  assert.equal(result.ok, true);
  assert.equal((result.packet?.quality as Record<string, unknown>).reports_stale, 1);
  assert.ok((result.packet?.freshness as Record<string, unknown>).stale_reported_at);
});

test("packet validation catches invalid type and confidence range", () => {
  const result = validatePacket({
    schema_version: 2,
    id: "bad",
    title: "Bad",
    summary: "Bad",
    body: "Bad",
    type: "unknown" as never,
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 2,
    tags: [],
    paths: [],
    stack: [],
    source_refs: [],
    freshness: {},
    edges: [],
    quality: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /invalid type|confidence/);
});

test("sensitive scanner detects common leak shapes", () => {
  assert.deepEqual(scanSensitiveText("hello world"), []);
  assert.equal(scanSensitiveText("Contact person@example.com").includes("email address"), true);
  assert.equal(scanSensitiveText("Authorization: Bearer abcdefghijklmnopqrstuvwxyz").includes("generic bearer token"), true);
  assert.equal(scanSensitiveText("STRIPE_SECRET_KEY=sk_test_1234567890abcdefghijklmnopqrstuvwxyz").includes("api key assignment"), true);
  assert.equal(scanSensitiveText("STRIPE_SECRET_KEY=sk_test_1234567890abcdefghijklmnopqrstuvwxyz").includes("stripe secret key"), true);
  assert.equal(scanSensitiveText("STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz").includes("stripe webhook secret"), true);
});

test("project validation warns when indexes are missing", () => {
  const project = tempProject();
  const result = validateProject(project);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((warning) => warning.includes("catalog")), true);
  assert.ok(packetsDir(project));
});

test("project validation warns when legacy markdown has not been migrated", () => {
  const project = tempProject();
  writeFileSync(join(project, ".agent_memory", "nodes", "run-tests.md"), "# Run tests\n\nUse npm test.\n", "utf8");
  const result = validateProject(project);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((warning) => warning.includes("has not been migrated")), true);
});

test("project validation warns when approved packet paths are ungrounded", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Missing path memory",
    body: "This should point at a real subsystem.",
    type: "reference",
    paths: ["missing/subsystem"],
  });
  assert.equal(result.ok, true);
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  writeFileSync(result.path!, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("none of the referenced paths exist")), true);
});

test("project validation ignores retired packet quality warnings", () => {
  const project = tempProject();
  const result = capture({
    projectDir: project,
    title: "Retired memory",
    body: "This old memory points at a subsystem that no longer exists.",
    type: "reference",
    paths: ["missing/subsystem"],
  });
  assert.equal(result.ok, true);
  const packet = JSON.parse(readFileSync(result.path!, "utf8"));
  packet.status = "deprecated";
  writeFileSync(result.path!, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  renameSync(result.path!, `${result.path!}.retired`);

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("none of the referenced paths exist")), false);
});

test("project validation ignores duplicate warnings between generated branch change memories", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "first branch notes\n", "utf8");

  const first = proposeFromDiff(project);
  assert.equal(first.ok, true);
  assert.ok(first.packet?.tags.includes("change-memory"));

  execFileSync("git", ["checkout", "-b", "feature/docs"], { cwd: project, stdio: "ignore" });
  const second = proposeFromDiff(project);
  assert.equal(second.ok, true);
  assert.ok(second.packet?.tags.includes("change-memory"));

  const validation = validateProject(project);
  assert.equal(validation.ok, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("possible duplicate of Change memory")), false);
});

test("public catalog compatibility accepts nodes and node_count", () => {
  assert.equal(catalogDomainNodeCount({ nodes: 3 }), 3);
  assert.equal(catalogDomainNodeCount({ node_count: 4 }), 4);
  assert.equal(catalogDomainNodeCount({}), 0);
});

test("init and doctor expose first-run health and recall preview", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  const init = initProject(project);
  assert.equal(init.validation.ok, true);
  assert.match(init.sampleRecall.context_block, /vitest|test/i);
  assert.equal(init.index.indexes.some((path) => path.endsWith("indexes/catalog.json")), true);
  assert.equal(existsSync(join(project, ".agent_memory", "code_graph", "graph.json")), false);
  assert.equal(existsSync(join(project, ".agent_memory", "graph", "graph.json")), false);

  const doctor = doctorProject(project);
  assert.equal(doctor.validation.ok, true);
  assert.equal(doctor.indexesMissing.includes("code-graph.json"), true);
  assert.equal(doctor.graphEntities > 0, true);
  assert.equal(doctor.graphEdges > 0, true);
  assert.match(doctor.sampleRecall, /Kage Context/);
});

test("registry recommendations detect docs skills and MCPs from package metadata", () => {
  const project = tempProject();
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({
      name: "demo",
      dependencies: {
        next: "15.0.0",
        react: "19.0.0",
        prisma: "6.0.0",
        stripe: "18.0.0",
        "@modelcontextprotocol/sdk": "1.0.0",
      },
    }),
    "utf8"
  );

  const recommendations = registryRecommendations(project);
  assert.equal(recommendations.some((item) => item.id === "docs:nextjs" && item.install === "read_only"), true);
  assert.equal(recommendations.some((item) => item.id === "docs:stripe" && item.trust === "official"), true);
  assert.equal(recommendations.some((item) => item.id === "mcp:database-inspector" && item.install === "manual_approval_required"), true);
});

test("graph registry manifest signs graph artifacts and source packet hashes", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "server.ts"), "export function createApp() { return {}; }\n", "utf8");
  const packet = capture({
    projectDir: project,
    title: "Decision: createApp owns setup",
    body: "Why: one setup point keeps middleware consistent.\n\nVerified by: npm test",
    type: "decision",
    paths: ["src/server.ts"],
  });
  assert.equal(packet.ok, true);
  writeLspSymbolIndex(project);
  refreshProject(project);

  const result = buildGraphRegistryManifest(project);
  assert.equal(result.ok, true);
  assert.match(result.path, /graph_registry\/manifest\.json$/);
  assert.equal(result.manifest.kind, "graph_registry");
  assert.equal(result.manifest.signature.algorithm, "sha256-canonical-json");
  assert.equal(result.manifest.payload.sources.packets.some((source) => source.id === packet.packet?.id && source.content_sha256.length === 64), true);
  assert.equal(result.manifest.payload.artifacts.some((artifact) => artifact.path === ".agent_memory/graph/graph.json" && artifact.sha256.length === 64), true);
  assert.equal(result.manifest.payload.artifacts.some((artifact) => artifact.path === ".agent_memory/code_graph/graph.json" && artifact.sha256.length === 64), true);
  assert.equal(result.manifest.payload.reports.audit.trust_score >= 0, true);
  assert.equal(result.manifest.payload.reports.inbox.pending, 0);
  assert.equal(result.manifest.payload.repo_state.branch !== undefined, true);
  assert.match(readFileSync(result.path, "utf8"), /graph_registry/);
});

test("public candidate promotion sanitizes private packet metadata", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);

  const result = createPublicCandidate(project, packet.id);
  assert.equal(result.ok, true);
  assert.ok(result.packet);
  assert.equal(result.packet.scope, "public");
  assert.equal(result.packet.visibility, "public");
  assert.equal(result.packet.sensitivity, "public");
  assert.deepEqual(result.packet.paths, []);
  assert.equal(result.packet.source_refs[0]?.kind, "local_public_candidate");
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("no repo-grounded source reference")), false);
  assert.equal(Object.values(result.packet.source_refs[0] ?? {}).some((value) => String(value).includes("package.json")), false);
});

test("exports public candidates as a static bundle", () => {
  const project = tempProject();
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  indexProject(project);
  const packet = loadApprovedPackets(project).find((candidate) => candidate.type === "repo_map");
  assert.ok(packet);
  assert.equal(createPublicCandidate(project, packet.id).ok, true);
  const bundle = exportPublicBundle(project);
  assert.equal(bundle.ok, true);
  assert.equal(bundle.packetCount, 1);
  assert.match(readFileSync(bundle.path!, "utf8"), /public_candidate_bundle/);
  assert.match(readFileSync(bundle.path!, "utf8"), /payload_sha256/);
});

test("builds branch overlay metadata", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  const overlay = buildBranchOverlay(project);
  assert.equal(overlay.changed_files.includes("README.md"), true);
  assert.equal(Array.isArray(overlay.pending_packet_ids), true);
});

test("creates review artifact for legacy pending packets and branch summaries", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "changed\n", "utf8");
  assert.equal(proposeFromDiff(project).ok, true);
  const result = capture({
    projectDir: project,
    title: "Review me",
    body: "Legacy pending memory needs human review.",
    type: "reference",
  });
  assert.equal(result.ok, true);
  const pendingPacket = { ...result.packet!, id: `${result.packet!.id}-pending`, status: "pending" };
  writeFileSync(join(project, ".agent_memory", "pending", "review-me.json"), `${JSON.stringify(pendingPacket, null, 2)}\n`, "utf8");
  const artifact = createReviewArtifact(project);
  assert.equal(artifact.pending, 1);
  assert.match(readFileSync(artifact.path, "utf8"), /Review me/);
  assert.match(readFileSync(artifact.path, "utf8"), /Quality score/);
  assert.match(readFileSync(artifact.path, "utf8"), /Estimated tokens saved/);
  assert.match(readFileSync(artifact.path, "utf8"), /Branch Summary/);
});

test("diff proposal creates a branch review summary and repo-local change memory", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "node_modules", "left-pad"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ scripts: { test: "vitest", build: "tsc" } }), "utf8");
  writeFileSync(join(project, "src", "runner.ts"), "export const command = 'npm test';\n", "utf8");
  writeFileSync(join(project, "node_modules", "left-pad", "README.md"), "dependency noise\n", "utf8");

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.ok(result.packet);
  assert.ok(result.packetPath);
  assert.equal(result.packet.type, "workflow");
  assert.equal(result.packet.status, "approved");
  assert.equal(result.packet.tags.includes("change-memory"), true);
  assert.match(result.packetPath, /\/packets\//);
  assert.ok(result.summary);
  assert.equal(result.summary.repo_memory_written, true);
  assert.equal(result.summary.promotion_review_required, true);
  assert.equal(result.changedFiles.includes("src/runner.ts"), true);
  assert.equal(result.changedFiles.some((path) => path.includes("node_modules")), false);
  assert.equal(result.packet.paths.some((path) => path.includes("node_modules")), false);
  assert.match(result.packet.context?.why ?? "", /git diff/);
  assert.match(result.packet.context?.stale_when ?? "", /branch diff changes/);
  assert.match(readFileSync(result.path!, "utf8"), /git_diff/);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("no repo-grounded source reference")), false);
  assert.equal(recall(project, "what changed runner npm test").results.some((item) => item.packet.id === result.packet!.id), true);
});

test("diff proposal from a package directory stores project-relative paths", () => {
  const root = tempProject();
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  mkdirSync(join(root, "packages", "ai", "src"), { recursive: true });
  writeFileSync(join(root, "README.md"), "root readme\n", "utf8");
  commitAll(root, "initial");
  const project = join(root, "packages", "ai");
  writeFileSync(join(project, "src", "client.ts"), "export const client = true;\n", "utf8");

  const result = proposeFromDiff(project);

  assert.equal(result.ok, true);
  assert.equal(result.changedFiles.includes("src/client.ts"), true);
  assert.equal(result.changedFiles.some((path) => path.startsWith("packages/ai/")), false);
  assert.equal(result.packet?.paths.includes("src/client.ts"), true);
  assert.equal(validateProject(project).warnings.some((warning) => warning.includes("none of the referenced paths exist")), false);
});

test("diff proposal includes repo memory packet-only changes", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" },
  });

  const learned = learn({
    projectDir: project,
    title: "Release workflow gotcha",
    learning: "Use GIT_EDITOR=true for non-interactive release rebases and fetch before npm publish.",
    type: "gotcha",
    tags: ["release", "npm"],
    paths: ["README.md"],
  });
  assert.equal(learned.ok, true);

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.equal(result.changedFiles.some((path) => path.startsWith(".agent_memory/packets/")), true);
  assert.equal(result.packet?.paths.some((path) => path.startsWith(".agent_memory/packets/")), true);
  assert.match(result.summary?.diff_stat ?? "", /\.agent_memory\/packets\//);
});

test("diff proposal stat includes untracked files alongside tracked diffs", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial"], {
    cwd: project,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" },
  });
  writeFileSync(join(project, "README.md"), "hello again\n", "utf8");
  writeFileSync(join(project, "src", "new-release.ts"), "export const release = true;\n", "utf8");

  const result = proposeFromDiff(project);
  assert.equal(result.ok, true);
  assert.match(result.summary?.diff_stat ?? "", /README\.md/);
  assert.match(result.summary?.diff_stat ?? "", /src\/new-release\.ts/);
});

test("refresh rebuilds graphs and marks path-drifted memory stale", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const result = capture({
    projectDir: project,
    title: "Old runbook path",
    body: "Run tests with npm test after changing the old runner module. Verified by local command output.",
    type: "runbook",
    paths: ["src/old-runner.ts"],
    tags: ["tests"],
  });
  assert.equal(result.ok, true);

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  assert.equal(refresh.stale_packets.some((packet) => packet.id === result.packet!.id), true);
  assert.equal(refresh.code_graph.files >= 0, true);
  assert.equal(refresh.memory_graph.entities > 0, true);

  const packet = loadApprovedPackets(project).find((candidate) => candidate.id === result.packet!.id);
  assert.ok(packet);
  assert.equal(packet.quality.stale, true);
  assert.match((packet.quality.stale_reasons as string[]).join(" "), /missing/);
});

test("refresh marks memory stale when linked source content changes", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "retry.ts"), "export const retryMode = 'callback-idempotency';\n", "utf8");

  const result = capture({
    projectDir: project,
    title: "Retry paths stay split",
    body: "The callback retry path intentionally uses idempotency keys while checkout retries use session state. Do not merge them. Verified by retry tests.",
    type: "gotcha",
    paths: ["src/retry.ts"],
    tags: ["retry"],
  });
  assert.equal(result.ok, true);

  let packet = loadApprovedPackets(project).find((candidate) => candidate.id === result.packet!.id);
  assert.ok(packet);
  assert.equal(Array.isArray(packet.freshness.path_fingerprints), true);

  const baseline = refreshProject(project);
  assert.equal(baseline.stale_packets.some((candidate) => candidate.id === result.packet!.id), false);

  writeFileSync(join(project, "src", "retry.ts"), "export const retryMode = 'session-state';\n", "utf8");

  const refresh = refreshProject(project);
  assert.equal(refresh.stale_packets.some((candidate) => candidate.id === result.packet!.id), true);
  packet = loadApprovedPackets(project).find((candidate) => candidate.id === result.packet!.id);
  assert.ok(packet);
  assert.equal(packet.quality.stale, true);
  assert.match((packet.quality.stale_reasons as string[]).join(" "), /linked path changed/);
  assert.equal(packet.quality.suggested_action, "update");
});

test("refresh uses lightweight metrics and leaves benchmarks to metrics command", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  assert.equal(refresh.metrics.pain, undefined);
  assert.equal(refresh.metrics.quality, undefined);
  assert.equal(refresh.metrics.code_graph.files > 0, true);

  const metrics = kageMetrics(project);
  assert.ok(metrics.pain);
  assert.ok(metrics.quality);
});

test("refresh writes current memory handoff report for the viewer dashboard", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  capture({
    projectDir: project,
    title: "Checkout retry handoff",
    body: "Checkout retry behavior should be reviewed before changing retry code.",
    type: "decision",
  });

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  const reportPath = join(project, ".agent_memory", "reports", "handoff.json");
  assert.equal(existsSync(reportPath), true);
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(report.schema_version, 1);
  assert.equal(typeof report.primary_action.label, "string");
  assert.equal(report.totals.open_items > 0, true);
});

test("gc deprecates stale packets by exact packet file path", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const result = capture({
    projectDir: project,
    title: "Removed helper runbook",
    body: "Run tests with npm test after changing the removed helper.",
    type: "runbook",
    paths: ["src/removed-helper.ts"],
    tags: ["tests"],
  });
  assert.equal(result.ok, true);

  const dryRun = gcProject(project, { dryRun: true });
  assert.equal(dryRun.deprecated.length, 1);
  let packet = JSON.parse(readFileSync(result.path!, "utf8"));
  assert.equal(packet.status, "approved");

  const gc = gcProject(project);
  assert.equal(gc.deprecated.length, 1);
  packet = JSON.parse(readFileSync(result.path!, "utf8"));
  assert.equal(packet.status, "deprecated");
  assert.equal(loadApprovedPackets(project).some((candidate) => candidate.id === result.packet!.id), false);
});

test("pr summarize and check make merge-time memory health explicit", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");

  const summary = prSummarize(project);
  assert.equal(summary.ok, true);
  assert.ok(summary.diff_memory_packet_id);
  assert.ok(summary.review_artifact_path);
  assert.equal(summary.changed_files.includes("src/runner.js"), true);

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  const check = prCheck(project);
  assert.equal(check.ok, true);
  assert.equal(check.code_graph_current, true);
  assert.equal(check.memory_graph_current, true);
  assert.equal(check.memory_packet_changes.length > 0, true);
});

test("pr check accepts same-tree commits after graph refresh", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  commitAll(project, "initial");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  execFileSync("git", ["commit", "--allow-empty", "-m", "metadata-only"], { cwd: project, stdio: "ignore", env: gitIdentityEnv });

  const check = prCheck(project);
  assert.equal(check.code_graph_current, true);
  assert.equal(check.memory_graph_current, true);
  assert.equal(check.errors.some((error) => error.includes("graph artifacts")), false);
});

test("pr check marks graphs stale when source content changes after refresh", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'ok'; }\n", "utf8");
  commitAll(project, "initial");

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  writeFileSync(join(project, "src", "runner.js"), "export function run() { return 'changed'; }\n", "utf8");

  const check = prCheck(project);
  assert.equal(check.code_graph_current, false);
  assert.equal(check.memory_graph_current, false);
  assert.equal(check.ok, false);
  assert.match(check.errors.join("\n"), /graph artifacts/);
});

test("memory reconciliation makes changed linked memory an agent responsibility", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "retry.js"), "export const retryMode = 'callback';\n", "utf8");
  const captured = capture({
    projectDir: project,
    title: "Retry mode is callback-aware",
    body: "The retry module intentionally keeps callback retry state separate from session retry state.",
    type: "code_explanation",
    paths: ["src/retry.js"],
  });
  assert.equal(captured.ok, true);

  assert.equal(observe(project, {
    type: "file_change",
    session_id: "agent-session",
    agent: "codex",
    path: "src/retry.js",
    summary: "Changed retry mode behavior while fixing callback handling.",
  }).ok, true);
  writeFileSync(join(project, "src", "retry.js"), "export const retryMode = 'session';\n", "utf8");

  const report = kageMemoryReconciliation(project, { sessionId: "agent-session" });
  assert.equal(report.ok, false);
  assert.equal(report.unresolved_count, 1);
  assert.equal(report.items[0]?.packet_id, captured.packet?.id);
  assert.deepEqual(report.items[0]?.changed_paths, ["src/retry.js"]);
  assert.match(report.agent_instruction, /kage_learn|kage_supersede/);
  assert.doesNotMatch(report.agent_instruction, /ask the user/i);
});

test("pr check warns but does not block on soft memory reconciliation", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "retry.js"), "export const retryMode = 'callback';\n", "utf8");
  assert.equal(capture({
    projectDir: project,
    title: "Retry mode is callback-aware",
    body: "The retry module intentionally keeps callback retry state separate from session retry state.",
    type: "code_explanation",
    paths: ["src/retry.js"],
  }).ok, true);
  commitAll(project, "initial");

  writeFileSync(join(project, "src", "retry.js"), "export const retryMode = 'session';\n", "utf8");
  assert.equal(observe(project, {
    type: "file_change",
    session_id: "agent-session",
    agent: "codex",
    path: "src/retry.js",
    summary: "Changed retry mode behavior while fixing callback handling.",
  }).ok, true);
  const refresh = refreshProject(project);
  assert.equal(refresh.stale_packets.length, 1);

  const check = prCheck(project);
  assert.equal(check.ok, true); // code changed since capture is soft drift — warn, don't block the PR
  assert.match(check.warnings.join("\n"), /reconciliation|changed since capture/i);
});

test("pr check blocks on hard-stale memory (cited file deleted)", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "gone.ts"), "export const gone = 1;\n", "utf8");
  assert.equal(capture({ projectDir: project, title: "Gone rule", body: "All about src/gone.ts retries.", type: "decision", paths: ["src/gone.ts"] }).ok, true);
  commitAll(project, "seed gone");
  unlinkSync(join(project, "src", "gone.ts"));
  refreshProject(project);
  const check = prCheck(project);
  assert.equal(check.ok, false);
  assert.match(check.errors.join("\n"), /hard-stale/i);
});

test("pr check warns but does not block on distillable session learnings", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");
  assert.equal(observe(project, {
    type: "command_result",
    session_id: "pr-session",
    agent: "codex",
    command: "npm test -- checkout",
    exit_code: 0,
    summary: "Use this command after changing checkout retry behavior.",
    timestamp: "2026-05-17T10:01:00.000Z",
  }).ok, true);

  const refresh = refreshProject(project);
  assert.equal(refresh.ok, true);
  const check = prCheck(project);

  assert.equal(check.ok, true); // distillable sessions are advisory — warn, don't block
  assert.match(check.warnings.join("\n"), /distillable session/);
});

test("pr check ignores stale packets that were already superseded", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "retry.ts"), "export const retryMode = 'callback-idempotency';\n", "utf8");
  commitAll(project, "initial retry");
  const oldMemory = capture({
    projectDir: project,
    title: "Retry mode stays callback based",
    body: "Retry mode uses callback idempotency. Verify retry behavior before changing src/retry.ts.",
    type: "decision",
    paths: ["src/retry.ts"],
  });
  assert.equal(oldMemory.ok, true);
  assert.equal(refreshProject(project).ok, true);

  writeFileSync(join(project, "src", "retry.ts"), "export const retryMode = 'session-state';\n", "utf8");
  const replacement = capture({
    projectDir: project,
    title: "Retry mode now uses session state",
    body: "Retry mode now uses session state. Verify retry behavior before changing src/retry.ts.",
    type: "decision",
    paths: ["src/retry.ts"],
  });
  assert.equal(replacement.ok, true);
  const supersede = supersedeMemory(project, oldMemory.packet!.id, replacement.packet!.id, "Retry mode changed and memory was replaced.");
  assert.equal(supersede.ok, true);
  assert.equal(refreshProject(project).stale_packets.some((packet) => packet.id === oldMemory.packet!.id), true);

  const check = prCheck(project);

  assert.equal(check.stale_packets.some((packet) => packet.id === oldMemory.packet!.id), false);
  assert.equal(check.errors.some((error) => error.includes("stale memory")), false);
});

test("strict capture rejects all-missing citations, honors escape hatch, and stamps author_branch", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "real.ts"), "export const real = 1;\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: project, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "seed"], { cwd: project, stdio: "ignore", env: gitIdentityEnv });

  const rejected = capture({
    projectDir: project,
    title: "Hallucinated note",
    body: "Use the helper in src/ghost.ts for retries.",
    type: "decision",
    paths: ["src/ghost.ts"],
    strictCitations: true,
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.errors[0], /Citation validation failed/);

  const allowed = capture({
    projectDir: project,
    title: "Planned helper",
    body: "Will add src/ghost.ts soon.",
    type: "decision",
    paths: ["src/ghost.ts"],
    strictCitations: true,
    allowMissingPaths: true,
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.warnings?.some((warning) => warning.includes("src/ghost.ts")), true);

  const grounded = capture({
    projectDir: project,
    title: "Real note",
    body: "Use src/real.ts for the retry helper.",
    type: "decision",
    paths: ["src/real.ts"],
    strictCitations: true,
  });
  assert.equal(grounded.ok, true);
  assert.equal(typeof grounded.packet?.author_branch, "string");

  // The core library stays permissive for programmatic callers (no strictCitations).
  const permissive = capture({
    projectDir: project,
    title: "Programmatic note",
    body: "Internal caller references src/ghost.ts.",
    type: "decision",
    paths: ["src/ghost.ts"],
  });
  assert.equal(permissive.ok, true);
});

test("verifyCitations flags deleted citations and reports grounding", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "keep.ts"), "export const keep = 1;\n", "utf8");
  writeFileSync(join(project, "src", "drop.ts"), "export const drop = 1;\n", "utf8");
  const kept = capture({ projectDir: project, title: "Keep note", body: "About src/keep.ts behavior.", type: "decision", paths: ["src/keep.ts"] });
  const dropped = capture({ projectDir: project, title: "Drop note", body: "About src/drop.ts behavior.", type: "decision", paths: ["src/drop.ts"] });
  assert.equal(kept.ok && dropped.ok, true);
  unlinkSync(join(project, "src", "drop.ts"));

  const report = verifyCitations(project);
  assert.equal(report.ok, true);
  assert.equal(report.checked, 2);
  const dropEntry = report.packets.find((entry) => entry.title === "Drop note");
  assert.equal(dropEntry?.stale, true);
  assert.equal(dropEntry?.missing_paths.includes("src/drop.ts"), true);
  const keepEntry = report.packets.find((entry) => entry.title === "Keep note");
  assert.equal(keepEntry?.stale, false);

  const single = verifyCitations(project, { id: dropped.packet!.id });
  assert.equal(single.checked, 1);
  assert.equal(single.packets[0]?.title, "Drop note");
});

test("recall excludes memory whose cited files were deleted since capture", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "widget.ts"), "export const widget = 1;\n", "utf8");
  const deleted = capture({ projectDir: project, title: "Widget retry rule", body: "Widget retries use idempotency keys in src/widget.ts.", type: "decision", paths: ["src/widget.ts"] });
  assert.equal(deleted.ok, true);

  const before = recall(project, "widget retry idempotency", 5);
  assert.equal(before.results.some((entry) => entry.packet.title === "Widget retry rule"), true);

  unlinkSync(join(project, "src", "widget.ts"));
  const after = recall(project, "widget retry idempotency", 5);
  assert.equal(after.results.some((entry) => entry.packet.title === "Widget retry rule"), false);
  assert.equal(after.suppressed?.some((entry) => entry.title === "Widget retry rule"), true);

  const withStale = recall(project, "widget retry idempotency", 5, false, { includeStale: true });
  assert.equal(withStale.results.some((entry) => entry.packet.title === "Widget retry rule"), true);

  // A citation that NEVER existed is an ungrounded write, not recall-time staleness:
  // it must still be recallable (capture-time validation guards that case instead).
  const ghost = capture({ projectDir: project, title: "Ghost composition convention", body: "Prefer composition in src/never.ts modules.", type: "convention", paths: ["src/never.ts"] });
  assert.equal(ghost.ok, true);
  const ghostRecall = recall(project, "composition convention modules", 5);
  assert.equal(ghostRecall.results.some((entry) => entry.packet.title === "Ghost composition convention"), true);
});

test("compactProject prunes dead citations, deprecates deleted memory, and clusters duplicates", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(project, "src", "b.ts"), "export const b = 1;\n", "utf8");
  const partial = capture({ projectDir: project, title: "Partial cite", body: "Touches src/a.ts and src/b.ts together.", type: "decision", paths: ["src/a.ts", "src/b.ts"] });
  const gone = capture({ projectDir: project, title: "Gone cite", body: "All about src/b.ts cleanup work.", type: "decision", paths: ["src/b.ts"] });
  assert.equal(partial.ok && gone.ok, true);
  unlinkSync(join(project, "src", "b.ts"));

  const dry = compactProject(project, { dryRun: true });
  assert.equal(dry.dry_run, true);
  assert.equal(dry.pruned_citations.some((entry) => entry.id === partial.packet!.id && entry.removed_paths.includes("src/b.ts")), true);
  assert.equal(dry.deprecated.some((entry) => entry.id === gone.packet!.id), true);

  const applied = compactProject(project, { dryRun: false });
  assert.equal(applied.pruned_citations.length >= 1, true);
  assert.equal(applied.deprecated.length >= 1, true);
  // The deprecated, all-citations-deleted packet is now out of recall.
  const recalled = recall(project, "src/b.ts cleanup work", 5);
  assert.equal(recalled.results.some((entry) => entry.packet.title === "Gone cite"), false);

  writeFileSync(join(project, "src", "c.ts"), "export const c = 1;\n", "utf8");
  capture({ projectDir: project, title: "Use jose for auth", body: "Use the jose library for auth token validation in src/c.ts.", type: "decision", paths: ["src/c.ts"] });
  capture({ projectDir: project, title: "Auth uses jose", body: "Use the jose library for auth token validation in src/c.ts.", type: "decision", paths: ["src/c.ts"] });
  const dupReport = compactProject(project, { dryRun: true });
  assert.equal(dupReport.duplicate_clusters.length >= 1, true);
});

test("capture records agent-supplied graph_nodes as code-reference edges", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "auth.ts"), "export function validateToken() { return true; }\n", "utf8");
  const result = capture({
    projectDir: project,
    title: "Auth token rule",
    body: "Use jose for token validation.",
    type: "decision",
    paths: ["src/auth.ts"],
    graphNodes: ["symbol:validateToken", "file:src/auth.ts", "symbol:validateToken"],
  });
  assert.equal(result.ok, true);
  const edges = result.packet!.edges as Array<Record<string, unknown>>;
  assert.equal(edges.length, 2); // deduped
  assert.equal(edges.every((edge) => edge.relation === "references_code"), true);
  assert.equal(edges.some((edge) => edge.to === "symbol:validateToken"), true);
});

test("recall bounds the context block to an opt-in token budget", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "m.ts"), "export const m = 1;\n", "utf8");
  for (let i = 0; i < 8; i += 1) {
    capture({
      projectDir: project,
      title: `Retry rule ${i}`,
      body: `Retry rule ${i}: payment retries use idempotency keys and exponential backoff in src/m.ts to avoid duplicate charges across the whole system.`,
      type: "decision",
      paths: ["src/m.ts"],
    });
  }
  const full = recall(project, "payment retry idempotency backoff", 8);
  const bounded = recall(project, "payment retry idempotency backoff", 8, false, { maxContextTokens: 60 });
  assert.equal(bounded.context_block.length < full.context_block.length, true);
  assert.match(bounded.context_block, /Context trimmed/);
});

test("recall assembles a bounded structural blast radius from the recalled memory's files", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "core.js"), "export function core() { return 1; }\n", "utf8");
  writeFileSync(join(project, "src", "app.js"), "import { core } from './core.js';\nexport function app() { return core(); }\n", "utf8");
  const captured = capture({
    projectDir: project,
    title: "Core retry invariant",
    body: "Core retry invariant: payment retries are idempotent in src/core.js.",
    type: "decision",
    paths: ["src/core.js"],
  });
  assert.equal(captured.ok, true);

  const plain = recall(project, "core retry idempotent payment", 5);
  assert.equal(/Structural Blast Radius/.test(plain.context_block), false); // off by default

  const traversed = recall(project, "core retry idempotent payment", 5, false, { structuralHops: 2 });
  assert.match(traversed.context_block, /Structural Blast Radius \(2-hop\)/);
  assert.match(traversed.context_block, /src\/app\.js/); // app.js depends on the recalled core.js
});

test("kage demo proves the trust wedge: reject, withhold, recall", () => {
  const project = tempProject();
  const r = runDemo(join(project, "demo"));
  assert.equal(r.ok, true);
  assert.equal(r.captured.length >= 2, true);
  assert.equal(r.rejected_hallucination !== null, true);
  assert.equal(r.withheld.some((w) => /Legacy/i.test(w.title)), true);
  assert.equal(r.recalled.some((t) => /Auth|Payments/i.test(t)), true);
  assert.equal(r.recalled.some((t) => /Legacy/i.test(t)), false);
});

test("kageSuppressedMemory lists memory recall is withholding", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "gone.ts"), "export const gone = 1;\n", "utf8");
  writeFileSync(join(project, "src", "kept.ts"), "export const kept = 1;\n", "utf8");
  const gone = capture({ projectDir: project, title: "Gone rule", body: "About src/gone.ts retries.", type: "decision", paths: ["src/gone.ts"] });
  capture({ projectDir: project, title: "Kept rule", body: "About src/kept.ts retries.", type: "decision", paths: ["src/kept.ts"] });
  assert.equal(gone.ok, true);
  unlinkSync(join(project, "src", "gone.ts"));

  const report = kageSuppressedMemory(project);
  assert.equal(report.count >= 1, true);
  assert.equal(report.items.some((item) => item.title === "Gone rule"), true);
  assert.equal(report.items.some((item) => item.title === "Kept rule"), false);
  assert.equal(report.items.every((item) => typeof item.reason === "string" && item.reason.length > 0), true);
});

test("trust benchmark proves citation rejection, stale exclusion, and grounding", () => {
  const project = tempProject();
  const report = benchmarkTrust(project);
  assert.equal(report.metrics.hallucinated_citation_rejection_rate, 100);
  assert.equal(report.detail.hallucination.rejected, report.detail.hallucination.attempted);
  assert.equal(report.detail.staleness.recallable_before > 0, true);
  assert.equal(report.detail.staleness.excluded_after, report.detail.staleness.recallable_before);
  assert.equal(report.metrics.stale_memory_exclusion_rate, 100);
  assert.equal(report.trust_score >= 90, true);
  assert.equal(report.ok, true);
});

test("hook install also installs pull/merge sync hooks", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  const result = kageHookInstall(project);
  assert.equal(result.installed, true);
  assert.equal((result.additional_hooks ?? []).length >= 1, true);
  const postMerge = join(project, ".git", "hooks", "post-merge");
  assert.equal(existsSync(postMerge), true);
  assert.match(readFileSync(postMerge, "utf8"), /"\$KAGE_BIN" index/);
  assert.equal(existsSync(join(project, ".git", "hooks", "post-checkout")), true);
});

test("kageignore'd paths never become memory grounding at capture time", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  writeFileSync(join(project, ".kageignore"), "viewer/\n", "utf8");
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "a.js"), "export const a = 1;\n", "utf8");
  mkdirSync(join(project, "viewer"), { recursive: true });
  writeFileSync(join(project, "viewer", "app.js"), "console.log('ui');\n", "utf8");

  const res = capture({
    projectDir: project,
    title: "API returns typed errors",
    body: "The API layer returns typed errors. Verified in src/a.js.",
    type: "decision",
    paths: ["src/a.js", "viewer/app.js"],
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.packet?.paths, ["src/a.js"]);
  const fingerprints = ((res.packet?.freshness as Record<string, unknown>)?.path_fingerprints as Array<Record<string, unknown>>) ?? [];
  assert.equal(fingerprints.some((fp) => String(fp.path).includes("viewer/")), false);
});

test("refresh prunes kageignore'd grounding and does not mark memory stale for it", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "a.js"), "export const a = 1;\n", "utf8");
  mkdirSync(join(project, "viewer"), { recursive: true });
  writeFileSync(join(project, "viewer", "app.js"), "console.log('ui');\n", "utf8");

  // Capture BEFORE declaring the viewer ignored, so the packet stores the viewer path.
  const res = capture({
    projectDir: project,
    title: "API returns typed errors",
    body: "The API layer returns typed errors. Verified in src/a.js and viewer/app.js.",
    type: "decision",
    paths: ["src/a.js", "viewer/app.js"],
  });
  assert.equal(res.ok, true);
  assert.equal((res.packet?.paths ?? []).includes("viewer/app.js"), true);

  // Declare the viewer non-knowledge and delete it (as if removed in a refactor).
  writeFileSync(join(project, ".kageignore"), "viewer/\n", "utf8");
  unlinkSync(join(project, "viewer", "app.js"));

  refreshProject(project);

  const packet = JSON.parse(readFileSync(res.path as string, "utf8"));
  assert.equal(packet.paths.includes("viewer/app.js"), false);
  assert.equal(packet.paths.includes("src/a.js"), true);
  assert.notEqual(packet.quality?.stale, true);
});

test("kageActivity merges recorded recalls and captures into a chronological feed", () => {
  const project = tempProject();
  execFileSync("git", ["init"], { cwd: project, stdio: "ignore" });
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "auth.js"), "export function login() { return true; }\n", "utf8");
  const cap = capture({
    projectDir: project,
    title: "Login returns a boolean",
    body: "login() returns true on success. Verified in src/auth.js.",
    type: "decision",
    paths: ["src/auth.js"],
  });
  assert.equal(cap.ok, true);
  buildIndexes(project);

  // Before any recall: a capture event, zero recalls.
  let activity = kageActivity(project);
  assert.equal(activity.totals.captures >= 1, true);
  assert.equal(activity.totals.recalls, 0);

  // A real recall is recorded as activity.
  recall(project, "does login return a boolean", 5, false);
  activity = kageActivity(project);
  assert.equal(activity.totals.recalls >= 1, true);
  assert.equal(activity.events.some((e) => e.kind === "recall"), true);
  assert.equal(activity.events.some((e) => e.kind === "capture"), true);
  // Newest first.
  for (let i = 1; i < activity.events.length; i += 1) {
    assert.equal(Date.parse(activity.events[i - 1].at) >= Date.parse(activity.events[i].at), true);
  }
});

test("tree-sitter extracts python symbols and calls with ast-accurate kinds and lines", async () => {
  await ensureTreeSitterLanguages(["python"]);
  const project = tempProject();
  mkdirSync(join(project, "app"), { recursive: true });
  writeFileSync(
    join(project, "app", "tasks.py"),
    `import helpers

def top_level(value):
    return helpers.clean(value)

@decorator
async def fetch_all():
    pass

class TaskService:
    def list_tasks(self):
        return top_level([])

    def _hidden(self):
        pass
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  const symbols = graph.symbols.filter((symbol) => symbol.path === "app/tasks.py");
  assert.equal(symbols.every((symbol) => symbol.parser === "tree-sitter"), true);
  const topLevel = symbols.find((symbol) => symbol.name === "top_level");
  assert.equal(topLevel?.kind, "function");
  assert.equal(topLevel?.line, 3);
  assert.equal(topLevel?.end_line, 4);
  const fetchAll = symbols.find((symbol) => symbol.name === "fetch_all");
  assert.equal(fetchAll?.kind, "function");
  assert.equal(fetchAll?.line, 7);
  const service = symbols.find((symbol) => symbol.name === "TaskService");
  assert.equal(service?.kind, "class");
  assert.equal(service?.line, 10);
  const listTasks = symbols.find((symbol) => symbol.name === "list_tasks");
  assert.equal(listTasks?.kind, "method");
  assert.equal(listTasks?.line, 11);
  assert.equal(symbols.find((symbol) => symbol.name === "_hidden")?.export, false);
  assert.equal(graph.files.find((file) => file.path === "app/tasks.py")?.parser, "tree-sitter");
  const call = graph.calls.find((edge) => edge.path === "app/tasks.py" && edge.to_symbol === topLevel?.id);
  assert.equal(call?.line, 12);
  assert.equal(call?.confidence, 0.8);
  assert.equal(call?.resolution, "tree_sitter_name");
  assert.equal(call?.from_symbol, listTasks?.id);
});

test("tree-sitter extracts go symbols including method receivers", async () => {
  await ensureTreeSitterLanguages(["go"]);
  const project = tempProject();
  mkdirSync(join(project, "pkg"), { recursive: true });
  writeFileSync(
    join(project, "pkg", "store.go"),
    `package store

type TaskStore struct {}

func NewTaskStore() *TaskStore {
	return &TaskStore{}
}

func (s *TaskStore) List(prefix string) []string {
	return filter(prefix)
}

func filter(prefix string) []string {
	return nil
}
`,
    "utf8"
  );

  const graph = buildCodeGraph(project);
  const symbols = graph.symbols.filter((symbol) => symbol.path === "pkg/store.go");
  assert.equal(symbols.every((symbol) => symbol.parser === "tree-sitter"), true);
  const store = symbols.find((symbol) => symbol.name === "TaskStore");
  assert.equal(store?.kind, "class");
  assert.equal(store?.line, 3);
  const constructor = symbols.find((symbol) => symbol.name === "NewTaskStore");
  assert.equal(constructor?.kind, "function");
  assert.equal(constructor?.line, 5);
  assert.equal(constructor?.export, true);
  const list = symbols.find((symbol) => symbol.name === "List");
  assert.equal(list?.kind, "method");
  assert.equal(list?.line, 9);
  assert.equal(list?.end_line, 11);
  assert.equal(list?.signature.includes("(s *TaskStore)"), true);
  const filter = symbols.find((symbol) => symbol.name === "filter");
  assert.equal(filter?.kind, "function");
  assert.equal(filter?.export, false);
  const call = graph.calls.find((edge) => edge.path === "pkg/store.go" && edge.to_symbol === filter?.id);
  assert.equal(call?.line, 10);
  assert.equal(call?.confidence, 0.8);
  assert.equal(call?.resolution, "tree_sitter_name");
  assert.equal(call?.from_symbol, list?.id);
});

test("value ledger accumulates events and valueSummary computes window math", () => {
  const project = tempProject();
  recordValueEvent(project, { kind: "recall_served", tokens_saved: 4000 });
  recordValueEvent(project, { kind: "recall_served", tokens_saved: 1000 });
  recordValueEvent(project, { kind: "stale_withheld", packet_title: "Old widget runbook" });
  recordValueEvent(project, { kind: "caller_answered" });

  const ledgerPath = join(project, ".agent_memory", "reports", "value.json");
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  assert.equal(ledger.schema_version, 1);
  assert.equal(ledger.events.length, 4);
  assert.equal(ledger.totals.tokens_saved, 5000);
  assert.equal(ledger.events.some((event: { packet_title?: string }) => event.packet_title === "Old widget runbook"), true);

  const summary = valueSummary(project);
  for (const window of [summary.today, summary.last_7d, summary.all_time]) {
    assert.equal(window.tokens_saved, 5000);
    assert.equal(window.recalls, 2);
    assert.equal(window.stale_withheld, 1);
    assert.equal(window.caller_answers, 1);
    assert.equal(window.estimated_dollars, Number(((5000 / 1_000_000) * 15).toFixed(2)));
  }

  // Events outside the window drop out of today/last_7d but stay in all-time totals.
  ledger.events[0].at = new Date(Date.now() - 10 * 86_400_000).toISOString();
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
  const rolled = valueSummary(project);
  assert.equal(rolled.last_7d.tokens_saved, 1000);
  assert.equal(rolled.last_7d.recalls, 1);
  assert.equal(rolled.today.tokens_saved, 1000);
  assert.equal(rolled.all_time.tokens_saved, 5000);
  assert.equal(rolled.all_time.recalls, 2);

  assert.equal(formatTokenCount(412), "412");
  assert.equal(formatTokenCount(412_345), "412K");
  assert.equal(formatTokenCount(4_120_000), "4.1M");
});

test("recall records value ledger receipts for served and withheld memory", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "src", "billing.ts"), `// billing module\n${"export const billingLine = 1;\n".repeat(200)}`, "utf8");
  writeFileSync(join(project, "src", "gone.ts"), "export const gone = 1;\n", "utf8");
  capture({ projectDir: project, title: "Billing retry rule", body: "Billing retries use idempotency keys in src/billing.ts.", type: "decision", paths: ["src/billing.ts"] });
  capture({ projectDir: project, title: "Gone billing note", body: "Old billing retry behavior in src/gone.ts.", type: "decision", paths: ["src/gone.ts"] });
  unlinkSync(join(project, "src", "gone.ts"));

  const result = recall(project, "billing retry idempotency", 5);
  assert.equal(result.results.some((entry) => entry.packet.title === "Billing retry rule"), true);
  assert.ok(result.value_receipt);
  assert.equal(result.value_receipt.stale_withheld, 1);
  assert.equal(result.value_receipt.tokens_saved >= 0, true);

  const summary = valueSummary(project);
  assert.equal(summary.all_time.recalls >= 1, true);
  assert.equal(summary.all_time.stale_withheld >= 1, true);
  const ledger = JSON.parse(readFileSync(join(project, ".agent_memory", "reports", "value.json"), "utf8"));
  assert.equal(ledger.events.some((event: { kind: string }) => event.kind === "recall_served"), true);
  assert.equal(ledger.events.some((event: { kind: string; packet_title?: string }) => event.kind === "stale_withheld" && event.packet_title === "Gone billing note"), true);
});

test("caller-intent code graph answers record caller_answered value events", () => {
  const project = tempProject();
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo" }), "utf8");
  writeFileSync(join(project, "src", "delay.ts"), "export function computeBackoff(n: number) { return n * 2; }\n", "utf8");
  writeFileSync(
    join(project, "src", "client.ts"),
    "import { computeBackoff } from './delay.js';\nexport function retryRequest() { return computeBackoff(3); }\n",
    "utf8",
  );

  const result = queryCodeGraph(project, "which functions call computeBackoff");
  assert.match(result.context_block, /## Callers/);
  const summary = valueSummary(project);
  assert.equal(summary.all_time.caller_answers, 1);
});
