# Kage v4 command map (legacy → supported)

Kage v4 cuts the default product surface over to the focused vNext verbs. The pre-vNext commands are
**deprecated in v4 and removed in v5**. They remain callable for one major version — directly, or
explicitly via `kage legacy <command> ...` — and every deprecated invocation prints one supported
replacement, the v5 removal notice, and a link back to this document.

Run `kage legacy --help` for the live map, and `kage legacy scan --project <dir>` to list every script
or config file in a repo that still invokes a deprecated command.

## The supported v4 surface

| Command | What it does |
| --- | --- |
| `kage connect` | Attach the vNext runtime + adapters in audit mode (no prompt is changed). |
| `kage status` | Memory + runtime health, team rollup, and measurement coverage. |
| `kage open` | The local dashboard: recall, review, receipts, memory activity, team. |
| `kage doctor` | Health check. |
| `kage export` | Export the repository model as an OKF bundle. |
| `kage migrate` | Import legacy packets into the repository model (dry-run `plan`, then `apply`). |
| `kage context` | Validate + recall + code graph + knowledge graph in one call. |
| `kage receipts` | Measured before/after receipts for transformed requests. |

The MCP tool surface is reduced to the same three verbs an agent needs in the loop:
`kage_context`, `kage_retrieve`, `kage_feedback`. Set `KAGE_TOOLS=legacy` to expose the full legacy
tool registry (each tool description carries a deprecation note) for one major version;
`KAGE_TOOLS=full` remains the complete internal registry for development.

## Legacy → replacement

Commands that map to a single supported verb (the caller's flags are preserved):

| Legacy command | Replacement |
| --- | --- |
| `kage timeline`, `kage memory-timeline` | `kage open` |
| `kage lineage`, `kage handoff`, `kage activity` | `kage open` |
| `kage memory-access`, `kage memory-audit` | `kage open` |
| `kage layers`, `kage inbox`, `kage lifecycle` | `kage open` |
| `kage gains`, `kage savings` | `kage receipts` (measured, not inferred) |
| `kage team`, `kage audit`, `kage quality`, `kage capabilities` | `kage status` |
| `kage recall` | `kage context` |
| `kage graph`, `kage code-graph`, `kage graph-insights` | `kage context` |
| `kage profile`, `kage xray`, `kage module-health` | `kage context` |
| `kage decisions`, `kage risk`, `kage reviewers`, `kage contributors` | `kage context` |
| `kage dependency-path`, `kage cleanup-candidates`, `kage docs-search` | `kage context` |

Commands **removed** with no direct replacement (still reachable via `kage legacy` until v5):

| Legacy command | Why |
| --- | --- |
| `kage community-domains`, `kage community-search`, `kage community-fetch` | The community graph is advisory-only and untrusted; it never drove the primary surface. |
| `kage registry`, `kage graph-registry` | Registry surfaces are advisory-only. |
| `kage promote`, `kage export-public` | Public promotion is never automatic; assets are not published for you. |
| `kage audit-claude-mem` | Cross-tool audit has no safe migration value in v4. |

## Telemetry

A deprecated invocation records **only** the command name and version locally
(`$KAGE_HOME/legacy-usage.jsonl`, default `~/.kage/legacy-usage.jsonl`). Arguments are never recorded,
because they can carry private paths or query text. Recording is best-effort and never blocks the
command from running.
