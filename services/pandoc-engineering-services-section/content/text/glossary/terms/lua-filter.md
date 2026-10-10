---
name: "Lua filter"
aliases:
  - "Lua filter"
  - "lua-filter"
date-created: 2026-08-16
tags: []
---

A ***Lua filter*** is a script that transforms the [Pandoc AST](pandoc-ast.md) between reading and writing. It exposes functions named for AST constructors — `Meta`, `Header`, `Span`, `Pandoc` — which Pandoc calls on each matching element, bottom-up, replacing it with whatever is returned. Filters apply in the order given on the command line, so order is semantic rather than incidental. A filter is where a conversion's obligations are stated explicitly, since it is the only point at which a caller can say what must survive.
