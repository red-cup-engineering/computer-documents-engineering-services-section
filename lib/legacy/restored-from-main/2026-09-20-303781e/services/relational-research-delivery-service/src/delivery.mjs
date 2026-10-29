import { join, resolve } from "node:path";
import { ACTOR, NODE_ROOT, contentId } from "./desk.mjs";
import { queryResearchRecords } from "./record-journal.mjs";

export const CUSTOMER = "urn:ame:youtube-channel-enterprise";
export const PACKET_CATEGORY = "relational-research.packet-admission";
export const REQUIRED_USES = Object.freeze([
  "notebooklm-transformation",
  "public-youtube-release",
]);
const RECORD = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
function exact(value) {
  if (!value || typeof value !== "object") return false;
  const { id, ...body } = value;
  return id === contentId(body);
}
function refusal(request, code) {
  const body = {
    type: "RelationalResearchProductDeliveryRefusal",
    provider: ACTOR,
    customer: request?.customer ?? null,
    request: request?.id ?? null,
    packet: request?.packet ?? null,
    disposition: "refused",
    code,
    externalEffects: [],
  };
  return { id: contentId(body), ...body };
}
function packetRows(dataRoot) {
  return queryResearchRecords(PACKET_CATEGORY, { dataRoot });
}

export function deliverResearchProduct(request, options = {}) {
  if (
    !exact(request) ||
    request.type !== "RelationalResearchProductDeliveryRequest" ||
    request.provider !== ACTOR ||
    request.customer !== CUSTOMER ||
    !RECORD.test(request.packet ?? "") ||
    JSON.stringify(request.uses) !== JSON.stringify(REQUIRED_USES)
  )
    return refusal(request, "invalid-research-product-request");
  const records = packetRows(
    resolve(options.dataRoot ?? join(NODE_ROOT, "data")),
  ).filter((row) => row.id === request.packet);
  const matches = records;
  if (
    matches.length > 1 &&
    new Set(
      matches.map((row) =>
        contentId(
          Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== "id"),
          ),
        ),
      ),
    ).size > 1
  )
    return refusal(request, "research-packet-ledger-conflict");
  if (matches.length === 0)
    return refusal(request, "research-packet-not-admitted");
  const packet = matches[0],
    grant = packet?.reuseGrant;
  if (
    !exact(packet) ||
    packet.type !== "RelationalResearchPacketAdmission" ||
    packet.provider !== ACTOR ||
    packet.buyer !== CUSTOMER ||
    !exact(grant) ||
    grant.type !== "ReuseGrant" ||
    !grant.permittedBuyers?.includes(CUSTOMER) ||
    !REQUIRED_USES.every((use) => grant.permittedUses?.includes(use)) ||
    grant.researchProductionPaidOnce !== true ||
    grant.noFindingControl !== true
  )
    return refusal(request, "research-packet-not-deliverable");
  const deliveryBody = {
    type: "Accept",
    actor: ACTOR,
    target: CUSTOMER,
    inReplyTo: request.id,
    object: packet,
  };
  const delivery = { id: contentId(deliveryBody), ...deliveryBody };
  const body = {
    type: "RelationalResearchProductDeliveryResult",
    provider: ACTOR,
    customer: CUSTOMER,
    request: request.id,
    packet: packet.id,
    uses: [...REQUIRED_USES],
    disposition: "delivered",
    delivery,
    externalEffects: [],
  };
  return { id: contentId(body), ...body };
}
