<div align="center">

# Kage

### Verified repo knowledge for coding agents

Every claim is cited against your current code — and you see exactly what it
saves you. Kage rejects memory that cites files that don't exist, withholds
memory whose evidence was deleted, and warns you the moment your changes
invalidate what your team knows. Plain files in your repo, reviewed in the
same PR as the code. No API key, no database, no daemon.

<p>
  <a href="https://kage-core.github.io/Kage/">Website</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Docs</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Viewer</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

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

## The 30-second trust demo

```bash
npx -y @kage-core/kage-graph-mcp demo
```

```text
1. Hallucinated citation — REJECTED on write:
   ✗ "Use the helper in src/ghost.ts"
     Citation validation failed: none of the referenced paths exist in this repo.

2. Stale memory (cited file deleted) — WITHHELD from recall:
   ⊘ Legacy retry helper is the fallback
     all cited files deleted since capture: src/legacy-retry.ts

3. Recall returns only grounded, current memory:
   ✓ Payments must be idempotent
   ✓ Auth uses jose, not jsonwebtoken
```

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

Capture-everything memory ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) solves *remembering*. Kage solves *trusting what's remembered*:
every memory is checked against the code it cites — when it's written, when
it's recalled, and when your diff changes the code underneath it.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Automatic capture + session-start recall | ✓ | ✓ | via SDK |
| Hallucinated citations **rejected at write time** | ✓ | — | — |
| Stale memory **withheld at recall** (evidence changed/deleted) | ✓ | — | — |
| **Diff-time stale-catch** — your change invalidates a memory, you're warned before the PR | ✓ | — | — |
| Memory reviewed in git, same PR as the code (plain files, no DB) | ✓ | SQLite + cloud | hosted API |
| Savings receipts (tokens + $ per recall, value ledger) | ✓ | token index | — |
| Truth Report on any repo, zero setup | ✓ | — | — |
| Account / API key required | none | cloud optional | yes |

A memory system that never re-verifies its own claims gets *less* trustworthy
the longer you use it. Kage is the one that ages well.

## Quick start

Requires Node.js 18+. One command from inside your repo:

```bash
npx -y @kage-core/kage-graph-mcp install
```

This creates `.agent_memory/`, builds the code graph, auto-detects your agents
(Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider) and
wires them. Or install globally and wire agents one at a time:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

Connect an agent manually instead (one command writes the MCP + hooks config):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Claude Code / Codex users can install the plugin instead:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

Restart the agent once, then confirm the harness is live:

```bash
kage setup verify-agent --agent claude-code --project .
```

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
its TTL (365 days) lapsed, or it was reported/deprecated. Soft-stale (linked
code changed) is flagged for review; hard-stale (evidence gone) is withheld
from recall. `kage compact` prunes dead citations and surfaces duplicates;
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
