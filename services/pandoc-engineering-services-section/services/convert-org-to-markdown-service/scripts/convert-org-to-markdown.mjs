#!/usr/bin/env node
// Reads an Org document on stdin and writes Markdown on stdout.
//
// Paths are deliberately absent: redirection makes the caller's file handling
// explicit, and keeps byte custody with whoever already holds it.

import { convertOrgToMarkdown } from "../src/convert-org-to-markdown.mjs";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

try {
  process.stdout.write(await convertOrgToMarkdown(Buffer.concat(chunks).toString("utf8")));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
