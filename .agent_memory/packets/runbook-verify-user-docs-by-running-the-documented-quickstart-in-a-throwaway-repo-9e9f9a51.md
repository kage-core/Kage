---
type: "Runbook"
title: "Verify user docs by running the documented quickstart in a throwaway repo"
description: "Reviewing docs by reading them misses deprecation. Running them catches it. A fresh repo smoke test git init, one source file, then init/index/learn/context exactly as written surfaced that 'kage recall' — documented as"
resource: "README.md"
tags: ["session-learning", "docs", "verification", "quickstart", "deprecation"]
timestamp: "2026-07-22T21:39:39.154Z"
x-kage-id: "repo:memory:runbook:verify-user-docs-by-running-the-documented-quickstart-in-a-throwaway-repo-178475"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["README.md", "mcp/README.md", "docs/USING_KAGE.md"]
---

# Verify user docs by running the documented quickstart in a throwaway repo

> Reviewing docs by reading them misses deprecation. Running them catches it. A fresh repo smoke test git init, one sou…

Reviewing docs by reading them misses deprecation. Running them catches it. A fresh-repo smoke test (git init, one source file, then init/index/learn/context exactly as written) surfaced that 'kage recall' — documented as THE way to query memory in README.md, mcp/README.md and the new manual — prints 'deprecated in v4, use kage context'. The supported verb is 'kage context', which returns memory plus code graph plus knowledge graph in one call. One real asymmetry to preserve when editing docs: 'recall' still owns --embeddings and --explain, which 'context' does not accept, so the embeddings docs correctly keep using recall. Method: write the smoke script to the scratchpad, run each documented command verbatim, and treat any deprecation banner or non-zero exit as a doc bug.
Evidence: Fresh repo at scratchpad/quickstart-smoke: init + index + learn succeeded, 'kage recall' emitted the v4 deprecation notice, 'kage context' returned the stored decision with grounding and 5 graph facts. Flag asymmetry confirmed by parsing the context dispatch block: only --changed-files/--json/--limit/--session/--targets.
Verified by: kage check: 0 confirmed drift, 79 verified true, exit 0

## Verification

Fresh repo at scratchpad/quickstart-smoke: init + index + learn succeeded, 'kage recall' emitted the v4 deprecation notice, 'kage context' returned the stored decision with grounding and 5 graph facts. Flag asymmetry confirmed by parsing the context dispatch block: only --changed-files/--json/--limit/--session/--targets.

# Citations

[1] explicit_capture (2026-07-22T21:39:39.154Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:runbook:verify-user-docs-by-running-the-documented-quickstart-in-a-throwaway-repo-178475","title":"Verify user docs by running the documented quickstart in a throwaway repo","summary":"Reviewing docs by reading them misses deprecation. Running them catches it. A fresh repo smoke test git init, one source file, then init/index/learn/context exactly as written surfaced that 'kage recall' — documented as","body":"Reviewing docs by reading them misses deprecation. Running them catches it. A fresh-repo smoke test (git init, one source file, then init/index/learn/context exactly as written) surfaced that 'kage recall' — documented as THE way to query memory in README.md, mcp/README.md and the new manual — prints 'deprecated in v4, use kage context'. The supported verb is 'kage context', which returns memory plus code graph plus knowledge graph in one call. One real asymmetry to preserve when editing docs: 'recall' still owns --embeddings and --explain, which 'context' does not accept, so the embeddings docs correctly keep using recall. Method: write the smoke script to the scratchpad, run each documented command verbatim, and treat any deprecation banner or non-zero exit as a doc bug.\nEvidence: Fresh repo at scratchpad/quickstart-smoke: init + index + learn succeeded, 'kage recall' emitted the v4 deprecation notice, 'kage context' returned the stored decision with grounding and 5 graph facts. Flag asymmetry confirmed by parsing the context dispatch block: only --changed-files/--json/--limit/--session/--targets.\nVerified by: kage check: 0 confirmed drift, 79 verified true, exit 0","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","docs","verification","quickstart","deprecation"],"paths":["README.md","mcp/README.md","docs/USING_KAGE.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-22T21:39:39.154Z"}],"context":{"fact":"Reviewing docs by reading them misses deprecation. Running them catches it. A fresh-repo smoke test (git init, one source file, then init/index/learn/context exactly as written) surfaced that 'kage recall' — documented as THE way to query memory in README.md, mcp/README.md and the new manual — prints 'deprecated in v4, use kage context'. The supported verb is 'kage context', which returns memory plus code graph plus knowledge graph in one call. One real asymmetry to preserve when editing docs: 'recall' still owns --embeddings and --explain, which 'context' does not accept, so the embeddings docs correctly keep using recall. Method: write the smoke script to the scratchpad, run each documented command verbatim, and treat any deprecation banner or non-zero exit as a doc bug.\nEvidence: Fresh repo at scratchpad/quickstart-smoke: init + index + learn succeeded, 'kage recall' emitted the v4 deprecation notice, 'kage context' returned the stored decision with grounding and 5 graph facts. Flag asymmetry confirmed by parsing the context dispatch block: only --changed-files/--json/--limit/--session/--targets.\nVerified by: kage check: 0 confirmed drift, 79 verified true, exit 0","verification":"Fresh repo at scratchpad/quickstart-smoke: init + index + learn succeeded, 'kage recall' emitted the v4 deprecation notice, 'kage context' returned the stored decision with grounding and 5 graph facts. Flag asymmetry confirmed by parsing the context dispatch block: only --changed-files/--json/--limit/--session/--targets."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-22T21:39:39.154Z","path_fingerprints":[{"path":"README.md","sha256":"23b24d58362ee698504b43f798544320fbaa06809281b974094de249f52fdd53","size":17108},{"path":"mcp/README.md","sha256":"0dd833ae7e088a25f31ffcf6c385cb309d462174683371b8041c64c14c623ff4","size":10812},{"path":"docs/USING_KAGE.md","sha256":"3177fa6a83b7568799d2aa61d60b25f4a7325044c63712ed009fc63f6ad2b78c","size":9072}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":297},"created_at":"2026-07-22T21:39:39.154Z","updated_at":"2026-07-22T21:39:39.154Z","author_branch":"codex/kage-vnext-implementation","author_name":"Kushal Jain"}
```

