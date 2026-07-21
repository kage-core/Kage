# Backing up and restoring the Kage workspace

A backup you have never restored is a hope, not a backup. This document describes what the backup
contains, what it deliberately does not, and how to rehearse the restore.

## Two different artifacts, on purpose

| | Whole-instance backup (this document) | Workspace export (`POST /v1/workspaces/:id/export`) |
| --- | --- | --- |
| Who takes it | The operator | A customer, for their own data |
| Scope | Every tenant | Exactly one tenant |
| Purpose | Bring the service back after losing the database | Data portability; also written before an irreversible deletion |
| Ledger tables | Included (replay stays safe) | Not applicable |

They are not interchangeable. A customer must never receive a file containing another tenant's rows, and
an operator recovering from a disaster must not have to stitch per-tenant exports together.

## Taking a backup

```bash
export KAGE_WORKSPACE_DATABASE_URL='postgres://kage:...@postgres:5432/kage_workspace'
export KAGE_BACKUP_KEY="$(openssl rand -base64 32)"   # store this in your secret manager, not here
deploy/workspace/backup.sh /backups/kage-workspace-$(date -u +%Y%m%dT%H%M%SZ).kbk
```

It prints one JSON line:

```json
{"ok":true,"backup_path":"/backups/kage-workspace-20260721T101500Z.kbk",
 "sha256":"…","byte_size":48213,"schema_version":12,"app_version":"3.3.0",
 "tables":{"workspaces":3,"workspace_claims":812,…},
 "object_keys_expected":47,"object_bytes_included":0}
```

**Record the `sha256` in your backup catalogue.** `restore.sh` will verify against it when you set
`KAGE_BACKUP_SHA256`, which is what stops a restore from a stale or half-uploaded object.

Keep the key somewhere other than the machine holding the backups. A key stored beside the file it
protects protects nothing.

## What is in the file

- Every operational table, including the ledgers that keep replay safe: `sync_batches` (a redelivered
  sync batch is still recognised as already applied) and `github_deliveries` (a redelivered webhook is
  not processed twice). A restored instance that forgot these would double-apply everything queued
  during the outage.
- `workspace_scim_tokens` (hashes) and `workspace_oidc_providers`, because a restored instance whose
  directory integration is dead has not really been restored. The OIDC client secret is *not* in the
  database at all — the row stores the *name* of a deployment secret, resolved from the environment at
  use time — so this file carries no OAuth credential.

## What is deliberately not in the file

- **Sessions and in-flight logins** (`workspace_sessions`, `oidc_login_requests`). A restore is a new
  trust boundary; everyone signs in again. That is fail-closed on purpose.
- **Object-storage blobs.** Evidence objects live in your bucket with their own lifecycle. The backup
  carries the *manifest* of keys the restored rows will expect (`object_keys_expected`), and states
  `object_bytes_included: 0` so this can never be misread. **Back up your bucket separately**, and after
  a restore confirm it still holds those keys.

## Encryption and integrity

The file is AES-256-GCM encrypted. The authentication tag is the real integrity guarantee: a tampered
file fails to open rather than opening with altered contents. Two operator-facing checks sit on top:

1. the SHA-256 of the whole file, verified *before* decryption when you supply `KAGE_BACKUP_SHA256`;
2. a SHA-256 over the payload, recorded inside the manifest and verified on every open.

## Restoring

```bash
export KAGE_WORKSPACE_DATABASE_URL='postgres://kage:...@postgres:5432/kage_workspace_restored'
export KAGE_BACKUP_KEY='…'
export KAGE_BACKUP_SHA256='…'          # from your catalogue
deploy/workspace/restore.sh /backups/kage-workspace-20260721T101500Z.kbk
```

The normal target is an **empty** database. The restore migrates it to this build's schema and then loads
the file in a **single transaction**: it either restores completely or not at all. A half-loaded database
that looks alive is the worst possible outcome of a disaster recovery.

It refuses, rather than guesses:

| Refusal | Why |
| --- | --- |
| `sha256_mismatch` | The file is not the one your catalogue recorded. |
| `unreadable` | Wrong key, or the file was tampered with (GCM). |
| `checksum_mismatch` | The payload does not match the manifest's checksum. |
| `schema_newer_than_build` | The backup was taken by a newer build. No plan bridges that — deploy that build and restore there. |
| `migration_plan_required` | The backup is from an older schema. Pass `--migration-plan <from>:<to>` to state that you have checked the intervening migrations against this data. |
| `target_not_empty` | The target already has rows. Pass `--allow-nonempty` if merging is what you meant. |

After a successful restore it prints the rows restored, the per-table counts, the sequences it advanced,
and `object_keys_expected`.

### Sequences

Restored rows carry their original sequence values, so the restore fast-forwards
`audit_events_audit_seq_seq` and `workspace_sync_seq` past the highest restored value. The second one
matters more than it looks: `workspace_sync_seq` **is the pull cursor**. Left at 1, two different claims
get the same cursor and every connected daemon silently skips changes — a failure with no error message.

## Rehearse it

Quarterly, and after any schema change:

1. Take a backup from production.
2. Restore it into a scratch database (`createdb kage_restore_rehearsal`).
3. Boot the workspace against that database and confirm `/v1/health` reports the expected version.
4. Spot-check one tenant's claim count, audit trail, and subscription against production.
5. Confirm your object-storage bucket still holds the keys the manifest lists.

Steps 1-4 are exactly what `deploy/workspace/deploy.test.mjs` does on every test run, against a real
PostgreSQL. Step 5 is yours: this tool cannot see your bucket.

## What has and has not been verified here

Verified automatically, against a real ephemeral PostgreSQL, on every `npm test --prefix mcp`: the
round trip through the shipped `backup.sh` and `restore.sh` (knowledge, audit log, and entitlements
restored into an empty database), sequence fast-forwarding, the object manifest, the absence of session
tokens and of any raw-payload field, and every refusal in the table above.

Not verified here: a restore into *your* managed Postgres, and your object-storage lifecycle. Rehearse
both.
