#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  capture,
  catalogDomainNodeCount,
  buildBranchOverlay,
  buildCodeGraph,
  createPublicCandidate,
  createReviewArtifact,
  exportPublicBundle,
  graphMermaid,
  installAgentPolicy,
  kageMetrics,
  learn,
  proposeFromDiff,
  queryCodeGraph,
  queryGraph,
  recall,
  recordFeedback,
  registryRecommendations,
  validateProject,
  type MemoryType,
} from "./kernel.js";

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

const server = new Server(
  { name: "kage-graph", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

export function listTools() {
  return [
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
        "Capture an actual reusable learning from the current session as a pending memory packet. Prefer this over diff proposal when the agent knows what was learned.",
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
        },
        required: ["project_dir", "learning"],
      },
    },
    {
      name: "kage_capture",
      description:
        "Create a pending repo-local Kage memory packet. This proposes memory only; human review is still required before sharing.",
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
        },
        required: ["project_dir", "title", "body"],
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
        "Create or update a branch review summary from local git status and diff metadata. This does not create recallable memory.",
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

  if (name === "kage_recall") {
    const result = recall(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 5));
    return {
      content: [{ type: "text", text: result.context_block }],
    };
  }

  if (name === "kage_graph") {
    const result = queryGraph(String(args?.project_dir ?? ""), String(args?.query ?? ""), Number(args?.limit ?? 10));
    return {
      content: [{ type: "text", text: result.context_block }],
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

  if (name === "kage_metrics") {
    const result = kageMetrics(String(args?.project_dir ?? ""));
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
    });
    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Captured session learning: ${result.path}\nReview with: kage review --project ${args?.project_dir}`
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
    });

    return {
      content: [
        {
          type: "text",
          text: result.ok
            ? `Captured pending packet: ${result.path}\nReview with: kage review --project ${args?.project_dir}`
            : `Capture blocked:\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
        },
      ],
      isError: !result.ok,
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
            ? `Wrote branch review summary: ${result.path}\nChanged files: ${result.changedFiles.join(", ")}`
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
