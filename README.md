# Kage

Kage gives Claude Code a persistent memory that compounds over time — across sessions, projects, and your entire team.

Every bug fixed, design decision made, and pattern discovered gets saved to a searchable knowledge graph. The repo indexer scans your entire codebase on install, so Claude starts every session already knowing your architecture, schema, routes, and conventions — without reading a single file. Committed to git. Shared with teammates on `git pull`. Extended by a live community graph anyone can contribute to.

No background process. No external API key. No pip install.

---

## Repo-Recall MVP

Kage now includes a TypeScript repo-recall kernel in `mcp/`.

### Codex one-command setup

From the repo you want Kage to remember, ask Codex:

```text
Set up Kage in this repo. Run the official Codex installer:
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/codex-setup.sh | bash
```

Codex can execute that command itself. The installer clones/updates Kage under
`~/.kage/Kage`, builds the MCP package, adds the Kage stdio server to
`~/.codex/config.toml`, and runs `kage init` for the current repo. Restart Codex
afterward so the new MCP server is loaded.

If you already cloned Kage locally:

```bash
/path/to/Kage/codex-setup.sh --project /path/to/your/repo
```

The lower-friction future path is a hosted/deep-link installer that asks Codex
for approval and runs this same script. For now, the one-command shell installer
is the most reliable cross-platform path for Codex because MCP servers still
need local config.

```bash
cd mcp
npm install
npm run build

# First-run setup for any repo
kage init --project /path/to/repo

# Repair or install the Codex agent policy
kage policy --project /path/to/repo

# Recall repo-local memory
kage recall "how do I run tests" --project /path/to/repo

# Mark recalled memory helpful, wrong, or stale
kage feedback --project /path/to/repo --packet <approved-packet-id> --kind helpful

# Inspect or query the repo-local knowledge graph
kage branch --project /path/to/repo
kage metrics --project /path/to/repo
kage code-graph --project /path/to/repo
kage code-graph "routes and tests" --project /path/to/repo
kage graph --project /path/to/repo
kage graph --project /path/to/repo --mermaid
kage graph "test command" --project /path/to/repo

# Capture actual session learning
kage learn --project /path/to/repo --learning "Decision: use kage_learn for discoveries; diff proposal is only a fallback."

# Update branch review summary from local git changes
kage propose --project /path/to/repo --from-diff

# Generate a Markdown review artifact for pending memory
kage review-artifact --project /path/to/repo

# Export sanitized public candidates as a static bundle
kage export-public --project /path/to/repo

# Recommend docs, skills, and optional MCPs for this stack
kage registry --project /path/to/repo

# Check health
kage doctor --project /path/to/repo
```

The kernel stores canonical memory packets in `.agent_memory/packets/*.json`,
generates disposable indexes in `.agent_memory/indexes/`, migrates legacy
Markdown nodes, builds typed memory graph artifacts in `.agent_memory/graph/`,
builds source-derived multi-language code graph artifacts in
`.agent_memory/code_graph/`, and
exposes MCP tools:

- `kage_recall`
- `kage_code_graph`
- `kage_metrics`
- `kage_graph`
- `kage_graph_visual`
- `kage_learn`
- `kage_capture`
- `kage_feedback`
- `kage_install_policy`
- `kage_branch_overlay`
- `kage_validate`
- `kage_registry_recommend`
- `kage_review_artifact`
- `kage_propose_from_diff`
- `kage_promote_public_candidate`
- `kage_export_public_bundle`

### Codex

Build the MCP package, then add the local stdio MCP server to Codex:

```toml
[mcp_servers.kage]
command = "node"
args = ["/absolute/path/to/Kage/mcp/dist/index.js"]
```

After restarting Codex, agents can call `kage_recall` for repo context,
`kage_code_graph` for source flow and dependency context,
`kage_metrics` to report graph coverage and readiness,
`kage_capture` to create pending memory, `kage_propose_from_diff` to update
branch review summaries, and
`kage_registry_recommend` to discover relevant docs, skills, and optional MCPs.
This MVP does not auto-install MCP servers or auto-publish memory.

For Kage to feel automatic in Codex, `kage init` installs an `AGENTS.md` policy
that tells Codex to validate, recall, query the graph, capture reusable
learnings, query code flow when relevant, and update branch review summaries
without the user prompting for each step.
MCP exposes the tools; `AGENTS.md` makes the agent use them as a harness.

The intended capture order is:

1. `kage_learn` for actual session discoveries.
2. End-of-task learning summaries via `kage_learn`.
3. `kage_propose_from_diff` only as a branch review summary. It no longer
   creates recallable memory.

---

## The Problem

Every Claude Code session starts from zero. You spend 20 minutes explaining your auth setup, Claude fixes the bug, and next session you explain it again. Your teammate opens the same repo and hits the same issue. Across projects, you rediscover the same framework gotchas.

Kage makes Claude remember — at the project level, across your personal projects, and from a global community of developers who've already hit the same problems.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Claude Code Session                    │
│                                                          │
│  SessionStart hook                                       │
│  → tells Claude which memory tiers exist                 │
│  → reports indexed node count from kage-indexer          │
│                                                          │
│  Main Agent                                              │
│    ↓ before any domain-specific decision                 │
│  kage-memory sub-agent                                   │
│    ├── .agent_memory/pending/   (same session, instant)  │
│    ├── .agent_memory/           (project tier, git)      │
│    ├── ~/.agent_memory/         (personal tier, local)   │
│    └── kage-graph sub-agent     (global graph, live HTTP)│
│                                                          │
│  Claude fixes bug / makes decision                       │
│    ↓ immediately                                         │
│  kage-distiller sub-agent                                │
│    → writes node to pending/                             │
│    → available for rest of session                       │
│                                                          │
│  Stop hook (session end)                                 │
│  → kage-distiller runs in background                     │
│  → catches anything not yet saved                        │
└──────────────────────────────────────────────────────────┘
         ↓
  /kage review → approve → nodes/ → git commit
                                         ↓
                               teammates get it on git pull
                                         ↓
                              /kage submit → kage-core/kage-graph PR
                                         ↓
                          live on CDN for everyone, no install needed
```

---

## Repo Indexer

Run `/kage index` once (or on install) and Claude knows your entire codebase.

The `kage-indexer` agent explores the full directory tree, reads actual code — not just filenames — and creates compressed knowledge nodes for every meaningful domain it finds. The set of nodes is not fixed; it depends entirely on what's in your repo.

**What gets indexed** (dynamically discovered, not a hardcoded list):

| Domain | Example node |
|---|---|
| Project overview | What it is, how to run it, key commands |
| Tech stack | Runtime, framework, key deps, scripts |
| Environment config | All env vars and what each does |
| Data layer | Schema, models, relations, migrations |
| Auth system | Strategy, token flow, middleware, session storage |
| API routes | All endpoints, HTTP methods, auth requirements |
| Business logic | Domain services, core workflows |
| Background jobs | Queue system, workers, job types |
| External integrations | Stripe, SendGrid, S3, AI — connection patterns and gotchas |
| Caching layer | Redis, what's cached, TTLs |
| Real-time / WebSocket | Event types, channels, auth |
| Monorepo packages | Each package gets its own node |
| Testing conventions | How tests are structured, fixtures, patterns |
| Deployment / infra | Docker, CI/CD, services, ports |

A 5-file script gets 2–3 nodes. A large monorepo might get 15+.

### Connections and Architecture Graph

After writing domain nodes, the indexer maps how they connect to each other and writes an `architecture-graph.md` node containing:

- **Mermaid diagram** — the full system rendered as a graph: clients, services, databases, queues, external APIs, and all the edges between them
- **Data flows** — the 2–3 most important request paths described in plain English
- **Architectural boundaries** — where API ends, where async begins, how layers communicate
- **Node map** — table of all domain nodes for quick navigation

Each domain node also has a `## Connections` section listing verified relationships with other nodes (`uses`, `called-by`, `reads`, `writes`, `triggers`, `integrates`). Only connections seen in actual imports and calls are listed.

```
/kage index          — index this repo (skips if already indexed)
/kage index --force  — re-index from scratch
/kage index status   — show what's indexed, when, and node count
```

### Incremental Updates

The PostToolUse hook watches writes to key files (`schema.prisma`, `package.json`, route files, middleware, `.env.example`). If any change during a session, they're queued. At the next SessionStart, Claude is notified to re-run `/kage index --force` for the affected domains.

---

## How Memory Is Captured

Capture happens in two ways:

**Inline (primary)** — the main Claude agent calls `kage-distiller` directly the moment it establishes something worth saving. No waiting for the session to end. The node is in `pending/` immediately and available for the rest of the session.

**Background safety net** — the Stop hook fires when the session closes and runs `kage-distiller` against the full transcript to catch anything that wasn't captured inline. The hook exits immediately; the distiller runs detached in the background.

Both paths write to `pending/`. Nothing is auto-approved. Every node goes through `/kage review` before it commits.

---

## How Memory Is Retrieved

The `kage-memory` sub-agent is invoked by Claude before architectural decisions. It searches three tiers in order, stopping as soon as 2+ relevant nodes are found:

**Tier 1 — Project** (`.agent_memory/`)
- Checks `pending/` first — nodes from earlier in the same session are immediately useful
- Navigates `index.md` → domain index → specific node files
- Index entries carry one-line hooks ("JWT, 15min token, bcrypt, /api/auth/*") so the agent decides relevance without opening files
- Never loads all nodes — always index-first

**Tier 2 — Personal** (`~/.agent_memory/`)
- Same navigation: root index → domain → node
- Cross-project learnings: framework patterns, tool behavior, lessons that follow you everywhere

**Tier 3 — Global graph** (`kage-core/kage-graph`, live HTTP)
- Reached only if Tiers 1–2 found nothing and the task involves a known technology
- The `kage-graph` sub-agent fetches from GitHub's CDN — no API key, no server
- Returns community-validated nodes with scores, freshness signals, and edge citations
- Maximum 6 HTTP calls per query

Result: 3 reads for any project query, regardless of how many nodes exist.

---

## Memory Storage

### Three tiers

| Tier | Location | Shared with | Use for |
|---|---|---|---|
| **Project** | `.agent_memory/` (committed to git) | Whole team on `git pull` | This project's files, APIs, bugs, conventions, decisions |
| **Personal** | `~/.agent_memory/` (your machine only) | You, across all projects | Framework patterns, tool behavior, cross-project lessons |
| **Global** | `kage-core/kage-graph` (live HTTP, no install) | Everyone | Community-validated patterns any Claude agent fetches on demand |

**Decision rule — "Does this knowledge expire when I leave the project?"**
- Yes → project tier
- No → personal tier
- Generic enough that strangers would benefit → contribute to the global graph

### Node format

```markdown
---
title: "Stripe webhook signature fails behind reverse proxy"
category: framework_bug
tags: ["stripe", "webhooks", "nginx"]
paths: "backend"
date: "2026-04-13"
source: "kage-distiller"
connections:
  - slug: "api-routes"
    rel: "called-by"
    note: "webhook endpoint defined in api-routes"
pending: true
---

# Stripe webhook signature fails behind reverse proxy

Stripe validates the raw request body but nginx re-encodes it by default.
Set `proxy_set_header Content-Type application/octet-stream` and disable
body buffering with `proxy_request_buffering off`.

## Connections

- **api-routes** (`called-by`): webhook endpoint `/api/webhooks/stripe` defined there
```

### Directory structure

```
.agent_memory/
├── index.md              ← root index: lists domains
├── SUMMARY.md            ← compact digest
├── nodes/                ← approved nodes (committed to git)
│   ├── architecture-graph.md   ← Mermaid diagram + data flows
│   └── <slug>.md
├── pending/              ← awaiting /kage review (gitignored)
├── deprecated/           ← retired nodes
└── <domain>/
    └── index.md          ← domain index with one-line hooks
```

---

## Global Knowledge Graph

The third tier is a live, community-maintained graph at [kage-core/kage-graph](https://github.com/kage-core/kage-graph). It holds knowledge generic enough to be useful to anyone — not project-specific.

Five node types:

| Type | What it captures | Token limit |
|---|---|---|
| `gotcha` | One failure mode: symptom → cause → fix | 200 |
| `pattern` | Multi-step implementation blueprint with working code | 500 |
| `config` | Version-locked configuration that must be exactly right | 300 |
| `decision` | Architectural trade-off: X over Y and why | 400 |
| `reference` | Dense lookup table: error codes, API shapes, CLI flags | 400 |

Nodes are scored by community votes + usage. Stale nodes (past TTL) are automatically penalized. Everything is served as static files over GitHub's CDN — no backend, no API key, no rate limits.

Contribute a node: open a PR to `kage-core/kage-graph`. CI validates schema, detects conflicts, rebuilds indexes on merge.

### MCP server

Use kage-graph from Claude Desktop, Cursor, Windsurf, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "kage-graph": {
      "command": "npx",
      "args": ["@kage-core/kage-graph-mcp"]
    }
  }
}
```

No install beyond `npx`. Tools exposed: `kage_search`, `kage_fetch`, `kage_list_domains`.

---

## What Gets Captured

Anything a new team member would need to know to work effectively:

| Category | Examples |
|---|---|
| **Bugs and fixes** | What broke, why, the exact fix with method names and config keys |
| **Architecture** | Why things are structured this way, key services, data flows, boundaries |
| **Patterns and conventions** | How auth works in this repo, how APIs are called, error handling |
| **Setup and deployment** | Exact steps, environment variables, non-obvious commands |
| **External integrations** | Third-party API shapes, auth flows, webhook gotchas |
| **Design decisions** | Choices made and why — especially the non-obvious ones |

The filter: *would a new team member need to know this to work effectively?* Default to saving. Human review is the quality gate.

---

## Install

One command:

```bash
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/install.sh | bash
```

Or paste the URL into Claude Code and say "install Kage" — Claude reads the install script and executes each step using its own tools. No curl needed.

**What gets installed:**

```
~/.claude/
├── agents/
│   ├── kage-distiller.md     ← inline memory writer
│   ├── kage-memory.md        ← 3-tier retrieval
│   ├── kage-graph.md         ← live global graph fetcher
│   └── kage-indexer.md       ← codebase scanner + graph builder
├── skills/
│   ├── kage/SKILL.md         ← /kage management commands
│   └── kage-install/SKILL.md ← bootstrap skill
└── kage/
    ├── hooks/
    │   ├── stop.sh               ← session-end safety net
    │   ├── session-start.sh      ← injects memory context + update check
    │   ├── post-tool-use.sh      ← watches key file writes for re-index queue
    │   └── user-prompt-submit.sh ← enforces kage-memory usage
    └── distill.log               ← background distiller run log

~/.agent_memory/               ← personal memory root
    ├── index.md
    ├── nodes/
    └── pending/
```

Plus per-project `.agent_memory/` setup if you're in a git repo, and all four hooks registered in `~/.claude/settings.json`.

### Upgrades

Kage checks for updates weekly at session start. When a new version is available:

```
Kage update available: 1.0.0 → 1.1.0. Run /kage update to upgrade.
```

```
/kage update   — download and apply latest version
```

---

## Daily Usage

Claude handles distillation and retrieval automatically. You manage the review cycle:

```
/kage review                — approve or reject pending nodes
/kage prune                 — deprecate outdated nodes
/kage digest                — regenerate SUMMARY.md
/kage index                 — index this repo's codebase
/kage index --force         — re-index from scratch
/kage index status          — show what's indexed and node count
/kage submit <file>         — contribute a node to the global graph
/kage search <query>        — search the global knowledge graph
/kage search --local <q>    — search local project + personal nodes
/kage fetch <domain/id>     — fetch a specific node from the global graph
/kage update                — upgrade to the latest version
```

---

## Team Sharing

Sharing is automatic through git — no extra infrastructure:

1. Claude captures a node → writes to `.agent_memory/pending/`
2. You run `/kage review` → approve → node moves to `nodes/`
3. Commit and push `.agent_memory/` with your normal git workflow
4. Teammate pulls → their Claude session starts with your approved knowledge

---

## Contributing to the Global Graph

When a node you've approved locally is generic enough to help others, contribute it:

```
/kage submit .agent_memory/nodes/my-node.md
```

This validates the node against the global schema, adds the required fields (`type`, `id`, `score`, `ttl_days`), and opens a PR to `kage-core/kage-graph`. Once merged, any Claude agent running Kage anywhere in the world can find it — no install needed on the consumer side.

---

## Hooks

Four Claude Code hooks power the automatic behavior:

**SessionStart** — fires when a session opens. Reads which memory tiers are available, how many indexed nodes exist, and injects a system message so Claude knows to use `kage-memory`. Also checks for Kage updates weekly.

**Stop** — fires when a session closes. Launches `kage-distiller` in the background against the full session transcript. The hook exits in under a second; the distiller runs detached. Safety net — inline capture during the session is the primary path.

**PostToolUse** — fires after every file write. Watches for changes to key files (`schema.prisma`, `package.json`, routes, middleware, `.env.example`). Queues changed files for re-indexing at the next session.

**UserPromptSubmit** — fires before every user message. When a project has indexed memory, reminds Claude to use `kage-memory` before answering domain-specific questions.

---

## Sub-Agents

**`kage-distiller`** — memory writer. The main agent calls this inline the moment an insight is established. Takes a description of the learning, chooses the right tier, formats and writes the node. Also runs in background mode from the Stop hook.

**`kage-memory`** — memory reader. Navigates the 3-tier index hierarchy using one-line hooks to find relevant nodes without loading everything. Returns at most 3 nodes. Delegates to `kage-graph` if Tiers 1–2 have nothing.

**`kage-graph`** — global graph fetcher. WebFetch-only, 6-call budget. Fetches `catalog.json`, routes to the right domain index, fetches matching nodes, auto-follows `requires` edges. Returns community knowledge with type badges, scores, and conflict warnings.

**`kage-indexer`** — codebase scanner. Explores the full directory tree, reads actual code, and writes compressed knowledge nodes for every meaningful domain. Builds a `architecture-graph.md` node with a Mermaid diagram, data flows, and cross-node connection mapping.

---

## Repository

```
.claude/
├── agents/
│   ├── kage-distiller.md
│   ├── kage-memory.md
│   ├── kage-graph.md
│   └── kage-indexer.md
├── skills/
│   ├── kage/SKILL.md
│   └── kage-install/SKILL.md
└── kage/
    ├── hooks/stop.sh
    ├── hooks/session-start.sh
    ├── hooks/post-tool-use.sh
    └── hooks/user-prompt-submit.sh

mcp/                   ← @kage-core/kage-graph-mcp (npm)
install.sh             ← one-command bootstrap
VERSION                ← current version
CLAUDE.md              ← copy to your project to enable Kage
```
