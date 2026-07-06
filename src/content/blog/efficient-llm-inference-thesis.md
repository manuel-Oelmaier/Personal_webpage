---
title: "Hidden state informed token eviction"
description: "Ongoing bachelor thesis sketch on efficient LLM inference — not every word needs exact memory. Designing different levels of importance for what a model keeps verbatim versus in summary."
pubDate: 2026-07-05
tags:
  - ai
  - llm-inference
  - research
problem: "An LLM has to remember past context to stay coherent — but remembering everything in full detail gets slow and expensive fast."
---

When you chat with an LLM, it has to *remember* what came before. The hard part is not generating the next word — it is deciding **what to keep in memory, in what form, and for how long**.

Humans do this naturally. You do not replay every second of a meeting in your head; you keep a rough summary and only recall exact quotes when you need them. LLMs face the same trade-off, but their “memory” is engineered — and right now, most models lean heavily on one kind.

## Two ways models remember

**1. Verbatim memory — the KV cache**

The standard Transformer stores past tokens as keys and values in a **KV cache** <a class="cite" href="#ref-1">[1]</a>. Think of it as a perfect transcript: every earlier token is kept exactly, so the model can look up any detail with full softmax attention. Compute scales as \(O(n^2)\) over context length; memory scales as \(O(n)\) too, because the cache grows with every token you retain.

**2. Compressed memory — the recurrent state**

A different design compresses history into a **fixed-size state** — a small matrix that holds a summary of what mattered so far, not a token-by-token copy <a class="cite" href="#ref-2">[2]</a>. Linear attention and related recurrent mixers work this way: \(O(n)\) compute over sequence length and **bounded** memory, because the state stays fixed no matter how long the context runs.

That buys runtime and memory efficiency — at the cost of model quality. The trade-off is recall. A summary can blur or drop details that a verbatim cache would still have.

Neither design wins on every task. That is why the field is moving toward **hybrids** — models that use more than one kind of memory in the same stack <a class="cite" href="#ref-5">[5]</a>.

## What flagship models do today

**Qwen3-Next** and **Qwen3.5** alternate layer types: most layers use **Gated DeltaNet** (compressed, linear-time memory), and every fourth layer keeps standard softmax attention (verbatim-style lookup) <a class="cite" href="#ref-4">[4]</a>. Gated DeltaNet updates its compact memory with a delta rule — selectively overwriting what the state already holds, with gates that control what fades and what sticks <a class="cite" href="#ref-3">[3]</a>.

Rough analogy: most of the network runs on summarized memory; every few layers, the model gets a sharp, high-fidelity lookup pass.

## Hidden state informed token eviction

My bachelor thesis at TUM (ongoing), **Hidden State Informed Token Eviction**, starts from a simple question: **not every token needs exact memory**. Names, numbers, and definitions matter verbatim; filler and already-summarized context do not. The goal is to give an LLM **different levels of importance** for information — a running gist for most of the conversation, and a small exact-detail store for what the gist would distort.

Published hybrids like Qwen3-Next assign **one memory type per layer** and alternate them through the stack. I am building **both memory types inside the same layer**, with a rule that decides per token how important exact recall is.

Each modified layer runs two paths in parallel:

1. a **compressed recurrent state** — a summary of past context that stays fixed in size, and  
2. a **small, bounded KV cache** — exact storage for tokens that still need full lookup.

For each new token, the layer checks whether the summary can absorb it without losing something important. The **hidden state** of the compressed path is the signal: if dropping a token from exact memory would noticeably degrade the summary, it gets **promoted** into the bounded cache. Tokens the summary already captures stay out of it. Both paths are fused into the layer output.

In human terms: keep a running gist of the conversation, but promote names, numbers, and definitions into a short exact-detail list when the gist alone would distort them.

The implementation is a **pluggable research framework** on top of Hugging Face Transformers — swap attention blocks, keep shared tokenization and generation, run the same evaluation harness across **multiple model backbones**. The open question is whether this importance-based routing transfers: measurable gains in **throughput, peak memory, and task quality** on different base models, and where the accuracy–speed frontier breaks. Cross-backbone ablation is still in progress.

The architectural bet is deliberately narrow: not another interleaved stack, but a single layer that decides per token which level of memory it deserves.

## References

<ol class="references-list">
  <li id="ref-1">
    <a class="reference-link" href="https://arxiv.org/abs/1706.03762">Attention Is All You Need</a>
    <span class="reference-meta"> — Vaswani et al., 2017. Original Transformer and softmax attention.</span>
  </li>
  <li id="ref-2">
    <a class="reference-link" href="https://arxiv.org/abs/2006.16236">Transformers are RNNs</a>
    <span class="reference-meta"> — Katharopoulos et al., 2020. Linear attention as a fixed-size recurrent state.</span>
  </li>
  <li id="ref-3">
    <a class="reference-link" href="https://arxiv.org/abs/2412.06464">Gated Delta Networks</a>
    <span class="reference-meta"> — Yang et al., 2024. Gated DeltaNet and hybrid stacks with full attention.</span>
  </li>
  <li id="ref-4">
    <a class="reference-link" href="https://huggingface.co/docs/transformers/en/model_doc/qwen3_next">Qwen3-Next (Hugging Face)</a>
    <span class="reference-meta"> — Alibaba Qwen team. Flagship hybrid of Gated DeltaNet and gated softmax attention.</span>
  </li>
  <li id="ref-5">
    <a class="reference-link" href="https://sebastianraschka.com/llm-architecture-gallery/hybrid-attention/">Hybrid Attention</a>
    <span class="reference-meta"> — Raschka, 2025. Readable overview of why hybrid attention architectures exist.</span>
  </li>
</ol>
