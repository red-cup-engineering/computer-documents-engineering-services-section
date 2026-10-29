import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { canonical } from "@red-cup-engineering/computer-data-engine/json";
export { canonical };
import { journalRecords, recordJournal } from "./journal.mjs";

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:mathematics-research-enterprise";
export const CUSTOMER = "urn:ame:mathematics-curriculum-enterprise";
export const CATEGORY = "mathematics-research.source-packet-admission";
export const SOURCE_PACKET_ROOT = join(NODE_ROOT, "content/source-packets");
export const FIRST_PACKET = join(SOURCE_PACKET_ROOT, "causality-and-kinematic-space/order-before-distance.md");
const REQUIRED_USES = ["notebooklm-transformation", "mathematics-curriculum", "public-youtube-release"];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export function digest(value) { const bytes = value instanceof Uint8Array ? value : Buffer.from(canonical(value)); return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
export function contentId(objectKind, value) { return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function exact(value, objectKind) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(objectKind, body); }

function exactCarrier(path) {
  const target = resolve(path), root = realpathSync(SOURCE_PACKET_ROOT), actual = realpathSync(target);
  if (actual !== root && !actual.startsWith(`${root}/`)) throw new TypeError("mathematics source packet carrier escapes the research settlement");
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 500 || stat.size > 1_000_000) throw new TypeError("mathematics source packet must be one bounded regular file");
  return { target, bytes: readFileSync(target) };
}

export function firstPacketDraft(path = FIRST_PACKET) {
  const { target, bytes } = exactCarrier(path);
  return {
    carrier: { path: relative(NODE_ROOT, target), mediaType: "text/markdown", byteLength: bytes.length, sha256: digest(bytes) },
    courseId: "causality-and-kinematic-space", lessonId: "order-before-distance",
    citations: [
      { id: "surya-2019-causal-set-review", title: "The causal set approach to quantum gravity", authors: ["Sumati Surya"], publisher: "Living Reviews in Relativity / arXiv", url: "https://arxiv.org/abs/1903.11544", kind: "primary-research-review" },
      { id: "sorkin-2003-causal-sets", title: "Causal Sets: Discrete Gravity", authors: ["Rafael D. Sorkin"], publisher: "arXiv", url: "https://arxiv.org/abs/gr-qc/0309009", kind: "primary-research-review" },
      { id: "czech-et-al-2015-integral-geometry", title: "Integral Geometry and Holography", authors: ["Bartłomiej Czech", "Lampros Lamprou", "Samuel McCandlish", "James Sully"], publisher: "JHEP / arXiv", url: "https://arxiv.org/abs/1505.05515", kind: "primary-research-paper" },
    ],
    claims: [
      { statement: "A causal partial order carries precedence and incomparability without by itself assigning metric distance.", warrants: ["surya-2019-causal-set-review", "sorkin-2003-causal-sets"], scope: "order-theoretic and causal-set framing" },
      { statement: "Causal-set approaches distinguish causal order from local-finiteness volume information.", warrants: ["surya-2019-causal-set-review", "sorkin-2003-causal-sets"], scope: "description of the research program, not experimental confirmation" },
      { statement: "Kinematic-space constructions can treat intervals or geodesics as points in a derived space under precise holographic hypotheses.", warrants: ["czech-et-al-2015-integral-geometry"], scope: "the cited AdS3/CFT2 construction, not arbitrary relational systems" },
    ],
    limitations: ["The packet is a teaching synthesis, not a proof of spacetime reconstruction theorems.", "No claim is made that every poset admits a unique metric or faithful manifold embedding.", "The cited works retain their own rights and are not redistributed by this packet."],
    reuseGrant: [...REQUIRED_USES], correctionIdentity: "urn:emsenn:corrections:mathematics-research:order-before-distance:v1",
    internalTransfer: { legalBodyRelation: "same-legal-body", accountingUnit: "USD-micros", allocatedCostMicros: 250000, cashSettlementRequired: false, status: "internal-cost-allocation-admitted" },
  };
}

export function packetDraftFromManifest(path) {
  const manifestPath = resolve(path), root = realpathSync(SOURCE_PACKET_ROOT), actual = realpathSync(manifestPath);
  if (actual !== root && !actual.startsWith(`${root}/`)) throw new TypeError("source packet manifest escapes the research settlement");
  const stat = lstatSync(manifestPath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 100 || stat.size > 1_000_000) throw new TypeError("source packet manifest must be one bounded regular file");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (typeof manifest.carrierFile !== "string" || !manifest.carrierFile || manifest.carrierFile.includes("/") || manifest.carrierFile.includes("\\")) throw new TypeError("source packet manifest requires one local carrier filename");
  const { target, bytes } = exactCarrier(join(dirname(manifestPath), manifest.carrierFile));
  const { carrierFile: _carrierFile, ...draft } = manifest;
  return { carrier: { path: relative(NODE_ROOT, target), mediaType: "text/markdown", byteLength: bytes.length, sha256: digest(bytes) }, ...draft };
}

export function sourcePacketDraft({ courseId, lessonId, revision = 1 } = {}) {
  if (!ID.test(courseId ?? "") || !ID.test(lessonId ?? "") || !Number.isInteger(revision) || revision < 1) throw new TypeError("source packet lookup requires bounded course, lesson, and revision identities");
  if (courseId === "causality-and-kinematic-space" && lessonId === "order-before-distance" && revision === 1) return firstPacketDraft();
  return packetDraftFromManifest(join(SOURCE_PACKET_ROOT, courseId, `${lessonId}.v${revision}.json`));
}

export function validateSourcePacketDraft(draft) {
  if (!ID.test(draft?.courseId ?? "") || !ID.test(draft?.lessonId ?? "")) throw new TypeError("source packet requires bounded course and lesson identities");
  if (draft?.carrier?.mediaType !== "text/markdown" || !Number.isInteger(draft.carrier.byteLength) || !/^sha256:[a-f0-9]{64}$/u.test(draft.carrier.sha256 ?? "")) throw new TypeError("source packet carrier description is invalid");
  const { bytes } = exactCarrier(resolve(NODE_ROOT, draft.carrier.path ?? ""));
  if (bytes.length !== draft.carrier.byteLength || digest(bytes) !== draft.carrier.sha256) throw new TypeError("source packet carrier bytes changed");
  if (!Array.isArray(draft.citations) || draft.citations.length < 3) throw new TypeError("source packet requires three primary-source citations");
  const citationIds = draft.citations.map((row) => row?.id);
  if (citationIds.some((id) => !ID.test(id ?? "")) || new Set(citationIds).size !== citationIds.length || draft.citations.some((row) => {
    try { const url = new URL(row.url); return url.protocol !== "https:" || url.hostname !== "arxiv.org" || !url.pathname.startsWith("/abs/") || !row.kind?.startsWith("primary-") || !row.title || !Array.isArray(row.authors) || row.authors.length === 0; }
    catch { return true; }
  })) throw new TypeError("source packet requires unique primary-source citations");
  const cited = new Set(citationIds);
  if (!Array.isArray(draft.claims) || draft.claims.length === 0 || draft.claims.some((row) => !row.statement || !row.scope || !row.warrants?.length || row.warrants.some((id) => !cited.has(id)))) throw new TypeError("source packet contains an unwarranted claim");
  if (!Array.isArray(draft.limitations) || draft.limitations.length === 0 || draft.limitations.some((row) => typeof row !== "string" || !row.trim()) || typeof draft.correctionIdentity !== "string" || !draft.correctionIdentity.trim()) throw new TypeError("source packet requires explicit limits and correction identity");
  if (REQUIRED_USES.some((use) => !draft.reuseGrant?.includes(use)) || draft.internalTransfer?.legalBodyRelation !== "same-legal-body" || draft.internalTransfer.cashSettlementRequired !== false) throw new TypeError("source packet lacks exact internal reuse and transfer terms");
  return true;
}

export async function admitSourcePacket(draft = firstPacketDraft(), options = {}) {
  validateSourcePacketDraft(draft);
  const root = resolve(options.dataRoot ?? NODE_ROOT), corpusDigest = contentId("mathematics-research.source-corpus", { carrier: draft.carrier.sha256, citations: draft.citations, claims: draft.claims });
  const lessonPrior = journalRecords(root, CATEGORY).find((row) => row.courseId === draft.courseId && row.lessonId === draft.lessonId);
  if (lessonPrior) {
    if (lessonPrior.corpusDigest === corpusDigest && lessonPrior.correctionIdentity === draft.correctionIdentity && canonical(lessonPrior.reuseGrant) === canonical(draft.reuseGrant)) return lessonPrior;
    throw new TypeError("source packet lesson already has a different immutable admission; form a successor correction");
  }
  const at = options.at ?? new Date().toISOString(), body = { type: "ResearchSourcePacketAdmission", provider: ACTOR, customer: CUSTOMER, courseId: draft.courseId, lessonId: draft.lessonId, carrier: draft.carrier, corpusDigest, citations: draft.citations, claims: draft.claims, limitations: draft.limitations, reuseGrant: draft.reuseGrant, correctionIdentity: draft.correctionIdentity, internalTransfer: draft.internalTransfer, authorityWithheld: ["curriculum-membership", "notebooklm-generation", "youtube-channel", "upload-schedule-publication"], admittedAt: at }, packet = { id: contentId("mathematics-research.source-packet-admission", body), ...body };
  recordJournal(root, CATEGORY, at, packet); return packet;
}

export function deliverSourcePacket(packet) { if (!exact(packet, "mathematics-research.source-packet-admission") || packet.type !== "ResearchSourcePacketAdmission" || packet.provider !== ACTOR || packet.customer !== CUSTOMER) throw new TypeError("source delivery requires the exact admitted packet"); const body = { type: "Accept", actor: ACTOR, target: CUSTOMER, object: packet }; return { id: contentId("mathematics-research.source-packet-delivery", body), ...body }; }
