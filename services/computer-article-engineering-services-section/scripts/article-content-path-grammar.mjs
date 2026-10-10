import { posix } from "node:path";

const DEFAULT_NOTE_NAME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})-note-on-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u;

export const DEFAULT_ARTICLE_CONTENT_GRAMMAR = Object.freeze({
  articleRoot: "content/text/documents/articles",
  noteRoot: "content/text/documents/articles/notes",
  noteName: Object.freeze({ pattern: DEFAULT_NOTE_NAME_PATTERN }),
});

function relativePath(value, name) {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
  const normalized = posix.normalize(value.replaceAll("\\", "/")).replace(/^\.\//u, "").replace(/^\/+|\/+$/gu, "");
  if (normalized === ".." || normalized.startsWith("../")) throw new TypeError(`${name} must remain relative`);
  return normalized === "." ? "" : normalized;
}

function requireGrammar(grammar) {
  if (!grammar || typeof grammar.articleRoot !== "string" || typeof grammar.noteRoot !== "string" || !(grammar.noteName?.pattern instanceof RegExp)) {
    throw new TypeError("grammar must wholly define articleRoot, noteRoot, and noteName.pattern");
  }
  return grammar;
}

function under(root, region) {
  const normalizedRoot = relativePath(root, "grammar root");
  const normalizedRegion = relativePath(region ?? "", "region");
  return normalizedRegion ? posix.join(normalizedRoot, normalizedRegion) : normalizedRoot;
}

export function projectArticleRegion(region = "", grammar = DEFAULT_ARTICLE_CONTENT_GRAMMAR) {
  return under(requireGrammar(grammar).articleRoot, region);
}

export function projectNotePath(path, grammar = DEFAULT_ARTICLE_CONTENT_GRAMMAR) {
  return under(requireGrammar(grammar).noteRoot, path);
}

export function parseDatedNoteName(name, grammar = DEFAULT_ARTICLE_CONTENT_GRAMMAR) {
  if (typeof name !== "string") throw new TypeError("name must be a string");
  const match = requireGrammar(grammar).noteName.pattern.exec(name);
  if (!match) return null;
  const [, year, month, day, token] = match;
  return Object.freeze({ date: `${year}-${month}-${day}`, year, month, day, token });
}

export function parseDatedNotePath(path, grammar = DEFAULT_ARTICLE_CONTENT_GRAMMAR) {
  const normalized = relativePath(path, "path");
  const segments = normalized.split("/");
  const name = segments.at(-1);
  const parsed = parseDatedNoteName(name ?? "", grammar);
  if (!parsed) return null;
  const [year, month, day] = segments.slice(-4, -1);
  if (year !== parsed.year || month !== parsed.month || day !== parsed.day) return null;
  return Object.freeze({ ...parsed, path: normalized });
}
