#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { daemonDoctor, readDaemonStatus, startDaemon, startViewer, stopDaemon } from "./daemon.js";
import {
  SETUP_AGENTS,
  approvePending,
  benchmarkProject,
  buildGlobalCdnBundle,
  buildBranchOverlay,
  buildCodeGraph,
  buildKnowledgeGraph,
  buildMarketplace,
  capture,
  changelog,
  createReviewArtifact,
  createPublicCandidate,
  distillSession,
  doctorProject,
  exportPublicBundle,
  graphMermaid,
  initProject,
  indexProject,
  installAgentPolicy,
  kageMetrics,
  learn,
  loadPendingPackets,
  MEMORY_TYPES,
  observe,
  layeredRecall,
  orgRecall,
  orgReviewPacket,
  orgStatus,
  orgUploadPacket,
  exportOrgRegistry,
  proposeFromDiff,
  qualityReport,
  queryCodeGraph,
  queryGraph,
  recall,
  recordFeedback,
  rejectPending,
  registryRecommendations,
  setupAgent,
  setupDoctor,
  validateProject,
  verifyAgentActivation,
  type CaptureInput,
  type MemoryType,
  type ObservationEvent,
  type SetupAgent,
} from "./kernel.js";

function usage(): never {
  console.log(`Kage repo memory and code graph

Usage:
  kage index --project <dir>
  kage init --project <dir>
  kage policy --project <dir>
  kage doctor --project <dir>
  kage setup list
  kage setup <agent> --project <dir> [--write] [--json]
  kage setup doctor --project <dir> [--json]
  kage setup verify-agent --agent <agent> --project <dir> [--json]
  kage daemon start --project <dir> [--port 3111]
  kage daemon stop --project <dir>
  kage daemon status --project <dir> [--json]
  kage daemon doctor --project <dir> [--json]
  kage viewer --project <dir> [--port 3113]
  kage branch --project <dir> [--json]
  kage metrics --project <dir> [--json]
  kage quality --project <dir> [--json]
  kage benchmark --project <dir> [--json]
  kage code-graph --project <dir> [--json]
  kage code-graph "<query>" --project <dir> [--json]
  kage graph --project <dir> [--json]
  kage graph --project <dir> --mermaid
  kage graph "<query>" --project <dir> [--json]
  kage recall "<query>" --project <dir> [--json] [--explain]
  kage observe --project <dir> --event <json>
  kage distill --project <dir> --session <id>
  kage learn --project <dir> --learning <text> [--title <title>] [--type <type>] [--evidence <text>] [--verified-by <text>] [--tags a,b] [--paths a,b]
  kage feedback --project <dir> --packet <packet-id> --kind helpful|wrong|stale
  kage capture --project <dir> --title <title> --body <body> [--type <type>] [--summary <summary>] [--tags a,b] [--paths a,b] [--stack a,b]
  kage propose --project <dir> --from-diff
  kage review-artifact --project <dir>
  kage promote --project <dir> --public <packet-id>
  kage export-public --project <dir>
  kage registry --project <dir> [--json]
  kage marketplace --project <dir> [--json]
  kage org status --project <dir> --org <org> [--json]
  kage org upload --project <dir> --org <org> --packet <approved-packet-id>
  kage org review --project <dir> --org <org> --packet <org-packet-id> --approve|--reject
  kage org recall "<query>" --project <dir> --org <org> [--json]
  kage org export --project <dir> --org <org> [--json]
  kage layered-recall "<query>" --project <dir> [--org <org>] [--global] [--json]
  kage global build --project <dir> [--org <org>] [--json]
  kage changelog --project <dir> [--days <n>] [--json]
  kage review --project <dir>
  kage validate --project <dir>

Types:
  ${MEMORY_TYPES.join(", ")}
`);
  process.exit(1);
}

function takeArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function listArg(value: string | undefined): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function projectArg(args: string[]): string {
  return takeArg(args, "--project") ?? process.cwd();
}

function numberArg(args: string[], name: string, fallback: number): number {
  const value = takeArg(args, name);
  return value ? Number(value) : fallback;
}

function firstPositional(args: string[]): string | undefined {
  return args.find((arg, index) => index > 0 && !arg.startsWith("--") && !args[index - 1]?.startsWith("--"));
}

async function review(projectDir: string): Promise<void> {
  const pending = loadPendingPackets(projectDir);
  if (pending.length === 0) {
    console.log("No pending packets to review.");
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (const packet of pending) {
      console.log("\n─────────────────────────────────────────");
      console.log(`Title: ${packet.title}`);
      console.log(`Type:  ${packet.type}`);
      console.log(`ID:    ${packet.id}`);
      console.log(`Tags:  ${packet.tags.join(", ") || "(none)"}`);
      console.log(`Paths: ${packet.paths.join(", ") || "(none)"}`);
      console.log("\n" + packet.body);
      const answer = (await rl.question("\n(a) approve  (r) reject  (s) skip  (q) quit: ")).trim().toLowerCase();
      if (answer === "q") break;
      if (answer === "a") {
        const path = approvePending(projectDir, packet.id);
        console.log(`Approved: ${path}`);
      } else if (answer === "r") {
        const path = rejectPending(projectDir, packet.id);
        console.log(`Rejected: ${path}`);
      } else {
        console.log("Skipped.");
      }
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command) usage();

  if (command === "index") {
    const result = indexProject(projectArg(args));
    console.log(`Indexed ${result.projectDir}`);
    console.log(`Packets: ${result.packets}`);
    console.log(`Migrated legacy nodes: ${result.migrated}`);
    if (result.policyPath) console.log(`Agent policy: ${result.policyPath}`);
    console.log(`Indexes:\n${result.indexes.map((path) => `  - ${path}`).join("\n")}`);
    return;
  }

  if (command === "init") {
    const result = initProject(projectArg(args));
    console.log(`Initialized Kage memory for ${result.index.projectDir}`);
    console.log(`Packets: ${result.index.packets}`);
    console.log(`Migrated legacy nodes: ${result.index.migrated}`);
    if (result.index.policyPath) console.log(`Agent policy: ${result.index.policyPath}`);
    console.log(result.validation.ok ? "Validation passed." : "Validation failed.");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.validation.warnings.length) console.log(`Warnings:\n${result.validation.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log("\nFirst recall preview:\n");
    console.log(result.sampleRecall.context_block);
    if (!result.validation.ok) process.exit(2);
    return;
  }

  if (command === "policy") {
    const result = installAgentPolicy(projectArg(args));
    console.log(`${result.created ? "Created" : result.updated ? "Updated" : "Already current"} agent policy: ${result.path}`);
    return;
  }

  if (command === "doctor") {
    const result = doctorProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Doctor: ${result.projectDir}`);
    console.log(`Memory root: ${result.memoryRoot}`);
    console.log(`Git branch: ${result.gitBranch ?? "(not a git repo)"}`);
    console.log(`Packets: ${result.packets}`);
    console.log(`Pending: ${result.pending}`);
    console.log(`Public candidates: ${result.publicCandidates}`);
    console.log(`Graph entities: ${result.graphEntities}`);
    console.log(`Graph edges: ${result.graphEdges}`);
    console.log(`Registry recommendations: ${result.registryRecommendations.length}`);
    console.log(`Indexes present: ${result.indexesPresent.join(", ") || "(none)"}`);
    console.log(`Indexes missing: ${result.indexesMissing.join(", ") || "(none)"}`);
    console.log(result.validation.ok ? "Validation: passed" : "Validation: failed");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.validation.warnings.length) console.log(`Warnings:\n${result.validation.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log("\nRecall smoke test:\n");
    console.log(result.sampleRecall);
    if (!result.validation.ok) process.exit(2);
    return;
  }

  if (command === "setup") {
    const action = args[1];
    if (action === "list") {
      console.log(SETUP_AGENTS.join("\n"));
      return;
    }
    if (action === "doctor") {
      const result = setupDoctor(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Kage setup doctor");
      for (const item of result) {
        console.log(`- ${item.agent}: ${item.configured ? "configured" : "not detected"}${item.config_path ? ` (${item.config_path})` : ""}`);
      }
      return;
    }
    if (action === "verify-agent") {
      const agent = takeArg(args, "--agent") ?? "codex";
      if (!SETUP_AGENTS.includes(agent as SetupAgent)) usage();
      const result = verifyAgentActivation(agent as SetupAgent, projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Kage agent activation: ${result.agent}`);
      console.log(`Status: ${result.status}`);
      console.log(`Config: ${result.checks.config_mentions_kage ? "kage configured" : result.checks.config_present ? "config present, kage missing" : "missing"}${result.config_path ? ` (${result.config_path})` : ""}`);
      console.log(`Policy: ${result.checks.policy_installed ? "installed" : "missing"}`);
      console.log(`Indexes: ${result.checks.indexes_present ? "present" : "missing"}`);
      console.log(`Recall: ${result.checks.recall_works ? "ok" : "failed"} (${result.recall_preview})`);
      console.log(`Code graph: ${result.checks.code_graph_works ? "ok" : "failed"} (${result.code_graph_summary})`);
      console.log(`Active MCP tool: ${result.checks.mcp_tool_reachable ? "reachable" : "not verified from CLI"}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      if (result.next_steps.length) console.log(`Next steps:\n${result.next_steps.map((step) => `  - ${step}`).join("\n")}`);
      if (result.status !== "ready") process.exitCode = 2;
      return;
    }
    if (!action || !SETUP_AGENTS.includes(action as SetupAgent)) usage();
    const result = setupAgent(action as SetupAgent, projectArg(args), { write: args.includes("--write") });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage setup for ${result.agent}`);
    if (result.config_path) console.log(`Config path: ${result.config_path}`);
    console.log(result.write_supported ? `Write support: ${result.wrote ? "wrote config" : "available with --write"}` : "Write support: print-only");
    console.log("\nConfig:\n");
    console.log(result.config);
    if (result.instructions.length) {
      console.log("\nInstructions:");
      for (const instruction of result.instructions) console.log(`- ${instruction}`);
    }
    if (result.warnings.length) {
      console.log("\nWarnings:");
      for (const warning of result.warnings) console.log(`- ${warning}`);
    }
    return;
  }

  if (command === "daemon") {
    const action = args[1];
    const projectDir = projectArg(args);
    if (action === "start") {
      await startDaemon(projectDir, { restPort: numberArg(args, "--port", 3111) });
      return;
    }
    if (action === "stop") {
      const result = stopDaemon(projectDir);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.message);
      if (!result.ok) process.exit(2);
      return;
    }
    if (action === "status") {
      const result = readDaemonStatus(projectDir);
      if (args.includes("--json")) console.log(JSON.stringify(result ?? { ok: false }, null, 2));
      else if (result) console.log(`Kage daemon pid ${result.pid} at http://${result.host}:${result.rest_port}`);
      else console.log("No Kage daemon status found.");
      return;
    }
    if (action === "doctor") {
      const result = daemonDoctor(projectDir);
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Daemon configured: ${result.configured ? "yes" : "no"}`);
      console.log(`Daemon running: ${result.running ? "yes" : "no"}`);
      console.log("Endpoints:");
      for (const endpoint of result.endpoints) console.log(`- ${endpoint}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      return;
    }
    usage();
  }

  if (command === "viewer") {
    await startViewer(projectArg(args), { port: numberArg(args, "--port", 3113) });
    return;
  }

  if (command === "graph") {
    const query = firstPositional(args);
    if (query) {
      const result = queryGraph(projectArg(args), query);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.context_block);
      return;
    }
    if (args.includes("--mermaid")) {
      const result = graphMermaid(projectArg(args));
      console.log("```mermaid");
      console.log(result.mermaid);
      console.log("```");
      return;
    }
    const graph = buildKnowledgeGraph(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    console.log(`Kage Graph: ${graph.project_dir}`);
    console.log(`Entities: ${graph.entities.length}`);
    console.log(`Edges: ${graph.edges.length}`);
    console.log(`Episodes: ${graph.episodes.length}`);
    console.log(`Branch: ${graph.repo_state.branch ?? "(none)"}`);
    console.log("\nTop facts:");
    for (const edge of graph.edges.slice(0, 10)) console.log(`- ${edge.fact}`);
    return;
  }

  if (command === "code-graph") {
    const query = firstPositional(args);
    if (query) {
      const result = queryCodeGraph(projectArg(args), query);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.context_block);
      return;
    }
    const graph = buildCodeGraph(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    console.log(`Kage Code Graph: ${graph.project_dir}`);
    console.log(`Files: ${graph.files.length}`);
    console.log(`Symbols: ${graph.symbols.length}`);
    console.log(`Imports: ${graph.imports.length}`);
    console.log(`Calls: ${graph.calls.length}`);
    console.log(`Routes: ${graph.routes.length}`);
    console.log(`Tests: ${graph.tests.length}`);
    console.log(`Packages/scripts: ${graph.packages.length}`);
    console.log(`Branch: ${graph.repo_state.branch ?? "(none)"}`);
    console.log("\nTop symbols:");
    for (const symbol of graph.symbols.slice(0, 10)) console.log(`- ${symbol.kind} ${symbol.name} (${symbol.path}:${symbol.line})`);
    return;
  }

  if (command === "branch") {
    const result = buildBranchOverlay(projectArg(args));
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Branch: ${result.branch ?? "(detached)"}`);
      console.log(`Head: ${result.head ?? "(none)"}`);
      console.log(`Merge base: ${result.merge_base ?? "(none)"}`);
      console.log(`Changed files: ${result.changed_files.join(", ") || "(none)"}`);
      console.log(`Pending packets: ${result.pending_packet_ids.length}`);
    }
    return;
  }

  if (command === "metrics") {
    const result = kageMetrics(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Metrics: ${result.project_dir}`);
    console.log(`Readiness score: ${result.harness.readiness_score}/100`);
    console.log(`Validation: ${result.harness.validation_ok ? "passed" : "failed"} (${result.harness.errors} errors, ${result.harness.warnings} warnings)`);
    console.log(`Policy installed: ${result.harness.policy_installed ? "yes" : "no"}`);
    console.log("\nCode graph:");
    console.log(`  Files: ${result.code_graph.files}`);
    console.log(`  Symbols: ${result.code_graph.symbols}`);
    console.log(`  Imports: ${result.code_graph.imports}`);
    console.log(`  Calls: ${result.code_graph.calls}`);
    console.log(`  Routes: ${result.code_graph.routes}`);
    console.log(`  Tests: ${result.code_graph.tests}`);
    console.log(`  Indexer coverage: ${result.code_graph.indexer_coverage_percent}%`);
    console.log(`  Languages: ${Object.entries(result.code_graph.languages).map(([name, count]) => `${name}=${count}`).join(", ") || "(none)"}`);
    console.log(`  Parsers: ${Object.entries(result.code_graph.parsers).map(([name, count]) => `${name}=${count}`).join(", ") || "(none)"}`);
    console.log("\nMemory graph:");
    console.log(`  Approved packets: ${result.memory_graph.approved_packets}`);
    console.log(`  Pending packets: ${result.memory_graph.pending_packets}`);
    console.log(`  Episodes: ${result.memory_graph.episodes}`);
    console.log(`  Entities: ${result.memory_graph.entities}`);
    console.log(`  Edges: ${result.memory_graph.edges}`);
    console.log(`  Evidence coverage: ${result.memory_graph.evidence_coverage_percent}%`);
    console.log(`  Average quality: ${result.memory_graph.average_quality_score}/100`);
    console.log(`  Duplicate candidates: ${result.memory_graph.duplicate_candidate_pairs}`);
    console.log("\nToken savings:");
    console.log(`  Indexed source tokens: ${result.savings.estimated_indexed_source_tokens}`);
    console.log(`  Memory tokens: ${result.savings.estimated_memory_tokens}`);
    console.log(`  Recall context tokens: ${result.savings.estimated_recall_context_tokens}`);
    console.log(`  Estimated tokens saved per recall: ${result.savings.estimated_tokens_saved_per_recall}`);
    if (result.quality) {
      console.log("\nQuality:");
      console.log(`  Useful memory ratio: ${result.quality.useful_memory_ratio_percent}%`);
      console.log(`  Duplicate burden: ${result.quality.duplicate_burden}%`);
      console.log(`  Evidence coverage: ${result.quality.evidence_coverage_percent}%`);
      console.log(`  Review queue size: ${result.quality.totals.pending}`);
    }
    if (result.pain) {
      console.log("\nPain avoided:");
      console.log(`  Recall hit rate: ${result.pain.recall_hit_rate_percent}%`);
      console.log(`  Estimated rediscovery avoided: ${result.pain.estimated_rediscovery_avoided}`);
      console.log(`  Estimated tokens saved: ${result.pain.estimated_tokens_saved}`);
      console.log(`  Time to first use: ${result.pain.time_to_first_use_seconds}s`);
    }
    return;
  }

  if (command === "quality") {
    const result = qualityReport(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Quality: ${result.project_dir}`);
    console.log(`Useful memory ratio: ${result.useful_memory_ratio_percent}%`);
    console.log(`Duplicate burden: ${result.duplicate_burden}%`);
    console.log(`Evidence coverage: ${result.evidence_coverage_percent}%`);
    console.log(`Path grounding coverage: ${result.path_grounding_coverage_percent}%`);
    console.log(`Review queue size: ${result.totals.pending}`);
    console.log(`Approved vs pending ratio: ${result.approved_to_pending_ratio}`);
    console.log(`Type coverage: ${Object.entries(result.memory_type_coverage).map(([type, count]) => `${type}=${count}`).join(", ") || "(none)"}`);
    return;
  }

  if (command === "benchmark") {
    const result = benchmarkProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Benchmark: ${result.project_dir}`);
    for (const [name, value] of Object.entries(result.pain_metrics)) console.log(`${name}: ${value}`);
    return;
  }

  if (command === "learn") {
    const learning = takeArg(args, "--learning");
    if (!learning) usage();
    const result = learn({
      projectDir: projectArg(args),
      learning,
      title: takeArg(args, "--title"),
      type: takeArg(args, "--type") as MemoryType | undefined,
      evidence: takeArg(args, "--evidence"),
      verifiedBy: takeArg(args, "--verified-by"),
      tags: listArg(takeArg(args, "--tags")),
      paths: listArg(takeArg(args, "--paths")),
      stack: listArg(takeArg(args, "--stack")),
    });
    if (!result.ok) {
      console.error(`Learning capture blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Captured session learning: ${result.path}`);
    console.log("Repo-local memory is written immediately. Promotion to org/global still requires explicit review.");
    return;
  }

  if (command === "propose") {
    if (!args.includes("--from-diff")) usage();
    const result = proposeFromDiff(projectArg(args));
    if (!result.ok) {
      console.error(`Proposal blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Wrote branch review summary: ${result.path}`);
    if (result.packetPath) console.log(`Captured repo-local change memory: ${result.packetPath}`);
    console.log(`Changed files: ${result.changedFiles.join(", ")}`);
    console.log("Use org/global promotion commands when this memory should leave the repo.");
    return;
  }

  if (command === "review-artifact") {
    const result = createReviewArtifact(projectArg(args));
    console.log(`Wrote review artifact: ${result.path}`);
    console.log(`Pending packets: ${result.pending}`);
    return;
  }

  if (command === "promote") {
    const id = takeArg(args, "--public");
    if (!id) usage();
    const result = createPublicCandidate(projectArg(args), id);
    if (!result.ok) {
      console.error(`Promotion blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Created public review candidate: ${result.path}`);
    console.log("This file is local only until a human publishes it.");
    return;
  }

  if (command === "export-public") {
    const result = exportPublicBundle(projectArg(args));
    if (!result.ok) {
      console.error(`Public bundle blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Exported public bundle: ${result.path}`);
    console.log(`Packets: ${result.packetCount}`);
    return;
  }

  if (command === "registry") {
    const result = registryRecommendations(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.length === 0) {
      console.log("No registry recommendations found for this repo.");
      return;
    }
    for (const item of result) {
      console.log(`${item.id} [${item.kind}] ${item.title}`);
      console.log(`  ${item.summary}`);
      console.log(`  matched: ${item.matched.join(", ") || "(repo metadata)"}`);
      console.log(`  trust: ${item.trust}; install: ${item.install}`);
    }
    return;
  }

  if (command === "marketplace") {
    const result = buildMarketplace(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Marketplace manifest: ${result.path}`);
    console.log(`Packs: ${result.packs.length}`);
    for (const pack of result.packs) {
      console.log(`- ${pack.id} [${pack.kind}] ${pack.title} (${pack.install})`);
    }
    return;
  }

  if (command === "org") {
    const action = args[1];
    const org = takeArg(args, "--org") ?? "local";
    const projectDir = projectArg(args);
    if (action === "status") {
      const result = orgStatus(projectDir, org);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Org memory: ${result.org}`);
        console.log(`Path: ${result.path}`);
        console.log(`Inbox: ${result.inbox}`);
        console.log(`Approved: ${result.approved}`);
        console.log(`Rejected: ${result.rejected}`);
        console.log(`Audit events: ${result.audit_events}`);
        if (result.registry_path) console.log(`Registry: ${result.registry_path}`);
      }
      return;
    }
    if (action === "upload") {
      const id = takeArg(args, "--packet");
      if (!id) usage();
      const result = orgUploadPacket(projectDir, org, id);
      if (!result.ok) {
        console.error(`Org upload blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Created org review candidate: ${result.path}`);
      console.log("Approve explicitly with: kage org review --approve");
      return;
    }
    if (action === "review") {
      const id = takeArg(args, "--packet");
      if (!id || (!args.includes("--approve") && !args.includes("--reject"))) usage();
      const result = orgReviewPacket(projectDir, org, id, args.includes("--approve") ? "approve" : "reject");
      if (!result.ok) {
        console.error(`Org review failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Org review wrote: ${result.path}`);
      return;
    }
    if (action === "recall") {
      const query = firstPositional(args.slice(1));
      if (!query) usage();
      const result = orgRecall(projectDir, org, query);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.context_block);
      return;
    }
    if (action === "export") {
      const result = exportOrgRegistry(projectDir, org);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(`Exported org registry: ${result.registry_path}`);
      return;
    }
    usage();
  }

  if (command === "layered-recall") {
    const query = firstPositional(args);
    if (!query) usage();
    const result = layeredRecall(projectArg(args), query, {
      org: takeArg(args, "--org"),
      includeGlobal: args.includes("--global"),
    });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(result.context_block);
    return;
  }

  if (command === "global") {
    const action = args[1];
    if (action !== "build") usage();
    const result = buildGlobalCdnBundle(projectArg(args), takeArg(args, "--org") ?? "local");
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.ok) {
      console.error(`Global bundle failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Global registry: ${result.manifest_path}`);
    console.log(`Latest alias: ${result.alias_path}`);
    console.log(`Marketplace: ${result.marketplace_path}`);
    console.log(`Public packets: ${result.packet_count}`);
    console.log(`Marketplace packs: ${result.marketplace_packs}`);
    return;
  }

  if (command === "recall") {
    const query = firstPositional(args);
    if (!query) usage();
    const result = recall(projectArg(args), query, 5, args.includes("--explain"));
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(result.context_block);
    return;
  }

  if (command === "observe") {
    const event = takeArg(args, "--event");
    if (!event) usage();
    const result = observe(projectArg(args), JSON.parse(event) as ObservationEvent);
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok && result.duplicate) console.log(`Observation already stored: ${result.path}`);
    else if (result.ok) console.log(`Stored observation: ${result.path}`);
    else {
      console.error(`Observation blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    return;
  }

  if (command === "distill") {
    const sessionId = takeArg(args, "--session");
    if (!sessionId) usage();
    const result = distillSession(projectArg(args), sessionId);
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Distilled session: ${sessionId}`);
      console.log(`Observations: ${result.observations}`);
      console.log(`Candidates: ${result.candidates.filter((candidate) => candidate.ok).length}`);
      if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
    }
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "feedback") {
    const id = takeArg(args, "--packet");
    const kind = takeArg(args, "--kind");
    if (!id || !kind) usage();
    const result = recordFeedback(projectArg(args), id, kind as never);
    if (!result.ok) {
      console.error(`Feedback failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Recorded ${kind} feedback for ${id}`);
    return;
  }

  if (command === "capture") {
    const title = takeArg(args, "--title");
    const body = takeArg(args, "--body");
    if (!title || !body) usage();
    const type = takeArg(args, "--type") as MemoryType | undefined;
    const input: CaptureInput = {
      projectDir: projectArg(args),
      title,
      body,
      type,
      summary: takeArg(args, "--summary"),
      tags: listArg(takeArg(args, "--tags")),
      paths: listArg(takeArg(args, "--paths")),
      stack: listArg(takeArg(args, "--stack")),
    };
    const result = capture(input);
    if (!result.ok) {
      console.error(`Capture blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Captured repo-local packet: ${result.path}`);
    console.log("Repo-local memory is written immediately. Promotion to org/global still requires explicit review.");
    return;
  }

  if (command === "changelog") {
    const days = numberArg(args, "--days", 7);
    const result = changelog(projectArg(args), days);
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Memory changelog: last ${result.days} day${result.days === 1 ? "" : "s"} — ${result.added.length} added, ${result.updated.length} updated, ${result.deprecated.length} deprecated (${result.total} total)`);
    if (result.added.length > 0) {
      console.log("\nNew packets:");
      for (const entry of result.added) {
        console.log(`  + [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.updated.length > 0) {
      console.log("\nUpdated packets:");
      for (const entry of result.updated) {
        console.log(`  ~ [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.deprecated.length > 0) {
      console.log("\nDeprecated packets:");
      for (const entry of result.deprecated) {
        console.log(`  - [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.total === 0) {
      console.log("No memory activity in this period.");
    }
    return;
  }

  if (command === "review") {
    await review(projectArg(args));
    return;
  }

  if (command === "validate") {
    const result = validateProject(projectArg(args));
    if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log(result.ok ? "Validation passed." : "Validation failed.");
    if (!result.ok) process.exit(2);
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
