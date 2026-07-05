#!/usr/bin/env php
<?php
declare(strict_types=1);

$githubUser = getenv('GITHUB_USER') ?: 'manuel-Oelmaier';
$scriptDir = __DIR__;
$outFile = getenv('GITHUB_ACTIVITY_OUT') ?: $scriptDir . '/../public/github-activity.json';
$outFile = preg_replace('#/+#', '/', $outFile);

$headers = [
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
    'User-Agent: manueloelmaier.de-github-activity',
];
$token = getenv('GITHUB_TOKEN');
if (is_string($token) && $token !== '') {
    $headers[] = 'Authorization: Bearer ' . $token;
}

/**
 * @return array{0: mixed, 1: array<string, string>}
 */
function githubGet(string $url, array $headers): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers) . "\r\n",
            'timeout' => 30,
            'ignore_errors' => true,
        ],
    ]);

    $raw = file_get_contents($url, false, $context);
    if ($raw === false) {
        throw new RuntimeException("failed to fetch {$url}");
    }

    $linkHeaders = [];
    foreach ($http_response_header ?? [] as $line) {
        if (stripos($line, 'Link:') === 0) {
            $linkHeaders[] = trim(substr($line, 5));
        }
    }

    $links = [];
    foreach ($linkHeaders as $linkHeader) {
        foreach (explode(',', $linkHeader) as $part) {
            if (!preg_match('/<([^>]+)>;\s*rel="([^"]+)"/', trim($part), $matches)) {
                continue;
            }
            $links[$matches[2]] = $matches[1];
        }
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException("invalid JSON from {$url}");
    }

    return [$decoded, $links];
}

$cutoff = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-30 days');
$since = $cutoff->format('Y-m-d\TH:i:s\P');

[$events] = githubGet(
    "https://api.github.com/users/{$githubUser}/events/public?per_page=100",
    $headers
);

if (!is_array($events)) {
    fwrite(STDERR, "fetch-github.php: expected events array from GitHub API\n");
    exit(1);
}

$reposSeen = [];
foreach ($events as $event) {
    if (($event['type'] ?? '') !== 'PushEvent') {
        continue;
    }

    $createdAt = $event['created_at'] ?? '';
    try {
        $created = new DateTimeImmutable($createdAt);
    } catch (Exception) {
        continue;
    }

    if ($created < $cutoff) {
        continue;
    }

    $repo = $event['repo']['name'] ?? '';
    if ($repo === '') {
        continue;
    }

    $reposSeen[$repo] = true;
}

$repos = [];
foreach (array_keys($reposSeen) as $repo) {
    $url = 'https://api.github.com/repos/' . $repo
        . '/commits?author=' . rawurlencode($githubUser)
        . '&since=' . rawurlencode($since)
        . '&per_page=100';

    $commitCount = 0;
    $lastPush = '';

    try {
        while ($url !== '') {
            [$page, $links] = githubGet($url, $headers);
            if (!is_array($page)) {
                break;
            }

            $commitCount += count($page);
            if ($lastPush === '' && isset($page[0]['commit']['author']['date'])) {
                $lastPush = substr((string) $page[0]['commit']['author']['date'], 0, 10);
            }

            $url = $links['next'] ?? '';
        }
    } catch (RuntimeException $exception) {
        fwrite(STDERR, "fetch-github.php: {$exception->getMessage()}\n");
        continue;
    }

    if ($commitCount === 0) {
        continue;
    }

    $parts = explode('/', $repo, 2);
    $repos[] = [
        'name' => $parts[1] ?? $repo,
        'commits' => $commitCount,
        'lastPush' => $lastPush,
    ];
}

usort($repos, static fn(array $a, array $b): int => $b['commits'] <=> $a['commits']);
$repos = array_slice($repos, 0, 8);

$payload = [
    'updated' => gmdate('Y-m-d\TH:i:s\Z'),
    'repos' => $repos,
];

$dir = dirname($outFile);
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    fwrite(STDERR, "fetch-github.php: cannot create output directory\n");
    exit(1);
}

$json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents($outFile, $json . "\n") === false) {
    fwrite(STDERR, "fetch-github.php: failed to write output file\n");
    exit(1);
}

fwrite(STDOUT, gmdate('D M j H:i:s') . " UTC: wrote {$outFile}\n");
