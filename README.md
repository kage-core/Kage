# Kage v2 — Agent Memory for Claude Code

Kage is a **daemon-free, Claude Code-native agent memory system**. It automatically captures your coding sessions into a searchable knowledge graph that compounds over time — like a team member who remembers everything.

No background process. No external API key. No pip install. Just Claude Code.

---

## How It Works

```
You work in Claude Code
       ↓
Bug fixed / decision made / pattern discovered
       ↓
kage-distiller invoked inline → node written to pending/ immediately
       ↓
kage-memory retrieves it in the SAME session (or any future session)
       ↓
/kage review → approve → committed to git → teammates get it on git pull
       ↓
Share universally with /kage publish → /kage add (anyone)
```

Memory is captured **as you work** — not at session end. The moment Claude fixes a bug or makes a design decision, it saves the insight immediately. That knowledge is available for the rest of the session and every future session.

---

## Install

**Step 1** — Bootstrap (one-time, in your terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/Kage18/Kage/main/install.sh | bash
```

**Step 2** — Complete setup (in Claude Code):
```
/kage-install
```

The curl command drops the `/kage-install` skill. Claude Code then installs everything else — agents, hooks, memory dirs, settings — using its own auth. No pip, no brew, no API keys, no daemon.

---

## Memory Tiers

| Tier | Location | Who sees it | When to use |
|---|---|---|---|
| **Project** | `.agent_memory/` (committed to git) | Whole team via `git pull` | This project's files, APIs, conventions, bugs |
| **Personal** | `~/.agent_memory/` (your machine only) | You across all projects | Tool/framework patterns, Claude Code behavior |
| **Packs** | `~/.agent_memory/packs/` | Anyone who runs `/kage add` | Community knowledge |

**Decision rule:** Does this knowledge expire when you leave the project?
- Yes → project tier
- No → personal tier
- Generic enough to share → publish as a pack

---

## What Gets Captured

Kage captures anything a new team member would need to know:

- **Bugs and fixes**: what broke, why, and the exact fix
- **Architecture**: why things are structured this way, key services, data flows
- **Patterns and conventions**: how auth works, how APIs are called, error handling
- **Setup and deployment**: exact steps, environment variables, scripts
- **External integrations**: third-party API shapes, connection gotchas
- **Design decisions**: choices made and reasoning behind them

---

## Daily Usage

```
/kage review          — approve/reject auto-captured pending nodes
/kage prune           — deprecate outdated nodes
/kage digest          — regenerate SUMMARY.md overview
/kage add <org/repo>  — install a community memory pack
/kage publish         — bundle your nodes as a shareable pack
/kage search <query>  — find community packs in the registry
```

---

## Memory Retrieval

The `kage-memory` sub-agent is invoked by Claude before architectural decisions. It checks `pending/` first (nodes captured earlier this session), then navigates the index hierarchy for approved nodes — without loading everything into context.

```
kage-memory sub-agent → .agent_memory/pending/   ← same-session captures
                       → .agent_memory/index.md
                       → backend/index.md
                       → nodes/matching-node.md   ← returns this only
```

---

## Repository Structure

```
.claude/
├── agents/
│   ├── kage-distiller.md    # Inline memory writer (invoked by main agent mid-session)
│   └── kage-memory.md       # Retrieval sub-agent (3-tier search)
├── skills/
│   ├── kage/SKILL.md        # /kage management skill
│   └── kage-install/SKILL.md  # /kage-install bootstrap
└── kage/
    ├── hooks/
    │   ├── stop.sh            # Stop hook → safety net distillation
    │   └── session-start.sh   # SessionStart hook → injects memory context
    └── kage.json              # Installed packs registry

.agent_memory/
├── index.md              # Root index (domain list)
├── SUMMARY.md            # Compact digest (auto-generated)
├── nodes/                # Approved memory nodes (committed to git)
│   └── <slug>.md
├── pending/              # HITL review queue (gitignored)
├── deprecated/           # Retired nodes
└── <domain>/
    └── index.md          # Domain index
```

---

## Community Packs

Memory packs are plain git repos. Install community knowledge:

```
/kage add kage-registry/nextjs-patterns
/kage add kage-registry/azure-auth-gotchas
/kage add your-company/internal-patterns
```

Publish your own:
```
/kage publish
# → pushes to GitHub, others can /kage add your-org/your-repo
```

---

## vs v1

| | v1 | v2 |
|---|---|---|
| Distillation | Python daemon, polls every 5 min | Inline, fires the moment insight is established |
| LLM | External Gemini/Anthropic API key | Claude Code's own auth |
| Install | `pip install` + LaunchAgent plist | `curl \| bash` + `/kage-install` skill |
| Sharing | None | Pack system + community registry |
| Memory scope | Per-project only | Project + Personal + Community packs |
| Same-session retrieval | No | Yes — pending/ nodes available immediately |
