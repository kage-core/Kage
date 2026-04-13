# Kage

Kage gives Claude Code a persistent memory that compounds over time — across sessions, projects, and your entire team.

Every bug fixed, design decision made, and pattern discovered gets saved to a searchable knowledge graph. Committed to git. Shared with teammates on `git pull`. Extended by a live community graph anyone can contribute to.

No background process. No external API key. No pip install.

---

## The Problem

Every Claude Code session starts from zero. You spend 20 minutes explaining your auth setup, Claude fixes the bug, and next session you explain it again. Your teammate opens the same repo and hits the same issue. Across projects, you rediscover the same framework gotchas.

Kage makes Claude remember — at the project level, across your personal projects, and from a global community of developers who've already hit the same problems.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Claude Code Session             │
│                                             │
│  SessionStart hook                          │
│  → tells Claude which memory tiers exist    │
│                                             │
│  Main Agent                                 │
│    ↓ before any domain-specific decision    │
│  kage-memory sub-agent                      │
│    ├── .agent_memory/pending/   (same session, instant)
│    ├── .agent_memory/           (project tier, git)
│    ├── ~/.agent_memory/         (personal tier, local)
│    └── kage-graph sub-agent     (global graph, live HTTP)
│                                             │
│  Claude fixes bug / makes decision          │
│    ↓ immediately                            │
│  kage-distiller sub-agent                   │
│    → writes node to pending/                │
│    → available for rest of session          │
│                                             │
│  Stop hook (session end)                    │
│  → kage-distiller runs in background        │
│  → catches anything not yet saved           │
└─────────────────────────────────────────────┘
         ↓
  /kage review → approve → nodes/ → git commit
                                         ↓
                               teammates get it on git pull
                                         ↓
                              /kage publish → kage-graph
                                         ↓
                          anyone installs with /kage add
```

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
- Never loads all nodes — always index-first

**Tier 2 — Personal** (`~/.agent_memory/`)
- Same navigation: root index → domain → node
- Cross-project learnings: framework patterns, tool behavior, lessons that follow you everywhere

**Tier 3 — Global graph** (`kage-core/kage-graph`, live HTTP)
- Reached only if Tiers 1–2 found nothing and the task involves a known technology
- The `kage-graph` sub-agent fetches from GitHub's CDN — no API key, no server
- Returns community-validated nodes with scores, freshness signals, and edge citations
- Maximum 6 HTTP calls per query

Result: 3 reads for any project query, regardless of how many nodes exist. Claude gets the right context without loading the entire memory into its context window.

---

## Memory Storage

### Three tiers

| Tier | Location | Shared with | Use for |
|---|---|---|---|
| **Project** | `.agent_memory/` (committed to git) | Whole team on `git pull` | This project's files, APIs, bugs, conventions, decisions |
| **Personal** | `~/.agent_memory/` (your machine only) | You, across all projects | Framework patterns, tool behavior, cross-project lessons |
| **Global** | `kage-core/kage-graph` (GitHub CDN) | Everyone | Community-validated patterns any Claude agent can use |

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
pending: true
---

# Stripe webhook signature fails behind reverse proxy

Stripe validates the raw request body but nginx re-encodes it by default.
Set `proxy_set_header Content-Type application/octet-stream` and disable
body buffering with `proxy_request_buffering off`.
```

### Directory structure

```
.agent_memory/
├── index.md              ← root index: lists domains
├── SUMMARY.md            ← compact digest
├── nodes/                ← approved nodes (committed to git)
│   └── <slug>.md
├── pending/              ← awaiting /kage review (gitignored)
├── deprecated/           ← retired nodes
└── <domain>/
    └── index.md          ← domain index
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

**Step 1 — Bootstrap** (one-time, in your terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/main/install.sh | bash
```

**Step 2 — Complete setup** (inside Claude Code):
```
/kage-install
```

Claude installs everything using its own auth — agents, hooks, memory directories, settings patches. No pip, no brew, no API keys, no daemon.

**What gets installed:**
```
~/.claude/
├── agents/
│   ├── kage-distiller.md     ← inline memory writer
│   ├── kage-memory.md        ← 3-tier retrieval
│   └── kage-graph.md         ← live global graph fetcher
├── skills/
│   ├── kage/SKILL.md         ← /kage management commands
│   └── kage-install/SKILL.md ← bootstrap (already there from curl)
└── kage/
    ├── hooks/
    │   ├── stop.sh            ← session-end safety net
    │   └── session-start.sh   ← injects memory context on start
    └── kage.json              ← installed packs registry

~/.agent_memory/               ← personal memory root
    ├── index.md
    ├── nodes/
    ├── pending/
    └── packs/                 ← community memory packs
```

Plus per-project `.agent_memory/` setup if you're in a git repo, and hooks registered in `~/.claude/settings.json`.

---

## Daily Usage

Claude handles distillation and retrieval automatically. You manage the review cycle:

```
/kage review          — approve or reject pending nodes
/kage prune           — deprecate outdated nodes
/kage digest          — regenerate SUMMARY.md
/kage add <org/repo>  — install a community memory pack
/kage publish         — bundle your nodes as a shareable pack
/kage search <query>  — search the community knowledge graph
```

---

## Team Sharing

Sharing is automatic through git — no extra infrastructure:

1. Claude captures a node → writes to `.agent_memory/pending/`
2. You run `/kage review` → approve → node moves to `nodes/`
3. Commit and push `.agent_memory/` with your normal git workflow
4. Teammate pulls → their Claude session starts with your approved knowledge

---

## Community Packs

Packs are plain git repos containing approved nodes. Install community knowledge:

```
/kage add org/nextjs-patterns
/kage add org/postgres-gotchas
/kage add your-company/internal-runbooks
```

Publish your project's nodes:
```
/kage publish
```

This guides you through creating a `kage-pack.json` and pushing to GitHub. Others can then `/kage add your-org/your-repo`.

---

## Hooks

Two Claude Code hooks power the automatic behavior:

**SessionStart** — fires when a session opens. Reads which memory tiers are available and injects a system message so Claude knows to invoke `kage-memory` before decisions.

**Stop** — fires when a session closes. Launches `kage-distiller` in the background against the full session transcript. The hook exits in under a second; the distiller runs detached. This is a safety net — inline capture during the session is the primary path.

---

## Sub-Agents

**`kage-distiller`** — memory writer. The main agent calls this inline the moment an insight is established. Takes a description of the learning, chooses the right tier, formats and writes the node. Also runs in background mode from the Stop hook.

**`kage-memory`** — memory reader. Navigates the 3-tier index hierarchy to find relevant nodes without loading everything. Returns at most 3 nodes. Delegates to `kage-graph` if Tiers 1–2 have nothing.

**`kage-graph`** — global graph fetcher. WebFetch-only, haiku model, 6-call budget. Fetches `catalog.json`, routes to the right domain index, fetches matching nodes, auto-follows `requires` edges. Returns community knowledge with type badges, scores, and conflict warnings.

---

## Repository

```
.claude/
├── agents/
│   ├── kage-distiller.md
│   ├── kage-memory.md
│   └── kage-graph.md
├── skills/
│   ├── kage/SKILL.md
│   └── kage-install/SKILL.md
└── kage/
    ├── hooks/stop.sh
    └── hooks/session-start.sh

install.sh         ← curl bootstrap
CLAUDE.md          ← copy to your project to enable Kage
kage-pack.json     ← pack metadata
```
