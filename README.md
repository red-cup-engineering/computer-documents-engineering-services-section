# Documents services section

Documents are content carriers with a document codec and bounded metadata.
This section owns interpretation and release composition; byte custody remains
with content/file services and standards acceptance remains independent.

## Services

- [`computer-article-engineering-services-section`](services/computer-article-engineering-services-section/) — the
  article as a document kind, and the dated collection paths articles occupy.
- [`pandoc-engineering-services-section`](services/pandoc-engineering-services-section/) — conversion
  between document codecs through Pandoc, whose reader performs this section's
  interpretation and whose writer performs its release composition.
- [`ebook-engineering-services-section`](services/ebook-engineering-services-section/)
  — the book as a document kind: multi-chapter assembly, cover art, and a
  hash-verified deterministic build record producing EPUB+PDF release
  artifacts.
- [`research-document-metadata-admission-service`](services/research-document-metadata-admission-service/)
  — admits decoded research-document metadata and projects its declared
  document relations without coupling a Markdown carrier to a database or API.
- `services/research-source-packet-admission-service/lib/legacy/2026-03-11-research-math-tools/` — independently authored research-corpus and research-program tools. YouTube research packets now live with their channels in `youtube/channels/`.
- `services/medical-glossary-delivery-service/` — searches and delivers the
  medical glossary projected from its scientific source corpus.
