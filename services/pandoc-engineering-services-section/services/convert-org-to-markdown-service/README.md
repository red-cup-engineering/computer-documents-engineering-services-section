# convert-org-to-markdown-service

Converts an Org document to Markdown under a fixed contract, carrying org-roam
node identity forward and dropping org-drill review state.

## Operations

```js
import {
  convertOrgToMarkdown,
  pandocOrgToMarkdownArguments,
  CONVERSION_CONTRACT,
  CONVERSION_FILTERS,
} from "@red-cup-engineering/convert-org-to-markdown-service";

const markdown = await convertOrgToMarkdown(org);
```

`convertOrgToMarkdown(org, options?)` resolves to Markdown. It takes and returns
strings, never paths: byte custody belongs to file services, and a converter
that opened files would be claiming it.

`pandocOrgToMarkdownArguments(options?)` returns the exact argument vector the
conversion runs under. It is exported so the contract can be asserted on a
machine with no pandoc, and so a caller integrating pandoc elsewhere can adopt
the same terms rather than approximate them.

There is also a CLI, reading stdin and writing stdout:

```sh
convert-org-to-markdown < biography.org > biography.md
```

## The contract

Reader `org`, writer `gfm+attributes`, `--standalone`, `--wrap=none`.

The writer is `gfm+attributes` and not `gfm` because plain GFM discards heading
attributes. A heading's org-roam `:ID:` is written as its anchor, so a writer
that drops attributes would silently discard the identity the filters just
finished preserving — with no error and no visible difference in the output.

`--wrap=none` emits one line per paragraph. Prose line shape is not this
service's decision; `semantic-linefeed-normalization-service` owns it. Unwrapped
output is the form that leaves that choice open.

Three Lua filters apply, and their order is part of the contract:

1. `drop-org-drill-state.lua` removes org-drill cards, the scheduling keys that
   annotate them, and any heading those removals empty.
2. `preserve-org-roam-identity.lua` moves a file's `:ID:` and `:ROAM_ALIASES:`
   into frontmatter and a heading's `:ID:` into its anchor, with `:ROAM_REFS:`
   retained beside it.
3. `drop-raw-org-residue.lua` removes Org the reader declined to interpret,
   such as `#+name:` affiliated keywords.

Drill removal runs first so that identity is never promoted for a card that is
about to be discarded.

## What survives, and what does not

Identity survives. A file `:ID:`, a heading `:ID:`, `:ROAM_ALIASES:`, and
`:ROAM_REFS:` are the link targets other documents point at with `[[id:…]]`; a
conversion that dropped them would sever the corpus graph invisibly.

Review bookkeeping does not survive. Org-drill's card type, ease, interval,
repeat and failure counts, last quality, and last-reviewed stamps are evidence
about a reader's practice at some past moment, not about the document's subject.

A drill card is removed whole rather than stripped and kept, because the card
*is* that state: its body is a cloze-deleted restatement of prose that already
appears elsewhere in the document, written to be recited rather than read.

An emptied parent heading is removed with it. A heading that was already empty
in the source is kept — that emptiness is the author's, not ours.

## Limits

`[[id:…]]` links convert to `id:` URIs and remain unresolved. Turning a UUID
into a carrier path needs an identifier index this service does not hold; the
URI preserves the claim so a resolver can settle it later.

Pandoc must be on `PATH`, or supplied as `options.pandocPath`. A missing pandoc
rejects rather than returning empty output. Installing it is a machine concern
and belongs to operating system services.
