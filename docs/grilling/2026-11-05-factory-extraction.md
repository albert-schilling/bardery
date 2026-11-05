# Grilling session 4: the Factory leaves Bardery (2026-11-05)

Record of the session that moved the Factory's generic pieces out of Bardery: Q123–Q132. It revises [grilling session 3](2026-11-04-factory-session.md): Q123 replaces Q121 and Q122, and Q120 still holds. It replaces the plan of #58, which mirrored the pieces from Bardery.

Answers are final.

## Home

- **Q123 Source of truth**: [`albert-schilling/skills`](https://github.com/albert-schilling/skills) holds the Factory's generic pieces. Bardery and Poligent install them from there and use the Factory side by side. The skills repository's README calls the Factory experimental and no longer says it is developed in Bardery. Until Bardery installs from it, Bardery's copies are frozen: a change to a generic piece goes to the skills repository.
- **Q124 Where changes go**: when a run's retro proposes a change to a generic piece, it becomes a pull request or an issue in the skills repository. Changes to a project's own config, conventions and checks stay in that project.
- **Q125 What's generic**: the orchestrator skill, the result format, the phase agents and the hooks, plus what every project starts from: a schema and a template for `factory.json`, the stack-independent conventions (pull request size, tests with every change, the harness log, commit labels, decision records naming tools, comments that give reasons, config close to defaults, workflow files checked before pushing), the issue template, the labels, the harness log's tables, and the risk-tier categories. Setup writes the starting files into a project, and from then on the project owns them. Stack-specific conventions (Bardery's oxlint, Nx and Azure notes) stay in their project.
- **Q126 Tests of the pieces**: they run only where the Factory is maintained: in the skills repository's CI, and in Bardery's harness project while Bardery keeps its copies. Setup doesn't add them to a project's `validate`, which checks the project, not the Factory.

## Independence

- **Q127 Self-contained**: the Factory uses no third-party skills. It brings its own pull-request skill and security reviewer, written from scratch, in place of Pocock's `pr` and Claude Code's `security-review`. A project may keep other skills installed for people to use; the Factory doesn't call them.
- **Q128 Coding agents**: the skills describe what to do in neutral terms ("start the phase's agent", "ask the person"), and one adapter file per coding agent maps them to its tools and formats. The agent definitions and hook scripts live inside the Factory's skill folder, because `npx skills` installs only skill folders: tried on a repository with `.claude/agents/` and `.claude/hooks/`, it installed the skill and skipped both without saying so. A hook's logic takes a tool call and returns allow or deny; a thin wrapper speaks each coding agent's hook protocol. Claude Code is the only adapter for now.

## Setup

- **Q129 `factory-setup`**: one skill sets up a project. It detects the coding agent and the stack, reads the repository, and asks the person only what it can't find out. It writes `factory.json`, the starting conventions, an `AGENTS.md` index (or links them from the existing one), the issue template, the harness log and, when the project has none, a `validate` script, and it installs the agents and hooks the way the coding agent expects. It maps the risk-tier categories to the project's paths, asking where it can't tell. Run again, it changes nothing the project owns without asking.
- **Q130 No manual steps**: setup creates the labels with `gh` when it can, and otherwise prints the commands to run. For a coding agent without the hooks or sub-agents the Factory needs, it says what is missing, offers to continue, and files an issue (or, without `gh`, leaves a note in the harness log) that this needs to be investigated.
- **Q131 Installing**: `npx skills add albert-schilling/skills`, then `/factory-setup`.

## Building it

- **Q132 Order**: this record first. Then one pull request in the skills repository with all of the above: the pieces, the adapter, our own pull-request skill and security reviewer, `factory-setup`, the license, the README and CI. It is larger than 300 lines because it is the repository's first content. Then an issue to install the Factory in Bardery from the skills repository and remove Bardery's copies, waiting on that pull request. Then Poligent installs it.
