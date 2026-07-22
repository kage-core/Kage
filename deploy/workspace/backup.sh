#!/bin/sh
# Take an encrypted whole-instance backup of the Kage workspace database.
#
#   ./backup.sh /backups/kage-workspace-$(date -u +%Y%m%dT%H%M%SZ).kbk
#
# Prints one JSON line: the path, the SHA-256 OF THE FILE (record this in your backup catalogue — the
# restore verifies against it), the byte size, the schema version, and the per-table row counts.
#
# The script is deliberately thin. Encryption, checksums, and the table set live in
# vnext/workspace/backup.ts, which the deploy tests exercise against a real PostgreSQL. Reimplementing
# any of it here as `pg_dump | gpg` would create a second path that no test covers.
#
# WHAT THIS FILE DOES NOT CONTAIN: object-storage blobs. Evidence objects live in your bucket and have
# their own lifecycle. The backup carries the MANIFEST of the keys the restored rows will expect
# (`object_keys_expected` in the output, `object_bytes_included` always 0) so you can verify the bucket
# rather than assume it was included.
set -eu

: "${KAGE_WORKSPACE_DATABASE_URL:?KAGE_WORKSPACE_DATABASE_URL is required}"

# The key may be supplied inline or, preferably, through a file mounted from your secret store.
if [ -z "${KAGE_BACKUP_KEY_FILE:-}" ]; then
  : "${KAGE_BACKUP_KEY:?KAGE_BACKUP_KEY (base64, 32 bytes) or KAGE_BACKUP_KEY_FILE is required: a backup is never written unencrypted}"
fi

KAGE_APP_DIR="${KAGE_APP_DIR:-/app/mcp}"

exec node "${KAGE_APP_DIR}/dist/vnext/workspace/backup-cli.js" backup "$@"
