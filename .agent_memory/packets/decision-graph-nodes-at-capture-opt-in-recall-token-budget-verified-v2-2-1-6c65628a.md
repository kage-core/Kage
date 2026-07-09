---
type: "Decision"
title: "graph_nodes at capture + opt-in recall token budget (verified v2.2.1)"
description: "Capture links packets to code graph nodes at write time; recall token budget stays opt in/bounded. Personal Memory section trims first when over budget ranks last ; kage resume has its own ~800 token timeline cap; receip"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-07-09T22:41:18.503Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:graph-nodes-at-capture-opt-in-recall-token-budget-verified-v2-2-1-1781268531115"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts"]
---

# graph_nodes at capture + opt-in recall token budget (verified v2.2.1)

> Capture links packets to code graph nodes at write time; recall token budget stays opt in/bounded. Personal Memory se…

Capture links packets to code-graph nodes at write time; recall token budget stays opt-in/bounded. Personal Memory section trims first when over budget (ranks last); kage resume has its own ~800-token timeline cap; receipts use max(read-vs-source, replay discovery_tokens). Unchanged by 2.2.1.

# Citations

[1] explicit_capture (2026-06-12T12:48:51.115Z)
[2] reverification
[3] reverification
[4] reverification
[5] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:graph-nodes-at-capture-opt-in-recall-token-budget-verified-v2-2-1-1781268531115","title":"graph_nodes at capture + opt-in recall token budget (verified v2.2.1)","summary":"Capture links packets to code graph nodes at write time; recall token budget stays opt in/bounded. Personal Memory section trims first when over budget ranks last ; kage resume has its own ~800 token timeline cap; receip","body":"Capture links packets to code-graph nodes at write time; recall token budget stays opt-in/bounded. Personal Memory section trims first when over budget (ranks last); kage resume has its own ~800-token timeline cap; receipts use max(read-vs-source, replay discovery_tokens). Unchanged by 2.2.1.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:48:51.115Z"},{"kind":"reverification","at":"2026-07-08T20:42:58.786Z","verified_by":"npm test: 391/391 pass","evidence":"kernel.ts changed under this packet as part of an additive collaborative-memory feature set (author_name attribution field, teamMemoryReport(), mergePacketFiles() loser-preservation, exported loadObservations()). The specific mechanism this packet describes is unrelated to those additions and unchanged.","changed_paths":[{"path":"mcp/kernel.ts","prior_sha256":"e22da4096afd6f19711892a3812ec7d695d0acfde007084dd139df9d4343dd54","sha256":"31ed04374a12f8be5b1d711c3646bb66335495d66a5f61849ee0be9a73dd472a"}]},{"kind":"reverification","at":"2026-07-08T21:41:25.488Z","verified_by":"npm test: 399/399 pass","evidence":"kernel.ts/kernel.test.ts changed further under this packet as part of an additive team-memory feature set (teamPacketsDir, teamRecallEntries, writeTeamPacket, loadObservations export, and their tests). The specific mechanism this packet describes is unrelated to those additions and unchanged.","changed_paths":[{"path":"mcp/kernel.ts","prior_sha256":"31ed04374a12f8be5b1d711c3646bb66335495d66a5f61849ee0be9a73dd472a","sha256":"32a35147920c3d05d3f5d1ffa87638a6e97f6c2f7f37b5fa08d6248856441470"}]},{"kind":"reverification","at":"2026-07-09T06:53:36.747Z","verified_by":"npm test: 402/402 pass","evidence":"kernel.ts changed further: added teamLinkPath/writeTeamLink/readTeamLink (kage cloud link feature) and their kernel.test.ts round-trip test. Unrelated to the mechanism this packet describes, which is unchanged.","changed_paths":[{"path":"mcp/kernel.ts","prior_sha256":"32a35147920c3d05d3f5d1ffa87638a6e97f6c2f7f37b5fa08d6248856441470","sha256":"037ce8e440db339f76a53153b8a770a996053f5552ddd747229a69c95ee0cae2"}]},{"kind":"reverification","at":"2026-07-09T22:41:18.503Z","verified_by":"npm test: 402/402 pass","evidence":"kernel.ts changed as part of a gimmick-removal cleanup pass: deleted a marketing tagline from the claude-mem audit receipt and reworded two comments to drop undefined 'wedge' jargon. Unrelated to this packet's described mechanism.","changed_paths":[{"path":"mcp/kernel.ts","prior_sha256":"037ce8e440db339f76a53153b8a770a996053f5552ddd747229a69c95ee0cae2","sha256":"f36b10c13a2d52b0f153f5b55c6b29e079281d20b97646fb11d47b1b9f6b4c93"}]}],"context":{"fact":"Capture links packets to code-graph nodes at write time; recall token budget stays opt-in/bounded. Personal Memory section trims first when over budget (ranks last); kage resume has its own ~800-token timeline cap; receipts use max(read-vs-source, replay discovery_tokens). Unchanged by 2.2.1."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-09T22:41:18.503Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"f36b10c13a2d52b0f153f5b55c6b29e079281d20b97646fb11d47b1b9f6b4c93","size":907519}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:graph-nodes-at-capture-opt-in-recall-token-budget-still-true-in-v2-2-0-178126514","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:51.295Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":78,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":["possible duplicate memory"],"duplicate_candidates":[{"id":"repo:https-github-com-kage-core-kage:decision:graph-nodes-at-capture-opt-in-recall-token-budget-still-true-in-v2-2-0-178126514","title":"graph_nodes at capture + opt-in recall token budget (still true in v2.2.0)","score":0.59,"status":"approved"}],"estimated_tokens_saved":74,"reverified_at":"2026-07-09T22:41:18.503Z","total_uses":0},"created_at":"2026-06-12T12:48:51.115Z","updated_at":"2026-07-09T22:41:18.503Z","author_branch":"master"}
```

