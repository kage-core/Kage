#!/usr/bin/env bash
# Kage Stop hook — refreshes repo memory and blocks final handoff when linked memory needs agent reconciliation.
# Silent if Kage is not initialized in the current project or no git changes exist.
set -euo pipefail

PAYLOAD="$(cat || true)"
CWD="$(printf "%s" "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0
# Resolve the kage CLI: repo-local, PATH, baked install path, then the package runner.
export PATH="$CWD/node_modules/.bin:$PATH"
if command -v kage >/dev/null 2>&1; then
  :
elif [[ -f "/Users/kushaljain/code/Kage/mcp/dist/cli.js" ]] && command -v node >/dev/null 2>&1; then
  kage() { node "/Users/kushaljain/code/Kage/mcp/dist/cli.js" "$@"; }
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
