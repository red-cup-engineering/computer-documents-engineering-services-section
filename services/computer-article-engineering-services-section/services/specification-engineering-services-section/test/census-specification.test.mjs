import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { censusSpecifications } from "../scripts/census-specification.mjs";

test("censusSpecifications finds a handwritten carrier with no companion record", async () => {
  const root = mkdtempSync(join(tmpdir(), "census-specification-"));
  try {
    const specifications = join(root, "section", "specifications");
    mkdirSync(specifications, { recursive: true });
    await writeFileText(join(specifications, "handwritten.md"), "Software MUST do a thing.");
    const census = await censusSpecifications(root);
    assert.equal(census.filesCensused, 1);
    assert.equal(census.handwritten, 1);
    assert.equal(census.fabricated, 0);
    assert.equal(census.files[0].keywordCounts.MUST, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("censusSpecifications counts a carrier with a companion .specification.json as fabricated", async () => {
  const root = mkdtempSync(join(tmpdir(), "census-specification-"));
  try {
    const specifications = join(root, "section", "specifications");
    mkdirSync(specifications, { recursive: true });
    await writeFileText(join(specifications, "fabricated.md"), "Software MUST do a thing.");
    await writeFileText(join(specifications, "fabricated.specification.json"), "{}");
    const census = await censusSpecifications(root);
    assert.equal(census.fabricated, 1);
    assert.equal(census.handwritten, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
