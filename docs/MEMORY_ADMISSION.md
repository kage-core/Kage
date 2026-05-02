# Memory Admission

Kage separates raw episodes from durable memory.

Raw observations answer: what happened in a session?

Durable memory answers: what should a future agent know before acting?

## What To Save

Save a packet only when it is likely to change a future agent's behavior:

- Runbook: a non-obvious command, setup step, verification flow, or recovery path.
- Bug fix: symptom, root cause, changed surface, and verification.
- Decision: chosen direction, rejected alternatives, and rationale.
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
- A transcript summary without a reusable conclusion.
- Generic framework knowledge available in public docs.
- Duplicate memory already present in packets or generated repo indexes.
- Any secret, credential, private customer data, or sensitive identifier.

## Admission Signals

Kage scores candidates before review:

- Provenance: source refs point to observations, files, or explicit evidence.
- Novelty: candidate does not duplicate existing memory or generated repo facts.
- Actionability: has a future trigger such as when/after/before/because.
- Specificity: names paths, commands, components, tests, or decisions.
- Verification: includes evidence, tests, reproduction, or root cause.
- Scope: belongs to session, repo, org, or public scope intentionally.
- Cost: likely saves more tokens/time than it costs to review and retrieve.

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

This prevents session logs from becoming a junk graph while preserving enough
evidence to audit why a memory exists.

