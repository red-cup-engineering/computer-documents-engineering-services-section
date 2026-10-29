import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ACTOR,
  MARKET,
  SOURCE_EVIDENCE_PROVIDER,
  admitResearchPacket,
  contentId,
} from "../src/desk.mjs";

const NOW = "2096-07-21T12:00:00.000Z";
const SETTLEMENT = "eip155:31337:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const USES = [
  "notebooklm-transformation",
  "public-youtube-release",
  "koios-editorial-reuse",
];
const BUYERS = ["urn:ame:youtube-channel-enterprise", "urn:ame:koios-news"];
function exact(body) {
  return { id: contentId(body), ...body };
}
function delivery() {
  const award = exact({
    type: "SettledResearchAward",
    market: MARKET,
    award: "urn:award",
    buyer: BUYERS[0],
    provider: ACTOR,
    assignmentAdmission: "urn:assignment",
    researchOffer: "urn:offer",
    question: "How do institutions reproduce outcomes?",
    intendedUses: USES,
    permittedBuyers: BUYERS,
    acceptance: {
      minimumSources: 2,
      claimWarrants: true,
      uncertainty: true,
      correctionIdentity: true,
      requiredReuseRights: USES,
    },
    deliveryBy: "2096-07-23T00:00:00.000Z",
    settlementReceipt: "urn:x402",
    status: "funded-research-not-delivered",
    authorityWithheld: ["publication-authority"],
    admittedAt: NOW,
  });
  return exact({ type: "Accept", actor: MARKET, target: ACTOR, object: award });
}
function draft() {
  return {
    citations: [
      {
        id: "source-1",
        url: "https://example.org/a",
        title: "Institutional reproduction",
        publisher: "Example University",
        rights: "CC-BY-4.0",
        rightsEvidenceUrl: "https://example.org/a/rights",
        rightsEvidenceNeedle: "Creative Commons Attribution 4.0",
        retrievedAt: NOW,
      },
      {
        id: "source-2",
        url: "https://example.gov/b",
        title: "Administrative outcomes",
        publisher: "Example Agency",
        rights: "US-GOV-PUBLIC-DOMAIN",
        rightsEvidenceUrl: "https://example.gov/copyright",
        rightsEvidenceNeedle: "public domain",
        retrievedAt: NOW,
      },
    ],
    claims: [
      {
        statement:
          "Institutional rules can reproduce patterned outcomes without a single directing actor.",
        warrants: ["source-1", "source-2"],
        uncertainty:
          "The mechanism and strength vary by institution and period.",
      },
    ],
    method:
      "Compare causal mechanisms and counterexamples across attributed sources.",
    limitations: ["The packet does not generalize every institution."],
    correctionIdentity: "urn:correction:relational-1",
    buyerControlsFindings: false,
  };
}
function attestation(citations, intendedUses = USES, permittedBuyers = BUYERS) {
  const observations = citations.map((citation, index) => ({
    citation: citation.id,
    title: citation.title,
    publisher: citation.publisher,
    source: {
      finalUrl: citation.url,
      statusCode: 200,
      mediaType: "text/html",
      byteLength: 100 + index,
      sha256: `sha256:${String(index + 1).repeat(64)}`,
    },
    declaredRights: citation.rights,
    rightsEvidence: {
      finalUrl: citation.rightsEvidenceUrl,
      statusCode: 200,
      mediaType: "text/html",
      byteLength: 50 + index,
      sha256: `sha256:${String(index + 3).repeat(64)}`,
      markerSha256: `sha256:${String(index + 5).repeat(64)}`,
    },
  }));
  return exact({
    type: "CitationEvidenceAttestation",
    provider: SOURCE_EVIDENCE_PROVIDER,
    customer: ACTOR,
    request: `urn:sha256:${"9".repeat(64)}`,
    intendedUses: [...intendedUses],
    permittedBuyers: [...permittedBuyers],
    observations,
    claimBoundary:
      "observed-carriers-and-declared-rights-evidence-not-legal-sufficiency",
    externalEffects: [],
    observedAt: NOW,
  });
}
async function opts(t) {
  const root = mkdtempSync(join(tmpdir(), "relational-desk-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  return {
    dataRoot: join(root, "data"),
    runtimeRoot: join(root, "runtime"),
    settlement: SETTLEMENT,
    at: NOW,
    verifyDelivery: async () => true,
    attestSourcesAndRights: async (citations, uses, buyers) =>
      attestation(citations, uses, buyers),
    verifySourceAttestation: async () => true,
  };
}

test("live activation binds the research desk's own sovereign account", () => {
  const activation = JSON.parse(
    readFileSync(
      new URL("../content/config/activation.json", import.meta.url),
      "utf8",
    ),
  );
  const account = JSON.parse(
    readFileSync(
      new URL("../content/evm/accounts/eip155-31337.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(account.enterprise.urn, ACTOR);
  assert.equal(
    activation.evidence.sovereignSettlementAccount,
    account.account.caip10,
  );
  assert.equal(
    activation.evidence.accountDeploymentTransaction,
    account.deployment.transaction,
  );
  assert.equal(activation.liveResearch, "refused");
});

test("one paid packet binds exact source evidence and serves the awarded uses replayably", async (t) => {
  const options = await opts(t);
  const input = { marketDelivery: delivery(), draft: draft() };
  const packet = await admitResearchPacket(input, options);
  const replay = await admitResearchPacket(input, options);
  assert.deepEqual(replay, packet);
  assert.match(
    packet.sourceEvidenceAttestation,
    /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u,
  );
  assert.deepEqual(packet.reuseGrant.permittedBuyers, BUYERS);
  assert.ok(
    packet.reuseGrant.separateLaterCosts.includes("notebooklm-transformation"),
  );
  assert.equal(packet.distributionAuthority, "withheld");
});

test("unwarranted claims, buyer control, and unauthenticated evidence are refused", async (t) => {
  const options = await opts(t);
  const bad = draft();
  bad.claims[0].warrants = ["missing"];
  await assert.rejects(
    () =>
      admitResearchPacket({ marketDelivery: delivery(), draft: bad }, options),
    /unwarranted claim/u,
  );
  const controlled = draft();
  controlled.buyerControlsFindings = true;
  await assert.rejects(
    () =>
      admitResearchPacket(
        { marketDelivery: delivery(), draft: controlled },
        options,
      ),
    /independence/u,
  );
  await assert.rejects(
    () =>
      admitResearchPacket(
        { marketDelivery: delivery(), draft: draft() },
        { ...options, verifySourceAttestation: async () => false },
      ),
    /not authenticated/u,
  );
});
