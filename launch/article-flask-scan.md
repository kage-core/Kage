# dev.to article — famous-repo Truth Report #1: Flask

Post from kage18. Tags: python, opensource, devtools, ai. This is CONTENT, not
a launch — one genuine finding, real evidence, no pitch until the last line.
Honesty rule: only claims I verified by hand. The duplicate/ghost sections of
the raw scan have false positives (dunder methods, dynamically-registered
funcs), so they're deliberately left out — lead with the knowledge void, which
is exactly what it says: churn × dependents × zero written knowledge.

**Title:**

I ran a read-only scan on Flask. Its most-changed file has zero written knowledge.

**Body (markdown):**

I've been building a tool that checks coding-agent memory against the actual code, and it has a side effect I didn't expect to be the interesting part: a read-only "Truth Report" you can run on any repo, no setup. So I pointed it at Flask — a project with 5,500+ commits and some of the best maintainers in open source — expecting it to come back clean.

The headline finding:

    src/flask/app.py — knowledge void
      135 commits of accumulated decisions, 121 graph edges depending on it,
      and zero memory packets or doc mentions.

`app.py` is the heart of Flask. 135 commits of decisions have flowed through it, 121 other symbols depend on it, and there is no durable written record of *why* it is the way it is — not in the repo's memory, not in inline docs that the code graph can see. The knowledge lives in maintainers' heads and in years of PR threads nobody re-reads.

This isn't a knock on Flask. It's the normal state of almost every mature codebase, and it's exactly the gap a new contributor (or a coding agent) falls into: the most important, most-changed file is the one with the least explanation attached to it. The scan ranks these by churn × centrality precisely because that product is where "nobody wrote it down" hurts most.

Four more files in Flask scored the same way — `cli.py` (66 commits, 128 dependents), `helpers.py` (88 × 41), `ctx.py`, and others. High traffic, high blast radius, zero attached knowledge.

How it's computed, so you can trust it: churn is commit count touching the file from `git log`; centrality is in/out edges in a code graph built from the AST; "zero memory" means no memory packet and no doc reference points at it. Every number traces to git or the parser — nothing is generated or guessed.

You can run the exact same thing on your repo (read-only, ~1 minute, nothing written to disk):

    npx -y kage-graph-mcp scan --project .

It also flags duplicate implementations, exported-but-never-called code, and doc claims that don't match the code — I'm leaving those out here because on a stdlib-heavy Python project they need a careful eye (a `__repr__` in two classes isn't a "duplicate"), and I'd rather show you the finding I'd stake my name on.

If you run it on something well-known and it surfaces something genuinely surprising, I'd love to see it.
