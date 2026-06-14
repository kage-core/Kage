<div align="center">

# Kage

### A framework for collaborative agent memory

Open, git-native memory your team's coding agents read and write together.
Every lesson an agent learns becomes a plain file in your repo: versioned in
git, reviewed in the same PR as the code, shared across the whole team. Kage
checks each memory against the code it cites, so deleted and stale knowledge
gets caught instead of misleading the next agent. No API key, no database, no
daemon.

<p>
  <a href="https://kage-core.com/">Website</a>
  ·
  <a href="https://kage-core.com/guide.html">Docs</a>
  ·
  <a href="https://kage-core.com/viewer/">Viewer</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
  ·
  <a href="https://kage-core.com/demo.html"><b>Book a demo</b></a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

🌐 English · [简体中文](translations/README.zh-CN.md) · [日本語](translations/README.ja.md) · [한국어](translations/README.ko.md) · [Español](translations/README.es.md) · [Português (Brasil)](translations/README.pt-BR.md) · [Français](translations/README.fr.md) · [Deutsch](translations/README.de.md) · [हिन्दी](translations/README.hi.md)

**Works with** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · any MCP client

</div>

---

## See what your repo is hiding — 60 seconds, zero setup

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

The **Truth Report** finds duplicate implementations, ghost exports, bus-factor-1
hot files, knowledge voids, and doc lies. On a fresh clone of Express:

```text
Kage Truth Report — express
Scanned 142 files, 3160 symbols, 1 doc file(s)

■ KNOWLEDGE VOID — high churn, zero memory (7, showing top 4)
  • lib/response.js — knowledge void
    390 commits of accumulated decisions, 149 graph edge(s) depending on it —
    and zero memory packets or doc mentions. Agents and new hires fly blind here.
  • lib/application.js — 179 commits x 77 edges, memory packets citing it: 0
  • lib/request.js     — 175 commits x 58 edges, memory packets citing it: 0
  • lib/utils.js       — 107 commits x 35 edges, memory packets citing it: 0
```

Every finding cites `file:line` evidence from *your* code — nothing is generated.

## Receipts, not vibes

Kage keeps a per-repo value ledger and shows you what the memory harness
actually did. `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

Agents relay the same receipt after each recall, and the viewer leads with a
Gains tab fed by the same ledger — every number traceable to a logged event.

## Trust mechanics

An agent acting on wrong memory is worse than one with none. Kage enforces
trust at three points:

1. **Reject on write** — a memory citing files that don't exist in your repo is
   refused. Hallucinated citations never enter storage.
2. **Withhold on recall** — every recall re-verifies cited files. If the
   evidence was deleted, the TTL lapsed, or the memory was reported stale, it is
   suppressed (and shown to you in the viewer, never silently dropped).
3. **Stale-catch at change-time** — `kage pr check` (and `kage staleguard` as a
   pre-commit hook) leads with what your diff just broke:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

And a privacy guarantee on top: wrap anything in `<private>…</private>` and
Kage will never store it — the span is replaced with `[private]` before any
packet or observation touches disk.

The session loop takes care of itself: if the agent never captured anything,
the session's observations are **auto-distilled into pending drafts** at
session end (reviewed by you, never trusted blindly); the next session opens
with a **"previously…" digest** (`kage resume`); the viewer streams memory
events **live** as they happen; and when anything breaks, **`kage repair`**
backs up, fixes, and rebuilds in one command.

### Personal memory & sync

Repo memory follows the repo; personal memory follows *you*. `kage learn
--personal` writes to `~/.kage/memory`: packets may cite the current repo's
files (re-verified on every recall, in any clone) or be citation-free —
allowed only here, and labeled unverifiable. Recall appends them as a clearly
separated, lower-trust `[personal]` section; repo memory always ranks first,
and personal packets never enter pr-check/staleguard/refresh. Sync across
machines with plain git: `kage sync setup --remote <git-url>` once, then
`kage sync` anywhere (pushed/pulled/resolved receipt; conflicts resolve
newest-wins with losers preserved under `~/.kage/memory/conflicts/`).

Prove it on your own repo: `kage benchmark --trust --project .` measures
hallucination rejection, stale exclusion, and live grounding — 100/100.
(Want to watch the reject/withhold loop run live in a sandbox first?
`npx -y @kage-core/kage-graph-mcp demo`.)

### Turn memory into team skills

`kage skills` codifies your durable, verified procedures (runbooks and
workflows) into `.claude/skills/<name>/SKILL.md` files your agents auto-load.
Only grounded, non-stale packets become skills, so a skill never teaches code
that was deleted out from under it. They are plain files: commit them and every
teammate's agent loads the same skills. No cloud, no account, no separate "team
brain" service to log into — the same git remote that carries your code carries
the skills, reviewed in the same PR.

## The numbers

- **18% faster than grep at equal correctness** on real code-navigation tasks
  (N=3 task suite, same agent, same model; reproduce with
  `kage benchmark --project . --compare --task "<task>"`).
- **524 ghost call edges → 0** on Express after import-aware call resolution:
  callees resolve through local scope → imports → package before any name-only
  match, and external-package imports produce no repo edge.
- **Real AST extraction** for Python, Go, Rust, Java, and Ruby via a
  tree-sitter tier (pure WASM, zero native deps) — on Click, 466 methods
  correctly classified where regex extraction found 0.
- **LongMemEval-S retrieval**: 96.17% R@5 / 98.72% R@10 with zero dependencies.

Methodology, commands, and caveats: [docs/BENCHMARKS.md](docs/BENCHMARKS.md).

## Why Kage, when memory tools already exist

Most memory tools ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) keep memory *per-machine or in a cloud you don't own*, so it never
becomes your team's. Kage keeps it as plain files in your repo: it travels with
the code, gets reviewed in the same PR, and every teammate's agent reads the
same memory. On top of that, each memory is checked against the code it cites,
so what the team shares stays grounded as the code moves.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Automatic capture + session-start recall | ✓ | ✓ | via SDK |
| Hallucinated citations **rejected at write time** | ✓ | — | — |
| Stale memory **withheld at recall** (cited files deleted or changed, TTL expired, reported stale) | ✓ | — | — |
| **Diff-time stale-catch** — your change invalidates a memory, you're warned before the PR | ✓ | — | — |
| Memory reviewed in git, same PR as the code (plain files, no DB) | ✓ | SQLite + cloud | hosted API |
| Savings receipts (tokens + $ per recall, value ledger) | ✓ per-packet | token index | — |
| Cross-machine sync | ✓ your own git remote | their cloud | their cloud |
| Codify memory into team `SKILL.md` files agents auto-load | ✓ git-native (`kage skills`) | — | — |
| Truth Report on any repo, zero setup | ✓ | — | — |
| Account / API key required | none | cloud optional | yes |

A memory system that never re-verifies its own claims gets *less* trustworthy
the longer you use it. Kage is the one that ages well.

## Quick start

**One command, inside your repo:**

```bash
npx -y @kage-core/kage-graph-mcp install
```

Then **restart your agent.** That's the whole setup. The one command creates
`.agent_memory/`, builds the code graph, writes the `AGENTS.md` / `CLAUDE.md`
policy that tells agents to use Kage, auto-detects and wires your agents (Claude
Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider), and sets up
`.gitignore` + the packet merge driver. Requires Node.js 18+. No account, no API key.

**Or just ask your agent to set it up.** Paste this into Claude Code, Cursor, or
any coding agent:

> Set up Kage — verified memory for coding agents, https://github.com/kage-core/Kage —
> in this repo: run `npx -y @kage-core/kage-graph-mcp install`, then tell me to restart you.

<details><summary>Other ways (plugin · per-agent · memory-only)</summary>

```bash
# Claude Code / Codex plugin
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage

# wire a single agent (run `kage setup list` for all supported)
kage setup claude-code --project . --write

# memory store only, no agent wiring
kage init --project .

# confirm the harness is live
kage setup verify-agent --agent claude-code --project .
```
</details>

From there it's ambient: the agent recalls grounded memory at task start
(`kage_context`), captures durable learnings as it works (`kage_learn`), and
you review memory in the same PR as the code. `kage refresh` re-grounds after
merges; `kage viewer` shows gains, trust, and what's being withheld.

## The packet lifecycle

Each learning is a **packet**: reviewable JSON in `.agent_memory/packets/`,
git-tracked and diffable.

**capture → cite-check** (reject paths that don't exist) **→ ground**
(fingerprint cited files) **→ recall** (stale memory excluded) **→ refresh**
(re-verify grounding as code changes) **→ update / supersede / retire**.

A packet goes stale when a cited file is missing or changed since verification,
its TTL (365 days) lapsed, or it was reported/deprecated. Stale memory — whether
the cited code was deleted **or changed** — is withheld from recall and listed as
"withheld, reverify" so the agent never acts on it. `kage reverify` restores a
packet whose claim still holds; `kage compact` prunes dead citations and surfaces duplicates;
`kage supersede` records lineage when one memory replaces another.

## Daily commands

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Full CLI and MCP reference: [docs](https://kage-core.github.io/Kage/guide.html).

## Storage

Everything lives in `.agent_memory/`: `packets/` is durable repo memory
(git-tracked JSON); `graph/`, `code_graph/`, `structural/`, and `indexes/` are
rebuildable with `kage refresh`; `reports/` holds the value ledger and health
reports. Capture scans for secrets and PII before writing.

## Development

```bash
cd mcp
npm install
npm test
npm run build
```

## License

GPL-3.0-only. See [LICENSE](LICENSE). Releases before the GPL switch were MIT.
