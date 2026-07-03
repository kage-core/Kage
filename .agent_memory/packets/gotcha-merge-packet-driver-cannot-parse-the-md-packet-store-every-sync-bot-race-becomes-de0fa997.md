---
type: "Gotcha"
title: "merge-packet driver cannot parse the .md packet store — every sync-bot race becomes a manual conflict"
description: "Observed live 2026 07 03 during a push race with the kage sync bot: git rebase hit conflicts on four .agent memory/packets/ .md files and the custom merge driver printed \"kage merge packet: neither side parses as packet"
resource: "mcp/cli.ts"
tags: ["session-learning", "merge-driver", "sync-bot", "store", "gotcha", "rank-7"]
timestamp: "2026-07-03T12:42:55.367Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:merge-packet-driver-cannot-parse-the-md-packet-store-every-sync-bot-race-becomes"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/cli.ts", ".gitattributes"]
---

# merge-packet driver cannot parse the .md packet store — every sync-bot race becomes a manual conflict

> Observed live 2026 07 03 during a push race with the kage sync bot: git rebase hit conflicts on four .agent memory/pa…

Observed live 2026-07-03 during a push race with the kage-sync bot: git rebase hit conflicts on four .agent_memory/packets/*.md files and the custom merge driver printed "kage merge-packet: neither side parses as packet JSON; leaving the conflict for manual resolution" for every one. The driver (kage merge-packet, wired via .gitattributes) was written for the JSON packet format and was never updated when the store flipped to .md-with-JSON-body, so it always falls through to manual conflict markers. Combined with the sync bot rewriting packet metadata on every master push, any human/agent push that touches .agent_memory races the bot and lands in manual conflict resolution. Fix belongs with the rank-7 store work: teach merge-packet to parse the current .md packet format (and prefer the side with the newer updated_at / union source_refs), and/or stop the sync bot from rewriting volatile metadata into tracked packet files.
Evidence: Rebase output 2026-07-03: four "neither side parses as packet JSON" lines followed by CONFLICT on .md packets; resolved manually with checkout --theirs
Verified by: Reproduced in this session's push of commit ff20ff3

## Verification

Rebase output 2026-07-03: four "neither side parses as packet JSON" lines followed by CONFLICT on .md packets; resolved manually with checkout --theirs

# Citations

[1] explicit_capture (2026-07-03T12:42:55.367Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:merge-packet-driver-cannot-parse-the-md-packet-store-every-sync-bot-race-becomes","title":"merge-packet driver cannot parse the .md packet store — every sync-bot race becomes a manual conflict","summary":"Observed live 2026 07 03 during a push race with the kage sync bot: git rebase hit conflicts on four .agent memory/packets/ .md files and the custom merge driver printed \"kage merge packet: neither side parses as packet","body":"Observed live 2026-07-03 during a push race with the kage-sync bot: git rebase hit conflicts on four .agent_memory/packets/*.md files and the custom merge driver printed \"kage merge-packet: neither side parses as packet JSON; leaving the conflict for manual resolution\" for every one. The driver (kage merge-packet, wired via .gitattributes) was written for the JSON packet format and was never updated when the store flipped to .md-with-JSON-body, so it always falls through to manual conflict markers. Combined with the sync bot rewriting packet metadata on every master push, any human/agent push that touches .agent_memory races the bot and lands in manual conflict resolution. Fix belongs with the rank-7 store work: teach merge-packet to parse the current .md packet format (and prefer the side with the newer updated_at / union source_refs), and/or stop the sync bot from rewriting volatile metadata into tracked packet files.\nEvidence: Rebase output 2026-07-03: four \"neither side parses as packet JSON\" lines followed by CONFLICT on .md packets; resolved manually with checkout --theirs\nVerified by: Reproduced in this session's push of commit ff20ff3","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","merge-driver","sync-bot","store","gotcha","rank-7"],"paths":["mcp/cli.ts",".gitattributes"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-03T12:42:55.367Z"}],"context":{"fact":"Observed live 2026-07-03 during a push race with the kage-sync bot: git rebase hit conflicts on four .agent_memory/packets/*.md files and the custom merge driver printed \"kage merge-packet: neither side parses as packet JSON; leaving the conflict for manual resolution\" for every one. The driver (kage merge-packet, wired via .gitattributes) was written for the JSON packet format and was never updated when the store flipped to .md-with-JSON-body, so it always falls through to manual conflict markers. Combined with the sync bot rewriting packet metadata on every master push, any human/agent push that touches .agent_memory races the bot and lands in manual conflict resolution. Fix belongs with the rank-7 store work: teach merge-packet to parse the current .md packet format (and prefer the side with the newer updated_at / union source_refs), and/or stop the sync bot from rewriting volatile metadata into tracked packet files.\nEvidence: Rebase output 2026-07-03: four \"neither side parses as packet JSON\" lines followed by CONFLICT on .md packets; resolved manually with checkout --theirs\nVerified by: Reproduced in this session's push of commit ff20ff3","verification":"Rebase output 2026-07-03: four \"neither side parses as packet JSON\" lines followed by CONFLICT on .md packets; resolved manually with checkout --theirs"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-03T12:42:55.367Z","path_fingerprints":[{"path":"mcp/cli.ts","sha256":"374cc73d7c34e922394afe3c2b6bce5693e1db77dc057c68a23b1345986b4b2e","size":122632,"symbols":[{"name":"written","kind":"constant","sha256":"2db109c8adff89445a4cc702788922ca100de424acbe5c47ac1cc97aa91c0069"},{"name":"packets","kind":"constant","sha256":"08565eddc844fbb13d207b1a5875e07b52807950760d7784cce666504b0eda13"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"wired","kind":"constant","sha256":"53fd67a86d7030f97797810736da8e6d0dabcbd66260439181b3868c04cc4769"},{"name":"current","kind":"constant","sha256":"471f3cfbffa04d6ecddb2f3d4013027b71237de766afb69ec418f1f1b8308937"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"body","kind":"constant","sha256":"0f16c8a6c72ea8a0a27e0ffff5f6392ae9b152aa0b2db4815d99cf5bf7b0328a"}]},{"path":".gitattributes","sha256":"d3c24cd530fbce1a57c679e011ab18f651a7e43e2d7088013bfbc7f4707d15c7","size":92}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":290,"total_uses":0},"created_at":"2026-07-03T12:42:55.367Z","updated_at":"2026-07-03T16:16:26.723Z","author_branch":"master"}
```

