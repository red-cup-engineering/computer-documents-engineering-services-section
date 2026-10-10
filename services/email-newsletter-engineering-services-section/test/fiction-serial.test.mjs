import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fictionIssueFromEpisode, derivePreviously, validateSerialManifest } from "../src/fiction-serial.mjs";
import { renderFeedItem, renderMarkdown, renderPasteHtml, validateIssue } from "../src/newsletter-issue.mjs";

const fixture = fileURLToPath(new URL("./fixtures/fiction-serial", import.meta.url));
const json = (name) => JSON.parse(readFileSync(join(fixture, name), "utf8"));
const manifest = json("serial.json");
const bible = json("story-bible.json");

test("a serial manifest names its canon, cadence, free episodes, newsletter, language and script", () => {
  assert.equal(validateSerialManifest(manifest).valid, true);
  assert.equal(validateSerialManifest({ ...manifest, buttondownNewsletter: "secret key value" }).valid, false);
});

test("previously is derived from prior outline summaries and admits an editor override", () => {
  assert.equal(derivePreviously(bible, 1), "");
  assert.equal(derivePreviously(bible, 3), "Mei reaches the harbor and hears a bell beneath the water. 她在旧码头找到了那口钟，却发现钟声记得她。");
  assert.equal(derivePreviously(bible, 3, "Editor recap."), "Editor recap.");
});

test("three lint-shaped episodes project to validated issues with manifest-defined access", () => {
  const issues = [1, 2, 3].map((number) => fictionIssueFromEpisode({
    manifest,
    storyBible: bible,
    episodeText: readFileSync(join(fixture, `0${number}-${["arrival", "bell", "departure"][number - 1]}.md`), "utf8"),
  }));
  assert.deepEqual(issues.map((issue) => issue.access), ["free", "free", "paid"]);
  assert.ok(issues.every((issue) => validateIssue(issue).valid));
  assert.equal(issues[1].previously, "Mei reaches the harbor and hears a bell beneath the water.");
});

test("Simplified Chinese and full-width punctuation survive all three render targets", () => {
  const issue = fictionIssueFromEpisode({ manifest, storyBible: bible, episodeText: readFileSync(join(fixture, "02-bell.md"), "utf8") });
  const renderings = [
    renderMarkdown(issue),
    renderPasteHtml(issue),
    renderFeedItem(issue, { link: "https://example.test/glass-harbor/2", pubDate: "2026-01-02T00:00:00Z" }),
  ];
  for (const rendering of renderings) {
    assert.match(rendering, /“你听见了吗？”/u);
    assert.match(rendering, /退潮以后，谁会带走这段记忆？/u);
  }
});
