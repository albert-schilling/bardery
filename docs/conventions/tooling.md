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

## The Factory

A person starts a run with `/factory <issue>`, the skill in `.agents/skills/factory/`. It dispatches the phase agents in `.claude/agents/factory-*.md`, each of which ends with the result format in `.agents/skills/factory-result/`. None of them names anything of Bardery's own: they read paths, labels, commands, test file globs and risk tiers from `.claude/factory.json`, and `factory-agents.test.ts` fails if a value from that file appears in them, or if the skill names a `config.<key>` the file doesn't have. JSON has no comments, so the reasons live here:

- `setup` runs in a run's fresh worktree, which has no `node_modules`.
- `pullRequestSkill` names the skill that shapes a pull request body.

- `testFiles` also covers test helpers (`test-*.ts`, `test-*.tsx`, `test-*.sh`) and Vitest configs and setup files, because changing them can make a failing test pass. `factory-agents.test.ts` fails if a tracked file named like one of them is missing from the globs.
- `riskTiers`: for each changed path the first rule that matches sets its tier, so the high-tier paths come before the low-tier docs and tests; the change takes its paths' highest tier.

`factory-implementer` runs the PreToolUse hook `.claude/hooks/protect-test-files.ts`, which denies edits to test files and tells the agent to stop and report. `.claude/hooks` links to `tools/harness/src/factory/`, so the hook is typechecked, linted and tested with the harness.

Nx counts a file towards no project unless it lies under a project's folder, so a change only to `.claude/` or `.agents/` would skip the harness tests that check them. `.claude/project.json` and `.agents/project.json` make them projects without targets, and the harness depends on both (`implicitDependencies` in `tools/harness/project.json`).

## Gotchas

- oxfmt formats SCSS and CSS (checked with oxfmt 0.70), so it owns formatting of styles; Stylelint only lints them.
- A nested `.oxlintrc.json` replaces the root one instead of merging with it. Even with `extends` it loses the root's path-based `overrides`, so per-folder rules go in the root config with paths from the repo root.
- A package script whose name is an Nx command (`migrate`, `release`, `graph`, …) can't be run as `pnpm nx <name> <project>`: Nx runs its own command. Name targets so they don't shadow one.
- oxlint's regexes (e.g. `no-restricted-imports` `regex` patterns) have no lookahead; a pattern with `(?!…)` silently matches nothing. Use `group` patterns with `!` negation instead.
- Claude Code skips an agent's frontmatter hooks until the folder's workspace trust dialog has been accepted, and logs it only to the debug log; a fresh cloud container hasn't accepted it. Check a hook with `--debug` or by passing it through `--settings`.
- An agent's `skills:` preload reaches it only when it runs as a sub-agent; `claude --agent <name>` starts it without them.
- In a Claude Code cloud session, an image build can't reach npm: the agent proxy listens on the host's `127.0.0.1`, and its CA isn't trusted inside the build (`SELF_SIGNED_CERT_IN_CHAIN`), so `test-image` fails there. Docker's daemon may not be running either (start `dockerd`). To run an image's checks anyway, work in a scratch folder outside the repository:
  1. Copy the image's Dockerfile and its `Dockerfile.dockerignore` there, side by side; without the ignore file, host `node_modules` enter the build. In the copy, add `COPY --from=ca ca-bundle.crt /ca.crt` and `ENV NODE_EXTRA_CA_CERTS=/ca.crt npm_config_cafile=/ca.crt` after the build stage's `WORKDIR`.
  2. From the repository root, run `docker build --network host --build-arg HTTPS_PROXY=$HTTPS_PROXY --build-context ca=/root/.ccr --file <copy> --tag <the tag test-image.sh uses> …`.
  3. Copy `test-image.sh`, delete its `docker build` line and set its repository root to an absolute path, then run the copy. The original rebuilds without the CA. The image tests are the only check that catches a broken bundle (#36's server image crashed at startup in CI).
- A git worktree inside the repository (a Factory run's, under `.claude/worktrees/`) holds a second copy of every `project.json`, so Nx refuses to start and oxfmt checks every file twice. `.gitignore` excludes `.claude/worktrees/`, which all three tools respect.
