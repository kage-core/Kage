# Kage Org And Global Roadmap

This roadmap defines the hosted pieces that turn the local repo memory product into
an organization memory platform and a public graph distribution system. Each
phase is scoped so it can ship independently behind explicit permissions and
without changing the current local-only safety model: agents may propose memory,
but humans approve publication and sharing.

## Principles

- Local project memory remains the source of truth for repo-specific behavior.
- Hosted services receive only explicit, reviewed uploads.
- Public/global content is advisory and lower priority than repo or org memory.
- Every hosted write is attributable to a user, org, repo, branch, and source
  packet or review event.
- Read paths should degrade gracefully to local memory when hosted services are
  unavailable.

## Phase 0: Hosted Foundations

Goal: establish shared operational contracts before any memory leaves a repo.

Deliverables:

- Hosted service inventory for org memory, CDN publishing, PR automation,
  registry signing, permissions, and branch overlays.
- Environment separation for dev, staging, and production.
- Audit event schema covering login, token issuance, packet upload, review,
  promotion, revocation, CDN publish, bot action, and registry signing.
- Tenant identifiers for organization, workspace, repository, branch, and user.
- Shared runbook for incidents, rollbacks, key rotation, and data deletion.

Exit criteria:

- Every hosted component has an owner, data classification, backing store,
  deployment target, health check, metrics, and rollback method.
- Staging can receive synthetic packets and emit complete audit events.

## Phase 1: Org Memory Server

Goal: provide private team memory that sits between project memory and the
public graph.

Scope:

- HTTP MCP-compatible org memory API for recall, graph lookup, packet upload,
  review state, feedback, and tombstones.
- Ingestion path from approved repo packets and sanitized public candidates.
- Tenant-isolated packet store with immutable packet revisions.
- Search index for title, body, tags, paths, package names, commands, and graph
  entities.
- Feedback aggregation for helpful, wrong, stale, and superseded results.
- Admin export and deletion workflows.

Rollout:

1. Read-only recall against seeded staging packets.
2. Private beta with upload disabled by default.
3. Enable upload for selected repos after org admin approval.
4. Enable review workflow and tombstones.
5. Enable org-to-global promotion candidates.

Operational checks:

- Validate tenant isolation in API tests and production canaries.
- Ensure secrets and private URLs are rejected before upload.
- Verify org memory never overrides repo-local results with higher confidence
  unless the caller explicitly requests org/global expansion.
- Emit audit events for every read and write that crosses the local boundary.

## Phase 2: Permissions And Policy

Goal: make sharing explicit, reviewable, and enforceable.

Permission model:

- `org:read`: recall org memory.
- `org:write_candidate`: upload pending org memory.
- `org:review`: approve, reject, tombstone, or supersede org memory.
- `global:propose`: create global promotion candidates.
- `global:publish`: approve global publication.
- `registry:sign`: sign registry manifests and release metadata.
- `bot:comment`: allow PR bot comments.
- `bot:write_check`: allow PR bot status checks.

Policy controls:

- Repo allowlist for hosted uploads.
- Branch allowlist for automatic PR checks.
- Required reviewer count for org approval and global promotion.
- Path and tag denylist for private areas.
- Content scanners for credentials, customer data, emails, private hosts, and
  unsupported license text.
- Emergency kill switch for upload, publish, bot comments, and registry signing.

Exit criteria:

- Permissions are enforced at API, worker, and UI/admin boundaries.
- Denied operations are visible in audit logs without leaking packet content.
- Token scopes are short-lived and can be revoked per user, repo, or org.

## Phase 3: Branch Overlays

Goal: allow memory to reflect active branches and PRs without polluting mainline
project or org memory.

Scope:

- Branch overlay namespace keyed by repository, branch, merge base, and head.
- Overlay recall that layers `branch > repo main > org > global`.
- Automatic expiration when the branch is merged, deleted, or inactive.
- Conflict markers when branch memory supersedes approved mainline packets.
- Promotion path from overlay packet to repo-approved packet after merge.

Operational flow:

1. Local CLI or PR bot proposes overlay packets from branch diffs.
2. Overlay packets are available only to that branch and authorized reviewers.
3. On merge, approved overlay packets become repo candidates.
4. Rejected or stale overlay packets are tombstoned with audit metadata.

Exit criteria:

- Recall results show the tier and branch source for each overlay result.
- Deleting a branch removes hosted overlay reads after the retention window.
- Overlay packets cannot be promoted to org or global without repo approval.

## Phase 4: PR Bot

Goal: make memory review and branch overlays visible in normal code review.

Scope:

- GitHub App or equivalent bot with least-privilege repo installation.
- PR comments summarizing proposed memory, stale recall, policy violations, and
  relevant org/global context.
- Status checks for packet validation, secret scanning, permission eligibility,
  overlay conflicts, and signing readiness.
- Review commands for approve, reject, mark stale, supersede, and promote.
- Rate limiting and duplicate-comment suppression.

Rollout:

1. Dry-run check only, no comments.
2. Single summary comment on opted-in repos.
3. Reviewer commands gated by `org:review`.
4. Overlay promotion after merge.
5. Org/global candidate creation after explicit approval.

Exit criteria:

- Bot never commits to the repo or edits memory files directly.
- Bot comments link to exact packets and audit events.
- Failed bot checks block only the configured required checks.
- Re-running a bot job is idempotent.

## Phase 5: Registry Signing

Goal: make distributed registry recommendations verifiable before clients use
them.

Scope:

- Signed registry manifests for docs, skills, optional MCPs, graph snapshots,
  and compatibility metadata.
- Offline root key and online signing key with rotation schedule.
- Signature verification in clients before accepting registry content.
- Revocation manifest for compromised, deprecated, or malicious entries.
- Provenance metadata for source repo, commit, reviewer, build job, and digest.

Operational flow:

1. Registry build job creates deterministic manifest and artifact digests.
2. Policy worker verifies required reviews and compatibility checks.
3. Signing worker signs the manifest with the active online key.
4. CDN publishes the signed manifest and artifacts atomically.
5. Clients verify signature, digest, version, and revocation status.

Exit criteria:

- Unsigned or mismatched registry entries are ignored by clients.
- Key rotation can be rehearsed in staging without client changes.
- Emergency revocation reaches clients through the same CDN path.

## Phase 6: Global CDN Publish

Goal: distribute public graph and registry artifacts cheaply, quickly, and with
clear rollback.

Scope:

- Immutable content-addressed graph snapshots.
- Stable aliases for latest, channel, and versioned releases.
- CDN cache rules for manifests, graph chunks, registry assets, and revocations.
- Publish pipeline that validates, signs, uploads, promotes aliases, and
  verifies edge reads.
- Rollback pipeline that re-points aliases to the previous known-good release.

Publish sequence:

1. Build graph snapshot from approved global packets only.
2. Run sanitization, license, duplicate, tombstone, and quality checks.
3. Sign manifests and graph chunk digests.
4. Upload artifacts to staging paths.
5. Verify staging edge reads and signature checks.
6. Promote aliases for production.
7. Monitor error rate, cache hit rate, stale reads, and client verification
   failures.

Exit criteria:

- A bad release can be rolled back by alias promotion without rebuilding.
- Clients can pin exact versions for reproducible recall.
- Global graph publication does not require the org memory server to be online.

## Phase 7: Integrated Hosted Launch

Goal: combine org memory, branch overlays, PR automation, signed registry, and
global CDN into a supported hosted service.

Launch checklist:

- Org memory read and write paths are permission-gated.
- Branch overlays are enabled for opted-in repos only.
- PR bot is dry-run by default and comment-enabled per repo.
- Registry manifests and global graph snapshots are signed.
- CDN rollback has been rehearsed from production-like staging.
- Support has dashboards for API health, queue lag, publish status, bot errors,
  signing failures, permission denials, and client verification failures.
- Data deletion, export, incident response, and key rotation runbooks are tested.

Post-launch milestones:

- Self-serve org onboarding.
- Admin UI for policy, permissions, review queues, and audit logs.
- Public transparency page for global graph releases and registry revocations.
- Usage-based capacity planning for search, packet ingestion, CDN egress, and
  bot jobs.
