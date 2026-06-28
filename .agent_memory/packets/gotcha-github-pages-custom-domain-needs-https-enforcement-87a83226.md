---
type: "Gotcha"
title: "GitHub Pages custom domain needs HTTPS enforcement"
description: "If the hosted viewer appears broken from https://kage core.github.io/Kage/viewer/, check GitHub Pages custom domain settings first. With CNAME kage core.com, github.io redirects to the custom domain; if https enforced is"
resource: "docs/CNAME"
tags: ["session-learning"]
timestamp: "2026-06-15T08:30:49.817Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:github-pages-custom-domain-needs-https-enforcement-1779384700023"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["docs/CNAME", ".github/workflows/pages.yml"]
---

# GitHub Pages custom domain needs HTTPS enforcement

> If the hosted viewer appears broken from https://kage core.github.io/Kage/viewer/, check GitHub Pages custom domain s…

If the hosted viewer appears broken from https://kage-core.github.io/Kage/viewer/, check GitHub Pages custom domain settings first. With CNAME kage-core.com, github.io redirects to the custom domain; if https_enforced is false, the redirect can point to http://kage-core.com/viewer/ even though the Pages deployment and viewer assets are healthy. Fix by enabling HTTPS enforcement in the Pages settings/API, then wait for GitHub/Fastly cache to expire.

# Citations

[1] explicit_capture (2026-05-21T17:31:40.023Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:github-pages-custom-domain-needs-https-enforcement-1779384700023","title":"GitHub Pages custom domain needs HTTPS enforcement","summary":"If the hosted viewer appears broken from https://kage core.github.io/Kage/viewer/, check GitHub Pages custom domain settings first. With CNAME kage core.com, github.io redirects to the custom domain; if https enforced is","body":"If the hosted viewer appears broken from https://kage-core.github.io/Kage/viewer/, check GitHub Pages custom domain settings first. With CNAME kage-core.com, github.io redirects to the custom domain; if https_enforced is false, the redirect can point to http://kage-core.com/viewer/ even though the Pages deployment and viewer assets are healthy. Fix by enabling HTTPS enforcement in the Pages settings/API, then wait for GitHub/Fastly cache to expire.","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["docs/CNAME",".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-21T17:31:40.023Z"}],"context":{"fact":"If the hosted viewer appears broken from https://kage-core.github.io/Kage/viewer/, check GitHub Pages custom domain settings first. With CNAME kage-core.com, github.io redirects to the custom domain; if https_enforced is false, the redirect can point to http://kage-core.com/viewer/ even though the Pages deployment and viewer assets are healthy. Fix by enabling HTTPS enforcement in the Pages settings/API, then wait for GitHub/Fastly cache to expire."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T08:30:49.817Z","path_fingerprints":[{"path":"docs/CNAME","sha256":"c8e8a7f8dcbe98f1936d172fcb6771154b572744a73d557605a26cf72d86638f","size":14},{"path":".github/workflows/pages.yml","sha256":"0268e0222b1263c3f8a28e766b2b278e2ae269535d08bf2fcfd499d90b579fce","size":5402}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":113,"reverified_at":"2026-06-15T08:30:49.817Z"},"created_at":"2026-05-21T17:31:40.023Z","updated_at":"2026-06-15T08:30:49.817Z"}
```

