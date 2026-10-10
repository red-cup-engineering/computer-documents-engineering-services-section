import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { extractReferencesFromCarrier, extractIssueSources } from "../scripts/extract-issue-sources.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const CARRIER_ONE = join(FIXTURES, "carrier-one.md");
const CARRIER_TWO = join(FIXTURES, "carrier-two.md");
const CARRIER_CONFLICT = join(FIXTURES, "carrier-conflict.md");
const CARRIER_NO_REFERENCES = join(FIXTURES, "carrier-no-references.md");

test("extractReferencesFromCarrier reads one carrier's references frontmatter", () => {
  const text = readFileSync(CARRIER_ONE, "utf8");
  const references = extractReferencesFromCarrier(text);
  assert.deepEqual(Object.keys(references), ["smith2023"]);
  assert.equal(references.smith2023.title, "A study of things");
  assert.equal(references.smith2023.DOI, "10.1234/abcd.5678");
});

test("extractReferencesFromCarrier returns {} for a carrier with no references block", () => {
  const text = readFileSync(CARRIER_NO_REFERENCES, "utf8");
  assert.deepEqual(extractReferencesFromCarrier(text), {});
});

test("extractReferencesFromCarrier returns {} for a carrier with no frontmatter at all", () => {
  assert.deepEqual(extractReferencesFromCarrier("Just a body, no frontmatter.\n"), {});
});

test("extractIssueSources merges disjoint carriers into one pool, via injected file reads", () => {
  const reads = { [CARRIER_ONE]: readFileSync(CARRIER_ONE, "utf8"), [CARRIER_TWO]: readFileSync(CARRIER_TWO, "utf8") };
  const pool = extractIssueSources([CARRIER_ONE, CARRIER_TWO], { readFileImpl: (path) => reads[path] });
  assert.deepEqual(Object.keys(pool).sort(), ["jones2024", "smith2023"]);
});

test("extractIssueSources reads real files from disk by default", () => {
  const pool = extractIssueSources([CARRIER_ONE, CARRIER_TWO]);
  assert.deepEqual(Object.keys(pool).sort(), ["jones2024", "smith2023"]);
});

test("extractIssueSources refuses two carriers that disagree on the same citekey", () => {
  assert.throws(() => extractIssueSources([CARRIER_ONE, CARRIER_CONFLICT]), TypeError);
});

test("extractIssueSources tolerates the identical item repeated across carriers", () => {
  const pool = extractIssueSources([CARRIER_ONE, CARRIER_ONE]);
  assert.deepEqual(Object.keys(pool), ["smith2023"]);
});
