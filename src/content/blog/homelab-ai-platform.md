---
title: "The Story Behind My Homelab, Part 1: My First DNS Server"
description: "From a forgettable internship in 10th grade to running a recursive DNS resolver at home. Why network-level blocking matters and how to actually set it up."
pubDate: 2026-07-02
tags:
  - infrastructure
  - homelab
  - networking
problem: "On iOS there was no clean way to block ads and time-sink sites network-wide — browser extensions don't reach apps."
---

In my first internship at MSG in 10th grade, I was placed in the pen-testing team.
In practice, I essentially spent a week setting up a Pi-hole — mostly gathering first experiences with Linux, and reading about protocols I actually didn't find that interesting at the time. I remember pretty clearly just wanting to go back to my usual Windows PC. How times have changed; now I would never want to switch back to Windows.

At the end of the internship I was gifted money to buy my own Raspberry Pi. It mostly lay around.

---

Some time later I realized: wait, I actually want that again. A couple of things clicked at once.

First — ads on iOS were genuinely brutal back then. Not in the sense of annoying banners, but inside apps there was no real way to block them. Browser extensions don't touch apps, and there was no clean solution that worked network-wide. That seemed like a solvable problem.

Second, blocking websites I'd otherwise spend way too much time on (hello YouTube, Reddit, etc.) seemed like a useful thing to set up — if you can just make a domain not resolve, your phone doesn't even get a chance to load it.

That Raspberry Pi came back out of the drawer.

## What Pi-hole actually does

Pi-hole is a **network-level DNS sinkhole**. Instead of a browser extension that only works on one device and only in the browser, you make Pi-hole the DNS resolver for your whole network. Every device — phone, laptop, whatever — sends its DNS queries to the Pi instead of the router.

Pi-hole keeps a blocklist of known ad, tracking, and telemetry domains. When a device asks "what's the IP for `ad.com`?" it just gets nothing back. The request never leaves your network.

Well, hardcoded IPs are still something you don't catch, but the low-hanging fruit is done.

The practical result: ads disappear at the DNS layer across your entire network, including in apps that browser extensions can't touch. The iOS problem is just solved.

## The DNS rabbit hole: DoH, DoT, and recursive resolving

Once you're running your own DNS, there are a few things worth actually understanding — and then doing.

**Standard DNS (UDP port 53)** is the default. Queries go out in plaintext. Your ISP sees every domain you look up. Fast, simple, zero privacy.

**DNS over HTTPS (DoH)** and **DNS over TLS (DoT)** encrypt DNS queries in transit so your ISP can't read them. DoH tunnels over port 443 so it's indistinguishable from normal HTTPS traffic. DoT uses a dedicated port (853). Both are a real improvement. Worth knowing: many browsers now do DoH by default, which actually bypasses Pi-hole — so if you care about the blocklists applying to browsers too, you need to handle that.

**Recursive resolving** is the more interesting option. Instead of forwarding queries to an upstream resolver like Google (8.8.8.8) or Cloudflare (1.1.1.1), you resolve DNS yourself — starting from the root nameservers, down to the TLD (`.com`, `.de`, ...), down to the authoritative server for the domain. No third party ever sees your full query stream.

This is what **[Unbound](https://nlnetlabs.nl/projects/unbound/about/)** does. It pairs with Pi-hole cleanly — Pi-hole handles the blocklists and the network interface, Unbound sits behind it and does the actual resolving with no upstream dependency. Pi-hole's own docs have a [good guide for this exact setup](https://docs.pi-hole.net/guides/dns/unbound/).


Once you try to set up your own DNS record for a service, something else clicks too: country-code TLDs and the trust certificates you start with in a browser are all just there because the general public has decided to trust them (or doesn't know about it).

You can actually start inventing your own — why should a service I want to use live at an ugly IP, when it could instead live under `service.manu`: private, only reachable by me. And it just feels cool when you get technology to do something genuinely novel for you.

Next up: how I keep communication between my devices encrypted and reachable everywhere, even if my phone is not on my home Wi-Fi.