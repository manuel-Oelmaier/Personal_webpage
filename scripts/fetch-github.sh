#!/usr/bin/env bash
# Wrapper for fetch-github.php (Netcup cron / local / CI).
set -euo pipefail
exec php "$(cd "$(dirname "$0")" && pwd)/fetch-github.php"
