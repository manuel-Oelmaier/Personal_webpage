---
title: "Homelab foundations: network-level DNS filtering"
description: "Why network-level blocking beats browser extensions, and how to run Pi-hole with recursive DNS via Unbound."
pubDate: 2026-07-02
tags:
  - infrastructure
  - homelab
  - networking
problem: "Controlling communication of every device "
---

Browser extensions only cover one browser on one device. Router-level blocklists are often limited or opaque. The fix that actually works everywhere — phones, laptops, apps included — is to make your network's DNS resolver the filter.

## What I tried first

**Per-device browser extensions** block ads in the browser only. They do not affect in-app ads, system telemetry, or other devices on the network.

**Router DNS settings** can point at a public resolver (Google, Cloudflare) but rarely give you meaningful blocklists or visibility into what is being queried.

**Hosts-file edits** scale poorly — one file per machine, easy to bypass, no central policy.

## What Pi-hole does

Pi-hole is a **network-level DNS sinkhole**. You configure Pi-hole as the DNS resolver for your whole network. Every device sends queries to it instead of the router's default upstream.

Pi-hole keeps blocklists of known ad, tracking, and telemetry domains. When a device asks for a blocked name, the query is dropped locally — it never leaves your network.

Hardcoded IPs still slip through, but the bulk of ad and tracker traffic goes away at the DNS layer, including inside apps that browser extensions cannot touch.

## Going further: DoH, DoT, and recursive resolving

Once you run your own DNS, a few follow-on decisions matter.

**Standard DNS (UDP port 53)** sends queries in plaintext. Your ISP sees every domain lookup. Fast and simple, no privacy.

**DNS over HTTPS (DoH)** and **DNS over TLS (DoT)** encrypt queries in transit. DoH rides on port 443; DoT uses port 853. Both help against ISP snooping. Note that many browsers now use DoH by default, which can bypass Pi-hole — if blocklists should apply to browsers too, you need to disable or redirect that behavior.

**Recursive resolving** avoids forwarding everything to a third-party resolver like 8.8.8.8 or 1.1.1.1. Your server walks the chain from root nameservers → TLD → authoritative server. No upstream sees your full query stream.

**[Unbound](https://nlnetlabs.nl/projects/unbound/about/)** handles recursive resolution and pairs cleanly with Pi-hole: Pi-hole applies blocklists and serves the network; Unbound resolves behind it with no upstream dependency. Pi-hole documents the [Unbound setup](https://docs.pi-hole.net/guides/dns/unbound/) step by step.

## Trade-offs

- **Browser extensions only** — no infrastructure, but apps and other devices stay unfiltered.
- **Pi-hole with an upstream resolver** — straightforward setup and solid blocking; non-blocked queries still go to a third party.
- **Pi-hole + Unbound** — blocking plus recursive privacy; more components to maintain, and browser DoH may need extra configuration.

This DNS layer is still the foundation of the homelab stack described on the homepage — everything downstream assumes a resolver you control.
