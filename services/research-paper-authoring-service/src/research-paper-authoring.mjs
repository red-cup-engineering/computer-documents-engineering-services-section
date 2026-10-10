const IDENTIFIER = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const freeze = (value) => Object.freeze(value);
const strings = (value, name) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) throw new TypeError(`${name} must be an array of non-empty strings`);
  return freeze([...value]);
};

export const researchPaperStructure = freeze([
  freeze({ id: "abstract", heading: "Abstract", markerVariants: freeze(["abstract"]) }),
  freeze({ id: "thesis", heading: "0. Thesis (Claim → Mechanism → Consequence → Contributions)", markerVariants: freeze(["0. thesis", "thesis (centered)"]) }),
  freeze({ id: "foundations", heading: "Foundations", markerVariants: freeze(["foundations", "critical foundations", "domain foundations"]) }),
  freeze({ id: "synthesis", heading: "Theory→Model Synthesis", markerVariants: freeze(["synthesis", "theory→model", "theory->model"]) }),
  freeze({ id: "lemma", heading: "Lemmas and Regimes", markerVariants: freeze(["lemma", "lemmas", "proof"]) }),
  freeze({ id: "measurement", heading: "Measurement", markerVariants: freeze(["measurement", "appendix: measurement"]) }),
]);

function date(value, name) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) throw new TypeError(`${name} must be an ISO calendar date`);
  return value;
}

function metadata({ id, title, status = "draft", documentType = "paper", authors = [], topics = [], disciplines = [], keywords = [], createdOn, modifiedOn = createdOn }) {
  if (typeof id !== "string" || !IDENTIFIER.test(id)) throw new TypeError("id must be a lowercase hyphenated identifier");
  if (typeof title !== "string" || title.trim() === "") throw new TypeError("title must be a non-empty string");
  if (typeof status !== "string" || status.trim() === "") throw new TypeError("status must be a non-empty string");
  if (typeof documentType !== "string" || documentType.trim() === "") throw new TypeError("documentType must be a non-empty string");
  return freeze({
    id, title, status, document_type: documentType,
    date_created: date(createdOn, "createdOn"), date_modified: date(modifiedOn, "modifiedOn"),
    authors: strings(authors, "authors"), topics: strings(topics, "topics"), disciplines: strings(disciplines, "disciplines"), keywords: strings(keywords, "keywords"),
  });
}

/** Plan one thesis-centered research paper without deciding its Markdown encoding or write location. */
export function planResearchPaperDraft(options) {
  const frontmatter = metadata(options ?? {});
  const sections = researchPaperStructure.map(({ id, heading }) => freeze({ id, level: 2, title: heading, body: "" }));
  return freeze({ kind: "research-paper-draft-plan/v1", frontmatter, sections: freeze(sections) });
}

/** Attach a research-note provenance witness to a new draft plan without copying it into a second file format. */
export function planResearchPaperFromNote({ note, ...options } = {}) {
  if (!note || typeof note.locator !== "string" || note.locator.trim() === "") throw new TypeError("note.locator must be a non-empty string");
  if (note.text !== undefined && typeof note.text !== "string") throw new TypeError("note.text must be a string when provided");
  const plan = planResearchPaperDraft({ ...options, title: options.title ?? note.locator.split("/").at(-1).replace(/[-_]/gu, " ").replace(/\.[^.]+$/u, "") });
  return freeze({ ...plan, provenance: freeze({ sourceNote: freeze({ locator: note.locator, ...(note.text === undefined ? {} : { text: note.text }) }) }) });
}

/** Assess a paper from canonical Markdown observations; this service never parses Markdown or performs file I/O. */
export function assessResearchPaperStructure({ frontmatter, headings, hasTable = false } = {}) {
  const errors = [];
  const warnings = [];
  if (frontmatter === null || frontmatter === undefined) errors.push("Missing document frontmatter");
  else if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) errors.push("Document frontmatter must be an object");
  if (!Array.isArray(headings) || headings.some((heading) => typeof heading?.title !== "string")) throw new TypeError("headings must be parsed heading records with titles");
  if (typeof hasTable !== "boolean") throw new TypeError("hasTable must be boolean");
  const headingText = headings.map(({ title }) => title.toLowerCase()).join("\n");
  for (const requirement of researchPaperStructure.slice(1)) {
    if (!requirement.markerVariants.some((marker) => headingText.includes(marker))) warnings.push(`Section likely missing or unmarked: ${requirement.id}`);
  }
  if (!hasTable) warnings.push("No demonstration table was identified");
  return freeze({ ok: errors.length === 0, errors: freeze(errors), warnings: freeze(warnings) });
}
