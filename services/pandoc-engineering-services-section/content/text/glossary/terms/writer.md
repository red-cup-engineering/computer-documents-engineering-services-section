---
name: "writer"
aliases:
  - "writer"
date-created: 2026-08-16
tags: []
---

A ***Pandoc writer*** renders the [Pandoc AST](pandoc-ast.md) into one output codec. Writers differ in what they can express, and a writer silently omits what its codec has no form for — GFM drops heading attributes, for instance, so an identity carried faithfully through reader and filters can still vanish at the last step with no error raised. Choosing a writer is therefore part of stating what a conversion is obliged to preserve, not a formatting preference.
