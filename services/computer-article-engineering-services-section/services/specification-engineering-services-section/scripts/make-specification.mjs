#!/usr/bin/env node
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { statPath } from "@red-cup-engineering/computer-file-engineering-services-section/stat-path";
import { renderSpecificationMarkdown, repoRootFromDestination, validateSpecificationRecord, verifyCitationTargetsExist } from "../src/specification.mjs";

/**
 * Makes one new Specification carrier at `destinationPath` from the Specification record at
 * `recordPath`, refusing when a carrier already exists there (a specification is made once and
 * thereafter updated, never silently overwritten by "make" — see update-specification.mjs), when
 * the record fails schema validation, when `destinationPath` does not end with the record's own
 * `identity.carrier`, or when any citation the record names does not resolve on disk.
 * @param {string} recordPath Path to a JSON file holding one Specification record.
 * @param {string} destinationPath Path the rendered Markdown carrier is written to.
 * @returns {Promise<{destinationPath: string, bytesWritten: number}>}
 * @throws {TypeError} When the record fails schema validation or destinationPath mismatches identity.carrier.
 * @throws {Error} When a carrier already exists at destinationPath, or a cited target is missing.
 */
export async function makeSpecification(recordPath, destinationPath) {
  if ((await statPath({ path: destinationPath })).exists) throw new Error(`make-specification: a carrier already exists at ${destinationPath}; use update-specification instead`);
  const record = JSON.parse(await readFileText(recordPath));
  const { valid, issues } = validateSpecificationRecord(record);
  if (!valid) throw new TypeError(`make-specification: record at ${recordPath} failed schema validation: ${JSON.stringify(issues)}`);
  const repoRoot = repoRootFromDestination(destinationPath, record.identity.carrier);
  const citations = await verifyCitationTargetsExist(record, { repoRoot });
  if (!citations.valid) throw new Error(`make-specification: record at ${recordPath} cites targets that do not exist: ${JSON.stringify(citations.missing)}`);
  const markdown = renderSpecificationMarkdown(record);
  const receipt = await writeFileText(destinationPath, markdown);
  return { destinationPath: receipt.path, bytesWritten: receipt.bytes };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("make-specification <record.json> <destination.md> — Renders a new Specification carrier from a JSON record. Refuses if the destination already exists, identity.carrier does not match it, or a cited target is missing.\n");
  } else {
    const [, , recordPath, destinationPath] = process.argv;
    if (!recordPath || !destinationPath) {
      process.stderr.write("make-specification: usage: make-specification <record.json> <destination.md>\n");
      process.exitCode = 1;
    } else {
      const result = await makeSpecification(recordPath, destinationPath);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  }
}
