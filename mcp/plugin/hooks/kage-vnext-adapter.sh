#!/usr/bin/env bash
# Kage vNext adapter hook — the single fail-open bridge from Claude Code hooks to the local Kage
# runtime (kaged). Posts protocol-v1 evidence to 127.0.0.1 and injects the runtime's context block.
# Silent, and exits 0, whenever the runtime is absent, unreachable, slow, or unhappy.
# kage-hooks-v4
set -uo pipefail

PAYLOAD="$(cat || true)"

# Route before doing anything expensive. PreToolUse fires on EVERY tool call — Bash, Grep,
# TodoWrite — and most of them map to no protocol event, so an unmapped hook must cost one python
# start-up and nothing else: no git, no probe, no network.
ROUTE="$(PAYLOAD="$PAYLOAD" python3 -c 'import json, os
try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
if not isinstance(d, dict):
    d = {}

def line(value, limit):
    if not isinstance(value, str):
        return ""
    return value.replace("\r", " ").replace("\n", " ")[:limit]

print(line(d.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or "", 4096))
print(line(d.get("hook_event_name") or d.get("event") or "", 64))
print(line(d.get("tool_name") or d.get("toolName") or "", 128))
' 2>/dev/null || echo "")"
CWD=""
HOOK_EVENT=""
TOOL=""
{ read -r CWD; read -r HOOK_EVENT; read -r TOOL; } <<< "$ROUTE"

[[ -n "$CWD" && -d "$CWD/.agent_memory/daemon/vnext" ]] || exit 0
case "$HOOK_EVENT" in
  SessionStart|UserPromptSubmit|PostToolUse|PostToolUseFailure|SessionEnd) ;;
  PreToolUse)
    case "$TOOL" in
      Read|NotebookRead|Edit|Write|MultiEdit|NotebookEdit) ;;
      *) exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac

RUNTIME_DIR="$CWD/.agent_memory/daemon/vnext"
# The runtime is trusted only while it is verifiably ours and verifiably alive. A status file left
# behind by a killed daemon is not a runtime: the port it names may since have been taken by any
# other local process, and this hook would hand that process the raw prompt and the bearer token.
PROBE="$(KAGE_VNEXT_DIR="$RUNTIME_DIR" python3 -c 'import json, os, stat, subprocess

def dead():
    raise SystemExit(1)

directory = os.environ.get("KAGE_VNEXT_DIR") or ""
status_path = os.path.join(directory, "status.json")
token_path = os.path.join(directory, "token")
try:
    uid = os.getuid()
    entry = os.lstat(directory)
    if not stat.S_ISDIR(entry.st_mode) or entry.st_uid != uid or (entry.st_mode & 0o077):
        dead()
    for path in (status_path, token_path):
        entry = os.lstat(path)
        if not stat.S_ISREG(entry.st_mode) or entry.st_uid != uid or (entry.st_mode & 0o077):
            dead()
    with open(status_path, "r", encoding="utf-8") as handle:
        status = json.load(handle)
    with open(token_path, "r", encoding="utf-8") as handle:
        token = handle.read().strip()
except Exception:
    dead()
if not isinstance(status, dict) or not token:
    dead()
host, port, mode, pid = status.get("host"), status.get("port"), status.get("mode"), status.get("pid")
if host != "127.0.0.1" or mode not in ("audit", "assist"):
    dead()
if not isinstance(port, int) or isinstance(port, bool) or not 0 < port < 65536:
    dead()
if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
    dead()
try:
    os.kill(pid, 0)
except Exception:
    dead()
try:
    proc = subprocess.run(["ps", "-p", str(pid), "-o", "comm="], capture_output=True, timeout=2)
    comm = os.path.basename(proc.stdout.decode("utf-8", "replace").strip()).lower()
except Exception:
    dead()
if "node" not in comm:
    dead()
print("http://127.0.0.1:%d %s" % (port, mode))
' 2>/dev/null || echo "")"
[[ -n "$PROBE" ]] || exit 0
CONNECTION=""
MODE=""
read -r CONNECTION MODE <<< "$PROBE"
[[ -n "$CONNECTION" && -n "$MODE" ]] || exit 0

TOKEN="$(tr -d '\r\n' < "$RUNTIME_DIR/token" 2>/dev/null || echo "")"
[[ -n "$TOKEN" ]] || exit 0

WORK="$(mktemp -d 2>/dev/null || echo "")"
[[ -n "$WORK" ]] || exit 0
# EXIT alone is not enough: a hook killed mid-run would leave a temp file holding the raw prompt.
trap 'rm -rf "$WORK"' EXIT INT TERM HUP

# Repository identity follows the repo, not the checkout: the remote when there is one, else root.
REMOTE="$(git -C "$CWD" config --get remote.origin.url 2>/dev/null || echo "")"
BRANCH="$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
COMMIT="$(git -C "$CWD" rev-parse HEAD 2>/dev/null || echo "")"

# One python pass turns the hook payload into protocol-v1 request bodies. It writes them to files
# inside the 0700 temp dir rather than printing them: the raw prompt does live in PAYLOAD and is
# handed to this child through the environment, but it is never printed, logged, or passed as an
# argument, and it leaves this machine only over the authenticated loopback socket.
PAYLOAD="$PAYLOAD" KAGE_ROOT="$CWD" KAGE_REMOTE="$REMOTE" KAGE_BRANCH="$BRANCH" KAGE_COMMIT="$COMMIT" KAGE_MODE="$MODE" KAGE_WORK="$WORK" python3 -c 'import hashlib, json, os, uuid
from datetime import datetime, timezone

MAX_TEXT = 4000
MAX_PATH = 1024
EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")
READ_TOOLS = ("Read", "NotebookRead")

try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    d = {}
if not isinstance(d, dict):
    d = {}

root = os.environ.get("KAGE_ROOT") or ""
remote = (os.environ.get("KAGE_REMOTE") or "").strip() or None
branch = (os.environ.get("KAGE_BRANCH") or "").strip() or None
commit = (os.environ.get("KAGE_COMMIT") or "").strip() or None
mode = os.environ.get("KAGE_MODE") or ""
work = os.environ["KAGE_WORK"]

def text(value, limit=MAX_TEXT):
    return value[:limit] if isinstance(value, str) else ""

def sha(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

# Memory is repo-scoped, and a path is team_metadata — the shareable tier. A Read of ~/.ssh/config,
# or of a different employer checkout, must never put that path into a shareable event.
def in_repo(path):
    if not path or not root:
        return ""
    absolute = path if os.path.isabs(path) else os.path.join(root, path)
    real = os.path.realpath(absolute)
    base = os.path.realpath(root)
    if real == base or real.startswith(base + os.sep):
        return path
    return ""

repo_id = "repo_" + sha(remote or root)[:32]
session_id = text(d.get("session_id") or d.get("sessionId"), 256).strip() or "default"
task_id = "task_" + sha(repo_id + "|" + session_id)[:32]
repository = {"repo_id": repo_id, "root": root, "remote": remote, "branch": branch, "commit": commit, "worktree": root}
task = {"task_id": task_id, "session_id": session_id, "user_id": None, "agent_surface": "claude-code"}

hook = text(d.get("hook_event_name") or d.get("event"), 64)
tool = text(d.get("tool_name") or d.get("toolName"), 128)
tool_input = d.get("tool_input") or d.get("toolInput") or {}
if not isinstance(tool_input, dict):
    tool_input = {}
path = in_repo(text(tool_input.get("file_path") or tool_input.get("path") or tool_input.get("notebook_path"), MAX_PATH))
prompt = text(d.get("prompt") or d.get("user_prompt") or d.get("message"))

# Claude Code has no PostToolUseFailure event: a failed tool call arrives as an ordinary
# PostToolUse whose tool_response carries the error. Only the verdict is recorded, never the text.
response = d.get("tool_response") or d.get("toolResponse")
outcome = "ok"
if hook == "PostToolUseFailure":
    outcome = "error"
elif isinstance(response, dict):
    if response.get("is_error") is True or response.get("isError") is True or response.get("success") is False:
        outcome = "error"
    elif response.get("error"):
        outcome = "error"

# Protocol v1 is frozen: a hook with no protocol event type is skipped, never coerced into one.
if hook == "SessionStart":
    event_type = "session_start"
elif hook == "UserPromptSubmit":
    event_type = "prompt"
elif hook == "PreToolUse" and tool in READ_TOOLS:
    event_type = "file_open"
elif hook == "PreToolUse" and tool in EDIT_TOOLS:
    event_type = "file_edit"
elif hook in ("PostToolUse", "PostToolUseFailure"):
    event_type = "tool_result"
elif hook == "SessionEnd":
    event_type = "session_end"
else:
    event_type = None

# A file event with no in-repo path, or a prompt with no text, is not evidence — it is noise.
if event_type in ("file_open", "file_edit") and not path:
    event_type = None
if event_type == "prompt" and not prompt:
    event_type = None

# Only paths and tool names are team_metadata. The prompt and tool outcomes stay local_raw, and
# file content (old_string / new_string / content) never enters an event at all.
if event_type == "prompt":
    body, privacy = {"text": prompt}, "local_raw"
elif event_type == "tool_result":
    body, privacy = {"tool": tool, "path": path, "outcome": outcome}, "local_raw"
elif event_type in ("file_open", "file_edit"):
    body, privacy = {"tool": tool, "path": path}, "team_metadata"
elif event_type == "session_start":
    body, privacy = {"agent_surface": "claude-code"}, "team_metadata"
elif event_type == "session_end":
    body, privacy = {"agent_surface": "claude-code", "reason": text(d.get("reason"), 128)}, "team_metadata"
else:
    body, privacy = None, None

def write(name, value):
    with open(os.path.join(work, name), "w", encoding="utf-8") as handle:
        json.dump(value, handle, separators=(",", ":"))

if event_type:
    now = datetime.now(timezone.utc)
    occurred_at = now.strftime("%Y-%m-%dT%H:%M:%S.") + ("%03dZ" % (now.microsecond // 1000))
    # The store deduplicates on source_fingerprint, so it fingerprints the SIGNAL, not this post:
    # an event retried after a failed-open post must not double-record. event_id is excluded.
    fingerprint = hashlib.sha256(
        json.dumps([repo_id, task_id, event_type, occurred_at, body], separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    write("event.json", {
        "protocol_version": 1,
        "event_id": "event_" + str(uuid.uuid4()),
        "event_type": event_type,
        "occurred_at": occurred_at,
        "repository_id": repo_id,
        "task_id": task_id,
        "privacy_class": privacy,
        "source_fingerprint": fingerprint,
        "payload": body,
    })

if hook == "SessionStart":
    write("handshake.json", {
        "protocol_version": 1,
        "adapter_id": "claude-code-hooks",
        "agent_surface": "claude-code",
        "agent_version": None,
        "repository": repository,
        "task": task,
        "capabilities": [
            "session_start", "prompt", "file_open", "file_edit", "tool_result", "session_end",
            "inject_system", "inject_user_turn",
        ],
    })

# Audit mode NEVER mutates the prompt. It is the measurement baseline: if the hook injected context
# in audit, the "original" bytes would already contain Kage context and the exact-versus-partial
# savings number would be meaningless. Only assist injects, and only at session start and prompt
# submit.
if mode == "assist":
    query = prompt[:1000] if hook == "UserPromptSubmit" else ("orient in this repository" if hook == "SessionStart" else "")
    if query:
        write("context.json", {
            "repository": repository,
            "task": task,
            "query": query,
            "targets": [],
            "changed_files": [],
            "token_budget": 2000,
        })
        with open(os.path.join(work, "inject"), "w", encoding="utf-8") as handle:
            handle.write("systemMessage" if hook == "SessionStart" else "additionalContext")
' 2>/dev/null || exit 0

post_evidence() {
  # Evidence delivery is a background write and gets 150 ms — it must never be felt in the session.
  # -f turns a 4xx/5xx into a nonzero exit we simply ignore.
  curl -sf --max-time 0.15 -X POST -H "content-type: application/json" -H "authorization: Bearer $TOKEN" --data-binary "@$2" "$CONNECTION$1" 2>/dev/null
}

post_context() {
  # Context composition is allowed 500 ms and NO MORE — a cold code-graph build takes tens of
  # seconds and this hook will not wait for it: it fails open and the warm cache serves the next
  # prompt. Waiting would hang the user's agent, which is the one thing Kage must never do.
  curl -sf --max-time 0.5 -X POST -H "content-type: application/json" -H "authorization: Bearer $TOKEN" --data-binary "@$2" "$CONNECTION$1" 2>/dev/null
}

[[ -f "$WORK/handshake.json" ]] && post_evidence /v2/handshakes "$WORK/handshake.json" >/dev/null 2>&1
[[ -f "$WORK/event.json" ]] && post_evidence /v2/events "$WORK/event.json" >/dev/null 2>&1

if [[ -f "$WORK/context.json" ]]; then
  CAPSULE="$(post_context /v2/context "$WORK/context.json" || echo "")"
  if [[ -n "$CAPSULE" ]]; then
    # A truncated or off-protocol capsule prints nothing at all rather than injecting half a block.
    KAGE_CAPSULE="$CAPSULE" KAGE_INJECT="$(cat "$WORK/inject" 2>/dev/null || echo "")" python3 -c 'import json, os
try:
    capsule = json.loads(os.environ.get("KAGE_CAPSULE") or "null")
except Exception:
    raise SystemExit(0)
field = os.environ.get("KAGE_INJECT") or ""
if not isinstance(capsule, dict) or capsule.get("protocol_version") != 1:
    raise SystemExit(0)
if field not in ("systemMessage", "additionalContext"):
    raise SystemExit(0)
sections = capsule.get("sections")
if not isinstance(sections, list) or not sections:
    raise SystemExit(0)
rendered = []
for section in sections:
    if not isinstance(section, dict):
        raise SystemExit(0)
    title, body, kind = section.get("title"), section.get("body"), section.get("kind")
    if not isinstance(title, str) or not isinstance(body, str) or not isinstance(kind, str):
        raise SystemExit(0)
    rendered.append("## %s (%s)\n%s" % (title, kind, body))
block = "<<<KAGE_CONTEXT>>>\n" + "\n\n".join(rendered) + "\n<<<END_KAGE_CONTEXT>>>\n"
print(json.dumps({field: block}))
' 2>/dev/null || true
  fi
fi

exit 0
