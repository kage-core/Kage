<!-- No-store agent-memory design + red-team. 2026-06-28. Companion to AGENT_MEMORY_RESEARCH.md and PIVOT.md. -->
> Status: RESEARCH (exploratory). Verdict: hybrid (re-derivation-first + store-as-enforcement + sub-100 negative-knowledge store).

# Memory Without a Store: Re-Derivation + Stigmergy as the Substrate for Coding Agents

> **Thesis.** A coding agent does not need a curated, natural-language memory store to "remember" the things that actually bite it. The two facts that dominate real coding work — *"what will this edit break?"* and *"these files move together, you forgot one"* — are **pure functions of the code graph and git history**. They can be **recomputed live at the moment of decision**, with the agent's own next action as the query, and the durable lessons can be **crystallized into compiler/linter/test artifacts** that re-teach for free. The cost of this is not zero. The honest version of the thesis is **"no rotting shadow record-store,"** not "literally no persistence" — and a thin, source-anchored store survives for exactly one class of fact that has no structural projection. The red-team forces that boundary; this brief draws it precisely.

---

## 1. How it works, end to end

The loop has two engines that **share one set of oracles**. One runs every turn (cheap, read-only). One runs rarely (per-lesson, write-once).

### Engine A — Re-Derivation: the action *is* the query

A normal store needs a stored **cue** to retrieve a stored **fact**. Re-derivation has neither. The cue is the agent's next tool call; the fact is computed on the spot from the graph.

**Trigger model (fires on tool-call boundaries, not chat turns):**

| Trigger | Cue (the query) | What runs |
|---|---|---|
| **PRE-EDIT** — Read/Edit/Write on path `P`, or `git apply` touching `P` | `P` itself | the deterministic bundle below, scoped to `P` |
| **PRE-COMMIT / Stop hook** — `git commit`/`push`/end-of-turn | the changed-file **set** (`git status --porcelain`) | per-file bundle + **co-change/impact deltas over the changeset** |
| **EXPLICIT-ASK** — model emits "what calls X", "safe to change Y" | NL → graph path via `resolveCodeGraphPath` (`kernel.ts:11370`) | path/impact queries + `shortestDependencyPath` (`:11408`) |

No query log, no embedding lookup. The trigger payload — the path or changeset the agent is *already acting on* — is the entire query.

**The deterministic bundle** (all over the in-memory `CodeGraph`, all shipped today):

- `impactSurface(P)` (`:11269`) — 2-hop reverse-dependency BFS, top-5 by incoming edges → *"editing P breaks these."*
- `dependents.get(P)` → exact what-calls-what.
- `gitFileSignal(P)` (`:11157`) — commit counts (total/30d/90d), `primary_owner_pct`, and `co_change_partners` (`:11142`) → *"P historically ships with these."*
- `hasTestCoverage(P)` (`:11290`) → test-gap boolean.
- `classifyRisk` (`:11302`) → one of `churn-heavy / high-coupling / single-owner / test-gap / stable`.

**Ephemeral injection.** Results serialize into a compact block (60–120 tokens, exactly the shape of the `risk_summary` string at `:11354`), returned as the tool result for *this* turn. It lands in context for this decision and is discarded when the turn ends. Never written to `.agent_memory`, never committed, never re-loaded.

**Continuity across sessions = determinism over a shared substrate.** A fresh session, on its first Edit of `P`, fires the identical PRE-EDIT trigger and derives the identical block from the identical `(graph, git log)`. There is nothing to "reconstruct" because there was never session-local state. The memory persisted across sessions *is the substrate itself* — the graph and git history the team already maintains as code.

### Engine B — Stigmergic Artifact Emitter (SAE): lessons as enforced artifacts

When a lesson is **durable and oracle-checkable**, you don't write it down — you mint the **cheapest artifact the toolchain will re-teach**, so the next agent (any vendor) learns it from the compiler, not from a recall query.

The router uses a strict precedence ladder, cheapest-and-most-static first (a type re-teaches at every keystroke; a test only re-teaches at test-run time):

1. **Type / branded type** — if statically checkable in the file's language. Re-taught by `tsc`/`mypy`/`rustc`, zero runtime cost.
2. **Lint rule / AST guard** — "never call X / never write Y". Re-taught by the linter in editor + CI + pre-commit.
3. **Assertion at the boundary** — runtime invariant that can't be lifted to a type. Re-taught whenever the line executes.
4. **Test** — *last resort only* (most expensive, can rot), and only if the bloat gate passes.
5. **NULL (refuse)** — taste/process lessons with no oracle. The emitter emits **nothing** and says so. This refusal is the honest boundary, not a bug.

**The bloat gate** (the anti-write-only-ratchet) reuses the same oracles:
- **REDUNDANCY** — already enforced? (`hasTestCoverage`, AST search, type check) → emit nothing.
- **REACHABILITY** — only mint an artifact for a coupling with **non-empty `impactSurface`**. The artifact's right to exist *is* the graph edge it protects.
- **SUBSUMPTION** — encode **once** at the cut vertex (`impactSurface` identifies it), not N times at N callers.
- **DECAY-SAFETY** — refuse a test pinned to a high-churn `source_hash`; downgrade to an assertion that travels with the code.

Then **synthesize minimal + VALIDATE on this repo**: a type must `tsc`-fail on the offending sites and pass once fixed; a lint rule must fire on the pattern and **not** flag pre-existing code (run repo-wide; if it flags existing code, narrow or abort); a test must **fail on the pre-fix tree and pass on the fixed tree**. No artifact ships unproven.

### Worked multi-step example (both engines, one task)

**Task:** *"add rate limiting to the login endpoint."* Agent opens `src/auth/login.ts`.

**Turn 1 — PRE-EDIT re-derivation** fires with target `login.ts`:
```
Editing src/auth/login.ts. Risk: high-coupling + churn-heavy (18 commits/90d).
Breaks-if-wrong (2-hop): api/routes.ts, middleware/session.ts, auth/index.ts, e2e/auth.spec.ts.
Co-changes with session.ts (9x), auth.test.ts (7x), rate-limit.ts (4x) — none in your working tree.
Sole owner: Dana.
```
With **no stored note**, the agent knows to also open `session.ts` and `rate-limit.ts` and update `auth.test.ts`. A markdown memory would have tried (and rotted) to encode *"remember login and session move together."*

**Turn 3 — the agent later changes `parseAmount(raw): number` in `billing/parse.ts`** to return integer *cents* instead of float dollars, fixing a rounding bug. It updates `parse.ts` and the one caller it noticed, and commits.

**Turn 4 — PRE-COMMIT re-derivation** runs `impactSurface('billing/parse.ts')` over the changeset and surfaces that `invoice/total.ts:88` and `reports/export.ts:142` also call `parseAmount` and still `* 100` — now double-scaled. The agent broke two callers it never opened. It fixes both.

**Now the durable lesson exists** — *"parseAmount returns integer cents; callers must not re-scale."* The **SAE** runs:
- **CLASSIFY:** SHAPE_CONTRACT (3 callers depend on the unit) over SHAPE_TYPE_NARROWING (return is a unit, not an arbitrary number).
- **ROUTE:** ladder hits rung 1 — emit a branded type `type Cents = number & { readonly __brand: 'Cents' }`, change the signature to `parseAmount(raw: string): Cents`. The `amount * 100` sites now **fail to typecheck**.
- **BLOAT GATE:** REDUNDANCY (no existing brand) → proceed. REACHABILITY (`impactSurface` = 3 real dependents) → right to exist. SUBSUMPTION → encode once at the return type, not 3 caller-tests. DECAY → a type travels with the symbol, not pinned to `source_hash`.
- **VALIDATE:** `tsc` errors on the un-fixed sites (proves the brand encodes the lesson), passes once fixed (proves correctness). If the field were `any`, it falls down the ladder to an `assert(Number.isInteger(out))` at the boundary, then to a regression test that fails on the pre-fix commit.
- **PLACEMENT:** the brand lives next to the function. The next agent — Claude, GPT, Cursor, a human — editing a caller gets a red squiggle and a `tsc` failure. **It never queries Kage, never reads a packet.** The coupling now lives in the type system, the real source of truth.

The asymmetry is deliberate: **re-derivation is per-turn so it must be microsecond-cheap; the SAE is per-lesson so it can afford to run the full toolchain once.** You pay once to mint an enforcing artifact, then every future turn re-teaches for free via the compiler instead of paying recall tokens forever.

---

## 2. What persists vs what's ephemeral — the exact line

> "No store" means **no curated natural-language record-store that drifts from the code**. It does **not** mean zero bytes on disk. Drawing this precisely is the whole game.

| | **PERSISTS** | **EPHEMERAL** |
|---|---|---|
| **Re-derivation** | The **substrate**: code graph artifact under `.agent_memory/indexes`, git history, source + tests. *Plus* (see §3) a HEAD-keyed derived-fact cache that the red-team proves you cannot avoid at monorepo scale. | The entire derived bundle: `impactSurface` lists, dependent counts, risk class, co-change deltas, the injected block. No cue→fact mapping, no derivation log, no cached "answer." Delete every block and the next trigger is unchanged. |
| **SAE** | The **emitted artifact only**: branded type, lint rule, inline assert, or test case — committed into normal source/config/test files. It survives because the compiler/linter/test-runner already runs it. The rationale lives in the **git commit message of the artifact diff**, not a parallel store. | Everything the emitter consumed: `impactSurface` set, `hasTestCoverage` result, co-change partners, the lesson "shape," the routing decision, the validation runs. To ask *"why does parseAmount return Cents?"* you re-derive it: the type + `git blame`/co-change on that line, live. |

**The honest distinction is between two kinds of bytes:**

- **Substrate** = recomputable byproducts of normal development (the graph *is* the code; git history *is* the history). It rots only when the code rots, and when the code rots the substrate rots *with it, in the same direction* — it can never claim "login and session move together" after that stopped being true, because it's reading the live log.
- **Shadow store** = a parallel natural-language record that asserts facts about the code from *outside* the code, and therefore **drifts**. This is what the design removes. A markdown packet saying "X and Y are coupled" keeps saying it forever after the coupling is deleted. The substrate cannot lie this way.

The artifact (a branded type, an assert) is durable, but it is **not a shadow store** for the same reason: it *is* the code, the compiler enforces it, and a refactor that removes the coupling also removes the type error. The provenance is the diff. There is no separable record to drift.

---

## 3. The honest boundary — what the red-team actually proves

The red-team lands four hits. Two are **operational** (the design works but the cost story was naive). Two are **fundamental** (a class of fact cannot be re-derived or enforced). All four are conceded and bounded below.

### Hit 1 (operational, *serious*) — the fork storm forces a cache that is a store

**Confirmed in source.** `gitFileSignal` (`:11157`) makes 5 git invocations per file; `gitCoChangePartnersForPath` (`:11142`) makes 1 `git log -n 80` + up to **80 `git show`** calls — ~**86 serial blocking forks per file**, with **no cross-target memoization**. A 40-file changeset from a fresh session on a deep monorepo ≈ **3,400+ git processes** on the Stop hook. The agent appears hung for tens of seconds to minutes. The "continuity = determinism" property is *exactly* the cold-cost case.

**This is real and it bites.** Per-turn re-derivation is only affordable if you collapse the 86-forks-per-file pattern into **one** `gitCommitRecords(limit=N)` pass (`:11082`, a single `git log --name-only` fork already in the codebase), build the co-change/owner/commit-count matrix in memory, and **persist it keyed by git HEAD**, invalidated when HEAD moves.

**The concession:** that HEAD-keyed matrix is unavoidably *a key-value cache of derived facts — i.e. a store.* The honest framing is to classify it as **substrate** (recomputable, HEAD-pinned, self-invalidating — like the graph index itself), *not* to pretend each turn recomputes from zero. When the cache is cold or HEAD churned mid-turn, **degrade gracefully to graph-only signals** (`impactSurface` + dependents + coverage — no git forks). Co-change is the dropped signal under load, not the whole engine.

### Hit 2 (fundamental, *serious*) — the Substrate Laundering Attack

The sharpest hit. *"Every ephemeral derivation is either recomputed from a curated, refresh-maintained `.agent_memory` store you renamed 'substrate,' or crystallized into committed artifacts + manifests that form a content-addressed cue→fact store with the compiler as its retrieval engine. No-store is achieved by relabeling the store, not removing it."*

**Partially conceded, and the line must move.** Three honest points:

1. **The graph index is not a "free byproduct."** It's a `kage_refresh`-maintained artifact with its own staleness lifecycle. Calling it "the code" hand-waves that. **Own it:** it is substrate *because* it is HEAD/`source_hash`-pinned and self-invalidating, not because it's free.
2. **The committed artifacts + `createSignedManifest` manifests *are* a durable cue→fact store** with code-location keys and the compiler as retrieval engine. That is true. But it is a **categorically better store than an NL packet store**: the key is a real code location, retrieval is the compiler (not a fuzzy embedding match), and it **cannot drift** because a refactor that removes the coupling removes the type error in the same commit.
3. **So the real claim is not "no store." It is "no rotting NL-packet store; store-as-enforcement."** That is a strictly weaker — and strictly more honest — claim than the slogan. The win is **on rot, not on byte-count.**

**Is this just RAG in disguise?** *No*, and the distinction is precise:
- **RAG** stores a fact *separately* from the artifact it describes, keyed by a learned/fuzzy index, retrieved by similarity, and **the store can disagree with the code** (that disagreement is the rot). RAG's retrieval is probabilistic and its store is authoritative-by-assertion.
- **Re-derivation + SAE** never store a fact separately from its artifact. Retrieval is **deterministic** (a graph BFS, a compiler pass), the "index" is the code's own dependency structure, and **the store cannot disagree with the code because it *is* the code**. There is no similarity search, no embedding, no top-k. That is the categorical difference: RAG retrieves an *assertion about* the code; this retrieves the code's *structure itself*.

### Hit 3 (fundamental, *serious*) — the write-only ratchet + a coverage oracle that's a filename guess

**Confirmed in source.** `hasTestCoverage` (`:11294-11299`) falls back to a **basename-substring match** (`path.includes("test_" + base)` etc.) — not real coverage. So the REDUNDANCY and DECAY gates rest on a filename heuristic: it will skip a needed artifact when names diverge, or mint a duplicate when they don't match the pattern.

And the ratchet is real: the design itself admits *"a lesson learned later that should retire an old assertion has no trigger to remove it — stale assertions accumulate."*

**Mitigations (all conceded as necessary):**
1. **Every emitted artifact carries a machine-readable tag** binding it to the lesson, the `impactSurface` edge that justified it, and the HEAD it was minted at — as an annotation on the assert/rule/type, **not** a sidecar. A later agent *can* ask "why does this exist," and a refactor that removes the justifying edge can flag the artifact **orphaned** and retire it. That is the missing release on the ratchet.
2. **Stop trusting `hasTestCoverage` for the gates** — it's a substring guess. Require a real coverage signal, or downgrade those gates to **advisory** so the emitter neither skips needed artifacts nor mints duplicates on naming divergence.
3. **Default asserts to non-crashing telemetry** (log + count) on hot paths rather than `throw`, so a subtly-wrong invariant degrades to noise, not a production outage. Gate any throwing assert behind an FP-audit replay.

### Hit 4 (fundamental, *serious*, the decisive one) — the negative-knowledge blind spot

**The hit re-derivation cannot answer, by construction.** *Re-derivation reads what the code IS; it can never read what the code deliberately ISN'T.*

> Session 1: agent tries optimistic locking on the payment retry path, discovers it deadlocks at the current isolation level, **reverts**, and fixes the race with an idempotency key. The reverted approach has **no graph node**; git shows only the idempotency-key commit. Session 2, two weeks later: *"harden the retry path."* PRE-EDIT fires on `retry.ts`; impact/co-change/risk/coverage all compute perfectly — and the agent proposes **optimistic locking again**, re-walking the entire deadlock. The one fact that mattered (a rejected alternative + its causal reason) is the one class of fact the graph and git **physically cannot contain.**

**Kage's own data model concedes this.** `kernel.ts:88` stores `rejected_alternatives`; the packet types `negative_result` / `rationale` / `gotcha` / `decision` (`:3773`) exist *precisely because they have no structural derivation*. The SAE routes all of them to NULL (SHAPE_PROCESS/TASTE) — you cannot mint a type, lint rule, or assert that says *"we tried X and it deadlocked,"* because **there is no offending pattern in the tree to enforce against.** The thing you must remember is the thing that was removed.

**This is the irreducible store.** It is not laundering and not ideology to keep it; it is the residue that genuinely has no projection onto code. The defensible design keeps a **deliberately narrow, hard-gated store** for exactly this:
- **Admit only** `rejected_alternatives`, verified deadlock/perf findings, and "why A over B" — the packet types already shipped at `:88` / `:3773`.
- **Gate with the same oracles:** a decision packet is admitted **only if it names a graph-resolvable symbol**, so it is recalled via the **same action-target trigger** as re-derivation (PRE-EDIT on `retry.ts` surfaces it), *not* a separate NL query.
- **Auto-stale** when `source_hash` on that symbol churns past a threshold.

Result: small, source-anchored, self-pruning — which answers the rot objection that drove the pivot — while plugging the one hole re-derivation cannot. **Is this RAG again?** No: it's not retrieved by similarity, it's retrieved by the *same deterministic action-target trigger*, it's bounded to <100 packets, and it auto-stales. It's a keyed annotation on graph nodes, not a free-text corpus with an embedding index.

---

## 4. Verdict

**No-store is not a genuine standalone paradigm, and it does not collapse back into store-and-retrieve. It is a hybrid — and the hybrid is the actual contribution.**

Stated precisely:

- **Re-derivation-first is a genuine new paradigm for the common, expensive case.** *"Did I forget a co-change partner? Will this edit break a caller? What's the blast radius?"* — these dominate real coding work, and here live re-derivation **beats any store outright**: it is never stale (it reads the live graph), it costs **zero recall tokens until the moment of action**, and the cue is free (the action itself). A curated markdown note claiming "login and session move together" is strictly worse on every axis. On this layer, deleting the store is correct.

- **Stigmergic emission is a genuine improvement on storing lessons** — it swaps a rotting NL store for a compiler-enforced one. But the red-team is right that the artifact + manifest **is still a store**, just a far better one (deterministic retrieval, can't drift, cross-vendor). The honest claim is **"no rotting NL-packet store,"** not "no store."

- **A tiny irreducible store survives** for negative/causal knowledge (Hit 4): rejected alternatives and verified findings that have no structural projection. ~**sub-100 packets**, symbol-keyed, recalled by the action-target trigger, auto-staled on churn.

**The defensible product is re-derivation-first + store-as-enforcement + a sub-100-packet negative-knowledge store.** Pure no-store is ideology on the last 5% (you lose deadlock findings and false-positive suppressions forever). Pure store is the rot problem the pivot correctly fled. The red-team's job was to find where each absolutism breaks, and it did: **re-derivation wins the 95% that rots, the narrow store wins the 5% that can't be derived, and "no-store" is the right slogan only if you read it as "no shadow store that drifts from the code."**

---

## 5. The smallest experiment to prove or kill it (~2 weeks, real repos)

**Hypothesis to test:** *On real edits, live re-derivation surfaces the breaking-caller / forgotten-co-change facts that a stored memory would, at lower staleness and lower token cost — and a sub-100-packet negative store catches the rare case re-derivation provably misses.*

**Setup (days 1–3):**
- Pick **3 repos**: one mid-size TS monorepo (exercise the fork storm), one polyglot repo (exercise the cross-language under-reporting limit), one dynamic-Python repo (exercise the type-expressiveness ceiling).
- Mine the **last 200 merged PRs** per repo for ground truth via `gitCommitRecords` (`:11082`): for each PR, the set of files it touched is the "correct" co-change/impact answer. This is a **free oracle** — the merged PR is what the human actually decided was the complete change.

**The two measurable claims:**

1. **Re-derivation recall vs. a store, on the common case.** For each historical PR, take the *first file* touched as the PRE-EDIT target, run `impactSurface` + `co_change_partners` on the repo state **at the PR's parent commit**, and measure: did the derived block name the *other* files the PR eventually touched? Compute precision/recall against the actual PR fileset. Compare to a baseline "stored" memory built from older PRs. **Kill criterion:** if re-derivation's recall on real forgotten-co-change cases is not clearly ≥ the stored baseline, the core claim fails.

2. **The fork-storm cost is survivable.** Implement the single-pass `gitCommitRecords` HEAD-keyed matrix (Hit 1 mitigation). Measure **wall-clock per PRE-COMMIT pass on a 40-file changeset, cold vs. warm cache**, on the monorepo. **Kill criterion:** if warm-cache per-turn derivation can't get under ~1–2 s (and cold under the graceful-degradation budget), it can't run every turn and the paradigm is impractical.

**The negative-knowledge probe (days 8–12):** hand-curate ~20 real negative findings from the repos' issue trackers / revert commits ("tried X, reverted because Y"). Store them as symbol-keyed packets. Re-run the same action-target triggers and measure: **does the trigger surface the negative finding when an agent touches the relevant symbol?** And separately, simulate an agent with *only* re-derivation on those 20 cases and confirm it **re-proposes the rejected approach** — that's the direct demonstration that the narrow store earns its keep.

**The SAE micro-trial (days 12–14):** take 5 real "broke N callers" bugs from PR history, mint the branded-type/assert/lint artifact via the ladder, and verify each (a) `tsc`/lint-fails on the pre-fix tree, (b) passes on the fixed tree, (c) does **not** flag pre-existing code repo-wide. **Kill criterion:** if >1 of 5 can't be encoded without flagging legitimate code (the false-positive-fatigue failure), the SAE's enforcement claim is too fragile for the common case.

**What "proven" looks like:** re-derivation recall ≥ stored baseline on co-change/impact; warm per-turn cost under budget with graceful degradation; the 20-case negative probe shows re-derivation-only re-walking the wrong approach while the narrow store prevents it. **What "killed" looks like:** re-derivation recall no better than a store (the live graph isn't actually fresher in practice), or the fork storm can't be tamed, or the SAE false-positives on real repos.

---

## 6. What this means for Kage

**Yes — the live oracle (re-derivation) is the product, and the bulk NL memory store should be deleted.** This is not a swerve from the Probe / blast-radius pivot recorded in `PIVOT.md` and `[[kage-pivot-probe]]`; it is the **same product, stated more precisely.**

- **The blast-radius gate *is* re-derivation at PRE-COMMIT.** "Deterministic blast-radius PR gate" and "re-derive `impactSurface` + missing-co-change over the changeset at commit time" are the same engine. The pivot already bet on the live oracle. This brief says: that bet is correct, and the oracle should run on **every edit**, not only at the gate, because the same `impactSurface`/`gitFileSignal` call that gates a PR can guide an edit mid-turn for ~100 tokens.

- **Delete the NL packet store as the primary surface; keep three persistence surfaces, honestly governed:**
  1. **The graph index** (`.agent_memory/indexes`) — substrate, owned with an explicit staleness lifecycle, not hand-waved as "the code."
  2. **A HEAD-keyed co-change/git matrix** (Hit 1) — the *required* cache that makes per-turn derivation affordable. Build it on `gitCommitRecords`; without it the fork storm makes the gate feel hung. This is the single most important engineering item the red-team surfaced.
  3. **A sub-100-packet negative-knowledge store** (Hit 4) — `rejected_alternatives` / verified findings, symbol-keyed, recalled by the action-target trigger, auto-staled. This is the *only* place `kage_learn` / `kage_supersede` / the existing packet types (`:88`, `:3773`) keep earning their keep. Everything else they used to store is now either re-derived or enforced.

- **What this kills in the current codebase:** the NL recall path as a *primary* surface, `detectContradictions` over stored packets as the completeness mechanism (replaced by live co-change/impact deltas over the changeset), and the framing of `.agent_memory` packets as the durable memory. **What it keeps and elevates:** `impactSurface`, `gitFileSignal`, `gitCoChangePartnersForPath`, `classifyRisk`, `hasTestCoverage`, `resolveCodeGraphPath`, `shortestDependencyPath` — the oracle suite *is* the product. `createSignedManifest` becomes the gate's tamper-evident provenance trail for emitted artifacts, not a recall surface.

- **The marketing line that survives the red-team:** not *"agent memory with no store"* (false — there's a graph index, a git cache, artifacts, and a tiny negative store). The honest, defensible line is:

  > **Kage doesn't store what your agent needs to remember — it re-derives it from your code at the moment of the edit, and crystallizes the durable lessons into your compiler. The only thing it stores is the handful of facts your code physically cannot contain: the approaches you tried and rejected.**

  That claim is true, it's differentiated from RAG (deterministic retrieval, can't drift), it's the blast-radius gate the pivot already chose, and every clause is backed by a real function in `kernel.ts`. The slogan "no-store" was load-bearing PR copy; **"re-derivation-first, with the smallest possible store for what can't be derived"** is the load-bearing *engineering truth*, and it's the one that won't get shredded the first time a serious engineer reads the source.

---

**Source-grounding note (verified, not assumed):** every cited oracle exists at the referenced lines in `mcp/kernel.ts` (20,992 lines total). The two most attack-critical claims were checked directly: the ~86-fork-per-file pattern is real (`gitFileSignal` :11157 + `gitCoChangePartnersForPath` :11142 with `git log -n 80` + 80× `git show`, no memoization), and `hasTestCoverage` (:11294-11299) is a basename-substring heuristic, not real coverage. Both red-team hits stand on the actual code, which is why they reshape the boundary rather than being deflectable.
