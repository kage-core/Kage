---
type: "Decision"
title: "Website GitHub nav opens repo directly"
description: "GitHub cannot be silently starred from a static website link; the launch site should use one GitHub nav button that opens the repo directly."
resource: "docs/index.html"
tags: ["session-learning", "website", "github", "launch", "cta"]
timestamp: "2026-05-06T17:53:55.880Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:website-uses-explicit-github-star-button-1778090035881"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["docs/index.html"]
---

# Website GitHub nav opens repo directly

> GitHub cannot be silently starred from a static website link; the launch site should use one GitHub nav button that o…

GitHub cannot be silently starred from a static website link; starring requires an explicit authenticated user action. The launch site should use one GitHub nav button that opens https://github.com/kage-core/Kage directly, without an official Star widget or a separate Repo CTA.
Evidence: docs/index.html renders a single nav-cta GitHub link to https://github.com/kage-core/Kage and does not load the GitHub buttons script.
Verified by: git diff --check; rg -n 'buttons.github.io|github-button|Star kage-core|>Repo<|nav-cta.*github' docs/index.html

## Verification

docs/index.html renders a single nav-cta GitHub link to https://github.com/kage-core/Kage and does not load the GitHub buttons script.

# Citations

[1] explicit_capture (2026-05-06T17:53:55.880Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:website-uses-explicit-github-star-button-1778090035881","title":"Website GitHub nav opens repo directly","summary":"GitHub cannot be silently starred from a static website link; the launch site should use one GitHub nav button that opens the repo directly.","body":"GitHub cannot be silently starred from a static website link; starring requires an explicit authenticated user action. The launch site should use one GitHub nav button that opens https://github.com/kage-core/Kage directly, without an official Star widget or a separate Repo CTA.\nEvidence: docs/index.html renders a single nav-cta GitHub link to https://github.com/kage-core/Kage and does not load the GitHub buttons script.\nVerified by: git diff --check; rg -n 'buttons.github.io|github-button|Star kage-core|>Repo<|nav-cta.*github' docs/index.html","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","website","github","launch","cta"],"paths":["docs/index.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T17:53:55.880Z"}],"context":{"fact":"GitHub cannot be silently starred from a static website link; starring requires an explicit authenticated user action. The launch site should use one GitHub nav button that opens https://github.com/kage-core/Kage directly, without an official Star widget or a separate Repo CTA.\nEvidence: docs/index.html renders a single nav-cta GitHub link to https://github.com/kage-core/Kage and does not load the GitHub buttons script.\nVerified by: git diff --check; rg -n 'buttons.github.io|github-button|Star kage-core|>Repo<|nav-cta.*github' docs/index.html","verification":"docs/index.html renders a single nav-cta GitHub link to https://github.com/kage-core/Kage and does not load the GitHub buttons script."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-06T17:53:55.880Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":128},"created_at":"2026-05-06T17:53:55.880Z","updated_at":"2026-05-19T04:50:14.976Z"}
```

