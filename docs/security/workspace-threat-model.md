# Kage workspace threat model

Scope: the multi-tenant Kage workspace service (`mcp/vnext/workspace/`), a Node HTTP service backed by
PostgreSQL. It is canonical for team review, ownership, policy, and aggregated metrics. It is **never**
on the low-latency local context path: a workspace outage leaves local context and local export fully
working.

This document states what the service defends against, how, and — just as importantly — what it does
**not** defend against and what has not been verified against a live third party.

---

## 1. Assets

| Asset | Where it lives | Worst case if lost |
| --- | --- | --- |
| Approved knowledge (claims, entities, relations) | `workspace_claims`, `workspace_entities`, `workspace_relations` | A competitor learns how a customer's system works |
| Review authority record | `audit_events` (append-only) | Nobody can prove who approved a change |
| Privacy-safe measurements | `workspace_task_outcomes`, `workspace_measurements` | Team-level performance data leaks |
| Identity + session material | `workspace_sessions`, `workspace_scim_tokens`, `oidc_login_requests` | Account takeover |
| Billing state | `workspace_subscriptions`, `billing_events`, `workspace_billing_credits` | Fraudulent entitlement or double charge |

Raw prompts and raw tool payloads are **not** in this table because they are not in this service. The
sync outbox transmits only approved model records and permitted measurements; `assertNoRawPayload`
refuses a batch carrying a raw field, and `applyBatch` refuses it again at the boundary and rolls the
whole batch back. The knowledge and measurement tables have no column that could hold one.

---

## 2. Trust boundaries

```
local daemon ──(service token, HTTPS)──▶ /v1/sync/push
browser ──────(session cookie + CSRF)──▶ /v1/...
customer IdP ─(OIDC id token / SCIM bearer)─▶ /v1/auth/oidc/*, /scim/v2/*
GitHub ───────(sha256 HMAC signature)───▶ /v1/github/webhook  (handler in github/webhooks.ts)
Stripe ───────(signed raw body)─────────▶ /v1/billing/stripe/webhook
```

Everything to the left of an arrow is untrusted input. Nothing to the left of an arrow may name its own
tenant, role, entitlement, or price.

---

## 3. Threats and controls

### T1 — Cross-tenant read

*A caller with a valid session in workspace A reads workspace B's knowledge.*

- Every knowledge, measurement, identity, and billing table carries `workspace_id` (plus `repository_id`
  where applicable) in its primary key.
- The session resolves to a **server-side** `Principal`; the workspace on it comes from the session row,
  never from the request. A path parameter naming another workspace answers **404** — existence is not
  disclosed.
- Repository scope is a second, independent gate (`scopeAllows`): a principal with an explicit
  repository allow-list sees only those repositories, and an empty allow-list sees nothing.
- The DB seam (`db.ts`) deliberately exposes only a parameterized `query` primitive and no unscoped list
  helper, so tenant scoping cannot be hidden behind a convenience method.

Proven by: `server.test.ts`, `metrics.test.ts`, `enterprise.test.ts` (SCIM cross-tenant 404 + empty
filter result), `phase-e-gate.test.ts` (`cross_tenant_reads = 0`).

### T2 — Raw payload exfiltration through sync

*A compromised or buggy local daemon pushes prompts to the workspace.*

- `buildSyncBatch` refuses to construct a batch containing a raw field.
- `applyBatch` re-checks at the server boundary and rolls the entire batch back on a violation, so a
  crafted HTTP request cannot bypass the client-side check.
- Structural backstop: no table has a payload-shaped column, asserted directly against
  `information_schema`.

### T3 — Session theft / privilege persistence

- Sessions are stored as SHA-256 hashes; the raw token is returned once. A dump of `workspace_sessions`
  cannot be replayed.
- Cookies are `Secure; HttpOnly; SameSite=Lax`; cookie-authenticated mutations require a matching
  `x-kage-csrf` header, compared in constant time. Bearer-token (service) callers are exempt because
  they are not browsers.
- Role and repository scope are re-read from the database on **every** request, so a privilege change
  takes effect immediately.
- Any identity write (SCIM patch/replace/delete) revokes the person's live sessions in the same
  transaction, and `resolveSession` additionally refuses any principal whose `active` flag is false.

### T4 — Malicious or replayed identity assertion (OIDC)

- Signature is verified against the configured issuer's key set **before** any claim is read as
  identity. A token signed by an unpublished key is rejected.
- `issuer`, `audience`, `nonce`, and expiry are each checked explicitly and reported separately, so a
  misconfiguration is diagnosable rather than a generic failure.
- `state` is minted server-side and consumed by a single atomic `UPDATE ... RETURNING`, so a replayed
  callback finds nothing. PKCE (S256) means an intercepted authorization code is not exchangeable.
- The IdP can say **who** you are; it cannot say **what you may do**. Roles come from the workspace
  membership table. Just-in-time provisioning is off by default and, when on, creates at an
  administrator-chosen default role.
- Optional email-domain restriction, enforced together with `email_verified`.

### T5 — Directory-driven privilege escalation (SCIM)

- The SCIM bearer token is stored hashed and resolves to exactly one workspace. No request field can
  widen it.
- Groups are a **read-only** projection of the five workspace roles. A directory cannot invent a group
  that grants something arbitrary.
- An unrecognised role in a SCIM payload is a 400, never a silent default.
- Unsupported filters are a 400, never silently ignored — a dropped filter would return the whole tenant
  to a client that asked for one user.
- Deprovisioning deactivates and revokes sessions; it never deletes the person, because the append-only
  audit log names them.

### T6 — Webhook forgery (GitHub, Stripe)

- Signature verified over the **raw bytes**, in constant time, **before** parsing. Invalid signature →
  401 and the processor is never called.
- Delivery/event id is claimed **before** processing, in the same transaction as the state change, so a
  redelivery is a no-op and a failed apply rolls the claim back rather than swallowing the provider's
  retry.
- Stripe events additionally carry a monotonic high-water mark, because Stripe does not guarantee order.
- Body size is bounded as bytes arrive, since an unauthenticated caller can otherwise force allocation.

### T7 — Entitlement forgery

- Entitlements are resolved from the stored subscription row this service wrote after verifying a Stripe
  signature. There is **no code path** from a request body to a stored subscription, and **no route**
  that writes an entitlement.
- Checkout takes a **plan**; the server chooses the price. `CheckoutRequest.price_id` is typed `never`.
- `local_runtime` and `workspace_export` are typed as the literal `true`: the type system refuses any
  code that would make them conditional on payment.

### T8 — Destructive action by a compromised session

- Workspace deletion requires an **owner** role (re-read from the database inside the tenant), a
  re-authentication within 5 minutes, and typing the workspace slug as confirmation.
- The export is written **before** anything is deleted; if it fails, nothing is deleted.
- A terminal record lands in `workspace_deletions`, which deliberately has no foreign key to
  `workspaces` so it outlives the tenant it describes.

### T9 — Audit tampering

- `audit_events` rejects every `UPDATE`, forever, by database trigger.
- `DELETE` is rejected too, except while the transaction-local `kage.retention_purge` flag is set. That
  flag is set only by `applyRetention` and `deleteWorkspace`, with `set_config(..., true)`, so it dies
  with the transaction and cannot leak to another connection.
- Intended production posture: the application role holds only `INSERT` + `SELECT` on `audit_events`.
  A `GRANT` cannot be proven against a superuser test session, so the trigger is the enforcement the
  tests actually exercise.

### T10 — Denial of the local loop

Out of scope by construction. The workspace is never on the local context path. A workspace outage,
an expired subscription, and a deleted workspace all leave local context and local export working.

---

## 4. What is NOT verified here (honest gaps)

These are real boundaries that need credentials or infrastructure this repository does not have. The
code and fixture-driven tests exist; the live integration does not.

- **`live_github_app_registration_needed`** — signature verification, delivery idempotency, least-
  privilege permission requests, and installation-token caching are tested against fixtures. No real
  GitHub App has been registered and no real delivery has been received.
- **`live_stripe_keys_needed`** — signature verification, event idempotency, ordering, entitlement
  resolution, and credit arithmetic are tested against fixtures. No live Stripe account or key has been
  exercised.
- **`live_oidc_scim_idp_needed`** — ID tokens are signed with a real RS256 key and verified through the
  real `jose` verifier against a real JWKS, and SCIM runs end to end over HTTP against real PostgreSQL.
  No live Okta/Entra/Google tenant has been connected, so vendor-specific discovery quirks, key rotation
  cadence, and claim naming are unverified.
- **Transport security** — TLS termination, HSTS, and certificate management are deployment concerns and
  are not implemented or asserted in this service.
- **Object storage** — deletion goes through an injected `ObjectStore` seam. A real bucket policy,
  versioning behaviour, and lifecycle rules are deployment concerns; the tests use an in-memory store.
- **Penetration testing** — none has been performed.

---

## 5. Residual risks accepted for now

- A workspace **owner** can shorten audit retention to the 365-day floor. The floor is the mitigation;
  the change is itself audited, but an owner is trusted within their own tenant by design.
- Object-key deletion happens before the relational transaction, so a crash between the two leaves rows
  referencing deleted objects. This direction is deliberate: the alternative leaves orphaned blobs
  nobody has a record of.
- `billing_events` rows outlive a deleted workspace (with the tenant reference cleared) so a webhook
  redelivered after deletion is still recognised as already-applied.
