---
name: publishing-a-specification
description: "Turn what code enforces and rulings settle into a house Specification record, render it as the house Markdown carrier and as an RFCXML v3 Internet-Draft, and verify it; submission and adoption are the founder's acts."
closure-kind: process
requires-capabilities:
  - read
  - write
  - path-corpus
  - specification-workbench
  - markdown-file-workbench
  - lspace-vault-search
---

# Publishing a specification

The method is the engineering note on the book and specification publishing
systems (`engineering-services-section/content/text/documents/articles/notes/2026/09/27/2026-09-27-note-on-the-book-and-specification-publishing-systems.md`,
section "The specification pipeline under the same method").
ActivityPub++ (`activitypub-services-section`, 2026-09-27) is the reference
run. Paths below are relative to `lib/emsenn/services/561-group/services/`.
`<spec section>` is
`engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-documents-engineering-services-section/services/computer-article-engineering-services-section/services/specification-engineering-services-section`.

## 1. Research: what is already settled

- **Clauses come from what exists.** Read the code that enforces the
  behavior, the rulings, and the glossary terms. A clause states what they
  already fix. Anything they leave open goes to Open questions, with what
  blocks it.
- **Standards come from a dated ledger.** Record each standard with its
  authority, revision and locator.

## 2. Write: the record

1. Author a draft: `identity`, `whatThisIs`, and `topics`.
   - Each topic has a Markdown `body` that places `{{clause:id}}`,
     `{{standard:id}}` and `{{law:id}}` inline.
   - Each clause has `actor`, exactly one BCP 14 `keyword`, a `statement`
     beginning with a verb, `backedBy` repo-relative links, and a `test`
     where one checks it.
   - Split a clause that would need two keywords into a sender clause and a
     receiver clause.
2. Add `implementations`, `openQuestions`, and `rfc`: `docName`, `category`,
   `submissionType`, `ipr`, `abstract`, `authors`, and normative and
   informative `references` tied to standards by `standard` id.
3. Include topics headed exactly **Security Considerations** and **IANA
   Considerations**.
4. Derive and pretty-print the record beside the carrier:
   `node <spec section>/scripts/derive-specification.mjs --now <ISO> < draft.json > <section>/content/text/documents/articles/specifications/<date>-specification-of-<id>.specification.json`.

## 3. Design and publish: the renderings

1. Render the house carrier:
   `node <spec section>/scripts/render-specification.mjs < <record> > <same name>.md`.
2. Render the Internet-Draft:
   `node <spec section>/scripts/render-specification-rfcxml.mjs < <record> > <docName>.xml`.
3. Verify. Both renderers refuse:
   - an unplaced or undefined clause, law or standard;
   - a draft without Security or IANA Considerations.

   Then run `verifyCitationTargetsExist` from `./specification` against the
   repository root, and fix every missing target.
4. Point the owning section's README at the carrier, and say the Markdown and
   XML are renderings: edit the record, then render again.

## 4. Adoption: the founder's acts

- **Submission is the founder's act.** Posting an Internet-Draft names its
  authors and is permanent.
- **Record the venue as a decision.** Choose between the independent stream,
  a Fediverse Enhancement Proposal and a W3C community group.
- **A new revision (`-NN`) follows the evidence.** Adoption feedback and
  interoperability probes are the evidence that opens it.
