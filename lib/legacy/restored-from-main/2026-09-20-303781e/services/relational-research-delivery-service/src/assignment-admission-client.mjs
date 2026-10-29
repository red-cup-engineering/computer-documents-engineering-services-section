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
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u,
  RECORD = NI;
function exact(value) {
  if (!value || typeof value !== "object") return false;
  const { id, ...body } = value;
  return id === contentId(body);
}
export function loadAssignmentAdmissionBinding(
  path = new URL(
    "../content/config/assignment-admission-provider.json",
    import.meta.url,
  ),
) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (
    value.type !== "ResearchAssignmentAdmissionProviderBinding" ||
    value.status !== "active" ||
    value.customer !== ACTOR ||
    value.provider !== MARKET ||
    !NI.test(value.agentCardIdentity ?? "")
  )
    throw new TypeError("assignment-admission provider binding is not active");
  return value;
}
export function createAssignmentAdmissionClient({
  binding = loadAssignmentAdmissionBinding(),
  send = sendRmnTask,
  cardEvidence = agentCardSignatureEvidence,
  timeoutMs = 120000,
} = {}) {
  const authenticated = new WeakSet();
  return {
    async request(assignmentAdmission) {
      if (!RECORD.test(assignmentAdmission ?? ""))
        throw new TypeError(
          "assignment-admission request requires an exact identity",
        );
      const body = {
          type: "ResearchAssignmentAdmissionDeliveryRequest",
          customer: ACTOR,
          provider: MARKET,
          assignmentAdmission,
          purpose: "research-supply-offer-formation",
        },
        request = { id: contentId(body), ...body };
      const exchange = await send({
        agentUrl: binding.agentUrl,
        message: userRmnMessage(
          semanticBytes([
            "research-assignment-admission-delivery-request",
            request,
          ]),
          "research-assignment-admission-delivery-request.rmn.cbor",
          randomUUID(),
        ),
        requireSignature: true,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (cardEvidence(exchange.agentCard).card !== binding.agentCardIdentity)
        throw new TypeError("assignment-admission Agent Card changed");
      const term = decodeSemantic(
          extractRmnPart(a2aResultParts(exchange.result)).bytes,
        ),
        result =
          term?.[0] === "research-assignment-admission-delivery-result"
            ? term[1]
            : null;
      if (!exact(result) || result.assignmentAdmission !== assignmentAdmission)
        throw new TypeError(
          "assignment-admission result does not bind the request",
        );
      if (result.disposition === "refused")
        throw Object.assign(
          new Error(`assignment admission refused: ${result.code}`),
          { code: result.code },
        );
      if (
        result.disposition !== "delivered" ||
        !exact(result.delivery) ||
        result.delivery.object?.id !== assignmentAdmission
      )
        throw new TypeError("assignment-admission delivery is not exact");
      authenticated.add(result.delivery);
      return result.delivery;
    },
    verify(delivery) {
      return authenticated.has(delivery);
    },
  };
}
