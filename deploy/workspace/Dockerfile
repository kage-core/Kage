# The Kage team workspace service — the Postgres-backed service teams self-host or we run managed.
#
# This is NOT the local Kage runtime. The local daemon keeps working when this image is not running at
# all; nothing here is on a developer's low-latency context path.
#
# WHY EACH CHOICE IS HERE, NOT JUST WHAT IT IS:
#   - The base is pinned by DIGEST, not by tag. `node:22-bookworm-slim` is a moving target; a digest is
#     the only reference that means the same bytes next month. Both stages pin the same digest so the
#     build and the runtime are the same libc.
#   - MULTI-STAGE: the build stage carries devDependencies, the TypeScript compiler, and the .ts sources.
#     None of that reaches the runtime image, so a shell on a running container yields no source tree.
#   - NON-ROOT: the runtime runs as the base image's `node` user (uid 1000). Combined with the compose
#     file's `read_only: true` and `cap_drop: ALL`, a compromised process cannot write the filesystem or
#     escalate.
#   - EXEC-FORM ENTRYPOINT: node runs as PID 1 and receives SIGTERM directly. Wrapped in `npm start` or a
#     shell, SIGTERM goes to the wrapper and every deploy ends in a SIGKILL after the grace period.
#   - NO SOURCE MAPS: a stack trace from a customer's instance must not carry the TypeScript source.
#   - Migrations run inside the process before it listens (see vnext/workspace/boot.ts), so there is no
#     separate migration job to sequence and no window where the port is open on a half-built schema.
#
# BUILD CONTEXT: the repository root.
#   docker build -f deploy/workspace/Dockerfile -t kage-workspace:local .

# node:22.20.0-bookworm-slim
ARG NODE_IMAGE=node@sha256:b21fe589dfbe5cc39365d0544b9be3f1f33f55f3c86c87a76ff65a02f8f5848e

FROM ${NODE_IMAGE} AS build

WORKDIR /app/mcp

# Dependencies first, against the committed lockfile, so a source-only change reuses this layer.
COPY mcp/package.json mcp/package-lock.json ./
RUN npm ci

# The repo-root .dockerignore keeps the host `mcp/node_modules` and `mcp/dist` OUT of the build context,
# so this COPY (which runs AFTER `npm ci`) adds only sources and does NOT overwrite the lockfile-resolved
# dependency tree with whatever a developer had installed. Without that .dockerignore the pinned lockfile
# would guarantee nothing — the host tree, patched or compromised, would be what ships.
COPY mcp/ ./
RUN npm run build \
 && find dist -name '*.map' -delete

# Drop the build-only dependencies before they can be copied forward. The workspace service needs `pg`,
# `jose` and the MCP runtime deps; it does not need the TypeScript compiler or the test tooling.
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production
# No default database URL, no default secret: boot.ts refuses to start without explicit configuration
# rather than silently connecting somewhere. These are declared to document them, and left EMPTY.
ENV KAGE_WORKSPACE_DATABASE_URL=
ENV KAGE_WORKSPACE_PORT=8787

WORKDIR /app/mcp

# Only the built JavaScript, the SQL migrations, and the production node_modules.
COPY --from=build --chown=node:node /app/mcp/dist ./dist
COPY --from=build --chown=node:node /app/mcp/node_modules ./node_modules
COPY --from=build --chown=node:node /app/mcp/package.json ./package.json
COPY --chown=node:node mcp/vnext/workspace/migrations ./vnext/workspace/migrations
COPY --chown=node:node deploy/workspace/healthcheck.mjs deploy/workspace/entrypoint.sh /app/deploy/

USER node

EXPOSE 8787

# The probe fails a dead port AND a live server whose schema is behind this image: a pod that is still
# migrating, or that came up against a database another build owns, must not take traffic.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "/app/deploy/healthcheck.mjs"]

# Exec form. The entrypoint checks that the required configuration is present and then EXECs node, so
# node becomes PID 1: SIGTERM reaches it directly and boot.ts drains gracefully. Nothing forks it.
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
