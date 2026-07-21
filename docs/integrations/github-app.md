# Kage GitHub App

Kage integrates with GitHub through a **least-privilege GitHub App**. This document is the operator
reference for what Kage asks for, what it does with it, and what it deliberately does not do.

## Permissions

On install, Kage requests **read-only** permissions:

| Permission | Level | Why |
| --- | --- | --- |
| `metadata` | read | Resolve repository identity and default branch. |
| `contents` | read | Read code to ground knowledge claims in real source. |
| `pull_requests` | read | Associate agent tasks and knowledge changes with a PR. |

**`checks: write` is NOT requested by default.** Publishing a Kage check run back to a pull request is
a separate, explicit opt-in. An installation that has not granted it is skipped cleanly — `publishCheck`
returns `skipped_missing_permission` and never attempts the API call, so a least-privilege install
degrades gracefully instead of erroring on every pull request.

## Subscribed events

Only these events are processed; anything else is acknowledged and ignored:

`installation`, `installation_repositories`, `push`, `pull_request`, `check_suite`, `check_run`,
`repository`

## Webhook security

The intake order is the security contract, and it is enforced in `github/webhooks.ts`:

1. **Verify the signature over the raw bytes, before parsing.** The `X-Hub-Signature-256` header is
   checked with a constant-time comparison against an HMAC of the exact received body. An invalid or
   missing signature returns `401` and the event processor is never invoked — a forged delivery does not
   even reach a JSON parser.
2. **Claim the delivery id before processing.** `X-GitHub-Delivery` is inserted into the tenant-scoped
   `github_deliveries` ledger with `ON CONFLICT DO NOTHING`. GitHub retries deliveries aggressively; the
   insert is the idempotency gate, so a redelivered event is processed **exactly once**. The ledger is
   keyed `(workspace_id, delivery_id)`, so the same delivery id in a different workspace is a distinct
   event and is not swallowed as a duplicate.
3. **Parse and dispatch** only after the signature proved the bytes are ours.

## Tokens

Kage mints a short-lived app JWT (9 minutes, `iat` backdated 60s for clock skew) and exchanges it for an
installation access token. Installation tokens are cached **only until the expiry GitHub itself reported**
(refreshed 60s early so an in-flight request cannot race the expiry). Kage never invents a lifetime and
never assumes a token's length or format — tokens are treated as opaque strings.

## What never leaves the local machine

A Kage check run links the **task receipt** and the **knowledge diff**. It never publishes raw prompts or
tool payloads; `publishCheck` refuses a summary that carries raw payload content as a defence in depth.

## Configuration

Credentials come from deployment secrets at runtime and are never committed:

| Variable | Purpose |
| --- | --- |
| `KAGE_GITHUB_APP_ID` | The GitHub App id. |
| `KAGE_GITHUB_PRIVATE_KEY` | PKCS#8 PEM private key (escaped `\n` is restored). |
| `KAGE_GITHUB_WEBHOOK_SECRET` | Webhook signing secret. |
| `KAGE_GITHUB_API_BASE_URL` | Optional; defaults to `https://api.github.com`. |

If these are absent, `loadGitHubAppConfig` returns `null` and the integration simply stays off — the
workspace runs normally without GitHub rather than failing to start.

## Verification status

The behaviours above are covered by `mcp/vnext/workspace/github/github.test.ts`, which runs entirely on
fixtures plus a real PostgreSQL idempotency ledger: **no live GitHub account, app registration, or
network call is required or attempted.** Registering a real GitHub App and exercising it against
github.com is a deployment step that this test suite deliberately does not claim to have performed.
