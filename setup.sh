#!/usr/bin/env bash
# Kage Setup Script -- macOS
# Sets up the Kage Agent Memory system in the current repository.
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/Kage18/Kage/master/setup.sh)
# Or from a local clone: bash setup.sh

set -e

KAGE_REPO_URL="https://github.com/Kage18/Kage.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_REPO="${1:-$(pwd)}"

echo ""
echo "======================================"
echo "  Kage Agent Memory -- macOS Setup"
echo "======================================"
echo ""

# ── 1. API Key ──────────────────────────────────────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Enter your Anthropic API key (sk-ant-...):"
  read -r ANTHROPIC_API_KEY
  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY is required."
    exit 1
  fi
fi
echo "API key: set"

# ── 2. Python + pip ─────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required. Install from https://python.org"
  exit 1
fi
PYTHON=$(command -v python3)
echo "Python: $PYTHON"

echo "Installing Python dependencies..."
"$PYTHON" -m pip install -q -r "$SCRIPT_DIR/requirements.txt" --break-system-packages 2>/dev/null \
  || "$PYTHON" -m pip install -q -r "$SCRIPT_DIR/requirements.txt"
echo "Dependencies: installed"

# ── 3. Scaffold .agent_memory in target repo ────────────────────────────────
echo ""
echo "Target repository: $TARGET_REPO"
mkdir -p "$TARGET_REPO/.agent_memory/nodes"
mkdir -p "$TARGET_REPO/.agent_memory/pending"
mkdir -p "$TARGET_REPO/.agent_memory/deprecated"
mkdir -p "$TARGET_REPO/.agent_memory/scripts"
mkdir -p "$TARGET_REPO/.claude/agents"

# Copy scripts
cp "$SCRIPT_DIR/.agent_memory/scripts/distiller_tool.py"  "$TARGET_REPO/.agent_memory/scripts/"
cp "$SCRIPT_DIR/.agent_memory/scripts/distiller_hook.py"  "$TARGET_REPO/.agent_memory/scripts/"
cp "$SCRIPT_DIR/.agent_memory/scripts/session_watcher.py" "$TARGET_REPO/.agent_memory/scripts/"
cp "$SCRIPT_DIR/.agent_memory/scripts/post-commit.sh"     "$TARGET_REPO/.agent_memory/scripts/"
cp "$SCRIPT_DIR/.agent_memory/scripts/pii_scrubber.py"    "$TARGET_REPO/.agent_memory/scripts/"
cp "$SCRIPT_DIR/.agent_memory/scripts/llm_client.py"      "$TARGET_REPO/.agent_memory/scripts/"

# Copy Claude Code sub-agent
cp "$SCRIPT_DIR/.claude/agents/kage-memory.md" "$TARGET_REPO/.claude/agents/kage-memory.md"
echo "Installed: .claude/agents/kage-memory.md"

# Copy CLI and config to target repo root
cp "$SCRIPT_DIR/kage.py" "$TARGET_REPO/kage.py"
if [ ! -f "$TARGET_REPO/kage.config.json" ]; then
  cp "$SCRIPT_DIR/kage.config.json" "$TARGET_REPO/kage.config.json"
  echo "Created: kage.config.json (edit to change provider/model)"
fi

# Create root index if it doesn't exist
if [ ! -f "$TARGET_REPO/.agent_memory/index.md" ]; then
  cat > "$TARGET_REPO/.agent_memory/index.md" << 'EOF'
# Agent Memory: Root Index

Welcome to the shared team brain. This directory contains curated, Stack Overflow-style knowledge relevant to this repository.
**Agents:** Read the relevant domain indexes below before suggesting architectural changes or interacting with APIs/Frameworks.

## Domains

EOF
  echo "Created: .agent_memory/index.md"
fi

# ── 4. CLAUDE.md ─────────────────────────────────────────────────────────────
KAGE_CLAUDE_BLOCK='## Kage Agent Memory

Do NOT read .agent_memory/ files directly. Instead, use the kage-memory sub-agent:

  Before making architectural decisions, implementing a pattern, or working in a
  specific domain (auth, API, frontend, etc.), call the kage-memory sub-agent
  with a short description of what you are about to do. It will navigate the
  memory graph and return only the relevant rules and known issues.

  Example: use kage-memory to check for rules about authentication middleware

The sub-agent navigates the index hierarchy efficiently and returns only what
is relevant — keeping your context window clean.

Kage CLI (memory management):
  python3 kage.py save            # save a new learning interactively
  python3 kage.py review          # approve/reject AI-staged memories
  python3 kage.py prune           # deprecate stale nodes
  python3 kage.py check-links     # validate memory graph links
  python3 kage.py rebuild-indexes # fix index.md merge conflicts after git pull'

if [ ! -f "$TARGET_REPO/CLAUDE.md" ]; then
  echo "$KAGE_CLAUDE_BLOCK" > "$TARGET_REPO/CLAUDE.md"
  echo "Created: CLAUDE.md"
elif ! grep -q "Kage Agent Memory" "$TARGET_REPO/CLAUDE.md"; then
  { echo ""; echo "$KAGE_CLAUDE_BLOCK"; } >> "$TARGET_REPO/CLAUDE.md"
  echo "Updated: CLAUDE.md (Kage block appended)"
else
  echo "Skipped: CLAUDE.md already has Kage block"
fi

# ── 5. .cursorrules ──────────────────────────────────────────────────────────
if [ ! -f "$TARGET_REPO/.cursorrules" ]; then
  cat > "$TARGET_REPO/.cursorrules" << 'EOF'
# Kage Agent Memory
You MUST read `.agent_memory/index.md` before suggesting any architectural changes
or assuming framework behaviors. Follow any structural warnings found in memory nodes exactly.
EOF
  echo "Created: .cursorrules"
fi

# ── 6. Git post-commit hook ──────────────────────────────────────────────────
GIT_DIR="$TARGET_REPO/.git"
if [ -d "$GIT_DIR" ]; then
  HOOK_FILE="$GIT_DIR/hooks/post-commit"
  cat > "$HOOK_FILE" << HOOK
#!/bin/bash
export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
REPO_DIR=\$(git rev-parse --show-toplevel)
nohup python3 "\$REPO_DIR/.agent_memory/scripts/distiller_hook.py" \
  > "\$REPO_DIR/.agent_memory/distiller.log" 2>&1 &
HOOK
  chmod +x "$HOOK_FILE"
  echo "Installed: .git/hooks/post-commit"
fi

# ── 7. LaunchAgent (session watcher daemon) ──────────────────────────────────
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.kage.session-watcher.plist"
mkdir -p "$PLIST_DIR"

# Determine watcher location (use target repo's copy)
WATCHER_PATH="$TARGET_REPO/.agent_memory/scripts/session_watcher.py"
LOG_DIR="$TARGET_REPO/.agent_memory"

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kage.session-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON</string>
        <string>-u</string>
        <string>$WATCHER_PATH</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key>
        <string>$ANTHROPIC_API_KEY</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/watcher.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/watcher.error.log</string>
    <key>WorkingDirectory</key>
    <string>$TARGET_REPO</string>
</dict>
</plist>
EOF

# Reload daemon
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"
echo "Started: com.kage.session-watcher (LaunchAgent)"

# ── 7b. Git post-merge hook (auto-rebuild indexes after pulls) ────────────────
if [ -d "$GIT_DIR" ]; then
  MERGE_HOOK="$GIT_DIR/hooks/post-merge"
  cat > "$MERGE_HOOK" << HOOK
#!/bin/bash
REPO_DIR=\$(git rev-parse --show-toplevel)
python3 "\$REPO_DIR/kage.py" rebuild-indexes 2>/dev/null || true
python3 "\$REPO_DIR/kage.py" digest 2>/dev/null || true
HOOK
  chmod +x "$MERGE_HOOK"
  echo "Installed: .git/hooks/post-merge (auto-rebuilds indexes on git pull)"
fi

# ── 8. .gitignore entries ─────────────────────────────────────────────────────
GITIGNORE="$TARGET_REPO/.gitignore"
touch "$GITIGNORE"
for entry in ".last_distill_time" ".agent_memory/watcher.log" ".agent_memory/watcher.error.log" ".agent_memory/distiller.log"; do
  if ! grep -qF "$entry" "$GITIGNORE"; then
    echo "$entry" >> "$GITIGNORE"
  fi
done
echo "Updated: .gitignore"

# ── 9. Generate initial digest ───────────────────────────────────────────────
"$PYTHON" "$TARGET_REPO/kage.py" digest 2>/dev/null && echo "Generated: .agent_memory/SUMMARY.md" || true

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  Kage setup complete!"
echo "======================================"
echo ""
echo "  Memory index  : $TARGET_REPO/.agent_memory/index.md"
echo "  Config        : $TARGET_REPO/kage.config.json"
echo "  CLI           : python3 $TARGET_REPO/kage.py <command>"
echo "  Watcher log   : $LOG_DIR/watcher.log"
echo "  Post-commit   : $GIT_DIR/hooks/post-commit"
echo ""
echo "  Sessions are distilled every 5 minutes."
echo "  Memories go to .agent_memory/pending/ for review."
echo "  Run: python3 kage.py review  -- to approve them."
echo ""
echo "  To change LLM provider, edit kage.config.json:"
echo "    provider: anthropic | openai | ollama"
echo ""
echo "  Conflict resolution: if index.md has merge conflicts after git pull,"
echo "  run: python3 kage.py rebuild-indexes"
echo ""
