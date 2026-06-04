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
  benchmarkTaskComparison,
  benchmarkProject,
  buildGlobalCdnBundle,
  capture,
  catalogDomainNodeCount,
  buildBranchOverlay,
  buildCodeGraph,
  buildMarketplace,
  buildStructuralIndex,
  createPublicCandidate,
  createReviewArtifact,
  deleteContextSlot,
  distillSession,
  exportPublicBundle,
  graphMermaid,
  installAgentPolicy,
  kageCleanupCandidates,
  kageCapabilityAudit,
  kageContributors,
  kageContextSlots,
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
  layeredRecall,
  observe,
  orgRecall,
  orgStatus,
  orgUploadPacket,
  prCheck,
  prSummarize,
  proposeFromDiff,
  qualityReport,
  queryCodeGraph,
  queryGraph,
  recall,
  recallWithEmbeddings,
  recordFeedback,
  verifyCitations,
  compactProject,
  refreshProject,
  registryRecommendations,
  setupAgent,
  setupDoctor,
  setContextSlot,
  supersedeMemory,
  validateProject,
  verifyAgentActivation,
  writeCodeIndex,
  type MemoryType,
  type ObservationEvent,
  type SetupAgent,
} from "./kernel.js";
import { buildGraphRegistryManifest } from "./graph-registry.js";

const BASE_URL = "https://raw.githubusercontent.com/kage-core/kage-graph/master";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function fetchJSON<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

interface CatalogDomain {
  nodes?: number;
  node_count?: number;
  top_tags?: string[];
}

interface Catalog {
  domains: Record<string, CatalogDomain>;
}

interface IndexNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  summary: string;
  score: number;
  updated: string;
}

interface DomainIndex {
  nodes: IndexNode[];
}

function domainNodeCount(domain: CatalogDomain): number {
  return catalogDomainNodeCount(domain);
}

function domainTopTags(domain: CatalogDomain): string[] {
  return domain.top_tags ?? [];
}

function scoreMatch(query: string, node: IndexNode): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  const title = node.title.toLowerCase();
  const summary = (node.summary || "").toLowerCase();
  const tags = (node.tags ?? []).map((t) => t.toLowerCase());

  for (const term of terms) {
    if (title.includes(term)) score += 3;
    if (tags.some((t) => t.includes(term))) score += 2;
    if (summary.includes(term)) score += 1;
  }
  return score;
}

function scoreDomainMatch(query: string, domain: CatalogDomain): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const tags = domainTopTags(domain);
  return terms.reduce((sum, term) => {
    return sum + tags.filter((t) => t.includes(term)).length;
  }, 0);
}

function arrayArg(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function filePathHints(query: string): string[] {
  const matches = query.match(/[A-Za-z0-9_./@-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|rb|php|cs|c|h|cc|cpp|hpp|swift|json|md)\b/g) ?? [];
  return [...new Set(matches.map((match) => match.replace(/^\.\//, "")).filter((match) => !/^https?:\/\//.test(match)))];
}

function wantsDependencyPath(query: string): boolean {
  return /\b(connect|connected|dependency|depend|depends|path|impact|flow|trace)\b/i.test(query);
}

function riskContextBlock(result: ReturnType<typeof kageRisk>): string {
  const targets = Object.values(result.targets);
  if (!targets.length) return "";
  const lines = targets.slice(0, 5).map((item) => {
    const coChange = item.git.co_change_partners.length
      ? ` Co-change: ${item.git.co_change_partners.slice(0, 3).map((partner) => `${partner.file_path} (${partner.count})`).join(", ")}.`
      : "";
    return `- ${item.risk_summary}${coChange}`;
  });
  return `\n## Risk Signals\n${lines.join("\n")}`;
}

const server = new Server(
  { name: "kage-graph", version: "1.1.7" },
  { capabilities: { tools: {} } }
);

export function listTools() {
  return [
    {
      // Combined entry-point tool: validate + recall + code_graph + graph in one call.
      // Agents should load this schema first (one ToolSearch) instead of loading four
      // separate deferred schemas. Cuts session start from 4 schema loads to 1.
      name: "kage_context",
      description:
        "Primary kage entry point. Validates memory health, recalls relevant packets, and queries both the code graph and knowledge graph — all in one call. Call this at the start of every task instead of calling kage_validate, kage_recall, kage_code_graph, and kage_graph separately.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string", description: "Absolute path to the project root" },
          query: { type: "string", description: "The task or question — used for both memory recall and code graph search" },
          limit: { type: "number", description: "Max memory packets to return (default 5)" },
          session_id: { type: "string", description: "Optional active agent session id for memory reconciliation" },
          targets: { type: "array", items: { type: "string" }, description: "Optional files the agent may edit or explain; used for risk context" },
          changed_files: { type: "array", items: { type: "string" }, description: "Optional changed files for pre-edit or PR risk context" },
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
      name: "kage_code_graph",
      description:
        "Query the source-derived codebase graph: files, symbols, imports, calls, routes, tests, package scripts. This is generated from code, not learned memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          query: { type: "string" },
          limit: { type: "number" },
          json: { type: "boolean" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_risk",
      description:
        "Assess modification risk for files using Kage's code graph plus local git history: dependents, impact surface, churn, ownership, co-change partners, and test gaps. Use before editing hotspot or shared files.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
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
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
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
        "Summarize Kage why-memory for a repo: decisions, gotchas, runbooks, conventions, code explanations, path coverage, weak/stale memory, and important code paths that still lack decision memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
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
        "Rebuild repo indexes, code graph, memory graph, metrics, and stale-memory metadata. Agents should run this after meaningful file/content changes before PR checks; push-only or same-tree commits do not need another refresh.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
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
        "Check whether repo memory, code graph, memory graph, and stale-memory state are ready for merge.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
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
        "Mark one repo-local memory packet as superseded by a replacement packet and write bidirectional lineage edges.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          packet_id: { type: "string" },
          replacement_packet_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["project_dir", "packet_id", "replacement_packet_id"],
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
          mode: { type: "string", enum: ["project", "memory_quality", "memory_scale"] },
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
        "Capture an actual reusable learning from the current session as repo-local memory. Prefer this over diff proposal when the agent knows what was learned. Capture is rejected if every referenced path is missing from the repo; set allow_missing_paths to record anyway (e.g. a file you are about to create).",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          learning: { type: "string" },
          title: { type: "string" },
          type: { type: "string" },
          evidence: { type: "string" },
          verified_by: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          paths: { type: "array", items: { type: "string" } },
          stack: { type: "array", items: { type: "string" } },
          graph_nodes: { type: "array", items: { type: "string" } },
          allow_missing_paths: { type: "boolean" },
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
        "Record usefulness feedback on an approved repo-local memory packet: helpful, wrong, or stale.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          packet_id: { type: "string" },
          kind: { type: "string", enum: ["helpful", "wrong", "stale"] },
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
      name: "kage_marketplace",
      description:
        "Build a local marketplace manifest for recommended docs, skills, and MCP packs. This never installs anything automatically.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_org_status",
      description:
        "Inspect the local org-memory inbox, approved packets, rejected packets, audit count, and registry path.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          org: { type: "string" },
        },
        required: ["project_dir", "org"],
      },
    },
    {
      name: "kage_org_upload_candidate",
      description:
        "Upload an approved repo packet into the local org review inbox. This creates a candidate only; it does not approve org memory.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          org: { type: "string" },
          packet_id: { type: "string" },
        },
        required: ["project_dir", "org", "packet_id"],
      },
    },
    {
      name: "kage_org_recall",
      description:
        "Recall approved local org memory. Repo-local recall should still take priority when results conflict.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          org: { type: "string" },
          query: { type: "string" },
          limit: { type: "number" },
          json: { type: "boolean" },
        },
        required: ["project_dir", "org", "query"],
      },
    },
    {
      name: "kage_layered_recall",
      description:
        "Recall with Kage's priority order: branch > repo local > org > global. Org/global are included only when explicitly requested.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          query: { type: "string" },
          org: { type: "string" },
          include_global: { type: "boolean" },
          json: { type: "boolean" },
        },
        required: ["project_dir", "query"],
      },
    },
    {
      name: "kage_global_build",
      description:
        "Build a local static global/CDN bundle from human-promoted public candidates and the marketplace manifest. This does not upload anywhere.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          org: { type: "string" },
        },
        required: ["project_dir"],
      },
    },
    {
      name: "kage_promote_public_candidate",
      description:
        "Create a sanitized local public-review candidate from an approved repo memory packet. This does not publish to the global graph.",
      inputSchema: {
        type: "object",
        properties: {
          project_dir: { type: "string" },
          packet_id: { type: "string" },
        },
        required: ["project_dir", "packet_id"],
      },
    },
    {
      name: "kage_export_public_bundle",
      description:
        "Export local public-review candidates as a static public bundle catalog. This still does not publish anywhere.",
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

export async function callTool(name: string, args: Record<string, unknown> | undefined) {
  if (name === "kage_list_domains") {
    const catalog = await fetchJSON<Catalog>(`${BASE_URL}/catalog.json`);
    const lines = Object.entries(catalog.domains)
      .filter(([, d]) => domainNodeCount(d) > 0)
      .sort(([, a], [, b]) => domainNodeCount(b) - domainNodeCount(a))
      .map(
        ([domain, d]) =>
          `**${domain}** — ${domainNodeCount(d)} nodes | tags: ${domainTopTags(d).slice(0, 5).join(", ")}`
      );

    return {
      content: [
        {
          type: "text",
          text: `# kage-graph Domains\n\n${lines.join("\n")}`,
        },
      ],
    };
  }

  if (name === "kage_search") {
    const query = String(args?.query ?? "");
    const domainFilter = args?.domain ? String(args.domain) : null;

    const catalog = await fetchJSON<Catalog>(`${BASE_URL}/catalog.json`);

    let domainsToSearch: string[];
    if (domainFilter) {
      domainsToSearch = [domainFilter];
    } else {
      domainsToSearch = Object.entries(catalog.domains)
        .filter(([, d]) => domainNodeCount(d) > 0)
        .map(([name, d]) => ({ name, score: scoreDomainMatch(query, d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter((d) => d.score > 0)
        .map((d) => d.name);

      if (domainsToSearch.length === 0) {
        domainsToSearch = Object.entries(catalog.domains)
          .filter(([, d]) => domainNodeCount(d) > 0)
          .map(([name]) => name);
      }
    }

    const indexResults = await Promise.allSettled(
      domainsToSearch.map(async (domain) => {
        const index = await fetchJSON<DomainIndex>(
          `${BASE_URL}/domains/${domain}/index.json`
        );
        return { domain, nodes: index.nodes };
      })
    );

    const scored: Array<{ domain: string; node: IndexNode; score: number }> = [];
    for (const result of indexResults) {
      if (result.status === "fulfilled") {
        const { domain, nodes } = result.value;
        for (const node of nodes) {
          const s = scoreMatch(query, node);
          if (s > 0) scored.push({ domain, node, score: s });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score || b.node.score - a.node.score);
    const top = scored.slice(0, 5);

    if (top.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No nodes found matching "${query}". Try kage_list_domains to see what's available.`,
          },
        ],
      };
    }

    const lines = top.map((r, i) => {
      const n = r.node;
      return [
        `### [${i + 1}] ${n.title}`,
        `**Domain:** ${r.domain} | **Type:** ${n.type} | **Score:** ${n.score} | **Updated:** ${n.updated}`,
        `**Tags:** ${(n.tags ?? []).join(", ")}`,
        n.summary ? `**Summary:** ${n.summary}` : "",
        `**Fetch:** domain="${r.domain}" node_id="${n.id}"`,
      ]
        .filter(Boolean)
        .join("\n");
    });

    return {
      content: [
        {
          type: "text",
          text: `# kage-graph results for "${query}"\n\n${lines.join("\n\n---\n\n")}`,
        },
      ],
    };
  }

  if (name === "kage_fetch") {
    const domain = String(args?.domain ?? "");
    const nodeId = String(args?.node_id ?? "");
    const content = await fetchText(
      `${BASE_URL}/domains/${domain}/nodes/${nodeId}.md`
    );
    return {
      content: [{ type: "text", text: content }],
    };
  }

  if (name === "kage_context") {
    const projectDir = String(args?.project_dir ?? "");
    const query = String(args?.query ?? "");
    const limit = Number(args?.limit ?? 5);
    // validate
    const validation = validateProject(projectDir);
    const validationText = validation.ok
      ? "Memory healthy."
      : `Warnings: ${validation.warnings.join("; ")}`;
    // recall (memory + code graph + knowledge graph combined)
    const recallResult = recall(projectDir, query, limit, false);
    // graph facts on top of recall
    const graphResult = queryGraph(projectDir, query, 5);
    const explicitTargets = [...arrayArg(args?.targets), ...filePathHints(query)];
    const changedFiles = arrayArg(args?.changed_files);
    const riskResult = explicitTargets.length || changedFiles.length ? kageRisk(projectDir, explicitTargets, changedFiles) : null;
    const pathHints = filePathHints(query);
    const dependencyResult = wantsDependencyPath(query) && pathHints.length >= 2
      ? kageDependencyPath(projectDir, pathHints[0], pathHints[1])
      : null;
    const reconciliation = kageMemoryReconciliation(projectDir, {
      sessionId: typeof args?.session_id === "string" ? args.session_id : undefined,
      limit: 5,
    });
    const teammateBrief = kageTeammateBrief(projectDir, {
      query,
      targets: explicitTargets,
      changedFiles,
      recallResult,
      riskResult,
      reconciliation,
    });
    const learningLedger = typeof args?.session_id === "string" && args.session_id.trim()
      ? kageSessionLearningLedger(projectDir, { sessionId: args.session_id, limit: 20 })
      : null;
    const sections = [
      recallResult.context_block,
      teammateBrief.context_block,
      learningLedger ? learningLedger.context_block : "",
      graphResult.context_block ? `\n## Graph Facts\n${graphResult.context_block}` : "",
      riskResult ? riskContextBlock(riskResult) : "",
      dependencyResult ? `\n## Dependency Path\n${dependencyResult.summary}${dependencyResult.path.length ? `\nPath: ${dependencyResult.path.join(" -> ")}` : ""}` : "",
      reconciliation.unresolved_count ? `\n## Memory Reconciliation\n${reconciliation.agent_instruction}` : "",
      `\n_${validationText}_`,
    ].filter(Boolean).join("");
    return {
      content: [{ type: "text", text: sections }],
    };
  }

  if (name === "kage_recall") {
    const maxContextTokens = typeof args?.max_context_tokens === "number" ? args.max_context_tokens : undefined;
    const structuralHops = typeof args?.structural_hops === "number" ? args.structural_hops : undefined;
    const result = args?.embeddings
      ? await recallWithEmbeddings(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5), Boolean(args?.explain))
      : recall(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5), Boolean(args?.explain), { maxContextTokens, structuralHops });
    return {
      content: [{ type: "text", text: args?.json || args?.explain ? JSON.stringify(result, null, 2) : result.context_block }],
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

  if (name === "kage_code_graph") {
    const projectDir = String(args?.project_dir ?? "");
    const query = typeof args?.query === "string" ? args.query : "";
    if (query) {
      const result = queryCodeGraph(projectDir, query, Number(args?.limit ?? 10));
      return {
        content: [{ type: "text", text: args?.json ? JSON.stringify(result, null, 2) : result.context_block }],
      };
    }
    const result = buildCodeGraph(projectDir);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
    const result = refreshProject(String(args?.project_dir ?? ""), { full: Boolean(args?.full) });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
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
    const result = prCheck(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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

  if (name === "kage_quality") {
    const result = qualityReport(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_benchmark") {
    const mode = String(args?.mode ?? "project");
    const result = mode === "memory_quality"
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

  if (name === "kage_marketplace") {
    const result = buildMarketplace(String(args?.project_dir ?? ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_org_status") {
    const result = orgStatus(String(args?.project_dir ?? ""), String(args?.org ?? "local"));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === "kage_org_upload_candidate") {
    const result = orgUploadPacket(String(args?.project_dir ?? ""), String(args?.org ?? "local"), String(args?.packet_id ?? ""));
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Created org review candidate: ${result.path}\nApprove explicitly with: kage org review --approve`
            : `Org upload blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  if (name === "kage_org_recall") {
    const result = orgRecall(
      String(args?.project_dir ?? ""),
      String(args?.org ?? "local"),
      String(args?.query ?? ""),
      Number(args?.limit ?? 5)
    );
    return {
      content: [{ type: "text", text: args?.json ? JSON.stringify(result, null, 2) : result.context_block }],
    };
  }

  if (name === "kage_layered_recall") {
    const result = layeredRecall(String(args?.project_dir ?? ""), String(args?.query ?? ""), {
      org: args?.org ? String(args.org) : undefined,
      includeGlobal: Boolean(args?.include_global),
    });
    return {
      content: [{ type: "text", text: args?.json ? JSON.stringify(result, null, 2) : result.context_block }],
    };
  }

  if (name === "kage_global_build") {
    const result = buildGlobalCdnBundle(String(args?.project_dir ?? ""), String(args?.org ?? "local"));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }

  if (name === "kage_promote_public_candidate") {
    const result = createPublicCandidate(String(args?.project_dir ?? ""), String(args?.packet_id ?? ""));
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Created local public-review candidate: ${result.path}\nThis does not publish until a human submits it.`
            : `Promotion blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
    };
  }

  if (name === "kage_export_public_bundle") {
    const result = exportPublicBundle(String(args?.project_dir ?? ""));
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Exported public bundle: ${result.path}\nPackets: ${result.packetCount}`
            : `Public bundle blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
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
  main().catch(console.error);
}
