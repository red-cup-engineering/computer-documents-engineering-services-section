---
title: "What Pandoc loses"
description: "Pandoc conversion is lossy by construction, and its losses are silent; naming what a conversion must preserve is the caller's job, not Pandoc's."
aliases:
  - "What Pandoc loses"
date-created: 2026-08-16
keywords:
  - pandoc
  - documents
  - conversion
teaches:
  - "Why a conversion contract must name what it preserves"
---

Pandoc converts by reading a document into one abstract model and writing that
model out again. Both halves are partial. The reader recognizes only what the
[Pandoc AST](../../glossary/terms/pandoc-ast.md) can hold, and the
[writer](../../glossary/terms/writer.md) emits only what its output codec can
express. What survives a conversion is the intersection of the two.

The losses are silent. Pandoc does not warn that a construct had nowhere to go,
because from its position nothing went wrong: it wrote a valid document in the
requested format. The difference between a faithful conversion and a lossy one
is not visible in the output, which is what makes it dangerous. A converted file
looks finished either way.

## The loss that matters is identity

Most losses are cosmetic and self-announcing — a table becomes plainer, an
emphasis nests differently, and a reader can see it. The loss that matters is
identity, because identity is invisible in the rendered document and load-bearing
outside it.

An org-roam document carries UUIDs: a file `:ID:`, a heading `:ID:`,
`:ROAM_ALIASES:`, `:ROAM_REFS:`. Those UUIDs are what every other document in
the corpus points at. Pandoc's Org reader does surface them — but as ordinary
attributes sitting beside a heading whose anchor holds a text-derived slug. That
inverts the roles: the address becomes decoration and the decoration becomes the
address. Write that out with a writer that drops attributes, and the identity is
simply gone.

Nothing about the resulting file looks wrong. Its prose is intact. The corpus
graph around it is severed.

## Two different reasons to encounter a property

Org-drill state travels in the same drawers as org-roam identity and reads the
same way — `:PROPERTIES:` … `:END:` — but it is a different kind of thing. Ease,
interval, repeat counts, and last-reviewed stamps are evidence about a *reader's
practice at some past moment*. A node `:ID:` is evidence about the *document*.
Colocation in the source is not kinship.

A conversion that treats a drawer as a drawer will either keep both or drop both,
and both are wrong. Preserving drill state carries a reader's 2023 review history
forward as though it were part of what the document says. Dropping identity cuts
the document out of the graph.

## So the contract belongs to the caller

Pandoc cannot decide this, and should not be asked to. Which properties are
identity and which are bookkeeping is a fact about the corpus, not about Org or
Markdown. A [Lua filter](../../glossary/terms/lua-filter.md) is the only point
where a caller can state it — which is why a conversion worth trusting is
defined by its filters and its writer, not by the fact that it ran.

The practical form of the rule: a conversion must name what it is obliged to
preserve, and then be tested against that claim. `pandoc -f org -t markdown` is
not a conversion contract. It is a hope.
