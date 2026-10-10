# pandoc-services-section

Documents' domain for Pandoc, the document converter that reads a document in
one codec into a single abstract document model and writes that model out in
another.

Pandoc is seated under documents because its subject is a document codec.
Its reader performs the interpretation documents services owns, and its writer
performs the release composition documents services owns. It is not seated
under content publication, because converting a document does not release it to
an audience surface, and it is not seated under Markdown, because no one codec
is privileged in its model.

## What lives here

`content/` holds the maintained knowledge of the system: glossary terms for
Pandoc's own vocabulary, and notes about how it behaves.

`services/` holds the seated conversions.

- [`convert-org-to-markdown-service`](services/convert-org-to-markdown-service/)
  — converts an Org document to Markdown under a fixed invocation contract,
  carrying org-roam node identity forward and dropping org-drill review state.

## What this section does not own

Pandoc is an external program. This section owns the *contract* under which the
561 Group invokes it — which reader, which writer, which filters, and what a
conversion is obliged to preserve — not Pandoc's implementation, packaging, or
installation. Machine provisioning belongs to operating system services.

A conversion's output is a Markdown carrier, and every law that already governs
Markdown carriers continues to govern it. Admission of `.md` bytes belongs to
`markdown-file-services-section`. Prose line shape belongs to
`semantic-linefeed-normalization-service`. Dated collection paths belong to the
content path grammar services. This section does none of those and must not
duplicate them.

Pandoc's own `AST` is not a 561 Group document model. It is an intermediate the
converter owns for the duration of one invocation; nothing downstream may treat
a Pandoc `Meta` map as evidence about a referent.

## Identity is the thing a conversion must not lose

An Org document written by org-roam carries node identity: a file `:ID:`, a
heading `:ID:`, `:ROAM_ALIASES:`, and `:ROAM_REFS:`. Those UUIDs are the link
targets that other documents in the corpus point at with `[[id:…]]`. A
conversion that drops them silently severs the graph, and the severance is not
visible in the converted file.

So the contract this section enforces is: **identity survives conversion, and
review bookkeeping does not.** A file's `:ID:` and `:ROAM_ALIASES:` become
frontmatter. A heading's `:ID:` becomes the heading's anchor and its
`:ROAM_REFS:` an attribute beside it. Org-drill's scheduling keys — ease,
interval, repeat and failure counts, last-reviewed stamps — are evidence about
a reader's practice, not about the document's subject, and are dropped along
with the cards they annotate.

`[[id:…]]` links convert to `id:` URIs and stay unresolved. Resolving a UUID to
a carrier path requires an identifier index this section does not hold; the URI
preserves the claim so a resolver can settle it later.
