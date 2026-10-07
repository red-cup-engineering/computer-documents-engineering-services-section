#!/usr/bin/env node
import { validateSpecificationRecord } from "../src/specification.mjs";
import { renderSpecificationRfcXml } from "../src/specification-rfcxml.mjs";

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("render-specification-rfcxml — Reads one Specification record carrying an rfc block as JSON on stdin, validates it against the house schema, and writes its RFCXML v3 (RFC 7991) Internet-Draft to stdout.\n");
  } else {
    const record = JSON.parse(await readStdin());
    const { valid, issues } = validateSpecificationRecord(record);
    if (!valid) {
      process.stderr.write(`${JSON.stringify(issues)}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(renderSpecificationRfcXml(record));
    }
  }
}
