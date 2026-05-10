# OSS Case Study: 10 gbrain PRs With Kage

This is a real open-source contribution sprint against
[`garrytan/gbrain`](https://github.com/garrytan/gbrain). The goal was not to
sprinkle Kage into PR descriptions. The goal was to use Kage as repo memory
while fixing real issues, then leave maintainers with small, reviewable PRs.

## Result

Opened 10 focused PRs against gbrain:

| Issue | PR | Fix |
|---:|---:|---|
| [#813](https://github.com/garrytan/gbrain/issues/813) | [#818](https://github.com/garrytan/gbrain/pull/818) | Put `--no-recurse-submodules` after the git subcommand where git accepts it. |
| [#713](https://github.com/garrytan/gbrain/issues/713) | [#821](https://github.com/garrytan/gbrain/pull/821) | Return the correct `whoami` transport over stdio MCP. |
| [#799](https://github.com/garrytan/gbrain/issues/799) | [#822](https://github.com/garrytan/gbrain/pull/822) | Stop doctor frontmatter scans from walking `node_modules` and generated dirs. |
| [#709](https://github.com/garrytan/gbrain/issues/709) | [#823](https://github.com/garrytan/gbrain/pull/823) | Add `.astro` to code sync, code chunking, and code-reference paths. |
| [#693](https://github.com/garrytan/gbrain/issues/693) | [#824](https://github.com/garrytan/gbrain/pull/824) | Keep `doctor --json` clean by suppressing implicit progress output. |
| [#485](https://github.com/garrytan/gbrain/issues/485) | [#825](https://github.com/garrytan/gbrain/pull/825) | Honor the documented positional directory for `check-backlinks`. |
| [#486](https://github.com/garrytan/gbrain/issues/486) | [#826](https://github.com/garrytan/gbrain/pull/826) | Fall back to npm package metadata when GitHub releases are unavailable. |
| [#394](https://github.com/garrytan/gbrain/issues/394) | [#827](https://github.com/garrytan/gbrain/pull/827) | Keep `dream --dry-run --json` stdout as a single valid JSON document. |
| [#430](https://github.com/garrytan/gbrain/issues/430) | [#828](https://github.com/garrytan/gbrain/pull/828) | Canonicalize mixed-case slugs before import and chunk writes. |
| [#380](https://github.com/garrytan/gbrain/issues/380) | [#829](https://github.com/garrytan/gbrain/pull/829) | Add `gbrain put --file <path>` and reject unknown shared-op flags early. |

One extra PR, [#819](https://github.com/garrytan/gbrain/pull/819), was opened
for [#806](https://github.com/garrytan/gbrain/issues/806), but another upstream
PR already existed for the same issue. It is intentionally not counted in the
10 above.

## Kage Metrics From The Sprint

Kage indexed the gbrain repo locally:

| Metric | Value |
|---|---:|
| Indexed files | 756 |
| Symbols | 27,572 |
| Imports | 2,899 |
| Calls | 47,136 |
| Tests discovered | 5,364 |
| Indexer coverage | 100% |
| Structural workers | 8 |
| Repo memory packets captured | 12 |
| Memory graph | 274 entities / 352 edges |
| Evidence-backed graph edges | 100% |
| Estimated indexed source tokens | 1,796,180 |
| Typical recalled context | ~1,800 tokens |
| Estimated tokens avoided per recall | ~1,794,380 |

The useful bit is not the raw graph size. The useful bit is that the agent did
not have to reread the full repo for each issue. It recalled the relevant
paths, tests, prior bug fixes, and decisions for the current task.

## How Kage Helped

### #394: JSON output stayed JSON

Query:

```bash
kage recall "issue 394 dream --dry-run --json preamble stdout valid JSON tests" --project /path/to/gbrain
kage code-graph "dream --dry-run --json embed phase stdout" --project /path/to/gbrain
```

Kage pointed at `src/commands/dream.ts`, `src/core/cycle.ts`,
`src/commands/embed.ts`, `test/dream.test.ts`, and the e2e dream tests. The
fix became small: make the embed phase quiet only when `dream` is producing
structured JSON, while leaving standalone `gbrain embed` human output alone.

### #430: Slug corruption had a related memory trail

Query:

```bash
kage recall "mixed-case slug put_page lowercased slug upsertChunks Page not found" --project /path/to/gbrain
```

Kage connected the issue to import and chunk write paths. Later, while checking
another import issue, it recalled this fix again because both bugs lived in the
same slug-canonicalization family. That reduced the chance of fixing only one
surface and missing direct engine calls.

The PR changed:

- `src/core/import-file.ts`
- `src/core/pglite-engine.ts`
- `src/core/postgres-engine.ts`
- `test/pglite-engine.test.ts`

### #380: Agent-facing CLI confusion

Query:

```bash
kage recall "put --file ignored unknown flags should error CLI put command operations tests" --project /path/to/gbrain
kage code-graph "put command --content stdin file flag cli operation importFromContent tests" --project /path/to/gbrain
```

Kage surfaced prior CLI bug memory and the parser/test area. The final PR made
`--file` real for `gbrain put`, added help text, and made unknown shared-op
flags fail before DB connection so wrong intuitive flags do not create empty
or misleading writes.

## What Was Captured Back Into Memory

After each meaningful fix, Kage captured a concise repo-local packet:

- bug cause
- verified fix
- exact files touched
- test commands
- PR and issue evidence
- why the fix should be remembered

Those packets stayed in the gbrain worktree under `.agent_memory/packets/`.
They were not promoted to org/global/public memory. Promotion is intentionally
review-gated.

## Maintainer Setup

Install:

```bash
npm install -g @kage-core/kage-graph-mcp
```

Set up Codex:

```bash
cd your-repo
kage setup codex --project . --write
kage init --project .
kage setup verify-agent --agent codex --project .
```

Set up Claude Code:

```bash
cd your-repo
kage setup claude-code --project . --write
kage init --project .
kage setup verify-agent --agent claude-code --project .
```

Use it during issue work:

```bash
kage recall "the issue or task" --project .
kage code-graph "relevant code path or symbol" --project .
kage learn --project . --type bug_fix --title "What future agents should know" --learning "..."
kage refresh --project .
kage viewer --project .
```

## Why This Matters For Maintainers

Open-source maintainers do not need more drive-by AI PRs. They need contributors
who understand repo context, preserve conventions, run the right tests, and
leave behind useful knowledge for the next person.

Kage helps by making those behaviors concrete:

- Agents start from repo-local memory and code graph context.
- Fixes stay small because the relevant paths and tests are found quickly.
- New learnings are stored as reviewable JSON packets.
- The viewer shows memory, code graph, links, metrics, and evidence.
- Git remains the review boundary.

Kage does not make the agent right by default. It makes the agent less amnesic,
more auditable, and easier to steer.
