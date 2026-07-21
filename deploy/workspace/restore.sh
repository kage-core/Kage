#!/bin/sh
# Restore an encrypted Kage workspace backup into a database.
#
#   ./restore.sh /backups/kage-workspace-20260721T101500Z.kbk
#   ./restore.sh backup.kbk --migration-plan 11:12      # loading an older backup, deliberately
#   ./restore.sh backup.kbk --allow-nonempty            # merging into a database that has rows
#
# KAGE_WORKSPACE_DATABASE_URL must point at the TARGET database. The normal target is an empty one: the
# restore migrates it to this build's schema and then loads the file in a single transaction, so it
# either restores completely or not at all.
#
# IT REFUSES, RATHER THAN GUESSES:
#   - a file whose SHA-256 does not match KAGE_BACKUP_SHA256, when you set it from your catalogue;
#   - a tampered or wrongly-keyed file (AES-256-GCM authentication);
#   - a backup from a NEWER schema than this build ships (deploy that build and restore there);
#   - a backup from an OLDER schema without an explicit --migration-plan from:to;
#   - a target that already has rows, without --allow-nonempty.
#
# AFTER A RESTORE: every session is gone (sessions are deliberately not backed up — a restore is a new
# trust boundary), and you must confirm your object-storage bucket still holds the keys reported as
# `object_keys_expected`. The database alone is not the whole system.
set -eu

: "${KAGE_WORKSPACE_DATABASE_URL:?KAGE_WORKSPACE_DATABASE_URL is required and must point at the RESTORE TARGET}"

if [ -z "${KAGE_BACKUP_KEY_FILE:-}" ]; then
  : "${KAGE_BACKUP_KEY:?KAGE_BACKUP_KEY (base64, 32 bytes) or KAGE_BACKUP_KEY_FILE is required to open the backup}"
fi

KAGE_APP_DIR="${KAGE_APP_DIR:-/app/mcp}"

exec node "${KAGE_APP_DIR}/dist/vnext/workspace/backup-cli.js" restore "$@"
