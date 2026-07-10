---
type: "Bug Fix"
title: "Hosted GitHub Pages viewer must be tracked"
description: "docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even when docs linked to viewer/. Keep docs/viewer tracked and copy the current mcp/viewer assets there when"
resource: ".gitignore"
tags: ["session-learning", "viewer", "github-pages", "docs", "release"]
timestamp: "2026-05-15T04:10:50.524Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:hosted-github-pages-viewer-must-be-tracked-1778818250524"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: [".gitignore"]
---

# Hosted GitHub Pages viewer must be tracked

> docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even w…

docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even when docs linked to viewer/. Keep docs/viewer tracked and copy the current mcp/viewer assets there when viewer UI changes.

# Citations

[1] explicit_capture (2026-05-15T04:10:50.524Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:hosted-github-pages-viewer-must-be-tracked-1778818250524","title":"Hosted GitHub Pages viewer must be tracked","summary":"docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even when docs linked to viewer/. Keep docs/viewer tracked and copy the current mcp/viewer assets there when","body":"docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even when docs linked to viewer/. Keep docs/viewer tracked and copy the current mcp/viewer assets there when viewer UI changes.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","github-pages","docs","release"],"paths":[".gitignore"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T04:10:50.524Z"}],"context":{"fact":"docs/viewer was ignored in .gitignore, so changes to the package viewer did not update the GitHub Pages viewer even when docs linked to viewer/. Keep docs/viewer tracked and copy the current mcp/viewer assets there when viewer UI changes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T04:10:50.524Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":60,"total_uses":0,"last_accessed_at":"2026-07-09T06:42:22.987Z"},"created_at":"2026-05-15T04:10:50.524Z","updated_at":"2026-07-03T16:16:26.677Z"}
```

