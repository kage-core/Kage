<!-- Generated pivot strategy — Kage -> Probe. Produced 2026-06-27 via multi-agent research+design workflows. -->

> Status: PROPOSAL for founder decision. Names ("Probe") are placeholders pending trademark/npm/domain check.

# Kage Pivot — The Definitive Recommendation

## 1. The Pivot in One Paragraph

**Kage becomes Probe: the deterministic PR gate that catches the callers your agent silently broke — with file:line proof and no LLM in the verdict.** Probe runs on every pull request as a single, consolidated, non-LLM status check that does one thing better than anything on the market: it traces the *blast radius* of a diff through a real code graph and tells you, deterministically and reproducibly, "this change breaks these N callers across M files" — the cross-file reachability that LLM reviewers provably miss (the 82%-vs-44% gap) and that causes the false positives teams mute within two weeks. The cold artifact is a zero-install scan that shows a stranger a real silent breaker in their own repo in 60 seconds; the paid unit is the hosted gate that posts that check on their PRs and stores the evidence. **The sentence that replaces "memory for coding agents": *Probe is the precision firewall that proves what an agent's PR actually broke — deterministic, file:line-cited, and the same answer every time.***

The headline noun moves from *memory* to *blast radius / verified impact*. Memory becomes an invisible internal evidence cache, never spoken to the user.

---

## 2. Why This and Not the Others

The binding constraints are a sieve. Run all six through them honestly and only one survives with both a *runnable* solo motion AND a *real* monetization surface AND a moat that isn't hostage to unsolved research or an unreachable buyer.

**The winner is `pr-truth-gate` (Probe) — but stripped to its load-bearing leg (blast radius) and grafted with the sharpest ideas from the field.** Here is the crisp reasoning, constraint by constraint:

| Constraint | Probe (blast-radius) | Why rivals fail it |
|---|---|---|
| **Weeks-to-dollar self-serve wedge** | Yes — thin GitHub App over a shipped engine; 4-8 wk | `provenance-audit` & `comprehension-debt-dd` smuggle a 90-day regulated/relationship sale behind a self-serve mask |
| **Real monetization surface (not honor system)** | Yes — hosted blocking status check + evidence store | `wildcard` (Groundcheck) gives away the painkiller free and charges for a receipt nobody asked to buy |
| **Deterministic-evidence moat, never the LLM** | Yes — blast radius is pure graph traversal, zero LLM on the hot path | `doc-truth-gate` (TruthGate) hits a wall: its deterministic surface is a *broken-link linter*, and the valuable claims are semantic-without-an-LLM, an unsolved research bet |
| **Cross-vendor neutrality as the platform defense** | Yes — verifies a PR from any of 15 agents against one graph | All candidates have this; it's the universal graft, not a differentiator |
| **Cold artifact: embarrassing file:line problem in 60s** | Yes — "this PR silently breaks these 7 callers your reviewer missed" | This is the most *screenshot-native* artifact in the entire deck |

**Why each rejected candidate loses:**

- **TruthGate (doc-truth-gate) — REJECTED.** Both lenses converge: the deterministic surface that *ships today* is exactly three checks (dead paths, missing npm scripts, phantom CLI commands). That's a broken-link checker a free GitHub Action eats in an afternoon. The venture case depends on expanding to semantic claims *without* an LLM — which the founder's own writeup concedes is "genuinely unsolved." You cannot build a blocking gate on a research bet. **Grafted:** the "doc lie of the day" content engine and the leaderboard backlink loop — the best top-of-funnel mechanic in the set.

- **Reachable (fp-killer-substrate) — REJECTED as the *primary* frame, ABSORBED as the *engine*.** Its core insight (deterministic reachability is the precision layer everyone lacks) is correct and is literally Probe's engine. But its *business* is B2B2D — licensing the reachability API to review vendors (Qodo, Greptile). That has the worst buy-vs-build dynamic in dev tools: a $70M-funded Qodo will *build* the one primitive that drives its public benchmark before it routes it through a solo founder's SLA-less API. And the vendor sale is a 60-120 day partnership motion the no-audience founder converts at ~0. **Grafted:** the "False-Positive Audit" cold artifact (replay a repo's last N review flags, score how many target dead code), the confidence-scored sub-0.5 edge suppression as the precision primitive, and the "prove it on your own repo with a neutral benchmark" trust-unlock. The vendor-OEM API is *kept as a Month-12+ expansion door*, never the wedge.

- **Provenable (provenance-audit) — REJECTED.** Best-defended candidate in the set, but it relocates Kage's exact structural trap one floor up: the forcing function (EU AI Act, 7% penalty) lands on the CISO, while only the unforced engineer can self-serve a $39 scorecard. The money sits behind the 90-day regulated sale the founder can't run, and "audit-grade" is an *acceptance* claim hostage to an unratified standard war. **Grafted:** the self-demonstrating *signed* artifact (every scorecard stamped with `createSignedManifest` — SHA-256 + repo HEAD — so a skeptic re-runs it and gets the identical hash). This kills the "an LLM hallucinated this" objection for free and becomes Probe's evidence-receipt spine. The full Art. 11/12 export is parked as the *18-month* expansion ceiling, not the opening.

- **Audit (comprehension-debt-dd) — REJECTED.** Cleanest time-to-dollar and a beautiful WTP anchor ($499 vs a $20K manual audit), but the buyer is a low-thousands, lumpy, relationship-gated population (boutique tech-DD firms, fractional CTOs) that a no-audience solo cannot penetrate before burnout — and a DD consultant won't stake their billable reputation on an unknown founder's unbranded score. It's a real $1-3M consultancy-tool, not a venture path, and the moment it works, an incumbent with the audience bolts a "diligence PDF" button on. **Grafted:** the *Comprehension Debt Score* concept becomes a single reproducible headline number on the scorecard (re-run hash included), and the "AI Slop Index" public leaderboard becomes a content-engine mechanic.

- **Groundcheck (wildcard) — REJECTED as a *product*, its *reframe* is the soul of the pivot.** The skeptical-operator lens is decisive: WTP collapses at the gate because the free local engine already solves the agent's pain (reject/retract locally for $0), so the hosted permalink is a vitamin on top of a free painkiller. And it bets the company on agents *voluntarily* calling an optional MCP tool — which they skip. **Grafted — and this is the single most valuable steal in the entire deck:** the reframe from *"remember this for later"* (memory, a dying category) to *"prove this right now"* (synchronous verification at the moment of change). That reframe is exactly why Probe wins: a blocking PR gate is verification made *synchronous, involuntary, and felt-in-the-moment* — the human can't merge until the deterministic check passes. Also stolen: MCP-directory listing as captive, intent-rich distribution.

**The synthesis:** Probe is `pr-truth-gate`'s gate, powered by `fp-killer-substrate`'s reachability engine, sold via `doc-truth-gate`'s leaderboard content loop, made trustworthy by `provenance-audit`'s self-signed reproducible artifact, framed by `wildcard`'s "prove it now" reframe, and headlined by `comprehension-debt-dd`'s single reproducible score. One coherent product, wedge-now / expand-later.

---

## 3. ICP & The Wedge

**Exact first buyer.** The eng lead / staff engineer / "review owner" on a **5-40 dev team that adopted Claude Code, Cursor, or Copilot in the last 6 months** and is now drowning in agent-authored PRs they can't fully trust. They already pay $24-48/user/mo for CodeRabbit/Qodo/Copilot review and are *actively frustrated by its false-positive noise*. They own the CI config, sign on a corporate card up to ~$1-2K/mo without procurement, and got personally burned last month merging an agent PR that "looked right" and silently broke prod. They live in r/ExperiencedDevs, the Claude Code / Cursor Discords and subreddits, Hacker News, Lobsters, and the GitHub issue threads where people complain "AI review is too noisy, we muted it."

**The zero-install cold artifact (build it first).** `npx probe <PR-url-or-repo>` (and a paste-a-PR-URL box at probe.dev) — read-only, no account, ~60s. It runs the existing graph against the diff and emits a **shareable, self-signed SVG scorecard** with three panels, leading with the scary one:

1. **BLAST RADIUS (the headline):** "This diff changes/removes 4 symbols → silently breaks **7 callers across 3 files** your reviewer never mentioned," each cited to file:line, each traced through real call/dependency edges. This is the load-bearing artifact.
2. **FALSE-POSITIVE AUDIT (stolen from Reachable):** point it at a repo and it scores how many of the *last N AI-review flags* target dead/unreachable code — "6 of your last 20 AI flags are unreachable; here they are." Weaponizes the tool they already pay for, against itself.
3. **DOC LIES introduced by the diff (stolen from TruthGate):** README/CLI/script claims the PR makes false.

Every scorecard is stamped with `createSignedManifest` (SHA-256 + repo HEAD) so a skeptic re-runs it and gets the *identical hash* — the trust-unlock that kills the "an LLM made this up" objection. The neutral benchmark harness ships alongside as "reproduce our precision on your own repo."

**The first paid unit.** The hosted **Probe Gate** GitHub/GitLab App. On every PR it runs the same deterministic engine and posts **one consolidated status check** (pass/fail + the blast-radius table) — *not* inline comment noise. Policy: block merge if blast radius hits a protected path, or set advisory-only. It stores the tamper-evident evidence trail and exposes a verify-link. **Local CLI + engine stay free and MIT** (the funnel and the reproducibility proof); **the hosted gate, evidence store, policy engine, and dashboard are the paid gate** — the part the honor system can't bypass, because a *blocking required check* must run in CI under an account.

**Concrete enough to build Monday:** retarget `kage scan`'s `impactSurface`/blast-radius walker and `shortestDependencyPath` (already in kernel.ts) from whole-repo to single-diff scope; render the existing `truthScorecardSvg` with the new three-panel layout; wrap as a GitHub Check Run; add Stripe + seats.

---

## 4. Business Model

**Open-core. The local engine is the funnel; the hosted blocking gate + evidence store is the meter.**

| Tier | Price | What's gated |
|---|---|---|
| **Free / OSS** | $0, MIT | Local CLI (`npx probe`), the code graph, blast-radius + FP-audit run locally, the public self-signed scorecard, the benchmark harness. Public repos get advisory checks. |
| **Team** | **$30/contributing-dev/mo** (annual; $36 m2m), billed only on devs who open PRs, **5-seat / $150/mo floor** | Hosted Probe Gate as a *blocking* required check, consolidated single-check, evidence store, protected-path policy, Slack/webhook alerts |
| **Business** | **$60/dev/mo** | The precision benchmark replayed on *your own* merged-PR history, per-agent/per-author "silent-breakage trend" analytics, org-wide require-green-to-merge policy, SSO, 12-mo evidence retention |
| **Enterprise** (expansion, yr 1+) | **$30K-$150K/yr** | Self-hosted/VPC runner, tamper-evident retained evidence ledger, EU AI Act Art. 11/12 evidence export, unlimited repos |

**Pricing logic:** deliberately *just under* CodeRabbit/Qodo's $24-48 *per dev* (Probe bills only PR-openers, so effective spend is lower), positioned as the **precision gate that runs ALONGSIDE** the reviewer they already have — an add-on, not a rip-and-replace. That kills the "I already pay for review" objection.

**Unit economics.** The verdict is a deterministic graph traversal — **zero LLM tokens on the load-bearing path** (an LLM only optionally parses a messy PR description, and that can be skipped or run on a cheap local model). COGS per PR check is fractions of a cent of compute; the only real cost is the hosted evidence store (cheap object storage). **Gross margin ~90%+.** This is also a *cost moat* vs LLM-judge reviewers who burn real tokens per PR.

**Path to revenue:**
- **First $1k MRR (~month 2-3):** ~7 Team teams at the $150 floor, converted from the HN/Reddit cold-artifact spike → Marketplace self-serve install.
- **First $10k MRR (~month 5-7):** ~40-60 Team teams + first few Business upgrades, driven by the leaderboard backlink loop + the "silent breaker your LLM reviewer missed" proof compounding.
- **First $100k MRR (~month 12-18):** Business tier becomes the workhorse (analytics + benchmark as the renewal artifact), plus the first 1-3 Enterprise contracts ($30K-150K/yr) as the evidence ledger graduates into the EU AI Act / procurement expansion.

---

## 5. The Wedge → Expansion Arc

**Months 0-3 — Wedge (the only thing that matters):** Ship `npx probe` + the paste-a-PR-URL web demo + the self-signed three-panel scorecard. Ship the hosted Probe Gate as a self-serve GitHub App with the consolidated blocking check and Stripe. Land via the cold artifact on HN/Reddit. **Goal: first paying team off a single true silent-breaker the gate caught.** Headline noun: *blast radius*. Memory framing fully buried.

**Months 3-9 — Land & deepen:** Build the **Business tier**: the precision benchmark replayed on the customer's *own* merged-PR history (the proof-of-value AND renewal artifact), plus per-author/per-agent silent-breakage analytics ("which agent ships the most callers-broken PRs"). This monetizes the "86% of eng leaders can't tell which AI tool delivers value" pain via Asset D reframed as *verification ROI*. Add the FP-audit as a standing dashboard. Begin the **content-engine flywheel** (the "AI Slop Index" / "Agent PR Honesty" leaderboard) as compounding inbound.

**Months 9-18 — Expand into budget:** The retained, tamper-evident evidence trail (claim → diff → graph evidence → gate decision, per PR, signed) becomes **"show-the-auditor" provenance** for AI-generated code under EU AI Act Art. 11/12. This is where the **regulated-audit budget opens** — and *only here*, as an *expansion* on accounts that already trust the gate, never as the wedge. Sold at $30K-150K/yr to regulated buyers alongside the org-wide policy engine. **Optionally** open the vendor-OEM door (license the reachability verdict to a review tool) — but only opportunistically and from a position of having self-serve revenue, so no single vendor relationship is load-bearing.

---

## 6. Product: Keep / Refactor / Rip Out

The new hero surface is **`npx probe` (cold) → the Probe Gate Check Run (paid)**. Roughly **70-75% of the ~35K LOC survives**; the rip-out is positioning and UX, not engine.

**KEEP nearly intact (the moat — ~70%):**
- **`kernel.ts` graph engine** — multilingual tree-sitter/TS-AST/regex parsing, forward+reverse dependency adjacency, the **confidence-scored call-edge model that already drops sub-0.5 name-only edges** (this *is* the false-positive-suppression primitive), `shortestDependencyPath`, the `impactSurface`/blast-radius walker. This is the product now.
- **`truthReport()` + doc-lie detector + `truthScorecardSvg`** — becomes the cold scorecard, retargeted whole-repo → single-diff.
- **`createSignedManifest`** (in `mcp/registry` / `graph-registry.ts`) — becomes the self-demonstrating signed-receipt primitive on every scorecard and every gate verdict. Already shipped; this is why "weeks to dollar" is credible.
- **The benchmark harness** — becomes "prove our precision on your own repo," the category's accuracy-distrust antidote.
- **`kage_dependency_path` / `kage_risk` MCP tools** — re-skinned as the public Reachability/blast-radius surface.
- **The 15-agent MCP/CLI cross-vendor plumbing** — becomes the neutrality moat and the per-agent distribution surface.

**REFACTOR / repurpose:**
- **Asset A verification sandwich** → the gate core: write-time rejection becomes "claim references a symbol that doesn't exist"; diff-time alert is *promoted from a side-feature to THE product* (the blast-radius engine).
- **Asset E stale-reconciliation / `kage pr check` loop** → the per-PR claim-vs-code drift check and the consolidated Check Run.
- **Asset D gains receipt** → the Month-3+ "verification ROI" / silent-breakage analytics dashboard.
- **The `.agent_memory` packet store** → demoted to an *invisible internal evidence cache*. Attestations are packets; the user never hears "memory."

**RIP OUT / delete from the product surface (~25-30%, mostly UX & positioning):**
- The `kage_learn` / `kage_recall` / `kage_supersede` **user-facing memory product**, `MEMORY.md` framing, the "ambient repo memory for coding agents" pitch, the team-memory recall narrative, the gains-receipt *token-ledger UI* as a headline, and the daemon/viewer's "memory feed" framing (the SSE/fs-watch infra can be repurposed as a live gate-event feed if useful, but the "memory" viewer is gone).

**NEW BUILD (~25%, thin — a wrapper over a shipped engine):** hosted GitHub/GitLab App (OAuth install, run engine on the diff in a runner, post a Check Run), the consolidated single-check formatter, the evidence store + verify-link, the public PR-URL web demo, Stripe + seats, the Business-tier dashboard.

---

## 7. GTM for a Solo Founder With No Audience

Cold DM is *proven dead* (1 click from 20, 0 conversions). The entire motion is **artifact-first**: the post IS the product, specific and embarrassing and verifiable. First 5 moves to the first 10 paying customers:

1. **Manufacture proof at scale, then Show HN.** Script `probe` over recent merged PRs in popular OSS repos and public agent-authored PRs (Dependabot/Devin/"Claude opened this PR" threads). Find real silent breakers. Post: *"Show HN: Probe — I scanned 200 merged PRs and found the callers they silently broke (deterministic, not another LLM commenter)"* with a live paste-a-PR-URL demo and the honest reproducible benchmark. This audience *felt* the false-positive pain.

2. **Reply-guy with evidence, never opinions.** When someone posts "AI review is too noisy" or "an agent broke prod" in r/ExperiencedDevs / the Cursor/Claude Code Discords, reply with a *Probe scorecard run on a relevant public PR* — the artifact is the credibility. This is the *only* version of "outreach" that works for him: a finished, signed, file:line deliverable about a real PR, not a pitch.

3. **Public "Agent PR Honesty" leaderboard (the content flywheel, stolen from TruthGate + comprehension-debt).** Run Probe across N public agent-authored PRs; publish which agents most often ship silent breakers. Neutral, vendor-cross-cutting, link-bait — the agents' own vendors and journalists share it. Every scan is a backlink; every leaderboard entry is a shareable signed SVG.

4. **List in the MCP directories + GitHub Marketplace (stolen from Groundcheck).** Smithery, mcp.so, Cursor's MCP list, awesome-mcp-servers, and the GitHub Marketplace listing for the App (two-click install). This is *captive, intent-rich distribution the cold-DM funnel never had* — the user arrives already trying to install a tool. One afternoon of work.

5. **Drive-by PRs against high-traffic OSS.** Open polite PRs fixing real silent breakers / doc lies Probe found, "found via `npx probe`" in the body. Maintainers merge the fix and discover the tool; seeds Marketplace organically.

**What NOT to do:** no cold DMs; no enterprise/compliance sales as the opening move; no leading with "memory" or "EU AI Act"; no leading with the *claim-vs-diff* framing (it secretly needs an LLM to parse PR prose and reintroduces false positives — **lead with blast radius**, which is pure graph and screenshot-native).

---

## 8. The 90-Day Plan

**Weeks 1-2 — The cold artifact.** Retarget the blast-radius walker + `shortestDependencyPath` to single-diff scope. Render the three-panel self-signed scorecard. Ship `npx probe <PR-url|repo>`. Dogfood on the founder's own repo and 20 public ones.

**Weeks 3-4 — The web demo + content seeding.** Stand up probe.dev with a paste-a-PR-URL box and the public benchmark page. Manufacture the first leaderboard dataset. **First Show HN goes live end of week 4.**

**Weeks 5-7 — The paid gate.** Build the hosted GitHub App: OAuth install, run engine on the PR diff in a runner, post the consolidated blocking Check Run, evidence store + verify-link. Add Stripe + seats. List on GitHub Marketplace + MCP directories. **🎯 FIRST REVENUE MILESTONE: first paying Team team (~week 7-8)** off a self-serve install converting a true silent-breaker into a blocking check.

**Weeks 8-10 — Convert & instrument.** Reply-guy campaign in earnest with real scorecards. Ship the FP-audit panel. Add basic per-repo dashboard. Measure: scan→install rate, install→paid rate.

**Weeks 11-13 — Repeatability test.** Ship the precision-benchmark-on-your-own-repo (the Business-tier proof). Second Show HN / Reddit push with the leaderboard. **Goal by day 90: $1k MRR and a validated artifact→install→paid funnel** — proving the *distribution* (the real unknown), since the engine already works.

---

## 9. Risks, Kill-Criteria, and the Honest Case This Also Fails

**Risk 1 — GitHub absorbs it.** Copilot review already went agentic with deterministic CodeQL/ESLint (Mar 2026); a basic blast-radius bolt-on is the obvious next step, and ~80% of teams are single-vendor, so "cross-vendor neutral" only matters to the multi-agent minority. *Mitigation:* win the multi-agent + false-positive-fatigued segment fast; be the *alongside* precision gate not the replacement reviewer (lower switching cost); make the reproducible benchmark the wedge GitHub's bundled tool won't bother to ship. *Honest read:* this caps the *neutrality* TAM — but blast-radius precision is a real product even single-vendor, because Copilot's own gate is incentivized to be lenient on Copilot's PRs.

**Risk 2 — The cold artifact converts to stars, not subscriptions** (Kage's exact wall). People screenshot the scorecard, don't install the blocking gate. *Mitigation:* the bet is that a GATE that *blocks a bad merge* has structurally higher WTP than a memory tool — but it's still a bet. The blocking-required-check is the forcing function memory never had.

**Risk 3 — Determinism is too narrow / false positives on large polyrepos.** Cross-*repo* (vs cross-*file*) reachability is genuinely hard; if verdicts are noisy on big monorepos, Probe reproduces the very problem it sells against, and a blocking gate makes false positives *unforgivable*. *Mitigation:* lead with intra-repo reachability where the engine is already strong; keep the sub-0.5-confidence edge suppression honest; the benchmark-on-your-own-repo gate must be brutally truthful.

**Kill-criteria / abort signals (decide by day 90-120):**
- Scan→install conversion **< 2%** after two front-page/Reddit moments → the artifact doesn't carry the gate; iterate the artifact.
- Install→paid **< 5%** → the blocking gate isn't worth $150/mo; the WTP bet is wrong → pivot toward the Business analytics framing or reconsider.
- First-week uninstall rate **> 30%** driven by false positives → precision isn't gate-grade; retreat to advisory-only and intra-repo scope.
- **Zero paying teams by day 120** despite distribution → this is Kage's wall again; the category WTP bet failed.

**The honest case this fails:** GitHub ships a good-enough native blast-radius check before Probe reaches escape velocity, the neutrality advantage collapses to a minority segment, and the cold artifact gets admired but not installed — leaving a great tool with the same distribution problem that killed Kage, just with a sharper wedge. The difference this time is a *blocking gate with a real meter*, not a free local honor-system tool — that's the structural fix, but it is still a distribution bet, and distribution was always the founder's actual weakness.

---

## 10. The Decision the Founder Must Make

**Fork 1 — Lead with BLAST RADIUS or with CLAIM-VS-DIFF?**
The original `pr-truth-gate` spec headlines "claim-vs-diff" (does the PR do what it said). But that step *secretly needs an LLM* to parse messy PR prose — violating Constraint 3 and reintroducing the false positives that get tools muted. Blast radius is pure graph: deterministic, reproducible, screenshot-native.
> **Recommendation: lead with blast radius, decisively.** Keep claim-vs-diff as a *secondary, advisory* panel powered by an optional local LLM, never as the headline and never as a blocking condition. This is the single most important framing decision and it's not close.

**Fork 2 — Dev self-serve first, or design-partner first?**
A founder with enterprise appetite might chase a lighthouse design partner for the evidence-ledger/compliance story early.
> **Recommendation: dev self-serve first, unambiguously.** The founder's reality (no audience, cold-outreach converts ~0, no sales team) means the design-partner/regulated motion is exactly what killed Kage. Self-serve off the cold artifact is the *only* motion he can actually run. Park the design-partner motion for Month 9+, and only after self-serve revenue exists — then a design partner is a *pull*, not a *push*.

**Fork 3 (genuine, founder's risk appetite decides) — Open-core boundary: how much engine to open-source?**
Opening the full engine MIT maximizes the funnel and the reproducibility-trust moat but hands a copycat the parser. Keeping the graph closed protects IP but weakens the "verify it yourself" trust-unlock the whole category demands.
> **Recommendation: open the engine, gate the hosted artifact** (the blocking check, evidence store, policy, dashboard, benchmark-on-your-history). The moat was never the AST parse — it's the confidence-calibration data compounding from every gate run, the hosted tamper-evident trail, and the merge-policy teams standardize on. Reproducibility *is* the trust, and trust is the wedge. If the founder's risk appetite is lower, keep only the calibration weights and the benchmark-replay proprietary — but open the parser. Closed-core here trades away the one thing (independent reproducibility) that defeats the category-wide accuracy distrust.

---

**Bottom line:** Pivot Kage to **Probe** — the deterministic, cross-vendor, blast-radius PR gate. It's the one candidate that satisfies all four binding constraints with a motion a solo no-audience founder can actually run: a screenshot-native cold artifact, a real blocking-gate meter at 90% margin, a moat in the graph (never the LLM), and a neutrality position the platform owners structurally can't occupy — with a credible 9-18 month arc into the regulated-audit budget once the self-serve wedge has earned the right to chase it.
