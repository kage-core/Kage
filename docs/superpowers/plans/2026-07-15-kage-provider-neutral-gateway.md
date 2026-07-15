# Kage Provider-Neutral Gateway — Implementation Plan

**Created:** 2026-07-15
**Branch:** `codex/kage-vnext-implementation`
**Status:** Not started. New workstream, parallel to the Phase B–E program (which covers the knowledge model, portal, and commercial rollout, NOT provider breadth).

## Why this exists

Direction set 2026-07-15: **the proxy is the primary way Kage works, across every provider.** The proxy (`export ANTHROPIC_BASE_URL=…` / equivalent) is the only path with zero per-agent wiring — any client that speaks a provider's API flows through Kage with no hooks and no setup. Phase A shipped a working Anthropic proxy; this workstream generalizes it to OpenAI-compatible and Gemini APIs behind one shared contract, and unifies capture so the proxy is a first-class evidence source, not just a receipt writer.

The Claude hook adapter is **kept as a secondary, richer-signal path** (it sees IDE file edits the API never sees). It is not removed. Every path — all provider proxies AND the hooks — feeds the same `/v2/events` evidence stream and honours the same honesty gates.

## Non-negotiable honesty gates (inherited from Phase A, apply to every provider)

1. **Audit mode forwards byte-identical request bytes.** The provider receives what the client sent. Kage measures the candidate it *would* have sent.
2. **Tokens are measured or `null` — never estimated, never zero-filled, never `bytes/4` in a receipt.**
3. **Per-provider usage semantics must be encoded correctly.** This is the central risk. The receipt's before/after token counts must be the SAME quantity on both sides, and that quantity is the TOTAL prompt tokens including cache:
   - **Anthropic:** `usage.input_tokens` is the UNCACHED remainder. Total = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`.
   - **OpenAI:** `usage.prompt_tokens` is the FULL prompt (includes cached). `prompt_tokens_details.cached_tokens` is the cached sub-portion. Total = `prompt_tokens` (already full); the cached split is for pricing, not for the total.
   - **Gemini:** `usageMetadata.promptTokenCount` is the FULL count. `cachedContentTokenCount` is the cached sub-portion. Total = `promptTokenCount`.
   Encode these per adapter and VERIFY against each provider's current API reference before trusting a number. A wrong sign here reproduces the "fake 98% saving" bug across a new provider.
4. **Coverage stays split** `{exact, partial, unavailable}`, per provider — never one flattering percentage, never conflated across providers. Empty ⇒ `null`, not `0`.
5. **Fail open everywhere.** A gateway/measurement/capture failure never changes the client response and never breaks the session.
6. **Cost:** price each token component at its billed rate from dated, sourced snapshots. A side with a token count but no measured cache breakdown gets a `null` cost, not one priced as fully uncached. A one-sided cost is unusable, not zero.
7. Protocol v1 is FROZEN. Storage schema is ours to extend via migrations; the wire protocol is not.

## Architecture: the ProviderGateway seam

Factor the Anthropic-specific proxy into a provider-neutral core + per-provider adapters.

The **core** (provider-neutral) owns: listen/route, eligibility dispatch, fail-open, byte-identical audit forward, streaming passthrough, receipt + delivery recording, evidence emission to `/v2/events`, and workspace routing. It is the only place that knows about Kage's runtime, storage, and honesty gates.

Each **provider adapter** implements:
- `matches(method, path, body)` → is this an eligible completion request for this provider?
- `parseRequest(body)` → `{ model, messages/turns, systemText }` in a neutral shape.
- `inject(body, capsule, mode)` → transformed body in THIS provider's request shape (assist only; audit forwards original bytes untouched).
- `extractUsage(responseBodyOrStream)` → the neutral `{ total_prompt_tokens, cache_read, cache_creation, output_tokens }` or `null` per component (see gate 3).
- `countTokensProbe(body)?` → optional exact-measurement probe of the unsent body. Anthropic has `/v1/messages/count_tokens`; OpenAI and Gemini do not expose an equivalent cheap endpoint — for them, exact measurement is only available when the provider's own usage already reports both sides, otherwise the receipt is honestly `partial`.
- `priceSnapshots` → dated, sourced price records for this provider's models, with cache multipliers.

## Tasks

### Task 1 — Gateway seam + capture unification (foundational, no behavior change to Anthropic)
Refactor `mcp/proxy.ts` + `mcp/vnext/adapters/anthropic-proxy.ts` so Anthropic becomes the first `ProviderGateway` implementation behind the neutral core. ALL existing proxy tests stay green byte-for-byte (this is a pure refactor for Anthropic). THEN add capture unification: the proxy emits protocol-v1 evidence events to `/v2/events` via the fail-open adapter client — a `prompt` event per eligible request and `tool_result` events parsed from response tool-use — so the proxy is a first-class evidence path, not just receipts + legacy observations. Files: `mcp/vnext/adapters/gateway.ts` (the seam), refactor the two proxy files, `mcp/proxy.test.ts`. Gate: existing behavior unchanged; new test proves an evidence event lands via the shipped proxy path AND that its failure is fail-open.

### Task 2 — OpenAI-compatible provider adapter
`/v1/chat/completions` and `/v1/responses`. Injection into the messages array (system or last user turn, mirroring the Anthropic choice). Usage per gate 3 (`prompt_tokens` is already the full total; `prompt_tokens_details.cached_tokens` for pricing). No cheap count-tokens endpoint → exact only when usage reports it, else honest partial. Dated GPT price snapshots with cache-read multiplier. Gate: byte-identical audit forward for an OpenAI body; a cached-usage test proving no fake saving; fail-open.

### Task 3 — Gemini provider adapter
`generateContent` / `streamGenerateContent`. Injection into `contents`. Usage from `usageMetadata` per gate 3. Dated Gemini price snapshots. Gate: same three proofs as Task 2 for a Gemini body.

### Task 4 — Multi-provider gate + report
Extend the phase gate and `scripts/vnext-phase-a-report.mjs` + `kage status` so attachment, measurement coverage, and cost are reported PER PROVIDER, never conflated, never fabricated. A provider with no traffic reports `null`, not zero. Update `docs/migration/` with the multi-provider audit preview.

## Execution rules
Same loop as Phase A: fresh implementer under strict TDD, then specification review, then adversarial code-quality review. Do not advance while a reviewer has an unresolved Critical/Important. `npm test --prefix mcp` is the authoritative suite. After each task: update this plan's status and the vNext checkpoint, run `kage_refresh` + `kage_pr_check`, resolve reconciliation as agent work.

## Honest boundaries to keep stating
- The proxy only sees API traffic, not IDE events (file opens/edits) — hooks remain the richer path for that signal.
- "Every provider" means every provider Kage ships an adapter for; a client on an unsupported provider gets no coverage until its adapter exists.
- OpenAI/Gemini exact-token coverage will be lower than Anthropic's, because neither offers a cheap count-tokens probe — this is a truthful `partial`, not a defect to paper over.
