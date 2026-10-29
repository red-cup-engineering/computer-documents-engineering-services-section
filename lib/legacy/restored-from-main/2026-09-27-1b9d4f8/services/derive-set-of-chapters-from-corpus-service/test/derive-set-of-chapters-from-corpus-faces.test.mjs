import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveSetOfChaptersFromCorpus } from "../scripts/derive-set-of-chapters-from-corpus.mjs";

test("derives a two-part-title-and-section book from one fixture section", async () => {
  const root = mkdtempSync(join(tmpdir(), "derive-chapters-face-"));
  const fixture = join(root, "example-fixture-section-services-section");
  const chaptersDir = join(root, "example-chapters");
  mkdirSync(fixture);
  writeFileSync(join(fixture, "README.md"), "# Example fixture\n", "utf8");
  const input = { parts: [{ title: "Example Part", roots: [fixture] }], title: "Example Book", author: "Example Author", chaptersDir };
  const output = { type: "DerivedChapterSet", version: 1, chaptersDir, chapterFiles: ["000-example-part-part-title.md", "001-example-fixture-section.md"], manifest: { slug: "example-book", title: "Example Book", author: "Example Author", bookDir: chaptersDir } };
  try {
    const importedOutput = await deriveSetOfChaptersFromCorpus(input);
    assert.deepEqual(importedOutput, output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-set-of-chapters-from-corpus.mjs", import.meta.url))], {
      input: JSON.stringify(input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.error, undefined, command.error?.message);
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, output);
    assert.deepEqual(commandOutput, importedOutput);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
