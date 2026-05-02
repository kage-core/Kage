#!/usr/bin/env bash
# Kage UserPromptSubmit Hook
# Records user intent and nudges Claude toward Kage recall without forcing a
# legacy Markdown-node workflow.

set -euo pipefail

HOOK_JSON="$(cat)"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"
SESSION_ID="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','default'))" 2>/dev/null || echo "default")"
PROMPT_TEXT="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prompt','') or d.get('user_prompt','') or d.get('message',''))" 2>/dev/null || echo "")"

# Only fire if project memory exists
if [[ ! -d "$CWD/.agent_memory" ]]; then
  exit 0
fi

PACKET_COUNT="$(ls "$CWD/.agent_memory/packets/"*.json 2>/dev/null | wc -l | tr -d ' ')"

if command -v kage >/dev/null 2>&1; then
  EVENT="$(PROMPT_TEXT="$PROMPT_TEXT" python3 -c "import json,os; print(json.dumps({'type':'user_prompt','session_id':'$SESSION_ID','agent':'claude-code','text':os.environ.get('PROMPT_TEXT','')[:2000]}))" 2>/dev/null || echo "")"
  [[ -n "$EVENT" ]] && kage observe --project "$CWD" --event "$EVENT" >/dev/null 2>&1 || true
fi

MSG="Kage memory: this repo has $PACKET_COUNT approved packets. Use kage_recall or kage recall for repo-specific context, then capture durable learnings as pending packets."

KAGE_MSG="$MSG" python3 -c "import json,os; print(json.dumps({'hookSpecificOutput': os.environ['KAGE_MSG']}))" 2>/dev/null || exit 0
