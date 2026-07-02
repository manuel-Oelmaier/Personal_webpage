# GitHub Activity Widget — Server Setup

## What it does
Fetches recent public push events from GitHub once per day and writes
`public/github-activity.json`. The site widget reads this file client-side.

## Deploy

```bash
# 1. Copy unit files to systemd
sudo cp github-activity.service /etc/systemd/system/
sudo cp github-activity.timer   /etc/systemd/system/

# 2. Make the script executable
chmod +x /var/www/manueloelmaier.de/scripts/fetch-github.sh

# 3. Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now github-activity.timer

# 4. Run once immediately to populate the JSON
sudo systemctl start github-activity.service

# 5. Verify
systemctl status github-activity.timer
cat /var/www/manueloelmaier.de/public/github-activity.json
```

## Manual run

```bash
sudo systemctl start github-activity.service
journalctl -u github-activity.service -n 20
```
