---
type: "Decision"
title: "Decision: Kage setup must verify active agent reachability, not just write config"
description: "Decision: Kage setup must verify active agent reachability, not just write config. CLI verification can confirm config, policy, indexes, recall, and code graph, but only MCP kage verify agent proves the current agent ses"
resource: "mcp/kernel.ts"
tags: ["session-learning", "activation", "ambient-memory", "codex", "daemon"]
timestamp: "2026-06-15T21:57:58.616Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-kage-setup-must-verify-active-agent-reachability-not-just-write-config-"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/index.ts", "mcp/daemon.ts", "README.md"]
---

# Decision: Kage setup must verify active agent reachability, not just write config

> Decision: Kage setup must verify active agent reachability, not just write config. CLI verification can confirm confi…

Decision: Kage setup must verify active agent reachability, not just write config. CLI verification can confirm config, policy, indexes, recall, and code graph, but only MCP kage_verify_agent proves the current agent session loaded Kage. The daemon should index on start and watch repo changes for graph refresh.
Verified by: npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-02T14:18:47.422Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-kage-setup-must-verify-active-agent-reachability-not-just-write-config-","title":"Decision: Kage setup must verify active agent reachability, not just write config","summary":"Decision: Kage setup must verify active agent reachability, not just write config. CLI verification can confirm config, policy, indexes, recall, and code graph, but only MCP kage verify agent proves the current agent ses","body":"Decision: Kage setup must verify active agent reachability, not just write config. CLI verification can confirm config, policy, indexes, recall, and code graph, but only MCP kage_verify_agent proves the current agent session loaded Kage. The daemon should index on start and watch repo changes for graph refresh.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","activation","ambient-memory","codex","daemon"],"paths":["mcp/kernel.ts","mcp/index.ts","mcp/daemon.ts","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T14:18:47.422Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:58.616Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"active","kind":"constant","sha256":"9f7bde308adc0c5d9cbba74f1c67a9e7f730e67037fee0682772d6443a410c94"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":174,"reverified_at":"2026-06-15T21:57:58.616Z","total_uses":0,"last_accessed_at":"2026-07-06T19:36:33.429Z"},"created_at":"2026-05-02T14:18:47.422Z","updated_at":"2026-07-03T16:16:26.702Z"}
```

