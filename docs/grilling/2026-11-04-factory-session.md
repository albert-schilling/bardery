# Grilling session 3: the Factory (2026-11-04)

Record of the session that settled the shape of the Factory's first iteration (issue #34): Q94–Q122. It follows the research in [`docs/research/2026-10-21-software-factory.md`](../research/2026-10-21-software-factory.md) (authors, gaps G1–G33) and [`docs/research/2026-11-03-software-factory-papers.md`](../research/2026-11-03-software-factory-papers.md) (58 papers from 2026). The design tree has no open branches; the next step is the build issues below.

Answers are final. Where an answer was revised during the session, only the final one is listed.

## What the Factory is for

The Factory is the agent workflow that turns an issue into a merged pull request. It produces trust and quality explicitly, not only features. It is neither a "lights-off" factory nor line-by-line human review: it keeps producing and stops the moment it needs steering (Toyota's _jidoka_), and every answer to a stop is recorded so the same question isn't asked twice.

## Scope and home

- **Q94 Iteration 1**: a supervised pipeline, started by a person for one issue at a time, plus the minimum harness it needs (Q109). No unattended runs and no scheduled groomers; they come in later iterations, once the stops and checks have proven themselves.
- **Q95 Where it's built** (replaced by [Q123](2026-11-05-factory-extraction.md#home)): in Bardery (`.agents/skills/`, `.claude/agents/`).
- **Q96 Relation to the installed skills**: our own orchestrator and phase skills. Pocock's discipline skills (`codebase-design`, `domain-modeling`, `grilling`, `code-review`, `pr`, `diagnosing-bugs`) are reused; one we need to change is forked into a Bardery-owned copy, never edited in place. His `implement` isn't used because it runs `tdd` in the implementing agent.
- **Q97 Unit of work**: one issue, one pull request, about 300 changed lines, as today. A planner that finds an issue too big stops and proposes a split.
- **Q99 Name**: "Factory". Skills and agents are named `factory-*`. [`CONTEXT.md`](../../CONTEXT.md) has an _Engineering_ section for its terms.
- **Q120 Built for extraction**: generic pieces (orchestrator skill, phase agents, hooks) never name Bardery's paths, labels or conventions; they read them from one config file. Bardery's own knowledge lives outside them: `docs/conventions/`, `REVIEW.md`, risk-tier path rules, gotchas.
- **Q121 Extraction** (replaced by [Q123](2026-11-05-factory-extraction.md#home)): the generic pieces are mirrored to [`albert-schilling/skills`](https://github.com/albert-schilling/skills) from the start, so the Factory can be shown now. It may be replaced after five runs; it counts as stable after five Factory runs in a row that change only Bardery's conventions and checks, not the generic pieces.
- **Q122 Source of truth** (replaced by [Q123](2026-11-05-factory-extraction.md#home)): Bardery. The skills repository is a mirror that trails it, updated after each Factory pull request merges; its README says it is developed in Bardery and is experimental. Bardery doesn't install from it.

## How a run works

- **Q100 Mechanism**: a user-invoked skill, `/factory <issue>`, runs in the main session. It dispatches custom sub-agents (`.claude/agents/*.md`, each with its own model, effort, tools and hooks) one after another and relays their questions, because sub-agents can't ask the user themselves.
- **Q101 Phases** (the Factory's standard work):
  1. **Intake**: is the issue ready (Q113)? If not, stop.
  2. **Research**: facts about the code as it is. Questions are derived from the issue in one context; a fresh context answers them without seeing the issue, so it reports facts, not opinions.
  3. **Alignment document**: design discussion (current and target state, patterns to follow, decisions, open questions), structure outline (signatures, new types, seams with their interface comments, vertical slices in order), test plan (acceptance criterion → test), and risk tier.
  4. **Review of the alignment document** by the person running the Factory: the one planned stop.
  5. **Test-writer**: tests at the agreed seams, from the acceptance criteria.
  6. **Implementer.**
  7. **Test-writer, second pass**: did the implementation go further than the tests? If so, add tests.
  8. **Reviewers** (Q108).
  9. **Verify**: the single command that runs what CI runs.
  10. **Pull request**, with merge danger (one-way or two-way door, blast radius), risk tier and evidence.
  11. **Retro** (Q115).
- **Q104 Stops**: any phase may stop when something is unclear, instead of assuming. A sub-agent's result is structured: `done`, or `blocked` with numbered questions, each with a recommended answer. The orchestrator asks the user and records the answer where it belongs: issue-specific answers in the issue; conventions (naming, tests, structure) in the matching `docs/conventions/` file, from where they can become checks; product and domain decisions in `CONTEXT.md`, an ADR or a grilling record. Then the phase resumes.
- **Q105 State**: the issue and the pull request hold the Factory's state. Each artifact (research summary, alignment document, test plan) is one issue comment, edited in place; review findings and evidence go in the pull request. No planning files are committed, so they can't go stale in the repo.
- **Q112 Intake gate and first runs**: only issues labelled `ready-for-agent` enter; a person applies the label. The first real run is #11 _Invites_, once #10 _Sign-in_ (in review as #46) is merged. It is high tier, so the person reads its code. (#12 _Profiles_ was proposed first, but it depends on #11.)
- **Q113 Issue format**: an issue template in `.github/ISSUE_TEMPLATE/` with Goal, Context, Acceptance criteria, Out of scope and How to verify, the sections the skeleton issues already use. Intake stops with `needs-info` when one is missing.
- **Q116 Git**: one worktree per issue; branch `factory/<issue>-<slug>`; commits are labelled `structural:`, `behavioural:` or `harness:`. A pull request may tidy only the code it is about to change, in a structural commit before the behavioural one; anything else it notices is filed as an issue.

## Quality

- **Q106 Tests**: a separate test-writer writes the tests before implementation. The implementer is blocked from editing test files by a hook in its agent definition; if it thinks a test is wrong, it stops and says so. The implementer doesn't run `tdd`. Test strength is measured by mutation testing on changed code from iteration 2; iteration 1 checks that tests assert something and relies on the test-writer's second pass.
- **Q107 Models and effort** (a starting point, adjusted from the measurements in Q110; the agent definitions name the concrete model IDs):

  | Role         | Model                    | Effort |
  | ------------ | ------------------------ | ------ |
  | Research     | Sonnet                   | low    |
  | Planner      | Opus                     | high   |
  | Test-writer  | Opus                     | high   |
  | Implementer  | Sonnet                   | medium |
  | Reviewers    | Opus                     | high   |
  | Orchestrator | the main session's model |        |

- **Q108 Reviewers**: two, each in a fresh context. **Spec**: does the change do what the issue and the alignment document say, and nothing more? **Standards**: the conventions, Ousterhout's red flags, test quality, and cheat detection (deleted, skipped or weakened tests). They commit fixes within the pull request's scope; anything outside it is filed as an issue labelled `pre-existing`. Every finding is fixed or answered with a reason. After three rounds the reviewers stop and ask. High-tier pull requests also get a security review.
- **Q109 Minimum harness for iteration 1**:
  1. `AGENTS.md` (which `CLAUDE.md` links to) becomes a short index that links to topic files in `docs/conventions/`, starting from the conventions that exist today. New conventions (testing strategy, naming, folder structure) are written when the Factory stops on them.
  2. One `pnpm validate` command that runs what CI runs.
  3. A Stop hook that runs `validate`, silent on success.
  4. The hook that blocks the implementer from editing tests.
  5. Labels: `ready-for-agent`, `needs-info`, `friction`, `pre-existing`.

  Later: check messages written for agents, complexity metrics, staleness checks for instruction files, incident replay.

## The person's role

- **Q98 What a person reviews**: the alignment document of every run; the code only of high-tier pull requests. When something goes wrong, it is analysed afterwards (Q110) rather than prevented by reading everything.
- **Q102 Risk tiers**: deterministic path rules set the minimum tier; the planner may raise it, never lower it; the person may override either way when reviewing the alignment document.
  - **High**: `infra/`, `.github/workflows/`, authentication and sign-in, the database schema and migrations, prompts, content filters and anything that decides what a child sees, personal data, invites and email sending, and the Factory's own hooks and agent definitions.
  - **Medium**: ordinary product and server changes.
  - **Low**: docs, copy, test-only changes, tooling with no runtime effect.
- **Q103 Merging**: always a person. An agent never merges, and an agent's approval never counts as a person's.

## Learning

- **Q110, Q111 Records**: [`docs/harness-log.md`](../harness-log.md) gains columns for each Factory pull request: risk tier, number of stops and questions, review rounds, the person's active review minutes (estimated), and later reverts or incidents. These measurements decide when Q98 can be relaxed. A revert or incident gets a root-cause entry (five whys) that ends in a harness change. Friction (papercuts an agent hit but didn't fix because they were out of scope) is not a log: it's issues labelled `friction`.
- **Q114 Filing friction**: each sub-agent's result lists friction. At the end of a run, the orchestrator shows it and files only what the person approves, after searching for duplicates. Automatic filing comes later, once the noise is low.
- **Q115 Retro**: the last phase reviews the run and proposes harness-log entries; changes to conventions, gotchas and checks for patterns the run used that aren't described yet; and friction candidates. Small accepted harness changes go into the same pull request as `harness:` commits; bigger ones become issues.

## Building it

- **Q117 Process**: the Factory is built through the normal process, one issue and pull request per step, together and interactively: it doesn't build itself. An epic issue replaces #34's body and links the steps:
  1. Harness basics (Q109): `AGENTS.md` index and `docs/conventions/`, `pnpm validate`, the Stop hook, labels, the issue template.
  2. Sub-agent definitions with their hooks.
  3. The `/factory` orchestrator skill.
  4. A calibration replay (Q118).
  5. The first real run, on #11.
- **Q118 Calibration replay**: the Factory reruns #7 _tRPC end to end_ (medium tier, already merged) in a throwaway worktree, and its output is compared with what was merged, to see how many stops and findings it produces before it touches new work.
- **Q119 This branch**: `software-factory` becomes the first pull request, documents only: the research, this record and the `CONTEXT.md` entries. It is larger than the 300-line convention because it holds no code; the pull request says so. It closes nothing.

## Where the decisions came from

The research note credits each idea to its source. In short: stopping the line and standard work (Taiichi Ohno); guides and sensors, and checks over instructions (Birgitta Böckeler); short alignment documents and the instruction budget (Dex Horthy); the day shift and its skills (Matt Pocock); `ship-pr`, friction issues and a short `AGENTS.md` (Kent C. Dodds); fixing the harness, not the code (David Tielke); Tidy First and the Trust Factory (Kent Beck); deep modules and interface comments first (John Ousterhout); failure patterns and flow (Gene Kim); risk tiers and rules for reviewer findings (the Claude Code team); and the 2026 papers on context files, agent-written tests, review agents and help-seeking.
