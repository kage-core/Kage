#!/usr/bin/env bash
# Kage Stop Hook
# Records session end and distills stored observations into pending JSON packets.

set -euo pipefail

KAGE_DIR="$HOME/.claude/kage"
PROCESSED_FILE="$KAGE_DIR/.processed_sessions"
LOG_FILE="$KAGE_DIR/distill.log"

mkdir -p "$KAGE_DIR"

# Read Stop hook JSON from stdin
HOOK_JSON="$(cat)"

# Extract fields using python3 (already available on macOS/Linux)
TRANSCRIPT_PATH="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || echo "")"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"
SESSION_ID="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null || echo "")"

# Guard: no transcript path
if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  exit 0
fi

# Guard: already processed this session
if [[ -f "$PROCESSED_FILE" ]] && grep -qF "$SESSION_ID" "$PROCESSED_FILE" 2>/dev/null; then
  exit 0
fi

# Guard: count substantive turns (user + assistant)
TURN_COUNT="$(python3 -c "
import json
count = 0
try:
    with open('$TRANSCRIPT_PATH') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
                if d.get('type') in ('user', 'assistant'):
                    count += 1
            except:
                pass
except:
    pass
print(count)
" 2>/dev/null || echo "0")"

if [[ "$TURN_COUNT" -lt 4 ]]; then
  exit 0
fi

# Mark session as queued (before launching to prevent race conditions)
echo "$SESSION_ID" >> "$PROCESSED_FILE"

if [[ -n "$CWD" && -d "$CWD/.agent_memory" ]] && command -v kage >/dev/null 2>&1; then
  EVENT="$(python3 -c "import json; print(json.dumps({'type':'session_end','session_id':'$SESSION_ID','agent':'claude-code','summary':'Claude Code session ended after $TURN_COUNT substantive turns'}))" 2>/dev/null || echo "")"
  [[ -n "$EVENT" ]] && kage observe --project "$CWD" --event "$EVENT" >> "$LOG_FILE" 2>&1 || true
  kage distill --project "$CWD" --session "$SESSION_ID" >> "$LOG_FILE" 2>&1 || true
fi

# Exit 0 immediately so the session closes cleanly.
exit 0
