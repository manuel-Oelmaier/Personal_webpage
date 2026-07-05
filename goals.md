# Site goals

This site exists to:

1. **Introduce** Manuel as a software / AI engineer worth talking to
2. **Spark interest** in his work — enough that a visitor wants to dig deeper or reach out
3. **Showcase projects** with enough credibility for recruiters, collaborators, and peers

The homepage carries the portfolio. The blog carries problem-first engineering sketches that support those projects without duplicating them.

Homepage hiring/trust reviews: see [`docs/homepage-review.md`](docs/homepage-review.md).

---

# AI review guideline

Use this document when reviewing blog-related changes (content, layout, routing, RSS, or homepage links into posts). Work through each component in order. For every component, read the **Goal**, then answer the **Review questions**. A change passes only when every applicable question can be answered affirmatively with evidence from the rendered page, source, or feed output.

**How to review**

- Compare against `docs/blog-guidelines.md` for writing standards; this file defines *why* each UI and content piece exists.
- Distinguish **bugs** (broken behavior, wrong data, inaccessible markup) from **goal misses** (works but fails the purpose).
- Skip questions marked *(N/A)* when the component is absent (e.g. no `problem` field, `meta` tag suppresses contact block).
- Report failures as: `Component → question → what you observed → suggested fix`.

---

## Shared chrome (affects every blog page)

### Site navigation — Blog link

**Goal:** Let visitors reach the blog archive from any page in one click, without losing context of who owns the site.

**Review questions:**

- Is “Blog” visible in the main nav on `/`, `/blog/`, and individual post URLs?
- Does the link resolve to `/blog/` (or equivalent) with no redirect loop or 404?
- Is the nav usable on mobile (tap target, no overflow hiding the link)?

### Base layout — page title & meta description

**Goal:** Give each blog page a correct, distinct browser tab title and search/snippet text so posts are identifiable when shared or bookmarked.

**Review questions:**

- Does the archive use a title like `Blog | Manuel Oelmaier`?
- Does each post use `{post title} | Manuel Oelmaier`?
- Is `<meta name="description">` present and aligned with the page (archive tagline or post `description`)?
- Does `<html lang="en">` remain set?

### Base layout — RSS discovery

**Goal:** Let feed readers and curious visitors subscribe without hunting for `/rss.xml`.

**Review questions:**

- Is `<link rel="alternate" type="application/rss+xml">` present in `<head>` on blog pages?
- Does the `href` point to a live `/rss.xml` that returns valid RSS?

### Base layout — site footer

**Goal:** Reinforce authorship and licensing without distracting from blog content.

**Review questions:**

- Does the footer render on blog archive and post pages?
- Is it visually subordinate to main content (does not compete with post CTAs)?

---

## Blog archive (`/blog/`)

### Hero — title and tagline

**Goal:** Immediately tell visitors this is a technical blog focused on problems, not a second homepage.

**Review questions:**

- Is the visible `<h1>` “Blog” (or equivalent unambiguous label)?
- Does the tagline mention problem-first / engineering topics and match the site’s positioning?
- Is the hero readable on mobile without clipping or awkward wrapping?

### Intro paragraph

**Goal:** Set expectations for post format, point polished showcases to the homepage, and explain how to give feedback (email from posts).

**Review questions:**

- Does it state that each post covers one problem (tried → solved → links)?
- Does it link to `/` for “full project showcases”?
- Does it mention emailing from posts for errors or better ideas?
- Is the tone consistent with `docs/blog-guidelines.md` (sketch, not tutorial catalog)?

### Post list — ordering

**Goal:** Surface the newest writing first so repeat visitors see fresh content.

**Review questions:**

- Are posts sorted by `pubDate` descending?
- Does the order in the DOM match the order in RSS?

### Post card — date

**Goal:** Help visitors judge recency and trust that the archive is maintained.

**Review questions:**

- Is each card’s date visible and human-readable?
- Does `<time datetime="...">` use a valid ISO 8601 value matching `pubDate`?

### Post card — title

**Goal:** Communicate the specific topic at a glance; the title should work alone in a link preview.

**Review questions:**

- Is the title specific (not vague like “Update” or “Part 2”)?
- Does it match the post’s `<h1>` and RSS `<title>`?
- Is it the only `<h3>` (or appropriate heading) in the card for clear outline?

### Post card — description

**Goal:** Offer one sentence of payoff so readers can decide whether to open the post.

**Review questions:**

- Is it one concise sentence (from frontmatter `description`)?
- Does it describe outcome or angle, not just technology name-dropping?
- Does it match the RSS item description?

### Post card — “Read More” link

**Goal:** Provide an obvious, accessible entry into the full post.

**Review questions:**

- Does each card link to `/blog/{slug}/` for the correct post?
- Is link text meaningful (“Read More” is acceptable if context makes the target clear)?
- Can the link be reached by keyboard and screen readers?

### “Back to Home” control

**Goal:** Offer a clear exit back to the portfolio for visitors who landed on the archive first.

**Review questions:**

- Is a link to `/` present below the grid?
- Is it visually distinct but consistent with other secondary buttons?

---

## Blog post page (`/blog/{slug}/`)

### Post title (`<h1>`)

**Goal:** State the post’s subject as the primary on-page headline; must stand alone in search results and social previews.

**Review questions:**

- Is there exactly one `<h1>` matching frontmatter `title`?
- Is it readable at mobile widths (no overflow breaking layout)?
- Would a tech-savvy reader know what problem space this post belongs to?

### Post meta line (date, tags, reading time)

**Goal:** Give lightweight context — when it was published, how it’s categorized, and time investment — without replacing the problem statement.

**Review questions:**

- Is the published date correct and consistent with the archive card?
- Are tags listed when present in frontmatter?
- Is reading time plausible (~200 wpm heuristic) and not shown as “0 min read”?
- Is meta styled as secondary to the title and problem block?

### “The problem” callout

**Goal:** Anchor every post in a real gap, annoyance, or constraint before any solution detail — the blog’s core promise.

**Review questions:**

- When `problem` is set in frontmatter, does it render in a visually distinct block labeled “The problem”?
- Does the text describe a *problem* (pain, constraint, failure mode), not a solution or feature list?
- Is it understandable to a tech-savvy non-expert without reading the body?
- If `problem` is missing, is that intentional (e.g. draft) or a content gap against guidelines?

### Post body (Markdown content)

**Goal:** Deliver a self-contained sketch: what was tried, the chosen approach, honest trade-offs, and links to go deeper — not a click-by-click manual.

**Review questions:**

- Is there a clear narrative arc (alternatives → approach → trade-offs)?
- Is technical depth at architecture/reasoning level unless a non-obvious walkthrough is justified?
- Are external concepts linked instead of duplicated when good docs exist?
- Is jargon explained when it matters for a general tech audience?
- If the post belongs to a homepage project, is there a brief tie-in back to that project?
- Are code blocks, lists, and headings structured for scanability (no wall of text)?
- Do all in-body links resolve (no broken URLs)?

### “Get in touch” footer *(hidden when `tags` includes `meta`)*

**Goal:** Replace a comment section with a low-friction, personal channel for corrections, better approaches, and gaps — and commit to reading replies.

**Review questions:**

- For non-`meta` posts, is the invitation copy present and accurate (“read and reply to every email”)?
- Does the mailto link use `manuel@oelmaier.eu` with subject `Re: {post title}` (URL-encoded)?
- Is the button reachable and labeled clearly (“Get in touch”)?
- For `meta` posts, is the contact block correctly omitted?

### “Back to Blog Archive” control

**Goal:** Keep readers in the blog loop after finishing a post.

**Review questions:**

- Does the link target `/blog/`?
- Is it visible after long posts without excessive scrolling past unrelated chrome?

### Post typography & layout styles

**Goal:** Make long-form text comfortable to read on desktop and mobile within the site’s visual language.

**Review questions:**

- Are paragraph line-height and font size readable (~1.2rem body, adequate contrast)?
- Do `<h2>` sections have clear vertical rhythm and left alignment for prose?
- Does content stay within `max-width` (~900px) so lines don’t sprawl on wide screens?
- Do global styles (fade-in, colors) apply without layout shift or FOUC issues?

---

## Content schema & frontmatter

**Goal:** Enforce consistent, machine-readable metadata for archive cards, RSS, and SEO.

**Review questions:**

- Does every published post define `title`, `description`, and `pubDate`?
- Is `description` one sentence suitable for cards and RSS?
- Are `tags` meaningful for filtering mentally (e.g. `infrastructure`, `homelab`, `meta`)?
- Is `problem` populated for all non-meta posts per `docs/blog-guidelines.md`?
- Does invalid frontmatter fail the content build (schema catches errors early)?

---

## RSS feed (`/rss.xml`)

**Goal:** Syndicate full posts to subscribers with accurate metadata for readers who never visit the site.

**Review questions:**

- Does the feed include all published blog entries, newest first?
- Does each item have `title`, `description`, `pubDate`, and `link` matching the site?
- Is item `content` the post body (or acceptable summary/full text per feed policy)?
- Is feed-level `description` aligned with the blog tagline?
- Does the feed require `site` in Astro config (build fails loudly if misconfigured)?

---

## Homepage → blog integration

### Project card “Read the write-up” link

**Goal:** Connect portfolio showcases to deeper problem-first posts without making the homepage a duplicate of the blog.

**Review questions:**

- Does the link target the correct `/blog/{slug}/` for that project?
- Is the homepage card still a showcase (outcome, scope, tags) while the blog post carries the sketch?
- Is the link label honest (write-up / blog post, not “demo” or “repo” unless it is)?

---

## Cross-cutting quality bar (all blog surfaces)

**Goal:** Nothing defective undermines trust in the author or the writing.

**Review questions:**

- Do all internal links (`/`, `/blog/`, post slugs) work in production paths?
- Are blog pages usable on mobile (no horizontal scroll, tap targets, readable type)?
- Do layout and accessibility tests cover `/blog/` and at least one post URL?
- Are there no console errors or failed network requests on static blog pages?
- Does rendered HTML use semantic landmarks (`<main>`, `<article>`, `<time>`, heading hierarchy)?

---

## Open product goals (not review blockers)

Track separately — these are aspirations, not pass/fail criteria for routine blog reviews:

- Make homepage projects more interactable (play chess, query the bot, take the quiz).
