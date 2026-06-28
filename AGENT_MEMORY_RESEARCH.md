<!-- Agent-memory frontier research: PEG-M proposal. Produced 2026-06-28 via SOTA survey + invent + adversarial-vet workflow. -->
> Status: RESEARCH PROPOSAL (exploratory). Names (PEG-M, Errata, CauseMap) are working labels. Companion to PIVOT.md.

# Ground-Zero Rethink of Agent Memory: Research + Product Brief

## 1. The Core Insight

**Every surveyed system treats memory as a *retrieval* problem — store text, fetch the similar text later — and every documented failure is a symptom of that one wrong frame.** Retrieval relevance is not task utility; embedding similarity keeps stale-but-similar facts hot; LLM-extracted memories self-confirm because the writer is also the judge; append-only stores grow until accuracy collapses (2400 records → 13% vs 248 curated → 39%). The reframe that makes all of this obsolete: **memory is not text you retrieve, it is a *falsifiable prediction about the codebase that an external deterministic oracle continuously scores*.** A memory exists only because reality disagreed with an expectation; it earns durability only by predicting correctly on a later independent encounter; it dies the instant the code graph it is anchored to moves. This collapses the field's six open problems into one mechanism, because the same deterministic engine (code graph + content-hash staleness + git co-change) becomes the *writer's gate, the forgetter, the staleness detector, and the utility judge* — none of which an LLM or an embedding can be. The frame shift is from **"remember this for later" (relevance-keyed, LLM-judged, append-only)** to **"predict this now, and let the toolchain prove you wrong" (structure-keyed, externally-judged, surprise-gated).** That is precisely the "prove it now" reframe the Probe pivot already bets the company on — applied to the memory layer itself.

---

## 2. Honest Novelty Audit

The five architectures share a common spine (Kage's existing engine: `impactSurface`, `source_hash_staleness`, `detectContradictions`, `createSignedManifest`, the pending inbox). The question for each is whether the *combination* is new against the survey, or a rebrand. I am ranking them by how much genuinely-new mechanism survives scrutiny.

### Errata (prediction-error-gated procedural memory) — **GENUINELY NOVEL. Keep.**
**The novel claim that survives:** the write trigger is *prediction error against a pre-committed, falsifiable expectation*, where the expectation is extracted **deterministically from the action itself** (an edit calling `foo(x,y)` *is* a prediction that `foo` has arity 2; `npm test` *is* a prediction of exit 0), and the falsifier is the toolchain, not the LLM that acted.

**Closest prior art:**
- **Titans' "surprise" signal** (gradient magnitude) — the closest conceptual cousin, but it is a *write-strength heuristic* requiring weight access, not a pre-committed falsifiable claim, and is API-infeasible.
- **Generative-Agents importance score** — a *post-hoc* LLM guess at write time, the opposite of a pre-committed expectation.
- **Reflexion** — writes a verbal lesson *after* a failure, but the failure is self-judged and there is no pre-action prediction.

No surveyed system commits an expectation *before* acting and writes *only* on its deterministic violation. **The "success writes nothing" front-door forgetting** (write volume bounded by how often you can be surprised) is also genuinely absent from the survey — everyone else writes liberally and forgets badly. This is the sharpest answer to the field's WHO problem (reality decides, not the model). **Verdict: novel, and the synthesis is only possible because Kage already has the deterministic falsifier assembled.**

### CauseMap (Brier-scored causal co-change edges) — **GENUINELY NOVEL. Keep — and it's the strongest of the five.**
**The novel claim that survives:** memory is a *falsifiable predictive model scored by a proper scoring rule (Brier) against git co-change at merge time*. The stored quantity **is** calibrated future-edit utility — which structurally collapses the field's #1 unsolved problem (retrieval ≠ utility), because there is no retrieval-relevance step at all.

**Closest prior art:**
- **Logical-coupling / co-change defect-prediction** (Zimmermann, Ying et al., early 2000s mining-software-repositories literature) — co-change mining itself is *old and well-known*. This is the honest non-novelty and CauseMap's writeup admits it.
- **Zep's bi-temporal model** — separates "true in world" from "when we learned it," but invalidates on a *detected text contradiction*, never on a git fact.

**What is actually new** is the *welding* of three things the prior art kept separate: (a) Brier-calibrated co-change prediction, (b) a deterministic *structural witness* (the graph path explaining *why* X forces Y, which suppresses spurious correlation — the thing classic co-change mining lacks and gets criticized for), and (c) **merge-as-the-scoring-oracle** so the agent literally cannot vote its own beliefs true. "Structure proposes, history disposes" is a real and, to my knowledge, un-published fusion. **Verdict: novel at the synthesis level; the cleanest mapping onto the Probe pivot (it upgrades blast-radius from "reachable" to "historically must-co-change, p=0.82, 9/11 merges").**

### Anchor (verified replayable Skill Cards, hash-anchored) — **PARTIALLY NOVEL. Keep, but narrowed.**
**The novel claim that survives:** *code-graph-hash-anchored auto-invalidation of verified procedures* — a skill expires deterministically when the `source_hash` of its anchored symbols changes, with no LLM and no detection step.

**Closest prior art:**
- **Voyager / TOOLMAKER / CodeDistiller** — store verified callable procedures, gated by execution. This is *not novel* and Anchor correctly disclaims it. Voyager did verifier-gated storage in 2023.
- **Zep** — solves staleness for *facts* via bi-temporal edges, but has no tie to source code.
- **SkillOps / "interface drift"** (2026) — *names* the unsolved problem (verified skills rot when dependencies move) but doesn't solve it.

The *only* genuinely new atom is binding a verified procedure's validity interval to `source_hash` rather than to time or a detected contradiction. That single atom is real and unaddressed in the survey. But **the verifier-gated-storage skeleton is pure Voyager**, so Anchor is "Voyager + hash-anchored expiry." **Verdict: one novel atom on a known skeleton. Keep the atom (hash-anchored expiry is worth shipping), but it does not deserve to be the headline architecture — its coverage is gated by "does this procedure carry a cheap re-runnable verifier," which is narrow.**

### GAVM / "Probe-Memory" (claims as typed edges on the graph) — **MOSTLY A FRAMING, NOT A NEW MECHANISM. Fold into the winner; do not build standalone.**
**The claimed novelty:** the code graph is *simultaneously* the admission verifier, the forgetter, and the retrieval index.

**Closest prior art:** this is **the union of Anchor's hash-anchoring + Kage's already-shipped `detectContradictions` + the existing pending inbox**, repackaged as "claims are edges." Every mechanism it cites — anchor-resolution admission gate, dead-anchor GC, stale-on-change, contradiction reconciliation on shared anchor, prompt-cached cartridge — *already exists in `kernel.ts` or is Anchor's atom restated for facts instead of procedures*. The one fresh-sounding idea, the **per-repo prompt-cached "context cartridge"** of verified claims, is a legitimate API-era latency trick (prompt caching is the one parametric-flavored move that works through closed APIs) but it is an *optimization*, not a memory architecture. **Verdict: GAVM is the generalization of Anchor from procedures to claims, plus a caching trick. It is the right *data model* (memory = typed edge on the graph) but contributes no new *mechanism* beyond what Errata/CauseMap/Anchor already supply. Absorb its data model and its cartridge optimization; kill it as a standalone build.**

### Hippocampus (offline consolidation, graph as oracle) — **NOT NOVEL ENOUGH AS A PRIMARY ARCHITECTURE. Kill as the lead; retain one idea.**
**The claimed novelty:** an external deterministic oracle (the code graph) *gates* the LLM's consolidation output before durability.

**Closest prior art:**
- **Sleep-time compute (Letta) / Generative-Agents reflection / Reflexion** — the entire two-clock "cheap append now, expensive abstract offline" structure is *exactly* the consolidation literature. Append-then-abstract-offline is the most rebranded idea in the whole survey (the writeup itself says "much of 2025-2026 is rebranding three 2023 ideas").
- **EDV (Execute-Distill-Verify)** — already established "decouple the writer from the verifier" as the fix for the self-confirmation trap. Hippocampus replaces EDV's multi-agent consensus with a single graph check, which is cheaper but is the *same principle*.

The only thing here that isn't in the survey is **clustering episodes by graph-neighborhood instead of by embedding** and **drift-triggered re-consolidation**. Those are nice, but they are *features of the consolidation pass*, not a new memory paradigm — and critically, **the LLM abstraction step still sits in the loop and inherits all its extraction noise**; the graph only filters afterward. **Verdict: the most rebrand-heavy of the five. Its append-only Tier-0 store is exactly the unbounded-growth liability the field condemns. Kill it as the architecture. Retain exactly one idea — "graph-neighborhood clustering as a non-hallucinated grouping signal" — as an optional offline merge step inside the winner.**

**Audit summary:**

| Architecture | Genuinely novel atom | Closest prior art | Verdict |
|---|---|---|---|
| **Errata** | Pre-committed deterministic expectation; surprise = sole write gate; success-silence as front-door forgetting | Titans (surprise, but weights); Reflexion (post-hoc) | **KEEP — core of the winner** |
| **CauseMap** | Brier-scored co-change + structural witness + merge-as-oracle fusion | Logical-coupling mining (2000s); Zep (bi-temporal) | **KEEP — strongest single architecture** |
| **Anchor** | `source_hash`-anchored expiry of *verified procedures* | Voyager (verifier-gated storage); SkillOps (names the gap) | **KEEP one atom — narrow** |
| **GAVM** | (none — caching trick only) | Anchor generalized to facts + shipped `detectContradictions` | **Fold data model in; kill standalone** |
| **Hippocampus** | Graph-neighborhood clustering; drift-triggered re-consolidation | Sleep-time compute; EDV; reflection | **KILL as lead — rebrand-heavy** |

---

## 3. The Recommended New Method: **PEG-M (Prediction-Error-Gated Memory)**

**Synthesize Errata + CauseMap into one loop, on GAVM's "memory = typed edge on the code graph" data model.** Errata supplies the *write gate* (surprise) and *recall guardrail* (one card, just-in-time); CauseMap supplies the *scoring substrate* (Brier-calibrated co-change against merge) that turns Errata's binary confidence-counter into a calibrated utility estimate; GAVM supplies the *storage shape* (anchored edges, prompt-cached cartridge). Anchor's hash-anchored expiry is the staleness mechanism for both. **Drop Hippocampus's offline LLM consolidation entirely** — there is no separate "abstract the transcript" pass; abstraction *is* the surprise-distillation, which fires rarely.

The unit of memory is a **grounded prediction edge**:
```
{ trigger_fingerprint,            // deterministic graph-neighborhood key (symbol, edge-type, calling-module)
  expectation,                    // the pre-committed falsifiable claim
  falsifier,                      // the deterministic signal that broke it (exit code / stack frame / file:line / missing co-change)
  corrected_expectation,          // "when you see X, expect Y not Z" — the callable guardrail
  structural_witness,             // the graph path explaining WHY (from impactSurface), or null for empirical-only
  p, brier, hits, trials,         // calibrated predictive utility (CauseMap)
  anchor_set: [{symbol_id, source_hash}],   // hash-anchored staleness (Anchor)
  signed_manifest }               // createSignedManifest — reproducible, auditable
```

### The full loop: predict → capture → consolidate → verify → forget

**1. PREDICT (hot path, near-zero cost — the WHEN gate).**
Before a consequential action (edit/save, run test, run command, call a symbol), the harness extracts a *deterministic* expectation from the action itself — no LLM call for the common case. An edit calling `foo(x,y)` predicts `foo` exists with arity 2; editing symbol `S` predicts "the N callers `impactSurface(S)` already knows about still resolve"; `npm test` predicts exit 0. CauseMap adds: editing `S` *also* predicts "the high-p co-change targets of `S` will be touched in this same diff." An LLM is asked for a one-sentence expectation *only* for genuinely ambiguous actions (a "behavior-preserving refactor" claim), ~15 tokens, rare. Expectations live in a tiny in-session ledger keyed by action id. **This is the entire WHEN answer: ingestion is event-gated, never on a timer, never over the whole transcript.**

**2. CAPTURE (surprise-gated — the WHO and WHAT answer).**
The action runs. A deterministic comparator scores prediction error against Kage's existing engine: tool-error/non-zero-exit/stack-trace = hard surprise; test pass→fail = hard surprise; `impactSurface` reverse-walk reaching an unnamed caller = structural surprise (file:line, no LLM); the agent reverting its own edit = behavioral surprise; user rejection = top-priority surprise; a doc/comment claim falsified by the graph = claim surprise (reusing `detectContradictions`'s same-subject/opposing-polarity signature); **a predicted high-p co-change that did NOT appear in the merged diff = missing-co-change surprise (CauseMap's signal).** **No surprise → nothing is written. Success is free.** When surprise fires above threshold, distill one compact errata card into the pending inbox (tagged auto-distill, excluded from recall). **WHO decides: reality, via the toolchain — not the LLM that acted, not a salience score. This is the structural escape from the self-confirmation trap (EDV) without paying for a multi-agent consensus pool — the verifier is the toolchain, independent of the model by construction.**

**3. CONSOLIDATE (no separate LLM pass — the HOW answer).**
There is no Hippocampus-style offline abstraction. Consolidation = merging cards with the same `trigger_fingerprint` into one stronger card, and (optionally) graph-neighborhood clustering to dedup near-identical fingerprints. The representation is a **corrected prediction keyed by a deterministic graph fingerprint, not prose and not an embedding** — which dodges both the prose-strategy-the-model-ignores failure (ExpeL/ReasoningBank) and the loose-NL-description skill-shadowing failure (More-Skills-Worse-Agents) in one move.

**4. VERIFY (the promotion gate — replay + merge as oracle).**
A card graduates from pending to active by two independent deterministic signals:
- **Replay (Errata):** its `corrected_expectation`, re-used as a prediction on the *next independent encounter*, survives without being falsified → confidence up. Mispredicts → confidence down.
- **Merge-scoring (CauseMap):** at every merge (the `kage_pr_check` / kage-sync hook already fires here), each prediction the card made is scored against the actual committed diff via `git log --name-only` set-intersection, Brier-updated. **The agent cannot promote its own card; only an independent merge can.**

A card needs *k* (default 3) surviving encounters with Brier below threshold before it is recallable.

**5. FORGET (three deterministic mechanisms — the answer to the field's weakest area).**
- **Front-door bounding:** success writes nothing → store grows sublinearly in session length, structurally avoiding the 2400→13% append-only collapse. *(Errata)*
- **Predictive pruning:** a card that keeps mispredicting decays its `p`; below a floor it is evicted. **Utility is measured directly — did the memory's prediction come true — which is the field's missing retrieval≠utility link made operational.** *(CauseMap's Brier + ExpeL's auto-prune-at-zero)*
- **Anchored staleness:** each card is pinned to specific `{symbol_id, source_hash}`; a graph rebuild that mutates those hashes auto-flags the card stale via the shipped `kageMemoryReconciliation` path, withholding it from recall until re-verified. **This directly targets the unsolved "staleness in HIGH-relevance memory" case: a frequently-true expectation that the codebase just invalidated is caught by the hash change, not by waiting to be contradicted again (Zep) or by a decay clock (MemoryBank).** *(Anchor)*

### How this answers who/what/when/how + forgetting where the SOTA can't

| Axis | SOTA's broken answer | PEG-M's answer |
|---|---|---|
| **WHO decides to save** | LLM importance score / extraction (self-confirming, noisy) | The **deterministic toolchain** (compiler, test, graph reachability, git co-change, user). The agent has *no vote*. |
| **WHAT to save** | Extracted facts / prose strategies (model may ignore; shadows at scale) | A **corrected prediction keyed by graph fingerprint** — callable as a guardrail, exact-match recall, no shadowing. |
| **WHEN to ingest** | Timer / importance threshold / end-of-session full-transcript pass | At the **instant of falsification only**. Success = zero writes. Write volume is self-bounding. |
| **HOW to represent** | Flat text / KG triple / weights | **Typed edge on the code graph** with `source_hash` anchors, Brier score, signed manifest. Provenance mandatory. |
| **FORGETTING** | None (append-only) / borrowed decay curves / LLM DELETE | **Front-door silence + predictive pruning + hash-anchored auto-stale.** All deterministic, all utility-grounded. |

---

## 4. Why It's Defensible and Buildable Solo

**Buildable on closed APIs with zero weight access.** The entire parametric/latent thread (Titans, Cartridges, LoRA-as-memory, Sparse Memory Finetuning) is correctly off the table — all need gradient/activation access closed APIs don't expose. PEG-M lives entirely in the text/graph/git layer the survey concludes is the *only* viable path on Claude/GPT. I verified the load-bearing primitives already ship in `kernel.ts`:
- `impactSurface` (line 11269) + `shortestDependencyPath` (11408) → deterministic structural surprise + CauseMap's structural witness.
- `detectContradictions` (3659) → claim surprise.
- `source_hash_staleness` policy (4026) + `kageMemoryReconciliation` (4136) → anchored staleness.
- `observationSignalScore` (17596) + the auto-distill pending inbox → the junk gate and review-before-recall.
- `supersedeMemory` (20118) + `createSignedManifest` → auditable forgetting + reproducible provenance.

**What is pure engineering (weeks, not research):**
- The pre-action expectation extractor (deterministic parse of the pending tool call; optional one-line LLM only for ambiguous refactors — cents).
- The surprise comparator (maps exit-code/test-transition/graph-reach/missing-co-change onto a magnitude — arithmetic, no LLM).
- The `trigger_fingerprint` keyer over the existing graph.
- The Brier update + co-change labeler (`git log --name-only` set-intersection — no LLM on the scoring path).
- The replay-to-graduate confidence loop.

**The one part that needs empirical validation, not a research breakthrough:** *expectation coverage*. Whether enough consequential agent actions admit a cheap deterministic falsifier — and whether enough symbol-pairs co-change often enough to reach k=3 before churning away — is an empirical question about real repos, not an unsolved research problem. It is the thing the minimal experiment must measure first.

**Defensibility (deepens the Probe moat, doesn't invent a new one):**
- The moat is **not** the AST parser (clonable) and **not** the API model (commodity). It is the **confidence-calibrated reverse-dependency edge model** that suppresses sub-0.5 name-only edges — the same calibration that makes structural surprise low-false-positive and CauseMap's witnesses precise. A naive "tie a memory to a file" clone over-invalidates (every whitespace change kills cards) or under-invalidates; symbol-level hash granularity is the hard part.
- **A per-repo data flywheel a competitor starts from zero on:** every graduated/pruned card and every merge-scored co-change edge is a labeled `(prediction, falsifier, outcome)` datapoint that calibrates the surprise thresholds and edge probabilities. A late entrant must run on the customer's commit stream for months to match a calibration the customer already has.
- **Cross-vendor neutrality:** one graph scores cards authored by any of 15 agents via MCP — a position a single-vendor incumbent (Copilot baking in its own memory) structurally won't replicate.
- **Strategic fit:** per PIVOT.md, this is the *invisible evidence cache* behind the blast-radius gate. The same engine sells the screenshot-native deterministic artifact while PEG-M is a margin-free internal asset — and CauseMap's "predicted-but-missing co-change" *is* a sharper version of the gate's headline product ("the silent half-edit your reviewer missed, p=0.82, confirmed in 9 of 11 past merges").

Honest limit: the *loop itself* (expect → surprise → write) is publishable, not patent-grade. Defensibility is execution + the assembled engine + the calibration data, not the concept.

---

## 5. The Minimal Experiment (2–4 weeks, prove-or-kill)

**Thesis to test:** *surprise-gated, graph-anchored memory beats RAG-extracted memory at equal context budget, AND its calibrated edges predict real breakage.* Two sub-experiments, both on real merge histories — **not LoCoMo** (too shallow; full-context beats memory there; useless for sustained accumulation).

**Experiment A — Coverage probe (week 1, kill-fast).**
Before building the loop, replay 200–500 real merged PRs from 5–10 active OSS repos (and the founder's own). Measure, with deterministic detectors only:
1. **Surprise coverage:** what fraction of merged PRs contain a *deterministically-detectable* silent breaker (a caller `impactSurface` reaches that the diff didn't touch, a test that flips, a missing high-p co-change)?
2. **Co-change density:** how many symbol-pairs co-change ≥3 times before either symbol churns away (can CauseMap edges reach k=3)?

**Kill criterion:** if <15% of PRs surface a deterministic falsifier *and* co-change edges rarely reach k=3, PEG-M degrades to plain structural blast-radius (still the pivot's floor, but the *novel memory layer* is dead) — stop here, ship only blast-radius.

**Experiment B — Head-to-head on SWE-bench-style multi-step repair (weeks 2–4).**
On a repo with a real test suite (SWE-bench Verified instances, or a self-assembled multi-PR task set), run an agent three ways at **equal injected-context token budget**:
- **Baseline 1:** no memory.
- **Baseline 2:** RAG-extracted memory (mem0-style: LLM extracts facts each session, embedding recall top-k).
- **PEG-M:** surprise-gated cards, graph-fingerprint recall (one card, just-in-time).

**Primary metric:** task resolution rate (test-suite pass), *not* retrieval accuracy. **Secondary:** (a) silent-breakage rate — how often each agent ships a diff that breaks a caller it never named; (b) tokens written to memory per session (PEG-M should be near-zero on success); (c) for CauseMap edges, **Brier score of predicted-missing-co-changes against actual post-merge bug fixes** (does a predicted half-edit actually correspond to a later fix?).

**The decisive comparison:** does PEG-M *resolve more tasks and ship fewer silent breakers than RAG memory at the same context budget* — i.e., is graph-anchored, surprise-gated recall more *useful* (not just more *relevant*) than embedding recall? If PEG-M ≈ RAG on resolution but writes 10–50× less to memory and catches more silent breakers, that alone justifies it (cheaper + a real gate signal). If PEG-M loses on resolution, the coverage gap (Experiment A) is the cause and the thesis is killed.

This doubles as the cold-artifact demo: replaying real merge histories and showing "predicted-missing-co-change → actual later bug fix" *is* the Probe scorecard.

---

## 6. The Honest Risks

1. **Coverage gap is the whole ballgame.** PEG-M only forms memory where a deterministic falsifier fires. Many high-value lessons have *no* deterministic falsifier — "this is the cleaner abstraction," "the staging deploy is flaky on Fridays," "the maintainer prefers small PRs," architectural rationale spanning no single symbol. If that fuzzy class dominates real value, PEG-M is a guardrail for *mechanical* breakage only, and degrades toward ordinary RAG for everything else. **This is the single most likely way it fails to beat plain RAG**, and Experiment A is designed to surface it in week 1.

2. **Co-change sparsity + the spurious-correlation tax (CauseMap-specific).** On small or low-velocity repos, most learned edges never leave the provisional pool before symbols churn away. Worse, naive co-change mining is notoriously noisy: one 200-file formatting commit or a dependency bump manufactures thousands of spurious edges. The mitigations (commit-size capping, requiring a structural witness *or* a high empirical count, fast decay of spurious edges) are load-bearing and *unvalidated at scale* — whether they hold precision without starving recall is the central unproven bet.

3. **Widening elicitation reintroduces the cost it was built to avoid.** If deterministic expectation extraction has low coverage and you "fix" it by asking the LLM to predict on every action, you reintroduce exactly the per-action LLM cost and noisy-judgment problem the design escaped — and false surprises (a flaky test, a non-deterministic build, a *legitimately intended* caller-break) write junk cards that churn the store.

4. **Correlated blind spots where the toolchain is weak.** Dynamic languages, no test coverage, reflection/string-keyed dispatch, cross-repo edges the graph can't resolve → surprise is *silent*, the agent's wrong expectation is never corrected. This is the same "no cheap oracle" wall the procedural-memory thread flagged; PEG-M inherits it wherever the verifier is weak.

5. **Evaluation is genuinely unsolved.** There is no standard benchmark that rewards "verified-fresh, blast-radius-scoped, utility-calibrated recall." LoCoMo is far too shallow to show sustained accumulation. Proving utility (not retrieval) requires the custom merge-history replay in Experiment B — which means *the proof is bespoke and harder to make legible to a buyer* than a leaderboard number. The mitigation (per the pivot) is to sell the self-evidently-valuable deterministic blast-radius artifact and keep PEG-M as invisible infrastructure until a sustained-accumulation eval exists.

6. **Plain RAG might just be good enough at the budgets that matter.** The survey's most uncomfortable finding is that a full-context baseline often beats memory systems outright. If agent context windows keep growing faster than repos do, the *entire memory category* — PEG-M included — competes against "just put the relevant files in context." PEG-M's defense is that it targets *cross-file blast radius* and *temporal co-change*, which don't fit in any context window and aren't visible in the current files — but if that signal turns out narrow, the honest outcome is: **ship the blast-radius gate, treat memory as a thin internal cache, and don't oversell a memory product the field has repeatedly failed to make beat full-context RAG.**

---

**Bottom line:** Kill Hippocampus (rebrand) and standalone GAVM (no new mechanism). Keep Errata and CauseMap, synthesize them into **PEG-M** on GAVM's graph-edge data model with Anchor's hash-anchored expiry. The genuine novelty — *memory as a pre-committed prediction scored by a deterministic external oracle (toolchain + git + code-graph), surprise-gated at the front door and Brier-pruned at the back* — is real precisely because it requires the code-graph + claim-verifier + staleness engine that *only Kage has already assembled*. It is engineering, not research, except for one empirical unknown (expectation/co-change coverage) that the week-1 experiment is built to kill fast. And it lands exactly on the Probe pivot: PEG-M's "predicted-but-missing co-change" is a sharper, calibrated version of the blast-radius gate the company is already betting on.

Relevant files: `/Users/kushaljain/code/Kage/mcp/kernel.ts` (all load-bearing primitives, line numbers cited above) and `/Users/kushaljain/code/Kage/PIVOT.md` (strategic frame: memory demoted to invisible evidence cache behind the blast-radius gate).
