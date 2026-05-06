#!/usr/bin/env bash
set -u

PROJECT_DIR="/tmp/kage-real-team-demo"
START_FILE="/tmp/kage-start-cli-recording"

cd "$PROJECT_DIR" || exit 1
rm -f "$START_FILE"

clear
printf "\nKAGE REAL CLI DEMO\n"
printf "Repo: %s\n\n" "$PROJECT_DIR"
printf "Waiting for screen recorder...\n"

while [ ! -f "$START_FILE" ]; do
  sleep 0.1
done

clear
printf "\n$ kage recall \"payment webhook retry\" --project %s\n\n" "$PROJECT_DIR"
kage recall "payment webhook retry" --project "$PROJECT_DIR"

printf "\n\n$ kage code-graph \"payment webhook retry\" --project %s\n\n" "$PROJECT_DIR"
kage code-graph "payment webhook retry" --project "$PROJECT_DIR"

printf "\n\n$ /Applications/Codex.app/Contents/Resources/codex exec -C %s -- Kage recall first\n\n" "$PROJECT_DIR"
/Applications/Codex.app/Contents/Resources/codex exec \
  -C "$PROJECT_DIR" \
  --skip-git-repo-check \
  -s workspace-write \
  "Use Kage CLI first. Run kage recall payment webhook retry logic safe change --project /tmp/kage-real-team-demo --json --explain. Do not inspect source files directly unless Kage output is insufficient. In under 5 lines, answer how to safely change payment webhook retry logic, mention the recalled Kage packet title and one source path."

printf "\n\n$ claude -p \"How do I safely change payment webhook retry logic?\" --allowedTools \"Bash(kage *)\"\n\n"
claude -p \
  "You are Teammate B using Claude Code in this same repo. Use Kage to answer in under 5 lines: how do I safely change payment webhook retry logic? Do not modify files. Show the Kage memory packet recalled and one source path." \
  --permission-mode dontAsk \
  --allowedTools "Bash(kage *)"

printf "\n\n$ kage metrics --project %s --json\n\n" "$PROJECT_DIR"
kage metrics --project "$PROJECT_DIR" --json

printf "\n\nDONE: real CLI recording complete.\n"
sleep 5
