# Kage Roadmap

This is a living document — directions, not promises, and no hard dates. It
exists so contributors can see where Kage is headed and find a place to jump in.
Want something that isn't here? [Open an issue](https://github.com/kage-core/Kage/issues)
or start a discussion.

Items tagged **`good first issue`** or **`help wanted`** are explicitly looking
for contributors.

## Now

The current focus.

- **Cold-start value, made visible.** Surface what the memory loop saved you
  from the first session — recall receipts and the gains ledger, shown without
  asking. Solo value at minute 1, not just team value at day 30.
- **Shareable Truth Report scorecards.** `kage scan --scorecard` emits a
  screenshot-able SVG/Markdown card so a 60-second scan becomes something you
  can post.
- **Broader, more reliable agent coverage.** Keep the auto-wiring solid across
  Claude Code, Codex, Cursor, Windsurf, Gemini CLI, Cline, Goose, Roo Code,
  Kilo Code, OpenCode, Aider, and any MCP client.

## Next

Planned, not yet started.

- **Distribution presence.** First-class listings across MCP directories and
  agent plugin marketplaces.
- **Team-memory workflows.** Smoother review of memory changes in the same PR as
  the code — conflict handling, branch overlays, reviewer hints.
- **Viewer dashboard polish.** A clearer landing overview, better live-feed
  ergonomics, and faster graph rendering on large repos.
- **Scan/Truth Report depth.** More finding types and fewer false positives,
  every finding cited to `file:line`.

## Later

Directional, further out.

- Richer cross-repo / workspace intelligence (hidden coupling, shared contracts).
- Deeper personal-memory sync ergonomics over your own git remote.
- More benchmark coverage and reproducible harnesses.

## Ideas (help wanted)

Approachable, well-scoped, and a great way to get started. Many of these are or
will be tagged `good first issue`.

- **Better error messages.** Make failures self-explanatory and actionable — **`good first issue`**.
- **Docs tightening.** Fix anything stale or unclear in `docs/` or the README — **`good first issue`**.
- **Scorecard themes.** Light-mode / compact variants of the scan scorecard — **`help wanted`**.
- **New scan finding types.** Propose a knowledge-risk signal we don't surface yet — **`help wanted`**.
- **Agent integrations.** Wiring/verification for an MCP client we don't cover yet — **`help wanted`**.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to set up a dev environment and
open a PR.
