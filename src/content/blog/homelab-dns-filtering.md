---
title: "How I made my phone believe .manu is a country"
description: "Tailscale's default names are ugly to type. I run Unbound with a private .manu zone so ai.manu and notes.manu work everywhere on the mesh."
pubDate: 2026-07-02
tags:
  - infrastructure
  - homelab
  - networking
problem: "Tailscale gave me connectivity, but its default DNS names were long and annoying to type. I wanted short bookmarks — ai.manu, notes.manu — on every device."
---

Tailscale solves reachability. It does not solve ergonomics. MagicDNS hands you names like `server-manu.tail1234.ts.net` — technically fine, miserable to type on a phone when you just want to open LibreChat. Hardcoding the underlying `100.x` addresses is worse; they are stable until they are not, and nobody should memorize them.

The fix is a **private zone** on a resolver you control. I picked **`.manu`**. [`ai.manu`](/blog/homelab-ai-platform) is chat, `notes.manu` is Joplin sync, `cal.manu` is CalDAV. Short, readable, one place to update when a service moves.

## What I tried first

**Tailscale hostnames as-is.** Works out of the box, but every bookmark looks like a machine identifier, not a service name.

**Hardcoded IPs** in apps and browser favourites. Breaks when you reshuffle containers or add a node.

**Hosts-file edits** per device. Fine until the phone is not fine.

**A subdomain on my real domain** — e.g. `ai.manuelolemaier.de`. Not the same thing. Public DNS is a public register: publishing A records there advertises where your homelab lives to anyone who looks. I do not want that. And the services are mesh-only anyway — there is nothing useful for the open internet to resolve, and a public zone is the wrong tool for names that should never leave Tailscale.

## How the zone works

**[Unbound](https://nlnetlabs.nl/projects/unbound/about/)** on a small always-on node handles two query types:

1. **`.manu` names** — answered from local zone data you maintain (`ai.manu` → Tailscale IP, and so on). The [local-zone and local-data](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html#local-zone) directives are enough for a handful of hosts; for a fuller zone, Unbound's [auth-zone](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html#auth-zone) clause loads a normal zone file.
2. **Everything else** — resolved recursively, so normal browsing still works without forwarding your whole query stream to Google or Cloudflare.

Point Tailscale [split DNS](https://tailscale.com/kb/1054/dns) at that resolver (or your router, if the whole LAN should use it). Update one zone when a service moves — not six clients.

For a handful of hosts, `local-zone` plus `local-data` lines are enough — no separate zone file:

```conf
# unbound.conf.d/manu-zone.conf (snippet)
local-zone: "manu." static
local-data: "ai.manu. IN A 100.64.10.1"
local-data: "notes.manu. IN A 100.64.10.1"
local-data: "cal.manu. IN A 100.64.10.1"
local-data: "cert.manu. IN A 100.64.10.1"
```

The IPs are Tailscale addresses on the node behind Traefik; several hostnames can share one IP because routing is by `Host` header, not by port. Add a line when a service moves — reload Unbound, done.

The [Unbound configuration guide](https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html) is the right starting point; run `unbound-checkconf` before you reload.

## TLS is the annoying part

Pretty names are only half the win. You still want `https://ai.manu`, not a certificate warning on every device.

That means a **private CA**: generate a root, issue certs for `*.manu`, install the root on each phone and laptop once. It works, but it is fiddly — renewal scripts, per-device trust, the occasional app that pins public CAs and refuses your homelab root. Let's Encrypt will not help here; these names are not on the public internet. Budget time for this; the DNS part is the easy bit.

## Nice, and while you are at it

Once Unbound is your network resolver, a few extras cost little and compound:

- **Recursive resolving** — Unbound walks the chain from root to authoritative server instead of handing every query to `1.1.1.1`. Your upstream no longer sees the full stream. Enabled by default when you run it as a full resolver; the [configuration guide](https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html) covers trust anchors and interfaces.
- **DNS-over-TLS (DoT) and DNS-over-HTTPS (DoH)** — encrypt DNS on the wire between clients and your resolver. Unbound exposes both via `tls-port` and `https-port` in [unbound.conf](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html) — useful on Wi‑Fi you do not own. Note that browsers with DoH enabled by default may bypass your resolver unless you disable or redirect that.
- **Network-wide ad blocking** — same resolver, different policy. Unbound [RPZ](https://unbound.docs.nlnetlabs.nl/en/latest/topics/filtering/rpz.html) (response policy zones) drops ad and telemetry domains for every device on the LAN, including apps browser extensions never see. Thousands of homelab posts already cover blocklist curation; RPZ is the Unbound-native version.

I run all three. None of them is why I built `.manu` — but they are why one resolver on the mesh is worth maintaining.

## Trade-offs

The ongoing cost is already in the sections above: zone edits when a service moves, private-CA trust on every device, and a resolver node that has to stay up.

The paths I did not take:

- **Tailscale MagicDNS only** — zero extra infra, ugly names, no custom namespace.
- **Public subdomains** — real certs are easier; you publish IPs and names to the world. 
- **Pi-hole in front of Unbound** — fine if you want a GUI for blocklists; I skip it and use RPZ directly.

## See also

- [A production AI homelab — tiered context and exposure](/blog/homelab-ai-platform) — what runs behind `ai.manu` and how context privacy is enforced

## References

- [Unbound configuration guide](https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html) — interfaces, access control, DNSSEC
- [unbound.conf(5)](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html) — `local-zone`, `auth-zone`, DoT/DoH ports
- [RPZ with Unbound](https://unbound.docs.nlnetlabs.nl/en/latest/topics/filtering/rpz.html) — network-wide blocking policy
- [Tailscale split DNS](https://tailscale.com/kb/1054/dns) — push your resolver to mesh clients
