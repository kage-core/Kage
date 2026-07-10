# Kage Roadmap

This is a living document — directions, not promises, and no hard dates. It
exists so contributors can see where Kage is headed and find a place to jump in.
Want something that isn't here? [Open an issue](https://github.com/kage-core/Kage/issues)
or start a discussion.

Kage's core bet is verification: OKF (Google's Open Knowledge Format) made
agent memory a standard, plain-markdown-in-your-repo shape — Kage is the layer
that keeps that memory checked against your actual code instead of trusting it
forever. Everything below builds on that, not away from it.

Items tagged **`good first issue`** or **`help wanted`** are explicitly looking
for contributors.

## Now

The current focus.

- **README.md catching up to the product.** `kage proxy`, `kage cloud`, and
  `kage team` shipped as real, tested features and are already documented in
  `docs/guide.html` — README.md doesn't mention any of the three yet, and
  `docs/index.html` is silent on `proxy` and `team`.
- **A real design partner for Kage Cloud.** The self-hosted team server
  (`kage cloud`) is built and tested; the open question isn't more code, it's
  whether a real team wants to run it. Finding one design partner outranks
  hardening for hypothetical strangers.
- **Broader, more reliable agent coverage.** Keep the auto-wiring solid across
  Claude Code, Codex, Cursor, Windsurf, Gemini CLI, Cline, Goose, Roo Code,
  Kilo Code, OpenCode, Aider, and any MCP client.

## Next

Planned, not yet started.

- **Distribution presence.** First-class listings across MCP directories and
  agent plugin marketplaces.
- **Kage Cloud hardening.** TLS, rate limiting, and real auth beyond bearer
  tokens — gated on the design-partner signal above, not built ahead of it.
- **Viewer dashboard polish.** A clearer landing overview, better live-feed
  ergonomics, and faster graph rendering on large repos.
- **Scan/Truth Report depth.** More finding types and fewer false positives,
  every finding cited to `file:line`.

## Later

Directional, further out.

- Richer cross-repo / workspace intelligence (hidden coupling, shared contracts).
- Deeper personal-memory sync ergonomics over your own git remote.
- More benchmark coverage and reproducible harnesses.
- A managed, hosted Kage Cloud — only if the design-partner signal justifies
  the business decision (see `docs/CLOUD.md`'s decision log for the explicit
  gate).

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
