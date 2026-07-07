---
title: "A production AI homelab — tiered context and exposure"
description: "Why useful AI needs tiered personal context and exposure boundaries, walked through a plan-my-day context, three design steps per context, and the long-term layer underneath."
pubDate: 2026-07-06
tags:
  - homelab
  - infrastructure
  - ai
problem: "Useful AI needs the context of your life — but not every datasource deserves the same level of exposure. I wanted that control locally, not in someone else's SaaS."
---

AI is useful on repeatable tasks only if you curate the context each one needs — at a privacy level you're comfortable with, on infrastructure you control. I will walk through one context I actually built: *plan my day*.

Without that curation you re-explain the same calendar, journal, and todos every session, or paste too much into someone else's SaaS. Send sensitive context to a cloud model and you are one breach or policy change away from data you never meant to share.

Both were unacceptable for me. I listed the contexts I wanted AI to help with, then worked through **three design steps** for each — plus a **long-term layer** underneath that never really finishes.

## Per-context design

Work through these once per context. Your data sources and boundaries will differ; the sequence is the same. Below I follow *plan my day* through all three steps.

### Step 1: Identify and control your data sources

For *plan my day* the model needs today's calendar, open todos, and maybe yesterday's journal summary. Find where each piece actually lives, and whether you can get a copy onto hardware you run.

- **Calendar** — CalDAV sync to a server I control (Radicale in my stack)
- **Journal** — notes app with a sync target I own (Joplin → WebDAV)
- **Todos** — same notes stack, kept as plain files the server can read

Some sources are easy: point the sync target at your server and you are done.

Others are painful because the vendor walls the data in. **Apple Health** is worth the effort for me: it is already an aggregator — fitness band, scales, and iOS internals all feed into one store. Exporting *that* gives one health pipeline instead of chasing every device separately. Getting a reliable export out still meant trying three different apps until **[Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069)** produced a file I could sync to my server on a schedule — see their [REST API automation guide](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api) if you go the same route. Health data feeds other contexts (nutrition, fitness), not *plan my day* directly, but the same source-identification problem applies everywhere.

If you think about export paths before you buy a device, this step can be as easy or as difficult as you make it.

### Step 2: Draw the exposure boundary

The question is not how much detail — it is **who may see the data**: only self-hosted inference, or a third-party API, or the open internet. The world does not need to know your journal exists; your local stack still needs your grocery prefs in full.

For *plan my day*:

- **local only** — full calendar events, open todos, journal excerpts; never a cloud model, never a vendor log
- **external OK** — nothing in this context; I do not need a weather API or a public feed to plan a day indoors

Other contexts split differently. Raw health exports and homelab secrets stay local only; public APIs and store prices are fine if a tool call leaves the LAN.

**Local inference** is what makes "local only" enforceable. On the server I run [Ollama](https://ollama.com/) on an older GPU — enough for small models on predictable tasks like this. When I have a current GPU or need higher throughput, [vLLM](https://docs.vllm.ai/) or [SGLang](https://docs.sglang.ai/) are the engines I reach for instead. The boundary is only as real as the runtime behind it.

Encode the boundary in your chat UI too — in LibreChat, which models and MCP servers each agent may use. That stops you from accidentally wiring journal context into a cloud-backed agent. Policy on paper is not enough; the config should enforce it:

```yaml
modelSpecs:
  enforce: true
  prioritize: true
  list:
    - name: life-architect
      label: Life-architect
      default: true
      preset:
        endpoint: agents
        agent_id: "agent_bEaq4ZBfIZIvHWBCcCAtJ"
```

`enforce: true` locks users to this list — no ad-hoc agent or MCP pairing in the UI. Life-architect has no `mcpServers` entry; journal context arrives via injected instructions only. Tech-advisor and Nutritionist each get an explicit MCP allowlist in their spec.

### Step 3: Choose how to expose it to AI

**When you know upfront what the model needs → context injection.**

*Plan my day* is the textbook case. Before I open the chat I already know the payload: today's calendar block, open todos, yesterday's journal summary. A cron or systemd timer rebuilds that block in the system prompt on a schedule. No vector DB, basically zero overhead. This is the default for self-hosted models when the context is predictable.

**When you don't know what might be needed → RAG or MCP.**

Take a nutrition assistant: it might need macro tables, your diet prefs, *and* today's price of potatoes at your store. You cannot preload all of that every session — the prompt fills up, and most of it is irrelevant to any given question. Same problem as [LLM memory in general](/blog/efficient-llm-inference-thesis): you cannot keep everything verbatim.

- **RAG** — chunk static docs, retrieve what matches the question. Good for notes, recipes, articles you own — stuff that does not change every hour.
- **MCP** — model calls a tool when it realizes it needs something live: grocery API, calendar range, health summary. Good for credentials, APIs, and data neither of you knew you'd need until mid-conversation.

RAG pulls from what you indexed ahead of time. MCP fetches on demand. Often both in one agent — but not everything injected at the start.

## What I mapped out

The three steps above are the design method. Below is how they land in my [LibreChat](https://www.librechat.ai/) deployment at [`ai.manu`](/blog/homelab-dns-filtering) — three agents, each with a fixed exposure profile enforced in config (`modelSpecs.enforce`, agent-specific MCP allowlists).

| Context | Agent | Data sources | Exposure | How the model gets it |
| --- | --- | --- | --- | --- |
| Plan my day | Life-architect | Joplin journal & todos, goals; CalDAV calendar | Local only | Context injection — timer rebuilds `startup.md` into agent instructions |
| Homelab & code help | Tech-advisor | Curated tech profile (CV, stack, repos) | External OK | MCP read-only (`tech-fs`) |
| Meal planning & shopping | Nutritionist | Food prefs & shopping list, REWE prices, health summaries | Low — no journal or finance | MCP on demand (`nutrition-fs`, custom grocery API server, health export reader) |

Custom MCP servers cover the grocery API and health exports; everything else is off-the-shelf filesystem MCP with tight path roots. The pattern is always the same: decide the tier first, then pick injection vs MCP, then lock it in LibreChat so a tired click cannot route journal text to a cloud model.

## Long-term: maintain your setup

The design steps above are per context. Underneath all of them sits infrastructure that does not have a done state — keep services up, keep strangers out, do not lose data, revisit access and backups as the stack grows. AI policy is worthless on infrastructure you do not trust.

I did not write a separate guide for that — better ones already exist:

- [r/homelab wiki](https://www.reddit.com/r/homelab/wiki/index) — getting started, hardware notes, and community-maintained ops patterns
- [Restic backup documentation](https://restic.readthedocs.io/en/stable/040_backup.html) — encrypted, deduplicated backups with a clear restore path (what I use for stack data and secrets)
- [3-2-1 backup rule](https://www.backblaze.com/blog/the-3-2-1-backup-strategy/) — the baseline retention model worth designing around before you trust the box your data
