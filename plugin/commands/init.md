---
description: Initialize Kage verified memory in this repo (.agent_memory + code graph)
allowed-tools: Bash(npx -y @kage-core/kage-graph-mcp init:*), Bash(npx -y @kage-core/kage-graph-mcp index:*)
---

Initialize Kage in the current repository:

```
npx -y @kage-core/kage-graph-mcp init --project "$(pwd)"
npx -y @kage-core/kage-graph-mcp index --project "$(pwd)"
```

Then tell the user what was created (.agent_memory directory, code graph) and that memory will now be recalled automatically at session start. Mention `/kage:scan` for an immediate Truth Report and `/kage:gains` to see savings accumulate.
