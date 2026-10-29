import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  queryResearchRecords,
  recordResearchRecord,
} from "./record-journal.mjs";
import { canonical } from "../../../../../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export { canonical };

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:relational-orientation-research-desk";
export const MARKET = "urn:ame:curiosity-research-market-enterprise";
export const SOURCE_EVIDENCE_PROVIDER =
  "urn:ame:source-evidence-attestation-enterprise";
export const PACKET_CATEGORY = "relational-research.packet-admission";
const CLAIM_BOUNDARY =
  "observed-carriers-and-declared-rights-evidence-not-legal-sufficiency";
const SHA = /^sha256:[a-f0-9]{64}$/u;

export function digest(value) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}
export function contentId(value) {
  return identifyJsonSemanticContent({
    objectKind: "emsweb.relational-orientation-research.record",
    value: value,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}
function exact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, ...body } = value;
  return id === contentId(body);
}
function text(value) {
  return typeof value === "string" && value.trim() !== "";
}

async function record(value, options) {
  const at = options.at ?? new Date().toISOString();
  recordResearchRecord({
    dataRoot: options.dataRoot ?? join(NODE_ROOT, "data"),
    actor: ACTOR,
    settlement: options.settlement,
    category: PACKET_CATEGORY,
    recordedAt: at,
    record: { ...value },
  });
}

function validateAttestation(attestation, citations, settled) {
  if (
    !exact(attestation) ||
    attestation.type !== "CitationEvidenceAttestation" ||
    attestation.provider !== SOURCE_EVIDENCE_PROVIDER ||
    attestation.customer !== ACTOR ||
    attestation.claimBoundary !== CLAIM_BOUNDARY ||
    JSON.stringify(attestation.intendedUses) !==
      JSON.stringify(settled.intendedUses) ||
    JSON.stringify(attestation.permittedBuyers) !==
      JSON.stringify(settled.permittedBuyers) ||
    !Array.isArray(attestation.externalEffects) ||
    attestation.externalEffects.length !== 0 ||
    !Array.isArray(attestation.observations) ||
    attestation.observations.length !== citations.length
  )
    throw new TypeError(
      "source evidence attestation does not bind the settled research terms",
    );
  const expected = new Map(
    citations.map((citation) => [citation.id, citation]),
  );
  for (const observation of attestation.observations) {
    const citation = expected.get(observation?.citation);
    if (
      !citation ||
      observation.title !== citation.title ||
      observation.publisher !== citation.publisher ||
      observation.declaredRights !== citation.rights ||
      !SHA.test(observation.source?.sha256 ?? "") ||
      !SHA.test(observation.rightsEvidence?.sha256 ?? "") ||
      !SHA.test(observation.rightsEvidence?.markerSha256 ?? "")
    )
      throw new TypeError(
        "source evidence attestation omits or changes a citation",
      );
    expected.delete(observation.citation);
  }
  if (expected.size)
    throw new TypeError(
      "source evidence attestation omits or changes a citation",
    );
}

export async function admitResearchPacket(
  { marketDelivery, draft } = {},
  options = {},
) {
  const settled = marketDelivery?.object;
  if (
    !exact(marketDelivery) ||
    marketDelivery.type !== "Accept" ||
    marketDelivery.actor !== MARKET ||
    marketDelivery.target !== ACTOR ||
    !exact(settled) ||
    settled.type !== "SettledResearchAward" ||
    settled.provider !== ACTOR ||
    settled.status !== "funded-research-not-delivered"
  )
    throw new TypeError(
      "packet requires the market's exact funded award delivery",
    );
  if (
    typeof options.verifyDelivery !== "function" ||
    (await options.verifyDelivery(marketDelivery)) !== true
  )
    throw new TypeError("funded award lacks authenticated market delivery");
  const at = options.at ?? new Date().toISOString();
  if (
    !Number.isFinite(Date.parse(settled.deliveryBy)) ||
    Date.parse(at) > Date.parse(settled.deliveryBy)
  )
    throw new TypeError("funded award delivery window expired");
  if (
    !Array.isArray(settled.intendedUses) ||
    !Array.isArray(settled.permittedBuyers) ||
    !Array.isArray(settled.acceptance?.requiredReuseRights) ||
    !settled.intendedUses.every((use) =>
      settled.acceptance.requiredReuseRights.includes(use),
    )
  )
    throw new TypeError("funded award lacks exact use and reuse terms");
  if (
    !Array.isArray(draft?.citations) ||
    draft.citations.length < settled.acceptance.minimumSources ||
    new Set(draft.citations.map((value) => value?.id)).size !==
      draft.citations.length ||
    draft.citations.some(
      (value) =>
        !text(value?.id) ||
        typeof value.url !== "string" ||
        !value.url.startsWith("https://") ||
        !text(value.title) ||
        !text(value.publisher) ||
        !text(value.rights) ||
        typeof value.rightsEvidenceUrl !== "string" ||
        !value.rightsEvidenceUrl.startsWith("https://") ||
        !text(value.rightsEvidenceNeedle) ||
        !Number.isFinite(Date.parse(value.retrievedAt)),
    )
  )
    throw new TypeError(
      "packet lacks sufficient unique attributable citations and declared-rights evidence",
    );
  if (
    typeof options.attestSourcesAndRights !== "function" ||
    typeof options.verifySourceAttestation !== "function"
  )
    throw new TypeError(
      "packet lacks an authenticated source-evidence supplier",
    );
  const sourceAttestation = await options.attestSourcesAndRights(
    draft.citations,
    settled.intendedUses,
    settled.permittedBuyers,
  );
  validateAttestation(sourceAttestation, draft.citations, settled);
  if ((await options.verifySourceAttestation(sourceAttestation)) !== true)
    throw new TypeError("source evidence attestation is not authenticated");
  const citationIds = new Set(draft.citations.map((value) => value.id));
  if (
    !Array.isArray(draft.claims) ||
    draft.claims.length === 0 ||
    draft.claims.some(
      (value) =>
        !text(value?.statement) ||
        !Array.isArray(value.warrants) ||
        value.warrants.length === 0 ||
        value.warrants.some((id) => !citationIds.has(id)) ||
        !text(value.uncertainty),
    )
  )
    throw new TypeError(
      "packet contains an unwarranted claim or omitted uncertainty",
    );
  if (
    !text(draft.method) ||
    !Array.isArray(draft.limitations) ||
    draft.limitations.length === 0 ||
    draft.limitations.some((value) => !text(value)) ||
    !text(draft.correctionIdentity) ||
    draft.buyerControlsFindings !== false
  )
    throw new TypeError(
      "packet lacks method, limitations, correction identity, or independence",
    );

  const dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data"));
  const prior = queryResearchRecords(PACKET_CATEGORY, { dataRoot }).filter(
    (value) => value.settledAward === settled.id,
  );
  if (prior.length) {
    const rows = prior;
    if (
      rows.some((row) => !exact(row)) ||
      new Set(rows.map((row) => row.id)).size !== 1 ||
      rows[0].sourceEvidenceAttestation !== sourceAttestation.id
    )
      throw new TypeError("settled award research packet ledger conflicts");
    return rows[0];
  }
  const runtimeRoot = resolve(
    options.runtimeRoot ?? join(dataRoot, "runtime/packet-locks"),
  );
  mkdirSync(runtimeRoot, { recursive: true });
  const lock = join(runtimeRoot, digest(settled.id).slice(7));
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new TypeError("settled award is concurrently producing");
    throw error;
  }
  try {
    if (
      queryResearchRecords(PACKET_CATEGORY, { dataRoot }).some(
        (value) => value.settledAward === settled.id,
      )
    )
      throw new TypeError("settled award already has a research packet");
    const reuseGrantBody = {
      type: "ReuseGrant",
      permittedBuyers: [...settled.permittedBuyers],
      permittedUses: [...settled.intendedUses],
      researchProductionPaidOnce: true,
      separateLaterCosts: [
        "notebooklm-transformation",
        "distribution",
        "uses-outside-grant",
        "sublicense-unless-explicit",
      ],
      correctionNotifications: true,
      noFindingControl: true,
    };
    const grant = { id: contentId(reuseGrantBody), ...reuseGrantBody };
    const body = {
      type: "RelationalResearchPacketAdmission",
      provider: ACTOR,
      settledAward: settled.id,
      buyer: settled.buyer,
      question: settled.question,
      citations: draft.citations,
      claims: draft.claims,
      method: draft.method,
      limitations: draft.limitations,
      correctionIdentity: draft.correctionIdentity,
      sourceEvidenceAttestation: sourceAttestation.id,
      reuseGrant: grant,
      editorialAuthority: "withheld",
      transformationAuthority: "withheld",
      distributionAuthority: "withheld",
      admittedAt: at,
    };
    const packet = { id: contentId(body), ...body };
    await record(packet, { ...options, dataRoot, at });
    return packet;
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}
