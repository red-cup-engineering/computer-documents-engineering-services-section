import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

import {
  CONVERSION_CONTRACT,
  CONVERSION_FILTERS,
  convertOrgToMarkdown,
  pandocOrgToMarkdownArguments,
} from "../src/convert-org-to-markdown.mjs";

const hasPandoc = (() => {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("pandocOrgToMarkdownArguments", () => {
  it("writes a format that can carry heading attributes", () => {
    // Plain gfm discards them, which would silently drop heading identity.
    assert.match(CONVERSION_CONTRACT.to, /\+attributes\b/u);
    assert.ok(pandocOrgToMarkdownArguments().includes(CONVERSION_CONTRACT.to));
  });

  it("applies every conversion filter, in contract order", () => {
    const args = pandocOrgToMarkdownArguments({ filtersDirectory: "/filters/" });
    const applied = args
      .filter((_, index) => args[index - 1] === "--lua-filter")
      .map((path) => path.replace("/filters/", ""));
    assert.deepEqual(applied, [...CONVERSION_FILTERS]);
  });

  it("removes drill state before promoting identity", () => {
    // Otherwise a discarded card's UUID would be promoted to an anchor first.
    assert.ok(
      CONVERSION_FILTERS.indexOf("drop-org-drill-state.lua") <
        CONVERSION_FILTERS.indexOf("preserve-org-roam-identity.lua"),
    );
  });
});

describe("convertOrgToMarkdown", { skip: hasPandoc ? false : "pandoc is not installed" }, () => {
  it("carries a file's ID and aliases into frontmatter", async () => {
    const markdown = await convertOrgToMarkdown(
      [
        ":PROPERTIES:",
        ":ID:       7d06c52a-b84a-4ff5-9d86-4210911707c3",
        ':ROAM_ALIASES: "Alan Lea" "A. Lea"',
        ":END:",
        "#+title: Peter Gelderloos",
        "",
      ].join("\n"),
    );
    assert.match(markdown, /^id: 7d06c52a-b84a-4ff5-9d86-4210911707c3$/mu);
    assert.match(markdown, /^- Alan Lea$/mu);
    assert.match(markdown, /^- A\. Lea$/mu);
    assert.doesNotMatch(markdown, /roam_aliases/u);
  });

  it("makes a heading's ID its anchor and keeps its refs", async () => {
    const markdown = await convertOrgToMarkdown(
      [
        "* To Bomb a Hospital",
        ":PROPERTIES:",
        ":ID:       8befd20f-6b53-4562-aa29-22a2a67a7e18",
        ":ROAM_REFS: https://example.invalid/post",
        ":END:",
        "",
        "Body.",
        "",
      ].join("\n"),
    );
    assert.match(markdown, /\{#8befd20f-6b53-4562-aa29-22a2a67a7e18[^}]*\}/u);
    assert.match(markdown, /roam-refs="https:\/\/example\.invalid\/post"/u);
  });

  it("preserves an org-roam link as a resolvable id URI", async () => {
    const markdown = await convertOrgToMarkdown(
      "See [[id:b9738189-b5f6-4d28-b366-71b8dd59c94c][cat]].\n",
    );
    assert.match(markdown, /\[cat\]\(id:b9738189-b5f6-4d28-b366-71b8dd59c94c\)/u);
  });

  it("drops a drill card together with the heading it empties", async () => {
    const markdown = await convertOrgToMarkdown(
      [
        "* Biography",
        "",
        "Real prose.",
        "",
        "* Drill: Bobby",
        "** Drill: Bobby's Biography                                           :drill:",
        ":PROPERTIES:",
        ":DRILL_CARD_TYPE: hide1cloze",
        ":DRILL_EASE: 2.6",
        ":END:",
        "[Bobby] is a [cat].",
        "",
      ].join("\n"),
    );
    assert.match(markdown, /Real prose\./u);
    assert.doesNotMatch(markdown, /Drill/iu);
    assert.doesNotMatch(markdown, /drill_ease|hide1cloze/iu);
  });

  it("keeps a heading that was already empty in the source", async () => {
    // Emptiness the author wrote is not emptiness this service caused.
    const markdown = await convertOrgToMarkdown("* Bibliography\n** Substack\n");
    assert.match(markdown, /# Bibliography/u);
    assert.match(markdown, /## Substack/u);
  });

  it("drops uninterpreted org residue", async () => {
    const markdown = await convertOrgToMarkdown("#+name: definition\n- Term :: meaning\n");
    assert.doesNotMatch(markdown, /\{=org\}|#\+name/u);
    assert.match(markdown, /meaning/u);
  });

  it("reports a missing pandoc rather than returning empty output", async () => {
    await assert.rejects(
      convertOrgToMarkdown("text", { pandocPath: "pandoc-that-is-not-installed" }),
      /could not run pandoc-that-is-not-installed/u,
    );
  });
});
