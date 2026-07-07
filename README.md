# Personal Webpage

[![Lighthouse & Deploy](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/lighthouse.yml)
[![E2E & Accessibility](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/e2e.yml/badge.svg)](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/e2e.yml)
[![Link Checker](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/link-checker.yml/badge.svg)](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/link-checker.yml)

**Live site:** [manueloelmaier.de](https://manueloelmaier.de)

Personal portfolio and technical blog for Manuel Oelmaier — software engineer focused on AI/LLM systems. Built with aggressive minimalism: fast, accessible, no cookies, no tracking.

## What's here

- **Homepage** — hero, featured work, project showcase, and contact
- **Blog** — problem-first engineering posts (homelab, LLM inference, infrastructure)
- **RSS feed** — `/rss.xml` for subscribers
- **Open Graph** — rich link previews on LinkedIn, X, WhatsApp, Discord, and more
- **CV** — downloadable PDF from the hero and nav

## Tech stack

| Layer | Choice |
| :--- | :--- |
| Framework | [Astro](https://astro.build) 5 (static output) |
| Content | Markdown + Astro Content Collections |
| Styling | Plain CSS (inlined at build time) |
| Images | `astro:assets` + Sharp |
| Tests | Playwright (e2e, a11y, layout snapshots, OG meta) |
| Linting | ESLint + `astro check` |
| Package manager | pnpm |

## Project structure

```
├── src/
│   ├── pages/          # Routes (index, blog, RSS)
│   ├── layouts/        # BaseLayout (meta, OG, JSON-LD)
│   ├── content/blog/   # Blog posts (Markdown + frontmatter)
│   ├── styles/         # Global CSS
│   └── assets/         # Images, icons, project screenshots
├── public/             # Static files (CV, OG images, robots.txt)
├── e2e/                # Playwright tests
├── scripts/            # OG generator, link checker, GitHub activity fetch
├── docs/               # Internal writing & review guidelines
└── goals.md            # Site positioning and homepage contract
```

## Getting started

**Requirements:** Node.js 24+, pnpm 9+

```bash
git clone https://github.com/manuel-Oelmaier/Personal_webpage.git
cd Personal_webpage
pnpm install
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

### Common commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve the built site locally |
| `pnpm check` | Type-check + ESLint |
| `pnpm test` | Full suite (check, build, e2e, link crawl) |
| `pnpm test:e2e` | Playwright tests only |
| `pnpm generate:og` | Regenerate Open Graph preview images |

## Adding a blog post

Create a Markdown file in `src/content/blog/` with frontmatter:

```yaml
---
title: "Your post title"
description: "One-sentence summary for cards and RSS."
pubDate: 2026-07-07
tags: ["infrastructure", "homelab"]
problem: "The pain point this post addresses."
---
```

Then regenerate the OG image and run tests:

```bash
pnpm generate:og
pnpm test
```

Writing standards: [`docs/blog-guidelines.md`](docs/blog-guidelines.md)

## Testing

`pnpm test` runs the full pipeline:

1. **Type-check & lint** — `astro check` + ESLint
2. **Build** — static site generation
3. **E2E** — smoke tests, axe accessibility, mobile layout snapshots, Open Graph meta
4. **Link check** — crawls the built site for broken links

Playwright uses Chromium (desktop + mobile). Layout screenshot tests pin `Noto Sans` / `Liberation` fonts so Arch dev machines and Ubuntu CI render the same metrics — install `noto-fonts` and `ttf-liberation` locally if snapshots drift. Update snapshots with:

```bash
pnpm exec playwright test e2e/layout.spec.ts --project=mobile-chrome --update-snapshots
```

## Deployment

- **Production** — manual FTP deploy to Netcup via [`.github/workflows/deploy-netcup.yml`](.github/workflows/deploy-netcup.yml) (`workflow_dispatch`)
- **GitHub Pages** — built and deployed on every push to `main` by the Lighthouse workflow (used for audits and preview)

The deploy workflow fetches fresh GitHub activity data before building. See [`scripts/README.md`](scripts/README.md) for cron setup on the host.

## CI

| Workflow | Trigger | Purpose |
| :--- | :--- | :--- |
| Lighthouse & Deploy | push to `main` | Audit, deploy to GitHub Pages, update scores below |
| E2E & Accessibility | push / PR to `main` | Playwright + axe |
| Link Checker | schedule / manual | Crawl live site for broken links |
| ESLint | push / PR | Lint only |
| RSS Validator | push / PR | Validate `/rss.xml` |

## Lighthouse scores

| Category | Score |
| :--- | :--- |
| **Performance** | 100 |
| **Accessibility** | 100 |
| **Best Practices** | 100 |
| **SEO** | 100 |
| **PWA** | Not Applicable |

*Last dynamic audit: 2026-07-07 via GitHub Actions.*

## Further reading

- [`goals.md`](goals.md) — site purpose, homepage flow, OG spec
- [`docs/homepage-review.md`](docs/homepage-review.md) — hiring/trust review checklist
- [`docs/blog-guidelines.md`](docs/blog-guidelines.md) — blog writing standards


