#!/usr/bin/env node
import { deriveSpecificationRecord, validateSpecificationRecord } from "../src/specification.mjs";

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("derive-specification [--now <ISO-8601>] — Reads one authoring draft as JSON on stdin (a partial identity, whatThisIs, topics with local per-topic laws/standards, implementations, openQuestions, and provenance.derivedFrom) and writes the derived, schema-valid Specification record as JSON on stdout, validated before being printed.\n");
  } else {
    const nowFlagIndex = process.argv.indexOf("--now");
    const now = nowFlagIndex === -1 ? undefined : process.argv[nowFlagIndex + 1];
    const draft = JSON.parse(await readStdin());
    const record = deriveSpecificationRecord(draft, now === undefined ? {} : { now });
    const { valid, issues } = validateSpecificationRecord(record);
    if (!valid) {
      process.stderr.write(`${JSON.stringify(issues)}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(`${JSON.stringify(record)}\n`);
    }
  }
}
