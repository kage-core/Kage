---
type: "Decision"
title: "Setup doctor surfaces Claude ambient hook readiness"
description: "Kage setup doctor now uses the same Claude Code ambient hook summary as verify agent. setupDoctor accepts a homeDir/serverPath option, marks Claude Code as not configured when MCP config exists but required ambient hooks"
resource: "mcp/kernel.ts"
tags: ["session-learning", "claude-code", "hooks", "setup-doctor"]
timestamp: "2026-06-15T21:58:15.339Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:setup-doctor-surfaces-claude-ambient-hook-readiness-1779059970990"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/cli.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Setup doctor surfaces Claude ambient hook readiness

> Kage setup doctor now uses the same Claude Code ambient hook summary as verify agent. setupDoctor accepts a homeDir/s…

Kage setup doctor now uses the same Claude Code ambient hook summary as verify-agent. setupDoctor accepts a homeDir/serverPath option, marks Claude Code as not configured when MCP config exists but required ambient hooks or hook scripts are missing, and the CLI prints missing hook events/scripts. This makes partial installs visible before teammates rely on automatic prompt recall, observation, and distillation.
Verified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'

## Verification

npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'

# Citations

[1] explicit_capture (2026-05-17T23:19:30.990Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:setup-doctor-surfaces-claude-ambient-hook-readiness-1779059970990","title":"Setup doctor surfaces Claude ambient hook readiness","summary":"Kage setup doctor now uses the same Claude Code ambient hook summary as verify agent. setupDoctor accepts a homeDir/serverPath option, marks Claude Code as not configured when MCP config exists but required ambient hooks","body":"Kage setup doctor now uses the same Claude Code ambient hook summary as verify-agent. setupDoctor accepts a homeDir/serverPath option, marks Claude Code as not configured when MCP config exists but required ambient hooks or hook scripts are missing, and the CLI prints missing hook events/scripts. This makes partial installs visible before teammates rely on automatic prompt recall, observation, and distillation.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","claude-code","hooks","setup-doctor"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/cli.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:19:30.990Z"}],"context":{"fact":"Kage setup doctor now uses the same Claude Code ambient hook summary as verify-agent. setupDoctor accepts a homeDir/serverPath option, marks Claude Code as not configured when MCP config exists but required ambient hooks or hook scripts are missing, and the CLI prints missing hook events/scripts. This makes partial installs visible before teammates rely on automatic prompt recall, observation, and distillation.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'","verification":"npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:15.339Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"serverpath","kind":"constant","sha256":"68c9bd02d80a4ea5bf1bd47b20319ba062fc3ab94c9aa9384d8408f278a36a72"},{"name":"setupdoctor","kind":"function","sha256":"95d71994920b4411ae6878a3f6c001ffcb59a525a6bb72a811daf675112787b2"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"doctor","kind":"constant","sha256":"64f4dea667b9fe091ab2751b52513175faaed7c1fc7206ffee9c115c0684ab5b"},{"name":"exists","kind":"constant","sha256":"6e189541e5576d06e12aa58020ef745bc5b3fb28d4371336d421eb5bc4ab9af8"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"config","kind":"constant","sha256":"dadedb2c7835eb30472da759f3e2177ea09582ea0ac93eaf2fdc871ba1720bde"},{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"},{"name":"partial","kind":"constant","sha256":"f9e4183f517a106cecc182a13a4123aef78b16eeee87eccb096b62a7aacda8f5"},{"name":"missing","kind":"constant","sha256":"8c9fa6e4673545533b5cdc9a6ac45e775f0fb7ec7d969a7602c2d97d1411b01e"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"missing","kind":"constant","sha256":"1f67f0b431b553dcc4e02753e1a22a41a1e80566f743e181f9c8c7fe1d240f02"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"summary","kind":"constant","sha256":"0938b0afc17695033381e2248401bba9b7c6abb6f9f0eaae0d2a8ff2c660d662"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":2,"votes_down":0,"uses_30d":7,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":130,"reverified_at":"2026-06-15T21:58:15.339Z","total_uses":7,"last_accessed_at":"2026-07-03T07:16:42.317Z"},"created_at":"2026-05-17T23:19:30.990Z","updated_at":"2026-07-03T16:16:26.717Z"}
```

