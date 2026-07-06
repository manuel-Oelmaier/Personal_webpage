# Blog guidelines (internal)

Not published — for writing and editing posts only.

## Homepage vs blog

| Homepage | Blog |
|---|---|
| Impressive project showcases | Small, self-contained problems |
| Polished portfolio | Reasoning, trade-offs, sketches |
| CV-ready overview | Enough context to follow the approach |

Some blog topics stand alone. Others belong to a homepage project and may grow into a short series, with an occasional longer post that ties the pieces together (e.g. homelab).

## Audience

Tech-savvy readers, but keep it understandable for almost anybody — explain jargon when it matters.

## Post structure

Every post uses a `problem` field in frontmatter (rendered as **The problem** at the top).

Suggested body outline:

1. **What I tried first** — alternatives considered, why they fell short
2. **Approach** — high-level technical explanation (architecture, how it works)
3. **Trade-offs** — honest comparison of options (optional)
4. **References** — numbered, clickable sources; cite claims in the text

## Finished work only

- **Hard rule:** only show work that is built and running today
- Do not promise future features — no "planned", "in progress", or "coming soon"
- If it is not done, it does not appear in the post

## Depth

- High-level technical detail: architecture, trade-offs, reasoning — not click-by-click walkthroughs
- Assume the reader can follow standard setup steps on their own
- Link to good existing documentation rather than rewriting it
- Only write a detailed step-by-step guide when nothing useful exists online, or when you've worked out something non-obvious
- Each post is a **sketch**: your approach + links to replicate it

## Lifecycle

- **Update** when you land on a better approach
- **Retire** when the problem is solved thoroughly enough that the write-up no longer adds anything

## Communication

- No comment section — email from each post's **Get in touch** footer
- Pre-filled subject: `Re: {post title}`
- Read and reply to every email
- Welcome corrections, better approaches, and questions the post didn't cover

## Frontmatter

```yaml
---
title: "Clear, specific title"
description: "One sentence for archive cards and RSS"
pubDate: YYYY-MM-DD
tags:
  - infrastructure  # or homelab, networking, meta, etc.
problem: "The real-life gap or annoyance this post addresses"
---
```
