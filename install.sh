#!/usr/bin/env bash
# Kage Bootstrap
# Drops the /kage-install skill into ~/.claude/skills/, then you run /kage-install in Claude Code.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/install.sh | bash

set -euo pipefail

REPO="https://raw.githubusercontent.com/kage-core/Kage/master"
SKILL_DIR="$HOME/.claude/skills/kage-install"

echo "Kage — Bootstrap"
echo "----------------"

# Check Claude Code is installed
if ! command -v claude &>/dev/null; then
  echo "Error: Claude Code not found. Install it first: https://claude.ai/code"
  exit 1
fi

# Create skill directory and download the skill file
mkdir -p "$SKILL_DIR"
curl -fsSL "$REPO/.claude/skills/kage-install/SKILL.md" -o "$SKILL_DIR/SKILL.md"

# Pre-download the kage-indexer agent so /kage-install can reference it
mkdir -p "$HOME/.claude/agents"
curl -fsSL "$REPO/.claude/agents/kage-indexer.md" -o "$HOME/.claude/agents/kage-indexer.md"

echo ""
echo "✓ /kage-install skill ready."
echo ""
echo "Next: open Claude Code and run:"
echo ""
echo "  /kage-install"
echo ""
echo "That's it. Claude will set up everything else."
