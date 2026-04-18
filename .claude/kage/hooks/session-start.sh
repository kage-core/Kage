#!/usr/bin/env bash
# Kage SessionStart Hook
# Injects a system message telling Claude which memory tiers are available.
# Also processes the reindex queue (files written since last session that need re-indexing).

set -euo pipefail

HOOK_JSON="$(cat)"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

GLOBAL_MEM="$HOME/.agent_memory"
REINDEX_QUEUE="$HOME/.claude/kage/reindex-queue.txt"

HAS_PROJECT=""
HAS_GLOBAL=""
GRAPH_STATUS=""
REINDEX_MSG=""

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
if [[ -f "$CWD/.agent_memory/index.md" ]]; then
  NODE_COUNT="$(ls "$CWD/.agent_memory/nodes/"*.md 2>/dev/null | wc -l | tr -d ' ')"
  AUTO_COUNT="$(grep -l 'source: kage-indexer' "$CWD/.agent_memory/nodes/"*.md 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$AUTO_COUNT" -gt 0 ]]; then
    HAS_PROJECT="Project memory: .agent_memory/ ($NODE_COUNT nodes, $AUTO_COUNT indexed from codebase)."
  else
    HAS_PROJECT="Project memory: .agent_memory/ ($NODE_COUNT nodes)."
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

MSG="Kage memory active. $HAS_PROJECT $HAS_GLOBAL $GRAPH_STATUS$REINDEX_MSG Use the kage-memory sub-agent before making architectural decisions, implementing patterns, or working in a specific domain."

# Use env variable to pass MSG into Python — avoids shell quoting bugs when MSG contains single quotes
KAGE_MSG="$MSG" python3 -c "import json,os; print(json.dumps({'systemMessage': os.environ['KAGE_MSG']}))" 2>/dev/null || exit 0
