# Research paper authoring service

This service holds research-paper meaning: draft metadata, the thesis-centered
section plan, note provenance, and advisory structural assessment. It does not
parse or render Markdown, write files, invoke Pandoc, or publish a document.
Pass its plan to the canonical Markdown section renderer, and pass Markdown
observations back to `assessResearchPaperStructure` when assessing a draft.
