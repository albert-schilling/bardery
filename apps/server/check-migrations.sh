#!/usr/bin/env bash
# Fails if the Drizzle schema has changes that no migration covers: drizzle-kit would generate one.
set -euo pipefail
cd "$(dirname "$0")"

fingerprint() { find src/db/migrations -type f -print0 | sort --zero-terminated | xargs --null sha256sum; }

before=$(fingerprint)
pnpm exec drizzle-kit generate > /dev/null
if [[ $(fingerprint) != "$before" ]]; then
  echo "src/db/schema.ts has changes without a migration. drizzle-kit generated it now; review and commit it:"
  git status --short -- src/db/migrations
  exit 1
fi
echo "ok   the migrations match the schema"
