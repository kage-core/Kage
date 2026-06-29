# Contributing to Kage

Thanks for your interest in Kage! Kage is git-native, verified memory for coding
agents — zero dependencies, no account, no cloud, everything stays in your repo.
We'd love your help making it better.

This guide is short and practical. If anything here is unclear or out of date,
that itself is a great first contribution — open an issue or PR.

## Quick start

Kage's code is a TypeScript MCP package under [`mcp/`](./mcp). To get a dev
environment running:

```bash
cd mcp && npm install && npm test && npm run build
```

That's the whole loop: install, test, build. From the repo root you can also run
tests with:

```bash
npm test --prefix mcp
```

Requirements:

- **Node.js 18+**
- That's it. Kage has **zero runtime dependencies** and we intend to keep it
  that way (see [The zero-dependency rule](#the-zero-dependency-rule)).

## Project structure

| Path            | What lives there                                                        |
| --------------- | ----------------------------------------------------------------------- |
| `mcp/`          | The TypeScript MCP package — all source, CLI, and tests. This is the core. |
| `plugin/`       | Editor/agent plugin assets.                                             |
| `skills/`       | Reusable skills shipped with Kage.                                      |
| `docs/`         | Documentation and the published guide.                                  |
| `.agent_memory/`| Kage's own memory store (Kage dogfoods itself — see below).             |

Inside `.agent_memory/`:

- `packets/` — durable JSON memory packets (committed to git).
- `graph/`, `code_graph/`, `structural/`, `indexes/` — derived artifacts,
  rebuildable any time with `kage refresh`.
- `reports/` — generated reports.

## Running tests

The `npm test` script builds TypeScript first, then runs Node's test runner over
the compiled `dist/*.test.js` files. So a passing test run also proves the build
is healthy.

```bash
cd mcp
npm test          # build + run the full suite
npm run build     # build only
```

Please make sure `npm test` passes before opening a PR.

## The zero-dependency rule

Zero runtime dependencies is a core project value, not an accident. It keeps
Kage fast to install, easy to audit, and safe to run anywhere — no supply chain
to worry about, no surprise network calls.

**PRs that add a runtime dependency will be rejected.** If you think you need
one, open an issue first and let's talk through it — there's almost always a way
to do it with the standard library. (Dev-only tooling is a separate
conversation; still, prefer the minimum.)

## Coding conventions

- **Match the surrounding code.** Follow the style, naming, and patterns already
  present in the file you're editing rather than introducing your own.
- Keep changes focused — one logical change per PR.
- TypeScript with explicit, readable types. Favor clarity over cleverness.
- No new runtime deps (see above).

## Proposing changes

1. **Branch** off `master`.
2. Make your change with **tests** — new behavior needs new or updated tests.
3. Run `cd mcp && npm test` and make sure it's green.
4. Open a **PR** against `master`. Fill out the PR template checklist.
5. A maintainer will review. Be patient and responsive — we're a small team and
   we read everything.

## Kage dogfoods itself

Kage uses Kage. When your change affects behavior, the relevant memory packets in
`.agent_memory/packets/` are part of the change and are **reviewed in the same
PR**. If you're using a Kage-enabled agent, it can propose these updates for you
(`kage refresh`, then `kage propose-from-diff` / `kage pr-summarize`). If not,
that's fine — a maintainer can help regenerate them. Don't hand-edit derived
artifacts; they're rebuildable with `kage refresh`.

## Good first issues

New here? Look for issues labeled
[`good first issue`](https://github.com/kage-core/Kage/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
These are scoped to be approachable without deep knowledge of the codebase.
Tightening docs or improving error messages are great places to start.

Have an idea that isn't filed yet? Open an issue describing it, or start a
discussion. We'd rather hear from you early.

## Code of Conduct

By participating you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

Kage is licensed under **GPL-3.0-only**. By contributing, you agree that your
contributions will be licensed under the same license. (Releases before the GPL
switch were MIT.)
