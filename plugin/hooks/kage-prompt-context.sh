#!/usr/bin/env bash
# Kage UserPromptSubmit hook — recalls verified memory for the user's prompt and injects it
# (with a savings receipt) before the agent acts, so top-of-task recall is ambient, not
# dependent on the agent choosing to call kage_context. Silent if Kage is not initialized.
# Mirrors the UserPromptSubmit recall the install path wires via observe.sh (kernel.ts);
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

PROMPT="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print((d.get("prompt") or d.get("user_prompt") or d.get("message") or "")[:1000])
' 2>/dev/null || echo "")"
[[ -n "$PROMPT" ]] || exit 0

CONTEXT="$(kage prompt-context --project "$CWD" --query "$PROMPT" 2>/dev/null || true)"
if [[ -n "$CONTEXT" ]]; then
  KAGE_CONTEXT="$CONTEXT" python3 -c 'import json, os
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": os.environ.get("KAGE_CONTEXT", "")}}))
' 2>/dev/null || true
fi

exit 0
