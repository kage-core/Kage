# Kage — Agent Memory

This project uses Kage for persistent agent memory.

## Rules

- Invoke `kage-distiller` **immediately inline** when you fix a bug, make a design decision, figure out a setup step, discover a pattern, or map an integration — do NOT wait for session end
- Invoke `kage-memory` before implementing auth, API patterns, database operations, or any domain-specific feature
- Do **NOT** read `.agent_memory/` files directly — always delegate to `kage-memory`
- Review pending nodes with `/kage review`

## Memory Tiers

| Tier | Location | Shared with |
|---|---|---|
| Project | `.agent_memory/` (committed) | Whole team via git |
| Personal | `~/.agent_memory/` | You only, across all projects |
| Global | `kage-core/kage-graph` (live HTTP) | Everyone, no install needed |

**Decision rule:** Does this knowledge expire when you leave the project?
- Yes → project tier
- No → personal tier
- Generic enough for strangers → `/kage submit` to the global graph

## Commands

```
/kage review             — approve/reject pending nodes
/kage prune              — deprecate outdated nodes
/kage digest             — regenerate SUMMARY.md
/kage submit <file>      — contribute a node to the global graph
/kage search <query>     — search the global knowledge graph
/kage fetch <id>         — fetch a specific node from the global graph
/kage rebuild-indexes    — reconstruct indexes from node frontmatter
```
