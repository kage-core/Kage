#!/usr/bin/env bash
set -euo pipefail

# Modern Kage installer for Claude Code.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/install.sh | bash
#   ./install.sh --project /path/to/repo
#
# For Codex, prefer:
#   npm install -g @kage-core/kage-graph-mcp
#   kage setup codex --project . --write
#   kage init --project .

PROJECT_DIR="$(pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_DIR="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]]; then
  echo "Project directory does not exist: $PROJECT_DIR" >&2
  exit 2
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js first: https://nodejs.org/" >&2
  exit 1
fi

echo "Installing Kage CLI and MCP server..."
npm install -g @kage-core/kage-graph-mcp

echo "Configuring Claude Code MCP..."
kage setup claude-code --project "$PROJECT_DIR" --write

echo "Initializing repo memory..."
kage init --project "$PROJECT_DIR"

cat <<EOF

Kage is installed for Claude Code.

Next steps:
  1. Restart Claude Code.
  2. Ask a normal repo question, for example:
     "How do I run tests in this repo?"

Kage will recall approved repo memory, query the code graph, and propose
pending memory automatically through the installed repo policy.
EOF
