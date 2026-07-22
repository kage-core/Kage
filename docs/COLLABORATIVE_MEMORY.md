# Kage Collaborative Memory — the Framework, its Invariants, and their Proofs

Kage is a **collaborative repository memory** for coding agents: every agent working a repository —
Claude Code, Codex, Cursor, Gemini, anything speaking Anthropic/OpenAI/Gemini wire — reads from and
writes to one evidence-backed knowledge model, through one proxy, under one set of honesty gates.
This document is the framework in one place: the model, the pain points it was built to kill, and
the **measured proof** behind every claim. Nothing here is aspirational; every number was produced
by a committed, re-runnable gate or benchmark in this repository.

(The v0 git-native design notes and their honest audit are preserved at
[`docs/history/collaborative-memory-v0-git-native.md`](history/collaborative-memory-v0-git-native.md);
the git-tracked packet tier they describe remains the zero-infrastructure default.)

## 1. The model — evidence up, trust-gated down

```
  agent traffic (any provider)
        │ proxy (audit | assist | protect)          ← ONE attach point, zero per-agent wiring
        ▼
  EVIDENCE  — observed events, command outcomes, diffs; exact bytes, measured usage
        ▼ episode builder
  EPISODES  — grouped evidence with outcome signals
        ▼ extractors + admission (deterministic; shadow model proposes, never asserts)
  CLAIMS    — typed knowledge (decision/runbook/gotcha/…) with TRUST STATES:
              proposed → verified/approved → disputed/stale/superseded/archived
        ▼ verification + staleness (citations re-checked against the real tree)
  INJECTION — ONLY verified/approved claims are ever injectable, and only when the
              corpus-normalized decision says the recall deserves tokens at all
        ▼ sync outbox (idempotent, permission-scoped, approved-only, raw-never)
  TEAM WORKSPACE — Postgres, tenant-isolated; review authority, ownership, audit;
              billing/entitlements; GitHub App; portal
```

Interchange is **OKF** (Open Knowledge Format): packets are self-describing markdown with
verification metadata in `x-kage-*` frontmatter, readable by any OKF consumer without Kage.

## 2. Pain points → what shipped → the measured proof

| # | Pain point (measured, not vibes) | What shipped | Proof (re-runnable) |
|---|---|---|---|
| P1 | Assist/compression was Anthropic-only at the pipeline seam — OpenAI/Gemini agents got audit only | Pipeline adapters for OpenAI (native shape) and Gemini (lossless `contents↔messages` view; `functionCall`/`functionResponse` untouched, serialize restores the exact wire — deep-equal proven); registry + proxy route through adapter parse/serialize | 21 tests in `mcp/vnext/gateway/providers/{openai,gemini}.test.ts`: byte-identical stable prefix, injection only in the mutable zone, reversible compression with marker, fail-open without a store |
| P2 | Single-body compression honestly nets **~0%** on real traffic; the real waste is HISTORY (old tool results re-sent every turn) | Deterministic **history digestion**: prefix tool payloads → head/error-lines/tail digest + `kage-content:` marker, exact original stored FIRST, content-addressed dedup across turns; idempotent fixed point; off by default | `npm run bench:compression`: single-body real median ~0%; **history: 92.93% final-turn, 93.33% whole-session** on real repo bodies. 8 tests in `history.test.ts` (determinism = cache-stable digested prefix, idempotence, reversibility, zone safety, fail-open) |
| P3 | Injection was eager: content-free prompts ("pong") attached 4 lexical accidents on big stores; absolute floors provably impossible (scores are un-normalized match sums) | **Corpus-normalized injection decision** in recall itself: top hit must match ≥2 distinct query terms (breadth) AND spike above this corpus's own score band (z + lead; gap/anchor on tiny corpora); `composeInjection` gates on it + dominance-trims co-attach to ≥0.5×top. "Inject nothing" is a first-class outcome | `npm run bench:injection` `--assert-baseline`: false_injection **0.667→0** (large store 1.0→0), absent-topic **0.875→0**, precision **0.154→0.636**, small-store recall & top-hit **held 1.0**, drift-checked against the real production path |
| P4 | Paraphrased near-duplicates split recall mass (dedup was set-overlap only) | Dedup scores `max(jaccard, tf-cosine)`, cosine guarded to ≥12 distinct terms per side (short-note boilerplate would false-positive) | `dedup-cosine.test.ts`: real reworded runbook pair flagged through the REAL capture path; unrelated pair decisively below; short genuinely-different notes unaffected (reference-recall test held) |
| P5 | Memory value was asserted, not fed back | Usage (`uses_30d` + best rank), helpful/stale feedback votes, and quality all feed the ranking fusion; recall receipts separate MEASURED counts from ESTIMATED tokens | `recallBreakdown` fusion (usage/quality/feedback components); `bench:reuse` value-receipt separation: measured `stale_withheld`/`recalls` vs estimated `tokens_saved`, never conflated |
| P6 | "Trust me" collaboration | Team workspace on Postgres: every table tenant-keyed; sync is idempotent + approved-only + **raw-never**; review authority with self-approval blocked + optimistic versions; least-privilege GitHub App; server-side entitlements; fail-open locally | Technical GA gate (`phase-e-gate.test.ts` vs REAL embedded PostgreSQL): cross_tenant_reads=0, raw_payloads_synced=0, self_approvals=0, duplicate_sync_records=0, invalid_webhooks_accepted=0, local-context-during-outage=true, export-after-expiry=true |

## 3. The honesty gates (enforced in code, not documented aspirations)

- **Measured, never estimated.** Token counts are provider-measured or `null`; a one-sided cost is
  UNUSABLE, not zero; empty cohorts report `empty_cohort`, never a fabricated $0.
- **Reversible.** No lossy byte is ever emitted without the exact original stored content-addressed
  first and a `kage-content:<sha256>` retrieval reference embedded; retrieval is fingerprint-verified
  and task-authorized.
- **Fail-open, byte-preserving.** Any pipeline/store/runtime failure forwards the client's exact
  bytes; audit mode is byte-identical always; a workspace outage never touches local context.
- **Trust-gated.** Only verified/approved claims inject; shadow model extraction proposes, never
  asserts; OKF export never upgrades human approval to "verified".
- **Authority-gated.** A proposer cannot approve their own high-impact claim (403); versions are
  optimistic (409 on drift); every decision audited; raw prompts/tool payloads never leave the machine.
- **Cache-safe.** The stable prefix survives byte-for-byte; history digests are deterministic, so
  the digested prefix is itself cache-stable (one miss, then re-keys).

## 4. Current measured state (2026-07-22, v4.0.0)

- Backend `npm test --prefix mcp`: **1474/1474** aggregate (main + deploy 36 + dogfood 12).
- Workspace suite vs **real embedded PostgreSQL 18**: 176/176; technical GA gate green.
- Frontend portal Vitest: 109/109 with a generated DTO drift guard in test+build+CI.
- Phase gates: A, B, C (6/6), D (3/3), E (technical) all passing; the commercial GA report exits
  non-zero with `partners_completed 0/3` — honestly NOT RUN, never fabricated.
- Reuse A/B (live agent runs): memory takes an agent **0/3→3/3 correct, −41% cost** when the fact is
  NOT in code; ~zero effect when it is — memory's value is conditional, and measured as such.
- Compression: single-body ~0% (real bodies); **history digestion ~93%** (12-turn real-body session).
- Injection: false injection **0**, absent-topic injection **0**, precision 0.636, recall held 1.0.
- **What we store is empirically ranked** (367-packet production-store audit): ops/verify runbooks are
  the most-recalled class (~1.0–1.4 uses/packet); reference dumps measure 0.00. Admission boosts what
  code cannot say and routes restatements-of-cited-code to review (`mcp/derivability.test.ts`).
- **Day-one value is measured, not hoped**: `kage install` bootstraps one verifiable runbook from
  `package.json`; a fresh repo's first recall hits it at rank 1 and clears the injection gate
  (`mcp/bootstrap.test.ts`).
- **The lead question has one command**: `kage report team` — recalls served / stale withheld
  (measured), the LIVE injection gate (every proxy decision recorded, including "injected nothing"),
  derivability composition, dark areas, review health; also served in the portal with an IC
  transparency view (`mcp/team-report.test.ts`).
- Web surfaces (site, viewer, portal) share the v6 design system; every number on the site traces to
  a bench on this page's table.

## 5. What is deliberately NOT claimed

Design-partner pilots, paid conversion, live GitHub App/Stripe/IdP interop, and Docker-daemon builds
require the external world; `scripts/vnext-phase-e-report.mjs` enumerates them and exits non-zero.
The no-overhead credit logic is built and capped, but no live cohort has exercised it. E2E browser
journeys are CI-gated behind a seeded daemon and are never green-washed.
