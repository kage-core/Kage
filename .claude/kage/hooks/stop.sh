#!/usr/bin/env bash
# Kage Stop Hook
# Fires at session end. Invokes kage-distiller if the session is substantive.
# Exits 0 immediately so the session closes cleanly; distiller runs in background.

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

# Build task for kage-distiller
GLOBAL_MEM="$HOME/.agent_memory"
TASK="You are the kage-distiller agent. Analyze this session and save any valuable learnings to the memory graph.

transcript_path=$TRANSCRIPT_PATH
project_dir=$CWD
global_memory_dir=$GLOBAL_MEM
session_id=$SESSION_ID"

# Launch kage-distiller as a background Claude process (non-interactive)
# --no-session-persistence: don't save distiller session to disk
# --permission-mode bypassPermissions: no prompts (running in background)
nohup claude \
  --agent kage-distiller \
  --print "$TASK" \
  --permission-mode bypassPermissions \
  --no-session-persistence \
  >> "$LOG_FILE" 2>&1 &

# Exit 0 immediately — session closes cleanly, distiller continues in background
exit 0
