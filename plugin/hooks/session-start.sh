#!/usr/bin/env bash
# Kage SessionStart hook — injects full memory policy as a system message.
# Silent if Kage is not initialized in the current project.
# Mirrors the script written by `kage setup claude-code` (kernel.ts setupAgent);
# keep the two in sync when editing.
set -euo pipefail

CWD="$(cat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0

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

# Session continuity: append a compact "previously…" digest when prior session data exists.
if command -v kage >/dev/null 2>&1; then
  PREVIOUSLY="$(kage resume --project "$CWD" 2>/dev/null || true)"
  if [[ -n "$PREVIOUSLY" ]]; then
    POLICY="$POLICY

$PREVIOUSLY"
  fi
fi

KAGE_MSG="$POLICY" python3 -c "import json,os; print(json.dumps({'systemMessage': os.environ['KAGE_MSG']}))"
