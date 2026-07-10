---
description: Run the Kage Truth Report on this repo — knowledge voids, untested hot paths, complexity hotspots, code debt, bus-factor-1 files, duplicates, ghost exports, doc lies
allowed-tools: Bash(npx -y @kage-core/kage-graph-mcp scan:*)
---

Run the Kage Truth Report on the current repository:

```
npx -y @kage-core/kage-graph-mcp scan --project "$(pwd)"
```

Then summarize the findings for the user in the report's own order: knowledge voids, untested hot paths, complexity hotspots, code debt, bus-factor-1 files, duplicate implementations, ghost exports, then doc lies. For each finding, include the file paths so the user can click through. If the report is clean, say so plainly.
