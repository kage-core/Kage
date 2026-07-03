---
type: "Decision"
title: "License changes to GPL-3.0-only for future releases"
description: "Kage is switching future releases to GPL 3.0 only. GPL allows commercial use and selling, but distributed modified versions/derivatives must keep source available under GPL. README and npm metadata should say GPL 3.0 onl"
resource: "LICENSE"
tags: ["session-learning", "license", "gpl", "release", "npm", "legal"]
timestamp: "2026-05-03T11:04:19.802Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:license-changes-to-gpl-3-0-only-for-future-releases-1777806259803"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["LICENSE", "README.md", "mcp/package.json", "mcp/README.md", "CHANGELOG.md"]
---

# License changes to GPL-3.0-only for future releases

> Kage is switching future releases to GPL 3.0 only. GPL allows commercial use and selling, but distributed modified ve…

Kage is switching future releases to GPL-3.0-only. GPL allows commercial use and selling, but distributed modified versions/derivatives must keep source available under GPL. README and npm metadata should say GPL-3.0-only, with a note that older MIT releases remain under their original terms.

## Why

The project wants source-available copyleft terms for distributed modified versions while preserving prior release licensing.

## Trigger

Recall when editing LICENSE, README, npm package metadata, changelog, or release notes.

## Action

State GPL-3.0-only for future releases and avoid rewriting older MIT release terms.

## Verification

Repo-local capture grounded to LICENSE, README.md, mcp/package.json, mcp/README.md, and CHANGELOG.md.

## Risk if forgotten

Agents may publish inconsistent licensing metadata or imply that old MIT artifacts were relicensed.

## Stale when

The project changes its license policy or legal review supersedes this decision.

# Citations

[1] explicit_capture (2026-05-03T11:04:19.802Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:license-changes-to-gpl-3-0-only-for-future-releases-1777806259803","title":"License changes to GPL-3.0-only for future releases","summary":"Kage is switching future releases to GPL 3.0 only. GPL allows commercial use and selling, but distributed modified versions/derivatives must keep source available under GPL. README and npm metadata should say GPL 3.0 onl","body":"Kage is switching future releases to GPL-3.0-only. GPL allows commercial use and selling, but distributed modified versions/derivatives must keep source available under GPL. README and npm metadata should say GPL-3.0-only, with a note that older MIT releases remain under their original terms.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","license","gpl","release","npm","legal"],"paths":["LICENSE","README.md","mcp/package.json","mcp/README.md","CHANGELOG.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T11:04:19.802Z"}],"context":{"fact":"Future Kage releases use GPL-3.0-only while older MIT releases keep their original terms.","why":"The project wants source-available copyleft terms for distributed modified versions while preserving prior release licensing.","trigger":"Recall when editing LICENSE, README, npm package metadata, changelog, or release notes.","action":"State GPL-3.0-only for future releases and avoid rewriting older MIT release terms.","verification":"Repo-local capture grounded to LICENSE, README.md, mcp/package.json, mcp/README.md, and CHANGELOG.md.","risk_if_forgotten":"Agents may publish inconsistent licensing metadata or imply that old MIT artifacts were relicensed.","stale_when":"The project changes its license policy or legal review supersedes this decision."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-03T11:04:19.802Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":74,"total_uses":0},"created_at":"2026-05-03T11:04:19.802Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

