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
import { ACTOR, MARKET, contentId } from "../src/desk.mjs";
import {
  createResearchMarketClient,
  loadResearchMarketBinding,
} from "../src/research-market-client.mjs";

const CARD = `ni:///sha-256;${"A".repeat(43)}`;
const AWARD_BODY = {
  type: "SettledResearchAward",
  market: MARKET,
  provider: ACTOR,
  buyer: "urn:ame:youtube-channel-enterprise",
  status: "funded-research-not-delivered",
};
const AWARD = contentId(AWARD_BODY);
function exact(body) {
  return { id: contentId(body), ...body };
}
function exchange(result) {
  const part = rmnPart(
    semanticBytes(["settled-research-award-delivery-result", result]),
    "result.rmn.cbor",
  );
  return {
    result: { parts: [part] },
    agentCard: { signatures: [{}] },
    inputNi: "ni:///sha-256;input",
    outputNi: part.metadata.ni,
  };
}

test("a pinned market card authenticates one exact settled award", async () => {
  const client = createResearchMarketClient({
    agentUrl: "https://market.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: CARD }),
    send: async ({ message }) => {
      const request = decodeSemantic(
        extractRmnPart(parseA2aMessage(message).parts).bytes,
      )[1];
      const award = { id: AWARD, ...structuredClone(AWARD_BODY) };
      const delivery = exact({
        type: "Accept",
        actor: MARKET,
        target: ACTOR,
        inReplyTo: request.id,
        object: award,
      });
      return exchange(
        exact({
          type: "SettledResearchAwardDeliveryResult",
          provider: MARKET,
          customer: ACTOR,
          request: request.id,
          settledAward: AWARD,
          purpose: "research-packet-production",
          disposition: "delivered",
          delivery,
          externalEffects: [],
        }),
      );
    },
  });
  const delivery = await client.requestSettledAward(AWARD);
  assert.equal(delivery.object.id, AWARD);
  assert.equal(await client.verifyDelivery(delivery), true);
  assert.equal(client.evidenceFor(delivery).agentCardIdentity, CARD);
});

test("foreign card, typed refusal, and claimed effects never authenticate", async () => {
  const refusalFor = async ({ message }) => {
    const request = decodeSemantic(
      extractRmnPart(parseA2aMessage(message).parts).bytes,
    )[1];
    return exchange(
      exact({
        type: "SettledResearchAwardDeliveryRefusal",
        provider: MARKET,
        customer: ACTOR,
        request: request.id,
        settledAward: AWARD,
        purpose: "research-packet-production",
        disposition: "refused",
        code: "settled-award-not-admitted",
        externalEffects: [],
      }),
    );
  };
  const refused = createResearchMarketClient({
    agentUrl: "https://market.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: CARD }),
    send: refusalFor,
  });
  await assert.rejects(
    () => refused.requestSettledAward(AWARD),
    (error) => error.code === "settled-award-not-admitted",
  );
  const foreign = createResearchMarketClient({
    agentUrl: "https://market.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: `ni:///sha-256;${"B".repeat(43)}` }),
    send: refusalFor,
  });
  await assert.rejects(
    () => foreign.requestSettledAward(AWARD),
    /does not match/u,
  );
  const effect = createResearchMarketClient({
    agentUrl: "https://market.invalid/.well-known/agent-card.json",
    expectedAgentCardIdentity: CARD,
    cardEvidence: () => ({ card: CARD }),
    send: async ({ message }) => {
      const request = decodeSemantic(
        extractRmnPart(parseA2aMessage(message).parts).bytes,
      )[1];
      return exchange(
        exact({
          type: "SettledResearchAwardDeliveryRefusal",
          provider: MARKET,
          customer: ACTOR,
          request: request.id,
          settledAward: AWARD,
          purpose: "research-packet-production",
          disposition: "refused",
          code: "no",
          externalEffects: ["mutation"],
        }),
      );
    },
  });
  await assert.rejects(
    () => effect.requestSettledAward(AWARD),
    /effect outside/u,
  );
});

test("the live desk binding pins the market card and award-delivery law", () => {
  const binding = loadResearchMarketBinding();
  assert.equal(
    binding.agentCardIdentity,
    "ni:///sha-256;WkdtgBCjvSrB55ayPZt3NtTsv0_5MM6Y3ppGq0QVso0",
  );
  assert.equal(
    binding.contract,
    "ni:///sha-256;WPZuOUwiR9VUT_ZPZJvtcidIjbYQfwvNfdxOI_feII4",
  );
  assert.equal(binding.purpose, "research-packet-production");
});
