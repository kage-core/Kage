# kage check — corpus validation (2026-07-03)

`kage check` verifies mechanically-checkable claims in agent-context files
(CLAUDE.md, AGENTS.md, `.cursor/rules`, `.cursorrules`, copilot-instructions,
README, CONTRIBUTING, `docs/**/*.md`) against the repo: cited paths, `npm run`
scripts, `make` targets, and CLI subcommands. Three buckets, all counts of
reproducible checks — never estimates:

- **confirmed** — claim checked and false (two-sided evidence: doc line + the
  ground-truth check that failed, plus the deleting commit when git knows it)
- **verified** — claim checked and true
- **unverifiable** — claim of a supported type we could not check, with the reason
  (gitignored/runtime path, env-var-anchored, hedged, out-of-tree namespace, …)

## Corpus

70 public GitHub repos that contain a CLAUDE.md, AGENTS.md, or `.cursorrules`,
selected from GitHub code search: non-forks, pushed within the last year,
biased toward higher star counts (20★ floor; top of the range >4,000★),
shallow-cloned at depth 50. No repos were excluded after results were seen.

## Results (extractor as of this commit)

| metric | value |
|---|---|
| repos scanned | 70 |
| repos with ≥1 confirmed finding | 21 (30%) |
| confirmed drift findings | 91 |
| claims verified true | 1,033 |
| claims bucketed unverifiable | 169 |
| scan errors | 0 |

A hand-adjudicated sample of findings (all findings from every repo except the
largest contributor, plus samples of that one) puts precision at roughly **85%**.
The remaining false-positive classes are documented below rather than hidden.

Representative true findings:

- README lists `skills/skill-creator/` as the canonical guide — deleted from the
  tree three months earlier (the deletion commit is cited in the finding).
- `DEVELOPMENT.md` says "Available scenarios in `tests/image-tests/`" — the
  directory was deleted eight months before the scan.
- A `.cursorrules` file points contributors at two `docs/*.md` guides that do
  not exist.
- `AGENTS.md` documents `make clean` — the Makefile has no such target.
- A CLAUDE.md documents an entire `agent/*.py` module table that is absent from
  the tree.

## Precision rules (what the extractor deliberately skips)

Tuned on this corpus across four passes (raw first pass: 339 findings; final:
91). Each rule moves a claim to *unverifiable* instead of *confirmed*:

1. Fenced code is sample output, not claims (shell-typed fences are the
   exception for commands).
2. Build-artifact paths (`dist/`, `build/`, `out/`, …) prove nothing about the tree.
3. Placeholder/hypothetical lines ("e.g.", `MyComponent.tsx`, `foo/bar`).
4. Env-var-anchored and runtime-root paths (`$DATA_DIR/x`, `AppData/…`).
5. Gitignored paths (git itself says they are created at runtime).
6. Paths cited relative to a package dir that exist deeper in the tree
   (suffix match) count as verified, not drift.
7. Planning/spec/design/release/research docs describe intended or past states
   and are not scanned.
8. Self-hedged lines ("read X, or find the checklist if missing").
9. A missing path only confirms when its top-level directory exists — a wholly
   absent namespace usually lives out of tree (consumer repo, sibling repo).
10. Single-segment paths are skipped except well-known root docs
    (CONTRIBUTING.md, LICENSE, …).

## Known false-positive classes (unfixed, by choice)

- Config-default tables ("`RESULTS_DIR` defaults to `results/agentic/`") read
  as existence claims.
- Dirs populated by a dev-setup step (`modules/…` cloned on first run) look
  missing in a fresh checkout.

Both are rare in the corpus (≈4 of a 27-finding adjudicated sample) and are
honest misreads, not inflation: every finding remains individually reproducible
by rerunning the check.

## Reproduce

```bash
npx -y @kage-core/kage-graph-mcp check --project /path/to/repo
kage check --project . --json          # machine-readable, three buckets
kage check --base origin/main          # PR mode: only drift this diff introduces
kage check --init-ci                   # GitHub Action: comment + gate on new drift
```

No numbers beyond the table above are claimed. In particular: no token savings,
no speed multipliers, no outcome claims — those require the SWE-bench ablation
harness in `benchmark/`, which has not been run yet.
