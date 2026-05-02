<!-- KAGE_MEMORY_POLICY_V1 -->
# Kage Memory Harness

**YOUR FIRST ACTION every session — before reading any file or writing any code:**

```
Step 1: ToolSearch("kage recall validate")   // Kage tools are deferred — this loads their schemas
Step 2: kage_validate({ project_dir })        // checks memory health
Step 3: kage_recall({ query, project_dir })   // loads relevant context for the task
```

Kage tools do NOT appear automatically in Claude Code. They are deferred and invisible
until you call ToolSearch. Skip this step and you will have no memory context.

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
