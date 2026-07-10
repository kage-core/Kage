---
type: "Decision"
title: "Launch website eye logo glows and blinks"
description: "The launch website now uses a custom glowing boxed eye logo in docs/index.html with docs/assets/kage eye.svg. The box frame should stay; the eye glow is stronger and blink animation is implemented with lightweight CSS sh"
resource: "docs/index.html"
tags: ["session-learning", "website", "logo", "brand", "visual", "launch", "animation"]
timestamp: "2026-05-03T09:00:31.818Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:launch-website-eye-logo-glows-and-blinks-1777798831818"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["docs/index.html", "docs/assets/kage-eye.svg"]
---

# Launch website eye logo glows and blinks

> The launch website now uses a custom glowing boxed eye logo in docs/index.html with docs/assets/kage eye.svg. The box…

The launch website now uses a custom glowing boxed eye logo in docs/index.html with docs/assets/kage-eye.svg. The box frame should stay; the eye glow is stronger and blink animation is implemented with lightweight CSS shutters.

## Why

The logo gives the launch page a recognizable Kage visual mark while keeping the page lightweight.

## Trigger

Recall when editing docs/index.html branding, the eye logo asset, or launch-site animation.

## Action

Preserve the boxed eye frame and lightweight CSS shutters unless the launch brand direction changes.

## Verification

Repo-local capture grounded to docs/index.html and docs/assets/kage-eye.svg.

## Risk if forgotten

Agents may replace the branded logo with generic text or remove the intended glow/blink behavior.

## Stale when

The launch website brand system changes or docs/assets/kage-eye.svg is removed.

# Citations

[1] explicit_capture (2026-05-03T09:00:31.818Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:launch-website-eye-logo-glows-and-blinks-1777798831818","title":"Launch website eye logo glows and blinks","summary":"The launch website now uses a custom glowing boxed eye logo in docs/index.html with docs/assets/kage eye.svg. The box frame should stay; the eye glow is stronger and blink animation is implemented with lightweight CSS sh","body":"The launch website now uses a custom glowing boxed eye logo in docs/index.html with docs/assets/kage-eye.svg. The box frame should stay; the eye glow is stronger and blink animation is implemented with lightweight CSS shutters.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","website","logo","brand","visual","launch","animation"],"paths":["docs/index.html","docs/assets/kage-eye.svg"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T09:00:31.818Z"}],"context":{"fact":"The launch website uses a custom glowing boxed eye logo with lightweight CSS blink animation.","why":"The logo gives the launch page a recognizable Kage visual mark while keeping the page lightweight.","trigger":"Recall when editing docs/index.html branding, the eye logo asset, or launch-site animation.","action":"Preserve the boxed eye frame and lightweight CSS shutters unless the launch brand direction changes.","verification":"Repo-local capture grounded to docs/index.html and docs/assets/kage-eye.svg.","risk_if_forgotten":"Agents may replace the branded logo with generic text or remove the intended glow/blink behavior.","stale_when":"The launch website brand system changes or docs/assets/kage-eye.svg is removed."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-03T09:00:31.818Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":57,"total_uses":1,"last_accessed_at":"2026-07-10T10:07:07.379Z"},"created_at":"2026-05-03T09:00:31.818Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

