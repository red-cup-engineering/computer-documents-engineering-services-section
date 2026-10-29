import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  a2aResultParts,
  sendRmnTask,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import { agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  extractRmnPart,
  userRmnMessage,
} from "@red-cup-engineering/a2a-rmn-part-service";
import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) =>
  identifyJsonSemanticContent({
    objectKind: A2A_CARRIER_KIND,
    value,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).bytes;
const decodeSemantic = (bytes) =>
  admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { ACTOR, contentId } from "./desk.mjs";

export const SOURCE_EVIDENCE_PROVIDER =
  "urn:ame:source-evidence-attestation-enterprise";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const SHA = /^sha256:[a-f0-9]{64}$/u;
const CLAIM_BOUNDARY =
  "observed-carriers-and-declared-rights-evidence-not-legal-sufficiency";
function exact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, ...body } = value;
  return id === contentId(body);
}

export function loadSourceEvidenceBinding(
  path = new URL(
    "../content/config/source-evidence-provider.json",
    import.meta.url,
  ),
) {
  const binding = JSON.parse(readFileSync(path, "utf8"));
  if (
    binding?.type !== "SourceEvidenceAttestationProviderBinding" ||
    binding.status !== "active" ||
    binding.customer !== ACTOR ||
    binding.provider !== SOURCE_EVIDENCE_PROVIDER ||
    binding.claimBoundary !== CLAIM_BOUNDARY ||
    typeof binding.agentUrl !== "string" ||
    !binding.agentUrl.endsWith("/.well-known/agent-card.json") ||
    !NI.test(binding.agentCardIdentity ?? "")
  )
    throw new TypeError("source evidence binding is not active and exact");
  return binding;
}

export function createSourceEvidenceClient({
  agentUrl,
  expectedAgentCardIdentity,
  send = sendRmnTask,
  cardEvidence = agentCardSignatureEvidence,
  timeoutMs = 180_000,
} = {}) {
  if (
    typeof agentUrl !== "string" ||
    !agentUrl.endsWith("/.well-known/agent-card.json") ||
    !NI.test(expectedAgentCardIdentity ?? "")
  )
    throw new TypeError(
      "source evidence client requires a standard signed Agent Card binding",
    );
  const authenticated = new WeakMap();
  return Object.freeze({
    async attestSourcesAndRights(citations, intendedUses, permittedBuyers) {
      const body = {
        type: "CitationEvidenceAttestationRequest",
        customer: ACTOR,
        provider: SOURCE_EVIDENCE_PROVIDER,
        citations: structuredClone(citations),
        intendedUses: [...intendedUses],
        permittedBuyers: [...permittedBuyers],
      };
      const request = { id: contentId(body), ...body };
      const message = userRmnMessage(
        semanticBytes(["citation-evidence-attestation-request", request]),
        "citation-evidence-attestation-request.rmn.cbor",
        randomUUID(),
      );
      const exchange = await send({
        agentUrl,
        message,
        requireSignature: true,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const identity = cardEvidence(exchange.agentCard).card;
      if (identity !== expectedAgentCardIdentity)
        throw new TypeError(
          "source evidence Agent Card identity does not match the contracted supplier",
        );
      const output = extractRmnPart(a2aResultParts(exchange.result));
      const term = decodeSemantic(output.bytes);
      if (
        !semanticBytes(term).equals(output.bytes) ||
        term?.[0] !== "citation-evidence-attestation-result" ||
        term.length !== 2
      )
        throw new TypeError(
          "source evidence provider returned noncanonical or foreign RMN",
        );
      const result = term[1];
      if (
        !exact(result) ||
        result.provider !== SOURCE_EVIDENCE_PROVIDER ||
        result.customer !== ACTOR ||
        result.request !== request.id ||
        !Array.isArray(result.externalEffects) ||
        result.externalEffects.length !== 0
      )
        throw new TypeError(
          "source evidence result does not bind the exact zero-effect request",
        );
      if (result.disposition === "refused")
        throw Object.assign(
          new Error(
            `source evidence provider refused: ${result.code ?? "unspecified"}`,
          ),
          { code: result.code, result },
        );
      const attestation = result.attestation;
      if (
        result.disposition !== "attested" ||
        !exact(attestation) ||
        attestation.type !== "CitationEvidenceAttestation" ||
        attestation.provider !== SOURCE_EVIDENCE_PROVIDER ||
        attestation.customer !== ACTOR ||
        attestation.request !== request.id ||
        attestation.claimBoundary !== CLAIM_BOUNDARY ||
        !Array.isArray(attestation.externalEffects) ||
        attestation.externalEffects.length !== 0 ||
        JSON.stringify(attestation.intendedUses) !==
          JSON.stringify(intendedUses) ||
        JSON.stringify(attestation.permittedBuyers) !==
          JSON.stringify(permittedBuyers) ||
        !Array.isArray(attestation.observations) ||
        attestation.observations.length !== citations.length
      )
        throw new TypeError(
          "source evidence result lacks the exact bounded attestation",
        );
      const requested = new Map(
        citations.map((citation) => [citation.id, citation]),
      );
      for (const observation of attestation.observations) {
        const citation = requested.get(observation?.citation);
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
            "source evidence attestation drifts from a requested citation",
          );
        requested.delete(observation.citation);
      }
      if (requested.size)
        throw new TypeError(
          "source evidence attestation omits a requested citation",
        );
      authenticated.set(attestation, {
        request: request.id,
        agentCardIdentity: identity,
        inputNi: exchange.inputNi,
        outputNi: exchange.outputNi,
      });
      return attestation;
    },
    async verifyAttestation(attestation) {
      const evidence = authenticated.get(attestation);
      return (
        evidence?.request === attestation?.request &&
        evidence.agentCardIdentity === expectedAgentCardIdentity
      );
    },
    evidenceFor(attestation) {
      const evidence = authenticated.get(attestation);
      return evidence ? { ...evidence } : null;
    },
  });
}

export default function sourceEvidenceFromBinding() {
  const binding = loadSourceEvidenceBinding();
  return createSourceEvidenceClient({
    agentUrl: binding.agentUrl,
    expectedAgentCardIdentity: binding.agentCardIdentity,
  });
}
