---
description: Run the Kage Truth Report on this repo — duplicates, ghost exports, bus-factor-1 files, knowledge voids, doc lies
allowed-tools: Bash(npx -y @kage-core/kage-graph-mcp scan:*)
---

Run the Kage Truth Report on the current repository:

```
npx -y @kage-core/kage-graph-mcp scan --project "$(pwd)"
```

Then summarize the findings for the user, ordered by severity: duplicate implementations first, then doc lies, ghost exports, bus-factor-1 hot files, and knowledge voids. For each finding, include the file paths so the user can click through. If the report is clean, say so plainly.
