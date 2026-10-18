# Research paper authoring service

This service holds research-paper meaning: draft metadata, the thesis-centered
section plan, note provenance, and advisory structural assessment. It does not
parse or render Markdown, write files, invoke Pandoc, or publish a document.
Pass its plan to the canonical Markdown section renderer, and pass Markdown
observations back to `assessResearchPaperStructure` when assessing a draft.

## Versioned, independently received preprints

`./publication-readiness` exports `assessResearchPublicationReadiness`. It admits a paper version, explicit human responsibility and AI disclosures, scientific-status qualifications, declared source locators, and byte checksums. Its separately supplied byte-verification, public release and DOI receipts deliberately produce **different states**: a prepared candidate is not a published citable release, and a public release is not automatically DOI-registered. This is a pure meaning-side evaluation, not a second Pandoc builder, GitHub release effecter, archive depositor, referee or news distributor. The caller must independently authenticate receipts and ensure publication rights.

Use the Coesite Research Operations receiving procedure and the canonical Pandoc document-projection service for actual build and release. Running the Node test file gives deterministic admission/refusal fixtures; it does not attest to production deployment.
