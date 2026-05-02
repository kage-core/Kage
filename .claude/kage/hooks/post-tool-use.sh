#!/usr/bin/env bash
# Kage PostToolUse Hook
# Records tool/file observations and queues high-signal file changes for reindex.

set -euo pipefail

HOOK_JSON="$(cat)"

TOOL_NAME="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"
SESSION_ID="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','default'))" 2>/dev/null || echo "default")"
FILE_PATH="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")"

if [[ -n "$CWD" && -d "$CWD/.agent_memory" ]] && command -v kage >/dev/null 2>&1; then
  EVENT_TYPE="tool_use"
  [[ "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "MultiEdit" ]] && EVENT_TYPE="file_change"
  EVENT="$(python3 -c "import json; print(json.dumps({'type':'$EVENT_TYPE','session_id':'$SESSION_ID','agent':'claude-code','tool':'$TOOL_NAME','path':'$FILE_PATH','summary':'Claude Code tool completed'}))" 2>/dev/null || echo "")"
  [[ -n "$EVENT" ]] && kage observe --project "$CWD" --event "$EVENT" >/dev/null 2>&1 || true
fi

# Only care about Write (and Edit) tool calls
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "MultiEdit" ]]; then
  exit 0
fi

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
