#!/usr/bin/env bash
# Kage Cursor hook — honest capability wiring for Phase D Task 6.
#
# Cursor invokes this script for the events declared in .cursor/hooks.json
# (sessionStart, beforeSubmitPrompt, afterFileEdit, stop). See
# https://cursor.com/blog/agent-best-practices for the hooks.json contract.
#
# HONESTY CONTRACT:
#   - sessionStart MAY print a Kage context block, but that only counts as
#     "automatic_session" injection after a transcript-based certification proves
#     the configured Cursor version actually delivers it (certifySurface in
#     mcp/vnext/adapters/capability-matrix.ts). Installed config alone never
#     earns the automatic label.
#   - beforeSubmitPrompt records the task event ONLY. Cursor's documented hook
#     output does not reliably support returning per-prompt context, so this
#     hook must not claim prompt-specific injection.
#   - The script fails open: a missing kage binary or runtime never blocks the
#     agent (exit 0), it just skips capture/injection for that event.
set -u

EVENT="${1:-unknown}"

# Resolve the kage CLI without ever hard-failing the agent.
kage_bin() {
  if command -v kage >/dev/null 2>&1; then
    echo "kage"
  elif [ -n "${KAGE_CLI:-}" ] && [ -x "${KAGE_CLI}" ]; then
    echo "${KAGE_CLI}"
  else
    echo ""
  fi
}

KAGE="$(kage_bin)"
[ -z "${KAGE}" ] && exit 0

PROJECT_DIR="${CURSOR_PROJECT_DIR:-$(pwd)}"

case "${EVENT}" in
  sessionStart)
    # Session-level context only. Certification (not this script) decides whether
    # the emitted block counts as automatic injection.
    "${KAGE}" context --project "${PROJECT_DIR}" --surface cursor --session 2>/dev/null || exit 0
    ;;
  beforeSubmitPrompt)
    # Record the task event; do NOT print context (no certified per-prompt path).
    "${KAGE}" observe --project "${PROJECT_DIR}" --surface cursor --event prompt >/dev/null 2>&1 || exit 0
    ;;
  afterFileEdit)
    "${KAGE}" observe --project "${PROJECT_DIR}" --surface cursor --event edit >/dev/null 2>&1 || exit 0
    ;;
  stop)
    "${KAGE}" observe --project "${PROJECT_DIR}" --surface cursor --event stop >/dev/null 2>&1 || exit 0
    ;;
  *)
    exit 0
    ;;
esac

exit 0
