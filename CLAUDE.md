<!-- KAGE_MEMORY_POLICY_V1 -->
# Kage Memory Harness

**YOUR FIRST ACTION every session — before reading any file or writing any code:**

1. `kage_validate` — check memory health
2. `kage_recall` — load relevant context for the task

Do this without waiting for the user to ask.

## Capture

- When you discover something reusable: `kage_learn`
- Before finishing a task that changed files: `kage_propose_from_diff`
- Keep captures concise and future-facing. Do not store raw transcripts.

## Recall

- `kage_code_graph` — for file, symbol, route, test, and dependency questions
- `kage_graph` — for decisions, bugs, workflows, and conventions
- Prefer repo memory over public/community memory when they conflict.
- Call `kage_feedback` with `helpful`, `wrong`, or `stale` after recall.

## Safety

- Never approve, publish, or promote memory automatically.
- Never store secrets, credentials, customer data, or private URLs.
- If Kage returns validation warnings, mention them when they affect the task.
<!-- END_KAGE_MEMORY_POLICY_V1 -->
