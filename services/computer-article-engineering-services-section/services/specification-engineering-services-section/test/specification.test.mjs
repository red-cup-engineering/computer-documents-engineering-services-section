import assert from "node:assert/strict";
import test from "node:test";
import { relativeLinkPath } from "@red-cup-engineering/markdown-engineering-services-section/relocate-markdown-tree";
import { classifyCitationTarget, countNormativeKeywords, renderSpecificationMarkdown, repoRootFromDestination, resolveCitationText, validateSpecificationRecord, verifyCitationTargetsExist } from "../src/specification.mjs";

const REPO_ROOT = "/home/emsenn/info";

function baseRecord(overrides = {}) {
  return {
    identity: {
      id: "example-specification",
      title: "Example specification",
      seat: "specification-engineering-services-section",
      carrier: "example-specification.md",
      "date-created": "2026-09-06",
      authors: ["emsenn"],
      version: "0.1.0",
      stability: "draft",
      status: "draft",
    },
    whatThisIs: "An example. {{clause:example-clause}}",
    topics: [
      {
        heading: "Constraints",
        body: "The example is constrained. {{clause:example-clause}} {{law:example-law}} {{standard:example-standard}}",
        clauses: [
          { id: "example-clause", keyword: "MUST", statement: "do the thing", actor: "The example", backedBy: ["a citation"] },
        ],
      },
    ],
    implementations: [],
    openQuestions: [],
    laws: [{ id: "example-law", authority: "The owner", revision: "v1", locator: "somewhere.md", applicability: "always", statement: "a law applies" }],
    standards: [{ id: "example-standard", authority: "ISO", revision: "2019", locator: "https://example.test", applicability: "dates", statement: "a standard applies" }],
    provenance: { derivedFrom: ["a ruling"], derivedAt: "2026-09-06T00:00:00Z", derivedBy: "test" },
    ...overrides,
  };
}

test("validateSpecificationRecord accepts a well-formed prose record", () => {
  const { valid, issues } = validateSpecificationRecord(baseRecord());
  assert.equal(valid, true, JSON.stringify(issues));
});

test("validateSpecificationRecord rejects a record missing required identity fields", () => {
  const record = baseRecord();
  delete record.identity.version;
  const { valid, issues } = validateSpecificationRecord(record);
  assert.equal(valid, false);
  assert.ok(issues.length > 0);
});

test("renderSpecificationMarkdown inlines a clause where its placeholder appears", () => {
  const markdown = renderSpecificationMarkdown(baseRecord());
  assert.match(markdown, /\*\*The example MUST\*\* do the thing \(a citation\)\./u);
  assert.doesNotMatch(markdown, /\{\{clause:/u);
});

test("renderSpecificationMarkdown inlines a law and a standard where their placeholders appear", () => {
  const markdown = renderSpecificationMarkdown(baseRecord());
  assert.match(markdown, /a law applies \(\*\*The owner v1\*\*, somewhere\.md; applies to: always\)\./u);
  assert.match(markdown, /a standard applies \(\*\*ISO 2019\*\*, \[https:\/\/example\.test\]\(https:\/\/example\.test\); applies to: dates\)\./u);
});

test("renderSpecificationMarkdown recomputes a repo-relative law locator's link from identity.carrier, never hand-typed dots", () => {
  const record = baseRecord();
  record.identity.carrier = "lib/emsenn/services/561-group/services/example-seat/content/text/documents/articles/specifications/example.md";
  record.laws[0].locator = ".claude/rules/org-layering.md";
  const markdown = renderSpecificationMarkdown(record);
  const expectedHref = relativeLinkPath(record.identity.carrier, record.laws[0].locator);
  assert.match(markdown, new RegExp(`\\[\\.claude/rules/org-layering\\.md\\]\\(${expectedHref.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\)`, "u"));
});

test("renderSpecificationMarkdown refuses a body placeholder naming an undefined clause", () => {
  const record = baseRecord();
  record.topics[0].body = "{{clause:missing-clause}}";
  assert.throws(() => renderSpecificationMarkdown(record), /undefined clause "missing-clause"/u);
});

test("renderSpecificationMarkdown refuses a defined clause that no topic body references", () => {
  const record = baseRecord();
  record.topics[0].clauses.push({ id: "orphan-clause", keyword: "MAY", statement: "do another thing", actor: "The example", backedBy: ["a citation"] });
  assert.throws(() => renderSpecificationMarkdown(record), /clause "orphan-clause" is defined but never referenced/u);
});

test("renderSpecificationMarkdown renders Open questions as None. when the array is empty", () => {
  const markdown = renderSpecificationMarkdown(baseRecord());
  assert.match(markdown, /## Open questions\n\nNone\.\n$/u);
});

test("renderSpecificationMarkdown renders an open question with its blocking dependency", () => {
  const record = baseRecord({ openQuestions: [{ question: "Is this open?", blockedBy: "a decision" }] });
  const markdown = renderSpecificationMarkdown(record);
  assert.match(markdown, /- \*\*Is this open\?\*\* Resolution blocked by: a decision/u);
});

test("renderSpecificationMarkdown refuses the code-work-order profile", () => {
  const record = baseRecord();
  record.identity.profile = "code-work-order";
  assert.throws(() => renderSpecificationMarkdown(record), /only renders the "prose" profile/u);
});

test("countNormativeKeywords counts MUST NOT separately from MUST", () => {
  const counts = countNormativeKeywords("A MUST do X. B MUST NOT do Y. C SHOULD do Z. D MAY do W.");
  assert.deepEqual(counts, { MUST: 1, "MUST NOT": 1, SHOULD: 1, "SHOULD NOT": 0, MAY: 1 });
});

test("classifyCitationTarget classifies an https URL as external", () => {
  assert.equal(classifyCitationTarget("https://example.test/thing"), "external");
});

test("classifyCitationTarget classifies a lib/, .claude/, or CLAUDE.md path as repo-relative", () => {
  assert.equal(classifyCitationTarget("lib/emsenn/services/561-group/README.md"), "repo-relative");
  assert.equal(classifyCitationTarget(".claude/rules/org-layering.md"), "repo-relative");
  assert.equal(classifyCitationTarget("CLAUDE.md"), "repo-relative");
});

test("classifyCitationTarget classifies anything else as unclassified", () => {
  assert.equal(classifyCitationTarget("../../.claude/rules/org-layering.md"), "unclassified");
  assert.equal(classifyCitationTarget("somewhere.md"), "unclassified");
});

test("resolveCitationText passes a plain prose note through unchanged", () => {
  const text = "this specification's own architecture decision; no external ruling names this requirement yet";
  assert.equal(resolveCitationText(text, "lib/emsenn/services/561-group/README.md"), text);
});

test("resolveCitationText passes an already-computed, pre-convention relative link through unchanged", () => {
  const text = "[org-layering.md](../../../.claude/rules/org-layering.md)";
  assert.equal(resolveCitationText(text, "lib/emsenn/services/561-group/content/x.md"), text);
});

test("resolveCitationText recomputes a repo-relative citation's link from the carrier", () => {
  const carrier = "lib/emsenn/services/561-group/services/example-seat/content/text/documents/articles/specifications/example.md";
  const text = "[org-layering.md](.claude/rules/org-layering.md)";
  const expectedHref = relativeLinkPath(carrier, ".claude/rules/org-layering.md");
  assert.equal(resolveCitationText(text, carrier), `[org-layering.md](${expectedHref})`);
});

test("repoRootFromDestination derives the root when destinationPath ends with identity.carrier", () => {
  const carrier = "lib/emsenn/services/561-group/README.md";
  assert.equal(repoRootFromDestination(`/home/emsenn/info/${carrier}`, carrier), "/home/emsenn/info/");
});

test("repoRootFromDestination refuses when destinationPath does not end with identity.carrier", () => {
  assert.throws(() => repoRootFromDestination("/home/emsenn/info/other.md", "lib/emsenn/services/561-group/README.md"), /does not end with identity\.carrier/u);
});

test("verifyCitationTargetsExist reports no missing targets when every repo-relative citation resolves", async () => {
  const record = baseRecord();
  record.laws[0].locator = "CLAUDE.md";
  const result = await verifyCitationTargetsExist(record, { repoRoot: REPO_ROOT });
  assert.deepEqual(result, { valid: true, missing: [] });
});

test("verifyCitationTargetsExist reports a repo-relative citation target that does not exist", async () => {
  const record = baseRecord();
  record.laws[0].locator = "lib/emsenn/services/561-group/this-file-does-not-exist-anywhere.md";
  const result = await verifyCitationTargetsExist(record, { repoRoot: REPO_ROOT });
  assert.equal(result.valid, false);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0].target, "lib/emsenn/services/561-group/this-file-does-not-exist-anywhere.md");
});

test("verifyCitationTargetsExist checks a repo-relative citation inside a clause's backedBy", async () => {
  const record = baseRecord();
  record.topics[0].clauses[0].backedBy = ["[org-layering.md](.claude/rules/org-layering.md)"];
  const result = await verifyCitationTargetsExist(record, { repoRoot: REPO_ROOT });
  assert.deepEqual(result, { valid: true, missing: [] });
});
