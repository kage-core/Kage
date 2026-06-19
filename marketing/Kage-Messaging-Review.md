# Kage — Landing Page & Messaging Review

Reviewed: live site at kage-core.com + README, on 2026-06-19.
Lens: converting a developer who's never heard of Kage into a star + an install, optimized for the OSS-traction goal.

**Headline verdict:** The site is genuinely good — better than 90% of early dev-tool pages. The writing is sharp, the proof is concrete, and the integrity (refusing fake testimonials) is rare and valuable. The problem is **not quality, it's clarity-of-first-impression and friction at the top of the funnel.** Below are fixes ranked by impact.

---

## What's already working (keep, don't touch)

- **"Remembering is solved. Trusting isn't."** — your single best line. It defines a category. Use it harder, everywhere.
- The **capture/recall/catch/sync** narrative arc with real terminal snippets. Excellent show-don't-tell.
- **Honesty as a feature** — the empty quote wall that says "we'd rather show you a blank wall than fake quotes." This builds more trust than any testimonial. Keep it until you have real ones.
- The **comparison table** — crisp, specific, and the verification rows are unanswerable by competitors.
- **`audit-claude-mem`** as a competitive wedge — letting rivals' users audit their own rot is brilliant.
- Zero-install proof commands (`scan`, `benchmark --trust`). This is your top-of-funnel; it's already there.

---

## Priority 1 — Fixes that directly affect stars & installs

### 1.1 The hero headline is too abstract for a cold developer

Current H1: **"A framework for collaborative agent memory."**

The word "framework" is vague and slightly enterprise-y, and "collaborative agent memory" is a category that doesn't exist in the reader's head yet — so it doesn't land. A cold developer scanning for 3 seconds doesn't know if this is for them.

Lead with the **pain and the differentiator**, not the category. Options:

- **"Your coding agent forgets everything. Kage gives it memory that's actually true."**
- **"Memory for coding agents — verified against your code, shared through git."**
- **"Stop re-explaining your codebase to your AI agent every session."**

The current subhead is strong — keep it. Just make the H1 do the "is this for me? yes" job in one read. (The page footer/CTA already nails this voice: *"Stop letting your agent forget."* That energy belongs at the top.)

### 1.2 "Get early access" as the primary CTA undersells an installable product

The hero CTAs are **"Get early access"** and **"Read the docs."** But Kage isn't early-access — the OSS core is fully installable *right now* with one command. For the stars goal, the primary action should be the thing that creates advocates: **trying it.**

Recommended hero CTAs:

- **Primary:** `Install in 60 seconds` (anchors to quickstart) or `Star on GitHub` (you want stars — ask for them).
- **Secondary:** `Run the Truth Report on your repo →` (the zero-install `scan` — lowest-friction wow).
- Move "early access" (which is really the *Cloud waitlist*) lower. Conflating the free OSS core with "early access" makes the whole thing feel not-ready, which suppresses both stars and installs.

### 1.3 Ask for the star, explicitly

You want stars. The site never asks for one. The GitHub link in the nav just shows "★ 6." Add a clear, low-key ask — a `Star on GitHub` button in the hero and a one-line "If this resonates, a star helps other devs find it" near the footer. Devs star when asked at the right moment (right after the "aha"). Don't be shy about it.

### 1.4 Surface the social-proof numbers higher

The `100/100 trust · 0 deps · 238 tests · git-native` stats and the npm/stars badges live near the bottom. For a cold visitor deciding whether to keep reading, **at least one credibility anchor should be visible in the first screen** — e.g. the trust score or "0 dependencies, no account" as a strip right under the hero. (Minor inconsistency to fix while you're there: README says 340+ tests and 13–15 agents in places; the site says 238 tests and 13 agents. Pick the true current number and make every surface match — mismatches get noticed and erode the benchmark credibility.)

---

## Priority 2 — Clarity & friction

### 2.1 Define "packet" on first use

"Packet" is core vocabulary but jargon. The first time it appears, one parenthetical: *"a packet (a small JSON file holding one verified lesson)."* Small fix, removes a stumble.

### 2.2 The install story is told twice, slightly differently

The hero shows the `npx install` command AND the "tell your agent to set it up" paragraph. Good, but it's dense. Consider a single clean "Install" with the command big and bold, and the "or just ask your agent" as a smaller toggle beneath — so the primary path is unmistakable.

### 2.3 Make the zero-install `scan` a first-class hero element

`npx ... scan --project .` (the Truth Report) is your *best* acquisition mechanic — it gives value before any commitment and surfaces something true and a little alarming about the visitor's own repo. Right now it's buried in the Proof section. Pull it up: a "Try it on your repo right now, nothing to install" callout near the top will convert skeptics who won't install yet but will run one command.

### 2.4 Pricing section may create hesitation during the stars phase

Three tiers (Open source / Cloud / Team) is correct long-term, but for a cold dev whose first question is "is this free and will it lock me in," leading the pricing section with **"$0 forever, no account, the open-source core is complete on its own"** in the largest type reassures before the Cloud/Team tiers introduce any "is this a trap?" worry. You mostly do this — just make the "complete on its own, free forever" the loudest thing in that section.

---

## Priority 3 — Conversion polish

- **README ↔ site parity.** The README hero GIF (`kage-viewer-walkthrough.gif`) and the site's `kage-demo.gif` should tell the *same* 10-second story: a hallucinated citation rejected, a stale memory withheld, only grounded memory returned. That trust loop is the thing only you do — make it the first moving image on both surfaces.
- **One-line "what is this" for link unfurls.** Your OG description is good. Make sure the very first sentence works as a standalone tweet/Slack-unfurl, because that's how most people will first encounter it: *"Open, git-native memory your coding agents read and write together — verified against your code."* ✓ (yours is close; tighten to one line).
- **Add a visible "Compare to claude-mem / mem0"** anchor in the nav. People who know the category will search for exactly this comparison; meeting that query head-on converts the informed skeptic.
- **The doodle social video** (once produced) belongs near the top of the page too — it's emotional and shareable in a way the terminal demos aren't. Different audience, same page.

---

## The one change that matters most

If you change only one thing: **rewrite the H1 so a developer who's never heard of Kage knows in one read that (a) it's about their agent forgetting their codebase, and (b) it's free, installable now, and verified.** Everything else on the page already supports that — the headline just isn't opening the door the rest of the page walks you through.

Suggested top-of-page, in order:

1. H1: *"Your coding agent forgets everything. Kage gives it memory that's verified against your code."*
2. Subhead: (keep your current one — it's strong).
3. Credibility strip: `100/100 trust · 0 dependencies · no account · one command`.
4. Primary CTA: `Install in 60s` · Secondary: `Run the Truth Report on your repo →` · Tertiary: `★ Star on GitHub`.
5. The hero GIF: the trust loop, autoplaying.
