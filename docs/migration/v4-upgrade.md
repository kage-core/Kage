# Upgrading to Kage v4

Kage v4 makes the focused vNext product surface the default. This is a **surface** change, not a
behavior removal: everything you relied on still works, and the local-first, fail-open guarantees are
unchanged. This guide tells you exactly what moved and what to do.

## TL;DR

- The **default MCP tool surface is now three verbs**: `kage_context`, `kage_retrieve`,
  `kage_feedback`. Capture, refresh, and review flow through the ambient proxy and the local portal,
  so they no longer bloat the model's always-loaded tool list.
- The **primary CLI surface** is `connect`, `status`, `open`, `doctor`, `export`, `migrate` (plus the
  getting-started commands `install` / `up` / `run` / `context` / `check` / `setup`).
- **Pre-vNext commands are deprecated, not deleted.** They still run for one major version and are
  removed in v5. See [`v4-command-map.md`](./v4-command-map.md) for every command's replacement.
- Nothing about local context or export depends on a workspace being reachable. A workspace outage or
  an expired entitlement still leaves local runtime and `workspace export` fully working.

## 1. MCP configuration

The default surface an MCP client always-loads is now:

```
kage_context      recall verified memory + query the code/knowledge graph (start here)
kage_retrieve     retrieve an exact, fingerprint-verified reversible original by content reference
kage_feedback     mark recalled memory helpful / wrong / stale
```

If your agent config **names an old tool** (for example `kage_learn`, `kage_memory_timeline`,
`kage_risk`), set an environment variable to keep the legacy registry for one major version:

```bash
KAGE_TOOLS=legacy   # exposes the full legacy tool registry; each description carries a deprecation note
KAGE_TOOLS=full     # complete internal registry (no deprecation notes) — development only
KAGE_TOOLS=vnext    # explicit spelling of the new default (the three verbs)
```

There is nothing to change if you only ever used `kage_context`.

## 2. CLI commands

Run `kage help` for the v4 surface and `kage help --all` for the full reference.

A deprecated command still runs, but prints one line to **stderr** first — the single supported
replacement, the v5 removal notice, and a link to the command map. You can also call any deprecated
command explicitly:

```bash
kage legacy <command> ...     # run a deprecated command on purpose
kage legacy --help            # the full legacy → replacement map
kage legacy scan --project .  # list scripts/config in this repo that still call a deprecated command
```

### Find and fix your scripts

Before you pin to v5, run the migration scan across any repo or CI config:

```bash
kage legacy scan --project /path/to/repo          # human-readable
kage legacy scan --project /path/to/repo --json   # machine-readable (file, line, command, replacement)
```

Each hit names the file, the line, the deprecated command, and its supported replacement (or flags it
as removed). Swap `kage recall` → `kage context`, `kage gains` → `kage receipts`, and so on per the
[command map](./v4-command-map.md).

## 3. Privacy of deprecation telemetry

To help you find lingering usage, Kage records a deprecated invocation locally — **only** the command
name, the version, and a timestamp, in `$KAGE_HOME/legacy-usage.jsonl` (default
`~/.kage/legacy-usage.jsonl`). Arguments are never recorded, because they can carry private paths or
query text. Recording is best-effort and never blocks the command.

## 4. What did not change

- **Local-first, fail-open.** Local context and export never depend on the team workspace. A workspace
  outage leaves local context and `workspace export` fully working.
- **The frozen wire protocol.** The vNext message contract is unchanged.
- **Your memory.** `.agent_memory/packets/` and the repository model are untouched by this cutover; no
  packet is migrated, deleted, or made injectable by upgrading.
- **Entitlements.** An expired paid entitlement keeps `local_runtime` and `workspace_export` true.

## 5. Removal timeline

| Version | State |
| --- | --- |
| v4 | Deprecated commands and legacy tools remain callable (`kage legacy`, `KAGE_TOOLS=legacy`), each with a deprecation notice. |
| v5 | Deprecated commands and the legacy tool registry are removed. Only the supported v4 surface remains. |
