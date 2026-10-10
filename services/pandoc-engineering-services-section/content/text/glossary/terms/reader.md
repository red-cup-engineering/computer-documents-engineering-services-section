---
name: "reader"
aliases:
  - "reader"
date-created: 2026-08-16
tags: []
---

A ***Pandoc reader*** parses one input codec into the [Pandoc AST](pandoc-ast.md). It recognizes only the constructs the AST can hold; anything else is either discarded or preserved as raw markup in the source format, which is the reader reporting that it declined to interpret something rather than that nothing was there. A reader is the interpretation half of a conversion, and what it fails to recognize no filter or writer can recover.
