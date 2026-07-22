# Kage — repo memory for AI coding agents

Local-first repo memory, code graph, and recall tools for MCP-capable coding
agents (Codex, Claude Code, Cursor, etc.).

Kage helps agents stop rediscovering the same project context. It stores
reviewable repo memory, builds generated recall/code indexes, and exposes the
result through an MCP server plus a CLI.

- Website: https://kage-core.github.io/Kage/
- Docs: https://kage-core.github.io/Kage/guide.html
- Hosted viewer: https://kage-core.github.io/Kage/viewer/

## Install

Requires Node.js 18 or newer. The package installs two binaries: `kage` and
`kage-graph-mcp`.

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage init --project .
kage setup codex --project . --write
# or: kage setup claude-code --project . --write
# restart the agent once
kage setup verify-agent --agent codex --project .
kage context "how do I run tests" --project .
```

Other supported targets: Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose,
Roo Code, Kilo Code, Claude Desktop, Aider, generic MCP (`kage setup list`).

## What you get

- Repo-local memory for decisions, runbooks, bug fixes, gotchas, conventions,
  and code explanations.
- Claude Code ambient hooks for prompt-time recall, tool-result observation,
  failure capture, pre-compact/session-end distillation, and stop-time review
  refresh.
- A code graph for files, symbols, imports, confidence-scored calls, routes
  (FastAPI / Flask / Django / Rails / Laravel / Spring / Go / Rust / ASP.NET),
  tests, and packages.
- Memory-code links so repo knowledge points at the code it affects.
- Local git intelligence: risk, reviewers, contributors, co-change warnings,
  ownership silos, module health.
- Conservative cleanup review input (unreferenced files, unused exports,
  internal-looking unused symbols). Never deletes code.
- A local viewer for memory, code graph, risks, review, and metrics, served
  with conservative browser security headers.
- Local memory-access tracking in `.agent_memory/reports/memory-access.json`
  so agents can learn which memories are reused and recommend what to verify,
  ground, or clean up without changing shareable packet files on every recall.
- Memory lifecycle reporting in `.agent_memory/reports/lifecycle.json` so
  teammates can review healthy, hot, stale, disputed, ungrounded, pending, and
  generated packets with concrete actions.
- Memory timeline reporting in `.agent_memory/reports/timeline.json` so
  handoffs show recently added, updated, pending, and retired repo knowledge.
- Memory lineage reporting in `.agent_memory/reports/lineage.json` so
  superseded packets point at the current replacement memory agents should use.
- Memory audit reporting in `.agent_memory/audit/events.jsonl` and
  `.agent_memory/reports/memory-audit.json` so memory mutations are reviewable.
- Memory handoff reporting in `.agent_memory/reports/handoff.json` so the next
  teammate or agent gets one queue across inbox, lifecycle, audit, timeline,
  lineage, and distillable session learnings.
- Project profile reporting in `.agent_memory/reports/profile.json` so agents
  get a compact orientation across repo shape, top concepts, key files,
  commands, memory focus, and next actions.
- Capability audit reporting in `.agent_memory/reports/capabilities.json` so
  teams can see evidence-backed readiness across memory, collaboration,
  benchmark proof, and dashboard/viewer proof.
- Pinned context slots in `.agent_memory/slots/slots.json` so teams can review
  tiny always-relevant repo guidance that Kage includes before task-specific
  recall.
- Session replay digest in `.agent_memory/reports/replay.json` so teams can
  review observed agent timelines, paths, commands, durable candidates, and
  distill actions without exposing raw transcript text.
- A viewer benchmark proof ledger that shows measured results, thresholds,
  exact commands, and next actions for retrieval, scale, and repo trust gates.

No hosted service, external database, or API key is required.

## Common commands

```bash
kage context "how do I run tests" --project .   # validate + recall + code graph in one call
kage code-graph "auth routes tests" --project .
kage risk --project . --targets src/auth.ts --json
kage profile --project . --json
kage capabilities --project . --json
kage slots set --project . --label project_context --content "Always run retry tests after changing retry modules." --paths src/retry.ts --tags retry,tests
kage slots --project . --json
kage learn --project . --learning "Use npm test after parser changes."
kage sessions --project . # observed sessions and distillation actions
kage replay --project . # privacy-preserving observed-session timeline
kage memory-access --project . # hot/cold memories and review actions
kage memory-audit --project . # auditable memory mutations
kage handoff --project . # combined teammate/agent handoff queue
kage lifecycle --project . # memory health, freshness, grounding, and feedback
kage timeline --project . # recent memory changes for handoff
kage lineage --project . # current replacements for retired memories
kage supersede --project . --packet <old-id> --replacement <new-id> --reason "why"
kage benchmark --memory-quality # coding-memory retrieval proof
kage benchmark --scale --sizes 240,1000,5000 # large-memory recall proof
kage refresh --project .
kage embeddings build --project . # optional dense local recall
kage hook install --project .
kage pr check --project .
kage viewer --project .
```

Full CLI surface: `kage help --all`. Two guides cover the rest:

- **[Using Kage](https://github.com/kage-core/Kage/blob/master/docs/USING_KAGE.md)** — the practical
  manual: setup, the proxy, daily use, team workflow, troubleshooting, and a command map by intent.
- **[How it works](https://github.com/kage-core/Kage/blob/master/docs/HOW_IT_WORKS.md)** — the
  mechanism: delivery channels, proxy modes and cache safety, what is stored and what is refused,
  the trust model, and how recall ranks.

MCP agents should start with `kage_context`. When the query or target list
mentions file paths, it also includes risk and dependency-path context.

Normal recall is local and dependency-free. For repos that need denser semantic
matching, install `@xenova/transformers` in the same Node environment as Kage,
then run `kage embeddings build --project .`. The default lexical layer is
Unicode-aware and adds CJK bigrams for memory written without spaces. Dense
embeddings write an optional rebuildable
`.agent_memory/indexes/embeddings-local.json` artifact, and
`kage recall "query" --project . --embeddings --explain` uses it. (`recall` is
deprecated in favour of `context`, but still owns `--embeddings` and `--explain`, which
`context` does not accept.)

For stale or wrong memory:

```bash
kage feedback --project . --packet <packet-id> --kind stale
kage gc --project . --dry-run
```

For the full CLI and MCP reference, see the [docs](https://kage-core.github.io/Kage/guide.html).

## MCP server

```bash
kage setup codex --project . --write
kage setup claude-code --project . --write
kage setup generic-mcp --project .
```

`kage setup claude-code --write` installs the MCP server plus SessionStart,
UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and
SessionEnd hooks. The hooks observe reusable work signals, inject relevant
repo memory on new prompts, and distill durable learnings before compaction or
handoff.

`kage setup verify-agent --agent claude-code --project .` checks those hooks,
not only the MCP config. If a teammate has the server configured but missing
ambient hooks, verification reports the missing events and tells them to rerun
setup.

`kage setup doctor --project . --json` also includes the Claude hook summary,
so teams can audit partial installs before relying on automatic capture.
MCP agents can call `kage_setup_doctor` for the same audit without shelling out.

## REST daemon

HTTP-only agents can use the same memory system through the local daemon:

```bash
kage daemon start --project .
curl -X POST http://127.0.0.1:3111/kage/context \
  -H 'content-type: application/json' \
  -d '{"query":"how does auth work?","limit":5}'
```

Useful endpoints:

- `POST /kage/context` - combined recall, graph facts, validation, risk, and dependency context.
- `POST /kage/recall` - repo memory recall.
- `POST /kage/capture` and `POST /kage/learn` - write durable repo memory.
- `POST /kage/feedback` - mark recalled memory helpful, wrong, or stale.
- `POST /kage/observe` and `POST /kage/distill` - session observation and durable learning distillation.
- `GET /kage/replay` - privacy-preserving session replay digest without raw transcript text.
- `GET /kage/setup-doctor` - supported-agent setup and Claude hook readiness.
- `GET /kage/profile` - compact project profile for agent orientation.
- `GET /kage/capabilities` - evidence-backed memory system readiness across memory, collaboration, benchmarks, and viewer proof.
- `GET /kage/context-slots`, `POST /kage/context-slots`, `DELETE /kage/context-slots/:label` - pinned repo context slots.
- `GET /kage/metrics`, `/kage/quality`, `/kage/inbox`, `/kage/benchmark`, `/kage/handoff`, `/kage/lifecycle`, `/kage/timeline`, `/kage/lineage`, `/kage/memory-audit` - human and agent review reports.

## Storage

Kage writes to `.agent_memory/`. Packets are durable repo memory; everything
else is rebuildable with `kage refresh`.

| Path | Purpose |
|---|---|
| `.agent_memory/packets/` | durable repo memory |
| `.agent_memory/graph/` | memory graph (rebuildable) |
| `.agent_memory/code_graph/` | source-derived code facts (rebuildable) |
| `.agent_memory/structural/` | files, symbols, imports |
| `.agent_memory/slots/` | pinned repo context slots |
| `.agent_memory/indexes/` | recall indexes, including optional embeddings |
| `.agent_memory/reports/` | profile, capabilities, context-slots, replay, risk, contributors, decisions, module health, workspace, quality, benchmark, handoff, lifecycle, timeline, lineage |

Repo-local packets are git-visible and reviewable. Generated indexes and
graphs are rebuildable.

## Viewer

```bash
kage viewer --project .
```

The local viewer loads graph artifacts plus `.agent_memory/reports/*.json`.
It opens with a dashboard for repo readiness, memory coverage, graph health,
risks, review, and workspace links, then jumps to focused Graph, Memory,
Risks, and Review pages. Use it when you need to:

- Inspect what agents recall and why.
- Check risk before editing shared files.
- Find repo lore by file, feature, bug, command, or decision.
- Clear the review queue before handoff.

Hosted demo: https://kage-core.github.io/Kage/viewer/

## Development

```bash
npm install
npm test
npm run build
npm pack --dry-run
```

## License

GPL-3.0-only.
