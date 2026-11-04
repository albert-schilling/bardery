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

## The Factory's agents

The Factory's phase agents are in `.claude/agents/factory-*.md`; each ends with the result format in `.agents/skills/factory-result/`. They name nothing of Bardery's own: they read paths, labels, the validate command, test file globs and risk tiers from `.claude/factory.json`, and `factory-agents.test.ts` fails if a value from that file appears in them. JSON has no comments, so the reasons live here:

- `testFiles` also covers test helpers (`test-*.ts`, `test-*.sh`) and Vitest configs, because changing them can make a failing test pass.
- `riskTiers`: for each changed path the first rule that matches sets its tier, so the high-tier paths come before the low-tier docs and tests; the change takes its paths' highest tier.

`factory-implementer` runs the PreToolUse hook `.claude/hooks/protect-test-files.ts`, which denies edits to test files and tells the agent to stop and report. `.claude/hooks` links to `tools/harness/src/factory/`, because Nx counts a change under `.claude/` towards no project, so the hook's tests would never run as affected.

## Gotchas

- oxfmt formats SCSS and CSS (checked with oxfmt 0.70), so it owns formatting of styles; Stylelint only lints them.
- A nested `.oxlintrc.json` replaces the root one instead of merging with it. Even with `extends` it loses the root's path-based `overrides`, so per-folder rules go in the root config with paths from the repo root.
- A package script whose name is an Nx command (`migrate`, `release`, `graph`, …) can't be run as `pnpm nx <name> <project>`: Nx runs its own command. Name targets so they don't shadow one.
- oxlint's regexes (e.g. `no-restricted-imports` `regex` patterns) have no lookahead; a pattern with `(?!…)` silently matches nothing. Use `group` patterns with `!` negation instead.
