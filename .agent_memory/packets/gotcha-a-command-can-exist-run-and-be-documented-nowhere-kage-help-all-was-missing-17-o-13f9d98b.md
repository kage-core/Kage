---
type: "Gotcha"
title: "A command can exist, run, and be documented nowhere — kage help --all was missing 17 of them"
description: "kage okf 4 working subcommands, referenced by this repo's own CLAUDE.md , kage report team the lead facing value report , and 14 back compat aliases such as audit log and memory handoff all dispatched correctly but appea"
resource: "mcp/cli.ts"
tags: ["session-learning", "cli", "docs", "discoverability", "help"]
timestamp: "2026-07-22T21:39:24.385Z"
x-kage-id: "repo:memory:gotcha:a-command-can-exist-run-and-be-documented-nowhere-kage-help-all-was-missing-17-o"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/cli.ts", "mcp/cli-discoverability.test.ts"]
---

# A command can exist, run, and be documented nowhere — kage help --all was missing 17 of them

> kage okf 4 working subcommands, referenced by this repo's own CLAUDE.md , kage report team the lead facing value repo…

kage okf (4 working subcommands, referenced by this repo's own CLAUDE.md), kage report team (the lead-facing value report), and 14 back-compat aliases such as audit-log and memory-handoff all dispatched correctly but appeared in neither 'kage help --all' nor 'kage legacy --help'. They were discoverable only by reading cli.ts. Separately, 'kage reverify' accepts --evidence and --verified-by but its help line advertised only [--json] — hiding the very flag it REQUIRES when the cited code changed. Root cause: the help text is a hand-maintained template string in cli.ts with no link to the dispatch table, so adding a command never forced a help edit. Guard shipped: mcp/cli-discoverability.test.ts parses every 'command === "X"' out of cli.ts and asserts each is reachable from help or the legacy map, exempting only help/legacy themselves. It fails CI with the exact missing list.
Evidence: RED run listed 14 undiscoverable commands after okf was fixed; GREEN 3/3 after documenting report team, gen-plugin-hooks, and an aliases block. Full suite 1419 passing, 0 failing.
Verified by: mcp/dist/cli-discoverability.test.js — 3/3

## Verification

RED run listed 14 undiscoverable commands after okf was fixed; GREEN 3/3 after documenting report team, gen-plugin-hooks, and an aliases block. Full suite 1419 passing, 0 failing.

# Citations

[1] explicit_capture (2026-07-22T21:39:24.385Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:a-command-can-exist-run-and-be-documented-nowhere-kage-help-all-was-missing-17-o","title":"A command can exist, run, and be documented nowhere — kage help --all was missing 17 of them","summary":"kage okf 4 working subcommands, referenced by this repo's own CLAUDE.md , kage report team the lead facing value report , and 14 back compat aliases such as audit log and memory handoff all dispatched correctly but appea","body":"kage okf (4 working subcommands, referenced by this repo's own CLAUDE.md), kage report team (the lead-facing value report), and 14 back-compat aliases such as audit-log and memory-handoff all dispatched correctly but appeared in neither 'kage help --all' nor 'kage legacy --help'. They were discoverable only by reading cli.ts. Separately, 'kage reverify' accepts --evidence and --verified-by but its help line advertised only [--json] — hiding the very flag it REQUIRES when the cited code changed. Root cause: the help text is a hand-maintained template string in cli.ts with no link to the dispatch table, so adding a command never forced a help edit. Guard shipped: mcp/cli-discoverability.test.ts parses every 'command === \"X\"' out of cli.ts and asserts each is reachable from help or the legacy map, exempting only help/legacy themselves. It fails CI with the exact missing list.\nEvidence: RED run listed 14 undiscoverable commands after okf was fixed; GREEN 3/3 after documenting report team, gen-plugin-hooks, and an aliases block. Full suite 1419 passing, 0 failing.\nVerified by: mcp/dist/cli-discoverability.test.js — 3/3","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","cli","docs","discoverability","help"],"paths":["mcp/cli.ts","mcp/cli-discoverability.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-22T21:39:24.385Z"}],"context":{"fact":"kage okf (4 working subcommands, referenced by this repo's own CLAUDE.md), kage report team (the lead-facing value report), and 14 back-compat aliases such as audit-log and memory-handoff all dispatched correctly but appeared in neither 'kage help --all' nor 'kage legacy --help'. They were discoverable only by reading cli.ts. Separately, 'kage reverify' accepts --evidence and --verified-by but its help line advertised only [--json] — hiding the very flag it REQUIRES when the cited code changed. Root cause: the help text is a hand-maintained template string in cli.ts with no link to the dispatch table, so adding a command never forced a help edit. Guard shipped: mcp/cli-discoverability.test.ts parses every 'command === \"X\"' out of cli.ts and asserts each is reachable from help or the legacy map, exempting only help/legacy themselves. It fails CI with the exact missing list.\nEvidence: RED run listed 14 undiscoverable commands after okf was fixed; GREEN 3/3 after documenting report team, gen-plugin-hooks, and an aliases block. Full suite 1419 passing, 0 failing.\nVerified by: mcp/dist/cli-discoverability.test.js — 3/3","verification":"RED run listed 14 undiscoverable commands after okf was fixed; GREEN 3/3 after documenting report team, gen-plugin-hooks, and an aliases block. Full suite 1419 passing, 0 failing."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-22T21:39:24.385Z","path_fingerprints":[{"path":"mcp/cli.ts","sha256":"b928d4c949639ff39522141a1ce91a0317d96493c3cd0967c80fa35335cbe685","size":174649},{"path":"mcp/cli-discoverability.test.ts","sha256":"3ee7dcebb1701497dbb045a3989a608b5579b11e32ff7c23d8df222f3f3329d5","size":3146}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":283},"created_at":"2026-07-22T21:39:24.385Z","updated_at":"2026-07-22T21:39:24.385Z","author_branch":"codex/kage-vnext-implementation","author_name":"Kushal Jain"}
```

