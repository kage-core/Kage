<div align="center">

# Kage

### The agent memory your team can trust and own

Every coding agent now "remembers." Kage is the memory you can **trust**: it
refuses to store hallucinated citations, withholds memory whose evidence was
deleted, and is grounded to your actual code graph — all stored as plain files
your team **reviews in the same PR as the code**. Git-native, local-first, no
API key.

Works with Codex, Claude Code, Cursor, Windsurf, and any MCP agent.

<p>
  <a href="https://kage-core.github.io/Kage/">Website</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Docs</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Viewer</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

![Kage Memory Terminal demo](docs/assets/kage-demo.gif)

</div>

---

## Quick start

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
kage recall "how do I run tests" --project .
```

For Claude Code, `kage setup verify-agent --agent claude-code --project .`
checks the MCP server and the ambient prompt/tool/session hooks, so teammates
do not mistake a partial setup for live automatic memory.
`kage setup doctor --project . --json` exposes the same hook summary for audits.
MCP agents can use `kage_setup_doctor` for that audit too.

Other supported agents: Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose,
Roo Code, Kilo Code, Claude Desktop, Aider, and generic MCP clients
(`kage setup list`).

## Why Kage

Every new agent session asks the same setup questions, scans the same files,
and risks repeating the same mistakes. Kage turns that repo lore into small,
reviewable memory packets that live with the codebase. Agents retrieve only
the relevant slice for the current task instead of rereading the whole repo.

Kage is local-first. No hosted service, external database, or API key is
required for normal use.

### What makes Kage different: trust + governance

Most agent-memory tools optimize for *capturing more*. The hard problem is
trusting what's captured — an agent acting on stale or hallucinated memory is
worse than one with none. Kage is built around that:

- **Validated on write** — a memory citing files that don't exist is rejected.
- **Verified on recall** — memory whose cited files were deleted is silently
  withheld from the agent (and shown to you, never hidden).
- **Grounded to code** — memory links to the code graph; recall can return the
  bounded blast radius of what a change touches.
- **Governed like code** — packets are plain files; review, approve, and merge
  memory in the same pull request as the code it describes.

Prove it on your own repo: `kage benchmark --trust --project .` — it measures
hallucinated-citation rejection, stale-memory exclusion, and live grounding.
See [docs/TRUST.md](docs/TRUST.md).

## What you get

- Repo memory packets (decisions, bug fixes, runbooks, gotchas, conventions,
  code explanations) stored as reviewable JSON.
- Claude Code ambient hooks for prompt-time recall, tool-result observation,
  failure capture, pre-compact/session-end distillation, and stop-time review
  refresh. This makes Kage behave more like live repo memory instead of a
  manual search command.
- A code graph for files, symbols, imports, confidence-scored calls, routes
  (FastAPI / Flask / Django / Rails / Laravel / Spring / Go / Rust / ASP.NET),
  tests, and packages.
- Memory-code links so repo knowledge points at the code it affects.
- Pinned repo context slots for tiny always-relevant guidance that should be
  included before task-specific recall without loading the whole memory graph.
- Local memory-access tracking so Kage can show which memories agents actually
  reuse and recommend what to verify, ground, or clean up, without mutating
  shareable packet files on recall.
- A memory lifecycle report that classifies packets as healthy, hot, cold,
  stale, disputed, ungrounded, pending, or generated, with concrete review
  actions for teammates.
- Linked-file fingerprints on newly captured and diff-derived memory, so
  `kage refresh` can flag those packets when the source code they explain
  changes and ask for an update or superseding packet instead of serving stale
  repo lore.
- Agent memory reconciliation: `kage_context`, Claude Code Stop hooks, and
  `kage pr check` turn linked-code drift into an agent task. The agent must
  update, supersede, or mark stale memory before final handoff instead of
  asking the user to review an inbox.
- A memory timeline that shows recently added, updated, pending, or retired
  repo knowledge before teammate handoff.
- Memory lineage for superseded packets, so agents stop recalling old repo
  lore while humans can still audit what replaced it and why.
- A repo-local memory audit trail for explicit mutations: capture, feedback,
  review, supersede, deprecate, and delete.
- A memory handoff queue that combines inbox, lifecycle, audit, timeline, and
  lineage into the exact actions the next teammate or agent should review.
- A privacy-preserving session replay digest that shows observed agent
  timelines, touched paths, commands, durable candidates, and distill actions
  without exposing raw transcript text.
- Local git intelligence: risk, reviewers, contributor profiles, co-change
  warnings, ownership silos, and module health.
- A project profile report that gives agents a first-page orientation: top
  code+memory concepts, key files, commands, memory focus, and next actions.
- A capability audit that scores repo memory, collaboration/session proof,
  benchmark proof, and dashboard/viewer readiness with evidence and next
  actions.
- A local viewer for memory, code graph, risks, review, and metrics, served
  with conservative browser security headers.
- A daemon REST surface for HTTP-only agents: combined context, recall,
  capture, learn, feedback, observe, distill, setup doctor, and reports all use
  the same repo-local memory packets and graph artifacts as MCP/CLI.
- Review and validation commands for stale or risky memory.

## External benchmarks

Kage includes reproducible external benchmark harnesses in
[`benchmarks/`](benchmarks/). Current LongMemEval-S retrieval result:

| System | R@5 | R@10 | R@20 | MRR | NDCG@10 |
|---|---:|---:|---:|---:|---:|
| Kage strict recall | 96.17% | 98.72% | 99.79% | 0.9094 | 0.9279 |
| Plain BM25 baseline | 96.60% | 98.09% | 99.57% | 0.9033 | 0.9215 |

This measures gold evidence retrieval, not answer-generation accuracy. See
[`benchmarks/LONGMEMEVAL.md`](benchmarks/LONGMEMEVAL.md) for methodology,
commands, and caveats. The headline run disables Kage's built-in semantic
concept expansion so the score is not based on phrase maps added after looking
at LongMemEval-style misses.

The benchmark folder also includes a synthetic memory-scale harness that
measures refresh/index time, recall latency, cross-session hit rate, and context
reduction as repo memory grows. Current local scale run: 5,000 packets indexed
in 20.7s with 373ms median recall, 100% hit rate @10, and 99.83% context
reduction versus loading all memory.

Kage also includes an early MemoryArena context-recall harness. It measures
whether Kage retrieves prior subtask answer memories for later subtasks; it is
not the official MemoryArena task-solving score. Current full 701-task
MemoryArena context-recall run across all five public splits: 99.19% average
dependency coverage and 98.79% final-step dependency coverage.

For coding-agent memory quality, Kage includes a 240-packet labeled benchmark
with runbooks, decisions, bug causes, code explanations, and hard-negative
adjacent notes. Current local result: 100% R@5/R@10, 1.0000 NDCG@10/MRR, 26ms
median recall, and 95.36% context reduction.

The local viewer also writes a benchmark proof ledger. Open `kage viewer` and
check Quality/Benchmark to see the measured result, threshold, exact command,
and next action for coding-memory retrieval, scale sanity, and repo trust gates.

Kage also writes a local sparse-vector packet index to
`.agent_memory/indexes/vector-local.json` during refresh. It keeps recall fast
and inspectable without requiring an external database or embedding service.
The lexical layer is Unicode-aware and adds CJK bigrams, so repo memory written
in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains
searchable without requiring spaces between every word.
If you want dense semantic recall, install the optional embedding package in
the same Node environment as Kage and build a local embedding artifact:

```bash
npm install -g @xenova/transformers
kage embeddings build --project .
kage recall "how do retries work?" --project . --embeddings --explain
```

Dense embeddings are opt-in because they add an optional dependency, may
download a local model, and create a larger rebuildable artifact at
`.agent_memory/indexes/embeddings-local.json`. Normal recall stays
dependency-free.

## Daily commands

```bash
kage recall "how do I run tests" --project .
kage recall "auth token validation" --project . --structural-hops 2 # + 2-hop code blast radius
kage code-graph "auth routes tests" --project .
kage verify --project . # check cited files still exist and memory isn't stale
kage compact --project . --dry-run # prune dead citations; surface duplicates to merge
kage risk --project . --targets src/auth.ts --json
kage capabilities --project . # evidence-backed memory system readiness
kage slots set --project . --label project_context --content "Always run checkout retry tests after touching retry modules." --paths src/retry.ts --tags checkout,tests
kage slots --project . --json
kage learn --project . --learning "Use npm test --prefix mcp after parser changes."
kage sessions --project . # observed sessions and distillation actions
kage replay --project . # privacy-preserving session timeline digest
kage memory-access --project . # hot/cold memories and review actions
kage memory-audit --project . # auditable memory mutations
kage handoff --project . # review queue plus distillable session learnings
kage lifecycle --project . # memory health, freshness, grounding, and feedback
kage timeline --project . # recent memory changes for handoff
kage lineage --project . # current replacements for retired memories
kage supersede --project . --packet <old-id> --replacement <new-id> --reason "why"
kage benchmark --memory-quality # coding-memory retrieval proof
kage benchmark --scale --sizes 240,1000,5000 # large-memory recall proof
kage refresh --project .
kage embeddings build --project . # optional dense local recall
kage pr check --project .
kage viewer --project .
```

For the full CLI and MCP reference, see the [docs](https://kage-core.github.io/Kage/guide.html).

## Storage

Kage writes to `.agent_memory/`. Packets are durable repo memory; everything
else is rebuildable with `kage refresh`.

| Path | Purpose |
|---|---|
| `.agent_memory/packets/` | durable repo memory (JSON, git-tracked) |
| `.agent_memory/graph/` | memory graph (rebuildable) |
| `.agent_memory/code_graph/` | source-derived code facts (rebuildable) |
| `.agent_memory/structural/` | files, symbols, imports (rebuildable) |
| `.agent_memory/slots/` | pinned repo context slots (JSON, git-trackable) |
| `.agent_memory/indexes/` | recall indexes, including optional embeddings (rebuildable) |
| `.agent_memory/audit/` | memory mutation audit trail |
| `.agent_memory/reports/` | profile, capabilities, context-slots, replay, risk, contributors, decisions, module health, workspace, quality, benchmark, handoff, lifecycle, timeline, lineage |
| `AGENTS.md` | agent harness policy |

## Trust model

- Repo memory is git-visible and reviewable.
- Capture scans for obvious secrets and PII before writing packets.
- Org / global / public promotion is explicit and human-gated.
- Public or registry content should be treated as advisory.

## Development

```bash
cd mcp
npm install
npm test
npm run build
node dist/cli.js viewer --project ..
```

## License

GPL-3.0-only. See [LICENSE](LICENSE).

Kage releases before the GPL switch were published under MIT. Future versions
are GPL-3.0-only unless a separate written commercial license says otherwise.
