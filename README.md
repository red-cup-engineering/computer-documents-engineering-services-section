# Documents services section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

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
