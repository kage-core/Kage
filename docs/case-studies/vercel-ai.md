# Kage on Vercel AI

This case study tracks a Kage-assisted contribution run on `vercel/ai`.

Kage was not used as an autonomous bug hunter. It was used as repo memory: agents recalled package context, code graph entry points, test locations, and prior learnings, then captured the reasoning behind each accepted fix so future sessions can pick up the same repo nuance.

## Contribution Summary

| PR | Area | What changed |
| --- | --- | --- |
| [#15154](https://github.com/vercel/ai/pull/15154) | `ai` | Fixed mock array result indexing. |
| [#15324](https://github.com/vercel/ai/pull/15324) | `ai` | Defaulted missing embedding warnings for EmbeddingModelV2 providers. |
| [#15325](https://github.com/vercel/ai/pull/15325) | `google-vertex` | Added default embedding settings for Vertex embedding models. |
| [#15327](https://github.com/vercel/ai/pull/15327) | docs | Documented the AI SDK 6 tool name migration. |
| [#15328](https://github.com/vercel/ai/pull/15328) | `codemod` | Scoped the v5 reasoning-property codemod to AI SDK result/step shapes. |
| [#15329](https://github.com/vercel/ai/pull/15329) | `gateway` | Added documented `gateway.caching: 'auto'` provider option support. |
| [#15330](https://github.com/vercel/ai/pull/15330) | docs | Clarified that stream `messageId` belongs on `start`, not `finish`. |
| [#15331](https://github.com/vercel/ai/pull/15331) | docs | Replaced a removed `useAssistant` example link with maintained docs. |
| [#15332](https://github.com/vercel/ai/pull/15332) | docs | Showed explicit Google Vertex image provider setup. |
| [#15333](https://github.com/vercel/ai/pull/15333) | `google` | Sent Gemini structured-output schemas as `responseJsonSchema`, while preserving Vertex `responseSchema`. |

## How Kage Helped

- Recalled package-specific maps before edits, such as `packages/ai`, `packages/google-vertex`, `packages/codemod`, `packages/gateway`, and `packages/google`.
- Surfaced relevant tests and code graph nodes, for example embedding tests, Gateway request body tests, Google structured-output snapshots, and codemod fixtures.
- Captured memory packets after fixes explaining the cause, verified behavior, changed files, and test commands.
- Kept generated `.agent_memory` local to the worktrees. The upstream Vercel PRs contain only source, docs, tests, and changesets.
- Helped avoid duplicate PRs by checking already-open fixes for related issues before creating new work.

## Local Kage Metrics

These are local refresh metrics from the relevant package scopes after fixes were captured.

| Package scope | Files | Symbols | Calls | Tests | Memory entities | Evidence-backed edges | Stale packets |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `packages/ai` | 436 | 7,411 | 8,863 | 2,068 | 53 | 55 | 0 |
| `packages/google-vertex` | 69 | 751 | 784 | 204 | 48 | 50 | 0 |
| `packages/codemod` | 300 | 1,354 | 1,203 | 87 | 53 | 54 | 0 |
| `packages/gateway` | 59 | 1,279 | 1,587 | 370 | 71 | 72 | 0 |
| `packages/google` | 78 | 2,158 | 1,369 | 564 | 82 | 83 | 0 |

## Triage Notes

Several candidate issues were intentionally skipped after Kage/subagent-assisted review because active PRs already covered them or the fix belonged outside `vercel/ai`:

- `#14351` Black Forest Labs fill image payload: already covered by open PRs.
- `#14378` ByteDance first/last-frame video payload: already covered by an open PR.
- `#14568` GitHub Copilot via OpenAI-compatible: already fixed by merged upstream PRs.
- `#12773` Bedrock embedding cross-region prefixes: valid, but already covered by an open PR.
- `#14228` docs shell layout flash: likely belongs in the docs frontend shell, not the content/package repo.

## What This Shows

Kage’s value is collaborative continuity. One agent can discover a repo-specific rule, fix path, or gotcha, then save it as memory tied to code. Later agents working on the same package can recall that context without rereading the whole repo or repeating the same investigation.
