import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const FILTERS_DIRECTORY = fileURLToPath(new URL("../filters/", import.meta.url));

/**
 * The filters that constitute the conversion contract, in the order they apply.
 *
 * Order is part of the contract. Drill state is removed first, so that the
 * identity filter never promotes a UUID belonging to a card that is about to be
 * discarded. Raw residue is removed last, once every filter that might have
 * read an uninterpreted keyword has had its turn.
 */
export const CONVERSION_FILTERS = Object.freeze([
  "drop-org-drill-state.lua",
  "preserve-org-roam-identity.lua",
  "drop-raw-org-residue.lua",
]);

/**
 * The reader, writer, and options this service converts under.
 *
 * `gfm+attributes` is the writer because a heading's org-roam `:ID:` must be
 * writable as an anchor; plain `gfm` silently discards heading attributes, which
 * would drop the identity the filters just preserved.
 *
 * `--wrap=none` emits one line per paragraph. Prose line shape is not this
 * service's to decide, and semantic linefeed normalization is a separate
 * service; unwrapped output is the form that leaves that choice open.
 */
export const CONVERSION_CONTRACT = Object.freeze({
  from: "org",
  to: "gfm+attributes",
  wrap: "none",
  standalone: true,
});

/**
 * Builds the exact pandoc argument vector this service invokes under.
 *
 * Kept separate from the invocation so the contract can be asserted without a
 * pandoc on the machine.
 *
 * @param {{ filtersDirectory?: string }} [options]
 * @returns {string[]}
 */
export function pandocOrgToMarkdownArguments(options = {}) {
  const filtersDirectory = options.filtersDirectory ?? FILTERS_DIRECTORY;
  return [
    "--from", CONVERSION_CONTRACT.from,
    "--to", CONVERSION_CONTRACT.to,
    "--standalone",
    `--wrap=${CONVERSION_CONTRACT.wrap}`,
    ...CONVERSION_FILTERS.flatMap((filter) => ["--lua-filter", `${filtersDirectory}${filter}`]),
  ];
}

/**
 * Converts an Org document to Markdown under the conversion contract.
 *
 * Reads and writes strings rather than paths: byte custody belongs to file
 * services, and a converter that opened files would be claiming it.
 *
 * @param {string} org
 * @param {{ pandocPath?: string, filtersDirectory?: string }} [options]
 * @returns {Promise<string>}
 */
export function convertOrgToMarkdown(org, options = {}) {
  if (typeof org !== "string") throw new TypeError("org must be a string");

  const pandocPath = options.pandocPath ?? "pandoc";
  const pandoc = spawn(pandocPath, pandocOrgToMarkdownArguments(options));

  return new Promise((resolve, reject) => {
    let markdown = "";
    let diagnostics = "";

    pandoc.stdout.setEncoding("utf8");
    pandoc.stderr.setEncoding("utf8");
    pandoc.stdout.on("data", (chunk) => { markdown += chunk; });
    pandoc.stderr.on("data", (chunk) => { diagnostics += chunk; });

    pandoc.on("error", (cause) => {
      reject(new Error(`could not run ${pandocPath}`, { cause }));
    });
    pandoc.on("close", (code) => {
      if (code === 0) resolve(markdown);
      else reject(new Error(`${pandocPath} exited ${code}: ${diagnostics.trim()}`));
    });

    pandoc.stdin.on("error", () => {
      // pandoc closing stdin early surfaces as the non-zero exit above, which
      // carries its diagnostics; the broken pipe on its own says nothing.
    });
    pandoc.stdin.end(org, "utf8");
  });
}

const ORG_TIMESTAMP = /^\\?[[<]?(\d{4}-\d{2}-\d{2})/u;
const ORG_LINK = /\\?\[\\?\[[^\]\\]*\\?\]\\?\[([^\]\\]+)\\?\]\\?\]|\\?\[\\?\[(?:id:)?([^\]\\]+)\\?\]\\?\]/gu;

/** A property value with its org links replaced by their labels. */
export function orgLinkLabels(value) {
  return value.replace(ORG_LINK, (_, label, target) => label ?? target).replace(/\s+/gu, " ").trim();
}

const kebab = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

/**
 * Reads an org-roam property alist, `((key . value) (key . (value value)))`, whose atoms are org
 * links or bare words. Atoms become their labels; keys become kebab-case, a list value an array
 * and a nested alist a map. Returns undefined when the value is not an alist.
 *
 * @param {string} value
 * @returns {Record<string, unknown> | undefined}
 */
export function readOrgAlist(value) {
  if (!value.trim().startsWith("((")) return undefined;
  const atom = new RegExp(`${ORG_LINK.source}|[()]|(?<=\\s)\\.(?=\\s)|"[^"]*"|[^\\s()]+`, "gu");
  const tokens = [...value.matchAll(atom)].map(([t]) => (t === "(" || t === ")" || t === "." ? t : orgLinkLabels(t)));
  let at = 0;
  const read = () => {
    if (tokens[at] !== "(") return tokens[at++]?.replace(/^"|"$/gu, "");
    at++;
    const items = [];
    while (at < tokens.length && tokens[at] !== ")") {
      if (tokens[at] === ".") { at++; items.push({ tail: read() }); } else items.push(read());
    }
    at++;
    return items;
  };
  const pair = (n) => Array.isArray(n) && n.length === 2 && typeof n[1] === "object" && n[1] !== null && "tail" in n[1];
  const shape = (node) => {
    if (!Array.isArray(node)) return node;
    if (node.length && node.every(pair)) return Object.fromEntries(node.map(([k, { tail }]) => [kebab(String(k)), shape(tail)]));
    return node.map(shape);
  };
  const tree = shape(read());
  return tree && typeof tree === "object" && !Array.isArray(tree) ? tree : undefined;
}

const HOUSE_KEYS = new Set(["id", "title", "description", "date-created", "type", "visibility", "aliases"]);

/**
 * The house frontmatter an org-roam note's converted keywords state: its `#+date` as
 * `date-created`, its `:form:` or `:instantiates:` (the kind of thing the note is, written as a
 * link to that kind's note) as `type`, and `:public: true` as `visibility: public`. A
 * `:resource-description:` alist becomes one key per entry, its `resource type` the `type`; every
 * other property written as org links keeps their labels. The org-roam `id` is kept, lower case,
 * so links to it can be resolved;
 * an identity that is not an org-roam UUID is left as written. Returns only the keys to set and to remove.
 *
 * @param {Record<string, unknown>} frontmatter - the converted note's frontmatter.
 * @returns {{ set: Record<string, unknown>, remove: string[] }}
 */
export function houseFrontmatterOfOrgRoam(frontmatter) {
  const set = {};
  const remove = [];
  const unset = (key) => frontmatter[key] === undefined && set[key] === undefined;
  const date = typeof frontmatter.date === "string" ? frontmatter.date.match(ORG_TIMESTAMP)?.[1] : undefined;
  if (date && frontmatter["date-created"] === undefined) { set["date-created"] = date; remove.push("date"); }
  for (const key of ["form", "instantiates"]) {
    if (typeof frontmatter[key] !== "string") continue;
    const kind = orgLinkLabels(frontmatter[key]).toLowerCase();
    if (kind && unset("type")) set.type = kind;
    remove.push(key);
  }
  if (frontmatter.public !== undefined) {
    if (String(frontmatter.public).trim() === "true" && frontmatter.visibility === undefined) set.visibility = "public";
    remove.push("public");
  }
  if (typeof frontmatter.id === "string" && /^[0-9A-F-]{36}$/iu.test(frontmatter.id) && frontmatter.id !== frontmatter.id.toLowerCase()) set.id = frontmatter.id.toLowerCase();
  const description = typeof frontmatter["resource-description"] === "string"
    ? readOrgAlist(frontmatter["resource-description"]) : undefined;
  if (description) {
    remove.push("resource-description");
    for (const [key, value] of Object.entries(description)) {
      if (key === "resource-type") { if (typeof value === "string" && unset("type")) set.type = value.toLowerCase(); }
      else if (unset(key)) set[key] = value;
    }
  }
  for (const [key, value] of Object.entries(frontmatter)) {
    if (HOUSE_KEYS.has(key) || key in set || remove.includes(key) || typeof value !== "string") continue;
    const labels = orgLinkLabels(value);
    if (labels !== value) set[key] = labels;
  }
  return Object.freeze({ set: Object.freeze(set), remove: Object.freeze(remove) });
}
