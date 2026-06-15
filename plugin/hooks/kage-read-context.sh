#!/usr/bin/env bash
# Kage PreToolUse(Read) hook — injects verified file-linked memory right before the agent reads a file.
# Only currently-verified packets (citations checked, not stale) are ever injected.
# Silent if Kage is not initialized in the current project. Never blocks the Read.
# Mirrors the script written by `kage setup claude-code` (kernel.ts setupAgent);
# keep the two in sync when editing.
set -euo pipefail

PAYLOAD="$(cat || true)"
CWD="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print(d.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or "")
' 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0
# Resolve a repo-local install too, so hooks work without a global kage on PATH.
export PATH="$CWD/node_modules/.bin:$PATH"
command -v kage >/dev/null 2>&1 || exit 0

FILE_PATH="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
tool_input = d.get("tool_input") or d.get("toolInput") or {}
path = tool_input.get("file_path") if isinstance(tool_input, dict) else ""
print(path or "")
' 2>/dev/null || echo "")"
[[ -n "$FILE_PATH" ]] || exit 0
[[ "$FILE_PATH" = /* ]] || FILE_PATH="$CWD/$FILE_PATH"

# Skip files outside the project: memory is repo-scoped.
case "$FILE_PATH" in
  "$CWD"/*) ;;
  *) exit 0 ;;
esac

SESSION="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print(d.get("session_id") or d.get("sessionId") or "default")
' 2>/dev/null || echo "default")"

# Dedup: inject at most once per file per session via a tiny /tmp state file
# keyed by session_id+path. Failure to track must never block the Read.
STATE_DIR="/tmp/kage-read-context"
mkdir -p "$STATE_DIR" 2>/dev/null || true
KEY="$(printf "%s|%s" "$SESSION" "$FILE_PATH" | python3 -c 'import hashlib, sys
print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest()[:24])
' 2>/dev/null || echo "")"
if [[ -n "$KEY" && -d "$STATE_DIR" ]]; then
  [[ -e "$STATE_DIR/$KEY" ]] && exit 0
  : > "$STATE_DIR/$KEY" 2>/dev/null || true
fi

CONTEXT="$(kage file-context --project "$CWD" --path "$FILE_PATH" 2>/dev/null || true)"
if [[ -n "$CONTEXT" ]]; then
  KAGE_CONTEXT="$CONTEXT" python3 -c 'import json, os
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": os.environ.get("KAGE_CONTEXT", "")}}))
' 2>/dev/null || true
fi

exit 0
