#!/usr/bin/env bash
# Fetches recent public push events from GitHub and writes
# public/github-activity.json for the activity widget.
# Run daily via systemd timer or cron.
# Requires: curl, jq

set -euo pipefail

GITHUB_USER="manuel-Oelmaier"
OUT_FILE="$(dirname "$0")/../public/github-activity.json"
API_URL="https://api.github.com/users/${GITHUB_USER}/events/public"

# Fetch up to 100 recent events (max per page, no auth = 60 req/hour limit)
RAW=$(curl -s \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "${API_URL}?per_page=100")

# Filter PushEvents from last 30 days, group by repo, sum commit counts
jq --arg cutoff "$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30d +%Y-%m-%dT%H:%M:%SZ)" '
  [
    .[] |
    select(.type == "PushEvent") |
    select(.created_at >= $cutoff) |
    {
      repo: .repo.name,
      commits: (.payload.commits | length),
      lastPush: (.created_at | split("T")[0])
    }
  ] |
  group_by(.repo) |
  map({
    name: (.[0].repo | split("/")[1]),
    commits: (map(.commits) | add),
    lastPush: (sort_by(.lastPush) | last | .lastPush)
  }) |
  sort_by(-.commits) |
  .[0:8]
' <<< "$RAW" | jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{updated: $ts, repos: .}' > "$OUT_FILE"

echo "$(date -u): wrote $OUT_FILE"
