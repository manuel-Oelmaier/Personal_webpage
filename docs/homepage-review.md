# Homepage review guideline (AI)

This document reviews the **main page** (`/`) — not the blog. Treat it like a premium LinkedIn profile rendered as a single scroll: a hiring manager should understand who Manuel is, trust him with real money and real systems, and feel motivated to reach out within 60 seconds.

---

## Commercial purpose

The homepage exists to **sell Manuel as someone worth hiring** — as an engineer, contractor, or collaborator on well-paid engineering work.

Success looks like:

- A visitor with budget authority thinks: *“This person ships. I’d pay for this.”*
- A recruiter can forward the page or CV with confidence.
- A technical lead sees proof of production-grade work, not tutorial projects.
- Contact feels natural, low-friction, and professional.

The blog supports credibility; the homepage **closes the deal**.

---

## Target groups

Review every change through the eyes of these visitors. A component can pass technically but fail if the wrong audience leaves unconvinced.

| Audience | What they need in ~30 seconds | What makes them reach out |
|---|---|---|
| **Hiring managers / tech leads** | Proof of ownership, reliability under pressure, relevant stack | Featured work with outcomes; clear AI + infra depth; sense of judgment |
| **Recruiters (in-house & agency)** | Scannable headline, TUM, role fit, downloadable CV | Hero (role + proof + CV CTA); keywords in hero line and project tags |
| **Founders / CTOs (freelance or contract)** | “Can I trust him with my stack and my deadline?” | Project cards with scope + security/ops maturity; contact CTA |
| **Referrers (peers, mentors, professors)** | One line they can repeat about Manuel | Memorable hook (Candidates infra, local LLM extension, homelab) |
| **Secondary: curious engineers** | Interesting builds | GitHub activity, blog links — nice to have, not the primary buyer |

**Priority order when goals conflict:** hiring managers and founders > recruiters > referrers > peer curiosity.

---

## LinkedIn-profile lens

Map homepage sections to what works on a strong LinkedIn profile:

| LinkedIn element | Homepage equivalent |
|---|---|
| Headline | Hero `<h1>` — target role (not display name) |
| Photo + About hook | Hero — portrait + proof line + keyword line |
| Featured | Featured Work — flagship credibility piece |
| Experience / Projects | Project Showcase |
| Skills | Hero keyword line + tags on project cards |
| Activity | *(removed — see Remaining gaps in goals.md)* |
| Open to work + Contact | Contact section |
| Resume download | Nav CV + hero Download CV (no standalone CV section) |
| Values / voice | Principles |

Ask throughout: *“Would this block survive a recruiter comparing it side-by-side with strong candidates on LinkedIn?”*

---

## How to review

1. **Pick a persona** from the table above (default: hiring manager at a tech company).
2. **Scroll mentally top to bottom** as on first visit — hero → featured → projects → principles → contact. See `goals.md` § Homepage — recruiter-optimal flow.
3. For each component: read the **Goal**, answer **Human questions** (trust, desire to hire, money), then **Review questions** (observable checks).
4. Separate **bugs** from **positioning misses** (e.g. link works but copy undersells impact).
5. Report failures as: `Component → question → observation → suggested fix`.

Cross-check blog positioning only where the homepage links into it (`Read the write-up`). Full blog rules live in `goals.md`.

---

## Shared chrome

### Site navigation

**Goal:** Orient a busy visitor instantly and let them jump to proof (Work, About) or hiring artifacts (CV, Blog).

**Human questions:**

- Does this feel like a professional’s site, not a student homework page?
- Can a recruiter find Work and CV without hunting?

**Review questions:**

- Are anchors `#featured-work`, `#about-me` (hero), `#contact`, Blog, and CV visible and working from `/`?
- Is the site name a clear link home?
- Is navigation usable on mobile without hiding critical hiring paths?

### Page title & meta description

**Goal:** When the link is pasted in Slack or email, the preview should read as a serious engineer’s portfolio.

**Human questions:**

- Would I click this preview expecting a strong candidate?

**Review questions:**

- Is the title the person’s name (not generic “Portfolio”)?
- Does the meta description mention TUM, AI, and production experience?
- Are Open Graph + Twitter Card tags present (`og:image` absolute HTTPS, 1200×630)? See `goals.md` § Link previews.
- On `/`, is JSON-LD `Person` schema present with name, jobTitle, email, and sameAs links?

### Site footer

**Goal:** Minimal legal/authorship line — must not undermine professionalism or distract from Contact.

**Human questions:**

- Does anything here make an employer hesitate?

**Review questions:**

- Footer present, unobtrusive, no broken or joke copy.

---

## Hero

**Goal:** In one screen, answer *“What does this person do, what did they ship, and can I download their CV?”* — LinkedIn photo + headline + e2e AI arc + next step.

**Human questions:**

- Within 5 seconds, do I know their role, career arc (research → production), and school/stack?
- Does the proof line make me want to scroll or forward the CV?
- Can I download the CV without hunting?

**Review questions:**

- Is `<h1>` the target role (e.g. Software Engineer · AI / LLM), not oversized display name?
- Is the name present in nav, keyword line, and page title?
- Is there a professional portrait with appropriate alt text?
- Does the hook lead with the **e2e AI arc** (research, finetuning, production)?
- Does the proof sentence name concrete shipped work, with episodic infra proof (e.g. Candidates) as a clause — not the headline?
- Does a keyword line include TUM and stack (Python, TypeScript)?
- Is Download CV visible above the fold? Featured Work is immediately below on desktop — nav **Work** covers tiny screens; no duplicate hero CTA required.
- Readable on mobile — photo and text stack cleanly?

---

## About me *(N/A — merged into hero)*

Portrait, stack, TUM, and likability live in the hero block. Do not re-add a standalone About section unless it adds information not already in the hero.

---

## Principles

**Goal:** Signal **how he works** — judgment, craft, learning — so buyers believe low drama and good decisions in expensive projects.

**Human questions:**

- Do these sound like principles of someone I’d staff on a critical path?
- Do they differentiate him from “I know Kubernetes” résumé padding?
- Would a tech lead believe he’ll push back on over-engineering?

**Review questions:**

- Three distinct themes: pragmatism, craftsmanship, learning-by-building?
- Each principle is **behavioral** (ship, feedback, boundaries) not empty values?
- Copy is confident without arrogance?
- Grid readable on mobile?

---

## CV *(N/A — merged into hero + nav)*

CV download must be one click from nav and hero. No standalone `#resume` section unless it adds content beyond a duplicate button.

**Review questions:**

- Does nav “CV” open `/cv_manuel_Oelmaier_EN.pdf` in a new tab?
- Does hero include a primary Download CV action?
- PDF exists and matches homepage claims?

---

## Featured Work — Elite Chess / Candidates infrastructure

**Goal:** **Anchor credibility** — prove he operated real infrastructure under maximum pressure where failure is public and costly. This is the “Featured” item that justifies high trust and high pay.

**Human questions:**

- Do I believe he owned something that mattered?
- Does “zero unplanned downtime” + world-level chess event make me want to interview him?
- Is confidentiality handled professionally (NDA note, recommendation letter) without sounding evasive?
- Would I stake a six-figure hiring decision partly on this card?

**Review questions:**

- Title names scope (distributed analysis infrastructure) and context (elite chess / Candidates)?
- Copy states **ownership**: designed, secured, operated, dashboard, scaling?
- Outcome is concrete (uptime, team result) not vague “helped the team”?
- Confidentiality note sets expectations without emptying the proof?
- Tags match buyer keywords: Linux/HPC, distributed systems, security, observability?

---

## Project Showcase

**Goal:** Show ** breadth and initiative** beyond one flagship — self-directed systems that mirror what well-paid AI/infra roles require.

### Homelab & AI Agent Platform card

**Human questions:**

- Does this read as production-minded engineering, not a hobbyist’s Raspberry Pi?
- Would a privacy-conscious or cost-conscious CTO respect this architecture?
- Does the blog link feel like depth, not a escape hatch from weak copy?

**Review questions:**

- Describes real scope: Tailscale-only, Traefik, GitOps, backups, GPU inference, MCP agents?
- Security and automation are explicit (audits, TLS, privacy tests)?
- “Read the write-up” links to the correct blog post?
- Tags reinforce stack credibility?

### LocalPythonCodingLlm card

**Human questions:**

- Does this prove he can take ML from experiment to **shipped product**?
- Is the privacy/local inference angle a believable engineering trade-off, not hype?
- Does the screenshot make the project tangible?

**Review questions:**

- Narrative covers fine-tune → benchmark → ship (VS Code extension)?
- GitHub link works and repo is presentable?
- Screenshot loads with meaningful alt text?
- Tags: Python, PyTorch, TypeScript?

### Showcase section as a whole

**Human questions:**

- Together, do these projects support a rate **above** junior-market average?
- Is there a clear story: infra + AI + product delivery?

**Review questions:**

- Two (or more) cards with consistent visual weight?
- Strongest proof (Featured Work) is not duplicated here at lower impact?

---

## Code — GitHub activity *(removed — N/A)*

Section removed from homepage until public GitHub activity reflects product repos, not portfolio commits alone. Widget tooling (`fetch-github.php`, `/github-activity.json`) remains for a future re-add. See `goals.md` § Remaining gaps.

---

## Contact

**Goal:** **Convert interest into conversation** — clear openness to paid work and multiple paths to verify identity (email, LinkedIn, GitHub).

**Human questions:**

- Do I know exactly what to offer him (engineering role, contract, collaboration)?
- Is reaching out easy and professional?
- Does LinkedIn/GitHub presence reinforce the same person as the page?

**Review questions:**

- Copy states openness to engineering roles, contract work, and collaborations — working-student only as a secondary, substantive qualifier?
- Invites relevance-based outreach (“if something I’ve built is relevant”)?
- Mailto `manuel@oelmaier.eu` works?
- LinkedIn and GitHub links correct, open in new tab, accessible labels?
- Contact is visually prominent — not an afterthought below the fold on typical laptop?

---

## Cross-cutting: trust, money, and polish

**Goal:** Nothing on the homepage should cheapen the offer or create doubt before the first email.

**Human questions (read as a hiring manager with budget):**

- Would I introduce this person to a client charging **senior-adjacent** rates for AI/infra work?
- Is there any copy, visual sloppiness, or broken element that would make me choose the next candidate?
- Does the whole page feel **coherent** — one person, one story, increasing proof as I scroll?
- Is the tone confident and warm, not desperate or arrogant?

**Review questions:**

- All links (CV, GitHub, LinkedIn, blog, mailto) work?
- Mobile-usable throughout; no horizontal scroll or tiny tap targets?
- Accessibility tests include `/`?
- Images optimized and professional?
- No lorem ipsum, placeholder text, or outdated dates that undermine trust?
- First impression + full scroll both strengthen — not front-loaded with fluff and back-loaded with proof?

---

## Open product goals (not routine review blockers)

- Interactive demos on project cards (chess, bot query, quiz) — when added, re-review Project Showcase under “would this increase desire to hire?”
