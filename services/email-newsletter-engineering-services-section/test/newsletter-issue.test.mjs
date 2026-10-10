import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateIssue,
  renderMarkdown,
  renderPasteHtml,
  renderFeedItem,
  formatCitation,
  citationUrl,
} from "../src/newsletter-issue.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const SAMPLE_ISSUE = JSON.parse(readFileSync(join(FIXTURES, "sample-issue.json"), "utf8"));

function clone(issue) {
  return JSON.parse(JSON.stringify(issue));
}

test("validateIssue accepts the sample issue with no error findings", () => {
  const report = validateIssue(SAMPLE_ISSUE);
  assert.equal(report.valid, true);
  assert.deepEqual(report.findings.filter((f) => f.severity === "error"), []);
});

test("validateIssue rejects a non-object", () => {
  assert.throws(() => validateIssue(null), TypeError);
  assert.throws(() => validateIssue("issue"), TypeError);
});

test("validateIssue requires a non-empty title", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.title = "";
  const report = validateIssue(issue);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some((f) => f.rule === "title-required"));
});

test("validateIssue requires an empty sections array to fail", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.sections = [];
  const report = validateIssue(issue);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some((f) => f.rule === "sections-required"));
});

test("validateIssue flags a source citekey absent from references", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.sections[0].sources = ["nope2099"];
  const report = validateIssue(issue);
  assert.equal(report.valid, false);
  const found = report.findings.find((f) => f.rule === "unresolved-source");
  assert.equal(found.citekey, "nope2099");
});

test("validateIssue flags a reference whose id does not match its own key", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.references.smith2023.id = "someone-else";
  const report = validateIssue(issue);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some((f) => f.rule === "reference-id-mismatch"));
});

test("validateIssue flags a reference with a non-CSL type", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.references.smith2023.type = "blog-post";
  const report = validateIssue(issue);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some((f) => f.rule === "reference-type-invalid"));
});

test("validateIssue warns, but stays valid, on a reference no section cites", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.references.unused2020 = {
    id: "unused2020", type: "webpage", title: "Never cited",
  };
  const report = validateIssue(issue);
  assert.equal(report.valid, true);
  const found = report.findings.find((f) => f.rule === "unused-reference");
  assert.equal(found.severity, "warning");
  assert.equal(found.citekey, "unused2020");
});

test("citationUrl prefers URL over DOI, then falls back, then undefined", () => {
  assert.equal(citationUrl({ URL: "https://a.example", DOI: "10.1/x" }), "https://a.example");
  assert.equal(citationUrl({ DOI: "10.1/x" }), "https://doi.org/10.1/x");
  assert.equal(citationUrl({}), undefined);
});

test("formatCitation composes authors, year, title, container, and URL", () => {
  const text = formatCitation(SAMPLE_ISSUE.references.smith2023);
  assert.equal(
    text,
    "Ada Smith (2023). A study of things. Journal of Things, 12(3), 45-67. https://example.com/smith2023",
  );
});

test("formatCitation omits parts a sparse item lacks", () => {
  const text = formatCitation({ id: "x", type: "webpage", title: "Bare Item" });
  assert.equal(text, "Bare Item.");
});

test("renderMarkdown rejects an invalid issue before rendering", () => {
  assert.throws(() => renderMarkdown({ title: "" }), TypeError);
});

test("renderMarkdown produces a title H1, dek, section H2s, and a References list", () => {
  const markdown = renderMarkdown(SAMPLE_ISSUE);
  assert.match(markdown, /^# Issue Title\n/u);
  assert.match(markdown, /_A short deck line\._/u);
  assert.match(markdown, /## First Section/u);
  assert.match(markdown, /## Second Section/u);
  assert.match(markdown, /\*\*Sources:\*\* \[smith2023]\(https:\/\/example\.com\/smith2023\)/);
  assert.match(markdown, /## References/u);
  assert.match(markdown, /- Ada Smith \(2023\)\. A study of things\./u);
});

test("renderPasteHtml emits only the allowed h2\\/h3\\/p\\/blockquote\\/a\\/strong\\/em tags", () => {
  const html = renderPasteHtml(SAMPLE_ISSUE);
  const tagsUsed = new Set([...html.matchAll(/<\/?([a-z0-9]+)[ >]/gu)].map((m) => m[1]));
  const allowed = new Set(["h2", "h3", "p", "blockquote", "a", "strong", "em"]);
  for (const tag of tagsUsed) assert.ok(allowed.has(tag), `unexpected tag <${tag}> in paste HTML`);
});

test("renderPasteHtml never emits an h1, even for a title-shaped body line", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.sections[0]["body-markdown"] = "# Not a real heading\n\nA paragraph.";
  const html = renderPasteHtml(issue);
  assert.doesNotMatch(html, /<h1/u);
  assert.match(html, /<p># Not a real heading<\/p>/u);
});

test("renderPasteHtml renders bold, italic, links, and blockquotes from the sample issue", () => {
  const html = renderPasteHtml(SAMPLE_ISSUE);
  assert.match(html, /<strong>bold<\/strong>/u);
  assert.match(html, /<em>em<\/em>/u);
  assert.match(html, /<a href="https:\/\/example\.com\/a">link<\/a>/u);
  assert.match(html, /<blockquote><p>A blockquote line\.<\/p><\/blockquote>/u);
  assert.match(html, /<h3>A subheading<\/h3>/u);
});

test("renderPasteHtml omits the title (no h1) and opens with the dek", () => {
  const html = renderPasteHtml(SAMPLE_ISSUE);
  assert.doesNotMatch(html, /Issue Title/u);
  assert.match(html, /^<p><em>A short deck line\.<\/em><\/p>/u);
});

test("renderPasteHtml escapes HTML-significant characters in headings and body text", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.sections[0].heading = "A & B <tag>";
  issue.sections[0]["body-markdown"] = 'Quote: "x" & <y>';
  const html = renderPasteHtml(issue);
  assert.match(html, /<h2>A &amp; B &lt;tag&gt;<\/h2>/u);
  assert.match(html, /Quote: &quot;x&quot; &amp; &lt;y&gt;/u);
});

test("renderFeedItem defaults to an RSS item fragment with title, link, guid, pubDate, and CDATA description", () => {
  const fragment = renderFeedItem(SAMPLE_ISSUE, { link: "https://example.com/issues/1", pubDate: "2026-09-01T00:00:00.000Z" });
  assert.match(fragment, /^<item>/u);
  assert.match(fragment, /<title>Issue Title<\/title>/u);
  assert.match(fragment, /<link>https:\/\/example\.com\/issues\/1<\/link>/u);
  assert.match(fragment, /<guid isPermaLink="false">https:\/\/example\.com\/issues\/1<\/guid>/u);
  assert.match(fragment, /<pubDate>Tue, 01 Sep 2026 00:00:00 GMT<\/pubDate>/u);
  assert.match(fragment, /<description><!\[CDATA\[<p><em>A short deck line\./u);
  assert.match(fragment, /<\/item>$/u);
});

test("renderFeedItem accepts an explicit guid distinct from link", () => {
  const fragment = renderFeedItem(SAMPLE_ISSUE, { link: "https://example.com/issues/1", guid: "urn:issue:1", pubDate: "2026-09-01" });
  assert.match(fragment, /<guid isPermaLink="false">urn:issue:1<\/guid>/u);
});

test("renderFeedItem renders an Atom entry fragment on format: atom", () => {
  const fragment = renderFeedItem(SAMPLE_ISSUE, { link: "https://example.com/issues/1", pubDate: "2026-09-01T00:00:00.000Z", format: "atom" });
  assert.match(fragment, /^<entry>/u);
  assert.match(fragment, /<link href="https:\/\/example\.com\/issues\/1" \/>/u);
  assert.match(fragment, /<id>https:\/\/example\.com\/issues\/1<\/id>/u);
  assert.match(fragment, /<updated>2026-09-01T00:00:00\.000Z<\/updated>/u);
  assert.match(fragment, /<summary type="html"><!\[CDATA\[/u);
  assert.match(fragment, /<\/entry>$/u);
});

test("renderFeedItem requires a link, a valid pubDate, and a valid format", () => {
  assert.throws(() => renderFeedItem(SAMPLE_ISSUE, {}), TypeError);
  assert.throws(() => renderFeedItem(SAMPLE_ISSUE, { link: "https://example.com/1", pubDate: "not-a-date" }), TypeError);
  assert.throws(() => renderFeedItem(SAMPLE_ISSUE, { link: "https://example.com/1", format: "json" }), TypeError);
});

test("renderFeedItem escapes an ampersand in the title", () => {
  const issue = clone(SAMPLE_ISSUE);
  issue.title = "Fish & Chips";
  const fragment = renderFeedItem(issue, { link: "https://example.com/1" });
  assert.match(fragment, /<title>Fish &amp; Chips<\/title>/u);
});
