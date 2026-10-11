import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { depositNoteCarrier, catalogNodeNotes, NOTE_ROOT, NOTE_PROOF_PATH } from "../src/note-resources.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
import { siteNoteFrontmatterConformance } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { validateMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/validate-markdown-document";
import { parseDatedNotePath } from "@red-cup-engineering/computer-article-engineering-services-section/article-content-path-grammar";

const date = "2026-10-11";
const facets = { description: "The source-backed control records the exact carrier identity and validated path.", tags: ["engineering", "receiving"] };
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const inRoot = async (run) => { const root = await mkdtemp(join(tmpdir(), "note-generation-")); try { await run(root); } finally { await rm(root, { recursive: true, force: true }); } };
const input = (root, extra = {}) => ({ nodeRoot: root, date, title: "A bounded source repair", frontmatter: facets, carrier: { content: "The observed import failed. The source repair binds the real provider.\n" }, ...extra });
const read = async (root, receipt) => readMarkdownFrontmatter(await readFile(join(root, receipt.path), "utf8"));

test("canonical article note path and typed text restriction come from the current grammar", () => inRoot(async (root) => {
  assert.equal(NOTE_ROOT, "content/text/documents/articles/notes");
  assert.deepEqual(NOTE_PROOF_PATH, ["file", "data", "content", "text", "document", "article", "note"]);
  const receipt = await depositNoteCarrier(input(root));
  assert.equal(receipt.path, `${NOTE_ROOT}/2026/10/11/2026-10-11-note-on-a-bounded-source-repair.md`);
  assert.equal(parseDatedNotePath(receipt.path)?.date, date);
}));

test("authored dates, authorship, bibliography and nested fields survive genuine generation", () => inRoot(async (root) => {
  const authored = { title: "A bounded source repair", ...facets, "date-created": `${date}T07:12:33Z`, "date-modified": "2026-10-12", author: "Original engineer", authors: ["Original engineer", "Reviewer"], history: [{ date: "2026-10-10", action: "source observation" }], references: [{ id: "source", type: "software", URL: "https://github.com/red-cup-engineering/computer-data-engineering-services-section" }], status: "authored", "owning-enterprise": "lenticule-science", body: "An authored metadata key", __note_body: "Another authored key", empty: [], nested: { absent: null, enabled: false } };
  const raw = createMarkdownDocument(authored, { body: "Evidence precedes the conclusion. The test is bounded.\n", bodyKey: "__temporary_body" });
  const receipt = await depositNoteCarrier(input(root, { carrier: { content: raw, sha256: sha(raw) }, frontmatter: undefined }));
  const projected = await read(root, receipt);
  for (const [key, value] of Object.entries(authored)) assert.deepEqual(projected.frontmatter[key], value, key);
  assert.equal(receipt.sourceResource, sha(raw));
  assert.equal(siteNoteFrontmatterConformance(projected.frontmatter).conformant, true);
  assert.equal(projected.body, "Evidence precedes the conclusion.\nThe test is bounded.\n");
}));

test("source identity uses exact incoming whitespace and CRLF bytes", () => inRoot(async (root) => {
  const raw = "  Evidence before delivery.\r\nAnother sentence follows.\r\n\r\n";
  const receipt = await depositNoteCarrier(input(root, { carrier: { content: raw, sha256: sha(raw) } }));
  assert.equal(receipt.sourceResource, sha(raw));
}));

test("genuine generation preserves math, tables, fenced code and paragraph boundaries", () => inRoot(async (root) => {
  const body = String.raw`The engineering condition is \(m>0\). The result follows.

| Source | Result |
| --- | --- |
| pinned | passing |

\[
a+b=c
\]

` + '```js\nconst keep = "A. B.";\n```\n\nOriginal research attribution remains.\n';
  const receipt = await depositNoteCarrier(input(root, { carrier: { content: body } }));
  const generated = await readFile(join(root, receipt.path), "utf8");
  const parsed = readMarkdownFrontmatter(generated);
  assert.ok(parsed.body.includes(String.raw`\(m>0\)`));
  assert.ok(parsed.body.includes("| Source | Result |\n| --- | --- |\n| pinned | passing |"));
  assert.ok(parsed.body.includes('```js\nconst keep = "A. B.";\n```'));
  assert.ok(parsed.body.includes("\n\nOriginal research attribution remains."));
  assert.deepEqual(receipt.findings, []);
  assert.equal(validateMarkdownDocument(generated).conformant, true);
}));

test("normalization is idempotent under the actual create/read stack", () => inRoot(async (root) => {
  const first = await depositNoteCarrier(input(root));
  const bytes = await readFile(join(root, first.path), "utf8");
  const again = await depositNoteCarrier(input(root, { mode: "upsert", carrier: { content: bytes }, frontmatter: undefined }));
  assert.equal(again.disposition, "already-present");
  assert.equal(again.contentIdentity, first.contentIdentity);
  assert.equal(again.sourceResource, sha(bytes));
}));

for (const [name, supplied, pattern] of [
  ["missing description", { tags: ["engineering"] }, /has-description/],
  ["missing tags", { description: facets.description }, /has-tags/],
  ["generic description", { ...facets, description: "This is a research on repairs, written for users of a package." }, /description-not-generic/],
]) test(`existing note conformance refuses ${name} before writing`, () => inRoot(async (root) => {
  await assert.rejects(() => depositNoteCarrier(input(root, { frontmatter: supplied })), pattern);
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

for (const [name, authored, extra, pattern] of [
  ["title replacement", { title: "Historical title", ...facets, "date-created": date }, {}, /conflicts with supplied title/],
  ["creation-date replacement", { title: "A bounded source repair", ...facets, "date-created": "2026-10-10" }, {}, /conflicts with authored date-created/],
  ["authorship replacement", { title: "A bounded source repair", ...facets, author: "Original" }, { frontmatter: { ...facets, author: "Replacement" } }, /conflicts with supplied author/],
  ["source attribution replacement", { title: "A bounded source repair", ...facets, "source-provider": "Original" }, { source: { provider: "Replacement" } }, /conflicts with supplied source-provider/],
]) test(`conflicting ${name} is refused rather than rewriting history`, () => inRoot(async (root) => {
  const raw = createMarkdownDocument({ ...authored, body: "Original source evidence.\n" });
  await assert.rejects(() => depositNoteCarrier(input(root, { carrier: { content: raw }, ...extra })), pattern);
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("explicit preservation carries authored top-level null through replacement", () => inRoot(async (root) => {
  const before = await depositNoteCarrier(input(root));
  const raw = `---\ntitle: A bounded source repair\ndescription: ${facets.description}\ntags: [engineering]\noptional: null\n---\nOriginal text.\n`;
  const after = await depositNoteCarrier(input(root, { mode: "replace", frontmatter: undefined, carrier: { content: raw } }));
  assert.equal(after.disposition, "replaced");
  assert.equal(after.path, before.path);
  assert.equal(after.sourceResource, sha(raw));
  const projected = await read(root, after);
  assert.equal(Object.hasOwn(projected.frontmatter, "optional"), true);
  assert.equal(projected.frontmatter.optional, null);
  assert.equal(projected.body, "Original text.\n");
}));

test("the equality guard still refuses other codec loss before replacing an existing note", () => inRoot(async (root) => {
  const before = await depositNoteCarrier(input(root));
  const bytes = await readFile(join(root, before.path));
  await assert.rejects(() => depositNoteCarrier(input(root, { mode: "replace", frontmatter: { ...facets, emptyRecord: {} } })), /cannot preserve all authored frontmatter/);
  assert.deepEqual(await readFile(join(root, before.path)), bytes);
}));

test("malformed frontmatter is refused rather than stripped", () => inRoot(async (root) => {
  await assert.rejects(() => depositNoteCarrier(input(root, { carrier: { content: "---\ntitle: [unterminated\n---\nOriginal text.\n" } })));
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("non-destructive validation findings remain visible in the receipt", () => inRoot(async (root) => {
  const body = "# A bounded source repair\n\nOriginal text.\n";
  const receipt = await depositNoteCarrier(input(root, { carrier: { content: body } }));
  assert.equal(receipt.findings.find(({ rule }) => rule === "title-duplicates-h1")?.severity, "warning");
  assert.equal((await read(root, receipt)).body, body);
}));

test("catalog requires the actual date/name grammar and leaves legacy territory untouched", () => inRoot(async (root) => {
  await depositNoteCarrier(input(root));
  const files = [
    `${NOTE_ROOT}/2026/10/11/2026-10-12-note-on-wrong-date.md`,
    `${NOTE_ROOT}/2026/02/30/2026-02-30-note-on-impossible.md`,
    `${NOTE_ROOT}/2026/10/11/untyped.md`,
    `${NOTE_ROOT}/extra/2026/10/11/2026-10-11-note-on-extra.md`,
    "content/documents/articles/notes/2026/10/11/legacy.md",
  ];
  for (const path of files) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), "Legacy or unadmitted carrier.\n"); }
  const catalog = await catalogNodeNotes({ nodeRoot: root });
  assert.equal(catalog.resourceCount, 1);
  for (const path of files) assert.equal(await readFile(join(root, path), "utf8"), "Legacy or unadmitted carrier.\n");
}));

test("invalid calendar dates and empty path tokens refuse before writing", () => inRoot(async (root) => {
  await assert.rejects(() => depositNoteCarrier(input(root, { date: "2026-02-30" })), /real calendar date/);
  await assert.rejects(() => depositNoteCarrier(input(root, { slug: "../../../" })), /ASCII letter or digit/);
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("explicit authority cannot replace authored authority", () => inRoot(async (root) => {
  const raw = createMarkdownDocument({ title: "A bounded source repair", ...facets, authority: "original-source-scope", body: "A scoped source claim.\n" });
  await assert.rejects(() => depositNoteCarrier(input(root, { authority: "different-scope", carrier: { content: raw } })), /conflicts with supplied authority/);
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("existing deposit and catalog operation exports use the repaired provider", () => inRoot(async (root) => {
  const deposit = await import("../scripts/deposit-note-carrier.mjs");
  const catalog = await import("../scripts/catalog-node-notes.mjs");
  assert.equal(deposit.operation.name, "deposit-note-carrier");
  assert.equal(catalog.operation.name, "catalog-node-notes");
  const receipt = await deposit.operation.operation(input(root));
  assert.equal(parseDatedNotePath(receipt.path)?.date, date);
  const result = await catalog.operation.operation({ nodeRoot: root });
  assert.equal(result.resources[0].identity, receipt.resource);
}));

for (const [label, value] of [
  ["NaN", () => NaN], ["Infinity", () => Infinity], ["negative Infinity", () => -Infinity],
  ["Date", () => new Date("2026-10-11T00:00:00Z")], ["undefined", () => undefined],
  ["cycle", () => { const value = {}; value.self = value; return value; }],
]) test(`strict existing JSON admission refuses ${label} metadata before writing`, () => inRoot(async (root) => {
  await assert.rejects(() => depositNoteCarrier(input(root, { frontmatter: { ...facets, extra: value() } })), (error) => error instanceof TypeError && error.code === "invalid-json-value");
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("strict admission refuses a top-level Date metadata object", () => inRoot(async (root) => {
  const raw = createMarkdownDocument({ title: "A bounded source repair", ...facets, body: "An authored carrier.\n" });
  await assert.rejects(() => depositNoteCarrier(input(root, { carrier: { content: raw }, frontmatter: new Date("2026-10-11T00:00:00Z") })), (error) => error instanceof TypeError && error.code === "invalid-json-value");
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("own __proto__ metadata is retained without prototype pollution", () => inRoot(async (root) => {
  const supplied = JSON.parse('{"__proto__":{"notePollutionSentinel":"authored"}}');
  const before = Object.getPrototypeOf(supplied);
  const receipt = await depositNoteCarrier(input(root, { frontmatter: { ...facets, ...supplied } }));
  const projected = (await read(root, receipt)).frontmatter;
  assert.equal(Object.hasOwn(projected, "__proto__"), true);
  assert.deepEqual(projected.__proto__, supplied.__proto__);
  assert.equal(Object.getPrototypeOf(supplied), before);
  assert.equal(Object.getPrototypeOf(projected), Object.prototype);
  assert.equal(Object.prototype.notePollutionSentinel, undefined);
  assert.equal(Object.hasOwn(supplied, "__proto__"), true);
}));

test("strict JSON admission refuses accessor metadata without evaluating it", () => inRoot(async (root) => {
  let reads = 0;
  const supplied = { ...facets };
  Object.defineProperty(supplied, "extra", { enumerable: true, get() { reads++; return "do not evaluate"; } });
  await assert.rejects(() => depositNoteCarrier(input(root, { frontmatter: supplied })), (error) => error instanceof TypeError && error.code === "invalid-json-value");
  assert.equal(reads, 0);
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("the existing JSON resource envelope bounds supplied metadata depth", () => inRoot(async (root) => {
  let extra = {};
  for (let i = 0; i < 65; i++) extra = { child: extra };
  await assert.rejects(() => depositNoteCarrier(input(root, { frontmatter: { ...facets, extra } })), (error) => error instanceof TypeError && error.code === "depth-limit");
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

for (const [label, field] of [
  ["NaN", "extra: .nan"], ["Infinity", "extra: .inf"], ["negative Infinity", "extra: -.inf"],
  ["timestamp object", "extra: !!timestamp 2026-10-11T00:00:00Z"],
  ["cyclic aliases", "extra: &cycle {self: *cycle}"],
]) test(`the genuine YAML reader refuses non-JSON ${label} before writing`, () => inRoot(async (root) => {
  const raw = `---\ntitle: A bounded source repair\ndescription: ${facets.description}\ntags: [engineering]\n${field}\n---\nOriginal evidence.\n`;
  await assert.rejects(() => depositNoteCarrier(input(root, { frontmatter: undefined, carrier: { content: raw } })), (error) => error instanceof TypeError && !/call stack/u.test(error.message));
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));

test("nested own __proto__ data survives the genuine JSON and YAML providers", () => inRoot(async (root) => {
  const nested = JSON.parse('{"__proto__":{"retained":"authored"},"ordinary":true}');
  const receipt = await depositNoteCarrier(input(root, { frontmatter: { ...facets, nested } }));
  const projected = (await read(root, receipt)).frontmatter.nested;
  assert.equal(Object.hasOwn(projected, "__proto__"), true);
  assert.deepEqual(projected, nested);
  assert.equal(Object.getPrototypeOf(projected), Object.prototype);
}));

for (const [label, value] of [
  ["undefined", () => undefined], ["Date", () => new Date("2026-10-11T00:00:00Z")],
  ["cycle", () => { const value = {}; value.self = value; return value; }],
]) test(`source attribution metadata also refuses ${label} before writing`, () => inRoot(async (root) => {
  await assert.rejects(() => depositNoteCarrier(input(root, { source: { provider: value() } })), (error) => error instanceof TypeError && error.code === "invalid-json-value");
  assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 0);
}));
