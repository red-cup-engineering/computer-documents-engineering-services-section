---
name: "Pandoc AST"
aliases:
  - "Pandoc AST"
  - "pandoc-ast"
date-created: 2026-08-16
tags: []
---

The ***Pandoc AST*** is the abstract document model every conversion passes through: a `Meta` map of document metadata and a tree of blocks and inlines, each carrying an optional identifier, classes, and key-value attributes. It is an intermediate that Pandoc owns for the duration of one invocation. It is not a knowledge representation and carries no evidence about referents; a `Meta` key means only that some reader put it there.
