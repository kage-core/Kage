# What the Truth Report scorecard means

`kage scan` reads your repo's code graph + git history in seconds and surfaces
**where knowledge has leaked out of the code** — places where what the code does,
or why, lives only in someone's head, in a stale doc, or nowhere. That's exactly
the knowledge a coding agent re-derives from scratch every session and a new hire
takes weeks to absorb.

So the scorecard isn't a "code quality grade." It's a **map of where your
undocumented knowledge concentrates and where it's most expensive to lose** — and
therefore where verified memory (Kage's job) pays off most.

Every count below is a heuristic *signal*, each finding cited to `file:line` in
the full report (run `kage scan` without `--scorecard`). Green ≠ perfect; it just
means that signal didn't fire.

> One term used throughout: **centrality** = how many other files/calls connect to
> a file in the code graph. High centrality = a hub everything leans on.

---

## The eight signals

### 🧠 Knowledge voids — *the headline metric*
**Detects:** a source file with **≥5 commits** (lots of accumulated decisions)
**and** centrality **≥3** (a hub) that has **zero** memory packets citing it **and
zero** mention in the README/`docs/`.
**Why you care:** this is a file that is important *and* frequently changed, yet
nothing anywhere captures why. Every agent and every new hire flies blind here and
re-learns it the hard way. **This is the #1 thing memory should cover.**

### 🧪 Untested hot paths
**Detects:** a non-entrypoint source file with centrality **≥5**, changed **≥2×**,
that **no test** imports or targets. (Skipped entirely if the repo has no tests —
then "untested" is the baseline, not news.)
**Why you care:** hub files with no test are where regressions hide. An agent (or
human) editing one has no safety net, so changes there are the riskiest in the repo.

### 🗜️ Complexity hotspots
**Detects:** a source file **≥400 lines** that's also a hub (centrality ≥3), or any
file **≥800 lines**.
**Why you care:** the biggest, most-connected files are where knowledge piles up
and onboarding stalls — and the ones an agent literally can't hold in its context
window. These are your comprehension bottlenecks.

### 🧾 Known debt
**Detects:** `TODO` / `FIXME` / `HACK` / `XXX` / `@deprecated` markers, counted in
the most-connected files first (a lone marker in a leaf file is ignored as noise).
**Why you care:** each marker is a decision deferred and undocumented, sitting in a
file other code depends on. Agents trip over these — or worse, "helpfully" act on a
stale `TODO`.

### 👤 Bus-factor-1 files
**Detects:** a source file with exactly **one author** across all of git history,
**≥2 commits**, and **≥1** dependent.
**Why you care:** the knowledge in that file lives in exactly one person's head. If
they go on leave or leave the company, it's gone. This is the team-risk signal —
and the reason Kage shares memory through git instead of one laptop.

### 🔁 Duplicate implementations
**Detects:** functions/classes with the **same name and matching signature across
different directories** (generic names like `init`/`run`/`handler` are excluded).
**Why you care:** "didn't we already build this?" Agents re-implement what already
exists because they can't see it. Each cluster is a dedupe target — and proof that
the codebase's own knowledge isn't reaching the people (or agents) editing it.

### 👻 Ghost exports
**Detects:** an exported symbol with **no call edge, no import, and whose name
appears in no other file** in the repo.
**Why you care:** it's either dead code to delete, or knowledge nobody wired in
(an abandoned feature, a half-finished API). Either way it's a question mark an
agent will waste time on.

### 📄 Doc lies
**Detects:** checkable claims in the README/`docs/` that don't match reality — file
paths that don't exist, `npm` scripts not in `package.json`, CLI commands that
aren't real. (Examples inside fenced code blocks are excluded so a pasted report
doesn't flag itself.)
**Why you care:** this is documentation actively misleading you. It's the most
direct form of "your memory is lying," and exactly what Kage's write/recall/diff
verification exists to prevent.

---

## How to read the whole card

- **Lots of knowledge voids / bus-factor-1** → knowledge is trapped in heads and
  hot files. This is the strongest case for capturing + sharing verified memory.
- **Lots of ghost exports / duplicates** → the codebase's own knowledge isn't
  reaching its editors — cleanup, and a sign agents are working blind.
- **Doc lies present** → your written knowledge has already drifted from the code.
- **Mostly green** (like a small, tidy lib) → the report reassures, too: it tells
  you knowledge is well distributed.

The throughline: **every signal is a place an agent loses time re-learning what
your team already figured out.** `kage scan` finds them; Kage keeps that knowledge
captured, verified against the code, and shared — so it stops getting lost.

Run it on your repo (no install):

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

> Note on shallow clones: git-history signals (knowledge voids, bus-factor, debt
> ranking) **undercount** on `--depth`-limited clones. `kage scan` warns when it
> detects shallow history. Full clone = truer numbers.
