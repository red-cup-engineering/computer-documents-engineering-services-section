import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { makeSpecification } from "../scripts/make-specification.mjs";
import { updateSpecification } from "../scripts/update-specification.mjs";

function minimalRecord(title) {
  return {
    identity: { id: "example-specification", title, seat: "specification-engineering-services-section", carrier: "carrier.md", "date-created": "2026-09-06", authors: ["emsenn"], version: "0.1.0", stability: "draft", status: "draft" },
    whatThisIs: "An example.",
    topics: [],
    implementations: [],
    openQuestions: [],
    laws: [],
    standards: [],
    provenance: { derivedFrom: ["test"], derivedAt: "2026-09-06T00:00:00Z", derivedBy: "test" },
  };
}

test("makeSpecification writes a rendered carrier that does not yet exist", async () => {
  const directory = mkdtempSync(join(tmpdir(), "make-specification-"));
  try {
    const recordPath = join(directory, "record.json");
    const destinationPath = join(directory, "carrier.md");
    await writeFileText(recordPath, JSON.stringify(minimalRecord("First title")));
    const result = await makeSpecification(recordPath, destinationPath);
    assert.equal(result.destinationPath, destinationPath);
    assert.match(await readFileText(destinationPath), /# First title/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("makeSpecification refuses when the destination already exists", async () => {
  const directory = mkdtempSync(join(tmpdir(), "make-specification-"));
  try {
    const recordPath = join(directory, "record.json");
    const destinationPath = join(directory, "carrier.md");
    await writeFileText(recordPath, JSON.stringify(minimalRecord("First title")));
    await writeFileText(destinationPath, "already here");
    await assert.rejects(() => makeSpecification(recordPath, destinationPath), /already exists/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("makeSpecification refuses when destinationPath does not match identity.carrier", async () => {
  const directory = mkdtempSync(join(tmpdir(), "make-specification-"));
  try {
    const recordPath = join(directory, "record.json");
    const destinationPath = join(directory, "wrong-name.md");
    await writeFileText(recordPath, JSON.stringify(minimalRecord("First title")));
    await assert.rejects(() => makeSpecification(recordPath, destinationPath), /does not end with identity\.carrier/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("updateSpecification refuses when no carrier exists yet", async () => {
  const directory = mkdtempSync(join(tmpdir(), "update-specification-"));
  try {
    const recordPath = join(directory, "record.json");
    const destinationPath = join(directory, "carrier.md");
    await writeFileText(recordPath, JSON.stringify(minimalRecord("First title")));
    await assert.rejects(() => updateSpecification(recordPath, destinationPath), /no carrier exists yet/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("updateSpecification re-renders an existing carrier and reports whether it changed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "update-specification-"));
  try {
    const recordPath = join(directory, "record.json");
    const destinationPath = join(directory, "carrier.md");
    await writeFileText(recordPath, JSON.stringify(minimalRecord("First title")));
    await makeSpecification(recordPath, destinationPath);
    await writeFileText(recordPath, JSON.stringify(minimalRecord("Second title")));
    const result = await updateSpecification(recordPath, destinationPath);
    assert.equal(result.changed, true);
    assert.match(await readFileText(destinationPath), /# Second title/u);
    const repeated = await updateSpecification(recordPath, destinationPath);
    assert.equal(repeated.changed, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
