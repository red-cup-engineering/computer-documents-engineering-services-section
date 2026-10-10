#!/usr/bin/env node
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { statPath } from "@red-cup-engineering/computer-file-engineering-services-section/stat-path";
import { countNormativeKeywords } from "../src/specification.mjs";

const EXCLUDED_DIRECTORY_NAMES = ["node_modules", "lib", ".git"];

function companionRecordPath(markdownPath) {
  return markdownPath.replace(/\.md$/u, ".specification.json");
}

async function censusOneFile(absolutePath, repoRelativePath) {
  const text = await readFileText(absolutePath);
  const hasCompanionRecord = (await statPath({ path: companionRecordPath(absolutePath) })).exists;
  return { path: repoRelativePath, fabricated: hasCompanionRecord, keywordCounts: countNormativeKeywords(text) };
}

/**
 * Censuses every Markdown file under any `specifications/` directory below `root`, reporting
 * per file whether it has a companion `<name>.specification.json` record (the mark of a
 * fabricated carrier per make-specification.mjs/update-specification.mjs) and its raw BCP 14
 * keyword counts — a handwritten carrier commonly carries keywords with no companion record at
 * all.
 * @param {string} root Directory to walk.
 * @returns {Promise<{root: string, filesCensused: number, fabricated: number, handwritten: number, files: object[]}>}
 */
export async function censusSpecifications(root) {
  const walk = await walkPosixPaths({ root, excludes: EXCLUDED_DIRECTORY_NAMES, extensions: [".md"], paths: "absolute" });
  const underSpecifications = walk.files.filter((file) => file.path.slice(walk.root.length + 1).split("/").includes("specifications"));
  const files = await Promise.all(underSpecifications.map((file) => censusOneFile(file.path, file.path.slice(walk.root.length + 1))));
  return {
    root: walk.root,
    filesCensused: files.length,
    fabricated: files.filter((file) => file.fabricated).length,
    handwritten: files.filter((file) => !file.fabricated).length,
    files,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(`census-specification [root] — Walks [root] (default: cwd) for every Markdown file under a "specifications/" directory, reporting whether each has a companion .specification.json record and its BCP 14 keyword counts, as JSON on stdout.\n`);
  } else {
    const root = process.argv[2] ?? process.cwd();
    process.stdout.write(`${JSON.stringify(await censusSpecifications(root), null, 2)}\n`);
  }
}
