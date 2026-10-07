#!/usr/bin/env node
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { statPath } from "@red-cup-engineering/file-services/stat-path";
import { renderSpecificationMarkdown, repoRootFromDestination, validateSpecificationRecord, verifyCitationTargetsExist } from "../src/specification.mjs";

/**
 * Re-renders an existing Specification carrier at `destinationPath` from the Specification
 * record at `recordPath`, refusing when no carrier exists there yet (a specification is made
 * once — see make-specification.mjs — and thereafter updated, never created by "update"), when
 * the record fails schema validation, when `destinationPath` does not end with the record's own
 * `identity.carrier`, or when any citation the record names does not resolve on disk.
 * @param {string} recordPath Path to a JSON file holding one Specification record.
 * @param {string} destinationPath Path to the existing Markdown carrier to overwrite.
 * @returns {Promise<{destinationPath: string, bytesWritten: number, changed: boolean}>}
 * @throws {TypeError} When the record fails schema validation or destinationPath mismatches identity.carrier.
 * @throws {Error} When no carrier exists yet at destinationPath, or a cited target is missing.
 */
export async function updateSpecification(recordPath, destinationPath) {
  if (!(await statPath({ path: destinationPath })).exists) throw new Error(`update-specification: no carrier exists yet at ${destinationPath}; use make-specification instead`);
  const record = JSON.parse(await readFileText(recordPath));
  const { valid, issues } = validateSpecificationRecord(record);
  if (!valid) throw new TypeError(`update-specification: record at ${recordPath} failed schema validation: ${JSON.stringify(issues)}`);
  const repoRoot = repoRootFromDestination(destinationPath, record.identity.carrier);
  const citations = await verifyCitationTargetsExist(record, { repoRoot });
  if (!citations.valid) throw new Error(`update-specification: record at ${recordPath} cites targets that do not exist: ${JSON.stringify(citations.missing)}`);
  const markdown = renderSpecificationMarkdown(record);
  const previous = await readFileText(destinationPath);
  const receipt = await writeFileText(destinationPath, markdown);
  return { destinationPath: receipt.path, bytesWritten: receipt.bytes, changed: markdown !== previous };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("update-specification <record.json> <destination.md> — Re-renders an existing Specification carrier from a JSON record. Refuses if the destination does not yet exist, identity.carrier does not match it, or a cited target is missing.\n");
  } else {
    const [, , recordPath, destinationPath] = process.argv;
    if (!recordPath || !destinationPath) {
      process.stderr.write("update-specification: usage: update-specification <record.json> <destination.md>\n");
      process.exitCode = 1;
    } else {
      const result = await updateSpecification(recordPath, destinationPath);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  }
}
