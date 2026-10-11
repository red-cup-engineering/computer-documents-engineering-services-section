import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";

import { canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical";
import { parseDatedNotePath, projectNotePath } from "@red-cup-engineering/computer-article-engineering-services-section/article-content-path-grammar";
import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { siteNoteFrontmatterConformance } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { validateMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/validate-markdown-document";

export const NOTE_ROOT = projectNotePath("");
export const NOTE_PROOF_PATH = Object.freeze([
  "file", "data", "content", "text", "document", "article", "note",
]);
export const NOTE_RESOURCE_CATALOG = Object.freeze({
  profile: "org.red-cup-engineering.typed-resource-catalog.v1",
  nodes: Object.freeze(NOTE_PROOF_PATH.map((type, index) => Object.freeze({
    type,
    parent: index === 0 ? null : NOTE_PROOF_PATH[index - 1],
  }))),
  imports: Object.freeze([
    "@red-cup-engineering/typed-resource-catalog",
    "@red-cup-engineering/markdown-file-reading-service",
    "@red-cup-engineering/markdown-file-writing-service",
    "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity",
    "@red-cup-engineering/immutable-content-custody-service",
    "@red-cup-engineering/organizing-a-knowledge-vault",
    "@red-cup-engineering/standards-conformance-services-section",
  ]),
});
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SHA256 = /^sha256:([a-f0-9]{64})$/u;

function digest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function receipt(body) { return Object.freeze({ id: `urn:sha256:${createHash("sha256").update(canonical(body)).digest("hex")}`, ...body }); }
function resourceIdentity(nodeRoot, path, contentIdentity) {
  return `urn:sha256:${createHash("sha256").update(canonical({ nodeRoot, path, contentIdentity })).digest("hex")}`;
}
function text(value, field, maximum = 4096) {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maximum) throw new TypeError(`${field} must be 1-${maximum} characters`);
  return value.trim();
}
function admittedRoot(nodeRoot) { return resolve(text(nodeRoot, "nodeRoot", 16_384)); }
function inside(root, candidate) {
  const target = resolve(root, candidate);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new RangeError("resource path escaped the admitted actuator node");
  return target;
}
function validDate(value) {
  const match = DATE.exec(text(value, "date", 10));
  if (!match) throw new TypeError("date must be YYYY-MM-DD");
  const instant = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(instant.valueOf()) || instant.toISOString().slice(0, 10) !== value) throw new TypeError("date must be a real calendar date");
  return { value, year: match[1], month: match[2], day: match[3] };
}
function slug(value) {
  const normalized = text(value, "slug", 160).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  if (!normalized) throw new TypeError("slug must contain an ASCII letter or digit");
  return normalized;
}
/** Merge supplied facets without silently replacing an authored value. */
function addFacets(frontmatter, supplied) {
  const admitted = canonicalizeJson(supplied, JSON_RESOURCE_ENVELOPE).value;
  for (const [key, value] of Object.entries(admitted)) {
    if (Object.hasOwn(frontmatter, key) && canonicalJson(frontmatter[key]) !== canonicalJson(value)) {
      throw new TypeError(`note frontmatter conflicts with supplied ${key}`);
    }
    Object.defineProperty(frontmatter, key, { value, enumerable: true, writable: true, configurable: true });
  }
}
function noteText(input) {
  const raw = input.carrier?.content;
  if (typeof raw !== "string" || raw.trim().length === 0 || raw.length > 16 * 1024 * 1024) throw new TypeError("carrier.content must be 1-16777216 characters");
  // The incoming carrier identity covers its actual bytes, including whitespace.
  const sourceSha256 = digest(Buffer.from(raw, "utf8"));
  if (input.carrier.sha256 !== undefined && (!SHA256.test(input.carrier.sha256) || sourceSha256 !== input.carrier.sha256)) throw new Error("carrier bytes do not match carrier.sha256");
  const parsed = readMarkdownFrontmatter(raw);
  const frontmatter = { ...canonicalizeJson(parsed.frontmatter ?? {}, JSON_RESOURCE_ENVELOPE).value };
  if (input.frontmatter !== undefined) {
    if (input.frontmatter === null || typeof input.frontmatter !== "object" || Array.isArray(input.frontmatter)) throw new TypeError("frontmatter must be an object");
    addFacets(frontmatter, input.frontmatter);
  }
  addFacets(frontmatter, { title: input.title });
  if (input.explicitAuthority !== undefined) addFacets(frontmatter, { authority: input.explicitAuthority });
  if (!Object.hasOwn(frontmatter, "date-created")) addFacets(frontmatter, { "date-created": input.date });
  else if (typeof frontmatter["date-created"] !== "string" || frontmatter["date-created"].slice(0, 10) !== input.date) {
    throw new TypeError("note date conflicts with authored date-created");
  }
  const defaults = { kind: "note", status: "research", "owning-enterprise": "red-cup-engineering", authority: input.authority };
  for (const [key, value] of Object.entries(defaults)) if (!Object.hasOwn(frontmatter, key)) addFacets(frontmatter, { [key]: value });
  for (const [key, value] of Object.entries(input.source)) if (value !== undefined && value !== null) addFacets(frontmatter, { [`source-${key}`]: String(value) });
  const conformance = siteNoteFrontmatterConformance(frontmatter);
  if (!conformance.conformant) {
    const failed = conformance.observations.filter((entry) => entry.modality === "MUST" && entry.evidence.against.length > 0).map((entry) => entry.predicate);
    throw new TypeError(`note frontmatter does not settle required facets: ${failed.join(", ")}`);
  }
  // Reserve only a synthetic body key absent from the authored metadata.
  let bodyKey = "__note_body";
  while (Object.hasOwn(frontmatter, bodyKey)) bodyKey += "_";
  const content = createMarkdownDocument(frontmatter, { body: parsed.body, bodyKey, nullFrontmatter: "preserve" });
  const roundTrip = readMarkdownFrontmatter(content);
  if (canonicalJson(roundTrip.frontmatter) !== canonicalJson(frontmatter)) throw new TypeError("Markdown generation cannot preserve all authored frontmatter fields");
  // Authorship is retained; generic validator policy must not erase it.
  const validation = validateMarkdownDocument(content, { forbiddenFrontmatterKeys: [] });
  if (!validation.parseable) throw new TypeError("generated note frontmatter is not parseable");
  return Object.freeze({ content, sourceSha256, findings: validation.findings });
}
export async function catalogNodeNotes({ nodeRoot, maximumFiles = 10_000, maximumBytes = 64 * 1024 * 1024 }) {
  const root = admittedRoot(nodeRoot), notesRoot = inside(root, NOTE_ROOT), resources = [];
  async function walk(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = inside(notesRoot, resolve(directory, entry.name));
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) continue;
      if (metadata.isDirectory()) { await walk(path); continue; }
      if (!metadata.isFile() || ![".md", ".markdown"].includes(extname(path).toLowerCase())) continue;
      const locator = relative(notesRoot, path).split(sep).join("/");
      const dated = parseDatedNotePath(locator);
      if (!dated || locator.split("/").length !== 4) continue;
      try { validDate(dated.date); } catch { continue; }
      if (resources.length >= maximumFiles) throw new RangeError("note catalog exceeds maximumFiles");
      const bytes = await readFile(path);
      const byteLength = resources.reduce((sum, item) => sum + item.byteLength, 0) + bytes.length;
      if (byteLength > maximumBytes) throw new RangeError("note catalog exceeds maximumBytes");
      const pathReading = `${NOTE_ROOT}/${locator}`, contentIdentity = digest(bytes);
      resources.push(Object.freeze({ identity: resourceIdentity(root, pathReading, contentIdentity), contentIdentity, byteLength: bytes.length, mediaType: "text/markdown", path: pathReading, proofPath: NOTE_PROOF_PATH }));
    }
  }
  await walk(notesRoot);
  const body = { type: "TypedNodeNoteCatalogReceipt", version: 1, nodeRoot: root, proofPath: NOTE_PROOF_PATH, resourceCount: resources.length, resources };
  return receipt(body);
}

export async function depositNoteCarrier(input) {
  const root = admittedRoot(input.nodeRoot), date = validDate(input.date), title = text(input.title, "title", 240), name = `${date.value}-note-on-${slug(input.slug ?? title)}.md`;
  const relativePath = projectNotePath(`${date.year}/${date.month}/${date.day}/${name}`), target = inside(root, relativePath);
  if (parseDatedNotePath(relativePath)?.date !== date.value) throw new TypeError("note path does not settle the article grammar");
  const mode = input.mode ?? "create";
  if (!new Set(["create", "replace", "upsert"]).has(mode)) throw new TypeError("mode must be create, replace, or upsert");
  const authority = input.authority ?? "source-grounded-provider-output-not-publication-or-actuation-authority";
  const source = input.source && typeof input.source === "object" && !Array.isArray(input.source) ? canonicalizeJson(input.source, JSON_RESOURCE_ENVELOPE).value : {};
  const prepared = noteText({ ...input, title, date: date.value, source, authority, explicitAuthority: input.authority }), bytes = Buffer.from(prepared.content, "utf8");
  let current = null;
  try { current = await readFile(target); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (mode === "create" && current) throw new Error("create refused because the note already exists");
  if (mode === "replace" && !current) throw new Error("replace refused because the note does not exist");
  const contentIdentity = digest(bytes), resource = resourceIdentity(root, relativePath, contentIdentity);
  if (current?.equals(bytes)) return receipt({ type: "NoteCarrierDepositReceipt", version: 1, disposition: "already-present", resource, contentIdentity, sourceResource: prepared.sourceSha256, nodeRoot: root, path: relativePath, proofPath: NOTE_PROOF_PATH, source, authority, findings: prepared.findings });
  await mkdir(dirname(target), { recursive: true });
  const temporary = inside(dirname(target), `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try { await writeFile(temporary, bytes, { flag: "wx", mode: 0o644 }); await rename(temporary, target); } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  return receipt({ type: "NoteCarrierDepositReceipt", version: 1, disposition: current ? "replaced" : "created", resource, contentIdentity, sourceResource: prepared.sourceSha256, byteLength: bytes.length, nodeRoot: root, path: relativePath, proofPath: NOTE_PROOF_PATH, source, authority, findings: prepared.findings });
}
