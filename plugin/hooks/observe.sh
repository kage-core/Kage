#!/usr/bin/env bash
# Kage Observe hook — captures durable Claude Code session signals and recalls repo memory.
# Silent if Kage is not initialized in the current project.
set -euo pipefail

PAYLOAD="$(cat || true)"
CWD="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print(d.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or "")
' 2>/dev/null || echo "")"

[[ -d "$CWD/.agent_memory" ]] || exit 0
# Resolve a repo-local install too, so hooks work without a global kage on PATH.
export PATH="$CWD/node_modules/.bin:$PATH"
command -v kage >/dev/null 2>&1 || exit 0

EVENT="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print(d.get("hook_event_name") or d.get("event") or "")
' 2>/dev/null || echo "")"

SESSION="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print(d.get("session_id") or d.get("sessionId") or "default")
' 2>/dev/null || echo "default")"

OBSERVATION="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}

def first(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""

def compact(value, limit=1200):
    if isinstance(value, (dict, list)):
        text = json.dumps(value, sort_keys=True)
    elif value is None:
        text = ""
    else:
        text = str(value)
    text = " ".join(text.split())
    return text[:limit]

event_name = first(d.get("hook_event_name"), d.get("event"))
session_id = first(d.get("session_id"), d.get("sessionId"), "default")
agent = first(d.get("agent"), "claude-code")
tool = first(d.get("tool_name"), d.get("toolName"))
tool_input = d.get("tool_input") or d.get("toolInput") or {}
tool_response = d.get("tool_response") or d.get("toolResponse") or d.get("result") or {}
prompt = first(d.get("prompt"), d.get("user_prompt"), d.get("message"))
path = ""
command = ""
if isinstance(tool_input, dict):
    path = first(tool_input.get("file_path"), tool_input.get("path"), tool_input.get("notebook_path"))
    command = first(tool_input.get("command"))

if event_name == "UserPromptSubmit":
    payload = {"type": "user_prompt", "text": prompt, "summary": compact(prompt, 240)}
elif event_name == "PostToolUseFailure":
    payload = {"type": "command_result" if command else "tool_result", "tool": tool, "path": path, "command": command, "summary": "Tool failed: " + compact(tool_response or d, 320), "text": compact(tool_response or d)}
elif event_name == "PostToolUse":
    obs_type = "file_change" if path else ("command_result" if command else "tool_use")
    payload = {"type": obs_type, "tool": tool, "path": path, "command": command, "summary": compact(tool_response or tool_input, 320), "text": compact(tool_response or tool_input)}
elif event_name == "PreCompact":
    payload = {"type": "session_end", "summary": "Claude Code is compacting context; distill durable observations before compaction."}
elif event_name == "SessionEnd":
    payload = {"type": "session_end", "summary": "Claude Code session ended; distill durable observations for teammate handoff."}
elif event_name == "SubagentStop":
    payload = {"type": "session_end", "summary": "Subagent finished; distill durable observations from the subagent run."}
elif event_name == "PreToolUse":
    payload = {"type": "tool_use", "tool": tool, "path": path, "command": command, "summary": "About to run: " + compact(command or tool or d, 200)}
else:
    payload = {"type": "tool_use", "tool": tool, "path": path, "command": command, "summary": compact(d, 320), "text": compact(d)}

payload.update({"session_id": session_id, "agent": agent})
print(json.dumps(payload, separators=(",", ":")))
' 2>/dev/null || echo "")"

if [[ -n "$OBSERVATION" ]]; then
  kage observe --project "$CWD" --event "$OBSERVATION" --json >/dev/null 2>&1 || true
fi

if [[ "$EVENT" == "PreCompact" || "$EVENT" == "SessionEnd" || "$EVENT" == "SubagentStop" ]]; then
  kage distill --project "$CWD" --session "$SESSION" --json >/dev/null 2>&1 || true
fi

if [[ "$EVENT" == "UserPromptSubmit" ]]; then
  QUERY="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
print((d.get("prompt") or d.get("user_prompt") or d.get("message") or "")[:1000])
' 2>/dev/null || echo "")"
  if [[ -n "$QUERY" ]]; then
    CONTEXT="$(kage prompt-context --project "$CWD" --query "$QUERY" 2>/dev/null || true)"
    if [[ -n "$CONTEXT" ]]; then
      KAGE_CONTEXT="$CONTEXT" python3 -c 'import json, os
print(json.dumps({"additionalContext": os.environ.get("KAGE_CONTEXT", "")}))
'
    fi
  fi
fi

exit 0
