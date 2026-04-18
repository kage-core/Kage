#!/usr/bin/env bash
# Kage PostToolUse Hook
# Watches Write tool calls for changes to high-signal files.
# Queues those files for re-indexing at next SessionStart.

set -euo pipefail

HOOK_JSON="$(cat)"

TOOL_NAME="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")"

# Only care about Write (and Edit) tool calls
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

FILE_PATH="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")"

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# High-signal files that warrant re-indexing
if echo "$FILE_PATH" | grep -qE "(schema\.prisma|package\.json|pyproject\.toml|go\.mod|Cargo\.toml|requirements\.txt|\.env\.example|\.env\.sample|Dockerfile|docker-compose\.yml|/routes/|/middleware/auth|/lib/auth|/auth/|README\.md)"; then
  QUEUE_FILE="$HOME/.claude/kage/reindex-queue.txt"
  mkdir -p "$HOME/.claude/kage"
  echo "$FILE_PATH" >> "$QUEUE_FILE"
fi

exit 0
