#!/usr/bin/env bash
# Builds the web image from the current build and checks how nginx answers.
set -euo pipefail

image=bardery-web:test
docker build --quiet --tag "$image" "$(dirname "$0")" > /dev/null
body_file=$(mktemp)
container=$(docker run --detach --publish 127.0.0.1::8080 "$image")
trap 'docker rm --force "$container" > /dev/null; rm -f "$body_file"' EXIT
url="http://$(docker port "$container" 8080)"

for _ in {1..20}; do curl --silent --output /dev/null "$url" && break || sleep 0.5; done

failures=0
expect() {
  local path=$1 status=$2 body=$3 actual
  actual=$(curl --silent --output "$body_file" --write-out '%{http_code}' "$url$path")
  if [[ $actual == "$status" ]] && grep --quiet --fixed-strings "$body" "$body_file"; then
    echo "ok   $path -> $status"
  else
    echo "FAIL $path -> $actual, expected $status with \"$body\""
    failures=$((failures + 1))
  fi
}

expect / 200 __reactRouterContext
expect /stories/a-deep-link 200 __reactRouterContext
expect /assets/missing.js 404 '404 Not Found'
expect "/assets/$(basename "$(ls "$(dirname "$0")"/build/client/assets/*.js | head -1)")" 200 ''

exit "$failures"
