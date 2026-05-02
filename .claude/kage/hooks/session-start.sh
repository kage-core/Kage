#!/usr/bin/env bash
# Kage SessionStart Hook
# Records a TypeScript-packet observation and injects a short memory status note.

set -euo pipefail

HOOK_JSON="$(cat)"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"
SESSION_ID="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','default'))" 2>/dev/null || echo "default")"

GLOBAL_MEM="$HOME/.agent_memory"
REINDEX_QUEUE="$HOME/.claude/kage/reindex-queue.txt"
VERSION_FILE="$HOME/.claude/kage/version"
LAST_CHECK_FILE="$HOME/.claude/kage/last_update_check"

HAS_PROJECT=""
HAS_GLOBAL=""
GRAPH_STATUS=""
REINDEX_MSG=""
UPDATE_MSG=""

# Check for updates weekly (background, non-blocking)
if [[ -f "$VERSION_FILE" ]]; then
  NOW="$(date +%s)"
  LAST_CHECK="$(cat "$LAST_CHECK_FILE" 2>/dev/null || echo 0)"
  WEEK_SECS=604800
  if (( NOW - LAST_CHECK > WEEK_SECS )); then
    INSTALLED="$(tr -d '[:space:]' < "$VERSION_FILE")"
    LATEST="$(curl -fsSL --max-time 3 \
      "https://raw.githubusercontent.com/kage-core/Kage/master/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "")"
    echo "$NOW" > "$LAST_CHECK_FILE"
    if [[ -n "$LATEST" && "$LATEST" != "$INSTALLED" ]]; then
      UPDATE_MSG=" Kage update available: $INSTALLED → $LATEST. Run /kage update to upgrade."
    fi
  fi
fi

# Process reindex queue — if files were written last session that need re-indexing,
# note it in the system message so Claude knows to run /kage index --force
if [[ -f "$REINDEX_QUEUE" && -s "$REINDEX_QUEUE" ]]; then
  QUEUED_COUNT="$(wc -l < "$REINDEX_QUEUE" | tr -d ' ')"
  QUEUED_FILES="$(sort -u "$REINDEX_QUEUE" | tr '\n' ' ')"
  # Clear the queue
  rm -f "$REINDEX_QUEUE"
  REINDEX_MSG=" Repo index is stale ($QUEUED_COUNT high-signal file(s) changed last session: $QUEUED_FILES). Run /kage index --force to refresh."
fi

# Check project memory
if [[ -d "$CWD/.agent_memory" ]]; then
  PACKET_COUNT="$(ls "$CWD/.agent_memory/packets/"*.json 2>/dev/null | wc -l | tr -d ' ')"
  PENDING_COUNT="$(ls "$CWD/.agent_memory/pending/"*.json 2>/dev/null | wc -l | tr -d ' ')"
  HAS_PROJECT="Project memory: .agent_memory/ ($PACKET_COUNT approved packets, $PENDING_COUNT pending)."
  if command -v kage >/dev/null 2>&1; then
    EVENT="$(python3 -c "import json; print(json.dumps({'type':'session_start','session_id':'$SESSION_ID','agent':'claude-code','summary':'Claude Code session started'}))" 2>/dev/null || echo "")"
    [[ -n "$EVENT" ]] && kage observe --project "$CWD" --event "$EVENT" >/dev/null 2>&1 || true
  fi
fi

# Check global personal memory
if [[ -f "$GLOBAL_MEM/index.md" ]]; then
  GLOBAL_COUNT="$(ls "$GLOBAL_MEM/nodes/"*.md 2>/dev/null | wc -l | tr -d ' ')"
  HAS_GLOBAL="Personal memory: ~/.agent_memory/ ($GLOBAL_COUNT nodes)."
fi

# Check global graph reachability (lightweight HEAD request, 3s timeout)
if curl -s --head --max-time 3 \
  "https://raw.githubusercontent.com/kage-core/kage-graph/master/catalog.json" \
  > /dev/null 2>&1; then
  GRAPH_STATUS="Global knowledge graph: available."
else
  GRAPH_STATUS="Global knowledge graph: offline (no network or graph unreachable)."
fi

# Only emit if at least one tier is available
if [[ -z "$HAS_PROJECT$HAS_GLOBAL" && "$GRAPH_STATUS" == *"offline"* && -z "$REINDEX_MSG" ]]; then
  exit 0
fi

MSG="Kage memory active. $HAS_PROJECT $HAS_GLOBAL $GRAPH_STATUS$REINDEX_MSG$UPDATE_MSG Use Kage MCP tools or CLI recall before repo-specific work; capture durable learnings as pending packets."

# Use env variable to pass MSG into Python — avoids shell quoting bugs when MSG contains single quotes
KAGE_MSG="$MSG" python3 -c "import json,os; print(json.dumps({'systemMessage': os.environ['KAGE_MSG']}))" 2>/dev/null || exit 0
