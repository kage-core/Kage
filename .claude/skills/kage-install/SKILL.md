---
name: kage-install
description: Install Kage v2 — the Claude Code-native agent memory system. Sets up automatic session distillation, memory retrieval sub-agent, and the /kage management skill. Zero pip, zero daemon, zero API keys needed beyond Claude Code's own auth.
allowed-tools: Read, Write, Bash, Glob
---

You are installing **Kage v2** — a daemon-free, Claude Code-native agent memory system.

Parse arguments from `$ARGUMENTS`:
- If a GitHub URL or `org/repo` is given, clone that repo as the Kage source before installing
- Otherwise use the existing Kage installation files from `~/.claude/`

---

## Installation Steps

Walk the user through each step, confirming before writing to system directories.

### Step 1 — Verify Prerequisites

```bash
which python3 && python3 --version
which git && git --version
claude --version
```

If any missing, tell the user what to install and stop.

### Step 2 — Create User-Level Directories

```bash
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/skills/kage
mkdir -p ~/.claude/skills/kage-install
mkdir -p ~/.claude/kage/hooks
mkdir -p ~/.agent_memory/nodes
mkdir -p ~/.agent_memory/pending
mkdir -p ~/.agent_memory/deprecated
mkdir -p ~/.agent_memory/packs
```

### Step 3 — Write Core Agent Files

Write `~/.claude/agents/kage-distiller.md` — the distillation sub-agent (replaces the daemon).
Write `~/.claude/agents/kage-memory.md` — the 3-tier retrieval sub-agent.

Use the canonical content from the Kage v2 repository.

### Step 4 — Write Hook Scripts

Write `~/.claude/kage/hooks/stop.sh`:
- Reads Stop hook stdin JSON
- Guards: transcript exists, session not already processed, ≥ 4 turns
- Marks session as queued in `~/.claude/kage/.processed_sessions`
- Launches: `nohup claude --agent kage-distiller --print "$TASK" --permission-mode bypassPermissions --no-session-persistence >> ~/.claude/kage/distill.log 2>&1 &`

Write `~/.claude/kage/hooks/session-start.sh`:
- Detects available memory tiers
- Outputs `systemMessage` JSON telling Claude which tiers are available

```bash
chmod +x ~/.claude/kage/hooks/stop.sh
chmod +x ~/.claude/kage/hooks/session-start.sh
```

### Step 5 — Patch `~/.claude/settings.json`

Read the current settings.json. Add Kage hooks to the `Stop` and `SessionStart` arrays (non-destructively — keep existing hooks like clauditor):

```json
"Stop": [
  { ...existing hooks... },
  {
    "type": "command",
    "command": "bash ~/.claude/kage/hooks/stop.sh",
    "timeout": 15
  }
],
"SessionStart": [
  { ...existing hooks... },
  {
    "type": "command",
    "command": "bash ~/.claude/kage/hooks/session-start.sh",
    "timeout": 10
  }
]
```

If `settings.json` doesn't exist, create it with just the Kage hooks.

### Step 6 — Initialize Global Personal Memory

Write `~/.agent_memory/index.md` if it doesn't exist:

```markdown
# Personal Memory Index

Cross-project learnings that apply across multiple repos.
Project-specific knowledge lives in each project's `.agent_memory/`.

## Domains

<!-- Domain indexes added here as nodes are approved -->

## Installed Packs

<!-- Community packs added here via /kage add -->
```

Write `~/.agent_memory/SUMMARY.md` if it doesn't exist:
```markdown
# Personal Memory Summary

*No nodes yet. Memory will be distilled automatically after sessions.*
```

Write `~/.claude/kage.json` if it doesn't exist:
```json
{
  "version": "2.0.0",
  "packs": []
}
```

### Step 7 — Per-Project Setup (if in a git repo)

Check if CWD is a git repo: `git rev-parse --git-dir 2>/dev/null`

If yes:
- Create `.agent_memory/{nodes,pending,deprecated}/`
- Write `.agent_memory/index.md` (project root index)
- Write `.agent_memory/SUMMARY.md` (empty digest)
- Create `.claude/kage.json` with `{"version":"2.0.0","packs":[]}`
- Append to `CLAUDE.md` (or create it):

```markdown
## Kage Memory

This project uses Kage v2 for persistent agent memory.

- Invoke `kage-distiller` **immediately** when you fix a bug, make a design decision, figure out a setup step, discover a pattern, or map an integration — do not wait for session end
- Invoke `kage-memory` before implementing auth, API patterns, database operations, or any domain-specific feature
- Memory is organized in `.agent_memory/` — do NOT read these files directly
- Review pending nodes with `/kage review`
- Team members share memory automatically via git
```

- Add to `.gitignore` if not present:
```
.agent_memory/pending/
.agent_memory/watcher.log
.agent_memory/watcher.error.log
```

### Step 8 — Confirmation

Print a summary:

```
✓ Kage v2 installed successfully!

  Agents:  ~/.claude/agents/kage-distiller.md
           ~/.claude/agents/kage-memory.md

  Hooks:   Stop → distills sessions automatically (no daemon)
           SessionStart → injects memory context

  Skills:  /kage review | prune | digest | add | publish | search

  Memory:  Personal: ~/.agent_memory/
           Project:  .agent_memory/  [if in git repo]

How it works:
  1. You work normally in Claude Code
  2. At session end, kage-distiller analyzes the transcript
  3. Valuable learnings go to pending/ for your review
  4. Run /kage review to approve — approved nodes are committed with your project
  5. Teammates get your knowledge on git pull
  6. Share patterns globally with /kage publish + /kage add
```

If this replaced a v1 daemon installation, also suggest:
```
To remove the old v1 daemon:
  launchctl unload ~/Library/LaunchAgents/com.kage.session-watcher.plist
  rm ~/Library/LaunchAgents/com.kage.session-watcher.plist
```
