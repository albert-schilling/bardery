#!/usr/bin/env bash
# Fails when src/db/schema.ts has changes that no checked-in migration covers. drizzle-kit generate
# writes a migration only for such changes, so any uncommitted file in src/db/migrations afterwards
# means one is missing (or, locally, that you generated one and haven't committed it yet).
set -euo pipefail
cd "$(dirname "$0")"

pnpm exec drizzle-kit generate > /dev/null
changes=$(git status --porcelain -- src/db/migrations)
if [[ -n $changes ]]; then
  echo "Commit the migration for src/db/schema.ts that drizzle-kit generated:"
  echo "$changes"
  exit 1
fi
echo "ok   the migrations match the schema"
