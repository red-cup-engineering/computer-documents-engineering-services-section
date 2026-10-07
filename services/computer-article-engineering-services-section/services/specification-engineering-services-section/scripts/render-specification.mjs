#!/usr/bin/env node
import { renderSpecificationMarkdown, validateSpecificationRecord } from "../src/specification.mjs";

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("render-specification — Reads one Specification record as JSON on stdin, validates it against the house schema, and writes its rendered Markdown carrier to stdout.\n");
  } else {
    const record = JSON.parse(await readStdin());
    const { valid, issues } = validateSpecificationRecord(record);
    if (!valid) {
      process.stderr.write(`${JSON.stringify(issues)}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(renderSpecificationMarkdown(record));
    }
  }
}
