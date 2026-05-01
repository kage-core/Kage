# Kage Hosted Deployment Checklist

Use this checklist before enabling hosted Kage pieces in a new environment or
promoting a release. It assumes local repo memory already works and that hosted
systems only receive explicit, reviewed writes.

## 1. Environment Readiness

- [ ] Environment name, region, owners, and escalation contacts are recorded.
- [ ] Separate credentials exist for dev, staging, and production.
- [ ] DNS names are allocated for org memory API, registry, CDN, bot callback,
  and admin surfaces.
- [ ] TLS certificates are provisioned and auto-renewal is tested.
- [ ] Health checks exist for API, workers, queues, search index, object store,
  database, CDN origin, signing worker, and bot webhook.
- [ ] Dashboards include request rate, error rate, latency, queue lag, search
  freshness, CDN cache hit rate, signing failures, bot failures, and permission
  denials.
- [ ] Alerts page the owning team for SLO breach, ingestion backlog, failed
  publish, key misuse, suspicious permissions, and bot webhook delivery failure.

## 2. Permissions And Tenant Policy

- [ ] Organization, repository, branch, user, and service account identifiers
  are present in all hosted requests.
- [ ] Tokens are scoped to the minimum required permissions.
- [ ] `org:read`, `org:write_candidate`, `org:review`, `global:propose`,
  `global:publish`, `registry:sign`, `bot:comment`, and `bot:write_check` are
  enforced by the API and workers.
- [ ] Repo allowlist is configured before upload or bot write paths are enabled.
- [ ] Branch allowlist is configured before branch overlays or PR checks run.
- [ ] Required reviewer counts are configured for org approval and global
  promotion.
- [ ] Path, tag, package, and domain denylists are loaded.
- [ ] Emergency kill switches exist for upload, publish, signing, PR comments,
  and PR status checks.
- [ ] Audit logs capture allowed and denied actions without exposing secrets or
  full private packet bodies.

## 3. Org Memory Server

- [ ] Database migrations have run successfully.
- [ ] Packet store supports immutable revisions and tombstones.
- [ ] Search index is initialized and can be rebuilt from stored packets.
- [ ] Recall API returns tier, source, packet id, revision, score, and stale
  status.
- [ ] Upload API accepts only pending or approved local packets from allowed
  repos.
- [ ] Review API can approve, reject, supersede, and tombstone packets.
- [ ] Feedback API records helpful, wrong, stale, and superseded feedback.
- [ ] Sanitization blocks credentials, bearer tokens, private keys, email
  addresses, private URL credentials, customer data markers, and denied paths.
- [ ] Tenant isolation tests pass for reads, writes, search, feedback, and
  deletion.
- [ ] Backup, restore, export, and deletion workflows have been rehearsed.

## 4. Branch Overlays

- [ ] Overlay namespace includes repository, branch, merge base, head commit,
  creator, and expiration.
- [ ] Recall layering is `branch overlay > repo main > org > global`.
- [ ] Overlay results visibly identify branch source and cannot masquerade as
  approved mainline memory.
- [ ] Overlay upload is restricted to allowed branches and authorized users.
- [ ] Overlay packets expire after merge, branch deletion, or inactivity.
- [ ] Merge handling promotes approved overlay packets to repo candidates only.
- [ ] Rejected overlays are tombstoned and excluded from recall.
- [ ] Conflict detection identifies overlays that supersede approved mainline
  packets.

## 5. PR Bot

- [ ] Bot installation uses least-privilege permissions.
- [ ] Webhook signature validation is enabled.
- [ ] Dry-run mode is available and tested.
- [ ] Bot comments are disabled by default for new repos.
- [ ] Status checks cover packet validation, secret scan, permission eligibility,
  branch overlay conflicts, and registry signing readiness.
- [ ] Duplicate comment suppression is enabled.
- [ ] Review commands require the matching Kage permission.
- [ ] Bot never commits, pushes, edits memory files, or publishes global content.
- [ ] Replayed webhook deliveries are idempotent.
- [ ] Bot failure mode leaves local development unblocked unless the repo has
  explicitly required the failing check.

## 6. Registry Signing

- [ ] Offline root key is generated, stored, and access-controlled.
- [ ] Online signing key is generated, scoped, and rotation-dated.
- [ ] Signing worker can sign deterministic registry manifests.
- [ ] Registry artifacts include source repo, commit, reviewer, build job,
  digest, compatibility, and release channel metadata.
- [ ] Clients reject unsigned manifests, invalid signatures, digest mismatches,
  unsupported versions, and revoked entries.
- [ ] Revocation manifest is signed and published through the same distribution
  path.
- [ ] Key rotation and emergency revocation have been rehearsed in staging.
- [ ] Signing logs include manifest digest, signing key id, actor, timestamp, and
  policy decision.

## 7. Global CDN Publish

- [ ] Global graph build uses approved global packets only.
- [ ] Build checks cover sanitization, license eligibility, duplicate packets,
  tombstones, schema validity, graph consistency, and quality thresholds.
- [ ] Graph snapshots are content-addressed and immutable.
- [ ] Stable aliases exist for latest, release channel, and exact version.
- [ ] CDN cache rules are configured separately for manifests, graph chunks,
  registry artifacts, revocations, and aliases.
- [ ] Publish pipeline uploads to staging paths before production alias
  promotion.
- [ ] Edge verification confirms signatures, digests, cache headers, and client
  compatibility.
- [ ] Rollback re-points aliases to the previous known-good release without
  rebuilding artifacts.
- [ ] CDN publish is independent of org memory server availability.

## 8. Release Gates

- [ ] Unit, integration, permission, tenant-isolation, and smoke tests pass.
- [ ] Load test covers expected recall, upload, bot webhook, and CDN traffic.
- [ ] Disaster recovery test restores org memory from backup.
- [ ] Kill switches have been tested in the target environment.
- [ ] Observability dashboards are reviewed by the on-call owner.
- [ ] Rollback plan is linked from the release ticket.
- [ ] Customer-visible behavior changes are documented.
- [ ] Support and incident response contacts are confirmed.

## 9. Post-Deploy Verification

- [ ] Org memory API health check is green.
- [ ] Staging packet recall returns expected repo, org, and global priority.
- [ ] Upload of a safe candidate succeeds for an allowed repo.
- [ ] Upload of a denied packet fails with an audited policy denial.
- [ ] Branch overlay recall appears only on the authorized branch.
- [ ] PR bot dry-run check completes on a test PR.
- [ ] Registry manifest verifies from a clean client.
- [ ] CDN edge returns the promoted graph version and signed revocation manifest.
- [ ] Metrics and audit logs appear within the expected delay.
- [ ] Rollback command or job is ready with the previous known-good release id.

## 10. Incident Quick Actions

- [ ] Suspected secret leak: disable upload and publish, tombstone affected
  packets, rotate exposed credentials, publish revocation, and invalidate CDN
  aliases if needed.
- [ ] Bad global graph release: stop publish jobs, roll aliases back, publish a
  signed revocation entry, and open a post-incident packet review.
- [ ] Permission bug: disable affected scopes, revoke active tokens, preserve
  audit logs, and run tenant-isolation regression tests.
- [ ] Signing key concern: disable registry signing, rotate online key, publish
  revocation, and verify clients reject old signatures when required.
- [ ] Bot noise or incorrect comments: disable `bot:comment`, leave status checks
  read-only, delete duplicate comments if policy permits, and replay webhooks in
  staging.
