# Bardery

An interactive storytelling app: AI writes and illustrates a Story, and the reader decides how it continues. It is also a public reference for a production-ready, AI-powered full-stack app on Azure. See [`README.md`](README.md).

## Where decisions live

Read the relevant source before you design anything; decisions are already made there.

- [`GLOSSARY.md`](GLOSSARY.md): the glossary. Use its terms in code, tests, commits and PRs, and avoid the words it lists under _Avoid_.
- [`docs/adr/`](docs/adr/): architecture decisions.
- [`docs/grilling/`](docs/grilling/): the product (Q1–Q33), technical (Q34–Q93) and Factory (Q94–Q132) decisions, numbered. Issues cite them as Q numbers.
- [`docs/prd/walking-skeleton.md`](docs/prd/walking-skeleton.md): the current deliverable and the order of its slices.
- [`docs/design/`](docs/design/): the UI prototype.
- [`infra/README.md`](infra/README.md): Terraform layout and one-time setup.

## Conventions

`pnpm validate` runs what CI runs. A Stop hook runs it at the end of every Claude Code turn and keeps the turn going while it fails; when the next try fails the same way, the turn ends and shows the failure.

- [`docs/conventions/tooling.md`](docs/conventions/tooling.md): commands, and tool behaviour that has surprised us. Read it before you run, configure or debug a tool.
- [`docs/conventions/code.md`](docs/conventions/code.md): project layout, imports, config files, comments and TypeScript types. Read it before you write code or config.
- [`docs/conventions/deployment.md`](docs/conventions/deployment.md): build-time and per-environment values. Read it before you change how an app is built, configured or deployed.
- [`docs/conventions/accessibility.md`](docs/conventions/accessibility.md): what a client must do for assistive technology. Read it before you change what a client shows.
- [`docs/conventions/pull-requests.md`](docs/conventions/pull-requests.md): size, tests, screenshots, workflow files and the harness log. Read it before you commit, push or open a PR.
- [`docs/conventions/issues-and-records.md`](docs/conventions/issues-and-records.md): the issue template, labels, and how decision records name tools. Read it before you write an issue, ADR, grilling record or PRD.
