<!-- Kage -> OKF pivot plan. 2026-06-28. Verification/freshness layer for Google Open Knowledge Format. -->
> Status: DECISION-READY PROPOSAL. Supersedes the earlier Probe framing where they conflict.

# Kage → OKF: The Definitive Pivot Plan

*Author: lead strategist. Status: decision-ready. Posture: decisive where the evidence is clear, honest where it is not. The red-team is integrated inline, not appended — where an attack is serious, the mitigation is shown at the point of decision; where a path is fatal, it is named as fatal.*

---

## 1. The pivot in one paragraph

**Kage becomes the trust layer for Google's Open Knowledge Format — the tool that verifies a knowledge concept against the live source of truth it claims to describe, catches the ones that have drifted, and serves agents only what is still true.** Google shipped OKF as a *store* (a folder of Markdown concepts, each anchored to a `resource` URI, with `# Citations`, a `timestamp`, and a `log.md`) and **explicitly deferred verification, freshness, staleness, and consistency checking to "out of scope for v0.1."** Kage's entire engine — `source_hash` staleness, `detectContradictions`, the `truthReport`/doc-lie scanner, the deterministic multilingual code graph — *is* that missing checker. The new one-liner is **"OKF tells your agent what's true. Kage proves it still is."** The headline noun is **freshness**, and its screenshot-native negation is **DRIFTED**. Not "memory" (a dead category per the funnel diagnosis), not "blast radius" (the right noun when the substrate was a PR diff; the substrate is now a knowledge bundle). **Critically — and this is the single most important strategic edit the red-team forces — the product verifies stale *documentation against its source* as the general case, and emits/consumes OKF as the premier supported format, rather than making "an OKF bundle exists" a precondition for the product to do anything.** OKF is the wedge and the distribution accelerant, not the dependency.

---

## 2. Why OKF, why now

The strategic logic is a three-line syllogism, and each line is load-bearing:

1. **Google standardized the store.** OKF is, almost word for word, the artifact the prior no-store-memory research identified as the thing that rots: "a curated NL record-store that asserts facts about a source of truth from *outside* it." A concept doc says "the `orders` table has a `coupon_code` column"; the table changes; the doc does not. That is the canonical drift failure.

2. **Google left the checker unbuilt — on purpose.** Grounding line 22 is explicit: freshness checking, validation against source of truth, claim verification, staleness detection, and consistency verification are all out of scope for v0.1. OKF even ships the *anchors* a verifier needs — `resource` (the asset URI to check against), `# Citations`, `timestamp`, `log.md` — and then ships no checker. This is not an oversight. OKF's stated charter is **"format, not platform: no cloud/DB/model/account/SDK required."** Verification *requires* connecting to live infrastructure (warehouses, repos, credentials, schedulers). So the gap is **charter-protected**: it is exactly the thing OKF's design principles commit Google *not* to building into the spec.

3. **Kage already is the checker.** ~75–80% of the 21K-LOC `kernel.ts` engine — staleness, contradiction, citation, impact, supersession, signed-manifest primitives — was built to verify a proprietary JSON store. Re-pointing it at OKF concept docs is a substrate swap, not a rebuild.

**Why now:** OKF is two weeks old (released 2026-06-12). The verification noun is unclaimed. A solo founder can own "OKF freshness" as a category term, the de-facto conformance linter, the MCP-directory listing, and the cold-artifact distribution channel before Google's data-catalog org prioritizes a checker for a format it deliberately scoped to exclude one.

**But "why now" cuts both ways, and the plan must say so plainly.** Three of the four red-team attacks converge on the same structural fact: **this pivot is leveraged on someone else's two-week-old standard.** That is addressed head-on in §9 and §10 — and it is the reason the format-independence edit in §1 is not optional polish but the core risk inversion.

---

## 3. The format mapping

OKF is a store format, and the mapping has two halves with very different status. Getting this boundary right is what separates an honest product from a faked one.

### 3.1 The store half maps cleanly (and is the natural fit)

Kage's `decision` / `rationale` / `gotcha` / `negative_result` packets — the sub-100-packet irreducible store that the no-store-memory analysis concedes survives — become OKF concept `.md` files almost 1:1.

| Kage packet field (schema v2) | OKF destination | Notes |
|---|---|---|
| `type` | frontmatter `type` (the one required field) | Kage's `type` vocabulary drops straight into OKF's free-string `type`. Capitalize for house style (`Decision`, `Negative Result`). |
| `title` | frontmatter `title` | 1:1 |
| `summary` | frontmatter `description` | 1:1 |
| `body` + `context.{fact,why,trigger,action}` | markdown body (titled `##` sections) | Narrative belongs in the body, not frontmatter. |
| `paths[]` | frontmatter `resource` + `x-kage-anchors` | The path(s) this concept is *about* become the verification target. |
| `tags[]` | frontmatter `tags` | 1:1 |
| `freshness.last_verified_at` | frontmatter `timestamp` | Last verified ≈ last meaningfully-true moment. |
| `id` | the file **path** is identity (OKF rule); `id` retained as `x-kage-id` | OKF keys on path; `x-kage-id` survives renames for round-tripping. |
| `context.verification` | `# Citations` section + `x-kage-verification` | Human-readable "how verified" in `# Citations`; machine anchor in custom frontmatter. |
| `edges[]` | bundle cross-links + machine mirror | See §3.4. |

### 3.2 Verification metadata → custom frontmatter (the IP, and the spec-legal hook)

OKF mandates: *"producers may add arbitrary fields; consumers must preserve unknown keys."* Every trust field is namespaced under `x-kage-` so a vanilla OKF consumer (Google's visualizer, the Rust lib) silently ignores it and a Kage-aware consumer reads it.

| Kage concept | Custom key | Shape |
|---|---|---|
| content-hash anchors (`freshness.path_fingerprints`) | `x-kage-anchors` | `[{path, sha256, size, symbols:[{name,kind,sha256}]}]` — the per-file / per-symbol baseline that makes drift *detectable against the resource*. **This is the single most load-bearing field; without it, "verify against resource" is undefined.** |
| computed status | `x-kage-verified` | `verified \| stale \| drifted \| orphaned \| unverifiable` — **computed each scan, never authored.** |
| freshness policy | `x-kage-freshness` | `{last_verified_at, ttl_days, policy: source_hash_staleness, last_scan_at}` |
| supersession lineage | `x-kage-supersedes` / `-superseded-by` | bundle-relative path; mirrored into `log.md` |
| tamper-evidence | `x-kage-manifest` | `{manifest_sha256, signature, signed_at, head}` |
| confidence / governance | `x-kage-confidence`, `-scope`, `-visibility` | copied verbatim |

**Conformance check:** OKF conformance requires only (a) parseable YAML frontmatter, (b) non-empty `type`, (c) reserved files follow structure. Every `x-kage-*` key is arbitrary producer metadata OKF *mandates* consumers preserve. **A Kage bundle is fully OKF-conformant.** Kage extends OKF additively, never by changing required semantics.

> **Red-team integration (Attack 1, Threat 3 — "custom frontmatter is a spec gap waiting to be closed").** This is correct and must shape the design. If OKF v0.2 promotes any of these keys (`verified_at`, `source_hash`) into the standard, the *producer-side* frontmatter convention evaporates. **The defense is to never book value on the frontmatter convention.** The frontmatter is throwaway glue (migration §10 says exactly this). The value is the *checker* and the *hosted platform around it* (§5). If Google adopts the convention, that is a **win** — Kage becomes the named reference verifier on a standard it authored — *provided revenue lives in the hosted meter, not in the format keys.* See §9 for why this requires editing the GTM to contribute a thin pointer, not a full implementation spec.

### 3.3 The verification anchor: `resource` + `# Citations` + `x-kage-anchors`

This is the crux — the axis Google deferred and Kage's entire IP. The verification loop:

1. Read the concept's `resource` (and any `# Citations` pointing at code/files).
2. Resolve to the live asset at HEAD (file, symbol, schema, doc).
3. Hash it; compare to `x-kage-anchors[].sha256`.
4. Match → `x-kage-verified: verified`, refresh `last_scan_at`.
5. Diverged → `x-kage-verified: drifted`, write a `log.md` entry with old/new hash.
6. Gone → `orphaned`.

> **Red-team integration (Attack 2 — the equivocation between change-detection and truth-checking).** This is the most technically important attack, and it is *right*. The loop above, as the engine actually implements it, is a **change-detector** (`fingerprintPathContentChanged`: stored SHA-256 vs fresh SHA-256, plus a TTL clock), **not a truth-checker.** It fires on benign edits and is blind to a doc that was wrong the day it was written. The screenshot-native demo — "the doc claims `coupon_code FLOAT64`; the live schema dropped it" — is a *claim-vs-reality entailment* step that **does not exist in `kernel.ts` today.** The plan must refuse this equivocation. The product is scoped to **three deterministic tiers**, and only these go on the signed scorecard:
>
> - **Tier A — staleness tripwire (exists today):** "the source behind this concept changed since its `timestamp`." Honest label: *stale*, not *false*. The `source_hash` fingerprint. Already in the engine.
> - **Tier B — structured claim-vs-reality (net-new, but mechanical and genuinely defensible):** schema diff (`# Schema` columns/types vs live table), function-signature diff (the code graph's symbol spans vs current HEAD), broken-citation / dead-link resolution, OKF conformance. All deterministic, reproducible, signable, **LLM-free**. The signature differ — re-deriving from the multilingual code graph — is the part Google's BigQuery-only enrichment agent structurally cannot match.
> - **Tier C — prose-claim judgment (hard-walled OFF the verdict path):** "this metric excludes refunds." The only general verifier is an LLM, which is non-deterministic, non-reproducible, reintroduces the false positives that killed the Probe claim-vs-diff gate, and breaks the "re-run, identical hash" promise. **If offered at all, label it advisory, keep it off the signed scorecard.** This is the Fork-1 discipline the earlier Probe pivot already learned.
>
> The honest one-liner is therefore narrower than "verify every concept": **"Kage detects when an OKF concept's source has drifted, and when its *structured* claims no longer match the source — deterministically, no LLM on the verdict, re-run and get the identical hash."** This is true to the engine and defensible. The grandiose version is not.

### 3.4 Code graph + knowledge graph → cross-links and a `derived/` projection

- **Knowledge-graph edges** (`{relation, to, evidence}` — `supersedes`, `affects`) are stable authored facts → authoritative prose cross-links in the body **plus a machine-readable frontmatter mirror** (`x-kage-affects`), because OKF's prose-typed links aren't parseable by a verifier.
- **Code graph** (`impactSurface`, `dependents`) is a *function of HEAD*, never an authored fact. It must **not** be frozen into an authoritative `.md` — doing so creates the exact rotting shadow store OKF can't detect. Two-tier: blast-radius is answered **live** by the MCP at query time (never written); a `derived/code/` subtree *may* be emitted, stamped `x-kage-derived: true` and `x-kage-head: <sha>`, regenerated wholesale each refresh, ignored by the verifier as a source of truth.

### 3.5 `log.md` → the supersession + drift audit ledger

OKF's `log.md` ("chronological, ISO-grouped, newest-first") is *precisely* Kage's supersession/reconciliation trail. Each `supersedeMemory`, each verifier scan that flips a concept's status, each re-anchor becomes one dated entry carrying drift evidence (old vs new sha256). This makes `log.md` the bundle's tamper-evident audit ledger — the renewal artifact for a regulated buyer — while staying strictly OKF-conformant.

### 3.6 One concrete OKF concept `.md` with Kage trust fields

```markdown
---
type: Negative Result
title: "Optimistic locking deadlocks on the payment retry path"
description: "Tried optimistic locking for retry concurrency; deadlocks at the
  current isolation level. Use an idempotency key instead."
resource: "git+https://github.com/org/repo#src/payments/retry.ts:retryPayment"
tags: [concurrency, deadlock, rejected-alternative, payments]
timestamp: "2026-06-14T00:00:00Z"
# --- producer extension: Kage trust layer (OKF arbitrary keys, consumer-preserved) ---
x-kage-id: "repo:...:negative_result:optimistic-lock-retry-9f2a"
x-kage-verified: verified
x-kage-confidence: 0.9
x-kage-anchors:
  - path: src/payments/retry.ts
    symbols: [{ name: retryPayment, kind: function, sha256: "a91f02…" }]
x-kage-freshness: { ttl_days: 180, policy: source_hash_staleness, last_scan_at: "2026-06-28T05:42:49Z" }
x-kage-manifest: { manifest_sha256: "c14b…", signature: "ed25519:…", head: "e96fba2…" }
---

## What was tried and rejected
Optimistic locking on `retryPayment`. Deadlocked at READ COMMITTED under
concurrent retries. Reverted; fixed the race with an idempotency key.

## Why re-derivation can't find this
The reverted approach has no graph node and git shows only the idempotency-key
commit. This is the residue with no structural projection — recalled by the same
action-target trigger (PRE-EDIT on `retryPayment`), auto-staled when the symbol
hash churns.

# Citations
1. revert commit abc123 ("revert: optimistic locking on retry — deadlocks").
2. issue #441 — deadlock repro under load.
```

This is the cleanest possible OKF fit: the exact fact a store is *good* at holding and that re-derivation *can't*, anchored to a symbol so Kage's trigger surfaces it and auto-stales it. A vanilla OKF consumer renders `type/title/description/resource/tags`; Kage additionally enforces `x-kage-*`.

---

## 4. Product & the wedge

One CLI + one MCP server, three verbs. **Crucially, the verbs take *documentation against a source of truth* as input — OKF is the premier supported format, not the only one.**

### (a) VERIFY — `okf verify <target>` — the hero, the cold artifact

Takes an OKF bundle **or** an existing doc surface a team already has (a dbt model's descriptions, a data-catalog column doc, a README vs its code, an OpenAPI spec vs a live endpoint) and checks each concept/claim against the ground truth its frontmatter or convention points at. Emits `fresh | drifted | stale | unverifiable | broken` per concept, each cited to **file:line in the doc AND the ground-truth diff**. Reuses `truthReport`, `verifyCitations`, `source_hash` staleness, `detectContradictions`, `truthScorecardSvg`. **The verdict path is deterministic (Tiers A+B only); an LLM is never on it.**

### (b) ENRICH — `okf enrich <source>` — the producer (second act, not first slice)

Walks a source (code repo via the code graph; schema via a `resource` resolver) and drafts OKF concept docs. Competes Google's reference enrichment agent on the one axis where it's structurally better: **join paths and relationships are *derived from the deterministic graph*, not a hallucination-prone second LLM pass.** Every concept is born verified and self-attesting.

### (c) SERVE — `okf serve <bundle>` — MCP that withholds stale

Sits between agents and a bundle; serves **only verified-fresh** concepts. A drifted concept is either withheld with a typed reason or returned with a loud `drifted` banner and the *live re-derived* fact inline. Honors OKF `index.md` progressive disclosure. Returns a per-call trust receipt ("served 6 fresh, withheld 2 drifted") — the gains-receipt mechanic from `CLAUDE.md`, re-aimed.

### The zero-install cold artifact (build this first)

`npx okf verify <target>` + a paste-a-URL box at the site. Read-only, no account, self-signed reproducible output. The **launch move**: scan Google's own public OKF sample bundles (GA4, StackOverflow, Bitcoin) whose `resource`s are public BigQuery datasets anyone can re-query, and publish the drift.

> *"I ran a deterministic freshness check on Google's official OKF sample bundles against their live BigQuery sources. Here are the concepts that have drifted — file:line in the bundle, column-level diff against the warehouse. Reproducible: re-run and get the identical signed hash."*

> **Red-team integration (Attack 2, the demo objection).** The cold artifact must produce a *Tier-B* result (structured schema diff), not a *Tier-A* result ("a partition was added; prose is fine" — noisy and unembarrassing). For credential-gated bundles, it degrades gracefully to the no-auth deterministic checks: broken cross-links, dead citations, missing `resource`, internal contradictions, malformed frontmatter. Still embarrassing, still LLM-free. **Stamped with `createSignedManifest` so a skeptic re-runs and gets the identical hash — this is what kills "an LLM made it up," and it is exactly why Tier C must stay off this artifact.**

### Relationship to Google's reference implementations

- **vs the HTML visualizer (consumer): pure layer-on, never compete.** Kage emits standard OKF; the visualizer renders it free. Kage ships a small trust overlay that colors drifted nodes red / fresh green using the preserved `x-kage-verified` frontmatter. *"Bring your own visualizer; Kage tells it which nodes are lying."*
- **vs the enrichment agent (producer): extend first, then out-quality.** Ship `okf verify` as the **post-processor that runs after Google's enrichment agent** — "ran the enrichment agent? `okf verify` the output before you ship it to agents." Then out-quality on verifiability (derived join paths, stamped-verified concepts), the axis Google deferred. Never compete on raw drafting breadth — that's their gift and their distribution.

---

## 5. Business model

### Open-core boundary: point-in-time vs. continuous; one doc on my laptop vs. many for a team with history

**FREE — `okf` CLI (MIT/Apache-2.0): the funnel + the cold artifact.** `okf verify` / `lint` / `enrich`, the local MCP server, the self-signed drift scorecard, the OKF conformance linter (a deliberate land-grab — become the reference "is my bundle valid?" check). One target, on demand, no memory of yesterday. **That "no memory of yesterday" is the meter line.**

**PAID — hosted: the things the honor system structurally cannot bypass** (they require continuous execution under an account against live resources over time):

| Tier | Price | What's gated |
|---|---|---|
| **Free / OSS** | $0 | `verify` / `lint` / `enrich`, local MCP, signed scorecard, conformance linter. One target, on demand, no history. Public targets get advisory checks free. |
| **Solo** | **$19/mo** | Hosted continuous monitoring of 1 bundle + ~3 resources, daily re-checks, drift email alerts, 30-day history, one public freshness badge. |
| **Team** | **$99/mo** (3 bundles + ~25 resources, then $25/extra bundle) | Hosted **CI gate** (blocking/advisory status check on PRs to bundles), scheduled re-verification, the dashboard, Slack alerts, 90-day signed evidence history, freshness-SLA view. The workhorse self-serve tier. |
| **Business** | **$499/mo** (~15 bundles + ~150 resources) | + SSO, per-resource/per-owner drift analytics, org-wide require-fresh-to-merge policy, scheduled re-enrich, 12-month evidence retention. |
| **Enterprise** (yr 1+) | **$25K–$120K/yr** | Self-hosted/VPC runner (verification runs *inside* their perimeter — data never leaves), unlimited bundles/resources, tamper-evident ledger, custom connectors (Snowflake/Databricks/internal APIs), SAML/SCIM, SLA. |

**Pricing logic.** Bill on **bundles + monitored resources, not seats** — a data team has few devs but many tables; each monitored resource is a thing that can rot and a unit of compute, and the same axis runs $19 → $120K (pure land-and-expand). **Margin ~85–90%:** verification is deterministic (schema/hash diff, the existing `source_hash`/`detectContradictions`/`impactSurface` machinery), **zero LLM tokens on the verdict path** — a cost moat vs. any LLM-judge approach. Deliberately under the catalog/observability budget (Atlan/Monte Carlo are $20K–$200K/yr) so Team/Business is a credit-card, no-procurement purchase.

### ICP — and the honest read on whether the buyer exists yet

**Primary ICP:** the Analytics Engineer / Data Platform lead on a 5–40-person data team feeding an internal "talk-to-your-data" agent from a semantic/context layer. The pain that converts is visceral and career-relevant: **an LLM analytics agent confidently answers a CFO's question off a stale concept (a renamed column, a changed metric definition) and ships a wrong number.** This buyer already pays real money (dbt tests, data contracts, Monte Carlo) to keep *data* trustworthy; Kage extends that discipline to the *docs about the data* — the new unguarded surface. They sign $100–$500/mo on a card and live in dbt Slack, Locally Optimistic, r/dataengineering, and the OKF repo — **a smaller, more concentrated, more findable community than "all developers."**

> **Red-team integration (Attack 4 — "the buyer is real in theory but absent in practice").** This is correct and it is the second-most-dangerous attack. The named ICP requires a team to (1) adopt a two-week-old format, (2) wire it to a production agent, and (3) ship it long enough for a doc to drift and burn someone — *three conversions deep before the painkiller is a painkiller.* Pre-incident, "your bundle might be rotting" is the same vitamin shape that gave Kage v1 ~0 conversion. **The resolution is the format-independence edit from §1, applied to the ICP:** Kage does not wait for OKF bundles to exist. It verifies the **dbt descriptions, catalog docs, READMEs, and API specs the buyer already has at scale today**, and emits OKF as the output format. The wrong-number pain exists *now* on those surfaces, OKF or no OKF. OKF is then the accelerant (if Google's distribution takes off, Kage is pre-positioned), not the gate.

### Path to first $1k / $10k / $100k MRR

- **First $1k (~month 2–4):** the Show-HN-against-Google's-bundles spike + the cold artifact run against *existing* dbt/catalog docs. ~10 Team at $99, or ~5 Team + ~20 Solo. Trigger: one real drift incident a team turns continuous monitoring + CI gate on to prevent recurring. Self-serve, no human sales.
- **First $10k (~month 5–9):** the Freshness Index flywheel + word of mouth in data Slack + first Business upgrades. ~50–70 Team + a handful of $499 Business.
- **First $100k (~month 12–24):** Business as workhorse + 1–3 Enterprise ($25K–$120K) as the signed evidence ledger graduates into "prove our AI's data context is current and auditable." Shape: ~$40–50k self-serve + ~$50–60k Enterprise.

**Stated honestly:** the $100k path is leveraged on OKF *or* the broader doc-verification market growing. The format-independence edit is what makes the *first $1k–$10k* reachable without waiting on OKF adoption at all.

---

## 6. Codebase migration

The thesis: **substrate swap, not rebuild.** The expensive IP in `kernel.ts` survives; the proprietary JSON store, the 70-command CLI, and most of the 75 MCP tools do not.

### The new hero surface

Three commands replace the entire `kage <70 subcommands>` surface: **`okf verify`** (the funnel, alias the existing `scan`), **`okf enrich`** (the producer), **`okf serve`** (the MCP). Plus `init`, `pr` (CI gate, re-aimed from `staleguard`), `doctor`, `upgrade`.

### Keep / refactor / rip-out

| Area | Verdict | ~% surviving |
|---|---|---|
| JSON packet store + learn/recall/supersede | **REFACTOR** (substrate swap to OKF `.md`; logic kept, serialization swapped) | ~60% |
| Code graph engine (`impactSurface`, `shortestDependencyPath`) | **KEEP** (only the output sink changes: graph → OKF links) | ~100% |
| Verification / staleness engine (`source_hash`, `detectContradictions`, `reverifyMemory`) | **KEEP** — this is the IP OKF left unbuilt | ~95% |
| `truthReport` / doc-lie scanner | **KEEP → `okf verify`** (add `concept_drift`, `broken_citation`, `stale_timestamp` finding kinds) | ~90% |
| MCP tools (75 `kage_*`) | **RIP OUT ~55**, keep/refactor ~20 (the memory-bureaucracy surface dies with the store) | ~20% of surface |
| CLI commands (~70) | **RIP OUT ~50**, collapse to ~10 | ~15% of surface |
| 15-agent install/hook wiring | **RIP OUT** (keep one generic stdio MCP adapter; OKF's producer/consumer independence means Kage shouldn't own the integration matrix) | ~10% |
| Viewer / daemon (`startViewer`, `startLiveFeed` SSE) | **REFACTOR** (point at OKF links; add the trust overlay Google's visualizer lacks) | ~70% |

**Net: ~55–60% of the 34.5K LOC survives** (concentrated in the engine), **~25% deleted outright** (memory bureaucracy, 15-agent matrix, registry/session/benchmark surface), **~15–20% net-new** — almost entirely an **OKF bundle parser/writer**, a **`resource:` URI resolver** (to verify non-code asset types), and the **three-verb hero CLI**.

### Smallest first shippable slice

**Slice 1 (~1–2 weeks): `okf verify` over the existing engine.** A doc/bundle parser (frontmatter + `# Citations` + link graph, honoring `index.md`/`log.md`) feeding the *existing* `truthReport` pipeline; add `concept_drift` + `broken_citation` finding kinds reusing `verifyCitations` + `source_hash`; reuse `truthScorecardSvg` verbatim. **Demo target: not only Google's sample bundles, but a real dbt project's model descriptions or a README-vs-code scan** (per the §1 format-independence edit, so the funnel doesn't depend on OKF bundles existing in the wild).

**Slice 2 (~1 week):** the `packet.json → concept.md` emitter — turns every existing Kage user's `.agent_memory/` into an OKF bundle for free (the migration path) and proves Kage's memory is already OKF-expressible.

**Slice 3 (~1–2 weeks):** `okf serve` MCP (re-target `kage_context` → fresh-only) + the viewer trust overlay.

`enrich` is the second act, not Slice 1. **Verify is the funnel.**

---

## 7. GTM for a solo founder

Cold DMs are proven dead (1 click from 20). The motion is **artifact-first + ecosystem-positioning**, both of which OKF makes dramatically stronger.

1. **The Show-HN cold artifact.** Verify Google's own public OKF sample bundles against their live public BigQuery sources and publish the drift — file:line-cited, signed, reproducible, about *Google's own artifacts* (instant credibility + shareability, attacks no one). Pair with a paste-a-URL web demo. **Also run it against a popular public dbt project / a well-known repo's README** so the artifact lands even before third-party OKF bundles exist.
2. **Be THE verifier in the OKF ecosystem.** Get listed as an OKF tool on Google's own implementations page (they explicitly welcome alternative impls — captive, intent-rich distribution cold DMs never had). Make `okf lint` the de-facto conformance check. Ship the MCP server to Smithery / mcp.so / Cursor / Claude MCP directories as "the OKF MCP that won't feed your agent rotted docs."
3. **Contribute to the spec — but thin.** Propose a *pointer* to a verification convention and an informational "Verification is out of scope; here is a community approach" appendix. **Do NOT contribute a full machine-readable implementation spec** (see the red-team note below). If Google merges even a pointer, Kage is the named reference verifier on an open Google standard.
4. **The Freshness Index flywheel.** Publish a neutral "OKF Freshness Index" (and a broader "doc-rot index" over public dbt/README/API surfaces) — which public knowledge sources are most drifted. Link-baity, cross-cutting, every scan a backlink and a signed shareable artifact. Constant Show-HN fuel.
5. **Drive-by contribution PRs.** Open polite PRs fixing the drift `okf` found ("found via `okf verify`," signed diff). Maintainers merge and discover the tool.

**What NOT to do:** no cold DMs; no enterprise/governance sale as the opening; don't lead with "agent memory" (dead) or with the LLM-`enrich` producer (commodity, competes with Google's gift) — **lead with verification/drift, the deterministic screenshot-native thing Google didn't build.**

> **Red-team integration (Attack 1, residual risk 3 — "the mitigation requires NOT doing the GTM's most attractive moves at full volume").** This is the sharpest tension in the whole plan and the plan resolves it explicitly: **publish drift RESULTS as bait; withhold detection METHOD.** Show *that* Google's bundle drifted and the file:line; do *not* publish the code-graph differ internals or a complete verification frontmatter spec. Contribute a thin convention *pointer*, not a full implementation. Keep the differentiated detection logic (the symbol-span re-derivation, the per-substrate drift calibration) proprietary. **You cannot fully have both open-standards distribution and the proprietary moat — so the rule is: open the *category position* (be the listed verifier), closed the *engine*.** This is a real constraint that down-weights Move 3 relative to how the design tracks originally pitched it, and the plan adopts the down-weighting deliberately.

---

## 8. The 90-day plan

| Phase | Days | Shippable milestone |
|---|---|---|
| **Build the wedge** | 1–21 | `okf verify` Slice 1: doc/bundle parser → existing `truthReport` pipeline; Tier-A staleness + Tier-B structured schema/signature diff + broken-citation + conformance; `truthScorecardSvg` reused; `npx okf verify` + paste-a-URL web demo at `okf.dev`. |
| **Launch the cold artifact** | 22–35 | Show HN: deterministic drift scan of Google's OKF sample bundles **and** a popular public dbt project / well-known README. Signed, reproducible. Get listed on OKF's tools page. Ship MCP to directories. Publish v1 of the Freshness Index. |
| **First revenue** | 36–70 | Hosted Solo/Team behind a thin wrapper: continuous monitoring + daily re-check + drift alerts + the CI gate (GitHub App). **🎯 FIRST-REVENUE MILESTONE: first paying Team account (~$99/mo) by ~day 60**, triggered by a real drift catch a team turns monitoring on to prevent. |
| **Compound + measure** | 71–90 | Slice 2 (`packet → .md` emitter, migrates existing users) + Slice 3 (`okf serve` + viewer trust overlay). Dashboard v1. **Run the kill-criteria check (§9). Decide go / abort / re-scope by day ~90–120.** |

---

## 9. Risks, kill-criteria, and the honest case it fails

Three of the four red-team attacks are rated **serious**; none is rated fatal-as-written, but two become fatal *if the GTM is run as the design tracks originally pitched it.* The plan's edits (§1, §3.3, §7) are precisely what keep them off fatal. Here is the honest accounting.

### Risk 1 — Google folds verification into OKF v0.2 and absorbs the wedge (the dominant fork)

**Severity: serious. Kills the pivot: no, IF the moat lives in platform, not format.** The threat is real and specific: "out of scope for v0.1" is a roadmap marker, not a permanent disclaimer; the most-screenshotted demo (BigQuery drift) is Google's home turf to ship first-party fastest; and the original GTM's strongest moves (publish full detection method, contribute a full convention) *hand Google the design.*

**Mitigation (load-bearing):** separate **format** from **platform** and live entirely in platform. A reference checker Google can ship is stateless and point-in-time; **continuous hosted monitoring + the CI blocking gate + the tamper-evident drift ledger + multi-warehouse connectors + the VPC runner are a *service* OKF's "format, not platform" charter commits Google *not* to building into the spec.** Front-load the parts Google is least likely to ship: the deterministic code-graph re-derivation (verifying *code* concepts, orthogonal to BigQuery), cross-substrate neutrality (Snowflake/Databricks/Postgres/dbt/APIs), and signed reproducibility as a *trust-positioning brand* an LLM-branded Google feature can't claim. **And edit the GTM (per §7): results-as-bait, method-withheld; thin convention pointer, not full spec.** If Google adopts the *format-side* convention, that's a win — you're the named reference verifier — *because revenue is booked on the hosted meter.*

**Honest residual:** "format not platform" is a *current stated principle*, not a binding constraint, and the threat is a *different Google team* — Google Cloud's catalog org, with native BigQuery access and procurement presence — shipping hosted freshness regardless of what the spec org says. If Google ships *both* the convention *and* a hosted platform, the BigQuery segment collapses to them and the only defense is the neutral, multi-cloud, code-and-cross-substrate, already-the-reference-verifier position. Getting there first is the whole game.

### Risk 2 — The change-detector / truth-checker equivocation

**Severity: serious. Kills the pivot: no, IF the product is scoped honestly.** Covered in full at §3.3. The engine ships a *change-detector*; the pitch sells a *truth-checker*; the gap for prose claims is an LLM that breaks determinism and reintroduces the false positives that killed the Probe gate. **Mitigation: scope to Tiers A+B (deterministic, signable), hard-wall Tier C off the verdict path, and narrow the one-liner to "structured claims" honestly.** Residual: the structured-schema differ is the easily-cloned part; the durable piece is the code-graph symbol-span verifier, which is narrow and code-repo-shaped — and the stated data-team ICP points at the *clonable* part, not the durable one. This tension is real; the plan's answer is to lead with the data surface for *distribution* and invest the moat in the code/cross-substrate differ for *defensibility*.

### Risk 3 — OKF-adoption dependency + buyer-absent-in-practice (Attacks 3 & 4, merged)

**Severity: serious. Kills the pivot: no, IF Kage is decoupled from OKF-the-format.** The quiet failure path: by day ~120, OKF has Google's three sample bundles, one Rust lib, a few hundred stars, and ~zero real production bundles — so the verifier verifies an empty format and the recurring paid product (continuous freshness of *many* bundles) has no substrate. This is Kage v1's wall (artifact admired, nobody converts) with an *external adoption gate* stacked in front that the founder can't move by building.

**Mitigation (the §1 risk inversion):** treat OKF as the **frontmatter convention and output format, not the precondition.** The engine verifies "a NL doc asserting facts about a source of truth" — and dbt descriptions, catalog docs, READMEs-vs-code, and OpenAPI-vs-endpoint exist *at scale today, OKF or no OKF.* Slice 1's verifiable input must include those, with OKF as one premier supported format. Then OKF is upside (pre-positioned reference verifier if it takes off), not dependency (Kage still catches your dbt docs lying if it doesn't).

**Honest residual — and this is the part the plan refuses to paper over:** the OKF-independent fallback ("verify your stale docs") is a market that *exists* but is **not obviously higher-WTP than the dead "agent memory" one.** Doc-rot linters have historically been low-WTP vitamins. The entire reason to chase OKF was that Google was *manufacturing a new, higher-WTP buyer* (the data-platform owner feeding an agent). So: **OKF adoption is not required for survival, but it may be required for the pivot to be worth doing versus staying Probe.** That is the genuine, unresolved bet.

### Kill-criteria (decide by day ~90–120)

- **Verify-scan → hosted-install conversion < ~2%** after two Show-HN/listing moments → the artifact admires but doesn't convert (Kage's old wall recurs). **Abort or re-scope.**
- **Install → paid < ~5%** → continuous-freshness WTP is wrong; the free snapshot is "good enough." **Re-price or abort.**
- **OKF adoption stalls** — watch *third-party* bundles/producers in the wild, non-Google OKF repo activity, non-Google mentions — *and* the dbt/README fallback also fails to convert at the bars above → **the doc-verification market itself is low-WTP; this is the same swamp as v1. Abort.**
- **Google ships both the verification convention and a hosted BigQuery freshness service** before Kage owns the cross-substrate position → the BigQuery segment is gone; survival depends entirely on neutral multi-cloud + code. **Pivot to code/cross-substrate-only or abort.**

---

## 10. The decision the founder must make

Two genuine forks. Everything else follows.

### Fork 1 — Hard-couple to OKF, or treat OKF as accelerant?

This is *the* decision, and the red-team makes the answer unambiguous.

- **Hard-couple** (name it `okft`, make OKF bundles the only input, lead every channel with "OKF freshness"): maximizes the clean "complete Google's standard" narrative and ecosystem distribution — but bets the company on a two-week-old format taking off *and* on Google's continued restraint, and a solo founder will struggle to re-pivot a third time after burning the OKF narrative (Attacks 3 & 4).
- **Accelerant** (verify the docs teams already have — dbt/catalog/README/API — emit and consume OKF as the premier format, lead with "your knowledge is drifting, here's which concepts"): keeps the OKF upside (pre-positioned reference verifier, Show-HN against Google's bundles, ecosystem listing) while removing the fatal dependency, because the buyer and the rotting-doc surface exist *today*.

**Recommendation: ACCELERANT, decisively.** Adopt OKF as the marquee format and the distribution story; do *not* make "an OKF bundle exists" a precondition for the product to do anything. This is the single edit that converts "bet on someone else's standard" into "best-case bonus on a business that stands without it."

### Fork 2 — Open the engine, or open only the category position?

The design tracks wanted *both* full open-standards distribution *and* a proprietary moat. Attack 1's residual proves you can't fully have both.

**Recommendation: open the category position, keep the engine closed.** Be the listed, named, de-facto OKF verifier (own the noun, own the conformance linter, own the MCP listing). Publish drift *results* as bait. **Withhold detection *method* — the code-graph symbol-span differ and the per-substrate drift calibration stay proprietary.** Contribute a *thin convention pointer* to the spec, never a full machine-readable implementation. Book 100% of revenue on the hosted meter (continuous monitoring, CI gate, evidence ledger, VPC runner) — the platform OKF's charter commits Google not to build — so that Google adopting the format-side convention is a *win*, not a death.

**The one-sentence verdict:** This pivot is worth doing — the engine is ~75% built, the gap is charter-protected, the cold artifact is genuinely strong, and OKF gives a solo founder the distribution he never had — **but only if it is built as a deterministic doc-verification platform that treats OKF as its premier format and its distribution accelerant, never as its substrate-of-record, and only if the founder withholds the detection method while publishing the results.** Run the §8 plan, watch the §9 kill-criteria, and decide go/abort by day ~120 on whether *any* verifiable-doc surface (OKF or dbt/README) converts scan → paid above 2%/5%. If it does, this is a better Probe. If it doesn't, it is the same swamp wearing Google's logo — and the kill-criteria, not optimism, must make that call.

---

**Relevant files:** `/Users/kushaljain/code/Kage/OKF_STANDARD.md` (the OKF conformance spec Kage targets), `/Users/kushaljain/code/Kage/mcp/kernel.ts` (the surviving engine — `truthReport`, `verifyCitations`, `detectContradictions`, `source_hash` staleness, `impactSurface`, `shortestDependencyPath`, `supersedeMemory`, `createSignedManifest`, `truthScorecardSvg`), `/Users/kushaljain/code/Kage/mcp/cli.ts` (`scan` → `okf verify`), `/Users/kushaljain/code/Kage/mcp/index.ts` (75 `kage_*` tools to prune to ~15), `/Users/kushaljain/code/Kage/mcp/daemon.ts` (`startViewer`/`startLiveFeed` → OKF visualizer + trust overlay), and the grounding at `/private/tmp/claude-501/-Users-kushaljain-code-Kage/de36686e-0f9d-4e91-983d-75b9a96411cf/scratchpad/okf-pivot-grounding.md`.
