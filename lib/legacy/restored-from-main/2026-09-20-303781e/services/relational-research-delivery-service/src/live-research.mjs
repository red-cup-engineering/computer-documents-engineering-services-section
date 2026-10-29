import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTOR, NODE_ROOT, admitResearchPacket, contentId } from "./desk.mjs";
import { createAssignmentAdmissionClient } from "./assignment-admission-client.mjs";
import researchMarketFromBinding from "./research-market-client.mjs";
import sourceEvidenceFromBinding from "./source-evidence-client.mjs";

const CHANNEL = "urn:ame:youtube-channel-enterprise",
  MARKET = "urn:ame:curiosity-research-market-enterprise";
function exact(value) {
  if (!value || typeof value !== "object") return false;
  const { id, ...body } = value;
  return id === contentId(body);
}
export function plans(root = join(NODE_ROOT, "content/research-plans")) {
  return readdirSync(root)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(root, name), "utf8")));
}
export function planForQuestion(question, root) {
  const matches = plans(root).filter(
    (plan) =>
      plan.type === "RelationalResearchPlan" && plan.question === question,
  );
  if (matches.length !== 1)
    throw new TypeError(
      "research desk requires one exact bounded plan for the awarded question",
    );
  return matches[0];
}
export async function formSupplyOffer(
  assignmentAdmission,
  { assignmentClient = createAssignmentAdmissionClient(), planRoot } = {},
) {
  const delivery = await assignmentClient.request(assignmentAdmission),
    assignment = delivery.object;
  if (
    (await assignmentClient.verify(delivery)) !== true ||
    assignment.type !== "ResearchAssignmentAdmission" ||
    assignment.market !== MARKET
  )
    throw new TypeError(
      "research offer requires the market's authenticated assignment",
    );
  const plan = planForQuestion(assignment.question, planRoot);
  const deliveryBy = assignment.deliveryBy;
  if (
    plan.citations.length < assignment.acceptance.minimumSources ||
    plan.askMicros > assignment.maxPriceMicros
  )
    throw new TypeError("research plan cannot satisfy the assignment");
  const objectBody = {
      type: "ResearchSupplyOffer",
      provider: ACTOR,
      assignment: assignment.id,
      askMicros: plan.askMicros,
      accountingUnit: plan.accountingUnit,
      availableSources: plan.citations.length,
      claimWarrants: true,
      uncertainty: true,
      correctionIdentity: true,
      reuseRights: [...assignment.intendedUses],
      deliveryBy,
    },
    object = { id: contentId(objectBody), ...objectBody },
    body = { type: "Offer", actor: ACTOR, target: MARKET, object };
  return { id: contentId(body), ...body };
}
export async function produceResearchPacket(
  settledAward,
  {
    marketClient = researchMarketFromBinding(),
    sourceClient = sourceEvidenceFromBinding(),
    planRoot,
    ...options
  } = {},
) {
  const marketDelivery = await marketClient.requestSettledAward(settledAward),
    settled = marketDelivery.object;
  if (
    (await marketClient.verifyDelivery(marketDelivery)) !== true ||
    settled.buyer !== CHANNEL
  )
    throw new TypeError(
      "research production requires the authenticated channel-bought award",
    );
  const plan = planForQuestion(settled.question, planRoot),
    draft = {
      citations: structuredClone(plan.citations),
      claims: structuredClone(plan.claims),
      method: plan.method,
      limitations: [...plan.limitations],
      correctionIdentity: plan.correctionIdentity,
      buyerControlsFindings: false,
    };
  const packet = await admitResearchPacket(
    { marketDelivery, draft },
    {
      ...options,
      verifyDelivery: (value) => marketClient.verifyDelivery(value),
      attestSourcesAndRights: (citations, uses, buyers) =>
        sourceClient.attestSourcesAndRights(citations, uses, buyers),
      verifySourceAttestation: (value) => sourceClient.verifyAttestation(value),
    },
  );
  const body = {
    type: "Accept",
    actor: ACTOR,
    target: CHANNEL,
    object: packet,
  };
  return { id: contentId(body), ...body };
}
export function supplyOfferResult(request, delivery) {
  const body = {
    type: "RelationalResearchSupplyOfferResult",
    provider: ACTOR,
    customer: MARKET,
    request: request.id,
    assignmentAdmission: request.assignmentAdmission,
    disposition: "offered",
    delivery,
    externalEffects: [],
  };
  return { id: contentId(body), ...body };
}
export function researchProductionResult(request, delivery) {
  const body = {
    type: "RelationalResearchProductionResult",
    provider: ACTOR,
    customer: CHANNEL,
    request: request.id,
    settledAward: request.settledAward,
    disposition: "delivered",
    delivery,
    externalEffects: ["public-source-retrieval", "research-packet-admission"],
  };
  return { id: contentId(body), ...body };
}
export function validateSupplyRequest(request) {
  return (
    exact(request) &&
    request.type === "RelationalResearchSupplyOfferRequest" &&
    request.customer === MARKET &&
    request.provider === ACTOR &&
    /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(
      request.assignmentAdmission ?? "",
    )
  );
}
export function validateProductionRequest(request) {
  return (
    exact(request) &&
    request.type === "RelationalResearchProductionRequest" &&
    request.customer === CHANNEL &&
    request.provider === ACTOR &&
    /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(request.settledAward ?? "")
  );
}
