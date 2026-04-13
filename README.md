# Kage — Agent Memory for Claude Code

Kage gives Claude Code a persistent memory that compounds over time. Every bug fixed, design decision made, and pattern discovered gets saved to a searchable knowledge graph — committed to git so your whole team benefits automatically.

No background process. No external API key. No pip install.

---

## The Problem

Every Claude Code session starts from zero. You spend 20 minutes explaining your auth setup to Claude, it fixes the bug, and next session you explain it again. Your teammate opens the same repo and hits the same issue. Claude reinvents the same patterns on every project.

Kage solves this by making Claude remember — at the project level, across your personal projects, and across the community.

---

## How It Works

```
You work in Claude Code
        │
        ▼
Claude fixes a bug / makes a decision / discovers a pattern
        │
        ▼
kage-distiller (sub-agent) writes a memory node to pending/ immediately
        │
        ▼
kage-memory (sub-agent) retrieves it in the same session and every future session
        │
        ▼
/kage review → approve → node committed to git → teammates get it on git pull
        │
        ▼
/kage publish → others install with /kage add → community learns from it
```

Memory is captured **as you work** — the moment Claude establishes something worth knowing. That knowledge is available for the rest of the session and every future session, for you and your team.

---

## Memory Storage

### Three tiers

| Tier | Where | Who sees it | When to use |
|---|---|---|---|
| **Project** | `.agent_memory/` in your repo (committed to git) | Whole team on `git pull` | This project's files, APIs, bugs, conventions, decisions |
| **Personal** | `~/.agent_memory/` on your machine | You, across all projects | Framework patterns, Claude Code behavior, cross-project lessons |
| **Community** | `~/.agent_memory/packs/` (installed packs) | Anyone who runs `/kage add` | Published knowledge anyone can install |

**The decision rule:** "Does this knowledge expire when I leave the project?"
- Yes → project tier (committed, team-visible)
- No → personal tier (stays on your machine)
- Generic enough that strangers would benefit → publish as a pack

### Node format

Each memory node is a markdown file with YAML frontmatter:

```markdown
---
title: "Stripe webhook signature fails behind reverse proxy"
category: framework_bug
tags: ["stripe", "webhooks", "nginx"]
paths: "backend"
date: "2026-04-13"
---

# Stripe webhook signature fails behind reverse proxy

Stripe validates the raw request body but nginx re-encodes it by default.
Set `proxy_set_header Content-Type application/octet-stream` and disable
body buffering with `proxy_request_buffering off`.
```

Nodes go through a `pending/` → `nodes/` review cycle. Nothing is auto-committed.

### Directory structure

```
.agent_memory/
├── index.md              ← root index: lists domains
├── SUMMARY.md            ← compact digest (regenerated with /kage digest)
├── nodes/                ← approved nodes (committed to git)
│   └── <slug>.md
├── pending/              ← awaiting review (gitignored)
├── deprecated/           ← retired nodes
└── <domain>/
    └── index.md          ← domain index: lists nodes in this path
```

---

## Memory Retrieval

Claude invokes `kage-memory` before making architectural decisions. It navigates the index hierarchy — never loading everything into context.

```
kage-memory sub-agent
    │
    ├── .agent_memory/pending/        ← same-session captures (available immediately)
    ├── .agent_memory/index.md        ← find matching domain
    │   └── backend/index.md          ← find matching nodes
    │       └── nodes/auth-setup.md   ← return only this
    │
    ├── ~/.agent_memory/index.md      ← personal tier (same navigation)
    │
    └── kage-graph sub-agent          ← community knowledge graph (live, HTTP)
```

**Same-session retrieval**: nodes written 5 minutes ago are in `pending/` and retrievable in the same session — no restart needed.

**Index navigation**: Claude never does a full scan. It reads the root index, picks the relevant domain, reads that domain's index, then fetches the specific node. 3 reads for any query regardless of how many nodes exist.

**Community graph**: the `kage-graph` agent fetches live knowledge from `raw.githubusercontent.com/kage-memory/graph/main` — a community-maintained repository of validated patterns, gotchas, and decisions across 10 technology domains. No API key. Pure HTTP GET.

---

## What Gets Captured

Anything a new team member would need to know to work effectively:

| Category | Examples |
|---|---|
| **Bugs and fixes** | What broke, why, the exact fix including method names and config keys |
| **Architecture** | Why things are structured this way, key services, data flows, boundaries |
| **Patterns and conventions** | How auth works in this repo, how APIs are called, error handling approach |
| **Setup and deployment** | Exact steps, environment variables, non-obvious commands |
| **External integrations** | Third-party API shapes, auth flows, webhook gotchas |
| **Design decisions** | Choices made and why — especially non-obvious ones |

The filter: *would a new team member need to know this to work effectively?* Default to saving. Human review is the quality gate.

---

## Install

**One-time bootstrap** (copies the `/kage-install` skill to Claude Code):
```bash
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/main/install.sh | bash
```

**Complete installation** (run inside Claude Code):
```
/kage-install
```

Claude Code installs everything itself using its own auth — agents, hooks, memory directories, settings patches. No pip, no brew, no API keys, no daemon to register.

**What gets installed:**
```
~/.claude/agents/
├── kage-distiller.md     ← inline memory writer
├── kage-memory.md        ← 3-tier retrieval agent
└── kage-graph.md         ← community graph fetcher

~/.claude/skills/
├── kage/SKILL.md         ← /kage management commands
└── kage-install/SKILL.md ← bootstrap (already there from curl)

~/.claude/kage/hooks/
├── stop.sh               ← session-end safety net
└── session-start.sh      ← injects memory context on start

~/.agent_memory/          ← personal memory root
```

Plus hooks registered in `~/.claude/settings.json` and per-project setup if you're in a git repo.

---

## Daily Usage

```
/kage review          — approve or reject pending nodes
/kage prune           — deprecate outdated nodes
/kage digest          — regenerate SUMMARY.md overview
/kage add <org/repo>  — install a community memory pack
/kage publish         — bundle your nodes as a shareable pack
/kage search <query>  — search the community knowledge graph
```

Claude automatically invokes `kage-distiller` mid-session and `kage-memory` before decisions — you don't manage those directly.

---

## Team Sharing

Memory sharing is automatic via git:

1. Claude captures a node → writes to `.agent_memory/pending/`
2. You run `/kage review` → approve → node moves to `.agent_memory/nodes/`
3. You commit and push `.agent_memory/` as part of normal git workflow
4. Teammate pulls → their Claude Code session starts with your approved knowledge

No extra infrastructure. No sync service. The repo is the memory.

---

## Community Packs

Packs are plain git repos containing approved nodes. Install published knowledge:

```
/kage add org/nextjs-patterns
/kage add org/postgres-gotchas
/kage add your-company/internal-runbooks
```

Publish your own project's nodes:
```
/kage publish
# guides you through creating kage-pack.json and pushing to GitHub
# others can then /kage add your-org/your-repo
```

---

## Repository Contents

```
.claude/
├── agents/
│   ├── kage-distiller.md     ← sub-agent: writes memory nodes inline
│   ├── kage-memory.md        ← sub-agent: 3-tier retrieval
│   └── kage-graph.md         ← sub-agent: live community graph queries
├── skills/
│   ├── kage/SKILL.md         ← /kage skill implementation
│   └── kage-install/SKILL.md ← /kage-install bootstrap
└── kage/
    ├── hooks/
    │   ├── stop.sh            ← fires on session end
    │   └── session-start.sh   ← fires on session start
    └── kage.json              ← installed packs registry

install.sh                     ← curl bootstrap
CLAUDE.md                      ← project memory rules (copy to your project)
```
