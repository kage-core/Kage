---
type: "Decision"
title: "Viewer V2 receipts theme: value param, Gains tab, theme-aware canvas"
description: "The viewer's V2 \"receipts\" theme is light first warm paper tokens in :root with a dark palette under prefers color scheme: dark, in both mcp/viewer/index.html and docs/assets/site.css. Conventions future agents must foll"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "theme", "gains", "value-ledger", "csp", "docs"]
timestamp: "2026-06-11T15:00:53.647Z"
x-kage-id: "repo:agent-a8e00068f536471a0:decision:viewer-v2-receipts-theme-value-param-gains-tab-theme-aware-canvas-1781190053647"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.ts", "docs/assets/site.css", ".github/workflows/pages.yml"]
---

# Viewer V2 receipts theme: value param, Gains tab, theme-aware canvas

> The viewer's V2 "receipts" theme is light first warm paper tokens in :root with a dark palette under prefers color sc…

The viewer's V2 "receipts" theme is light-first (warm paper tokens in :root) with a dark palette under prefers-color-scheme: dark, in both mcp/viewer/index.html and docs/assets/site.css. Conventions future agents must follow: (1) the daemon viewer URL is built by viewerUrl()/viewerReportPaths() in mcp/daemon.ts — add new report files there, never by string-appending; (2) reports.value (.agent_memory/reports/value.json) is the cumulative value ledger written by recall and must NEVER be regenerated/overwritten by startViewer's pre-generation block or all-time savings history is lost; (3) the Gains tab is the landing tab (show() defaults to "gains") and console.js recomputes today/7d windows client-side from ledger events with the same rules as `kage gains` (today = local midnight, all-time = totals so event-cap trimming never loses history, $15 per 1M input tokens); (4) the canvas memory map and donut cannot use CSS variables directly, so console.js resolves them via getComputedStyle into a THEME object (refreshTheme) and converts hex to rgba with the rgba() helper — use THEME.*, never hard-coded hex, so light/dark both work; (5) CSP discipline: index.html keeps exactly one external <script src="./console.js?v=N"> (bump N on changes, currently 16) and no inline scripts; (6) docs/viewer must stay a byte-identical mirror of mcp/viewer (pages.yml runs diff -qr) and pages.yml's optional-report loop now includes "value" so the hosted demo Gains tab populates from CI seed recalls.
Evidence: mcp/daemon.ts viewerReportPaths/viewerUrl; mcp/viewer/console.js renderGains/refreshTheme; mcp/daemon.test.ts "viewer url serves every report param including the value ledger"
Verified by: cd mcp && npm run build && npm test (196 pass); live viewer on :3199 served value.json and gains markup

# Citations

[1] explicit_capture (2026-06-11T15:00:53.647Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:agent-a8e00068f536471a0:decision:viewer-v2-receipts-theme-value-param-gains-tab-theme-aware-canvas-1781190053647","title":"Viewer V2 receipts theme: value param, Gains tab, theme-aware canvas","summary":"The viewer's V2 \"receipts\" theme is light first warm paper tokens in :root with a dark palette under prefers color scheme: dark, in both mcp/viewer/index.html and docs/assets/site.css. Conventions future agents must foll","body":"The viewer's V2 \"receipts\" theme is light-first (warm paper tokens in :root) with a dark palette under prefers-color-scheme: dark, in both mcp/viewer/index.html and docs/assets/site.css. Conventions future agents must follow: (1) the daemon viewer URL is built by viewerUrl()/viewerReportPaths() in mcp/daemon.ts — add new report files there, never by string-appending; (2) reports.value (.agent_memory/reports/value.json) is the cumulative value ledger written by recall and must NEVER be regenerated/overwritten by startViewer's pre-generation block or all-time savings history is lost; (3) the Gains tab is the landing tab (show() defaults to \"gains\") and console.js recomputes today/7d windows client-side from ledger events with the same rules as `kage gains` (today = local midnight, all-time = totals so event-cap trimming never loses history, $15 per 1M input tokens); (4) the canvas memory map and donut cannot use CSS variables directly, so console.js resolves them via getComputedStyle into a THEME object (refreshTheme) and converts hex to rgba with the rgba() helper — use THEME.*, never hard-coded hex, so light/dark both work; (5) CSP discipline: index.html keeps exactly one external <script src=\"./console.js?v=N\"> (bump N on changes, currently 16) and no inline scripts; (6) docs/viewer must stay a byte-identical mirror of mcp/viewer (pages.yml runs diff -qr) and pages.yml's optional-report loop now includes \"value\" so the hosted demo Gains tab populates from CI seed recalls.\nEvidence: mcp/daemon.ts viewerReportPaths/viewerUrl; mcp/viewer/console.js renderGains/refreshTheme; mcp/daemon.test.ts \"viewer url serves every report param including the value ledger\"\nVerified by: cd mcp && npm run build && npm test (196 pass); live viewer on :3199 served value.json and gains markup","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","theme","gains","value-ledger","csp","docs"],"paths":["mcp/daemon.ts","docs/assets/site.css",".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-11T15:00:53.647Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-11T15:00:53.647Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":94,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":450},"created_at":"2026-06-11T15:00:53.647Z","updated_at":"2026-06-11T15:05:52.529Z"}
```

