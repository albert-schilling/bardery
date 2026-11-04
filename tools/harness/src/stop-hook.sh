#!/usr/bin/env bash
# The Claude Code Stop hook (.claude/settings.json): a turn can't end while `pnpm validate` fails.
# Silent on success, so a clean turn ends without noise. On failure it prints the output to stderr
# and exits with 2, which Claude Code hands to the agent instead of ending the turn.
set -uo pipefail
cd "$(dirname "$0")/../../.."

# Nx's terminal UI expects a terminal, and the hook has none.
if ! output=$(NX_TUI=false pnpm --silent validate 2>&1); then
  # Nx runs tasks in a pseudo-terminal, so tools colour their output; the agent reads plain text.
  printf '%s\n\n%s\n' "pnpm validate failed; fix it before ending the turn." "$output" |
    sed $'s/\x1b\\[[0-9;]*m//g' >&2
  exit 2
fi
