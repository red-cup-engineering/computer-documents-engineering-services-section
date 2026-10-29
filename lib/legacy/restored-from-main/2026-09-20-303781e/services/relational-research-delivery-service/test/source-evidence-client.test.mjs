import assert from "node:assert/strict";
import test from "node:test";
import {
  extractRmnPart,
  parseA2aMessage,
  rmnPart,
} from "@red-cup-engineering/a2a-rmn-part-service";
import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

const A2A_JSON_OBJECT_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) =>
  identifyJsonSemanticContent({
    objectKind: A2A_JSON_OBJECT_KIND,
    value,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).bytes;
const decodeSemantic = (bytes) =>
  admitJsonSemanticContent({ bytes, objectKind: A2A_JSON_OBJECT_KIND }).value;
import { ACTOR, contentId } from "../src/desk.mjs";
import {
  SOURCE_EVIDENCE_PROVIDER,
  createSourceEvidenceClient,
  loadSourceEvidenceBinding,
} from "../src/source-evidence-client.mjs";

const CARD = `ni:///sha-256;${"A".repeat(43)}`;
const USES = [
  "notebooklm-transformation",
  "public-youtube-release",
  "koios-editorial-reuse",
];
const BUYERS = ["urn:ame:youtube-channel-enterprise", "urn:ame:koios-news"];
const CITATIONS = [
  {
    id: "a",
    url: "https://a.example/source",
    title: "A",
    publisher: "P",
    rights: "CC-BY-4.0",
    rightsEvidenceUrl: "https://a.example/rights",
    rightsEvidenceNeedle: "CC BY 4.0",
    retrievedAt: "2096-07-22T00:00:00.000Z",
  },
  {
    id: "b",
    url: "https://b.example/source",
    title: "B",
    publisher: "Q",
    rights: "US-GOV-PUBLIC-DOMAIN",
    rightsEvidenceUrl: "https://b.example/rights",
    rightsEvidenceNeedle: "public domain",
    retrievedAt: "2096-07-22T00:00:00.000Z",
  },
];
function exact(body) {
  return { id: contentId(body), ...body };
}
function observation(citation, marker) {
  return {
    citation: citation.id,
    title: citation.title,
    publisher: citation.publisher,
    source: {
      finalUrl: citation.url,
      statusCode: 200,
      mediaType: "text/html",
      byteLength: 10,
      sha256: `sha256:${marker.repeat(64)}`,
    },
    declaredRights: citation.rights,
    rightsEvidence: {
      finalUrl: citation.rightsEvidenceUrl,
      statusCode: 200,
      mediaType: "text/html",
      byteLength: 10,
      sha256: `sha256:${String(Number(marker) + 2).repeat(64)}`,
      markerSha256: `sha256:${String(Number(marker) + 4).repeat(64)}`,
    },
  };
}
function exchange(result) {
  const part = rmnPart(
    semanticBytes(["citation-evidence-attestation-result", result]),
    "result.rmn.cbor",
  );
  return {
    result: { parts: [part] },
    agentCard: { signatures: [{}] },
    inputNi: "ni:///sha-256;input",
    outputNi: part.metadata.ni,
  };
}

test("a pinned source-evidence card authenticates one exact bounded attestation", async () => {
  const client = createSourceEvidenceClient({
    agentUrl: "https://evidence.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: CARD }),
    send: async ({ message }) => {
      const request = decodeSemantic(
        extractRmnPart(parseA2aMessage(message).parts).bytes,
      )[1];
      const attestation = exact({
        type: "CitationEvidenceAttestation",
        provider: SOURCE_EVIDENCE_PROVIDER,
        customer: ACTOR,
        request: request.id,
        intendedUses: USES,
        permittedBuyers: BUYERS,
        observations: [
          observation(CITATIONS[0], "1"),
          observation(CITATIONS[1], "2"),
        ],
        claimBoundary:
          "observed-carriers-and-declared-rights-evidence-not-legal-sufficiency",
        externalEffects: [],
        observedAt: "2096-07-22T00:00:00.000Z",
      });
      return exchange(
        exact({
          type: "CitationEvidenceAttestationResult",
          provider: SOURCE_EVIDENCE_PROVIDER,
          customer: ACTOR,
          request: request.id,
          disposition: "attested",
          attestation,
          externalEffects: [],
        }),
      );
    },
  });
  const attestation = await client.attestSourcesAndRights(
    CITATIONS,
    USES,
    BUYERS,
  );
  assert.equal(await client.verifyAttestation(attestation), true);
  assert.equal(client.evidenceFor(attestation).agentCardIdentity, CARD);
  assert.equal(attestation.observations.length, 2);
});

test("foreign card and typed refusal never authenticate source evidence", async () => {
  const refuse = async ({ message }) => {
    const request = decodeSemantic(
      extractRmnPart(parseA2aMessage(message).parts).bytes,
    )[1];
    return exchange(
      exact({
        type: "CitationEvidenceAttestationRefusal",
        provider: SOURCE_EVIDENCE_PROVIDER,
        customer: ACTOR,
        request: request.id,
        disposition: "refused",
        code: "citation-evidence-retrieval-refused",
        externalEffects: [],
      }),
    );
  };
  const client = createSourceEvidenceClient({
    agentUrl: "https://evidence.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: CARD }),
    send: refuse,
  });
  await assert.rejects(
    () => client.attestSourcesAndRights(CITATIONS, USES, BUYERS),
    (error) => error.code === "citation-evidence-retrieval-refused",
  );
  const foreign = createSourceEvidenceClient({
    agentUrl: "https://evidence.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: `ni:///sha-256;${"B".repeat(43)}` }),
    send: refuse,
  });
  await assert.rejects(
    () => foreign.attestSourcesAndRights(CITATIONS, USES, BUYERS),
    /does not match/u,
  );
});

test("the live desk binding pins the attestor card, law, and claim boundary", () => {
  const binding = loadSourceEvidenceBinding();
  assert.equal(
    binding.agentCardIdentity,
    "ni:///sha-256;hcpkJm-LgOM2CgI6giEi8y2-7x-Mtcxsb_lsWDY6ff4",
  );
  assert.equal(
    binding.contract,
    "ni:///sha-256;vMtzgNbzi8nRgFXofg-MxVK81NmPd-5r1FF_GHEy5kk",
  );
  assert.equal(
    binding.claimBoundary,
    "observed-carriers-and-declared-rights-evidence-not-legal-sufficiency",
  );
});
