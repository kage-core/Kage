# Changelog

## v2.5.0 — scan hardening, ambient recall, capture quality

- **`kage scan` hardened for big repos and monorepos.** Removed the
  O(files×symbols) per-file pass and the O(S²) symbol merge in the code-graph
  build; added a file-count ceiling (`KAGE_MAX_SCAN_FILES`, default 25k) and a
  git-history cap (`KAGE_SCAN_MAX_COMMITS`, default 8k), both with visible
  warnings. Verified clean and fast on 60k-file repos (kubernetes,
  DefinitelyTyped). Line counts now match `wc -l`; duplicate/ghost evidence no
  longer double-prints the declaration keyword; generated files
  (`zz_generated.*`, `*.pb.go`, …) and same-symbol-across-API-version-dir
  duplicate noise are excluded; a one-off scan no longer leaves a
  `.agent_memory/` behind in a repo that didn't have one.
- **Coverage-aware untested detection.** "Untested hot path" reads real
  `lcov.info` / Istanbul `coverage-final.json` when present (measured line %),
  falling back to the import heuristic per file only when there's no coverage.
- **Ambient top-of-task recall + visible savings.** New `kage prompt-context`
  returns recall plus a one-line savings receipt; wired to `UserPromptSubmit`
  on both the install path and the marketplace plugin. SessionStart now injects
  the team's pinned, always-on memory, not just policy text.
- **Recall precision.** The popularity prior can no longer float an off-domain
  packet to the top; raw transcript / serialized-tool-output packets are
  filtered from recall and blocked at capture (title and body, every path).
- **Cleaner capture.** Observation fields are capped at ingestion so a giant
  pasted command or tool dump can't bloat the log or the resume digest.
- **CI dogfood gate.** `npm test` also runs the agent-trajectory replay eval
  plus a recording-freshness check, so the agent-behavior loop fails CI on
  regression.

## v2.3.0 - the trust axis, completed

- **Memory-vs-memory contradiction detection.** A new packet that contradicts
  an approved one about the same file is surfaced at write time (`kage
  conflicts`, `kage_conflicts`, `--strict-contradictions`). Conservative,
  cue-based, no LLM — the third verification guard alongside write-time
  citation rejection and recall-time stale withholding.
- **Docs search.** `kage docs-search` / `kage recall --docs` / `kage_docs_search`
  index the repo's own committed docs (README, docs/**, *.md) for
  heading-anchored retrieval.
- **Three more agent platforms:** OpenClaw, Copilot, Hermes (`kage setup`).
- **`kage layers`.** Surfaces Kage's hierarchical memory: L0 raw observations,
  L1 reviewed packets, L2 synthesis (repo maps, change summaries).

## Unreleased

- **Symbol-anchored staleness — edits stop invalidating unrelated memory.**
  Freshness fingerprints were whole-file SHA-256, so any edit to a large file
  (e.g. the 19k-line `mcp/kernel.ts`) marked *every* memory citing it stale,
  even memories about untouched parts. Fingerprints now also anchor to the
  specific symbols a memory names: at capture (and reverify) each cited TS/JS
  file records per-symbol content hashes for the symbols mentioned in the
  memory's title/summary/body, resolved by name (not line number, so moving a
  symbol does not trip it). Content-change staleness — in recall, `kage pr check`,
  and the stale-catch invalidation list — now fires only when an anchored symbol
  is edited or removed; an unrelated edit in the same file leaves the memory
  fresh. Non-TS files and memories that name no symbol keep the whole-file policy.
  Backward compatible: existing whole-file fingerprints behave as before until a
  packet is next captured or reverified.
- **Contradiction detector precision fix (786 phantom conflicts -> 0).** The
  memory-vs-memory contradiction check was flagging any two packets that shared a
  cited path and **two generic tokens** (the `subjectOverlap < 2` bypass), then
  firing on the mere presence of a negation-ish word ("removed", "deprecated",
  "never") in one body but not the other. On this repo that produced 786 false
  "contradictions" between unrelated decisions that merely touched the same file.
  Now the two packets must be near paraphrases of the same **distinctive** subject
  (jaccard >= 0.5 over title/summary tokens with English + house-style words like
  "kage"/"mcp"/"memory" removed); the token-count bypass is gone. Genuine
  "use X" vs "do not use X" contradictions are still caught. Cleared the stale
  `quality.contradicts` flags the old detector had stamped onto packets.
- **`kage scan` actually finds things now.** The Truth Report's original five
  detectors (duplicates, ghost exports, bus-factor, knowledge void, doc lies)
  were tuned so strict that on most real repos only the tautological "knowledge
  void" fired — the report read as "found nothing". Added three detectors that
  reliably surface real, cited signal on any codebase: **untested hot paths**
  (central, churned files no test imports or targets), **complexity hotspots**
  (oversized files many things depend on), and **known debt** (TODO/FIXME/HACK/
  deprecation markers concentrated in code). The headline now leads with what was
  found; categories that come back clean are reported as reassurance ("Clean:
  no duplicate implementations …") instead of a wall of leading zeros.
- **Enforced recall-before-edit (PreToolUse Edit/Write/MultiEdit hook).** Before
  an agent modifies a file, Kage now injects the verified memory about that file
  (and what it's withholding as stale) — so recall precedes every change instead
  of relying on the agent to remember. Like the Read hook, it's CLI-only
  (`kage file-context`), so it works even when the MCP server isn't loaded.
  Closes the seam where agents (this one included) skip recall under task pressure.
- **One-command setup, nothing left to do by hand.** `kage install` now also
  writes the `AGENTS.md`/`CLAUDE.md` policy unconditionally (so teammates who
  clone are covered even before wiring their own agent), and configures
  `.gitignore` + the packet merge driver itself — no more manual `git config`
  line. Site and README lead with the single command + restart, with everything
  else collapsed, and add an "or just ask your agent to set it up" path: paste a
  one-line prompt and the coding agent installs Kage itself.
- **Strict recall: content-changed memory is now withheld, not just flagged.**
  Previously a memory whose cited file's content changed was served with a "may be
  stale" flag; now it is excluded from recall (and from skills and the suppressed
  report), exactly like deleted/expired/reported-stale memory. The recall context
  block lists what was withheld and why, with the `kage reverify` command to
  restore it — so it is visible, not silent. The "Memory Correctness Under Change"
  benchmark goes from ~50% to **0% stale-served** (40 seeded, 26 mutated, only the
  14 untouched served). Compaction still treats content-change as reverify-needed,
  not auto-deprecation.
- **Core surface refined by eval evidence (now 11 agent tools).** The
  agent-trajectory eval showed a real agent naturally reaches for `kage_risk`,
  `kage_decisions`, `kage_dependency_path`, and `kage_docs_search` on ordinary
  tasks, so they joined the always-loaded core. `kage_code_graph` was **deleted**:
  asked "who calls X," the agent greps and never touches it, and `kage_context`
  already answers caller/dependency queries. Capability unchanged; the dead tool
  is gone (full registry 67 → 66).
- **All-tools coverage test.** `mcp/tool-coverage.test.ts` seeds a fixture and
  invokes every registered MCP tool through the real `callTool` path, asserting
  each is wired and returns content (network-CDN tools are asserted-registered,
  not called offline). Catches orphaned/broken handlers across the whole 67-tool
  surface, not just the agent-facing core.
- **Smaller default agent tool surface (67 → 7).** The MCP server now exposes
  only the agent-facing core by default — `kage_context`, `kage_learn`,
  `kage_supersede`, `kage_feedback`, `kage_pr_check`, `kage_refresh`,
  `kage_skills` — the verbs an agent actually uses in the loop. Operator and
  diagnostic tools stay reachable via the CLI or `KAGE_TOOLS=full`. With the MCP
  server set to `alwaysLoad` (as `kage setup` writes), a 7-tool core is cheap to
  load upfront, so the agent sees the tools immediately and skips the per-call
  ToolSearch round-trip the trajectory recordings exposed — verified: the
  recall-before-edit recording went from a ToolSearch before every kage call to
  zero, with `kage_context` as the agent's first action. No capability removed;
  nothing deleted.
- **Lifecycle trajectory + Markov-chain tests.** `mcp/trajectory.test.ts` walks
  a packet through its full state machine (pending → approved → soft-stale ⇄
  fresh → hard-stale → deprecated, plus superseded and skills) entirely through
  the public API, asserting every transition and the safety invariants after each
  hop (withheld memory is never recalled or turned into a skill). Black-box
  regression coverage for the whole flow.
- **`kage skills` — git-native team skills.** Codifies durable, verified
  procedures (runbooks and workflows) into `.claude/skills/<name>/SKILL.md`
  files agents auto-load. Only grounded, non-stale, non-payload packets become
  skills, so a skill never teaches deleted code. Plain files committed with the
  repo and reviewed in the same PR — the git-native answer to cloud "team brain"
  tools, with no account or hosted store. Also `kage_skills` (MCP) and `--dry-run`.
- **Memory-vs-memory contradiction detection.** Kage already validates citations
  at write and withholds stale memory at recall; this adds a third guard. When a
  new packet is captured that contradicts an existing approved one — same cited
  path, same subject, opposing claim ("use X" vs "do not use X", "is idempotent"
  vs "is not idempotent") — Kage surfaces it instead of silently storing two
  conflicting facts. The detector (`detectContradictions`) is conservative
  (favors precision): it requires a shared cited path, high title/summary
  similarity (reusing the duplicate-detection jaccard scorer), and an opposing
  polarity signal from a small negation/replacement cue set. Mere duplicates
  (same claim, same polarity) are not flagged — that stays compact's job.
  - `kage capture` / `kage learn` run detection and, by default, still write the
    packet but flag it `quality.contradicts: [ids]` and print
    "⚠ This contradicts N existing memories …". Pass `--strict-contradictions`
    to refuse the write and exit 2 instead.
  - New `kage conflicts --project <dir> [--json]` lists all contradicting packet
    pairs in the repo, receipt-style.
  - New `kage_conflicts` MCP tool returns the same report.
  - `kage pr check` surfaces unresolved contradictions as a warning (not a hard
    fail); recall notes a served packet as "⚠ Contested" when it carries
    `quality.contradicts`.
  - `kage supersede` clears the contradiction flag from the involved packets (and
    any other packet that listed them), so resolving a conflict removes it.
- **Docs search index.** Kage now builds a searchable index over the repo's
  OWN committed documentation (README, `docs/**`, `*.md`, and common doc
  directories — including any framework/API docs checked into the repo). Each
  doc is split into heading-anchored chunks and written to
  `.agent_memory/indexes/docs-index.json`, kept current through `kage index`
  and `kage refresh`. Recall can now answer from docs, not just learned memory
  packets and code. This indexes only files on disk in the project — never the
  internet.
  - `kage docs-search "<query>" --project <dir> [--limit <n>] [--json]` prints
    ranked doc hits with `doc:line` and the heading path.
  - `kage recall --docs` appends a "Docs" section (≤3 hits) to recall output.
  - New MCP tool `kage_docs_search`; `kage_recall` gains a `docs` flag.

## v2.2.7 - end-to-end audit fix

- **Fix: `kage risk` listed non-source files.** When inferring targets from the
  working tree, risk now keeps only files the code graph knows about — memory
  packets, dotfiles, and docs no longer show up as "risks". Explicit
  `--targets` are always honored. Found by a full command-surface audit on a
  real Express clone.

## v2.2.6 - Truth Report duplicate detector, de-noised

- **Fix: duplicate-cluster false positives.** The detector flagged every
  class's `__init__`/`__repr__` and convention-named closures (decorator,
  wrapper) as "duplicate implementations." Now: methods are excluded (same-name
  methods across classes are normal polymorphism), dunders and idiomatic
  closure names are denied, and a matching signature is required — not just a
  shared name. On Flask this dropped 11 clusters to 1 true positive
  (`_make_timedelta`, genuinely defined twice).
- **Dropped the unfounded "likely AI-era" tag.** A recent commit date doesn't
  prove AI authorship; findings now read "[recently changed]".

## v2.2.5 - honest empty reports

- **Scan's empty report stops flattering small repos.** A repo with under 30
  files or no git history now gets "these signals have little to work with"
  plus the memory-loop pitch, instead of "unusually well distributed". The
  next-steps header reads "Next:" when there are no findings ("Fix the void:"
  only when there's a void to fix).

## v2.2.4 - first-stranger fixes

- **Fix: scan crashed on permission-locked directories.** The file walkers now
  skip unreadable entries (macOS `~/.Trash`, chmod-locked folders) instead of
  dying with EPERM. Found by a real first run.
- **Home-directory guard.** `kage scan` pointed at `$HOME` now explains itself
  and asks for a repo path instead of crawling everything you own.
- **Runnable error hints.** Every `Try:` remediation now uses the full
  `npx -y kage-graph-mcp ...` form, so npx users are never told to run a
  binary they don't have. EPERM-class errors get their own hint.
- **Unscoped alias `kage-graph-mcp` on npm.** Social sites auto-link
  `@kage-core` as a mention and mangle the command; the alias forwards to the
  scoped package so posted commands paste clean.

## v2.2.3 - scan ends where install begins

- **Fix: scan's next steps stranded npx users.** The Truth Report ended by
  telling users to run `kage init` — a binary npx users don't have, and the
  wrong next step since `install` exists. Scan now bridges directly:
  one install command, what happens after, and where the receipt shows up.

## v2.2.2 - the demo earns the click

- **`kage demo` rebuilt as a live experiment.** The output now narrates what
  actually happens (create files → capture → try a hallucinated citation →
  REFUSED → delete a cited file → recall WITHHOLDS it), drops the confusing
  standalone trust score, and — when run inside a git repo — ends by scanning
  the runner's OWN repo with a Truth Report teaser. Next steps now point at
  the one-command install.
- **Fix: doc-lie false positives on `../` links.** The Truth Report resolved
  doc path claims only against the repo root, so links relative to the doc's
  own directory (e.g. `docs/X.md` citing `../benchmark/README.md`) were flagged
  as lies. A path claim now counts as a lie only if it resolves neither
  root-relative nor doc-relative. Found by the new demo on our own repo.

- **`kage reverify --packet <id>` — re-verify instead of supersede-churn.**
  When code a memory cites changes but the memory's claim is still true,
  reverify refreshes its grounding in place: re-checks cited paths, recomputes
  fingerprints, stamps `last_verified_at`/`reverified_at`, and clears stale
  flags. Refuses when all cited evidence is gone (that memory needs supersede
  or stale, not a rubber stamp). The reconciliation instruction now offers it
  as the first option for still-true memories — ending the same-packet
  supersede churn the Stop hook produced on hot files.

## v2.2.1 - sync works on identityless machines

- **Fix: `kage sync` on machines without a git identity (CI, fresh Linux).**
  The convergence rebase in `kage sync setup` now carries the same
  `kage-sync` identity fallback as commits, and a non-fast-forward push
  self-heals with one fetch + rebase retry. Failed pushes report a repo-state
  snapshot. Found by our own CI: the two sync tests passed on macOS and failed
  on the runner.


## v2.2.0 - parity and beyond: sync, signal, and the audit wedge

- **Personal memory (`kage learn --personal`) + `kage sync`.** Cross-machine
  personal packets live in `~/.kage/memory/packets` (override the store root
  with `$KAGE_HOME`). Personal packets may cite the current project's files —
  validated and fingerprinted like repo memory, re-verified against the local
  checkout on every recall in any clone — or be citation-free, which is
  allowed ONLY for personal packets and labeled "unverifiable" on recall; in
  strict (CLI/agent) mode, repo `kage learn` without `--paths` is now
  rejected with a pointer to `--personal`. Repo recall appends a clearly
  separated, lower-trust "Personal Memory" section (max 3 packets, every line
  tagged `[personal]`); repo memory always ranks first and personal packets
  never enter pr-check/staleguard/refresh flows or recall `results`.
  `kage sync setup --remote <git-url>` initializes `~/.kage/memory` as a git
  repo wired to a private remote (idempotent; re-runs update the URL; a
  second machine converges on the remote's branch). `kage sync` commits local
  packet changes, pulls `--rebase`, and pushes, printing a
  `pushed N, pulled M, resolved K` receipt; packet conflicts auto-resolve
  newest-`updated_at`-wins with the losing version preserved under
  `~/.kage/memory/conflicts/<name>.<unix-ts>.json` (never lost, never
  conflict-markered). `kage sync --status` reports ahead/behind/dirty with
  fetch as the only network access; missing setup or network failures exit 2
  with the git error.
- **Auto-distill low-signal quality gate.** New exported pure function
  `observationSignalScore(observation)` returns a 0..1 signal score, and
  auto-distill (`kage distill --auto`, the Stop-hook fallback) now requires
  observations to score at least `AUTO_DISTILL_SIGNAL_THRESHOLD` (0.4) before
  they may seed a pending draft. Hard rejects (score 0): raw JSON or
  key-value/punctuation noise, hook and system payloads (`task-notification`,
  `tool-use-id`, `system-reminder`, `hookSpecificOutput`, ...), echoes of
  Kage's own output (Truth Report headers, demo proof lines, value-receipt
  fields), flag-token dumps (`isImage false noOutputExpected false ...`), and
  fragments under 50 chars. Positive signal: imperative/causal language
  (fixed, because, use, instead, run), file path citations, code identifiers,
  and command lines. `observe` now tags below-threshold events with
  `low_signal: true` at ingestion so distill skips them cheaply, and auto
  `DistillResult`s report the gated count as `skipped_low_signal`. Manual
  `kage learn`/`kage capture` and manual `kage distill` are never gated —
  explicit intent outranks the heuristic. This stops real-world junk packets
  like raw `<task-notification>` payloads, tool-result JSON fields, and demo
  output from ever becoming memory drafts.
- **Quiet refresh on non-default branches.** `kage refresh` (and `kage_refresh`)
  no longer persists metadata-only packet rewrites (stale flags, `updated_at`,
  fingerprint recomputation) when the current git branch is not the default
  branch (detected via `origin/HEAD`, falling back to local `master`/`main`).
  Staleness is still computed in memory — stale findings are reported and
  recall withholding keeps working — but unchanged packets stay byte-identical
  on disk, so concurrent branches stop conflicting on
  `.agent_memory/packets/*.json`. Content changes (e.g. pruned grounding
  paths) are still written, and `--force` restores full rewrites anywhere.
  Refresh results now include `quiet_refresh`.
- **`kage merge-packet <ours> <base> <theirs>` git merge driver.** Resolves
  packet JSON conflicts automatically using the git merge-driver convention
  (`%A %O %B`: result written to the ours path, exit 0 on success, exit 1 to
  leave the conflict). v1 policy is whole-file newest-wins by `updated_at`,
  reusing repair's conflict resolution; sides that carry committed conflict
  markers are recovered via the same splitter, and garbage input exits 1.
  `kage init` and `kage install` now write an idempotent `.gitattributes`
  entry (`.agent_memory/packets/*.json merge=kage-packet`) and print the
  one-liner to enable it per clone:
  `git config merge.kage-packet.driver "npx -y @kage-core/kage-graph-mcp merge-packet %A %O %B"`.
- **Timeline-as-index in `kage resume`.** Resume output now ends with a
  "Recent memory" section: one compact line per recent packet
  (`[id-prefix] type title (age)`) for the newest 15 packets, summaries only
  for the newest 3, hard-capped at ~800 estimated tokens. The structured
  report gains a `recent_memory` array. Shown only when packets exist.
- **`kage_workflow` MCP pseudo-tool.** A no-op tool whose description (and
  response) teaches the kage loop — kage_context first, work, kage_learn for
  reusables, kage_refresh after file changes, kage_pr_check before finishing —
  plus `<private>` tags and recall-receipt savings, so agents learn the
  workflow just by listing tools.

- **`kage audit-claude-mem` — truth report over a claude-mem store.** One
  read-only command that audits an existing claude-mem user's memory
  (`~/.claude-mem/claude-mem.db`, or `--store <path>`) against the current
  repo. Each observation's cited files (`files_read`/`files_modified`) are
  classified as VERIFIED (paths exist and unchanged since capture), DRIFTED
  (cited file changed after capture), GONE (cited file no longer exists), or
  UNCITED (no file citations — unverifiable by construction), using a single
  git-history pass with mtime fallback. Prints a Truth-Report-style receipt
  with worst offenders; `--json` emits the full classification. Reads via the
  built-in `node:sqlite` module (Node 22+) with a `sqlite3` CLI fallback — no
  new dependencies, and the store is never written to.
- **Per-packet discovery cost (`discovery_tokens`).** Captures now store the
  approximate token cost of producing the knowledge (exploration + reasoning)
  under `quality.discovery_tokens`. Caller-reported via `kage_learn`
  `discovery_tokens` / `kage learn --discovery-tokens <n>`; when omitted, a
  conservative per-type default is stored (bug_fix/gotcha 8000, decision 4000,
  others 2000) and flagged `discovery_tokens_estimated: true`. Auto-distilled
  packets estimate it from the session's observation material.
- **Knowledge replay receipts.** Recall receipts now report
  `max(read-vs-source, sum(discovery_tokens of served packets) − context cost)`
  — savings never drop below the previous estimate and never go negative. The
  value ledger tracks `replay_tokens` per served recall and `kage gains` prints
  a "Knowledge replay value" line (discovery cost of served memories vs their
  compressed read cost).
- **`kage file-context --project <dir> --path <file> [--json]`.** Returns up to
  three currently-verified packets (citations checked, not stale — same
  staleness machinery as recall) that cite the given file, as a ≤20-line
  context block; prints nothing when none qualify. Non-empty results record a
  value-ledger event.
- **PreToolUse(Read) memory injection for Claude Code.** `kage setup
  claude-code --write` installs `~/.claude/kage/hooks/kage-read-context.sh`
  plus a `PreToolUse` hook with matcher `Read`: just before the agent reads a
  file, verified memory citing that file is injected as `additionalContext`.
  Defensive by design — skips files outside the project, skips uninitialized
  repos, dedups to one injection per file per session via a `/tmp` state file,
  and never blocks the Read. Mirrored in `plugin/hooks/kage-read-context.sh`
  with a `PreToolUse` entry in `plugin/hooks/hooks.json`.

## v2.1.0 - the session loop closes itself

- **Automatic capture fallback (`kage distill --auto`).** The Claude Code Stop
  hook now quietly distills the session's observations when the agent never
  called `kage_learn`: drafts are written to the pending inbox (never approved
  memory), tagged `auto-distill`, and excluded from recall until reviewed with
  `kage review`. Auto mode is silent on empty sessions and skips sessions that
  already produced memory packets; it never blocks the hook.
- **Session continuity (`kage resume`).** New CLI command prints a compact
  (≤15-line) "previously…" digest — last session's observations, distilled
  learnings, latest change-memory packet, pending auto-distilled draft count,
  and unresolved reconciliation items. Prints nothing when there is no prior
  session data. The SessionStart hook appends it to the injected memory policy
  so new sessions start warm.
- **`kage repair` — one-command recovery.** Detects and fixes the breakage
  users actually hit, printing a receipt of every step (fixed / skipped /
  failed): unparseable packet JSON is backed up to
  `.agent_memory/backup/<name>.broken`, merge conflicts are auto-resolved
  keeping the newest side when it parses (otherwise the packet is removed
  loudly, backup kept); missing or stale indexes are rebuilt; leftover
  `*.tmp`/`*.lock` files and dead daemon `status.json` are cleaned; agents that
  were already wired but lost their hook scripts get the write path re-run
  (repair never wires new agents).
- **Remediation-first errors.** Any uncaught CLI failure now prints the error
  message plus a single copy-pasteable `Try:` command (`kage init` / `kage
  repair` / `kage index` / `kage doctor`) chosen from the error text
  (`remediationFor()`); exit code unchanged.
- **Doctor cross-link.** `kage doctor` ends with
  "Something broken? kage repair --project ." when validation fails.
- **`<private>` privacy tags.** Wrap anything in `<private>…</private>` and
  Kage will never store it: spans (case-insensitive, multiline, and unclosed
  tags to end-of-input) are replaced with `[private]` before any packet or
  observation is written — applied across `capture`, `learn`, `observe`, and
  the distill pipeline that feeds from them.

## v2.0.2 - one-shot install + plugin hooks

- **`kage install` — one-shot setup.** `npx -y @kage-core/kage-graph-mcp install`
  now runs init + index, auto-detects installed agents (Claude Code, Codex,
  Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider) by config-dir presence,
  wires the writable ones, and prints a receipt. `--agents a,b`, `--no-agents`,
  `--json` supported.
- **Claude Code plugin upgraded.** `/plugin marketplace add kage-core/Kage` now
  ships hooks (SessionStart policy injection + Stop-time refresh/reconcile
  gate) and slash commands (`/kage:scan`, `/kage:gains`, `/kage:init`) alongside
  the MCP server. Plugin manifest validates with `claude plugin validate`.
- **README/site:** quick start leads with the one-command install; new honest
  comparison table (Kage vs claude-mem vs mem0/Zep) centered on verification.

## v2.0.0 - verified repo knowledge, receipts, and the Truth Report

The 2.0 release reframes Kage around one story: every claim cited against your
current code, and you see exactly what it saves you. (PRs #56–#65.)

### New

- **`kage scan` — the Truth Report** (#63). Zero-setup, ~60-second shock report
  on any repo: duplicate implementations (AI-era flagged), grep-proof ghost
  exports, bus-factor-1 hot files, knowledge voids (churn × centrality × zero
  memory), and doc lies (README claims vs reality). Every finding cites
  `file:line` evidence. Express acid test: `lib/response.js — 390 commits,
  149 edges, zero memory packets.` Includes a 66s→0.29s perf fix.
- **Value ledger + visible receipts (`kage gains`)** (#62). Persistent per-repo
  ledger at `.agent_memory/reports/value.json`; receipt line after each recall;
  gains line in `kage_context` that agents relay ("~289K tokens saved" live).
- **Stale-catch moment** (#64). `kage pr check` now leads with
  "⚠ Your changes invalidated N team memories" (file + reason + fix); new
  `kage staleguard` for pre-commit hooks; `stale_caught` ledger events feed
  `kage gains`; the `kage_pr_check` MCP tool relays the summary. Dogfooding
  caught 15 real invalidations on this repo.
- **Tree-sitter extraction tier** (#61). Real AST extraction for Python, Go,
  Rust, Java, and Ruby via web-tree-sitter (pure WASM, zero native deps),
  replacing regex. Click acid test: 466 methods correctly classified (was 0),
  real block spans, docstring false-positives gone. Grammar load failures fall
  back to regex.
- **Gains-first theme** (#65). Light-first "receipts/proof" viewer with a GAINS
  landing tab fed by the value ledger (dark variant included); site hero updated;
  daemon serves `value.json`.

### Engine

- **Import-aware call resolution** (#59). Callees resolve through local scope →
  imports → same package before any name-only match; external-package imports
  produce no repo edge; <0.5-confidence edges are gated from display. On
  Express: 524 ghost edges shown → 0; verified-local edges 473 → 2,277.
  `CODE_GRAPH_BUILDER_VERSION` busts stale graph caches.
- **Engine fixes that lost the grep benchmark** (#57): method-assignment symbol
  extraction (+101 symbols on Express), core-over-tests ranking, and
  call-edge-powered caller queries (definition + all call sites, `file:line`),
  plus extractor-version cache busting.
- **Context-block compaction + fingerprint cache** (#58): 38% smaller recall
  context blocks (same answers); staleness checks stop re-hashing unchanged
  files in long-lived server processes.

### First-run and surface

- **First-run trust fixes** (#56): TTY + no args now runs the demo with next
  steps; `init`/`index` no longer write `AGENTS.md`/`CLAUDE.md`/`.claude`
  unprompted (explicit `--with-policy` / `kage policy` / `setup --write`);
  setup emits `npx -y` when the server path is ephemeral; `.claude`/`.codex`
  excluded from indexing.
- **Surface shrink** (#60): tiered CLI help (14-line core vs the old 93-line
  wall); org/marketplace/global/layered stubs removed across CLI, MCP, kernel,
  and tests. Kage is repo-local memory — promotion surfaces that never shipped
  are gone.

### Breaking

- Removed untested stub surfaces (#60): org status/upload/review/recall/export,
  marketplace, global CDN bundle, and layered recall — 4 CLI commands and
  8 MCP tools (`kage_marketplace`, `kage_org_*`, `kage_layered_recall`,
  `kage_global_build`, `kage_promote_public_candidate`,
  `kage_export_public_bundle`). MCP tool surface 71 → 63. Repo-local memory,
  the code graph, and the MCP harness are unaffected.

## v1.4.0 - live memory: grounding-aware, instrumented, and a real dashboard

- **`.kageignore` now governs memory grounding, not just indexing.** A repo can
  declare non-knowledge paths (e.g. a presentation/visualization layer); those
  paths are dropped at capture, never mark memory stale on recall/refresh, and
  are pruned from existing packets on `kage refresh`. Fixes spurious stale
  cascades when a widely-cited non-knowledge file is deleted.
- **Recall instrumentation + Activity.** Recalls are recorded as access
  telemetry; new `kage activity` / activity report gives a chronological feed of
  what agents recalled and captured, with per-day counts.
- **Viewer rebuilt into a focused dashboard.** Overview (Memory Trust + live
  stats), Memory map (interactive memory↔code graph: zoom/pan/drag/filter/focus),
  Memory (grouped, searchable, click-through detail drawer to read a packet),
  Activity (recall/capture feed), Insights (health donut, type bars, most-grounded
  files). Single CSP-safe page; matches the site theme.
- **Lifecycle items now carry `summary` + `body`** so the viewer can show a
  packet's full content.
- **Health donut reframed** to grounded-&-current vs needs-review (recall
  frequency is shown separately, not as "unhealthy").
- **Docs:** the packet journey and every score explained in the README and on the
  site, with visual flow diagrams and a fresh animated `kage demo`.

## v1.3.0 - trust, governance & first-run

- `kage demo` (and `npx -y @kage-core/kage-graph-mcp demo`): a 60-second,
  zero-setup proof of the trust wedge — rejects a hallucinated citation,
  withholds a stale memory, recalls only grounded memory, prints a trust score.
- The `kage-graph-mcp` binary now dispatches CLI subcommands (so a single
  `npx @kage-core/kage-graph-mcp <command>` works); no-arg launch still starts
  the MCP server.
- Suppression Shelf in the viewer + `kage suppressed` / `kage_suppressed`:
  surfaces memory recall is actively withholding.
- Viewer redesign: trust-led overview (Memory Trust hero + metric bars).
- Trust Benchmark (`kage benchmark --trust`), capture parity (9 lifecycle
  hooks incl. PreToolUse/SubagentStop), traversal-driven structural blast radius.
- docs/BENCHMARKS.md (own numbers, reproducible) and a trust-first README +
  landing page.

## Earlier in this line - memory-quality mechanisms

- Write-time citation validation: `kage_capture`/`kage_learn` (and the CLI)
  reject a write when every referenced path is missing from the repo, with an
  `allow_missing_paths` / `--allow-missing-paths` escape hatch. The core
  `capture()` library stays permissive for programmatic callers.
- Recall now excludes hard-stale memory (cited files deleted since capture,
  expired TTL, or reported stale) from the payload and records what was
  suppressed; `includeStale` bypasses for audits.
- New `kage verify` / `kage_verify_citations` for on-demand grounding and
  staleness checks of repo memory.
- New `kage compact` / `kage_compact`: prune dead citations, deprecate
  hard-stale packets, and surface near-duplicate clusters for agent-driven
  merge (no hosted LLM).
- Packets record `author_branch`; agents can declare `graph_nodes` at capture
  (stored as code-reference edges).
- Opt-in recall token budget (`--max-context-tokens` / `max_context_tokens`)
  and opt-in traversal-driven structural blast radius (`--structural-hops` /
  `structural_hops`).
- `kage hook install` now also installs `post-merge` / `post-checkout` hooks so
  pulled teammate packets re-index automatically.
- Packet loaders skip unparseable / merge-conflicted packets instead of
  crashing all of recall/verify/compact.
- gitignore: stop tracking auto-generated `repo_map` packets (the patterns
  missed the repo-key infix), which were causing spurious merge conflicts.

## v1.1.36 - 2026-05-17

- Added a viewer overview dashboard with sections for readiness, memory
  coverage, graph health, repo intelligence, review, and workspace links.
- Added viewer navigation so users can scan the dashboard first and then move
  into focused graph, memory, intelligence, and review workspaces, with raw
  Artifacts kept as an advanced diagnostics link.
- Replaced duplicate drawer/quick-control surfaces with separate page layouts
  for Graph, Memory, Owners, Intel, and Review so each route has one
  clear job.
- Simplified the viewer around fewer decisions: the overview now shows four
  primary cards, Intel only shows six priority signals, and Artifacts caps raw rows
  so the UI does not turn into an information dump.
- Reworked the Memory page into a packet review workflow with search, filters,
  code-link coverage, and a side-by-side Inspector so users can see which repo
  lore is reusable, which memory is grounded to code, and which packets need
  better paths.
- Added action-oriented viewer charts for memory grounding, source-map coverage,
  handoff blockers, change risk, owner concentration, memory quality, benchmark
  gates, and raw-artifact diagnostics.
- Reworked the Graph page with a compact "Before You Change" action panel for
  untrusted relations, code without memory, memory-code links, and contextual
  impact tracing so the graph answers edit-readiness questions instead of only
  rendering nodes.
- Reframed the old Debug route as Artifacts for diagnosing generated graph
  shape, evidence coverage, memory-code links, and raw relation quality.
- Added a viewer Path Finder for source graph navigation.
- Reworked the viewer into a graph-first workspace with controls and Inspector
  beside the graph instead of overlaying the canvas.
- Kept zoom and fit controls on the graph canvas while moving advanced filters
  behind a collapsed control and moving Path Finder into the Inspector.
- The local and hosted viewers can now resolve two code nodes, files, symbols,
  routes, or tests and highlight the shortest forward, reverse, or undirected
  dependency path between them.
- Path highlights are preserved through node/edge capping and render in both 2D
  Canvas and 3D Space modes.

## v1.1.34 - 2026-05-15

- Added a viewer Workspace Map section for multi-repo intelligence.
- The Repo Intelligence cockpit now lists package dependencies, route
  contracts, topic/event links, and cross-repo co-change links as inspectable
  rows instead of only showing workspace counts.
- Mirrored the update into the hosted GitHub Pages viewer assets.

## v1.1.33 - 2026-05-15

- Added local workspace cross-repo co-change links from recent git history.
- `kage workspace` now reports sibling-repo file pairs that changed near each
  other by the same author, with frequency, strength, author, and evidence
  fields.
- Surfaced co-change counts in CLI text output and the viewer workspace card.
- Kept the signal lightweight and repo-local: recent `git log`, existing code
  graph files, bounded commit/file counts, no database, and no network calls.

## v1.1.32 - 2026-05-15

- Added deterministic workspace topic/event contract links alongside package
  dependencies and route contracts.
- `kage workspace` now reports producer/consumer pairs when sibling repos use
  the same topic string through common publish/subscribe style calls.
- Kept the workspace contract layer local and source-evidence based: no server
  database, no generated API docs, and route-like strings are excluded from the
  topic detector.

## v1.1.31 - 2026-05-15

- Added confidence and resolution metadata to code graph call edges so
  TypeScript AST, generic static, and external-index calls no longer all look
  equally certain.
- Updated `kage code-graph` call context and the viewer to surface
  low-confidence call edges instead of treating every call link as certainty.
- Kept older graph artifacts compatible by hydrating missing call confidence
  with conservative defaults.

## v1.1.30 - 2026-05-15

- Expanded `kage cleanup-candidates` beyond unreferenced source files to also
  report conservative unused exported symbols and internal-looking symbols.
- Kept cleanup output as review input only: candidates include confidence,
  reasons, symbol name/id/line when available, git recency, test coverage
  signals, and runtime-reference safeguards.
- Added regression coverage so imported symbols are not flagged while unused
  sibling exports and private helpers can be surfaced.

## v1.1.29 - 2026-05-15

- Expanded mixed-language framework route extraction in the code graph for
  Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET.
- Added route handler linking where lightweight static patterns can identify
  the nearby handler symbol.
- Added regression coverage for mixed-language web entrypoint detection.

## v1.1.28 - 2026-05-15

- Added Python framework route extraction to the source-derived code graph for
  FastAPI/APIRouter decorators, Flask `@app.route(..., methods=[...])`, and
  Django `path` / `re_path` declarations.
- Normalized Python route parameters such as `{task_id}` and
  `<int:order_id>` into Kage's `:param` graph format so viewer, recall, and
  route queries can compare routes consistently across frameworks.
- Added regression coverage for FastAPI, Flask, and Django route detection.

## v1.1.27 - 2026-05-15

- Added `kage hook install/status/uninstall` for repo-local git
  `post-commit` automation. The hook preserves existing hook content, supports
  `KAGE_SKIP_HOOK=1`, and runs `kage refresh` plus `kage pr summarize` after
  commits.
- Upgraded the viewer's Repo Intelligence panel from summary cards to
  navigable operational maps for ownership silos, module health, onboarding
  targets, architecture communities, execution flows, and blast radius.
- Updated README, package docs, website docs, and hosted viewer assets for the
  new hook and viewer intelligence surfaces.

## v1.1.25 - 2026-05-12

- Rebuilt the website into a darker product/docs surface with clearer install,
  CLI, MCP, memory, graph, review, and troubleshooting documentation.
- Added release and viewer navigation so the GitHub Pages site, docs, releases,
  and graph viewer link back to each other cleanly.
- Fixed generated branch change-memory validation so separate branch summaries
  no longer warn as duplicates of each other while normal duplicate checks stay
  active.

## v1.1.23 - 2026-05-10

- Rewrote the root README as a shorter user-first guide focused on value,
  quick start, daily workflow, storage model, viewer, performance, trust, and
  development.
- Rewrote the npm package README to remove release-note clutter and make the
  installed package page useful for setup and day-to-day commands.
- Kept the README performance proof current with the refreshed Kage-on-Kage
  memory and code graph metrics.

## v1.1.22 - 2026-05-09

- Fixed the viewer inspector so selecting high-degree nodes cannot expand the
  page and push the canvas out of view.
- Added bounded internal scrolling for selected-node details, connected
  relations, and memory-code evidence groups.
- Capped long detail rows and relation summaries so the graph console remains
  stable while users inspect dense nodes.

## v1.1.21 - 2026-05-09

- Fixed memory-code graph quality by requiring explicit, non-generic symbol and
  test mentions before creating precise memory-code edges.
- Capped per-packet symbol/test links so broad repo memories cannot explode into
  unreadable file hubs in the viewer.
- Fixed viewer graph canonicalization so stale memory symbol/test path aliases
  do not silently collapse onto code file nodes.
- Kept path-level memory visible through capped `affects_code_path` bridge
  edges while making the `Memory <-> Code only` view show actual cross-graph
  links.

## v1.1.20 - 2026-05-08

- Added a persisted code graph stat fingerprint so repeated `kage refresh`
  calls on unchanged large repos can reuse the existing code graph without
  rereading and rehashing all selected source files.
- Added `kage refresh --full` and MCP `kage_refresh` `full: true` for explicit
  clean rebuilds when maintainers want to bypass unchanged-graph reuse.
- Changed `kage code-index` and MCP `kage_code_index` to prefer SCIP via
  `scip-typescript` plus the `scip` CLI when available, falling back to the
  built-in LSP-compatible symbol index when external tools are not installed.
- Kept the content-hash rebuild path for changed files and missing/stale graph
  artifacts.

## v1.1.18 - 2026-05-08

- Made user-facing indexing and recall paths faster by reusing current graph
  artifacts for read-only commands instead of rebuilding and rewriting them.
- Added in-process graph reuse for MCP sessions, lightweight refresh metrics,
  per-file code fact caching, bounded quick indexing, and packet-only init so
  Kage does not block first use on larger repos.
- Changed recall graph scoring to build lookup maps once per query instead of
  scanning all graph entities and edges for every memory packet.
- Updated the viewer to hide unreadable raw full-graph scopes and show capped
  memory-code evidence in the inspector.

## v1.1.17 - 2026-05-06

- Changed PR graph freshness from commit-HEAD matching to content/input
  fingerprints so push-only operations and empty/same-tree commits do not force
  another refresh.
- Added regression coverage for same-tree commits passing and real source
  edits staling generated graph artifacts.
- Updated agent policy, README, package docs, and website copy to describe
  refresh as content-change driven.

## v1.1.16 - 2026-05-06

- Added retry/backoff to the guarded npm release helper's exact-version
  registry verification so successful publishes are not reported as failed
  during npm registry propagation.
- Kept the release helper as source-repo maintainer tooling by removing public
  npm release scripts from package metadata and excluding `dist/release.js` from
  the published tarball.

## v1.1.15 - 2026-05-06

- Added a guarded npm release helper with remote preflight, non-interactive git
  environment, package tests, pack dry-run, optional branch push, npm publish,
  registry verification, and smoke install.
- Fixed `kage propose --from-diff` so repo memory packet-only changes under
  `.agent_memory/packets/*.json` and `.agent_memory/pending/*.json` are included
  in branch review summaries instead of being filtered as generated noise.
- Added regression coverage for the release workflow and memory-only/mixed
  tracked-untracked diff proposals, bringing the package suite to 83 passing
  tests.

## v1.1.14 - 2026-05-06

- Added BM25 lexical recall ranking with intent-aware runbook/gotcha/decision
  boosts while keeping graph, path/type/tag, freshness, quality, and feedback
  signals in the final score.
- Added graph registry, audit, inbox, and code-index documentation and release
  proof for the Kage MCP package.
- Updated the viewer to coalesce memory graph code entities with source-derived
  code graph nodes and highlight memory-code links.
- Updated the root README and website to show the current 79-test proof state,
  current Kage-on-Kage graph metrics, and BM25 retrieval wording.

## v1.1.13 - 2026-05-03

- Switched future Kage releases from MIT to GPL-3.0-only.
- Added the official GPLv3 license text as `LICENSE`.
- Updated README and npm package metadata to clarify the GPL license.
- Note: older versions already published under MIT remain available under the
  terms they were originally published with.

## v1.1.12 - 2026-05-03

- Added explicit npm release notes to the package README.
- Updated the root README hero to use the animated demo GIF.
- Added clear website and live viewer links near the top of the README.
- Verified hosted GitHub Pages viewer publishes Kage repo memory graph, code
  graph, and metrics as static data.

## v1.1.11 - 2026-05-03

- Published hosted viewer repo graph data on GitHub Pages.
- Pages now builds Kage in CI, refreshes repo memory/code graph artifacts, and
  writes metrics before publishing the static viewer.
- Published `@kage-core/kage-graph-mcp@1.1.11`.

## v1.1.0 - 2026-05-02

- Added cross-agent launch flow: Codex can create reviewed repo memory that Claude Code and other MCP agents can recall.
- Added Claude Code `kage setup claude-code --write` support with safe MCP config merge.
- Changed `kage propose --from-diff` to create both branch review summaries and pending change-memory packets.
- Refreshed README, demo GIF, and ship-readiness docs around the repo hive memory wedge.
- Verified package smoke path with build, tests, npm pack dry run, Codex setup, Claude Code setup, generic MCP setup, and recall.

## v1.0.0

- Initial local-first Kage MCP package with repo memory packets, recall, graph indexing, code graph, review gates, metrics, daemon, and setup helpers.## 2.0.1

- `kage scan` doc-lie checks are fence-aware: paths quoted inside code fences are sample output, not claims; `npm run`/CLI claims still verified inside shell-typed fences.
- npm package declares `mcpName: com.kage-core/kage` for the official MCP registry.


