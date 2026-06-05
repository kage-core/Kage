# Your agent's memory can't tell you when it's lying

Every coding-agent memory tool now makes the same promise: *it remembers.* Capture
every session, recall in milliseconds, never re-explain your codebase. The
benchmarks agree — on LongMemEval-S, the whole field clusters at 95–97% recall.
Memory is, apparently, solved.

It isn't. Because recall answers the wrong question.

The question that decides whether memory *helps* or *hurts* isn't "can it find a
memory?" It's **"can I trust the memory it found?"** An agent that confidently
acts on a memory that's:

- **hallucinated** — it cites `src/auth/validate.ts`, which never existed, or
- **stale** — it cites a file your teammate deleted last week, or
- **ungrounded** — it has nothing to do with the code you're touching

…is *worse* than an agent with no memory at all. No-memory makes the agent
cautious. Wrong-memory makes it confidently wrong.

Run the experiment yourself: feed any vector-store memory tool a "fact" that
points at a file that doesn't exist. It stores it. Delete the file a memory
depends on. It still recalls it. Ask it whether what it returned is still true.
It has no idea — it never checked.

## Trust is the benchmark

So we built the benchmark the category is missing. It measures three things a
memory must get right to be trustworthy:

- **Hallucinated-citation rejection** — does it refuse to store memory citing
  files that don't exist?
- **Stale-memory exclusion** — does it withhold memory whose cited code was
  deleted or refactored?
- **Live grounding** — is the memory actually anchored to real code, right now?

```
$ kage benchmark --trust --project .
Trust score: 100/100
  Hallucinated-citation rejection: 100%
  Stale-memory exclusion:          100%
  Live grounding rate:              99%
```

Most tools score zero on the first two — not because they're bad, but because
they have no mechanism to score on. You can't reject a hallucinated citation you
never checked, or withhold a memory whose grounding you never tracked.

## What trustworthy memory looks like

[Kage](https://github.com/kage-core/Kage) is built around trust, not volume:

- **Validated on write** — memory citing nonexistent files is rejected.
- **Withheld on recall** — memory whose code was deleted is hidden from the
  agent and shown to you on a "Suppression Shelf."
- **Grounded to your code graph** — recall returns the bounded blast radius of a
  change, not just matching text.
- **Governed like code** — memory is plain files in your repo, reviewed in the
  same PR. Zero dependencies, no API key.

See it in 30 seconds: `npx -y @kage-core/kage-graph-mcp demo`

Memory that remembers is table stakes. Memory you can *trust* — and prove —
is the actual unsolved problem. That's the one worth building.
