# Kage Agent Memory

Do NOT read `.agent_memory/` files directly. Use the `kage-memory` sub-agent instead.

Before making architectural decisions, implementing a pattern, or working in a specific domain (auth, API, frontend, etc.), call the `kage-memory` sub-agent with a short description of what you are about to do. It navigates the memory index hierarchy and returns only relevant rules and known issues — keeping your context clean.

Example: *use kage-memory to check for rules about authentication middleware*

## Saving New Memories

When you resolve a non-trivial bug or establish an architectural rule, save it:

```bash
python3 kage.py save
```

Or use the full CLI for scripted saves:

```bash
python3 .agent_memory/scripts/distiller_tool.py \
  --title "Short Title" \
  --category "architecture|framework_bug|repo_context|debugging" \
  --tags '["tag1", "tag2"]' \
  --content "Markdown description of problem and solution." \
  --paths "backend,frontend/api"
```

Memories are staged in `.agent_memory/pending/` by default. Run `python3 kage.py review` to approve them.
