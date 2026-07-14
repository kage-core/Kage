#!/usr/bin/env bash
# Kage PreToolUse(Read) hook — injects verified file-linked memory right before the agent reads a file.
# Only currently-verified packets (citations checked, not stale) are ever injected.
# Silent if Kage is not initialized in the current project. Never blocks the Read.
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
HOOK_EVENT="PreToolUse"
KAGE_VNEXT_ADAPTER_EVENTS=" SessionStart UserPromptSubmit PreToolUse PostToolUse PostToolUseFailure SessionEnd "
if [[ "$KAGE_VNEXT_ADAPTER_EVENTS" == *" $HOOK_EVENT "* ]] && KAGE_VNEXT_DIR="$CWD/.agent_memory/daemon/vnext" python3 -c 'import json, os, stat, subprocess

def dead():
    raise SystemExit(1)

directory = os.environ.get("KAGE_VNEXT_DIR") or ""
status_path = os.path.join(directory, "status.json")
token_path = os.path.join(directory, "token")
try:
    uid = os.getuid()
    entry = os.lstat(directory)
    if not stat.S_ISDIR(entry.st_mode) or entry.st_uid != uid or (entry.st_mode & 0o077):
        dead()
    for path in (status_path, token_path):
        entry = os.lstat(path)
        if not stat.S_ISREG(entry.st_mode) or entry.st_uid != uid or (entry.st_mode & 0o077):
            dead()
    with open(status_path, "r", encoding="utf-8") as handle:
        status = json.load(handle)
    with open(token_path, "r", encoding="utf-8") as handle:
        token = handle.read().strip()
except Exception:
    dead()
if not isinstance(status, dict) or not token:
    dead()
host, port, mode, pid = status.get("host"), status.get("port"), status.get("mode"), status.get("pid")
if host != "127.0.0.1" or mode not in ("audit", "assist"):
    dead()
if not isinstance(port, int) or isinstance(port, bool) or not 0 < port < 65536:
    dead()
if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
    dead()
try:
    os.kill(pid, 0)
except Exception:
    dead()
try:
    proc = subprocess.run(["ps", "-p", str(pid), "-o", "comm="], capture_output=True, timeout=2)
    comm = os.path.basename(proc.stdout.decode("utf-8", "replace").strip()).lower()
except Exception:
    dead()
if "node" not in comm:
    dead()
print("http://127.0.0.1:%d %s" % (port, mode))
' >/dev/null 2>&1; then
  exit 0
fi
# kage-hooks-v4
# Resolve the kage CLI: repo-local, PATH, then the package runner.
export PATH="$CWD/node_modules/.bin:$PATH"
if command -v kage >/dev/null 2>&1; then
  :
else
  kage() { npx -y --package=@kage-core/kage-graph-mcp kage "$@"; }
fi
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
