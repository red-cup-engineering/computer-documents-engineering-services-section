import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ARTICLE_CONTENT_GRAMMAR, parseDatedNoteName, parseDatedNotePath, projectArticleRegion, projectNotePath } from "../scripts/article-content-path-grammar.mjs";

test("projects the default article and note territories without filesystem effects", () => {
  assert.equal(projectArticleRegion(), "content/text/documents/articles");
  assert.equal(projectArticleRegion("notes/2026"), "content/text/documents/articles/notes/2026");
  assert.equal(projectNotePath("2026/07/29/note.md"), "content/text/documents/articles/notes/2026/07/29/note.md");
  assert.throws(() => projectArticleRegion("../../escape"), /relative/u);
});

test("parses dated note carrier names and requires directory agreement", () => {
  assert.deepEqual(parseDatedNoteName("2026-07-29-note-on-content-tree.md"), {
    date: "2026-07-29", year: "2026", month: "07", day: "29", token: "content-tree",
  });
  assert.equal(parseDatedNoteName("other.md"), null);
  assert.equal(parseDatedNotePath("2026/07/30/2026-07-29-note-on-content-tree.md"), null);
  assert.equal(parseDatedNotePath("2026/07/29/2026-07-29-note-on-content-tree.md")?.token, "content-tree");
});

test("a grammar override is wholesale", () => {
  const grammar = { articleRoot: "vault/posts", noteRoot: "vault/scraps", noteName: { pattern: /^(\d{4})-(\d{2})-(\d{2})_([a-z-]+)\.md$/u } };
  assert.equal(projectArticleRegion("new", grammar), "vault/posts/new");
  assert.equal(parseDatedNoteName("2026-07-29_content-tree.md", grammar)?.token, "content-tree");
  assert.throws(() => projectArticleRegion("", { ...DEFAULT_ARTICLE_CONTENT_GRAMMAR, noteName: undefined }), /wholly define/u);
});
