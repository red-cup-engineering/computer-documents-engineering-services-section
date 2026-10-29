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
import {
  formSupplyOffer,
  produceResearchPacket,
  researchProductionResult,
  supplyOfferResult,
  validateProductionRequest,
  validateSupplyRequest,
} from "./live-research.mjs";
async function execute(message, options = {}) {
  const part = extractRmnPart(parseA2aMessage(message).parts),
    term = decodeSemantic(part.bytes);
  if (!semanticBytes(term).equals(part.bytes) || term.length !== 2)
    throw new TypeError("foreign relational research operation");
  if (
    term[0] === "relational-research-supply-offer-request" &&
    validateSupplyRequest(term[1])
  )
    return agentRmnMessage(
      semanticBytes([
        "relational-research-supply-offer-result",
        supplyOfferResult(
          term[1],
          await formSupplyOffer(term[1].assignmentAdmission, options),
        ),
      ]),
      "relational-research-supply-offer-result.rmn.cbor",
    );
  if (
    term[0] === "relational-research-production-request" &&
    validateProductionRequest(term[1])
  )
    return agentRmnMessage(
      semanticBytes([
        "relational-research-production-result",
        researchProductionResult(
          term[1],
          await produceResearchPacket(term[1].settledAward, options),
        ),
      ]),
      "relational-research-production-result.rmn.cbor",
    );
  throw new TypeError("foreign relational research operation");
}
async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const account =
    JSON.parse(process.env.RELATIONAL_RESEARCH_SETTLEMENT_ACCOUNT_JSON ?? "{}")
      ?.caip10 ?? process.env.RELATIONAL_RESEARCH_SETTLEMENT_ACCOUNT;
  process.stdout.write(
    `${JSON.stringify(await execute(JSON.parse(input), { dataRoot: process.env.RELATIONAL_RESEARCH_DATA_ROOT, settlement: account }))}\n`,
  );
}
export { execute as executeLiveResearchMessage };
await runMain(main, {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) =>
    Boolean(entry) && resolve(entry) === resolve(new URL(url).pathname),
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
