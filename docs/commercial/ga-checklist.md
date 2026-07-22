# Kage v4 GA checklist

Kage does not go GA until **every required gate below is met**. Five of them are code-provable and
enforced by an automated test that runs against a real embedded PostgreSQL. The sixth — the commercial
gate — cannot be completed by any amount of code and must be earned with real design partners.

The machine-readable version of this checklist is `scripts/vnext-phase-e-report.mjs`, which **exits
non-zero whenever any required gate is unmet**. Until real pilots run, it always exits non-zero — by
design, so CI can never mistake "the code is ready" for "we may launch".

```bash
node scripts/vnext-phase-e-report.mjs --project . --json   # the GA decision, as data
npm run test:phase-e --prefix mcp                           # the technical gate, end-to-end vs real PG
```

## Technical gates (code-provable; each has an owning test)

| Gate | Invariant | Enforcing test |
| --- | --- | --- |
| **A** — Tenant / repository / path-permission isolation | `cross_tenant_reads = 0`: a cross-tenant, cross-repository, or out-of-scope read returns zero rows | `mcp/vnext/phase-e-gate.test.ts`, `sync-routes.test.ts`, `metrics.test.ts` |
| **B** — Raw payloads stay local | `raw_payloads_synced = 0`: a batch carrying `local_raw` evidence is refused before any row lands | `mcp/vnext/phase-e-gate.test.ts`, `sync/sync.test.ts` |
| **C** — GitHub signatures, least privilege, token expiry, delivery idempotency | `invalid_webhooks_accepted = 0`: bad signature is 401 before parse; a redelivery is processed once; read-only perms requested; tokens cached only to the reported expiry | `github/github.test.ts`, `phase-e-gate.test.ts` |
| **D** — Review authority, self-approval, Stripe idempotency, server entitlements, OIDC/SCIM | `self_approvals = 0`: a proposer cannot approve their own high-impact claim; entitlements resolve from stored server state; OIDC/SCIM verified with jose | `phase-e-gate.test.ts`, `review.test.ts`, `billing/*.test.ts`, `enterprise/enterprise.test.ts` |
| **E** — Backup/restore, export/delete, retention, workspace-outage local operation | `local_context_available_during_workspace_outage = true` and `export_available_after_entitlement_expiry = true` | `phase-e-gate.test.ts`, `enterprise/enterprise.test.ts`, `deploy/workspace/deploy.test.mjs` |

The single end-to-end proof for A–E is `mcp/vnext/phase-e-gate.test.ts`: two workspaces, three users, two
local replicas, one GitHub installation fixture, one billing fixture, and one restricted repository,
asserting all seven counters/booleans in one run against a real ephemeral PostgreSQL.

## Commercial gate (NOT code-completable)

**Three design partners complete pilots and at least one accepts paid terms**, and the pilot report
proves Kage does not increase exact measured context cost over the enabled cohort **or** issues the
documented [no-overhead credit](./no-overhead-pilot.md).

- Run the [design-partner pilot protocol](./design-partner-pilot.md) for each partner.
- Record results in `docs/commercial/pilot-cohort.json` (shape documented in the protocol).
- The gate is **met** only with ≥3 completed pilots, ≥1 paid conversion, and a measured exact-cost
  non-increase (or credit) — asserted with data, never derived by a script.

**Current state: NOT RUN.** No pilot cohort file exists; partners completed `0/3`, paid conversions
`0/1`. The GA decision is **NO-GO**, and that is the correct, honest state.

## Honest gaps (cannot be proven by the test suite in this repository)

- `design_partner_pilots_not_run` — no partner has completed the 7-audit + 14-assist protocol.
- `live_github_app_registration_needed` — signature/idempotency/least-privilege are fixture-proven; a
  real App id + webhook secret against `api.github.com` is not exercised.
- `live_stripe_keys_needed` — webhook idempotency, server entitlements, and the credit cap are
  fixture-proven; a live Stripe account + price ids are not exercised.
- `live_oidc_scim_idp_needed` — token/assertion verification is proven with a locally-minted RS256
  keypair; interop with a real Okta/Entra/Google tenant is not exercised.
- `docker_build_not_run_here` — the Dockerfile + compose are structure-tested; an actual image build/run
  needs a Docker daemon in CI.

## Kill criteria

GA is abandoned, not merely delayed, if:

- A tenant-isolation or raw-payload leak is found in production data that the gate did not catch.
- No design partner accepts paid terms after three completed pilots **and** no product change is
  identified that would change that.
- The measured pilot cohort shows Kage **increases** exact request cost and the no-overhead credit
  cannot cover it within the platform-fee cap.
