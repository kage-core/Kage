#!/usr/bin/env bash
# =============================================================================
# KAGE — Agent Memory System for Claude Code
# https://github.com/kage-core/Kage
# =============================================================================
#
# USAGE
#
#   As a shell command (recommended):
#     curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/install.sh | bash
#
#   As a Claude Code instruction:
#     Paste the URL above and say "install Kage". Claude reads the STEPS below
#     and executes them using its native Write + Bash tools. No curl needed.
#
# =============================================================================
#
# STEPS — Claude Code: read these and execute each one with your tools.
#
# STEP 1: Check prerequisites
#   Run: claude --version
#   If Claude Code is not installed, tell the user and stop.
#
# STEP 2: Create directories
#   mkdir -p ~/.claude/agents
#   mkdir -p ~/.claude/skills/kage
#   mkdir -p ~/.claude/skills/kage-install
#   mkdir -p ~/.claude/kage/hooks
#   mkdir -p ~/.agent_memory/nodes
#   mkdir -p ~/.agent_memory/pending
#   mkdir -p ~/.agent_memory/deprecated
#
# STEP 3: Download agent files from kage-core/Kage/master
#   .claude/agents/kage-distiller.md  → ~/.claude/agents/kage-distiller.md
#   .claude/agents/kage-memory.md     → ~/.claude/agents/kage-memory.md
#   .claude/agents/kage-graph.md      → ~/.claude/agents/kage-graph.md
#   .claude/agents/kage-indexer.md    → ~/.claude/agents/kage-indexer.md
#
# STEP 4: Download hook scripts and make executable
#   .claude/kage/hooks/stop.sh               → ~/.claude/kage/hooks/stop.sh
#   .claude/kage/hooks/session-start.sh      → ~/.claude/kage/hooks/session-start.sh
#   .claude/kage/hooks/post-tool-use.sh      → ~/.claude/kage/hooks/post-tool-use.sh
#   .claude/kage/hooks/user-prompt-submit.sh → ~/.claude/kage/hooks/user-prompt-submit.sh
#   chmod +x all four scripts
#
# STEP 5: Download skill files
#   .claude/skills/kage/SKILL.md         → ~/.claude/skills/kage/SKILL.md
#   .claude/skills/kage-install/SKILL.md → ~/.claude/skills/kage-install/SKILL.md
#
# STEP 6: Patch ~/.claude/settings.json (non-destructively, keep existing hooks)
#   Add the following hooks:
#     Stop            → bash ~/.claude/kage/hooks/stop.sh               (timeout: 15)
#     SessionStart    → bash ~/.claude/kage/hooks/session-start.sh      (timeout: 10)
#     PostToolUse     → bash ~/.claude/kage/hooks/post-tool-use.sh      (timeout: 5)
#     UserPromptSubmit → bash ~/.claude/kage/hooks/user-prompt-submit.sh (timeout: 5)
#   Use Python json module to read/write safely — never bash string interpolation on JSON.
#
# STEP 7: Initialize personal memory at ~/.agent_memory/
#   Write ~/.agent_memory/index.md if it doesn't exist:
#     # Personal Memory Index
#     Cross-project learnings. Project memory lives in each repo's .agent_memory/.
#     ## Domains
#   Write ~/.agent_memory/SUMMARY.md if it doesn't exist:
#     # Personal Memory Summary
#     *No nodes yet. Memory captured automatically during sessions.*
#
# STEP 8: Project setup (only if current directory is a git repo)
#   Check: git rev-parse --git-dir 2>/dev/null
#   If yes:
#     mkdir -p .agent_memory/{nodes,pending,deprecated}
#     Write .agent_memory/index.md (if missing): # Project Memory Index\n## Domains
#     Write .agent_memory/SUMMARY.md (if missing): # Project Memory Summary\n*No nodes yet.*
#     Write AGENTS.md Kage policy block (if missing) so Codex uses Kage automatically
#     Append ".agent_memory/pending/" to .gitignore (if not already present)
#     Append Kage block to CLAUDE.md (or create it):
#       ## Kage Memory
#       - Invoke kage-memory before implementing auth, API patterns, DB operations
#       - Invoke kage-distiller immediately when you fix a bug or make a design decision
#       - Do NOT read .agent_memory/ files directly — delegate to kage-memory
#       - Run /kage review to approve pending nodes
#
# STEP 9: Offer to index the repo
#   If in a git repo, ask: "Index this repo now so Claude knows the codebase? (y/n)"
#   If yes: invoke the kage-indexer sub-agent with project_dir=<CWD> force=false
#
# STEP 10: Confirm success
#   Print:
#     ✓ Kage installed!
#     Agents:  kage-distiller, kage-memory, kage-graph, kage-indexer
#     Hooks:   Stop · SessionStart · PostToolUse · UserPromptSubmit
#     Skills:  /kage · /kage-install
#     Memory:  ~/.agent_memory/  +  .agent_memory/ (this repo)
#     Next: memory is active immediately. Run /kage index to index this codebase.
#
# =============================================================================

set -euo pipefail

REPO="https://raw.githubusercontent.com/kage-core/Kage/master"

echo "Kage — Installing"
echo "-----------------"

# STEP 1 — Prerequisites
if ! command -v claude &>/dev/null; then
  echo "Error: Claude Code not found. Install from https://claude.ai/code"
  exit 1
fi

# STEP 2 — Directories
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/skills/kage
mkdir -p ~/.claude/skills/kage-install
mkdir -p ~/.claude/kage/hooks
mkdir -p ~/.agent_memory/nodes
mkdir -p ~/.agent_memory/pending
mkdir -p ~/.agent_memory/deprecated

# STEP 3 — Agents
echo "→ agents"
curl -fsSL "$REPO/.claude/agents/kage-distiller.md"       -o ~/.claude/agents/kage-distiller.md
curl -fsSL "$REPO/.claude/agents/kage-memory.md"          -o ~/.claude/agents/kage-memory.md
curl -fsSL "$REPO/.claude/agents/kage-graph.md"           -o ~/.claude/agents/kage-graph.md
curl -fsSL "$REPO/.claude/agents/kage-indexer.md"         -o ~/.claude/agents/kage-indexer.md

# STEP 4 — Hooks
echo "→ hooks"
curl -fsSL "$REPO/.claude/kage/hooks/stop.sh"               -o ~/.claude/kage/hooks/stop.sh
curl -fsSL "$REPO/.claude/kage/hooks/session-start.sh"      -o ~/.claude/kage/hooks/session-start.sh
curl -fsSL "$REPO/.claude/kage/hooks/post-tool-use.sh"      -o ~/.claude/kage/hooks/post-tool-use.sh
curl -fsSL "$REPO/.claude/kage/hooks/user-prompt-submit.sh" -o ~/.claude/kage/hooks/user-prompt-submit.sh
chmod +x ~/.claude/kage/hooks/stop.sh
chmod +x ~/.claude/kage/hooks/session-start.sh
chmod +x ~/.claude/kage/hooks/post-tool-use.sh
chmod +x ~/.claude/kage/hooks/user-prompt-submit.sh

# STEP 5 — Skills
echo "→ skills"
curl -fsSL "$REPO/.claude/skills/kage/SKILL.md"          -o ~/.claude/skills/kage/SKILL.md
curl -fsSL "$REPO/.claude/skills/kage-install/SKILL.md"  -o ~/.claude/skills/kage-install/SKILL.md

# STEP 6 — Patch settings.json
echo "→ settings.json"
python3 - <<'PYTHON'
import json, os

path = os.path.expanduser("~/.claude/settings.json")
try:
    with open(path) as f:
        s = json.load(f)
except FileNotFoundError:
    s = {}

hooks = s.setdefault("hooks", {})

for event, command, timeout in [
    ("Stop",             "bash ~/.claude/kage/hooks/stop.sh",               15),
    ("SessionStart",     "bash ~/.claude/kage/hooks/session-start.sh",      10),
    ("PostToolUse",      "bash ~/.claude/kage/hooks/post-tool-use.sh",       5),
    ("UserPromptSubmit", "bash ~/.claude/kage/hooks/user-prompt-submit.sh",  5),
]:
    bucket = hooks.setdefault(event, [{"matcher": "", "hooks": []}])
    existing = bucket[0]["hooks"]
    if not any(h.get("command") == command for h in existing):
        existing.append({"type": "command", "command": command, "timeout": timeout})

with open(path, "w") as f:
    json.dump(s, f, indent=2)
PYTHON

# STEP 7 — Personal memory
if [ ! -f ~/.agent_memory/index.md ]; then
  cat > ~/.agent_memory/index.md << 'EOF'
# Personal Memory Index

Cross-project learnings that apply across multiple repos.
Project-specific knowledge lives in each project's `.agent_memory/`.

## Domains

<!-- Domain indexes added here as nodes are approved -->
EOF
fi

if [ ! -f ~/.agent_memory/SUMMARY.md ]; then
  printf '# Personal Memory Summary\n\n*No nodes yet. Memory captured automatically during sessions.*\n' \
    > ~/.agent_memory/SUMMARY.md
fi

# STEP 8 — Project setup
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "→ project memory"
  mkdir -p .agent_memory/nodes .agent_memory/packets .agent_memory/pending .agent_memory/deprecated .agent_memory/observations .agent_memory/indexes .agent_memory/graph .agent_memory/code_graph

  [ -f .agent_memory/index.md ] || printf '# Project Memory Index\n\n## Domains\n\n<!-- Added as nodes are approved -->\n' > .agent_memory/index.md
  [ -f .agent_memory/SUMMARY.md ] || printf '# Project Memory Summary\n\n*No nodes yet. Memory captured automatically during sessions.*\n' > .agent_memory/SUMMARY.md

  if [ -f .gitignore ]; then
    grep -q ".agent_memory/pending/" .gitignore || echo ".agent_memory/pending/" >> .gitignore
  else
    echo ".agent_memory/pending/" > .gitignore
  fi

  KAGE_BLOCK="## Kage Memory

- Use Kage MCP tools or \`kage recall\` before repo-specific implementation work
- Claude hooks call \`kage observe\` and \`kage distill\` to create pending JSON packet candidates
- Capture durable learnings with \`kage_learn\` or \`kage_capture\`; never approve or publish automatically
- Run \`kage review\` to approve pending packets"

  if [ -f CLAUDE.md ]; then
    grep -q "Kage Memory" CLAUDE.md || printf '\n%s\n' "$KAGE_BLOCK" >> CLAUDE.md
  else
    printf '%s\n' "$KAGE_BLOCK" > CLAUDE.md
  fi

  AGENTS_POLICY='<!-- KAGE_MEMORY_POLICY_V1 -->
# Kage Memory Harness

This repo uses Kage as an automatic memory harness for coding agents.

## Automatic Recall

Before making code changes, answering repo-specific implementation questions, debugging failures, or proposing architecture:

1. Call `kage_validate` for this repo.
2. Call `kage_recall` with the user task as the query.
3. Call `kage_graph` with the user task as the query.
4. Use returned memory only when it is relevant, source-backed, and not stale.
5. Prefer repo memory over public/community memory when they conflict.

Do this without waiting for the user to ask. Kage should feel like ambient repo memory, not a manual search command.

## Automatic Capture

When you learn something reusable, create a pending memory packet with `kage_learn` or `kage_capture`.
When lifecycle hooks are available, use `kage observe` for session/tool/file/test events and `kage distill` at session end.

## End-Of-Task Proposal

Before finishing a task that changed files, call `kage_propose_from_diff`.

This writes a branch review summary only. It does not create recallable memory.

## Safety

- Never approve, publish, or promote memory automatically.
- Never auto-install recommended MCPs, skills, or registry assets.
- Do not store secrets, private credentials, customer data, raw tokens, or private URLs in memory.
<!-- END_KAGE_MEMORY_POLICY_V1 -->'

  if [ -f AGENTS.md ]; then
    grep -q "KAGE_MEMORY_POLICY_V1" AGENTS.md || printf '\n%s\n' "$AGENTS_POLICY" >> AGENTS.md
  else
    printf '%s\n' "$AGENTS_POLICY" > AGENTS.md
  fi
fi

# Save installed version
curl -fsSL "$REPO/VERSION" -o ~/.claude/kage/version 2>/dev/null || true
date +%s > ~/.claude/kage/last_update_check

echo ""
echo "✓ Kage installed!"
echo ""
echo "  Agents:  kage-distiller · kage-memory · kage-graph · kage-indexer"
echo "  Hooks:   Stop · SessionStart · PostToolUse · UserPromptSubmit"
echo "  Skills:  /kage · /kage-install"
echo "  Memory:  ~/.agent_memory/  +  .agent_memory/ JSON packets (this repo)"
echo "  Version: $(cat ~/.claude/kage/version 2>/dev/null | tr -d '\n')"
echo ""
echo "Memory is active immediately. Run kage index --project . to index this codebase."
