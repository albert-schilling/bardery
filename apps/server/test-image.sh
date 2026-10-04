#!/usr/bin/env bash
# Builds the api image and checks that it answers /health, runs as non-root and stops on SIGTERM.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
image=bardery-server:test
docker build --quiet --file "$root/apps/server/Dockerfile" --build-arg VERSION=test-version --tag "$image" "$root" > /dev/null
container=$(docker run --detach --publish 127.0.0.1::3000 "$image")
trap 'docker rm --force "$container" > /dev/null' EXIT
url="http://$(docker port "$container" 3000)"

for _ in {1..20}; do curl --silent --output /dev/null "$url/health" && break || sleep 0.5; done

failures=0
check() {
  local name=$1 expected=$2 actual=$3
  if [[ $actual == "$expected" ]]; then
    echo "ok   $name"
  else
    echo "FAIL $name: got \"$actual\", expected \"$expected\""
    failures=$((failures + 1))
  fi
}

check "GET /health" '{"status":"ok","version":"test-version"}' "$(curl --silent "$url/health")"
check "runs as non-root" node "$(docker exec "$container" whoami)"
check "ships only the bundle" dist "$(docker exec "$container" ls)"
check "has no npm" absent "$(docker exec "$container" sh -c 'command -v npm || echo absent')"
# `docker stop` sends SIGTERM and waits 2 seconds before it kills; a kill would exit with 137.
docker stop --time 2 "$container" > /dev/null
check "exits cleanly on SIGTERM" 0 "$(docker inspect --format '{{.State.ExitCode}}' "$container")"
check "stops on invalid config" 1 "$(docker run --rm --env PORT=none "$image" > /dev/null 2>&1; echo $?)"

exit "$failures"
