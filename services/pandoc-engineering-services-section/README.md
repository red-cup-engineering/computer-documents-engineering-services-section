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

### Recovered book-source projection (local artifacts only)

The original local Pandoc `publish-book` command from [emsenn/2025-12-19-pandoc-publishing](https://github.com/emsenn/2025-12-19-pandoc-publishing) and the code archive is received **inside the existing** [project-document-through-pandoc-service](services/project-document-through-pandoc-service/), not as another book publisher or GitHub workflow. Its original byte-identical executable was selected first (archive blob `bee61615b088452ea9c34a9bd5f67c01b4a00f73`, first receiving source commit `edc21f1964a47c72f5f585e03f88e718d7ed24cc`); the current leaf then tightens output staging and argument refusal. The CLI preserves direct `--source/--outdir/--basename` and historical `--repo/--outroot` semantics and produces local HTML and PDF with `build.log` through a supplied Pandoc binary. CLI regression examples use an isolated fake Pandoc; they must be executed and qualified separately. This is **fabrication**, not an online release, independently received customer publication, reproducible paper release, or formal-math proof qualification. The original paper-workflow demand remains in [source Issue #1](https://github.com/emsenn/2025-12-19-pandoc-publishing/issues/1); its unpinned reusable GitHub Actions workflow was not activated in the current production CI.

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
