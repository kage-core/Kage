#!/bin/sh
# Container entrypoint for the Kage workspace service.
#
# Two jobs, and deliberately no third: fail fast with a readable message when required configuration is
# missing, then EXEC node so it becomes PID 1 and receives SIGTERM directly. Everything else — running
# migrations before listening, refusing a database a newer build owns, draining on SIGTERM — lives in
# vnext/workspace/boot.ts, where it is covered by tests. Logic in a shell script here would be a second,
# untested implementation of the boot sequence.
set -eu

: "${KAGE_WORKSPACE_DATABASE_URL:?KAGE_WORKSPACE_DATABASE_URL is required (there is no default: a workspace that guesses its database can come up pointing at the wrong one)}"

KAGE_APP_DIR="${KAGE_APP_DIR:-/app/mcp}"

exec node "${KAGE_APP_DIR}/dist/vnext/workspace/boot.js"
