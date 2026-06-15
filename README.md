<div align="center">

# Kage

### Memory for coding agents you can trust

<img src="docs/kage-viewer.jpg" alt="The kage viewer memory-to-code map: memory packets linked to the code files they are grounded in" width="760">

<sub>The memory ↔ code map in `kage viewer`: every memory packet (purple) linked to the file it is grounded in (blue).</sub>

Your coding agent forgets your codebase every session, so you keep re-explaining it.
**Kage** gives it persistent memory that lives in your repo as plain files, and checks
every memory against your actual code, so the agent never acts on something that is no
longer true. Shared with your whole team through git. No account, no database, no API key.

```bash
npx -y @kage-core/kage-graph-mcp install
```

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/deps-0-41ff8f" alt="zero dependencies">
  <img src="https://img.shields.io/badge/account-not%20required-41ff8f" alt="no account">
</p>

<p>
  <a href="https://kage-core.com/">Website</a> ·
  <a href="https://kage-core.com/guide.html">Docs</a> ·
  <a href="https://kage-core.com/viewer/">Live viewer</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>Book a demo</b></a>
</p>

**Works with** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · any MCP client

🌐 English · [简体中文](translations/README.zh-CN.md) · [日本語](translations/README.ja.md) · [한국어](translations/README.ko.md) · [Español](translations/README.es.md) · [Português (Brasil)](translations/README.pt-BR.md) · [Français](translations/README.fr.md) · [Deutsch](translations/README.de.md) · [हिन्दी](translations/README.hi.md)

</div>

---

## Install

**One command, inside your repo, then restart your agent.** That's the whole setup.

```bash
npx -y @kage-core/kage-graph-mcp install
```

It creates `.agent_memory/`, builds the code graph, writes the `AGENTS.md` / `CLAUDE.md`
policy that tells agents to use Kage, auto-detects and wires your agents, and configures
`.gitignore` + the packet merge driver. Requires Node.js 18+. No account, no API key.

**Or just ask your agent to set it up.** Paste this into Claude Code, Cursor, or any coding agent:

> Set up Kage (verified memory for coding agents, https://github.com/kage-core/Kage)
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

## What is Kage

Kage is a memory layer for coding agents. As your agent works, it captures what it learns
(decisions, bug fixes, conventions, how the code fits together) as small JSON **packets**
committed in your repo under `.agent_memory/`. The next session (yours or a teammate's)
starts already knowing it, instead of re-reading or re-asking.

Two things make it different from other memory tools:

- **It's verified.** Every memory cites the code it's about, and Kage checks those citations
  against your actual files at write time, at recall time, and when a diff changes the code.
  Memory that no longer matches the code is withheld, so the agent never acts on a stale claim.
- **It's git-native.** Memory is plain files in your repo, reviewed in the same PR as the code
  and shared with the whole team through git, not locked in one machine or a vendor's cloud.

## How it works

Once installed, it's ambient. You don't run anything by hand:

1. **Recall before acting.** At the start of a task (and the moment the agent opens a file),
   Kage surfaces the relevant verified memory for it. Stale or deleted memory is left out.
2. **Capture as it works.** Durable learnings become packets. A memory that cites a file
   which doesn't exist is rejected on the spot, so hallucinations never enter storage.
3. **Stay honest as the code moves.** When a diff changes code that a memory cites, that
   memory is flagged at commit/PR time (`kage pr check`) and withheld from recall until it's
   re-verified or replaced, so knowledge can't quietly rot.

Watch it happen in the **local dashboard** (`kage viewer`): packets, the memory↔code graph,
trust gates, and live events stream in as the agent works. Wrap anything in
`<private>…</private>` and it's never stored.

## Why Kage

Most memory tools ([claude-mem](https://github.com/thedotmack/claude-mem),
[agentmemory](https://github.com/rohitg00/agentmemory), mem0, Zep) store memory per-machine
or in a cloud you don't own, and never re-check it against the code. Kage keeps it in your
repo and verifies it, so it stays your team's and stays true as the code changes.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Automatic capture + session-start recall | ✓ | ✓ | via SDK |
| Hallucinated citations **rejected at write time** | ✓ | — | — |
| Stale memory **withheld at recall** (cited files deleted/changed, TTL, reported) | ✓ | — | — |
| **Diff-time stale-catch**, warned before the PR when your change breaks a memory | ✓ | — | — |
| Memory reviewed in git, same PR as the code (plain files, no DB) | ✓ | SQLite + cloud | hosted API |
| Codify memory into team `SKILL.md` files agents auto-load | ✓ (`kage skills`) | — | — |
| Cross-machine sync | ✓ your own git remote | their cloud | their cloud |
| Account / API key required | none | cloud optional | yes |

## Features

- **Truth Report.** `kage scan` reads any repo in ~60s and surfaces its highest-risk
  knowledge gaps: undocumented hot files, untested hot paths, complexity hotspots,
  unresolved code debt, and bus-factor-1 files, plus duplicate implementations, dead
  exports, and doc lies when they exist. Every finding cited to `file:line`. Zero setup,
  nothing generated, runs before you install anything.
- **Savings receipts.** `kage gains` keeps a per-repo value ledger (tokens + $ the agent
  didn't have to re-spend), every number traceable to a logged event; the agent relays it
  after each recall.
- **Team skills.** `kage skills` turns durable, verified procedures into
  `.claude/skills/<name>/SKILL.md` files agents auto-load, committed and shared, no cloud.
- **Personal memory & sync.** `kage learn --personal` keeps cross-machine notes in
  `~/.kage/memory`, recalled as a clearly separated lower-trust section and synced over your
  own git remote.
- **Self-healing session loop.** Uncaptured sessions are auto-distilled into pending drafts
  you review; `kage resume` opens each session with a "previously…" digest; `kage repair`
  fixes broken packets and indexes in one command.

## Benchmarks

- **18% faster than grep at equal correctness** on real code-navigation tasks (N=3 suite,
  same agent/model; reproduce with `kage benchmark --project . --compare`).
- **LongMemEval-S retrieval:** 96.17% R@5 / 98.72% R@10, zero dependencies.
- **Memory Correctness Under Change:** 0% stale-served (memory whose code was deleted or
  changed is withheld), vs 100% for capture-everything stores.
- **Trust benchmark:** 100/100, covering hallucination rejection, stale exclusion, and live
  grounding (`kage benchmark --trust --project .`).

Methodology, commands, and caveats: [docs/BENCHMARKS.md](docs/BENCHMARKS.md).

## Daily commands

```bash
kage recall "how do I run tests" --project .
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Full CLI and MCP reference: [docs](https://kage-core.com/guide.html).

## Storage

Everything lives in `.agent_memory/`: `packets/` is durable repo memory (git-tracked JSON);
`graph/`, `code_graph/`, `structural/`, and `indexes/` are rebuildable with `kage refresh`;
`reports/` holds the value ledger and health reports. Capture scans for secrets and PII
before writing.

## Development

```bash
cd mcp
npm install
npm test
npm run build
```

## License

GPL-3.0-only. See [LICENSE](LICENSE). Releases before the GPL switch were MIT.
