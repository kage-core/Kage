#!/usr/bin/env bash
# Kage vNext adapter hook — the single fail-open bridge from Claude Code hooks to the local Kage
# runtime (kaged). Posts protocol-v1 evidence to 127.0.0.1 and injects the runtime's context block.
# Silent, and exits 0, whenever the runtime is absent, unreachable, slow, or unhappy.
# kage-hooks-v5
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
CONNECTION=""
MODE=""
[[ -n "$PROBE" ]] && read -r CONNECTION MODE <<< "$PROBE"
[[ -n "$CONNECTION" && -n "$MODE" ]] || { CONNECTION=""; MODE=""; }

TOKEN=""
if [[ -n "$CONNECTION" ]]; then
  TOKEN="$(tr -d '\r\n' < "$RUNTIME_DIR/token" 2>/dev/null || echo "")"
  # A runtime we cannot authenticate to is a runtime we cannot reach.
  [[ -n "$TOKEN" ]] || { CONNECTION=""; MODE=""; }
fi

# Where a context DELIVERY is recorded. Not an endpoint: the delivery Kage most needs to record is
# the one where the daemon was unreachable, and there is no posting that to the process that just
# failed. One 0600 file per delivery, inside the runtime's own 0700 directory, drained into SQLite
# by the runtime (or by the next `kage status` / audit report). It costs no round trip and it cannot
# fail a session.
SPOOL="$RUNTIME_DIR/deliveries"

# The runtime is gone. For a hook that WOULD have attached context, that is a failed-open — the one
# attachment outcome that can never be posted anywhere, and the one an honest audit must still
# count. Every other hook exits silently, exactly as before.
if [[ -z "$CONNECTION" ]]; then
  case "$HOOK_EVENT" in
    SessionStart|UserPromptSubmit) ;;
    *) exit 0 ;;
  esac
  REMOTE="$(git -C "$CWD" config --get remote.origin.url 2>/dev/null || echo "")"
  PAYLOAD="$PAYLOAD" KAGE_ROOT="$CWD" KAGE_REMOTE="$REMOTE" KAGE_SPOOL="$SPOOL" python3 -c 'import hashlib, json, os, uuid
from datetime import datetime, timezone

MAX_SPOOL_FILES = 2000

try:
    d = json.loads(os.environ.get("PAYLOAD") or "{}")
except Exception:
    raise SystemExit(0)
if not isinstance(d, dict):
    raise SystemExit(0)

root = os.environ.get("KAGE_ROOT") or ""
remote = (os.environ.get("KAGE_REMOTE") or "").strip() or None
spool = os.environ["KAGE_SPOOL"]

def sha(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

session = d.get("session_id") or d.get("sessionId")
session_id = (session[:256].strip() if isinstance(session, str) else "") or "default"
repo_id = "repo_" + sha(remote or root)[:32]
task_id = "task_" + sha(repo_id + "|" + session_id)[:32]
now = datetime.now(timezone.utc)

# capsule_id is NOT NULL and no capsule was composed: a fixed token says so instead of inventing an
# id. composition_latency_ms is null for the same reason — a failed round trip is not a composition.
record = {
    "delivery_id": "delivery_" + str(uuid.uuid4()),
    "capsule_id": "capsule_unavailable",
    "task_id": task_id,
    "adapter_id": "claude-code-hooks",
    "injection_location": "none",
    "delivered_at": now.strftime("%Y-%m-%dT%H:%M:%S.") + ("%03dZ" % (now.microsecond // 1000)),
    "added_bytes": 0,
    "added_tokens": None,
    "measurement_quality": "unavailable",
    "status": "failed_open",
    "reason": "unreachable",
    "composition_latency_ms": None,
}

try:
    os.makedirs(spool, mode=0o700, exist_ok=True)
    # A dead daemon means a failed-open on every prompt, forever. True, but it must not become an
    # unbounded directory: past the cap Kage stops recording rather than let measurement eat a disk.
    if len(os.listdir(spool)) >= MAX_SPOOL_FILES:
        raise SystemExit(0)
    name = str(uuid.uuid4())
    temporary = os.path.join(spool, "." + name + ".tmp")
    handle = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.write(handle, json.dumps(record, separators=(",", ":")).encode("utf-8"))
    finally:
        os.close(handle)
    # Renamed into place, so a reader only ever sees a complete record.
    os.rename(temporary, os.path.join(spool, name + ".json"))
except Exception:
    # A measurement Kage could not record is a gap in a report. Never a broken session.
    pass
' 2>/dev/null || true
  exit 0
fi

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
# savings number would be meaningless.
#
# But audit still MEASURES. It composes the capsule it would have injected and records the attempt
# as a SKIP — which is how an audit period gets a real context-composition latency and a real,
# non-null attachment denominator at all. Composing costs the session nothing (the capsule is
# thrown away); injecting would cost it the baseline, so only assist injects.
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
    write("identity.json", {"repo_id": repo_id, "task_id": task_id})
    # The location the block WOULD go to. It is recorded as the delivery location only when the
    # block is actually injected; a skipped capsule went nowhere and says "none".
    if mode == "assist":
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
  #
  # The body goes to a file and the status line to stdout, so the round trip is MEASURED by the
  # HTTP client itself (time_total) instead of being estimated by a second python start-up.
  curl -s -o "$3" -w '%{http_code} %{time_total}' --max-time 0.5 -X POST -H "content-type: application/json" -H "authorization: Bearer $TOKEN" --data-binary "@$2" "$CONNECTION$1" 2>/dev/null
}

[[ -f "$WORK/handshake.json" ]] && post_evidence /v2/handshakes "$WORK/handshake.json" >/dev/null 2>&1
[[ -f "$WORK/event.json" ]] && post_evidence /v2/events "$WORK/event.json" >/dev/null 2>&1

if [[ -f "$WORK/context.json" ]]; then
  TRANSPORT_STATUS=0
  METRICS="$(post_context /v2/context "$WORK/context.json" "$WORK/capsule.json")" || TRANSPORT_STATUS=$?

  # One pass decides what the session gets AND records what happened. A capsule that is truncated,
  # off-protocol, or empty prints nothing at all rather than injecting half a block — and is still
  # recorded, because "Kage tried and attached nothing" is a fact an audit has to be able to count.
  KAGE_METRICS="$METRICS" KAGE_TRANSPORT_STATUS="$TRANSPORT_STATUS" KAGE_MODE="$MODE" KAGE_WORK="$WORK" KAGE_SPOOL="$SPOOL" python3 -c 'import json, os, uuid
from datetime import datetime, timezone

MAX_SPOOL_FILES = 2000

work = os.environ["KAGE_WORK"]
spool = os.environ["KAGE_SPOOL"]
mode = os.environ.get("KAGE_MODE") or ""

try:
    with open(os.path.join(work, "identity.json"), "r", encoding="utf-8") as handle:
        identity = json.load(handle)
    task_id = identity["task_id"]
except Exception:
    raise SystemExit(0)

try:
    field = open(os.path.join(work, "inject"), "r", encoding="utf-8").read().strip()
except Exception:
    field = ""

http_code, seconds = 0, None
parts = (os.environ.get("KAGE_METRICS") or "").split()
if len(parts) == 2:
    try:
        http_code, seconds = int(parts[0]), float(parts[1])
    except Exception:
        http_code, seconds = 0, None

try:
    transport_status = int(os.environ.get("KAGE_TRANSPORT_STATUS") or "0")
except Exception:
    transport_status = 1

capsule = None
if transport_status == 0 and http_code == 200:
    try:
        with open(os.path.join(work, "capsule.json"), "r", encoding="utf-8") as handle:
            capsule = json.load(handle)
    except Exception:
        capsule = None
    if not isinstance(capsule, dict) or capsule.get("protocol_version") != 1:
        capsule = None
    elif not isinstance(capsule.get("sections"), list):
        capsule = None
    elif not isinstance(capsule.get("capsule_id"), str) or not capsule.get("capsule_id"):
        capsule = None

# Every reason is a fixed token — the same vocabulary the TypeScript adapter uses. Nothing derived
# from a prompt, a file, or a response body ever enters one, because reasons are stored and printed.
def failure_reason():
    if transport_status == 28:
        return "timeout"
    if transport_status != 0 or http_code == 0:
        return "unreachable"
    if http_code in (401, 403):
        return "unauthorized"
    if http_code in (400, 409, 413, 415):
        return "invalid_protocol"
    if http_code == 200:
        return "malformed_response"
    return "runtime_error"

block = ""
if capsule is not None:
    rendered = []
    for section in capsule["sections"]:
        if not isinstance(section, dict):
            rendered = []
            break
        title, body, kind = section.get("title"), section.get("body"), section.get("kind")
        if not isinstance(title, str) or not isinstance(body, str) or not isinstance(kind, str):
            rendered = []
            break
        rendered.append("## %s (%s)\n%s" % (title, kind, body))
    if rendered:
        block = "<<<KAGE_CONTEXT>>>\n" + "\n\n".join(rendered) + "\n<<<END_KAGE_CONTEXT>>>\n"

injects = bool(block) and mode == "assist" and field in ("systemMessage", "additionalContext")

if capsule is None:
    status, reason, location = "failed_open", failure_reason(), "none"
elif not block:
    status, reason, location = "skipped", "empty_capsule", "none"
elif not injects:
    # Audit composed the capsule and threw it away. A skip is NOT an attachment, and it is recorded
    # as a skip so no report can ever quietly count it as one.
    status, reason, location = "skipped", "audit_mode_no_injection", "none"
else:
    status = "delivered"
    reason = "delivered"
    location = "system" if field == "systemMessage" else "user_turn"

now = datetime.now(timezone.utc)
record = {
    "delivery_id": "delivery_" + str(uuid.uuid4()),
    # No capsule was composed => there is no capsule id. A fixed token, never an invented one.
    "capsule_id": capsule["capsule_id"] if capsule is not None else "capsule_unavailable",
    "task_id": task_id,
    "adapter_id": "claude-code-hooks",
    "injection_location": location if status == "delivered" else "none",
    "delivered_at": now.strftime("%Y-%m-%dT%H:%M:%S.") + ("%03dZ" % (now.microsecond // 1000)),
    # Exactly the bytes this hook put into the session. Zero when it put none.
    "added_bytes": len(block.encode("utf-8")) if status == "delivered" else 0,
    # Nobody counted the block TOKENS. bytes/4 would be a fabricated number, so this stays null and
    # the row says "partial": bytes exact, tokens unmeasured.
    "added_tokens": None,
    "measurement_quality": "partial" if status == "delivered" else "unavailable",
    "status": status,
    "reason": reason,
    # The MEASURED composition round trip, in milliseconds. Null when nothing was composed: a
    # timeout is not a composition time, and putting it in the percentiles would invent one.
    "composition_latency_ms": (seconds * 1000.0) if (capsule is not None and seconds is not None) else None,
}

try:
    os.makedirs(spool, mode=0o700, exist_ok=True)
    if len(os.listdir(spool)) < MAX_SPOOL_FILES:
        name = str(uuid.uuid4())
        temporary = os.path.join(spool, "." + name + ".tmp")
        handle = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            os.write(handle, json.dumps(record, separators=(",", ":")).encode("utf-8"))
        finally:
            os.close(handle)
        os.rename(temporary, os.path.join(spool, name + ".json"))
except Exception:
    # A measurement Kage could not record is a gap in a report. Never a broken session.
    pass

if injects:
    print(json.dumps({field: block}))
' 2>/dev/null || true
fi

exit 0
