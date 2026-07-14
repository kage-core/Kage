#!/usr/bin/env bash
# Kage SessionStart hook — injects full memory policy as a system message.
# Silent if Kage is not initialized in the current project.
set -euo pipefail

CWD="$(cat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0
HOOK_EVENT="SessionStart"
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

# Read the full policy from AGENTS.md (between the markers) if present.
POLICY=""
AGENTS_MD="$CWD/AGENTS.md"
if [[ -f "$AGENTS_MD" ]]; then
  POLICY="$(python3 -c "
import sys, re
text = open('$AGENTS_MD').read()
m = re.search(r'<!-- KAGE_MEMORY_POLICY_V1 -->(.*?)<!-- END_KAGE_MEMORY_POLICY_V1 -->', text, re.DOTALL)
print(m.group(1).strip() if m else '')
" 2>/dev/null || echo "")"
fi

if [[ -z "$POLICY" ]]; then
  POLICY="This repo uses Kage as an automatic memory harness for coding agents.
Before making code changes or answering implementation questions:
1. Call kage_context with project_dir and the user task as query.
2. Use returned memory only when it is relevant, source-backed, and not stale.
When you learn something reusable: kage_learn.
After meaningful file/content changes: kage_refresh. Push-only or same-tree commits do not need another refresh.
Before finishing a task that changed files: kage_pr_summarize or kage_propose_from_diff, then kage_pr_check.
If recalled memory helped: kage_feedback helpful. If wrong or stale: kage_feedback wrong or stale."
fi

# kage-hooks-v4
# Resolve the kage CLI: repo-local, PATH, then the package runner.
export PATH="$CWD/node_modules/.bin:$PATH"
if command -v kage >/dev/null 2>&1; then
  :
else
  kage() { npx -y --package=@kage-core/kage-graph-mcp kage "$@"; }
fi
# Session continuity: append a compact "previously…" digest when prior session data exists.
if command -v kage >/dev/null 2>&1; then
  PREVIOUSLY="$(kage resume --project "$CWD" 2>/dev/null || true)"
  if [[ -n "$PREVIOUSLY" ]]; then
    POLICY="$POLICY

$PREVIOUSLY"
  fi
fi

KAGE_MSG="$POLICY" python3 -c "import json,os; print(json.dumps({'systemMessage': os.environ['KAGE_MSG']}))"
