# Kage launch kit (internal)

Not deployed — this directory lives outside `docs/` on purpose so the strategy
and draft copy are never served on the public site.

## Contents
- `GTM.md` — internal strategy (positioning, distribution, competitive read). **Internal only.**
- `provocation.md` — the long-form essay ("memory you can trust"). Blog / launch-day post.
- `show-hn.md` — Show HN title + body + first-comment notes.
- `product-hunt.md` — PH name, tagline, description, maker comment, gallery list.

## Assets (these are public, in `docs/assets/`)
- `kage-viewer-demo-poster.png` — viewer Overview (Memory Trust + live stats).
- `kage-viewer-graph.png` — viewer Memory map (memory↔code graph).
- `kage-demo.gif` — terminal demo.

## The one-line story
Every agent memory remembers; Kage is the one that tells you when it's wrong —
write-time citation validation, recall-time stale exclusion, code-graph grounding,
git-native governance, with a reproducible Trust Benchmark and a live viewer.

## Pre-flight (do before posting)
- [ ] **Ship the npm release** so `npx` users get the current product (grounding fix,
      activity instrumentation, redesigned viewer). The posts point at `npx -y
      @kage-core/kage-graph-mcp demo` — that must be the new version.
- [ ] Verify the live viewer: https://kage-core.com/viewer (Overview, Memory map,
      Memory drawer, Activity, Insights all render).
- [ ] Verify the 30-second demo on a clean machine: `npx -y @kage-core/kage-graph-mcp demo`.
- [ ] Re-run `kage benchmark --trust` so any quoted score is current.
- [ ] Confirm `docs/BENCHMARKS.md` + `docs/TRUST.md` are accurate and linkable.

## Honesty guardrails (non-negotiable)
- Quote **our own** numbers only; never cite a competitor's published benchmark as
  a head-to-head. Recall is saturated field-wide — say that, don't rank against a name.
- No fabricated adoption ("N teams use it"). The hosted viewer's recall activity is
  seeded by **real** build-time recalls; don't present it as organic usage.
- Every claim must be reproducible from the repo (`kage benchmark --trust`, the demo).

## Sequence
1. Land the release + a short changelog / blog (`provocation.md`).
2. Show HN (`show-hn.md`) — engage every comment for the first few hours.
3. Product Hunt (`product-hunt.md`) — schedule 12:01 PT; maker comment first.
4. Cross-post the essay; submit to relevant agent/devtool directories.
