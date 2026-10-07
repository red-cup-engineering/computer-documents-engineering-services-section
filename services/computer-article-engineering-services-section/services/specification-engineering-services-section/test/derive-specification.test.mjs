import assert from "node:assert/strict";
import test from "node:test";
import { deriveSpecificationRecord, validateSpecificationRecord } from "../src/specification.mjs";

function draft(overrides = {}) {
  return {
    identity: { id: "example", title: "Example", seat: "example-seat", carrier: "example.md", authors: ["emsenn"] },
    whatThisIs: "An example.",
    topics: [
      { heading: "Constraints", body: "{{clause:c1}} {{law:l1}}", clauses: [{ id: "c1", keyword: "MUST", statement: "do X", actor: "Software", backedBy: ["a citation"] }], laws: [{ id: "l1", authority: "owner", revision: "v1", locator: "x.md", applicability: "always", statement: "law text" }] },
    ],
    provenance: { derivedFrom: ["a ruling"] },
    ...overrides,
  };
}

test("deriveSpecificationRecord fills identity and provenance defaults", () => {
  const record = deriveSpecificationRecord(draft(), { now: "2026-09-06T12:00:00.000Z" });
  assert.equal(record.identity.version, "0.1.0");
  assert.equal(record.identity.stability, "draft");
  assert.equal(record.identity["date-created"], "2026-09-06");
  assert.equal(record.provenance.derivedAt, "2026-09-06T12:00:00.000Z");
  assert.equal(record.provenance.derivedBy, "derive-specification.mjs");
});

test("deriveSpecificationRecord lifts a topic's local laws into the top-level laws array and strips the local copy", () => {
  const record = deriveSpecificationRecord(draft(), { now: "2026-09-06T00:00:00Z" });
  assert.deepEqual(record.laws.map((law) => law.id), ["l1"]);
  assert.equal(record.topics[0].laws, undefined);
});

test("deriveSpecificationRecord produces a record that validates against the house schema", () => {
  const record = deriveSpecificationRecord(draft(), { now: "2026-09-06T00:00:00Z" });
  const { valid, issues } = validateSpecificationRecord(record);
  assert.equal(valid, true, JSON.stringify(issues));
});

test("deriveSpecificationRecord refuses when two topics define the same law id differently", () => {
  const conflicting = draft({
    topics: [
      { heading: "A", body: "{{law:l1}}", clauses: [], laws: [{ id: "l1", authority: "owner", revision: "v1", locator: "x.md", applicability: "always", statement: "one version" }] },
      { heading: "B", body: "{{law:l1}}", clauses: [], laws: [{ id: "l1", authority: "owner", revision: "v2", locator: "x.md", applicability: "always", statement: "a different version" }] },
    ],
  });
  assert.throws(() => deriveSpecificationRecord(conflicting), /define laws "l1" with different content/u);
});

test("deriveSpecificationRecord accepts an explicit identity field, overriding the default", () => {
  const record = deriveSpecificationRecord(draft({ identity: { ...draft().identity, version: "2.0.0" } }), { now: "2026-09-06T00:00:00Z" });
  assert.equal(record.identity.version, "2.0.0");
});
