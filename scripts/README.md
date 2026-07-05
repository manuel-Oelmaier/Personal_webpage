# GitHub Activity Widget — Server Setup

Fetches recent public push events from GitHub once per day and writes
`github-activity.json`. The homepage widget reads `/github-activity.json`.

## Netcup cron setup

### 1. Upload the script

Copy `fetch-github.php` to your hosting (SSH or SCP):

```bash
scp scripts/fetch-github.php YOUR_USER@YOUR_HOST:scripts/fetch-github.php
ssh YOUR_USER@YOUR_HOST 'chmod +x scripts/fetch-github.php'
```

### 2. Add a cron job

In Netcup WCP: **Cronjobs → Create**, or via SSH:

```bash
crontab -e
```

```cron
# Daily at 03:15 UTC — update GitHub activity JSON in web root
15 3 * * * GITHUB_ACTIVITY_OUT=$HOME/manueloelmaier.de/httpdocs/github-activity.json php $HOME/scripts/fetch-github.php >> $HOME/logs/github-activity.log 2>&1
```

Create the log directory once:

```bash
mkdir -p ~/logs
```

### 3. Run once immediately

```bash
GITHUB_ACTIVITY_OUT=$HOME/manueloelmaier.de/httpdocs/github-activity.json php ~/scripts/fetch-github.php
cat ~/manueloelmaier.de/httpdocs/github-activity.json
```

### 4. Verify on the live site

Open `https://manueloelmaier.de/github-activity.json` — should show repo commit counts, not the empty placeholder.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GITHUB_ACTIVITY_OUT` | `../public/github-activity.json` (relative to script) | Output path |
| `GITHUB_USER` | `manuel-Oelmaier` | GitHub username |
| `GITHUB_TOKEN` | _(unset)_ | Optional; raises API rate limit |

## Local / CI run

From the repo root (writes to `public/github-activity.json` for the next build):

```bash
php scripts/fetch-github.php
# or
./scripts/fetch-github.sh
```

The Netcup deploy workflow runs this before building so each deploy ships fresh data; cron keeps it updated between deploys.

## Requires

PHP CLI only (`php`). No `curl`, `jq`, or `python3` needed.
