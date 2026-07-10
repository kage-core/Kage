# Kage uses Open Knowledge Format (OKF) as its standard

Kage's memory is stored and exchanged in **Google's Open Knowledge Format (OKF)** —
the vendor-neutral spec at
[GoogleCloudPlatform/knowledge-catalog/okf](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
OKF gives knowledge a portable, agent-readable shape: a directory of Markdown files
with YAML frontmatter, shippable in git, readable by any OKF consumer (including
Google's own visualizer). Kage adds the lifecycle OKF deliberately leaves out —
grounding, verification, freshness, and self-healing — and carries that trust
metadata in OKF-legal custom `x-kage-*` fields.

> OKF tells your agent what's true. Kage proves it still is.

## Why OKF is the standard, not a proprietary store

OKF v0.1 standardizes the *store* and explicitly scopes *out* freshness checking,
validation against source of truth, verification, and staleness detection. That gap
is exactly Kage's engine. So Kage stops inventing its own container and adopts OKF
as the format, focusing entirely on the part Google left open: keeping concepts
true over time. A Kage bundle is a conformant OKF bundle; a vanilla OKF consumer
reads it and silently ignores the `x-kage-*` extension.

## Bundle layout

`kage okf migrate` renders the memory store as an OKF bundle under
`.agent_memory/okf/`:

```
.agent_memory/okf/
├── index.md                 # progressive-disclosure navigation (reserved OKF file)
├── log.md                   # dated change history (reserved OKF file)
├── decision/
│   ├── index.md
│   └── <slug>-<idhash>.md    # one concept per file; path is the concept identity
├── bug-fix/
├── gotcha/
└── …                        # one directory per concept type
```

## Concept document

Each concept is OKF-conformant Markdown: YAML frontmatter (only `type` is required),
a human/agent-readable body, an OKF `# Citations` section, and a fenced
`kage-state` block that makes the round-trip lossless.

```markdown
---
type: "Decision"                       # OKF required field (display form of the Kage type)
title: "Adopt OKF as the standard"     # OKF recommended
description: "Short summary."           # OKF recommended (Kage `summary`)
resource: "mcp/okf.ts"                 # OKF recommended — the source of truth to verify against
tags: ["okf", "standard"]              # OKF recommended
timestamp: "2026-06-29T00:00:00Z"      # OKF recommended (last verified)
x-kage-id: "repo:…:decision:…"         # Kage trust extension (OKF-legal custom fields)
x-kage-type: "decision"                # exact Kage type for lossless reimport
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"            # computed status: verified | unverified | drifted | deprecated | superseded
x-kage-paths: ["mcp/okf.ts", "OKF_STANDARD.md"]
---

# Adopt OKF as the standard

Readable prose…

## Verification
How it was verified…

# Citations
[1] explicit_capture (2026-06-29T00:00:00Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{ …the exact Kage packet… }
```
```

## Type vocabulary

The Kage `type` maps to an OKF display string and back:

| Kage type | OKF `type` |
|---|---|
| `repo_map` | Repo Map |
| `runbook` | Runbook |
| `bug_fix` | Bug Fix |
| `decision` | Decision |
| `rationale` | Rationale |
| `convention` | Convention |
| `workflow` | Workflow |
| `gotcha` | Gotcha |
| `reference` | Reference |
| `policy` | Policy |
| `issue_context` | Issue Context |
| `code_explanation` | Code Explanation |
| `negative_result` | Negative Result |
| `constraint` | Constraint |

Unknown OKF types (from a third-party bundle) import to the safe `reference` type.

## Round-trip guarantee

`packet → OKF concept → packet` is an identity for Kage-authored concepts: the
`kage-state` block carries the exact packet, so no field is lost. Concepts *without*
a `kage-state` block (hand-authored, or produced by another OKF tool) are imported
best-effort from their frontmatter + body — which is what lets Kage **consume any
OKF bundle**, not just its own. `mcp/okf.test.ts` covers this losslessness at the
single-packet level; at time of migration to OKF, every concept in this repo's own
bundle (200 at the time) round-tripped byte-exact via `kage okf import`.

## Commands

```
kage okf migrate [--project <dir>] [--pending]   # packets → OKF bundle (.agent_memory/okf)
kage okf lint   [<dir|file>] [--project <dir>]   # check OKF conformance
kage okf import [<dir>] [--project <dir>] [--json]  # read any OKF bundle back into packets
```

## Implementation

`mcp/okf.ts` — the adapter (`packetToOkfConcept`, `okfConceptToPacket`,
`migratePacketsToOkf`, `loadOkfConcepts`, `lintOkfConcept`/`lintOkfBundle`). Tests
in `mcp/okf.test.ts`. The conversion is pure and deterministic; no field that Kage's
engine relies on (anchors, lineage, freshness, quality) is dropped.
