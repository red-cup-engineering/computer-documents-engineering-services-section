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
import { ACTOR, MARKET, contentId } from "./desk.mjs";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const RECORD = NI;
const PURPOSE = "research-packet-production";
function exact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, ...body } = value;
  return id === contentId(body);
}

export function loadResearchMarketBinding(
  path = new URL(
    "../content/config/research-market-provider.json",
    import.meta.url,
  ),
) {
  const binding = JSON.parse(readFileSync(path, "utf8"));
  if (
    binding?.type !== "CuriosityResearchMarketProviderBinding" ||
    binding.status !== "active" ||
    binding.customer !== ACTOR ||
    binding.provider !== MARKET ||
    binding.purpose !== PURPOSE ||
    typeof binding.agentUrl !== "string" ||
    !binding.agentUrl.endsWith("/.well-known/agent-card.json") ||
    !NI.test(binding.agentCardIdentity ?? "")
  )
    throw new TypeError("research market binding is not active and exact");
  return binding;
}

export function createResearchMarketClient({
  agentUrl,
  expectedAgentCardIdentity,
  send = sendRmnTask,
  cardEvidence = agentCardSignatureEvidence,
  timeoutMs = 120_000,
} = {}) {
  if (
    typeof agentUrl !== "string" ||
    !agentUrl.endsWith("/.well-known/agent-card.json") ||
    !NI.test(expectedAgentCardIdentity ?? "")
  )
    throw new TypeError(
      "research market client requires a standard signed Agent Card binding",
    );
  const authenticated = new WeakMap();
  return Object.freeze({
    async requestSettledAward(settledAward) {
      if (!RECORD.test(settledAward ?? ""))
        throw new TypeError(
          "settled-award delivery request requires one content ID",
        );
      const body = {
        type: "SettledResearchAwardDeliveryRequest",
        customer: ACTOR,
        provider: MARKET,
        settledAward,
        purpose: PURPOSE,
      };
      const request = { id: contentId(body), ...body };
      const message = userRmnMessage(
        semanticBytes(["settled-research-award-delivery-request", request]),
        "settled-research-award-delivery-request.rmn.cbor",
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
          "research market Agent Card identity does not match the contracted supplier",
        );
      const output = extractRmnPart(a2aResultParts(exchange.result));
      const term = decodeSemantic(output.bytes);
      if (
        !semanticBytes(term).equals(output.bytes) ||
        term?.[0] !== "settled-research-award-delivery-result" ||
        term.length !== 2
      )
        throw new TypeError(
          "research market returned noncanonical or foreign RMN",
        );
      const result = term[1];
      if (
        !exact(result) ||
        result.provider !== MARKET ||
        result.customer !== ACTOR ||
        result.request !== request.id ||
        result.settledAward !== settledAward ||
        result.purpose !== PURPOSE
      )
        throw new TypeError(
          "research market result does not bind the exact request",
        );
      if (
        !Array.isArray(result.externalEffects) ||
        result.externalEffects.length !== 0
      )
        throw new TypeError(
          "research market result claims an effect outside award delivery",
        );
      if (result.disposition === "refused")
        throw Object.assign(
          new Error(`research market refused: ${result.code ?? "unspecified"}`),
          { code: result.code, result },
        );
      const delivery = result.delivery;
      if (
        result.disposition !== "delivered" ||
        !exact(delivery) ||
        delivery.type !== "Accept" ||
        delivery.actor !== MARKET ||
        delivery.target !== ACTOR ||
        delivery.inReplyTo !== request.id ||
        !exact(delivery.object) ||
        delivery.object.id !== settledAward ||
        delivery.object.provider !== ACTOR ||
        delivery.object.status !== "funded-research-not-delivered"
      )
        throw new TypeError(
          "research market result lacks the exact settled-award delivery",
        );
      authenticated.set(delivery, {
        request: request.id,
        settledAward,
        agentCardIdentity: identity,
        inputNi: exchange.inputNi,
        outputNi: exchange.outputNi,
      });
      return delivery;
    },
    async verifyDelivery(delivery) {
      const evidence = authenticated.get(delivery);
      return (
        evidence?.settledAward === delivery?.object?.id &&
        evidence.agentCardIdentity === expectedAgentCardIdentity
      );
    },
    evidenceFor(delivery) {
      const evidence = authenticated.get(delivery);
      return evidence ? { ...evidence } : null;
    },
  });
}

export default function researchMarketFromBinding() {
  const binding = loadResearchMarketBinding();
  return createResearchMarketClient({
    agentUrl: binding.agentUrl,
    expectedAgentCardIdentity: binding.agentCardIdentity,
  });
}
