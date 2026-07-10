---
type: "Gotcha"
title: "npx skills add copies the whole repo if SKILL.md is at root"
description: "Root level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill in skills/<name /SKILL.md so only that clean folder installs."
resource: "skills/kage-memory/SKILL.md"
tags: ["session-learning"]
timestamp: "2026-06-05T11:54:06.362Z"
x-kage-id: "repo:memory:gotcha:npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-1780660446362"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["skills/kage-memory/SKILL.md"]
---

# npx skills add copies the whole repo if SKILL.md is at root

> Root level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill…

Root-level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill in skills/<name>/SKILL.md so only that clean folder installs.
Verified by: clean 71-agent install verified

## Verification

clean 71-agent install verified

# Citations

[1] explicit_capture (2026-06-05T11:54:06.362Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-1780660446362","title":"npx skills add copies the whole repo if SKILL.md is at root","summary":"Root level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill in skills/<name /SKILL.md so only that clean folder installs.","body":"Root-level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill in skills/<name>/SKILL.md so only that clean folder installs.\nVerified by: clean 71-agent install verified","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["skills/kage-memory/SKILL.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-05T11:54:06.362Z"}],"context":{"fact":"Root-level SKILL.md makes 'npx skills add owner/repo' copy the entire repo into every agent skills dir. Put the skill in skills/<name>/SKILL.md so only that clean folder installs.\nVerified by: clean 71-agent install verified","verification":"clean 71-agent install verified"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-05T11:54:06.362Z","path_fingerprints":[{"path":"skills/kage-memory/SKILL.md","sha256":"a6e52557e34beefdaa082cd25759bcdbd677b51cc49f19a8e7adc42fb02719b1","size":2315}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":56,"total_uses":0,"last_accessed_at":"2026-07-08T20:21:33.726Z"},"created_at":"2026-06-05T11:54:06.362Z","updated_at":"2026-07-03T16:16:26.723Z","author_branch":"chore/dogfood"}
```

