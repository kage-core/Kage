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
# Resolve the kage CLI: repo-local, PATH, baked install path, then the package runner.
export PATH="$CWD/node_modules/.bin:$PATH"
if command -v kage >/dev/null 2>&1; then
  :
elif [[ -f "/Users/kushaljain/code/Kage/mcp/dist/cli.js" ]] && command -v node >/dev/null 2>&1; then
  kage() { node "/Users/kushaljain/code/Kage/mcp/dist/cli.js" "$@"; }
else
  kage() { npx -y --package=@kage-core/kage-graph-mcp kage "$@"; }
fi
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
new_text = ""
old_text = ""
if isinstance(tool_input, dict):
    path = first(tool_input.get("file_path"), tool_input.get("path"), tool_input.get("notebook_path"))
    command = first(tool_input.get("command"))
    new_text = first(tool_input.get("new_string"), tool_input.get("content"), tool_input.get("new_source"))
    old_text = first(tool_input.get("old_string"))
    if not new_text and isinstance(tool_input.get("edits"), list):
        new_text = " ".join(e.get("new_string") or "" for e in tool_input["edits"] if isinstance(e, dict))[:1200]

def prose(value, limit=1200, tail=False):
    # Plain-text extraction. Serialized dicts read as noise to the signal
    # scorer (jsonNoiseText), so pull the human-readable field instead of
    # json.dumps-ing the payload — otherwise every tool observation scores 0.
    if isinstance(value, dict):
        for key in ("stdout", "stderr", "output", "error", "message", "content", "text"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                flat = " ".join(candidate.split())
                return flat[-limit:] if tail else flat[:limit]
        flat = " ".join(str(v) for v in value.values() if isinstance(v, str) and v.strip())
        flat = " ".join(flat.split())
        return flat[:limit]
    if value is None:
        return ""
    flat = " ".join(str(value).split())
    return flat[-limit:] if tail else flat[:limit]

if event_name == "UserPromptSubmit":
    payload = {"type": "user_prompt", "text": prompt, "summary": compact(prompt, 240)}
elif event_name == "PostToolUseFailure":
    err = prose(tool_response or d, 900, tail=True)
    line = (command or tool or "tool") + " failed: " + err
    payload = {"type": "command_result" if command else "tool_result", "tool": tool, "path": path, "command": command, "summary": line[:320], "text": line}
elif event_name == "PostToolUse":
    if path and (new_text or old_text):
        # The edit content is where fixes and conventions live; tool_response
        # only says "success" and must never displace it.
        change = ("changed " + path + ": " + old_text[:160] + " -> " + new_text[:480]) if old_text else ("wrote " + path + ": " + new_text[:600])
        payload = {"type": "file_change", "tool": tool, "path": path, "summary": change[:320], "text": change}
    elif command:
        out = prose(tool_response, 900, tail=True)
        line = command + (": " + out if out else " completed")
        payload = {"type": "command_result", "tool": tool, "path": path, "command": command, "summary": line[:320], "text": line}
    else:
        body = prose(tool_response) or prose(tool_input)
        payload = {"type": "file_change" if path else "tool_use", "tool": tool, "path": path, "command": command, "summary": ((tool + ": ") if tool else "") + body[:300], "text": body}
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
  # --auto is load-bearing: it is the gated path (signal filter, dedupe, pending
  # review). Without it, distill writes unfiltered packets stamped approved.
  kage distill --auto --project "$CWD" --session "$SESSION" --json >/dev/null 2>&1 || true
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
