#!/usr/bin/env bash
# =============================================================================
# KAGE — Codex self-setup installer
# https://github.com/kage-core/Kage
# =============================================================================
#
# Goal:
#   A user should be able to ask Codex: "Set up Kage in this repo."
#   Codex can then run this script and perform the full local setup.
#
# One-command install from a target repo:
#   curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/codex-setup.sh | bash
#
# Local development:
#   ./codex-setup.sh --project /path/to/repo
#
# What this does:
#   1. Finds or installs Kage under ~/.kage/Kage.
#   2. Installs/builds the TypeScript MCP package.
#   3. Adds the Kage stdio MCP server to ~/.codex/config.toml.
#   4. Runs `kage init --project <repo>` to create repo-local memory/policy.
#
# =============================================================================

set -euo pipefail

REPO_URL="${KAGE_REPO_URL:-https://github.com/kage-core/Kage.git}"
INSTALL_DIR="${KAGE_HOME:-$HOME/.kage/Kage}"
PROJECT_DIR="$PWD"
SKIP_BUILD=0
NO_PROJECT_INIT=0
LOCAL_SOURCE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --project)
      PROJECT_DIR="${2:?--project requires a directory}"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="${2:?--install-dir requires a directory}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --no-project-init)
      NO_PROJECT_INIT=1
      shift
      ;;
    -h|--help)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

abs_path() {
  cd "$1" >/dev/null 2>&1
  pwd
}

PROJECT_DIR="$(abs_path "$PROJECT_DIR")"

echo "Kage Codex setup"
echo "----------------"
echo "Project: $PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required to run the Kage MCP server." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to install/build the Kage MCP package." >&2
  exit 1
fi

if [ -n "${KAGE_SOURCE_DIR:-}" ]; then
  KAGE_DIR="$(abs_path "$KAGE_SOURCE_DIR")"
  LOCAL_SOURCE=1
elif [ -f "./mcp/package.json" ] && grep -q "@kage-core/kage-graph-mcp" "./mcp/package.json"; then
  KAGE_DIR="$(pwd)"
  LOCAL_SOURCE=1
elif [ -f "$INSTALL_DIR/mcp/package.json" ]; then
  KAGE_DIR="$(abs_path "$INSTALL_DIR")"
else
  if ! command -v git >/dev/null 2>&1; then
    echo "Error: git is required to clone Kage. Install git or set KAGE_SOURCE_DIR." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$INSTALL_DIR")"
  echo "→ cloning Kage into $INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
  KAGE_DIR="$(abs_path "$INSTALL_DIR")"
fi

if [ "$LOCAL_SOURCE" -eq 0 ] && [ -d "$KAGE_DIR/.git" ]; then
  echo "→ updating Kage source"
  git -C "$KAGE_DIR" fetch --quiet origin || true
  current_branch="$(git -C "$KAGE_DIR" branch --show-current || true)"
  if [ "$current_branch" = "master" ] || [ "$current_branch" = "main" ]; then
    git -C "$KAGE_DIR" pull --ff-only --quiet origin "$current_branch" || true
  fi
fi

MCP_DIR="$KAGE_DIR/mcp"
CLI_JS="$MCP_DIR/dist/cli.js"
SERVER_JS="$MCP_DIR/dist/index.js"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "→ installing MCP dependencies"
  if [ -f "$MCP_DIR/package-lock.json" ]; then
    npm --prefix "$MCP_DIR" ci
  else
    npm --prefix "$MCP_DIR" install
  fi

  echo "→ building MCP server"
  npm --prefix "$MCP_DIR" run build
fi

if [ ! -f "$SERVER_JS" ] || [ ! -f "$CLI_JS" ]; then
  echo "Error: built Kage MCP files not found under $MCP_DIR/dist." >&2
  echo "Run: npm --prefix \"$MCP_DIR\" run build" >&2
  exit 1
fi

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CODEX_CONFIG="$CODEX_HOME/config.toml"
mkdir -p "$CODEX_HOME"

echo "→ configuring Codex MCP server"
KAGE_SERVER_JS="$SERVER_JS" CODEX_CONFIG="$CODEX_CONFIG" python3 - <<'PYTHON'
import os
from pathlib import Path

config_path = Path(os.environ["CODEX_CONFIG"]).expanduser()
server = os.environ["KAGE_SERVER_JS"]
block = f'''[mcp_servers.kage]
command = "node"
args = ["{server}"]
'''

text = config_path.read_text() if config_path.exists() else ""
lines = text.splitlines()
out = []
index = 0
replaced = False

while index < len(lines):
    line = lines[index]
    if line.strip() == "[mcp_servers.kage]":
        if out and out[-1].strip():
            out.append("")
        out.extend(block.rstrip().splitlines())
        replaced = True
        index += 1
        while index < len(lines):
            stripped = lines[index].strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                break
            index += 1
        continue
    out.append(line)
    index += 1

if not replaced:
    if out and out[-1].strip():
        out.append("")
    out.extend(block.rstrip().splitlines())

config_path.write_text("\n".join(out).rstrip() + "\n")
PYTHON

if [ "$NO_PROJECT_INIT" -eq 0 ]; then
  echo "→ initializing repo-local Kage memory"
  node "$CLI_JS" init --project "$PROJECT_DIR"
fi

echo ""
echo "✓ Kage is installed for Codex"
echo ""
echo "  MCP server: $SERVER_JS"
echo "  Codex config: $CODEX_CONFIG"
echo "  Project: $PROJECT_DIR"
echo ""
echo "Restart Codex so it loads the new kage MCP server."
echo "Then ask: 'Use Kage to recall this repo before working.'"
