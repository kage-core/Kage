# Kage vNext — audit preview

Phase A ships one thing: a way to find out what Kage actually costs and actually attaches, without
changing a single byte your agent sends. This page is the operator's guide to that audit, and to
reading the report without fooling yourself.

Nothing here enables prompt mutation. `kage connect` writes audit mode and has no `--mode` flag.

## What audit mode does

| | audit | assist |
|---|---|---|
| Bytes forwarded to the provider | your agent's **exact** bytes | Kage's transformed body |
| Context capsule composed | yes | yes |
| Context capsule injected | no | yes |
| Transformation receipt written | yes, for transformed candidates | yes |

In audit mode Kage builds the body it *would* have sent, measures it, and then forwards the body
you actually wrote. That is the only way the measurement is worth anything: an audit of traffic
Kage already modified would be measuring itself.

## Which providers the proxy covers

The proxy is the primary path, and it is multi-provider. One gateway per provider sits behind a
shared, provider-neutral core, so any client that speaks a supported provider's API flows through
Kage with no per-agent wiring:

| Provider | Surface the gateway matches | Exact **token** coverage | Exact **cost** coverage |
|---|---|---|---|
| Anthropic | `/v1/messages` | high — a cheap `count_tokens` probe measures the unsent candidate | one-sided in audit (see below) |
| OpenAI | `/v1/chat/completions`, `/v1/responses` | only when the response's own `usage` reports it — **no** cheap count-tokens probe | one-sided in audit; null for any model with no price snapshot |
| Gemini | `generateContent`, `streamGenerateContent` | same as OpenAI — no usable count-tokens probe on this seam | one-sided in audit; **null above the base tier ceiling**, never the wrong base rate |

The **Claude Code hooks stay** as a secondary, richer-signal path: they see IDE file opens and edits
the API never carries. Both paths feed the same evidence stream and honour the same honesty gates.
A client on a provider Kage ships no adapter for gets no coverage until its adapter exists (Azure
OpenAI is explicitly out of scope for now — a different host/auth path).

Every receipt carries the `provider` it came from, and every measurement surface below breaks down
by it.

## Run an audit

```bash
kage connect --project .          # audit mode, starts the local runtime (kaged)
kage status  --project .          # runtime health, receipts, measurement coverage

# Route an agent through the gateway. --count-tokens spends one extra provider round trip per
# transformed request; for Anthropic it is the only way a receipt can honestly be "exact". OpenAI
# and Gemini have no equivalent cheap probe, so their receipts are "exact" only when the response's
# own usage reports the count, otherwise honestly "partial".
kage proxy --project . --mode audit --count-tokens
export ANTHROPIC_BASE_URL=http://localhost:8788      # Anthropic-API clients
# OPENAI_BASE_URL / an OpenAI-compatible base URL, or a Gemini base URL, point at the same proxy.

kage receipts --project . --json                 # every receipt, with its measurement quality
node scripts/vnext-phase-a-report.mjs --project . --json   # the audit-period report
```

Claude Code hooks post evidence to the runtime automatically once it is live, and exit 0 (silently)
whenever it is not. No MCP tool call is involved in any of this.

## Reading the report without lying to yourself

The report is built to make four specific lies impossible.

**An empty period is `null`, not `0`.** If nothing was recorded, every measurable value is `null`
and `reason` is `empty_audit_period` (or `no_receipt_store` when there is nothing to read at all).
A zero would read as *"Kage ran all week and cost nothing"*. That is a claim; silence is not.

**Coverage is a share of TRANSFORMED requests.** `measurement_scope` says so in the payload. Kage
writes a receipt only for a request it actually transformed — a request where recall returned
nothing has nothing to measure and writes no receipt. So `measurement: { exact, partial,
unavailable }` is not a share of your agent's total traffic, and must never be presented as one.

**An exact token delta is not an exact cost delta.** This is the subtlest one and the report keeps
them strictly apart:

- The **forwarded** body's tokens come from the provider's own `usage`, which includes the cache
  breakdown (uncached + cache writes + cache reads). It can be priced. It has a cost.
- The **unsent** candidate body's tokens come from `count_tokens`, which reports a token *total*
  and says nothing about caching. It cannot be priced: pricing a cached prompt as if every token
  were uncached overstates it by up to ~10x.

So an audit-mode receipt routinely has `measurement_quality: "exact"` with a real
`before_input_tokens` / `after_input_tokens` pair, **and** `provider_input_cost_after_usd: null`.
The token delta is available far more often than the cost delta. When only one side of a cost was
measured, the cost delta is `unavailable`, never `before - 0` — that subtraction would report the
entire request cost as a saving.

`kage_processing_cost_usd` is `null` in Phase A. Kage's own processing cost is not measured, and a
`0` there would be a claim that the harness is free.

**Every number is split by provider, and a provider with no traffic is `null`, not `0`.** Because
the proxy is multi-provider, `kage status` and the report both carry a `by_provider` map beside the
overall totals. Each entry is that one provider's own `measurement { exact, partial, unavailable }`,
`token_delta`, and `cost_delta` — read only from *its* receipts, never conflated with another
provider's. Three rules hold the map honest:

- **No traffic ⇒ no entry.** A provider that sent nothing has no key in `by_provider`. That absence
  is "we saw no traffic", which is emphatically *not* a `{ exact: 0, partial: 0, unavailable: 0 }`
  coverage (that would claim we measured it and it transformed nothing) and *not* a `$0` cost. `null`
  — not `{}` — for the whole map when the receipt store could not be read at all.
- **The overall total sits alongside, never instead.** Token counts are comparable across providers,
  so an overall `token_delta` is honest. The overall `cost_delta` still counts only receipts priced
  on *both* sides, so a provider whose cost is one-sided or `null` is *excluded* from the total —
  never silently added in as `$0`.
- **Cost stays per-provider and honest.** A one-sided audit cost, or a Gemini prompt above the base
  tier ceiling, is `unavailable` for that provider — the same `no_two_sided_cost_measurement` rule as
  the overall cost, applied per provider. Exact *token* deltas are available far more often than
  exact *cost* deltas, and the two are never merged.

**Attachment is reported overall only.** A `context_deliveries` row carries no `provider` column, so
per-provider attachment attribution cannot be derived without inventing it. `attachment_by_provider`
is therefore always `{ available: false, reason: "delivery_rows_have_no_provider" }`, and the honest
overall `attachment` / `attachment_success_rate` stand. Splitting attachment per provider needs the
provider recorded on the delivery row — a storage migration, which the frozen protocol v1 does not
block (a delivery is Kage's own record, not a wire value). Until then the report says so rather than
faking a split.

**`prompt_mutations` is measured.** It counts receipts whose transformed body was actually
forwarded. A correct audit period measures `0` because audit forwards your bytes — the report does
not assume it, and the same code counts `1` the moment an assist-mode request appears.

## Known gaps in this preview

- **OpenAI and Gemini exact-cost coverage is lower than Anthropic's, honestly so.** Neither exposes a
  cheap count-tokens probe on the proxy seam, so their transformed receipts are `exact` only when the
  provider's own response `usage` reports the count — otherwise honestly `partial`, never estimated.
  Gemini's tiered pricing is encoded only for the base (≤200k-token) tier; a larger prompt prices as
  `null`, never at the wrong base rate. Any model with no dated price snapshot has a `null` cost. All
  of this shows up as a lower exact-*cost* share for those providers in `by_provider`, not as a defect
  papered over.
- **Attachment has no per-provider split yet.** `context_deliveries` rows carry no `provider`, so
  `attachment_by_provider` is always `unavailable`. See "Attachment is reported overall only" above.
  Recording the provider on the delivery row is a storage migration (protocol v1 stays frozen; the
  delivery is Kage's own record), not done in this preview.
- **Cost deltas need a two-sided cost measurement.** Until the unsent body's cache breakdown can be
  measured, an audit period will usually report token savings and an unavailable cost — per provider
  and overall.
- **Receipts need Node 22.5+** (`node:sqlite`). On Node 18 the legacy CLI and the proxy keep
  working and simply record nothing — `available: false`, never a silent zero.
