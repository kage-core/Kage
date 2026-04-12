#!/usr/bin/env bash
# Kage v2 Bootstrap
# Drops the /kage-install skill into ~/.claude/skills/, then you run /kage-install in Claude Code.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Kage18/Kage/main/install.sh | bash

set -euo pipefail

REPO="https://raw.githubusercontent.com/Kage18/Kage/main"
SKILL_DIR="$HOME/.claude/skills/kage-install"

echo "Kage v2 — Bootstrap"
echo "-------------------"

# Check Claude Code is installed
if ! command -v claude &>/dev/null; then
  echo "Error: Claude Code not found. Install it first: https://claude.ai/code"
  exit 1
fi

# Create skill directory and download the skill file
mkdir -p "$SKILL_DIR"
curl -fsSL "$REPO/.claude/skills/kage-install/SKILL.md" -o "$SKILL_DIR/SKILL.md"

echo ""
echo "✓ /kage-install skill ready."
echo ""
echo "Next: open Claude Code and run:"
echo ""
echo "  /kage-install"
echo ""
echo "That's it. Claude will set up everything else."
