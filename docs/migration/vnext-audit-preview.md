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

## Run an audit

```bash
kage connect --project .          # audit mode, starts the local runtime (kaged)
kage status  --project .          # runtime health, receipts, measurement coverage

# Route an Anthropic-API agent through the gateway. --count-tokens spends one extra provider round
# trip per transformed request; it is the only way a receipt can honestly be "exact".
kage proxy --project . --mode audit --count-tokens
export ANTHROPIC_BASE_URL=http://localhost:8788

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

**`prompt_mutations` is measured.** It counts receipts whose transformed body was actually
forwarded. A correct audit period measures `0` because audit forwards your bytes — the report does
not assume it, and the same code counts `1` the moment an assist-mode request appears.

## Known gaps in this preview

- **Context latency percentiles are `null`, always.** Protocol v1 records no context-composition
  latency anywhere, so `context_latency_p50_ms` / `context_latency_p95_ms` have no honest source.
  The receipts' `latency_ms` is the proxy round trip and is a different quantity; it is not
  substituted. Recording context latency needs a protocol/schema change, and protocol v1 is frozen.
- **Cost deltas need a two-sided cost measurement.** Until the unsent body's cache breakdown can be
  measured, an audit period will usually report token savings and an unavailable cost.
- **The gateway measures the Anthropic API surface only.** Other providers produce evidence through
  the hook adapter, but no receipts.
- **Receipts need Node 22.5+** (`node:sqlite`). On Node 18 the legacy CLI and the proxy keep
  working and simply record nothing — `available: false`, never a silent zero.
