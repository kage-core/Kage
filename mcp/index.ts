#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  SETUP_AGENTS,
  auditProject,
  benchmarkCodingMemoryQuality,
  benchmarkMemoryScale,
  benchmarkTrust,
  benchmarkTaskComparison,
  benchmarkProject,
  capture,
  catalogDomainNodeCount,
  buildBranchOverlay,
  buildStructuralIndex,
  createReviewArtifact,
  deleteContextSlot,
  distillSession,
  ensureTreeSitterLanguages,
  graphMermaid,
  installAgentPolicy,
  kageCleanupCandidates,
  kageCapabilityAudit,
  kageContext,
  kageContributors,
  kageContextSlots,
  kageFetchPublicGraphNode,
  kageListPublicDomains,
  kageSearchPublicGraph,
  KAGE_WORKFLOW_TEXT,
  kageDecisionIntelligence,
  kageDependencyPath,
  kageGraphInsights,
  kageMemoryAccess,
  kageMemoryAudit,
  kageMemoryHandoff,
  kageMemoryLifecycle,
  kageMemoryLineage,
  kageMemoryReconciliation,
  kageMemoryTimeline,
  kageMetrics,
  kageModuleHealth,
  kageProjectProfile,
  kageRepoXray,
  kageReviewerSuggestions,
  kageRisk,
  kageSessionCaptureReport,
  kageSessionLearningLedger,
  kageSessionReplay,
  kageTeammateBrief,
  learn,
  memoryInbox,
  kageWorkspace,
  kageWorkspaceRecall,
  observe,
  prCheck,
  prSummarize,
  staleCatch,
  formatStaleCatch,
  proposeFromDiff,
  qualityReport,
  queryGraph,
  recall,
  recallWithEmbeddings,
  searchDocs,
  docsRecallSection,
  recordFeedback,
  verifyCitations,
  compactProject,
  kageConflicts,
  generateSkills,
  refreshProject,
  registryRecommendations,
  reverifyMemory,
  setupAgent,
  setupDoctor,
  setContextSlot,
  supersedeMemory,
  transitionWorkStage,
  claimWorkItem,
  linkImplements,
  listWorkItems,
  validateProject,
  valueSummary,
  verifyAgentActivation,
  writeCodeIndex,
  type MemoryType,
  type ObservationEvent,
  type SetupAgent,
  type WorkStage,
} from "./kernel.js";
import { driftCheck, formatCheckReport } from "./check.js";
import { buildGraphRegistryManifest } from "./graph-registry.js";

function arrayArg(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

const server = new Server(
  { name: "kage-graph", version: "3.3.0" },
  { capabilities: { tools: {} } }
);

// Agent-facing core: the verbs an agent actually uses in the loop (recall,
// capture, stay-honest, refresh, codify). Everything else is operator/diagnostic
// and must not bloat the model's default tool list — it stays reachable in full
// mode (KAGE_TOOLS=full) or via the CLI. Keeping the default small enough that
// the client always-loads it removes the per-call ToolSearch round-trip.
export const CORE_TOOLS = new Set([
  "kage_check",
  "kage_context",
  "kage_learn",
  "kage_supersede",
  "kage_feedback",
  "kage_pr_check",
  "kage_refresh",
  "kage_skills",
  // Promoted after the agent-trajectory eval showed a real agent reaches for
  // these on natural tasks (risk before a change, listing decisions, tracing a
  // dependency path, searching the repo's own docs).
  "kage_risk",
  "kage_decisions",
  "kage_dependency_path",
  "kage_docs_search",
]);

export function listTools() {
  const all = allTools();
  if (process.env.KAGE_TOOLS === "full" || process.env.KAGE_ALL_TOOLS === "1") return all;
  return all.filter((tool) => CORE_TOOLS.has(tool.name));
}

function allTools() {
  return [
    {
      // Combined entry-point tool: validate + recall + code_graph + graph in one call.
      // Agents should load this schema first (one ToolSearch) instead of loading four
      // separate deferred schemas. Cuts session start from 4 schema loads to 1.
      name: "kage_context",
      description:
        "Primary kage entry point. Validates memory health, recalls relevant packets, and queries both the code graph and knowledge graph — all in one call. Call this at the start of every task; it answers caller/usage questions from the code graph too, so you rarely need a separate graph tool.",
      annotations: { title: "Recall verified memory and query the code/knowledge graph", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the project root" },
          query: { type: "string", description: "The task or question — used for both memory recall and code graph search" },
          limit: { type: "number", description: "Max memory packets to return (default 5)" },
          session_id: { type: "string", description: "Optional active agent session id for memory reconciliation" },
          targets: { type: "array", items: { type: "string" }, description: "Optional files the agent may edit or explain; used for risk context" },
          changed_files: { type: "array", items: { type: "string" }, description: "Optional changed files for pre-edit or PR risk context" },
          json: { type: "boolean", description: "Return the full structured result instead of the rendered context block." },
          explain: { type: "boolean", description: "Return the full structured result, including why each memory was recalled." },
        },
        required: ["project_dir", "query"],
      },
    },
    {
      name: "kage_search",
      description:
        "Search the kage community knowledge graph for gotchas, patterns, configs, and architectural decisions across auth, database, payments, deployment, frontend, testing, and more. Returns node summaries ranked by relevance.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What you are looking for, e.g. 'prisma serverless connection', 'stripe webhook signature', 'JWT refresh token'",
          },
          domain: {
            type: "string",
            description:
              "Optional: restrict search to a specific domain. One of: auth, database, payments, deployment, frontend, testing, api-design, email, storage, ai-agents, security, performance, observability, infrastructure, mobile, tooling, data",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "kage_fetch",
      description:
        "Fetch the full content of a specific node from the kage knowledge graph. Use after kage_search to get the complete fix, pattern, or decision.",
      inputSchema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "The domain the node belongs to, e.g. 'database', 'auth', 'payments'",
          },
          node_id: {
            type: "string",
            description: "The node slug, e.g. 'prisma-serverless-connection-exhaustion'",
          },
        },
        required: ["domain", "node_id"],
      },
    },
    {
      name: "kage_list_domains",
      description:
        "List all domains in the kage knowledge graph with their node counts and top tags. Use to orient before searching.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "kage_recall",
      description:
        "Recall repo-local Kage memory from .agent_memory packets. Returns an agent-ready context block plus ranked packet summaries.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          project_dir: { type: "string" },
          limit: { type: "number" },
          explain: { type: "boolean" },
          embeddings: { type: "boolean" },
          docs: { type: "boolean", description: "If true, append a Docs section (<=3 hits) drawn from this repo's own committed documentation." },
          json: { type: "boolean" },
          max_context_tokens: { type: "number" },
          structural_hops: { type: "number", description: "If >0, append a bounded N-hop code-graph blast radius seeded from the recalled memory's files." },
        },
        required: ["query", "project_dir"],
      },
    },
    {
      name: "kage_graph",
      description:
        "Query the repo-local Kage knowledge graph. Returns typed, evidence-backed graph facts from entities, edges, and episodes.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir", "query"],
      },
    },
    {
      name: "kage_graph_registry",
      description:
        "Build a signed graph-registry manifest for generated memory graph, code graph, indexes, metrics, audit, inbox, source packet IDs, packet hashes, and repo git state.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          full: { type: "boolean", description: "Force a full code graph rebuild instead of reusing unchanged graph artifacts." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_risk",
      description:
        "Assess modification risk for files using Kage's code graph plus local git history: dependents, impact surface, churn, ownership, co-change partners, and test gaps. Use before editing hotspot or shared files.",
      annotations: { title: "Assess file modification risk", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          targets: { type: "array", items: { type: "string" }, description: "File paths to assess" },
          changed_files: { type: "array", items: { type: "string" }, description: "Optional PR/branch changed files. If targets is omitted, these are assessed." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_dependency_path",
      description:
        "Find how two files are connected in Kage's source-derived code graph. Reports direct dependency direction, reverse impact direction, or undirected graph connection.",
      annotations: { title: "Trace the dependency path between two files", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          from: { type: "string", description: "Source file path or unique suffix" },
          to: { type: "string", description: "Target file path or unique suffix" },
        },
        required: ["project_dir", "from", "to"],
      },
    },
    {
      name: "kage_cleanup_candidates",
      description:
        "Find conservative cleanup candidates from Kage's code graph. Reports unreferenced source files, unused exports, and internal-looking unused symbols with confidence and reasons; never auto-deletes.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_reviewers",
      description:
        "Suggest reviewers for target or changed files from local git authorship, recent edits, and code-graph co-change ownership. Does not contact GitHub or external services.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          targets: { type: "array", items: { type: "string" }, description: "File paths to review" },
          changed_files: { type: "array", items: { type: "string" }, description: "Optional PR/branch changed files. If targets is omitted, these are used." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_contributors",
      description:
        "Build local contributor profiles from git history: commits, recent activity, touched files, modules, ownership silos, hotspot ownership, and commit category mix.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_profile",
      description:
        "Return a compact project profile for agent orientation: repo totals, languages, top code+memory concepts, key files, memory focus, run commands, and next actions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_xray",
      description:
        "Return a first-use Repo X-Ray: code structure layers for entry points, core files, risk, tests, memory overlay, and knowledge gaps.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_capabilities",
      description:
        "Return an evidence-backed Kage memory-system capability audit across repo memory, collaboration/session proof, benchmarks, and dashboard/viewer readiness.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_context_slots",
      description:
        "List repo-local pinned context slots. Pinned slots are small, reviewable facts that Kage includes in recall/context before task-specific memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_context_slot_set",
      description:
        "Create or update a repo-local pinned context slot. Use for durable, high-signal repo guidance that should always be included without loading all memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          label: { type: "string" },
          content: { type: "string" },
          description: { type: "string" },
          pinned: { type: "boolean" },
          size_limit: { type: "number" },
          paths: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["project_dir", "label", "content"],
      },
    },
    {
      name: "kage_context_slot_delete",
      description: "Delete a repo-local context slot by label.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          label: { type: "string" },
        },
        required: ["project_dir", "label"],
      },
    },
    {
      name: "kage_decisions",
      description:
        "Summarize the repo's 'why' memory at a glance: the decisions, gotchas, runbooks, conventions, and code explanations Kage has captured, plus which high-traffic code paths still have no decision memory. Use it to brief yourself on a repo before changing it, or to audit where institutional knowledge is thin or going stale. Read-only: returns grouped entries with titles, types, cited file paths, and call-outs for weak, stale, or undocumented hot paths. Does not modify any memory.",
      annotations: { title: "Summarize the repo's decision memory", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root to summarize." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_code_index",
      description:
        "Write external code index artifacts consumed by the code graph. Prefers SCIP when scip-typescript and scip are installed, then falls back to the built-in LSP-compatible symbol index.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_structural_index",
      description:
        "Build the complete cache-backed structural index for large repos. This covers all supported source/config/doc files and writes .agent_memory/structural artifacts separate from learned memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_docs_search",
      description:
        "Search this repo's OWN committed documentation (README, docs/**, *.md, common doc dirs — including any framework/API docs checked into the repo). BM25 over heading-anchored chunks from .agent_memory/indexes/docs-index.json. Returns ranked doc hits with doc_path, heading, line, and snippet. This indexes only files on disk in the project, never the internet.",
      annotations: { title: "Search the repo's own committed docs", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search terms to match against the repo's documentation." },
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          limit: { type: "number", description: "Max ranked doc hits to return (default 5)." },
        },
        required: ["query", "project_dir"],
      },
    },
    {
      name: "kage_metrics",
      description:
        "Return concise Kage adoption and quality metrics: code graph counts, language/parser coverage, memory graph evidence coverage, pending/approved packets, validation state, and readiness score.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_access",
      description:
        "Report which repo-local memory packets have actually been recalled recently. This uses local ignored access telemetry and does not mutate shareable packet files.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_module_health",
      description:
        "Return local module health scorecards from Kage's code graph, test signals, cleanup candidates, git churn, and ownership concentration.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_graph_insights",
      description:
        "Return deterministic code graph intelligence: central files, dependency cycles, import communities, and short entry flows. Use to orient agents before broad architectural edits.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the project root" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_workspace",
      description:
        "Summarize a local multi-repo workspace: discovered git repos, Kage memory coverage, code graph counts, package dependencies, route contracts, topic/event contracts, and cross-repo co-change links between repos. Use when a task spans multiple sibling repos.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Workspace root directory to scan for git repos" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_workspace_recall",
      description:
        "Recall Kage memory across every indexed repo in a local workspace and rank the combined hits. Use for cross-repo teammate knowledge and shared context.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Workspace root directory to scan for git repos" },
          query: { type: "string", description: "Question or task to recall across repos" },
          limit: { type: "number", description: "Max combined hits to return (default 8)" },
          json: { type: "boolean", description: "Return the full structured result instead of the rendered context block." },
        },
        required: ["project_dir", "query"],
      },
    },
    {
      name: "kage_audit",
      description:
        "Audit whether repo memory and code intelligence are trustworthy: validation, memory inbox, structured context coverage, code graph precision, graph links, and concrete recommendations.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_inbox",
      description:
        "Return an actionable memory review inbox: pending packets, stale packets, duplicates, missing structured context, validation issues, and recommended actions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_refresh",
      description:
        "Rebuild repo indexes, code graph, memory graph, metrics, and stale-memory metadata. Agents should run this after meaningful file/content changes before PR checks; push-only or same-tree commits do not need another refresh. On non-default git branches metadata-only packet rewrites are skipped (quiet refresh) to avoid merge conflicts; pass force to persist them anyway.",
      annotations: { title: "Rebuild Kage indexes and graphs", readOnlyHint: false, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          force: { type: "boolean", description: "Persist packet metadata rewrites even on a non-default branch" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_workflow",
      description: KAGE_WORKFLOW_TEXT,
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "kage_pr_summarize",
      description:
        "Create a PR/branch memory summary from local git diff metadata and write repo-local change memory. Use when a branch is ready to hand off.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_pr_check",
      description:
        "Check whether repo memory, code graph, memory graph, and stale-memory state are ready for merge. Leads with a human summary of team memories invalidated by the current change — relay it to the developer.",
      annotations: { title: "Check memory readiness for merge", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_check",
      description:
        "Verify the claims in agent-context files (CLAUDE.md, AGENTS.md, .cursor/rules, README, docs) against the code: cited paths, npm scripts, make targets, CLI subcommands. Reports confirmed drift / verified true / unverifiable — every number is a reproducible check, never an estimate. Pass base to gate only drift introduced since that ref.",
      annotations: { title: "Verify agent-context files against the code", readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          base: { type: "string", description: "Optional git ref: only report drift attributable to changes since this ref (diff-aware mode for PRs)." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_reconcile",
      description:
        "Return agent-owned memory reconciliation work when source files linked to existing memory changed. Agents must update, supersede, or mark stale memory before final handoff.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          session_id: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_quality",
      description:
        "Return memory quality metrics: useful memory ratio, duplicate burden, stale/wrong feedback, evidence coverage, path grounding, and review queue size.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_lifecycle",
      description:
        "Return a repo-local memory lifecycle report: healthy, hot, cold, stale, disputed, ungrounded, pending, generated, and concrete review actions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_timeline",
      description:
        "Return recent repo-memory activity for teammate handoff: added, updated, pending, and deprecated packets with review actions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          days: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_lineage",
      description:
        "Return memory supersession chains so agents can use current replacement packets and keep retired memory as audit history.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_audit",
      description:
        "Return the repo-local audit trail for explicit memory mutations: capture, feedback, review, supersede, deprecate, and delete.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_memory_handoff",
      description:
        "Return a teammate/agent handoff queue by combining memory inbox, lifecycle, audit, timeline, and lineage into concrete next actions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_supersede",
      description:
        "Replace one repo-local memory packet with a newer one that corrects or obsoletes it. Marks the old packet superseded, links it to the replacement, and writes bidirectional lineage edges so the history stays traceable. Use this instead of deleting when new knowledge updates an old fact, or to resolve a contradiction surfaced by kage_conflicts. Mutates both packets on disk: the superseded packet is withheld from recall but kept for lineage.",
      annotations: { title: "Supersede a memory packet with a newer one", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          packet_id: { type: "string", description: "Id of the existing packet to retire (the one being replaced)." },
          replacement_packet_id: { type: "string", description: "Id of the newer packet that wins and stays active." },
          reason: { type: "string", description: "Optional human note recorded on the lineage edge explaining why it was superseded." },
        },
        required: ["project_dir", "packet_id", "replacement_packet_id"],
      },
    },
    {
      name: "kage_reverify",
      description:
        "Re-verify a still-true repo-local memory packet in place: re-checks its cited paths, refreshes fingerprints and last_verified_at, and clears any stale flag. Use this instead of kage_supersede when the code a packet cites changed but the packet's actual claim is still correct — e.g. a cited file was edited for an unrelated reason. Refuses when every cited path is gone; that needs kage_supersede or marking the packet stale instead.",
      annotations: { title: "Re-verify a memory packet against current code", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          packet_id: { type: "string", description: "Id of the packet to re-verify." },
          evidence: { type: "string", description: "What you checked and why the packet's claim still holds (e.g. what changed in the cited file and why it's unrelated)." },
          verified_by: { type: "string", description: "How you verified it, e.g. a test command and its result." },
        },
        required: ["project_dir", "packet_id"],
      },
    },
    {
      name: "kage_list_work_items",
      description:
        "List SDLC work items — proposal packets and their stage (proposed/claimed/in_review/done). Use this to find claimable work (stage: proposed) or check what's in review.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          stage: { type: "string", enum: ["proposed", "claimed", "in_review", "done"], description: "Filter to one stage. Omit to list all." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_claim_work_item",
      description:
        "Claim a proposed work item (a type: proposal packet at stage 'proposed') so you can implement it. Fails if it's already claimed by someone else. After implementing, call kage_link_implements to link your output and advance it to review.",
      annotations: { title: "Claim a work item", readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          packet_id: { type: "string", description: "Id of the proposal packet to claim." },
          actor: { type: "string", description: "Your identity — used later to block you from self-approving your own work to done." },
        },
        required: ["project_dir", "packet_id", "actor"],
      },
    },
    {
      name: "kage_link_implements",
      description:
        "Link an output packet (whatever type already fits — decision, bug_fix, runbook, etc., captured with kage_learn/kage_capture) to the proposal it implements. Auto-advances the proposal from 'claimed' to 'in_review' once linked, signaling it's ready for a human (or a different agent) to review. This does not require a new packet type — capture your work normally, then link it.",
      annotations: { title: "Link an output packet to the proposal it implements", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          output_packet_id: { type: "string", description: "Id of the packet documenting the completed work." },
          proposal_packet_id: { type: "string", description: "Id of the proposal packet this implements." },
          evidence: { type: "string", description: "What was done — files touched, tests run, etc." },
        },
        required: ["project_dir", "output_packet_id", "proposal_packet_id", "evidence"],
      },
    },
    {
      name: "kage_transition_work_item",
      description:
        "Move a work item between stages: proposed<->claimed, claimed<->in_review. This tool NEVER performs the terminal in_review -> done transition — that approval gate is deliberately human-only (kage gate review, TTY-interactive) or cryptographically-authenticated (kage cloud approve), never reachable by an agent through the MCP surface, so an agent can never approve its own work by calling a tool.",
      annotations: { title: "Transition a work item's stage (not to done)", readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          packet_id: { type: "string", description: "Id of the work item (proposal packet)." },
          to_stage: { type: "string", enum: ["proposed", "claimed", "in_review"], description: "Target stage. 'done' is rejected — see description." },
          actor: { type: "string", description: "Your identity." },
          evidence: { type: "string", description: "Why this transition, optional." },
        },
        required: ["project_dir", "packet_id", "to_stage", "actor"],
      },
    },
    {
      name: "kage_conflicts",
      description:
        "List repo-local memory packet pairs that contradict each other (same cited path, same subject, opposing claim). Resolve each with kage_supersede, or keep both intentionally.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_skills",
      description:
        "Codify durable, verified repo memory (runbooks, workflows, actionable decisions) into git-native SKILL.md files under .claude/skills/ that every teammate's agent auto-loads. Only grounded, non-stale packets become skills. Pass dry_run to preview without writing. dir overrides the output directory.",
      annotations: { title: "Codify verified memory into agent skills", readOnlyHint: false, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          dry_run: { type: "boolean", description: "Preview which skills would be written without creating any files." },
          dir: { type: "string", description: "Override the output directory (default .claude/skills/)." },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_benchmark",
      description:
        "Return Kage proof metrics, or set mode=memory_quality / memory_scale for synthetic memory retrieval benchmarks.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          mode: { type: "string", enum: ["project", "trust", "memory_quality", "memory_scale"] },
          sizes: { type: "array", items: { type: "number" } },
          top_k: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_benchmark_compare",
      description:
        "Compare the same task on the same repo with and without Kage. Reports estimated baseline discovery tokens/steps versus Kage recall/code-graph context, with evidence and caveats.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          task: { type: "string" },
        },
        required: ["project_dir", "task"],
      },
    },
    {
      name: "kage_setup_agent",
      description:
        "Generate MCP/setup instructions for Codex, Claude Code, Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose, Roo Code, Kilo Code, Claude Desktop, Aider, or generic MCP.",
      inputSchema: {
        type: "object",
        properties: {
          agent: { type: "string", enum: SETUP_AGENTS },
          project_dir: { type: "string" },
          write: { type: "boolean" },
        },
        required: ["agent", "project_dir"],
      },
    },
    {
      name: "kage_setup_doctor",
      description:
        "Audit Kage setup across supported agents, including Claude Code ambient hook readiness when applicable.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_verify_agent",
      description:
        "Verify that Kage is truly active for the current agent: config, repo policy, indexes, recall, code graph, and this live MCP tool reachability.",
      inputSchema: {
        type: "object",
        properties: {
          agent: { type: "string", enum: SETUP_AGENTS },
          project_dir: { type: "string" },
        },
        required: ["agent", "project_dir"],
      },
    },
    {
      name: "kage_graph_visual",
      description:
        "Export the repo-local Kage knowledge graph as Mermaid flowchart text for visual inspection.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_branch_overlay",
      description:
        "Build and return branch overlay metadata: branch, head, merge-base, changed files, and pending packet IDs.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_learn",
      description:
        "Capture a durable, reusable learning from the current session as a verified repo-local memory packet (committed under .agent_memory/, shared with the team via git). Use it the moment you discover something a future session should know: a decision and its rationale, a bug's root cause and fix, a convention, or a setup step. Prefer it over diff-based proposals when you already know what was learned. The write is rejected if every cited path is missing from the repo (set allow_missing_paths for a file you are about to create), and secrets/PII are scanned out before writing. Returns the new packet id plus any contradiction warnings against existing memory.",
      annotations: { title: "Capture a verified learning to repo memory", readOnlyHint: false },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          learning: { type: "string", description: "The insight to store, in full sentences: what was learned and why it matters to a future session." },
          title: { type: "string", description: "Short headline for the packet. Derived from the learning if omitted." },
          type: { type: "string", description: "Memory type: decision, bug_fix, runbook, convention, gotcha, workflow, code_explanation. Inferred if omitted." },
          evidence: { type: "string", description: "How the learning was confirmed (e.g. test output, a reproduced behavior)." },
          verified_by: { type: "string", description: "What verified it (e.g. a command run, a passing test, a reviewer)." },
          tags: { type: "array", items: { type: "string" }, description: "Optional keywords to aid future recall." },
          paths: { type: "array", items: { type: "string" }, description: "Repo files this memory is about; used to verify the citation now and to recall the memory when those files are touched later." },
          stack: { type: "array", items: { type: "string" }, description: "Optional technologies/frameworks the learning relates to." },
          graph_nodes: { type: "array", items: { type: "string" }, description: "Optional code-graph symbol or file ids this memory is grounded to." },
          allow_missing_paths: { type: "boolean", description: "Allow the write even if cited paths do not exist yet (e.g. a file you are about to create)." },
          discovery_tokens: { type: "number", description: "Approximate token cost of producing this knowledge (exploration + reasoning). Stored on the packet so recall receipts can report replay value; a conservative per-type default is estimated when omitted." },
        },
        required: ["project_dir", "learning"],
      },
    },
    {
      name: "kage_capture",
      description:
        "Create a repo-local Kage memory packet immediately. Org/global promotion still requires explicit human review. Capture is rejected if every referenced path is missing from the repo; set allow_missing_paths to record anyway.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          body: { type: "string" },
          type: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          paths: { type: "array", items: { type: "string" } },
          stack: { type: "array", items: { type: "string" } },
          graph_nodes: { type: "array", items: { type: "string" }, description: "Code-graph node references (symbol/route/file) this memory is about." },
          allow_missing_paths: { type: "boolean" },
        },
        required: ["project_dir", "title", "body"],
      },
    },
    {
      name: "kage_verify_citations",
      description:
        "Verify that a memory packet's cited file paths still exist and that the memory is not stale, before trusting it. Pass an id to check one packet, or omit to audit all approved repo memory. Returns grounding and staleness for each.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          id: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_compact",
      description:
        "Consolidate repo memory: prune dead citations, deprecate hard-stale packets, and surface near-duplicate clusters to merge (via kage_supersede). Defaults to a dry run; pass dry_run=false to apply pruning/deprecation. Duplicate merging stays an agent decision — no hosted LLM is used.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          dry_run: { type: "boolean" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_observe",
      description:
        "Store an automatic local observation event from an agent session. Observations are privacy-scanned, deduplicated, and never published automatically.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          type: { type: "string", enum: ["session_start", "user_prompt", "tool_use", "tool_result", "file_change", "command_result", "test_result", "session_end"] },
          session_id: { type: "string" },
          agent: { type: "string" },
          tool: { type: "string" },
          path: { type: "string" },
          command: { type: "string" },
          exit_code: { type: "number" },
          text: { type: "string" },
          summary: { type: "string" },
          timestamp: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["project_dir", "type"],
      },
    },
    {
      name: "kage_distill",
      description:
        "Distill stored observations for one session into repo-local memory candidates. Org/global promotion still requires explicit human review.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          session_id: { type: "string" },
        },
        required: ["project_dir", "session_id"],
      },
    },
    {
      name: "kage_sessions",
      description:
        "Summarize local agent observation sessions, durable capture candidates, and next distillation actions without exposing raw transcript replay.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_learning_ledger",
      description:
        "Return an agent-facing ledger that classifies observed session events into save, ignore, needs-evidence, or already-distilled memory decisions.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          session_id: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_session_replay",
      description:
        "Return a privacy-preserving replay digest for observed agent sessions: timeline, touched paths, commands, durable candidates, and distill actions without raw transcript text.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          session_id: { type: "string" },
          limit: { type: "number" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_feedback",
      description:
        "Record how useful a recalled repo-local memory packet was, which tunes Kage's trust and future recall. 'helpful' reinforces the packet, 'wrong' flags it as disputed, and 'stale' marks it for re-verification and withholds it from recall until refreshed. Use it right after a recalled packet helped you, misled you, or no longer matched the code. Mutates the packet's quality signals on disk.",
      annotations: { title: "Rate a recalled memory packet", readOnlyHint: false },
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the repository root." },
          packet_id: { type: "string", description: "Id of the memory packet you are rating." },
          kind: { type: "string", enum: ["helpful", "wrong", "stale"], description: "helpful = it was accurate and useful; wrong = it was incorrect (flag as disputed); stale = it no longer matches the code (mark for re-verification)." },
        },
        required: ["project_dir", "packet_id", "kind"],
      },
    },
    {
      name: "kage_install_policy",
      description:
        "Install or update the repo AGENTS.md policy that tells coding agents to use Kage automatically.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_validate",
      description:
        "Validate repo-local Kage memory packets, pending packets, generated indexes, and sensitive-content checks.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_registry_recommend",
      description:
        "Recommend documentation packs, skills, and optional MCPs for this repo based on its package metadata. Recommendations never install anything automatically.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_review_artifact",
      description:
        "Create a Markdown review artifact summarizing pending memory packets for PR or human review.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_propose_from_diff",
      description:
        "Create or update a branch review summary and repo-local change-memory packet from local git status and diff metadata. Org/global promotion still requires explicit human review.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
  ];
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: listTools(),
}));

// Every tool reads its arguments as `args?.some_key`, so a caller that misnames a parameter
// gets it silently dropped and the tool runs on the default. That is how a kage_learn call
// carrying its insight under the wrong key wrote a packet with an empty body: the insight was
// discarded, no error was raised, and the loss only surfaced later as a soft validation
// warning. Unknown keys are a caller bug every time — fail loudly instead of writing something
// useless.
function unknownToolArgs(name: string, args: Record<string, unknown> | undefined): string[] {
  if (!args) return [];
  const tool = allTools().find((candidate) => candidate.name === name);
  const schema = tool?.inputSchema as { properties?: Record<string, unknown> } | undefined;
  if (!schema?.properties) return [];
  const allowed = new Set(Object.keys(schema.properties));
  return Object.keys(args).filter((key) => !allowed.has(key)).sort();
}

export async function callTool(name: string, args: Record<string, unknown> | undefined) {
  const unknown = unknownToolArgs(name, args);
  if (unknown.length) {
    const tool = allTools().find((candidate) => candidate.name === name);
    const allowed = Object.keys((tool?.inputSchema as { properties: Record<string, unknown> }).properties).sort();
    return {
      content: [
        {
          type: "text",
          text: `${name} does not accept: ${unknown.join(", ")}.\n`
            + `Supported parameters: ${allowed.join(", ")}.\n`
            + "Nothing was written. Re-send the call with the intended parameter name.",
        },
      ],
      isError: true,
    };
  }
  await ensureTreeSitterLanguages();
  if (name === "kage_list_domains") {
    return { content: [{ type: "text", text: await kageListPublicDomains() }] };
  }

  if (name === "kage_search") {
    const query = String(args?.query ?? "");
    const domainFilter = args?.domain ? String(args.domain) : null;
    return { content: [{ type: "text", text: await kageSearchPublicGraph(query, domainFilter) }] };
  }

  if (name === "kage_fetch") {
    const domain = String(args?.domain ?? "");
    const nodeId = String(args?.node_id ?? "");
    return { content: [{ type: "text", text: await kageFetchPublicGraphNode(domain, nodeId) }] };
  }

  if (name === "kage_context") {
    const result = kageContext(String(args?.project_dir ?? ""), String(args?.query ?? ""), {
      limit: Number(args?.limit ?? 5),
      targets: arrayArg(args?.targets),
      changedFiles: arrayArg(args?.changed_files),
      sessionId: typeof args?.session_id === "string" ? args.session_id : undefined,
    });
    return {
      content: [{ type: "text", text: result.context_block }],
    };
  }

  if (name === "kage_recall") {
    const maxContextTokens = typeof args?.max_context_tokens === "number" ? args.max_context_tokens : undefined;
    const structuralHops = typeof args?.structural_hops === "number" ? args.structural_hops : undefined;
    const result = args?.embeddings
      ? await recallWithEmbeddings(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5), Boolean(args?.explain))
      : recall(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5), Boolean(args?.explain), { maxContextTokens, structuralHops });
    if (args?.docs) {
      const docsSection = docsRecallSection(String(args?.project_dir ?? ""), String(args?.query ?? ""), 3);
      if (docsSection) result.context_block = `${result.context_block}\n\n${docsSection}`;
    }
    // Counts only: stale-withheld is an observable event; estimated token
    // savings are not a measurement and do not ship.
    const receipt = result.value_receipt;
    const gainsLine = receipt && receipt.stale_withheld > 0
      ? `\n\n_${receipt.stale_withheld} stale memor${receipt.stale_withheld === 1 ? "y" : "ies"} withheld by this recall (cited code changed)._`
      : "";
    return {
      content: [{ type: "text", text: args?.json || args?.explain ? JSON.stringify(result, null, 2) : `${result.context_block}${gainsLine}` }],
    };
  }

  if (name === "kage_docs_search") {
    const hits = searchDocs(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5));
    return {
      content: [{ type: "text", text: JSON.stringify({ query: String(args?.query ?? ""), source: "repo-docs", hits }, null, 2) }],
    };
  }

  if (name === "kage_graph") {
    const result = queryGraph(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 10));
    return {
      content: [{ type: "text", text: result.context_block }],
    };
  }

  if (name === "kage_graph_registry") {
    const result = buildGraphRegistryManifest(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_risk") {
    const result = kageRisk(
      String(args?.project_dir ?? ""),
      arrayArg(args?.targets),
      arrayArg(args?.changed_files)
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_dependency_path") {
    const result = kageDependencyPath(
      String(args?.project_dir ?? ""),
      String(args?.from ?? ""),
      String(args?.to ?? "")
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_cleanup_candidates") {
    const result = kageCleanupCandidates(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_reviewers") {
    const result = kageReviewerSuggestions(
      String(args?.project_dir ?? ""),
      arrayArg(args?.targets),
      arrayArg(args?.changed_files)
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_contributors") {
    const result = kageContributors(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_profile") {
    const result = kageProjectProfile(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_xray") {
    const result = kageRepoXray(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_capabilities") {
    const result = kageCapabilityAudit(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_context_slots") {
    const result = kageContextSlots(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_context_slot_set") {
    const result = setContextSlot(String(args?.project_dir ?? ""), {
      label: String(args?.label ?? ""),
      content: String(args?.content ?? ""),
      description: args?.description == null ? undefined : String(args.description),
      pinned: args?.pinned == null ? undefined : Boolean(args.pinned),
      size_limit: args?.size_limit == null ? undefined : Number(args.size_limit),
      paths: arrayArg(args?.paths),
      tags: arrayArg(args?.tags),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_context_slot_delete") {
    const result = deleteContextSlot(String(args?.project_dir ?? ""), String(args?.label ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_decisions") {
    const result = kageDecisionIntelligence(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_code_index") {
    const result = writeCodeIndex(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_structural_index") {
    const result = buildStructuralIndex(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_metrics") {
    const result = kageMetrics(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_access") {
    const result = kageMemoryAccess(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_lifecycle") {
    const result = kageMemoryLifecycle(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_timeline") {
    const result = kageMemoryTimeline(String(args?.project_dir ?? ""), Number(args?.days ?? 14));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_lineage") {
    const result = kageMemoryLineage(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_audit") {
    const result = kageMemoryAudit(String(args?.project_dir ?? ""), Number(args?.limit ?? 100));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_memory_handoff") {
    const result = kageMemoryHandoff(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_supersede") {
    const result = supersedeMemory(
      String(args?.project_dir ?? ""),
      String(args?.packet_id ?? ""),
      String(args?.replacement_packet_id ?? ""),
      typeof args?.reason === "string" ? args.reason : "",
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_reverify") {
    const result = reverifyMemory(String(args?.project_dir ?? ""), String(args?.packet_id ?? ""), {
      evidence: typeof args?.evidence === "string" ? args.evidence : undefined,
      verifiedBy: typeof args?.verified_by === "string" ? args.verified_by : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_list_work_items") {
    const result = listWorkItems(String(args?.project_dir ?? ""), {
      stage: typeof args?.stage === "string" ? (args.stage as WorkStage) : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_claim_work_item") {
    const result = claimWorkItem(String(args?.project_dir ?? ""), String(args?.packet_id ?? ""), String(args?.actor ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_link_implements") {
    const result = linkImplements(
      String(args?.project_dir ?? ""),
      String(args?.output_packet_id ?? ""),
      String(args?.proposal_packet_id ?? ""),
      String(args?.evidence ?? ""),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_transition_work_item") {
    const toStage = String(args?.to_stage ?? "");
    if (toStage === "done") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: false,
            errors: [
              "kage_transition_work_item never performs the terminal in_review -> done transition. " +
                "That approval gate is human-only (kage gate review) or token-authenticated (kage cloud approve) — " +
                "not reachable through the MCP surface, on purpose.",
            ],
          }, null, 2),
        }],
        isError: true,
      };
    }
    const result = transitionWorkStage(String(args?.project_dir ?? ""), String(args?.packet_id ?? ""), toStage as WorkStage, {
      actor: String(args?.actor ?? ""),
      evidence: typeof args?.evidence === "string" ? args.evidence : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_conflicts") {
    const result = kageConflicts(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_skills") {
    const result = generateSkills(String(args?.project_dir ?? ""), {
      dryRun: args?.dry_run === true,
      dir: typeof args?.dir === "string" ? args.dir : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_module_health") {
    const result = kageModuleHealth(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_graph_insights") {
    const result = kageGraphInsights(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_workspace") {
    const result = kageWorkspace(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_workspace_recall") {
    const result = kageWorkspaceRecall(
      String(args?.project_dir ?? ""),
      String(args?.query ?? ""),
      Number(args?.limit ?? 8)
    );
    return {
      content: [{ type: "text", text: args?.json ? JSON.stringify(result, null, 2) : result.context_block }],
    };
  }

  if (name === "kage_audit") {
    const result = auditProject(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_inbox") {
    const result = memoryInbox(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_refresh") {
    const result = refreshProject(String(args?.project_dir ?? ""), { full: Boolean(args?.full), force: Boolean(args?.force) });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_workflow") {
    return {
      content: [{ type: "text", text: KAGE_WORKFLOW_TEXT }],
    };
  }

  if (name === "kage_pr_summarize") {
    const result = prSummarize(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_pr_check") {
    const projectDir = String(args?.project_dir ?? "");
    // Lead with the stale-catch moment so agents relay "your changes
    // invalidated team memory" to the developer instead of burying it in JSON.
    const guard = formatStaleCatch(staleCatch(projectDir)).join("\n");
    const result = prCheck(projectDir);
    return {
      content: [{ type: "text", text: `${guard}\n\n${JSON.stringify(result, null, 2)}` }],
      isError: !result.ok,
    };
  }

  if (name === "kage_memory_reconcile") {
    const result = kageMemoryReconciliation(String(args?.project_dir ?? ""), {
      sessionId: typeof args?.session_id === "string" ? args.session_id : undefined,
      limit: Number(args?.limit ?? 25),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_check") {
    const report = driftCheck(String(args?.project_dir ?? ""), {
      base: typeof args?.base === "string" ? args.base : undefined,
    });
    return {
      content: [{ type: "text", text: formatCheckReport(report) }],
    };
  }

  if (name === "kage_quality") {
    const result = qualityReport(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_benchmark") {
    const mode = String(args?.mode ?? "project");
    const result = mode === "trust"
      ? benchmarkTrust(String(args?.project_dir ?? ""))
      : mode === "memory_quality"
        ? benchmarkCodingMemoryQuality({ topK: Number(args?.top_k ?? 10) })
        : mode === "memory_scale"
          ? benchmarkMemoryScale({
              sizes: Array.isArray(args?.sizes) ? args.sizes.map(Number) : undefined,
              topK: Number(args?.top_k ?? 10),
            })
          : benchmarkProject(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_benchmark_compare") {
    const result = benchmarkTaskComparison(String(args?.project_dir ?? ""), String(args?.task ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_setup_agent") {
    const result = setupAgent(String(args?.agent ?? "") as SetupAgent, String(args?.project_dir ?? ""), { write: Boolean(args?.write) });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_setup_doctor") {
    const result = setupDoctor(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_verify_agent") {
    const result = verifyAgentActivation(String(args?.agent ?? "") as SetupAgent, String(args?.project_dir ?? ""), { mcpToolReachable: true });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_graph_visual") {
    const result = graphMermaid(String(args?.project_dir ?? ""), Number(args?.limit ?? 40));
    return {
      content: [{ type: "text", text: `\`\`\`mermaid\n${result.mermaid}\n\`\`\`` }],
    };
  }

  if (name === "kage_branch_overlay") {
    const result = buildBranchOverlay(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_learn") {
    const result = learn({
      projectDir: String(args?.project_dir ?? ""),
      learning: String(args?.learning ?? ""),
      title: args?.title ? String(args.title) : undefined,
      type: args?.type ? String(args.type) as MemoryType : undefined,
      evidence: args?.evidence ? String(args.evidence) : undefined,
      verifiedBy: args?.verified_by ? String(args.verified_by) : undefined,
      tags: arrayArg(args?.tags),
      paths: arrayArg(args?.paths),
      stack: arrayArg(args?.stack),
      graphNodes: arrayArg(args?.graph_nodes),
      allowMissingPaths: Boolean(args?.allow_missing_paths),
      strictCitations: true,
      discoveryTokens: args?.discovery_tokens === undefined ? undefined : Number(args.discovery_tokens),
    });
    const learnWarnings = result.warnings?.length ? `\nWarnings:\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}` : "";
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Captured session learning: ${result.path}\nRepo-local memory is written immediately. Org/global promotion still requires explicit review.${learnWarnings}`
            : `Learning capture blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  if (name === "kage_capture") {
    const result = capture({
      projectDir: String(args?.project_dir ?? ""),
      title: String(args?.title ?? ""),
      summary: args?.summary ? String(args.summary) : undefined,
      body: String(args?.body ?? ""),
      type: args?.type ? String(args.type) as MemoryType : undefined,
      tags: arrayArg(args?.tags),
      paths: arrayArg(args?.paths),
      stack: arrayArg(args?.stack),
      graphNodes: arrayArg(args?.graph_nodes),
      allowMissingPaths: Boolean(args?.allow_missing_paths),
      strictCitations: true,
    });

    const captureWarnings = result.warnings?.length ? `\nWarnings:\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}` : "";
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Captured repo-local packet: ${result.path}\nOrg/global promotion still requires explicit review.${captureWarnings}`
            : `Capture blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  if (name === "kage_verify_citations") {
    const result = verifyCitations(String(args?.project_dir ?? ""), {
      id: args?.id ? String(args.id) : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_compact") {
    const result = compactProject(String(args?.project_dir ?? ""), {
      dryRun: args?.dry_run === undefined ? true : Boolean(args.dry_run),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_observe") {
    const projectDir = String(args?.project_dir ?? "");
    const event = { ...args };
    delete event.project_dir;
    const result = observe(projectDir, event as unknown as ObservationEvent);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_distill") {
    const result = distillSession(String(args?.project_dir ?? ""), String(args?.session_id ?? "default"));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_sessions") {
    const result = kageSessionCaptureReport(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  }

  if (name === "kage_learning_ledger") {
    const result = kageSessionLearningLedger(String(args?.project_dir ?? ""), {
      sessionId: args?.session_id ? String(args.session_id) : undefined,
      limit: typeof args?.limit === "number" ? args.limit : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  }

  if (name === "kage_session_replay") {
    const result = kageSessionReplay(String(args?.project_dir ?? ""), {
      sessionId: args?.session_id ? String(args.session_id) : undefined,
      limit: typeof args?.limit === "number" ? args.limit : undefined,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  }

  if (name === "kage_feedback") {
    const result = recordFeedback(String(args?.project_dir ?? ""), String(args?.packet_id ?? ""), String(args?.kind ?? "") as never);
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Recorded ${args?.kind} feedback for ${args?.packet_id}`
            : `Feedback failed:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  if (name === "kage_install_policy") {
    const result = installAgentPolicy(String(args?.project_dir ?? ""));
    return {
      content: [
        {
          type: "text",
          text: `${result.created ? "Created" : result.updated ? "Updated" : "Already current"} agent policy: ${result.path}`,
        },
      ],
    };
  }

  if (name === "kage_validate") {
    const result = validateProject(String(args?.project_dir ?? ""));
    const text = [
      result.ok ? "Validation passed." : "Validation failed.",
      result.errors.length ? `\nErrors:\n${result.errors.map((error) => `- ${error}`).join("\n")}` : "",
      result.warnings.length ? `\nWarnings:\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}` : "",
    ].join("");
    return {
      content: [{ type: "text", text }],
      isError: !result.ok,
    };
  }

  if (name === "kage_registry_recommend") {
    const result = registryRecommendations(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_review_artifact") {
    const result = createReviewArtifact(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: `Wrote review artifact: ${result.path}\nPending packets: ${result.pending}` }],
    };
  }

  if (name === "kage_propose_from_diff") {
    const result = proposeFromDiff(String(args?.project_dir ?? ""));
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Wrote branch review summary: ${result.path}\nCaptured repo-local change memory: ${result.packetPath ?? "(none)"}\nChanged files: ${result.changedFiles.join(", ")}`
            : `Proposal blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return callTool(name, args);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  const firstArg = process.argv[2];
  if (firstArg && !firstArg.startsWith("-")) {
    // A positional subcommand (demo, init, recall, ...) means the user wants the
    // kage CLI, not the MCP stdio server. Delegate so a single
    // `npx @kage-core/kage-graph-mcp <command>` works like the `kage` binary.
    // MCP clients launch with no args (or flags), which falls through to the server.
    const { spawnSync } = require("node:child_process");
    const { join } = require("node:path");
    const result = spawnSync(process.execPath, [join(__dirname, "cli.js"), ...process.argv.slice(2)], { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    // A human in a terminal, not an MCP client: blocking silently on stdio here
    // reads as "the tool printed nothing and hung". Run the 30-second demo instead.
    const { spawnSync } = require("node:child_process");
    const { join } = require("node:path");
    console.log("Kage MCP server — normally launched by an MCP client (Claude Code, Codex, Cursor, ...).");
    console.log("You're in a terminal, so here's the 30-second demo instead:\n");
    const result = spawnSync(process.execPath, [join(__dirname, "cli.js"), "demo"], { stdio: "inherit" });
    process.exit(result.status ?? 0);
  }
  main().catch(console.error);
}
