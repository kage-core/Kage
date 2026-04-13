#!/usr/bin/env bash
# Kage SessionStart Hook
# Injects a system message telling Claude which memory tiers are available.

set -euo pipefail

HOOK_JSON="$(cat)"
CWD="$(echo "$HOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

GLOBAL_MEM="$HOME/.agent_memory"

HAS_PROJECT=""
HAS_GLOBAL=""
GRAPH_STATUS=""

# Check project memory
if [[ -f "$CWD/.agent_memory/index.md" ]]; then
  NODE_COUNT="$(ls "$CWD/.agent_memory/nodes/"*.md 2>/dev/null | wc -l | tr -d ' ')"
  HAS_PROJECT="Project memory: .agent_memory/ ($NODE_COUNT nodes)."
fi

# Check global personal memory
if [[ -f "$GLOBAL_MEM/index.md" ]]; then
  GLOBAL_COUNT="$(ls "$GLOBAL_MEM/nodes/"*.md 2>/dev/null | wc -l | tr -d ' ')"
  HAS_GLOBAL="Personal memory: ~/.agent_memory/ ($GLOBAL_COUNT nodes)."
fi

# Check global graph reachability (lightweight HEAD request, 3s timeout)
if curl -s --head --max-time 3 \
  "https://raw.githubusercontent.com/kage-memory/graph/main/catalog.json" \
  > /dev/null 2>&1; then
  GRAPH_STATUS="Global knowledge graph: available."
else
  GRAPH_STATUS="Global knowledge graph: offline (no network or graph unreachable)."
fi

# Only emit if at least one tier is available
if [[ -z "$HAS_PROJECT$HAS_GLOBAL" && "$GRAPH_STATUS" == *"offline"* ]]; then
  exit 0
fi

MSG="Kage memory active. $HAS_PROJECT $HAS_GLOBAL $GRAPH_STATUS Use the kage-memory sub-agent before making architectural decisions, implementing patterns, or working in a specific domain."

python3 -c "import json; print(json.dumps({'systemMessage': '$MSG'}))" 2>/dev/null || exit 0
