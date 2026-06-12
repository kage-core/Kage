---
description: Show what Kage saved you — tokens, cost, stale memories blocked, stale knowledge caught
allowed-tools: Bash(npx -y @kage-core/kage-graph-mcp gains:*)
---

Show the user what Kage has saved them in this repository:

```
npx -y @kage-core/kage-graph-mcp gains --project "$(pwd)"
```

Relay the numbers exactly as reported (tokens saved, estimated dollar cost, stale memories withheld, stale knowledge caught at diff time). Do not inflate or editorialize. If there is no ledger yet, explain that gains accumulate as the agent uses Kage recall and suggest running a few tasks first.
