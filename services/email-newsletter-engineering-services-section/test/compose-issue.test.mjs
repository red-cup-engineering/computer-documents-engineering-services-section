import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { composeIssue, runComposeIssue } from "../scripts/compose-issue.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const SAMPLE_ISSUE_PATH = join(FIXTURES, "sample-issue.json");
const SAMPLE_ISSUE = JSON.parse(readFileSync(SAMPLE_ISSUE_PATH, "utf8"));

function makeOutDir() {
  const dir = mkdtempSync(join(tmpdir(), "newsletter-issue-compose-"));
  return dir;
}

test("composeIssue writes markdown, paste HTML, and an RSS feed-item file", () => {
  const outDir = makeOutDir();
  try {
    const result = composeIssue(SAMPLE_ISSUE, outDir, { link: "https://example.com/issues/1", pubDate: "2026-09-01" });
    assert.equal(result.report.valid, true);
    assert.ok(existsSync(result.files.markdown));
    assert.ok(existsSync(result.files.pasteHtml));
    assert.ok(existsSync(result.files.feedItem));
    assert.match(result.files.feedItem, /issue\.feed-item\.rss\.xml$/u);
    assert.match(readFileSync(result.files.markdown, "utf8"), /^# Issue Title/u);
    assert.match(readFileSync(result.files.pasteHtml, "utf8"), /<h2>First Section<\/h2>/u);
    assert.match(readFileSync(result.files.feedItem, "utf8"), /^<item>/u);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("composeIssue names the atom feed-item file distinctly", () => {
  const outDir = makeOutDir();
  try {
    const result = composeIssue(SAMPLE_ISSUE, outDir, { link: "https://example.com/issues/1", format: "atom" });
    assert.match(result.files.feedItem, /issue\.feed-item\.atom\.xml$/u);
    assert.match(readFileSync(result.files.feedItem, "utf8"), /^<entry>/u);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("composeIssue refuses an invalid issue and writes nothing", () => {
  const outDir = join(mkdtempSync(join(tmpdir(), "newsletter-issue-compose-")), "nested", "out");
  try {
    assert.throws(() => composeIssue({ title: "" }, outDir, { link: "https://example.com/1" }), TypeError);
    assert.equal(existsSync(outDir), false);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("runComposeIssue reads issue JSON from disk via the CLI entry", () => {
  const outDir = makeOutDir();
  try {
    const result = runComposeIssue([SAMPLE_ISSUE_PATH, outDir, "https://example.com/issues/1"]);
    assert.equal(result.report.valid, true);
    assert.ok(existsSync(result.files.markdown));
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("runComposeIssue requires an issue path, out dir, and feed link", () => {
  assert.throws(() => runComposeIssue([]), /usage: compose-issue\.mjs/u);
  assert.throws(() => runComposeIssue([SAMPLE_ISSUE_PATH]), /usage: compose-issue\.mjs/u);
});
