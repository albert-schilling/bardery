#!/usr/bin/env bash
# Runs the staging migrations job with the given api image and waits until it ends.
# Exits non-zero unless the run succeeded. CI calls it after the apply, before deploying the apps.
#   infra/scripts/run-migrations.sh ghcr.io/albert-schilling/bardery-server:<sha>
set -euo pipefail

image=$1
job=(--name migrations --resource-group bardery-staging)

az containerapp job update "${job[@]}" --image "$image" --output none
execution=$(az containerapp job start "${job[@]}" --query name --output tsv)
echo "Started $execution"

# 60 polls, 10 s apart: the job itself times out after 5 minutes.
for _ in {1..60}; do
  status=$(az containerapp job execution show "${job[@]}" --job-execution-name "$execution" \
    --query properties.status --output tsv)
  case $status in
    Succeeded) echo "$execution succeeded"; exit 0 ;;
    Failed | Stopped | Degraded) break ;;
  esac
  sleep 10
done

echo "::error::The migrations job's execution $execution is \"$status\", expected Succeeded"
exit 1
