# Notes services section

Notes are dated article carriers that may be deposited beneath any admitted
actuator node at `content/text/documents/articles/notes/YYYY/MM/DD/`.

The `note-resource-service` catalogs and deposits these carriers. Its receipt
uses the complete filepath and carried bytes together as resource
identity; the byte digest remains a distinct witness. The typed restriction
path is realized by the directory path itself. A successful deposit does not
promote research material into law or authorize subsequent actuation.

## Carrier generation

The article package's existing path grammar supplies the note root and dated
`YYYY-MM-DD-note-on-<topic>.md` filename. The deposit action uses the shared
Markdown reader, note-frontmatter conformance, document creator and validator;
the creator delegates YAML encoding and semantic-linefeed normalization to
their existing providers. Those same providers serve other Markdown content.

Supply a substantive carrier from upstream work, its title and filing date,
and the note's real description and tags in existing carrier frontmatter or
the optional `frontmatter` object. The existing note conformance requires
`title`, a non-generic `description`, `date-created` and nonempty `tags`.
The filing date must agree with the authored creation date's day; a timestamp
is retained in full. Authorship, dates, references and other supplied fields
are retained. Conflicting supplied fields or a lossy codec round trip refuse
before writing. In particular, the current creator omits top-level null values,
so such metadata is refused rather than silently discarded.
Decoded and supplied metadata are admitted through the existing JSON
provider's bounded resource envelope before comparison or generation. Runtime
Date objects, undefined fields, non-finite numbers, cycles and accessor
properties are refused. The preservation claim covers admitted JSON values;
the YAML reader separately refuses non-JSON YAML values. An own top-level
`__proto__` field that the current creator cannot carry is also refused.

`carrier.sha256`, when supplied, covers the exact incoming UTF-8 bytes. The
receipt distinguishes this source witness from the normalized output identity
and reports non-destructive validation findings. A duplicated leading heading
is reported, not rewritten. This action does not fabricate an engineering
result, infer publication authority, or move existing notes from legacy paths.
