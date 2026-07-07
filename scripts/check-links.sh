#!/usr/bin/env bash
# Crawl the built site via preview — not live production.
# Rewrites canonical/OG absolute URLs to localhost so undeployed builds still pass.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${LINK_CHECK_PORT:-4173}"

if [[ ! -d dist ]]; then
  echo "check-links.sh: dist/ missing — run pnpm build first" >&2
  exit 1
fi

pnpm exec astro preview --host 127.0.0.1 --port "$PORT" &
PREVIEW_PID=$!

cleanup() {
  kill "$PREVIEW_PID" 2>/dev/null || true
  wait "$PREVIEW_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 0.1
done

if ! curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
  echo "check-links.sh: preview server did not start on port ${PORT}" >&2
  exit 1
fi

pnpm exec linkinator "http://127.0.0.1:${PORT}" --recurse --silent \
  --url-rewrite-search 'https://manueloelmaier.de' \
  --url-rewrite-replace "http://127.0.0.1:${PORT}" \
  --skip www.linkedin.com \
  --skip www.reddit.com
