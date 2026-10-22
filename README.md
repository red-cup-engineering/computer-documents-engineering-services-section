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


## Industry-scale editorial production (0.2.0-dev.0 candidate)

This original Documents service now includes working **document-level** planning, drafting, structural review, and repeatable, source-bound manuscript assembly. It does not duplicate PTGAE grammar rules, the original English algebra, the Content Mill newsroom's journalism-specific evidence and reviewer, or a publisher's release authority.

**Actual implementation:**

- `./editorial-outline`: UAX #29 word segmentation and a deterministic TF-IDF cosine proposal for assigning already-authored claims to section topics. It refuses weak or ambiguous placement; existing human section assignments are not overwritten.
- `./editorial-production`: validates claim/source/section identities, computes source-dependent section revisions, supports bounded concurrent production (1–16 workers; up to 500 sections), reuses unchanged source-hash-matched sections, renders genuine Markdown with source markers and bibliography, and independently reviews citation visibility, missing claim references, repetition, and word budgets. Authoritative evidence and semantic equivalence remain separate.
- `./editorial-cli`: accepts an exact source-qualified JSON commission; writes a **new** `draft.md` and `editorial-receipt.json` without overwriting its input or an existing output. No default external inference, paid provider, editor approval, file replacement, or publication.
- `data/records/industry-writing-benchmarks.json`: owner-specific observed comparator capabilities for Grammarly Docs, WRITER, ProWritingAid, QuillBot Flow, and Markup AI (formerly Acrolinx), with the tasks and measurement criteria needed to establish actual parity/superiority instead of announcing it.
- `examples/writing-industry-commission.json`: source-qualified concrete benchmark document. Run `node src/editorial-cli.mjs examples/writing-industry-commission.json /tmp/industry-draft`, then inspect its actual draft and independent receipt.

Run `npm test` and `npm run check` on Node 22.16+ to verify the native implementation. The candidate now includes **18 passing local Node22 tests**, including 240 ordered concurrent sections, unsupported citation refusal, and an actual independent npm tarball installation. The packed consumer imports the installed exports, executes source-backed drafting/review, reads the distributed benchmark JSON, and invokes the installed CLI to write a new manuscript and receipt. This is independently runnable package-consumer evidence, not an installed production deployment, complete editor integration, fact-check, or vendor-parity demonstration.

The engineering division of responsibility is deliberate: natural-language grammar, lexical policy, and protected-source proofreading go to the existing `ptgae-engineering-services-section`; reader-facing newsroom citations, editorial treatment, and news release decisions stay in `content-mill-newsroom-services-section`. Documents provides their general planning and manuscript composition substrate. GenAI-assisted contextual drafting is an explicit provider interface, not an invented installed model or assumed authorization. The benchmark record names what must still be measured and built.
