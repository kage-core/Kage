#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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
  node_count: number;
  top_tags: string[];
  hot_nodes: string[];
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

function scoreMatch(query: string, node: IndexNode): number {
  const terms = query.toLowerCase().split(/\s+/);
  let score = 0;
  const title = node.title.toLowerCase();
  const summary = (node.summary || "").toLowerCase();
  const tags = node.tags.map((t) => t.toLowerCase());

  for (const term of terms) {
    if (title.includes(term)) score += 3;
    if (tags.some((t) => t.includes(term))) score += 2;
    if (summary.includes(term)) score += 1;
  }
  return score;
}

function scoreDomainMatch(query: string, domain: CatalogDomain): number {
  const terms = query.toLowerCase().split(/\s+/);
  return terms.reduce((sum, term) => {
    return sum + domain.top_tags.filter((t) => t.includes(term)).length;
  }, 0);
}

const server = new Server(
  { name: "kage-graph", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "kage_list_domains") {
    const catalog = await fetchJSON<Catalog>(`${BASE_URL}/catalog.json`);
    const lines = Object.entries(catalog.domains)
      .filter(([, d]) => d.node_count > 0)
      .sort(([, a], [, b]) => b.node_count - a.node_count)
      .map(
        ([domain, d]) =>
          `**${domain}** — ${d.node_count} nodes | tags: ${d.top_tags.slice(0, 5).join(", ")}`
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

    // Pick domains to search
    let domainsToSearch: string[];
    if (domainFilter) {
      domainsToSearch = [domainFilter];
    } else {
      domainsToSearch = Object.entries(catalog.domains)
        .filter(([, d]) => d.node_count > 0)
        .map(([name, d]) => ({ name, score: scoreDomainMatch(query, d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter((d) => d.score > 0)
        .map((d) => d.name);

      // Fall back to all non-empty domains if no tag match
      if (domainsToSearch.length === 0) {
        domainsToSearch = Object.entries(catalog.domains)
          .filter(([, d]) => d.node_count > 0)
          .map(([name]) => name);
      }
    }

    // Fetch indexes in parallel
    const indexResults = await Promise.allSettled(
      domainsToSearch.map(async (domain) => {
        const index = await fetchJSON<DomainIndex>(
          `${BASE_URL}/domains/${domain}/index.json`
        );
        return { domain, nodes: index.nodes };
      })
    );

    // Score and rank all nodes
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
        `**Tags:** ${n.tags.join(", ")}`,
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

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
