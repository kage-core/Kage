# Packet → repository-model migration

Phase B introduces a compiled **repository model** (entities, claims, evidence, relations) alongside
the legacy `.agent_memory/packets/` store. This document describes how legacy packets are migrated
into that model, and how the model-backed context source is progressively enabled — without ever
laundering unverified knowledge into an agent's prompt.

## The honesty invariant

Nothing in this migration makes a claim injectable that was not *earned* injectable under the Phase B
trust gate. A claim is injectable only when its `trust_state` is `verified` (backed by verified
supporting evidence) or `approved` (accepted by an authorized human review). Every other state —
`proposed`, `disputed`, `stale`, `superseded`, `archived` — is non-injectable and can never reach a
prompt.

## Migration is dry-run first, fingerprint-guarded, reversible

1. **Plan (dry run).** `kage migrate plan --project <dir> [--out plan.json] [--json]` reads the legacy
   packets and reports, per disposition, what an apply *would* do. It writes nothing to the model.
2. **Apply (guarded).** `kage migrate apply --project <dir> --plan plan.json` imports only packets
   whose content fingerprint still matches the plan. A packet that drifted or disappeared since the
   plan is refused, never silently re-mapped. Apply is replay-idempotent: re-applying folds onto the
   existing claims (`merge`) rather than duplicating them.
3. **Reversible by export.** The model exports back to Open Knowledge Format with
   `kage export --project <dir> --format okf --out <dir>`. Identifiers ride in an in-body machine
   block, so the export round-trips even through a foreign OKF consumer that drops `x-kage-*`
   frontmatter. Packet files are never deleted by migration.

### Trust is never laundered

A legacy packet's status is **not** carried across as vNext trust:

| Legacy packet state | vNext claim trust | Injectable? |
| ------------------- | ----------------- | ----------- |
| live / approved     | `proposed`        | no (routed to review) |
| superseded          | `superseded`      | no |
| deprecated          | `archived`        | no |

Even a legacy `approved` packet becomes a `proposed` claim: legacy approval was not the Phase B
evidence/review gate, so it must re-earn injectability. Confidence imports as a neutral, unmeasured
`0.5` — never a fabricated `1`. The original packet is preserved verbatim in the migration ledger.

## Deterministic verification vs. review routing

The compiler auto-verifies only what ground truth supports:

- **Deterministic low-risk facts auto-verify.** A low-impact claim grounded in a verified evidence
  method (source/symbol fingerprint, passing test, CI run, git commit, document anchor) is written
  `verified` and becomes injectable.
- **High-impact facts always route to review.** A `high`/`critical` impact claim is never
  auto-verified; it opens a review item and stays non-injectable until a human accepts it.
- **New events consolidate, they do not accumulate.** Re-observing a fact refreshes the existing
  claim's evidence; a genuinely different fact supersedes (new version, old retired); a contradiction
  routes to review. The claim count stays stable across replays instead of growing duplicates.

## Progressive context-source cutover

The delivered context source is governed by `config.context_source` (default `legacy`):

- `legacy` — the legacy packet recall source composes and delivers context. (Default; `kage connect`
  always writes this.)
- `compare` — legacy STILL composes and delivers; the model source runs in **shadow** and its
  candidate set is recorded for comparison. Nothing the model proposes is injected.
- `model` — the model-backed source delivers context. It emits **only** verified/approved claims.

Do not switch to `model` until the frozen evaluation corpus shows the model source passing the
progression gate against legacy recall:

- No stale/disputed injection (the model source emits only injectable claims by construction).
- Answer-support rate at least the legacy source's.
- Median capsule size lower than or equal to legacy.
- Feature/runbook entity coverage greater than or equal to legacy.
- No critical-invariant regression.

`evaluateProgression` in `mcp/vnext/context/context-comparison.ts` measures all five from real
candidate sets and real capsule builds and returns `ready` only when every criterion holds.

## Cross-phase fixtures

`kage model export-fixture --project <dir> --out <path>` serializes a deterministic
`repository-model.v1` fixture: every entity, claim, evidence row, and relation sorted by stable id,
with generated timestamps, raw payloads, and local paths excluded. Two runs over the same model are
byte-identical, so the fixture is a stable compatibility anchor for later phases.

## Reporting

`node scripts/vnext-phase-b-report.mjs --project <dir> --json` reports the model honestly: entities by
kind, claims by trust state, injectable count, the open review queue, and compilation lag. An absent
store reports `available:false`; an empty store reports `empty:true`. Neither is ever a fabricated
zero.
