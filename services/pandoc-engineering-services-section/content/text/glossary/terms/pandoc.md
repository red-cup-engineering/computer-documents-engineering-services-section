---
name: "pandoc"
aliases:
  - "pandoc"
date-created: 2026-08-16
tags: []
---

***Pandoc*** is a document converter that reads a document in one markup codec into a single abstract document model and writes that model out in another. Its readers and writers are independent, so support for a codec is added once on each side rather than once per pair — the reason it converts between formats it was never specifically taught to pair. Conversion is lossy by construction: what survives is the intersection of what the reader can recognize and what the writer can express, and a [Lua filter](lua-filter.md) is how a caller intervenes in between.
