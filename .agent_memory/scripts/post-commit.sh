#!/bin/bash
# post-commit hook

# Get the directory of the repository
REPO_DIR=$(git rev-parse --show-toplevel)

# Run the python background script
# We run it detached (in the background) so the git commit command doesn't hang waiting for the LLM
nohup python "$REPO_DIR/.agent_memory/scripts/distiller_hook.py" > "$REPO_DIR/.agent_memory/scripts/distiller.log" 2>&1 &
