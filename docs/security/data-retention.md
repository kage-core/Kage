# Data retention, export, and deletion

This describes exactly what the Kage workspace service keeps, for how long, who can change that, and
what happens when a customer leaves. Everything here is implemented in
`mcp/vnext/workspace/enterprise/retention.ts` and `.../export-delete.ts` and proven in
`.../enterprise.test.ts` against a real PostgreSQL.

---

## 1. Why retention is per-category, not one number

"Delete everything older than N days" is the wrong shape for this product, because the five kinds of
data here have opposite risk profiles:

| Category | What it is | Default | Floor | Rationale |
| --- | --- | --- | --- | --- |
| `evidence_metadata` | Pointers and classes for evidence records | 180 days | 7 | High-volume operational detail with the shortest useful life |
| `task_receipts` | Per-task measured outcomes (identifiers, classes, counts, measured numbers) | 365 days | 7 | A year covers an annual comparison |
| `aggregated_metrics` | Windowed aggregates | keep | 30 | Already aggregated; carries no individual record |
| `audit` | Who approved/rejected/superseded what | 2555 days (7 years) | **365** | The accountability record the review model exists to create |
| `approved_knowledge` | The team's verified claims and entities | keep | 30 | This is the customer's work product, not our telemetry |

"keep" is stored as `NULL`, which means **keep indefinitely**. It is an explicit, recorded choice — not
a missing value that some later code path could reinterpret as zero.

A retention change is itself an audit event (`retention.policy.set`), recording who shortened the
record and to what.

### The audit floor

The audit floor of 365 days exists because an operator who could set audit retention to one day could
erase the record of their own decisions the following morning. That would make the append-only log
decorative. `setRetentionPolicy` refuses anything below a category's floor with `below_minimum`.

---

## 2. How the purge runs

`applyRetention(db, workspaceId)`:

- Loads the policy actually in force (configured values overlaid on defaults), so nothing is skipped by
  accident.
- For each category with a day count, computes a cutoff and deletes rows older than it — **always** with
  `WHERE workspace_id = $1`, so one customer's purge can never touch another's rows.
- Runs each category in its **own** transaction. A lock or constraint failure in one category does not
  roll back categories that already succeeded, and the recorded run row reports what actually happened
  per category rather than an all-or-nothing claim.
- Records every category in `workspace_retention_runs`, including the "keep indefinitely" ones with a
  null cutoff and a zero count, so an operator can see the job considered the category.

### The one privileged operation

`audit_events` rejects `UPDATE` unconditionally and rejects `DELETE` unless the transaction-local
setting `kage.retention_purge` is `on` (migration 011). Only `applyRetention` and `deleteWorkspace` set
it, they set it with `set_config(..., true)` so it dies with the transaction, and they set it only for
the audit category. Every other delete path — an ad-hoc `psql`, a compromised session, an ORM cascade —
still raises `audit_events is append-only`.

---

## 3. Export

`POST /v1/workspaces/:id/export` — requires `workspace.manage`, and is **never** gated on a
subscription. `workspace_export` is typed as the literal `true` in the billing types: a lapsed,
cancelled, or unpaid customer can still take their data out.

The export is:

- **Single-tenant by construction.** Every table is read with `WHERE workspace_id = $1`.
- **Encrypted at rest** with AES-256-GCM. The auth tag means a tampered file fails to open rather than
  opening with silently altered contents.
- **Keyed per export.** The route mints a fresh 32-byte key, returns it to the authenticated requester
  once, and never stores it. This service cannot later decrypt a customer's export on its own — and
  neither can anyone who obtains only the file.
- **Checksummed.** The SHA-256 of the file is returned and recorded, and echoed on the download as
  `x-kage-export-sha256` so the caller can verify what they received without trusting the transport.
- **Actually deliverable.** The response carries `export_id`, `download_url`, and a one-time
  `download_token`. `GET /v1/exports/:export_id/download` serves the bytes to whoever presents that
  ticket as `Authorization: Bearer`. The ticket is stored hashed, compared in constant time, bound to one
  export row, and expires after 7 days; an unknown id, a wrong ticket, and an expired ticket are all the
  same 401, so ids are not a probe oracle. A server-side path is not a deliverable — the customer holds
  the file, not a filename on our disk.
- **Written somewhere private.** Exports land in `dataControls.export_directory` (or
  `KAGE_WORKSPACE_EXPORT_DIR`); with neither configured, in an unpredictable `mkdtemp` directory at mode
  0700, never a fixed guessable path under the shared OS temp dir, whose world-writable parent lets any
  local user create it first and read every tenant's export.
- **Version-stamped.** The manifest records the Postgres migration version, so a restore can refuse an
  incompatible schema.

### What an export deliberately omits

`workspace_sessions`, `workspace_scim_tokens`, and `oidc_login_requests`. Those are credentials, not
customer data. Putting them in a file the customer downloads would hand anyone who obtained that file a
set of live secrets. The omission is recorded in the manifest's `excluded_tables`.

---

## 4. Deletion

`POST /v1/workspaces/:id/delete` — irreversible. The order of operations *is* the safety property:

1. **Authority.** The confirming principal must be an active **owner**, with the role re-read from the
   database inside the tenant (never taken from the request), must have re-authenticated within the last
   **5 minutes**, and must type the workspace slug as confirmation. An ordinary live session is not
   enough authority for the most destructive act in the product.

   The re-authentication instant is read from `workspace_sessions.reauthenticated_at` — written by this
   service when the credential was presented — for the requesting session, matched to that same owner and
   still live. There is no request field for it, and no way to supply one: a check whose input the caller
   writes is not a check. A session with no recorded instant fails closed.
2. **Blobs must be removable.** If the tenant references object-storage keys and the deployment has no
   object store configured, the deletion is refused (409 `object_store_required`) with the tenant fully
   intact. Removing the rows while the blobs stayed would leave the terminal ledger asserting a removal
   that never happened.
3. **Export first, and fetchable.** An encrypted export is written before anything is removed, and its
   download ticket is minted before the tenant goes — after the deletion there is no workspace, no
   principal, and no session left to authenticate a download with. If the export fails, nothing is
   deleted.
4. **Terminal record.** A row lands in `workspace_deletions` — a table with **no foreign key** to
   `workspaces`, on purpose, so it survives the tenant it describes. It records who confirmed, when they
   re-authenticated, and the checksum of what they were handed. It holds no tenant knowledge.
5. **Object keys.** Blob deletion happens before the database transaction, because blobs cannot
   participate in it. A crash here leaves rows pointing at deleted objects — visible and fixable —
   rather than orphaned blobs nobody has a record of. The ledger records `object_keys_total` (how many
   the tenant had) and `object_keys_deleted` (how many the store **reported** removing) as two separate
   numbers. They are never merged: a compliance record that outlives the tenant is worth nothing if it
   rounds up.
6. **One transaction.** Every relational row goes in a single transaction, children before parents, with
   the `workspaces` row last. A partially-deleted tenant is impossible.

`billing_events` rows are kept with their tenant reference cleared, so a Stripe event redelivered after
the deletion is still recognised as already-applied instead of being processed a second time.

---

## 5. What is not verified here

- **Export storage is this service's own filesystem.** The download route streams the file from the
  directory the export was written to. A multi-node deployment must therefore either pin exports to
  shared storage via `export_directory` or route `/v1/exports/:id/download` to the node that wrote them.
  That is a deployment decision and is not asserted by the tests, which run one node.
- **Object storage** is an injected `ObjectStore` seam. Tests use an in-memory store; a real bucket's
  versioning, soft-delete, and lifecycle rules are deployment concerns and are not asserted.
- **Backup media.** Deleting rows does not delete them from database backups. Backup retention and
  crypto-shredding are covered by the deployment runbook, not by this service.
- **Log retention.** Application and infrastructure logs are outside this service's control.
