# Bardery

An interactive storytelling app: AI writes and illustrates a Story, and the reader decides how it continues. It is also a public reference for a production-ready, AI-powered full-stack app on Azure. See [`README.md`](README.md).

## Where decisions live

Read the relevant source before you design anything; decisions are already made there.

- [`CONTEXT.md`](CONTEXT.md): the glossary. Use its terms in code, tests, commits and PRs, and avoid the words it lists under _Avoid_.
- [`docs/adr/`](docs/adr/): architecture decisions.
- [`docs/grilling/`](docs/grilling/): the product (Q1–Q33) and technical (Q34–Q93) decisions, numbered. Issues cite them as Q numbers.
- [`docs/prd/walking-skeleton.md`](docs/prd/walking-skeleton.md): the current deliverable and the order of its slices.
- [`docs/design/`](docs/design/): the UI prototype.
- [`infra/README.md`](infra/README.md): Terraform layout and one-time setup.

## Commands

Node and pnpm versions are pinned in `.node-version` and `package.json`.

- `pnpm install`: also installs the lefthook git hooks, which format and lint staged files.
- `pnpm format` / `pnpm format:check`: oxfmt.
- `pnpm lint`: oxlint, with type-aware rules.
- `pnpm nx show projects`, `pnpm nx run-many -t <target>`: project tasks.

## Conventions

- Small PRs: one issue per PR, about 300 changed lines at most, not counting lock files.
- Every change comes with tests.
- Decision records (ADRs, grilling records, PRDs, issues) name tools, not versions; `package.json` and the lockfile pin versions. State a minimum only when a decision depends on it.
- A PR that changes the web app shows screenshots of each changed screen at phone (390px) and desktop (1280px) width, taken from the running app with Playwright. Commit them under `.github/pr-screenshots/`, embed them by that commit's SHA (`https://raw.githubusercontent.com/albert-schilling/bardery/<sha>/.github/pr-screenshots/<file>`), and delete them in the next commit so they never reach `main`.
- Config files stay close to tool defaults; each deviation gets a one-line comment saying why.
- After a PR is merged, add a line to [`docs/harness-log.md`](docs/harness-log.md).

## Tooling notes

- oxfmt formats SCSS and CSS (checked with oxfmt 0.70), so it owns formatting of styles; Stylelint only lints them.
- A nested `.oxlintrc.json` replaces the root one instead of merging with it, so it must `extends` the root config.
