#!/usr/bin/env bash
# Kage Stop hook — refreshes repo memory and blocks final handoff when linked memory needs agent reconciliation.
# Silent if Kage is not initialized in the current project or no git changes exist.
set -euo pipefail

PAYLOAD="$(cat || true)"
CWD="$(printf "%s" "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0
# Stop has no vNext adapter handler, so this script never hands over — but the guard is kept
# uniform so the day an adapter handles Stop, one line here is the whole change.
HOOK_EVENT="Stop"
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
# kage-hooks-v5
# Resolve the kage CLI: repo-local, PATH, then the package runner.
export PATH="$CWD/node_modules/.bin:$PATH"
if command -v kage >/dev/null 2>&1; then
  :
else
  kage() { npx -y --package=@kage-core/kage-graph-mcp kage "$@"; }
fi
command -v kage >/dev/null 2>&1 || exit 0

if git -C "$CWD" status --porcelain -uall >/dev/null 2>&1 && [[ -n "$(git -C "$CWD" status --porcelain -uall)" ]]; then
  kage refresh --project "$CWD" --json >/dev/null 2>&1 || true
  kage pr summarize --project "$CWD" --json >/dev/null 2>&1 || true
  RECONCILE_OUTPUT="$(kage reconcile --project "$CWD" --json 2>/dev/null || true)"
  RECONCILE_UNRESOLVED="$(printf "%s" "$RECONCILE_OUTPUT" | python3 -c 'import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(int(d.get("unresolved_count") or 0))
' 2>/dev/null || echo "0")"
  if [[ "$RECONCILE_UNRESOLVED" != "0" ]]; then
    printf "%s" "$RECONCILE_OUTPUT" | python3 -c 'import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get("agent_instruction") or "Kage memory reconciliation required before final response.")
' >&2
    exit 2
  fi
fi

# Automatic capture fallback: if this session recorded observations but produced no new
# memory packets, quietly distill them into pending drafts for later review. Best-effort;
# kage distill --auto is silent on empty or already-captured sessions and never blocks.
SESSION="$(printf "%s" "$PAYLOAD" | python3 -c 'import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get("session_id") or d.get("sessionId") or "")
' 2>/dev/null || echo "")"
if [[ -n "$SESSION" && -d "$CWD/.agent_memory/observations" ]]; then
  kage distill --project "$CWD" --session "$SESSION" --auto --json >/dev/null 2>&1 || true
fi

exit 0
