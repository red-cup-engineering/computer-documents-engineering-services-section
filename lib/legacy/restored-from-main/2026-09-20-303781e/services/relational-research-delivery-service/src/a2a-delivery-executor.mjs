#!/usr/bin/env node
import { resolve } from "node:path";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import {
  agentRmnMessage,
  extractRmnPart,
  parseA2aMessage,
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
import { deliverResearchProduct } from "./delivery.mjs";

export function executeDeliveryMessage(message, options = {}) {
  const parsed = parseA2aMessage(message),
    part = extractRmnPart(parsed.parts),
    term = decodeSemantic(part.bytes);
  if (
    !semanticBytes(term).equals(part.bytes) ||
    term?.[0] !== "relational-research-product-delivery-request" ||
    term.length !== 2
  )
    throw new TypeError("foreign research delivery operation");
  return agentRmnMessage(
    semanticBytes([
      "relational-research-product-delivery-result",
      deliverResearchProduct(term[1], options),
    ]),
    "relational-research-product-delivery-result.rmn.cbor",
  );
}
async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  process.stdout.write(
    `${JSON.stringify(executeDeliveryMessage(JSON.parse(input), { dataRoot: process.env.RELATIONAL_RESEARCH_DATA_ROOT }))}\n`,
  );
}
await runMain(main, {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) =>
    Boolean(entry) && resolve(entry) === resolve(new URL(url).pathname),
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
