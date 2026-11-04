---
name: factory
description: Run one issue through the Factory, from intake to a pull request and a retro, stopping whenever it needs a person.
disable-model-invocation: true
argument-hint: "<issue number>"
---

# The Factory

You run issue `$ARGUMENTS` through the Factory's phases in the main session. The phase agents (`factory-*`) do the work; you dispatch them one after another, check what each reports, keep the state in the issue and the pull request, and put every question to the person. You never merge, and you never answer a question for the person.

## Configuration

Read `.claude/factory.json` first. Everything about this repository comes from it; this skill writes its keys as `config.<key>`. Read `config.conventions` and the topic files it links to that touch a phase before you act on that phase.

## State

The issue holds the run's state, so a run can stop and later resume in another session. Keep three comments on it, each found by the hidden marker on its first line and edited in place, never posted twice:

- `<!-- factory:run -->` **Run log**: the branch, the worktree, the phase reached, each Stop (phase, questions, answers, where each answer was recorded), review rounds, and the friction collected so far.
- `<!-- factory:research -->` **Research summary**: the questions and the researcher's answers.
- `<!-- factory:alignment-document -->` **Alignment Document**, with a status line: `Status: awaiting review`, then `Status: approved <date>`.

Review findings, their answers and the evidence go in the pull request. Write no planning files.

**Resume**: if the run log exists, continue from the phase it names. The comments are the source of truth: the person may have edited them, so read them again rather than relying on what you remember.

## Checks

A phase is finished only when every artifact its result names exists. After each result, before the next phase:

- **Issue comment**: read it back from GitHub; it carries its marker and the artifact's content.
- **File**: it exists in the worktree, and the commit the result names contains it.
- **Commit**: it is on the run's branch (`git merge-base --is-ancestor <sha> HEAD`), its subject starts with `structural:`, `behavioural:` or `harness:`, and `git status` is clean.

When a check fails, send the phase back to its agent naming the failed check. When it fails a second time, it is a Stop.

## Dispatching a phase

Start the phase's agent with the Agent tool, in the foreground. Its prompt holds what the agent's definition says it receives, and nothing more. Its last message is a `factory-result`:

- `## Result: done`: run the checks, add its friction to the run log, move on.
- `## Result: blocked`: a Stop. Follow [`stops.md`](stops.md), then resume the same phase.

Update the run log's phase after each phase.

## Phases

### 1. Intake

Read the issue: title, body, labels, state. Refuse to run, saying why, when:

- it is closed.
- it lacks the `config.labels.ready` label, or a section of `config.issueTemplate` (each `## ` heading) is missing or still holds only the template's placeholder. Add the `config.labels.needsInfo` label and comment what's missing, section by section.
- an issue it names after "Depends on" is still open. Tell the person which ones; change nothing on the issue.

When it passes, remove `config.labels.needsInfo` if present.

### 2. Worktree

Branch `factory/<issue>-<slug>`, the slug three or four words of the issue title in kebab case. Create the worktree from the default branch on origin with `git worktree add .claude/worktrees/factory-<issue>-<slug> -b <branch> origin/<default branch>` (on resume, reuse it, or recreate it from the pushed branch), enter it with the EnterWorktree tool's `path`, and run `config.setup` there. Every later phase runs in it. Post the run log.

### 3. Research

From the issue, write numbered questions about the code as it is today: what exists, where, how it is used, what patterns nearby code follows. Ask for facts only. Dispatch `factory-researcher` with the questions alone: no issue, title, goal, acceptance criteria or plan. Post the Research summary.

### 4. Alignment Document

Dispatch `factory-planner` with the issue and the Research summary. Post its artifact as the Alignment Document, `Status: awaiting review`.

A `blocked` result proposing a split ends the run once the person answers: on approval, file the split issues from `config.issueTemplate`, without `config.labels.ready` (only a person applies it), and link them from the issue.

### 5. The planned Stop: review of the Alignment Document

Stop here, before any test or code is written. Link the comment and ask the person to approve it, request changes, or change the Risk Tier. They may also edit the comment on GitHub. Changes requested: send them to the planner and edit the comment in place; ask again. Once approved, read the comment again and use its text from here on; set its status to approved. The person may end the session here; `/factory <issue>` resumes after approval.

### 6. Tests, first pass

Dispatch `factory-test-writer` with the issue, the Alignment Document and "first pass". Check, in addition, that its commit changes only files matching `config.testFiles`.

### 7. Implementation

Dispatch `factory-implementer` with the issue, the Alignment Document and the test commit. Check, in addition, that no file matching `config.testFiles` changed since the test commit.

### 8. Tests, second pass

Dispatch `factory-test-writer` with the issue, the Alignment Document, "second pass" and the last implementation commit.

### 9. Review

Record the base: `git merge-base HEAD origin/<default branch>`. A round runs `factory-reviewer-spec`, then `factory-reviewer-standards`, one after the other because both commit to the worktree. Each gets the issue, the Alignment Document, the base and, from round two, every earlier finding with its answer.

- Every finding is fixed (a commit) or answered with a reason; keep the list for the pull request.
- **Findings in untouched code**: search the open issues for a duplicate; file the rest from `config.issueTemplate`, labelled `config.labels.preExisting`, and link them in the pull request.
- A round with no fix commits ends the review. After three rounds, stop and ask the person whether to run another round, accept the open findings, or take over.

For a High Risk Tier, then run the `security-review` skill. Send its findings in the change's scope to `factory-implementer` as a fix, and list them in the pull request with their answers.

### 10. Verify

Run `config.validate` in the worktree. On failure, send the output to `factory-implementer` once; when it fails again, it is a Stop.

### 11. Pull request

Size: count the changed lines from the base; above `config.maxChangedLines`, say so in the pull request and why it wasn't split.

Risk Tier: apply `config.riskTiers` to every changed path (the first matching rule sets a path's tier; the highest tier of any path is the minimum). It is the approved Alignment Document's tier, or this minimum if that is higher.

Push the branch and open the pull request against the default branch, titled like the issue. Write its body with the `config.pullRequestSkill` skill: its evidence is the tests with their failure before implementation and the final `config.validate` summary; its merge danger is the door (one-way or two-way) and the blast radius. Add:

- `Closes #<issue>` as its first line.
- **Risk Tier**, and why. For High: a person reads the code before merging.
- **Review**: each finding and its fix commit or answer, rounds run, issues filed for untouched code.
- **Stops**: each question and the answer, with where it was recorded.

Leave merging to a person: don't merge, approve or enable auto-merge.

### 12. Retro

Review the run: the run log, every result, the Stops, the review findings. Propose to the person, as three numbered lists:

1. **Harness log entries** for `config.harnessLog`'s entries table: what an agent got wrong or needed to be told, and the harness change that prevents it.
2. **Harness changes**: conventions, gotchas and checks for patterns the run used that aren't described yet, or that cost a Stop or a review finding. Prefer a check over a written rule.
3. **Friction**: the friction from every result, deduplicated, each as a would-be issue.

Act only on what the person accepts:

- Small harness changes and the accepted log entries: `harness:` commits in this pull request.
- Bigger harness changes: issues from `config.issueTemplate`.
- Friction: search the issues for each first (open and closed); file the rest labelled `config.labels.friction`.

Fill in the run's row in the Factory runs table of `config.harnessLog`, following the column definitions above it; ask the person for their review minutes. Commit it as `harness:` and push. Update the run log to `retro done`, leave the worktree with ExitWorktree (`keep`), and end with the pull request's link and what the person does next.
