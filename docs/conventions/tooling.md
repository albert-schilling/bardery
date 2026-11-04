# Tooling

## Commands

Node and pnpm versions are pinned in `.node-version` and `package.json`.

- `pnpm install`: also installs the lefthook git hooks, which format and lint staged files.
- `pnpm validate`: everything CI's `checks` job runs: `format:check`, `lint`, and the `lint`, `typecheck`, `test`, `build`, `test-image` and `check-migrations` targets of the projects affected since `main`. The server's tests and the image tests need Docker.
- `pnpm format` / `pnpm format:check`: oxfmt.
- `pnpm lint`: oxlint, with type-aware rules.
- `pnpm nx show projects`, `pnpm nx run-many -t <target>`: project tasks.

## The Stop hook

`.claude/settings.json` runs [`tools/harness/src/stop-hook.sh`](../../tools/harness/src/stop-hook.sh) when a Claude Code turn ends. It runs `pnpm validate`, prints nothing on success, and on failure returns the output with exit code 2, so the turn continues until the checks pass. Its timeout is 20 minutes, because a change that affects every project builds and tests the images. JSON has no comments, so the reason lives here.

## Gotchas

- oxfmt formats SCSS and CSS (checked with oxfmt 0.70), so it owns formatting of styles; Stylelint only lints them.
- A nested `.oxlintrc.json` replaces the root one instead of merging with it. Even with `extends` it loses the root's path-based `overrides`, so per-folder rules go in the root config with paths from the repo root.
- A package script whose name is an Nx command (`migrate`, `release`, `graph`, …) can't be run as `pnpm nx <name> <project>`: Nx runs its own command. Name targets so they don't shadow one.
- oxlint's regexes (e.g. `no-restricted-imports` `regex` patterns) have no lookahead; a pattern with `(?!…)` silently matches nothing. Use `group` patterns with `!` negation instead.
