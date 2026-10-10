import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { relativeLinkPath } from "@red-cup-engineering/markdown-engineering-services-section/relocate-markdown-tree";
import { statPath } from "@red-cup-engineering/computer-file-engineering-services-section/stat-path";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

const SCHEMA_PATH = projectFileUrlFilepath(new URL("../data/records/schema/specification.schema.json", import.meta.url).href);
const SPECIFICATION_SCHEMA = JSON.parse(await readFileText(SCHEMA_PATH));
const CLAUSE_PLACEHOLDER = /\{\{clause:([a-z0-9-]+)\}\}/gu;
const LAW_PLACEHOLDER = /\{\{law:([a-z0-9-]+)\}\}/gu;
const STANDARD_PLACEHOLDER = /\{\{standard:([a-z0-9-]+)\}\}/gu;
const NORMATIVE_KEYWORD = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\b/gu;
const WHOLE_MARKDOWN_LINK = /^\[([^\]]*)\]\(([^)]+)\)$/u;
const EXTERNAL_TARGET = /^https?:\/\//u;
const REPO_RELATIVE_TARGET = /^(?:lib\/|\.claude\/|CLAUDE\.md$)/u;

/**
 * Returns the parsed house Specification JSON Schema. Loaded once via top-level await when this
 * module is imported, kept as a function for API stability.
 * @returns {object} The parsed Draft 2020-12 schema document.
 */
export function loadSpecificationSchema() {
  return SPECIFICATION_SCHEMA;
}

/**
 * Validates a candidate Specification record against the house schema.
 * @param {unknown} record A candidate Specification record.
 * @returns {{valid: boolean, issues: readonly {kind: string, path: string, keyword: string, message: string}[]}}
 */
export function validateSpecificationRecord(record) {
  return validateJsonSchema(record, SPECIFICATION_SCHEMA);
}

/**
 * Classifies a bare citation target (a law/standard `locator`, or the target half of a
 * `[label](target)` `backedBy` entry) as an external URL, a repo-relative path, or neither.
 * @param {string} target
 * @returns {"external"|"repo-relative"|"unclassified"}
 */
export function classifyCitationTarget(target) {
  if (EXTERNAL_TARGET.test(target)) return "external";
  if (REPO_RELATIVE_TARGET.test(target)) return "repo-relative";
  return "unclassified";
}

/**
 * Resolves one `backedBy` citation string against the carrier it will be rendered into: a plain
 * prose note (no `[label](target)` syntax) passes through unchanged; an external URL target
 * passes through unchanged; a repo-relative target has its link recomputed via
 * `relativeLinkPath` from `carrierRepoRelativePath` — this is the fix for the actual failure this
 * tool shipped once already: hand-counting `../` segments per citation, which produced real,
 * silently-wrong relative links. A target already written relative-to-carrier by convention (not
 * matching either classification) passes through unchanged, so citations authored before this
 * convention existed keep rendering exactly as before.
 * @param {string} text One `backedBy` array entry.
 * @param {string} carrierRepoRelativePath `identity.carrier` of the record being rendered.
 * @returns {string}
 */
export function resolveCitationText(text, carrierRepoRelativePath) {
  const match = WHOLE_MARKDOWN_LINK.exec(text);
  if (!match) return text;
  const [, label, target] = match;
  if (classifyCitationTarget(target) === "repo-relative") return `[${label}](${relativeLinkPath(carrierRepoRelativePath, target)})`;
  return text;
}

/**
 * Resolves one law/standard `locator` against the carrier it will be rendered into, wrapping it
 * as a clickable Markdown link when it is an external URL or a repo-relative path (recomputed via
 * `relativeLinkPath`, the same fix `resolveCitationText` applies to `backedBy` entries); any other
 * bare string (a locator that is neither, e.g. a house-internal identifier) passes through as
 * plain text.
 * @param {string} locator
 * @param {string} carrierRepoRelativePath `identity.carrier` of the record being rendered.
 * @returns {string}
 */
export function resolveLocatorText(locator, carrierRepoRelativePath) {
  const classification = classifyCitationTarget(locator);
  if (classification === "external") return `[${locator}](${locator})`;
  if (classification === "repo-relative") return `[${locator}](${relativeLinkPath(carrierRepoRelativePath, locator)})`;
  return locator;
}

/**
 * Collects every repo-relative citation target a record's `backedBy` entries and law/standard
 * `locator`s name (external URLs and unclassified bare strings are skipped — this checks what the
 * tree can confirm, not the open web), confirms each exists under `repoRoot` via `confinePath` and
 * `statPath`, and reports any that do not. This is the automated replacement for a session
 * manually running `test -e` over grepped links after the fact.
 * @param {object} record A Specification record (need not yet be schema-valid).
 * @param {{repoRoot: string}} options Absolute path to the repository root.
 * @returns {Promise<{valid: boolean, missing: readonly {target: string, resolvedPath: string}[]}>}
 */
export async function verifyCitationTargetsExist(record, { repoRoot }) {
  const targets = new Set();
  for (const topic of record.topics ?? []) {
    for (const clause of topic.clauses ?? []) {
      for (const entry of clause.backedBy ?? []) {
        const match = WHOLE_MARKDOWN_LINK.exec(entry);
        if (match && classifyCitationTarget(match[2]) === "repo-relative") targets.add(match[2]);
      }
    }
  }
  for (const entry of [...(record.laws ?? []), ...(record.standards ?? [])]) {
    if (classifyCitationTarget(entry.locator) === "repo-relative") targets.add(entry.locator);
  }
  const missing = [];
  for (const target of targets) {
    const resolvedPath = confinePath({ root: repoRoot, path: target }).path;
    if (!(await statPath({ path: resolvedPath })).exists) missing.push({ target, resolvedPath });
  }
  return { valid: missing.length === 0, missing };
}

/**
 * Derives the absolute repository root from a carrier's destination path and its
 * `identity.carrier` (a repo-relative path), refusing when the destination does not actually end
 * with the carrier path — the guard against pointing make/update-specification.mjs at a
 * destination that does not match the record's own declared identity, and how those scripts
 * learn `repoRoot` for `verifyCitationTargetsExist` without a separate CLI argument.
 * @param {string} destinationPath Absolute path a carrier is being written to or read from.
 * @param {string} carrierRepoRelativePath `identity.carrier` of the record.
 * @returns {string} The absolute repository root.
 * @throws {TypeError} When destinationPath does not end with carrierRepoRelativePath.
 */
export function repoRootFromDestination(destinationPath, carrierRepoRelativePath) {
  if (!destinationPath.endsWith(carrierRepoRelativePath)) {
    throw new TypeError(`specification: destination "${destinationPath}" does not end with identity.carrier "${carrierRepoRelativePath}"`);
  }
  return destinationPath.slice(0, destinationPath.length - carrierRepoRelativePath.length);
}

function renderClause(clause, carrierRepoRelativePath) {
  const citation = clause.backedBy.map((entry) => resolveCitationText(entry, carrierRepoRelativePath)).join("; ");
  const tested = clause.test !== undefined ? ` Checked by: ${clause.test}.` : "";
  return `**${clause.actor} ${clause.keyword}** ${clause.statement} (${citation}).${tested}`;
}

function renderLawOrStandard(entry, carrierRepoRelativePath) {
  const locator = resolveLocatorText(entry.locator, carrierRepoRelativePath);
  return `${entry.statement} (**${entry.authority} ${entry.revision}**, ${locator}; applies to: ${entry.applicability}).`;
}

function substitutePlaceholders(body, pattern, kind, byId, seen, carrierRepoRelativePath) {
  return body.replace(pattern, (match, id) => {
    const entry = byId.get(id);
    if (entry === undefined) throw new TypeError(`specification: body references undefined ${kind} "${id}"`);
    seen.add(id);
    return kind === "clause" ? renderClause(entry, carrierRepoRelativePath) : renderLawOrStandard(entry, carrierRepoRelativePath);
  });
}

function renderBody(body, clausesById, lawsById, standardsById, seenClauses, seenLaws, seenStandards, carrierRepoRelativePath) {
  let text = substitutePlaceholders(body, CLAUSE_PLACEHOLDER, "clause", clausesById, seenClauses, carrierRepoRelativePath);
  text = substitutePlaceholders(text, LAW_PLACEHOLDER, "law", lawsById, seenLaws, carrierRepoRelativePath);
  text = substitutePlaceholders(text, STANDARD_PLACEHOLDER, "standard", standardsById, seenStandards, carrierRepoRelativePath);
  return text;
}

function requireEveryEntryReferenced(kind, byId, seen) {
  for (const id of byId.keys()) {
    if (!seen.has(id)) throw new TypeError(`specification: ${kind} "${id}" is defined but never referenced inline by a {{${kind}:${id}}} placeholder`);
  }
}

function renderFrontmatter(identity) {
  const lines = ["---", `title: "${identity.title}"`, `date-created: ${identity["date-created"]}`, `authors: [${identity.authors.join(", ")}]`, `status: ${identity.status}`, `part-of: ${identity.seat}`, `version: ${identity.version}`, `stability: ${identity.stability}`, "---"];
  return lines.join("\n");
}

function renderImplementations(implementations) {
  if (implementations.length === 0) return "";
  const sections = implementations.map((implementation) => `### ${implementation.context}\n\n${implementation.body}`);
  return `\n\n## Implementations\n\n${sections.join("\n\n")}`;
}

function renderOpenQuestions(openQuestions) {
  if (openQuestions.length === 0) return "None.";
  return openQuestions.map((question) => `- **${question.question}** Resolution blocked by: ${question.blockedBy}`).join("\n");
}

/**
 * Renders a validated "prose"-profile Specification record into the house Markdown carrier
 * shape (frontmatter; `## What this is`; one `## <heading>` per topic with its clauses rendered
 * inline where the topic body places a `{{clause:<id>}}` placeholder; `## Implementations` when
 * present; `## Open questions`), as a pure function of the record — every citation link is
 * recomputed from `identity.carrier` via `relativeLinkPath`, never taken as pre-rendered text.
 *
 * Every clause, law, and standard the record defines MUST be referenced by exactly the
 * placeholders its topic bodies place, and every placeholder MUST resolve to a defined entry —
 * this is what keeps normative claims inline and in context rather than collected into a flat
 * list, per the house specification format.
 * @param {object} record A Specification record already validated against the house schema.
 * @returns {string} The rendered Markdown carrier text, ending with a trailing newline.
 * @throws {TypeError} When a placeholder is undefined, or a defined clause/law/standard is unreferenced.
 */
export function renderSpecificationMarkdown(record) {
  const profile = record.identity.profile ?? "prose";
  if (profile !== "prose") throw new TypeError(`specification: renderSpecificationMarkdown only renders the "prose" profile, got "${profile}"`);
  const carrier = record.identity.carrier;
  const clausesById = new Map(record.topics.flatMap((topic) => topic.clauses.map((clause) => [clause.id, clause])));
  const lawsById = new Map(record.laws.map((law) => [law.id, law]));
  const standardsById = new Map(record.standards.map((standard) => [standard.id, standard]));
  const seenClauses = new Set();
  const seenLaws = new Set();
  const seenStandards = new Set();

  const sections = [renderFrontmatter(record.identity), `# ${record.identity.title}`, `## What this is\n\n${renderBody(record.whatThisIs, clausesById, lawsById, standardsById, seenClauses, seenLaws, seenStandards, carrier)}`];

  for (const topic of record.topics) {
    sections.push(`## ${topic.heading}\n\n${renderBody(topic.body, clausesById, lawsById, standardsById, seenClauses, seenLaws, seenStandards, carrier)}`);
  }

  requireEveryEntryReferenced("clause", clausesById, seenClauses);
  requireEveryEntryReferenced("law", lawsById, seenLaws);
  requireEveryEntryReferenced("standard", standardsById, seenStandards);

  let text = sections.join("\n\n") + renderImplementations(record.implementations);
  text += `\n\n## Open questions\n\n${renderOpenQuestions(record.openQuestions)}\n`;
  return text;
}

function dedupLawsOrStandards(kind, topics) {
  const byId = new Map();
  for (const topic of topics) {
    for (const entry of topic[kind] ?? []) {
      const existing = byId.get(entry.id);
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(entry)) {
        throw new TypeError(`deriveSpecificationRecord: two topics define ${kind} "${entry.id}" with different content`);
      }
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()];
}

/**
 * Derives one canonical, schema-shaped Specification record from a looser authoring draft: a
 * draft names its laws and standards once per topic, local to where they are cited, and this
 * function collects them into the record's deduplicated top-level `laws`/`standards` arrays
 * (refusing when two topics define the same law/standard id with different content), fills
 * `identity.version`/`stability`/`status`/`date-created` and `provenance.derivedAt`/`derivedBy`
 * with defaults when the draft omits them, and strips each topic's now-redundant local
 * `laws`/`standards`. This is the "journals to interpreters" assembly step: the draft's prose,
 * clause content, and citations are still authored by whoever interprets the source journal
 * entries — this function only makes the assembly into one schema-valid record deterministic.
 * @param {object} draft An authoring draft: `identity` (partial), `whatThisIs`, `topics`
 *   (each with an optional local `laws`/`standards` array of full law-or-standard objects),
 *   `implementations`, `openQuestions`, and `provenance` (at least `derivedFrom`).
 * @param {{now?: string}} [options] `now` overrides the derived timestamp/date for determinism.
 * @returns {object} A record shaped to validate against the house Specification schema.
 * @throws {TypeError} When two topics define the same law or standard id with different content.
 */
export function deriveSpecificationRecord(draft, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const today = now.slice(0, 10);
  const laws = dedupLawsOrStandards("laws", draft.topics);
  const standards = dedupLawsOrStandards("standards", draft.topics);
  const topics = draft.topics.map(({ laws: _laws, standards: _standards, ...topic }) => topic);
  return {
    identity: {
      version: "0.1.0",
      stability: "draft",
      status: "draft",
      "date-created": today,
      ...draft.identity,
    },
    whatThisIs: draft.whatThisIs,
    topics,
    implementations: draft.implementations ?? [],
    openQuestions: draft.openQuestions ?? [],
    laws,
    standards,
    ...(draft.rfc === undefined ? {} : { rfc: draft.rfc }),
    provenance: {
      derivedAt: now,
      derivedBy: "derive-specification.mjs",
      ...draft.provenance,
    },
  };
}

/**
 * Counts BCP 14 normative keyword occurrences in one text, by keyword, as a pure string scan.
 * Does not distinguish a keyword rendered by `renderSpecificationMarkdown` from one hand-typed
 * into surrounding prose — that distinction is what `census-specification.mjs` uses a companion
 * record's presence to make instead.
 * @param {string} text Carrier text to scan.
 * @returns {Record<"MUST"|"MUST NOT"|"SHOULD"|"SHOULD NOT"|"MAY", number>}
 */
export function countNormativeKeywords(text) {
  const counts = { MUST: 0, "MUST NOT": 0, SHOULD: 0, "SHOULD NOT": 0, MAY: 0 };
  for (const [keyword] of text.matchAll(NORMATIVE_KEYWORD)) counts[keyword] += 1;
  return counts;
}
