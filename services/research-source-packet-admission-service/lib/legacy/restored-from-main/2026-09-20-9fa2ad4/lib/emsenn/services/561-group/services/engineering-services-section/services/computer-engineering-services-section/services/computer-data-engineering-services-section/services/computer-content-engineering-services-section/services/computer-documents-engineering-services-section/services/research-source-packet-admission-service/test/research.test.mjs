import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { journalRecords } from "../src/journal.mjs";
import { admitSourcePacket, deliverSourcePacket, firstPacketDraft, sourcePacketDraft, validateSourcePacketDraft } from "../src/research.mjs";
test("the first packet binds primary sources, explicit limits, reuse, and same-body cost allocation", () => { const packet = firstPacketDraft(); assert.equal(packet.citations.length, 3); assert.ok(packet.citations.every((row) => row.kind.startsWith("primary-"))); assert.deepEqual(packet.reuseGrant, ["notebooklm-transformation", "mathematics-curriculum", "public-youtube-release"]); assert.equal(packet.internalTransfer.cashSettlementRequired, false); assert.ok(packet.limitations.some((row) => row.includes("every poset"))); });
test("the generalized gate accepts an exact later lesson packet", () => {
  const packet = sourcePacketDraft({ courseId: "causality-and-kinematic-space", lessonId: "lorentzian-geometry" });
  assert.equal(validateSourcePacketDraft(packet), true);
  assert.equal(packet.lessonId, "lorentzian-geometry");
  assert.ok(packet.carrier.path.endsWith("lorentzian-geometry.md"));
});
test("every course lesson has a content-valid source packet draft", () => {
  for (const lessonId of ["order-before-distance", "lorentzian-geometry", "intervals-to-points", "space-of-regions", "information-and-entropy", "constructions-and-failures"]) {
    const packet = sourcePacketDraft({ courseId: "causality-and-kinematic-space", lessonId });
    assert.equal(validateSourcePacketDraft(packet), true); assert.equal(packet.lessonId, lessonId);
  }
});
test("the generalized gate refuses a carrier outside the research packet membrane", () => {
  const packet = structuredClone(firstPacketDraft()); packet.carrier.path = "package.json";
  assert.throws(() => validateSourcePacketDraft(packet), /escapes the research settlement/u);
});

test("source admission is replay-safe and recorded at the supplied data root", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "math-research-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const admitted = await admitSourcePacket(firstPacketDraft(), { dataRoot: root, at: "2096-07-21T12:00:00.000Z" });
  const replay = await admitSourcePacket(firstPacketDraft(), { dataRoot: root, at: "2096-07-22T12:00:00.000Z" });
  const delivery = deliverSourcePacket(admitted);
  assert.equal(replay.id, admitted.id);
  assert.equal(delivery.object.id, admitted.id);
  assert.deepEqual(journalRecords(root, "mathematics-research.source-packet-admission"), [admitted]);
});
