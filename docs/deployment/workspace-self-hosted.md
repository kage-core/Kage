# Self-hosting the Kage team workspace

The workspace is the team service: review, ownership, policy, and aggregated metrics for a whole
organization, backed by PostgreSQL. This document is for the person who runs it.

**Read this first, because it changes what an outage means to you.** The workspace is *never* on a
developer's low-latency path. Local Kage context, the local portal, and workspace export keep working
with this service completely down. A daemon that cannot reach the workspace queues its sync batch and
retries; because a batch carries a stable id and the workspace applies it exactly once, the retry is a
no-op rather than a duplicate. So a workspace outage degrades team review and team metrics — it does not
stop anybody's work. Plan your on-call expectations accordingly.

## What you are running

| Artifact | What it is |
| --- | --- |
| `deploy/workspace/Dockerfile` | The service image. Multi-stage, digest-pinned Node 22, non-root, no source maps. |
| `deploy/workspace/docker-compose.yml` | The service plus PostgreSQL, for a single-host deployment. |
| `deploy/workspace/entrypoint.sh` | Checks required configuration, then `exec`s node so it is PID 1. |
| `deploy/workspace/healthcheck.mjs` | The container health probe. Fails a dead port *and* a stale schema. |
| `deploy/workspace/backup.sh` / `restore.sh` | Encrypted backup and restore. See [workspace-backup-restore.md](workspace-backup-restore.md). |
| `deploy/workspace/env.example` | Every variable the deployment reads. Copy to `.env`. |

## Quick start

```bash
cp deploy/workspace/env.example deploy/workspace/.env
# fill in KAGE_WORKSPACE_DATABASE_URL, POSTGRES_PASSWORD, KAGE_BACKUP_KEY
docker compose -f deploy/workspace/docker-compose.yml build
docker compose -f deploy/workspace/docker-compose.yml up -d
curl -s localhost:8787/v1/health     # {"status":"ok","database_migration":12}
```

The build context is the repository root; the image builds the MCP package from source with `npm ci`
against the committed lockfile.

## The boot sequence, and why it is what it is

`vnext/workspace/boot.ts` does exactly three things, in this order:

1. **Migrate.** The Postgres migrations under `mcp/vnext/workspace/migrations/` are ordered, idempotent,
   and version-tracked in `schema_migrations`. They are separate from the *local* sqlite storage, which
   has its own version and is untouched by any of this.
2. **Check the resulting version.** If the database is at a version *newer* than the migrations this
   image ships, the process exits instead of serving. During a rolling deploy both images are briefly
   alive; the old one must not write against a schema it does not understand, because that is how a
   rollback becomes corruption.
3. **Listen.** Only now is the port open.

There is no separate migration job to sequence, and there is no window in which the port is open on a
half-built schema. The health probe reports the migrated version, so an orchestrator can tell "starting"
from "serving" without guessing.

**There is no default database URL.** `KAGE_WORKSPACE_DATABASE_URL` is required and the service refuses
to start without it. A service that falls back to `postgres://localhost/kage` comes up pointing at the
wrong database, and the first symptom is a customer's missing knowledge.

## Readiness and liveness

Point both probes at `deploy/workspace/healthcheck.mjs` and set
`KAGE_WORKSPACE_EXPECTED_MIGRATION` to the schema version the image ships (currently **12**; bump it with
the image). The probe then fails:

- a port that does not answer;
- a non-`ok` status;
- a server whose `database_migration` is *behind* the expected version — a pod that is still migrating,
  or one pointed at a database another build owns. Without that check, such a pod passes readiness and
  serves reads against tables the running code does not match.

With the variable unset the probe checks liveness only, and says so in its output rather than implying it
verified a schema.

## Hardening that is already in the artifacts

- **Non-root, read-only rootfs, `cap_drop: ALL`, `no-new-privileges`.** The process listens on 8787 as
  uid 1000 and needs no Linux capability; `/tmp` is the only writable path and it is a tmpfs.
- **Digest-pinned bases.** Both the Node and Postgres images are referenced by `@sha256:`. A tag moves.
- **No source maps in the image.** A stack trace from a customer's instance does not carry your source.
- **Postgres is not published to the host.** It is reachable only on the compose network. Publishing it
  is how a self-hosted database ends up on the internet with a weak password.
- **No secret in any committed file.** Both services read `.env`; `env.example` ships every value empty.
- **Graceful shutdown.** The entrypoint `exec`s node, so SIGTERM reaches it directly and in-flight
  requests drain within `stop_grace_period` (30s) instead of being SIGKILLed.

## TLS, and what this service does not do

The workspace speaks plain HTTP and binds loopback in-process. Put a terminator (your ingress, a
reverse proxy) in front of it. It does not manage certificates, and it does not want to.

## Beyond one host

The compose file is a single-host deployment. For anything larger:

- run PostgreSQL as a managed service with point-in-time recovery, and keep taking the application-level
  backups described in [workspace-backup-restore.md](workspace-backup-restore.md) — they are not the
  same recovery tool and neither replaces the other;
- run several stateless workspace containers behind a load balancer. They share nothing but the database;
  migrations are idempotent and version-tracked, so concurrent starts converge on the same schema;
- keep `KAGE_WORKSPACE_EXPECTED_MIGRATION` in lockstep with the deployed image so a partially rolled-out
  version cannot take traffic against the wrong schema.

## Honest gaps in what has been verified

The deployment tests (`deploy/workspace/deploy.test.mjs`, run by `npm test --prefix mcp`) exercise the
boot sequence, the health probe, the backup/restore round trip, and workspace-outage behaviour against a
**real** ephemeral PostgreSQL. They check the Dockerfile and compose file **structurally** — pinned
digests, multi-stage, non-root, exec-form entrypoint, read-only rootfs, dropped capabilities, no baked
secrets.

They do **not** run `docker build` or `docker run`: there is no Docker daemon in the environment where
they run. A structural check is not a build. Before you rely on the image, run the build yourself:

```bash
docker compose -f deploy/workspace/docker-compose.yml build
docker compose -f deploy/workspace/docker-compose.yml up -d
docker compose -f deploy/workspace/docker-compose.yml ps      # workspace should be (healthy)
docker compose -f deploy/workspace/docker-compose.yml down -v
```
