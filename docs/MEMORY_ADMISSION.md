# Memory Admission

Kage separates raw episodes from durable memory.

Raw observations answer: what happened in a session?

Durable memory answers: what should a future agent know before acting,
judging, debugging, explaining, or refactoring?

## What To Save

Save a packet when losing it would make a future agent slower or worse at
understanding, deciding, debugging, explaining, refactoring, or verifying:

- Runbook: a non-obvious command, setup step, verification flow, or recovery path.
- Bug fix: symptom, root cause, changed surface, and verification.
- Decision: chosen direction, rejected alternatives, and rationale.
- Rationale: why code, architecture, product, or release behavior ended up this way.
- Issue context: unresolved problem, attempted fixes, current hypothesis, and next evidence to gather.
- Code explanation: non-obvious module purpose, data flow, invariants, boundaries, or coupling.
- Negative result: an approach that was tried and rejected, with the reason.
- Constraint: external, API, legal, performance, platform, or compatibility pressure shaping the code.
- Convention: repo-specific rule that should be repeated.
- Workflow: ordered steps or code flow that future agents will reuse.
- Gotcha: surprising failure mode and how to avoid it.
- Policy: hard rule for agents, safety, review, release, or sharing.
- Reference: stable repo-specific fact that is not obvious from file names.

## What Not To Save

Keep these as observations only:

- A command ran successfully when that command is already in `package.json`.
- A file was touched, edited, updated, or changed.
- A user asked for a task.
- A transcript summary without a reusable conclusion, rationale, issue state, or code explanation.
- Generic framework knowledge available in public docs.
- Duplicate memory already present in packets or generated repo indexes.
- Any secret, credential, private customer data, or sensitive identifier.

## Admission Signals

Kage scores candidates before review:

- Provenance: source refs point to observations, files, or explicit evidence.
- Novelty: candidate does not duplicate existing memory or generated repo facts.
- Understanding value: preserves rationale, root cause, issue state, code explanation, or
  verification that saves rediscovery.
- Specificity: names paths, commands, components, tests, or decisions.
- Verification: includes evidence, tests, reproduction, or root cause.
- Scope: belongs to session, repo, org, or public scope intentionally.
- Cost: likely saves more tokens/time than it costs to review and retrieve.

Do not reduce admission to "would this change what a future agent does?" Some
memories are valuable because they change what an agent understands before it
acts.

The strongest admission test is:

> Would losing this context make a future agent slower, more likely to
> misunderstand the code, repeat a bug, undo a good decision, or miss why the
> repo is shaped this way?

If the answer is yes and the memory is evidence-backed, it belongs in Kage.

## Structured Context

High-value packets should include structured engineering context when possible:

- `fact`: the durable fact or explanation.
- `why`: rationale, constraint, or root cause.
- `trigger`: when the memory should be recalled.
- `action`: what to do or avoid, when applicable.
- `verification`: command, test, issue, PR, or other evidence.
- `risk_if_forgotten`: the future mistake this prevents.
- `stale_when`: the condition that invalidates or requires review.

Candidates below the admission threshold stay in observations. They are not
turned into pending memory.

## Graph Model

Kage follows an episode-first graph model:

1. Store raw observations as local episodes.
2. Distill only durable facts/procedures into pending packets.
3. Preserve source refs from packets back to observation ids or files.
4. Build semantic entities and edges from approved packets.
5. Keep code graph facts separate from learned memory facts.
6. Retrieve with text, graph, path/type/tag, freshness, quality, and feedback.
7. Link memory to source symbols, routes, tests, and verification commands when
   the packet explains or proves code behavior.

This prevents session logs from becoming a junk graph while preserving enough
evidence to audit why a memory exists.
