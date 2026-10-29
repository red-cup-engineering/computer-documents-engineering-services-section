import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DurableA2aTaskStore } from "@red-cup-engineering/a2a-contracted-agent-service/durable-task-store";
import { DurablePushNotificationStore } from "@red-cup-engineering/a2a-contracted-agent-service/durable-push-notifications";
import { createFilesystemContractedAgentSources } from "@red-cup-engineering/a2a-contracted-agent-service/filesystem-state-sources";
import {
  a2aResultParts,
  sendRmnTask,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-agent-card-key-service/testing";
import {
  extractRmnPart,
  userRmnMessage,
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
  CUSTOMER,
  PACKET_CATEGORY,
  REQUIRED_USES,
  deliverResearchProduct,
} from "../src/delivery.mjs";
import { recordResearchRecord } from "../src/record-journal.mjs";

const NOW = "2096-07-21T12:00:00.000Z",
  SETTLEMENT = "eip155:31337:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
function memoryCustodySource() {
  const rows = new Map();
  const key = (coordinate) =>
    JSON.stringify([
      coordinate.namespace ?? "task",
      coordinate.tenant ?? "",
      coordinate.key ?? coordinate.taskId,
    ]);
  return {
    async get(coordinate) {
      return rows.get(key(coordinate)) ?? null;
    },
    async put(record) {
      rows.set(key(record), structuredClone(record));
    },
    async remove(coordinate) {
      rows.delete(key(coordinate));
    },
    async list(filter = {}) {
      return [...rows.values()]
        .filter(
          (record) =>
            (filter.namespace === undefined ||
              record.namespace === filter.namespace) &&
            (filter.tenant === undefined || record.tenant === filter.tenant),
        )
        .map((record) => structuredClone(record));
    },
  };
}
function exact(body) {
  return { id: contentId(body), ...body };
}
function packet() {
  const grant = exact({
    type: "ReuseGrant",
    permittedBuyers: [CUSTOMER],
    permittedUses: [...REQUIRED_USES, "koios-editorial-reuse"],
    researchProductionPaidOnce: true,
    separateLaterCosts: ["notebooklm-transformation"],
    correctionNotifications: true,
    noFindingControl: true,
  });
  return exact({
    type: "RelationalResearchPacketAdmission",
    provider: ACTOR,
    settledAward: "urn:award",
    buyer: CUSTOMER,
    question: "How do institutions reproduce outcomes?",
    citations: [
      {
        id: "s1",
        url: "https://example.org/a",
        title: "A",
        publisher: "P",
        rights: "licensed",
        retrievedAt: NOW,
      },
      {
        id: "s2",
        url: "https://example.org/b",
        title: "B",
        publisher: "Q",
        rights: "public-domain",
        retrievedAt: NOW,
      },
    ],
    claims: [
      {
        statement: "Institutions reproduce outcomes.",
        warrants: ["s1", "s2"],
        uncertainty: "Varies.",
      },
    ],
    method: "Comparison.",
    limitations: ["Bounded."],
    correctionIdentity: "urn:correction:1",
    reuseGrant: grant,
    editorialAuthority: "withheld",
    transformationAuthority: "withheld",
    distributionAuthority: "withheld",
    admittedAt: NOW,
  });
}
function request(packetId) {
  return exact({
    type: "RelationalResearchProductDeliveryRequest",
    customer: CUSTOMER,
    provider: ACTOR,
    packet: packetId,
    uses: [...REQUIRED_USES],
  });
}
async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "research-delivery-")),
    value = packet(),
    dataRoot = join(root, "data");
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  recordResearchRecord({
    dataRoot,
    settlement: SETTLEMENT,
    actor: ACTOR,
    category: PACKET_CATEGORY,
    recordedAt: NOW,
    record: { ...value },
  });
  return { root, dataRoot, value };
}
async function freePort() {
  const server = createServer();
  await new Promise((accept) => server.listen(0, "127.0.0.1", accept));
  const port = server.address().port;
  await new Promise((accept) => server.close(accept));
  return port;
}

test("deployed delivery configuration exposes only the signed public identity", async () => {
  const { readFile } = await import("node:fs/promises"),
    activation = JSON.parse(
      await readFile(
        new URL("../content/config/delivery-agent.json", import.meta.url),
        "utf8",
      ),
    ),
    jwks = JSON.parse(
      await readFile(
        new URL(
          "../content/agent-cards/research-product-delivery-jwks.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
    unit = await readFile(
      new URL(
        "../content/deployment/systemd-user/emsweb-relational-research-delivery-a2a.service",
        import.meta.url,
      ),
      "utf8",
    );
  assert.equal(activation.status, "active");
  assert.equal(
    activation.agentCardIdentity,
    "ni:///sha-256;AqY2QP5gMozYa96lJiJ9e6R01wKg0q2u8Od5U9p3ccY",
  );
  assert.equal(jwks.keys[0].d, undefined);
  assert.equal(jwks.keys[0].kid, activation.signingKid);
  assert.match(unit, /^InaccessiblePaths=.*youtube-channel-enterprise$/mu);
  assert.match(
    unit,
    /^ReadWritePaths=.*relational-orientation-research-desk\/data\/a2a\/tasks$/mu,
  );
});
test("one exact admitted packet is deterministically delivered only to its buyer", async (t) => {
  const { dataRoot, value } = await fixture(t),
    demand = request(value.id),
    first = deliverResearchProduct(demand, { dataRoot }),
    replay = deliverResearchProduct(demand, { dataRoot });
  assert.deepEqual(replay, first);
  assert.equal(first.disposition, "delivered");
  assert.equal(first.delivery.actor, ACTOR);
  assert.equal(first.delivery.target, CUSTOMER);
  assert.deepEqual(first.delivery.object, value);
  assert.deepEqual(first.externalEffects, []);
  const unknown = deliverResearchProduct(
    request(`ni:///sha-256;${"A".repeat(43)}`),
    { dataRoot },
  );
  assert.equal(unknown.code, "research-packet-not-admitted");
  assert.deepEqual(unknown.externalEffects, []);
});
test("foreign customer, widened use, and ambient discovery are refused", async (t) => {
  const { dataRoot, value } = await fixture(t);
  const foreign = exact({
    ...Object.fromEntries(
      Object.entries(request(value.id)).filter(([key]) => key !== "id"),
    ),
    customer: "urn:ame:foreign",
  });
  assert.equal(
    deliverResearchProduct(foreign, { dataRoot }).code,
    "invalid-research-product-request",
  );
  const wide = exact({
    ...Object.fromEntries(
      Object.entries(request(value.id)).filter(([key]) => key !== "id"),
    ),
    uses: [...REQUIRED_USES, "ambient-feed"],
  });
  assert.equal(
    deliverResearchProduct(wide, { dataRoot }).code,
    "invalid-research-product-request",
  );
  assert.equal(
    deliverResearchProduct({ type: "ListPackets" }, { dataRoot }).code,
    "invalid-research-product-request",
  );
});
test("the signed A2A face binds the canonical request and exact packet", async (t) => {
  const { dataRoot, value } = await fixture(t),
    port = await freePort(),
    baseUrl = `http://127.0.0.1:${port}`,
    root = resolve(new URL("..", import.meta.url).pathname),
    prior = process.env.RELATIONAL_RESEARCH_DATA_ROOT;
  process.env.RELATIONAL_RESEARCH_DATA_ROOT = dataRoot;
  const running = await serveContractedAgent({
    port,
    host: "127.0.0.1",
    baseUrl,
    agentCard: join(root, "content/agent-cards/research-product-delivery.json"),
    executor: process.execPath,
    executorArgs: [join(root, "src/a2a-delivery-executor.mjs")],
    taskSource: memoryCustodySource(),
    coordinationSource: memoryCustodySource(),
    timeoutMs: 10000,
    ...ephemeralAgentCardSigning(baseUrl, "research-delivery"),
  });
  t.after(async () => {
    await new Promise((accept) => running.server.close(accept));
    if (prior === undefined) delete process.env.RELATIONAL_RESEARCH_DATA_ROOT;
    else process.env.RELATIONAL_RESEARCH_DATA_ROOT = prior;
  });
  const demand = request(value.id),
    message = userRmnMessage(
      semanticBytes(["relational-research-product-delivery-request", demand]),
      "research-request.rmn.cbor",
    ),
    exchange = await sendRmnTask({
      agentUrl: `${baseUrl}/.well-known/agent-card.json`,
      message,
      requireSignature: true,
      signal: AbortSignal.timeout(10000),
    }),
    term = decodeSemantic(
      extractRmnPart(a2aResultParts(exchange.result)).bytes,
    );
  assert.equal(term[0], "relational-research-product-delivery-result");
  assert.equal(term[1].request, demand.id);
  assert.equal(term[1].delivery.object.id, value.id);
  assert.equal(exchange.agentCard.signatures.length, 1);
});
test("production A2A membrane satisfies the durable 2.1 task and coordination contracts", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "relational-a2a-membrane-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const membrane = createFilesystemContractedAgentSources({ stateRoot: join(root, "a2a-state"), provider: "research-delivery" }), tasks = new DurableA2aTaskStore(membrane.taskSource), pushes = new DurablePushNotificationStore(membrane.coordinationSource);
  const task = { id: "task-1", contextId: "context-1", status: { state: "TASK_STATE_WORKING", timestamp: NOW }, artifacts: [], history: [], metadata: {} };
  await tasks.save(task); assert.equal((await tasks.load(task.id)).id, task.id);
  await pushes.save(task.id, {}, { id: "push-1", url: "https://customer.example/callback" }); assert.equal((await pushes.load(task.id, {}))[0].id, "push-1");
});
