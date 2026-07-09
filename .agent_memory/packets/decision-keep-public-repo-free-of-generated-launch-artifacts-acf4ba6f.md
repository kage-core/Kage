---
type: "Decision"
title: "Keep public repo free of generated launch artifacts"
description: "For this OSS repo, keep generated launch assets, raw recordings, and generated viewer output out of git unless they are final lightweight public assets."
resource: ".gitignore"
tags: ["session-learning", "oss", "repo-hygiene", "assets", "memory"]
timestamp: "2026-05-14T16:34:45.530Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:keep-public-repo-free-of-generated-launch-artifacts-1778776485531"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: [".gitignore", "README.md", "docs/assets", ".agent_memory/packets"]
---

# Keep public repo free of generated launch artifacts

> For this OSS repo, keep generated launch assets, raw recordings, and generated viewer output out of git unless they a…

For this OSS repo, keep one-off marketing/demo render scripts, raw terminal recordings, generated videos, internal launch planning docs, and generated docs/viewer output out of the public tree. The Pages workflow should build docs/viewer from mcp/viewer and current Kage artifacts during deploy. Only commit lightweight public assets that are intentionally referenced by README, docs, website, or viewer. Stale memory packets that only explain removed artifacts should be deleted so public memory does not point at missing files.
Evidence: Cleaned generated demo scripts, large docs/assets videos/transcripts, launch-readiness docs, checked-in docs/viewer output, and stale packets; docs/assets now only contains referenced lightweight public assets.
Verified by: rg stale demo/media references returned no matches; kage refresh --full reported zero validation warnings.

## Verification

Cleaned generated demo scripts, large docs/assets videos/transcripts, launch-readiness docs, checked-in docs/viewer output, and stale packets; docs/assets now only contains referenced lightweight public assets.

# Citations

[1] explicit_capture (2026-05-14T16:34:45.530Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:keep-public-repo-free-of-generated-launch-artifacts-1778776485531","title":"Keep public repo free of generated launch artifacts","summary":"For this OSS repo, keep generated launch assets, raw recordings, and generated viewer output out of git unless they are final lightweight public assets.","body":"For this OSS repo, keep one-off marketing/demo render scripts, raw terminal recordings, generated videos, internal launch planning docs, and generated docs/viewer output out of the public tree. The Pages workflow should build docs/viewer from mcp/viewer and current Kage artifacts during deploy. Only commit lightweight public assets that are intentionally referenced by README, docs, website, or viewer. Stale memory packets that only explain removed artifacts should be deleted so public memory does not point at missing files.\nEvidence: Cleaned generated demo scripts, large docs/assets videos/transcripts, launch-readiness docs, checked-in docs/viewer output, and stale packets; docs/assets now only contains referenced lightweight public assets.\nVerified by: rg stale demo/media references returned no matches; kage refresh --full reported zero validation warnings.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","oss","repo-hygiene","assets","memory"],"paths":[".gitignore","README.md","docs/assets",".agent_memory/packets"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T16:34:45.530Z"}],"context":{"fact":"For this OSS repo, keep one-off marketing/demo render scripts, raw terminal recordings, generated videos, internal launch planning docs, and generated docs/viewer output out of the public tree. The Pages workflow should build docs/viewer from mcp/viewer and current Kage artifacts during deploy. Only commit lightweight public assets that are intentionally referenced by README, docs, website, or viewer. Stale memory packets that only explain removed artifacts should be deleted so public memory does not point at missing files.","verification":"Cleaned generated demo scripts, large docs/assets videos/transcripts, launch-readiness docs, checked-in docs/viewer output, and stale packets; docs/assets now only contains referenced lightweight public assets."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-14T16:34:45.530Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":17,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":177,"total_uses":17,"last_accessed_at":"2026-07-09T06:07:27.155Z"},"created_at":"2026-05-14T16:34:45.530Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

