# Pull requests

- Small PRs: one issue per PR, about 300 changed lines at most, not counting lock files.
- Every change comes with tests.
- A PR that changes what a client shows includes screenshots of each changed screen, taken from the running app: the web app at phone (390px) and desktop (1280px) width with Playwright, the native app on iOS and Android. Commit them under `.github/pr-screenshots/`, embed them by that commit's SHA (`https://raw.githubusercontent.com/albert-schilling/bardery/<sha>/.github/pr-screenshots/<file>`), and delete them in the next commit so they never reach `main`.
- Before pushing a change to a workflow file, check that it parses (e.g. load it with a YAML parser) and look at the CI run on that push: an invalid workflow starts no jobs and shows only a failed run with nothing in it.
- Add the harness log entries to [`docs/harness-log.md`](../harness-log.md) in the PR that caused them, as a commit after the PR is opened, so the entry carries its number. Don't wait for the merge.
