# Kage GTM: win the trust category

## What the incumbent did (study)

agentmemory got to 21K★ with a textbook OSS-devtool GTM:

1. **Thought leadership first.** A viral design-doc Gist (1.3K★) established
   authority *before* the product shipped.
2. **Frictionless, omni-agent install.** `npm i -g`, `npx` one-liner, and
   crucially `npx skills add <repo>` → installs into 70+ agents in one command.
   Plus per-agent copy-paste blocks and plugin-marketplace entries.
3. **Proof-of-work demo.** `demo` seeds data and opens a viewer instantly — value
   visible in 30 seconds, no API key.
4. **Quantified claims.** Reproducible benchmark scorecards (95.2% R@5), cost
   table ($10 vs $500/yr), test count — specific and testable.
5. **Launch blitz.** Product Hunt (featured), Show HN, Trendshift (#19), an
   AI newsletter (AlphaSignal, 180K), Linux Foundation association.
6. **Social-proof flywheel.** Star count → listicles → more stars; testimonials.
7. **Breadth signals.** 10+ translated READMEs, 53 tools, 20+ agent logos.

**Their weakness (where we attack):** they optimize for *capturing/recalling
more*. Their own docs concede **no validation, no staleness checking, no code
graph.** Recall is a saturated metric (everyone clusters 95–97%). They have no
answer to *"can I trust what it returns?"*

## Our strategy: don't out-remember them — out-*trust* them

We do not win "remembers more" (lost). We **create and own a new axis: trust.**

- **Category reframe:** "Every agent memory remembers — can yours tell you when
  it's wrong?" Make the **Trust Benchmark** the metric the category gets judged
  on (our viral-artifact equivalent of their design-doc Gist).
- **Beachhead:** teams/orgs that fear AI-drift and need *auditable, code-true,
  PR-reviewed* memory. A buyer agentmemory doesn't serve.
- **Wedge moats they can't quickly copy:** code-graph grounding, write-time
  validation, recall-time staleness exclusion, git-native governance.

## Match their distribution, beat their narrative

| Lever | Status |
|---|---|
| npx one-liner (`npx -y @kage-core/kage-graph-mcp demo`) | ✅ done |
| 70+ agent install (`npx skills add kage-core/Kage`) | ✅ `SKILL.md` shipped |
| Per-agent `kage setup <agent>` blocks | ✅ done |
| 30-second proof demo | ✅ `kage demo` |
| Reproducible benchmark scorecard | ✅ `docs/BENCHMARKS.md` (trust + retrieval) |
| Conversion-grade README + landing | ✅ done |
| Viewer screenshot proof | ✅ done |
| **Category-defining content** (provocation post) | ✅ drafted → `provocation.md` |
| **Launch posts** (Show HN, Product Hunt) | ✅ drafted → ready to fire |
| Plugin-marketplace entries (Claude Code/Codex) | ⏳ next |
| Translated READMEs | ⏳ later |

## The launch sequence (human-executed)

1. **Seed authority (week 0):** publish the provocation post (blog/dev.to/X) —
   "Your agent memory can't tell you it's lying." Lead with the Trust Benchmark.
2. **Ship the install everywhere (week 0):** confirm `npx skills add
   kage-core/Kage` works; add Claude Code + Codex plugin-marketplace entries.
3. **Launch day:** Show HN (`show-hn.md`) + Product Hunt (`product-hunt.md`) +
   X thread, same morning. Lead with the demo GIF and the trust angle.
4. **Get into the comparisons:** reach out to the "agent memory comparison"
   listicle authors with the trust axis + reproducible benchmark.
5. **Flywheel:** every recall is a chance to earn a star — `kage demo` ends with
   a "star us" nudge; testimonials from early teams.

## Honest expectation

Outright *displacing* a 21K★, Linux-Foundation-backed incumbent on total
adoption is a long shot — that's a distribution war. **Winning the
trust/governance category** (a segment they've conceded) with a defensible,
provable product is achievable, and it's the wedge that compounds. We compete on
the axis we created, not the one they already won.

## What's executable by an agent vs human-only

- **Built (this repo):** the install mechanics, demo, benchmark, README/landing,
  SKILL.md, and all launch copy below — launch-ready.
- **Human-only:** actually posting to HN/Product Hunt/X, newsletter outreach,
  earning stars, and any press. The kit is staged; a human pulls the trigger.
