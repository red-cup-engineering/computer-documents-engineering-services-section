import { resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

const OBJECT_KIND = "emsweb.relational-orientation-research.record";

function journal(dataRoot) {
  if (typeof dataRoot !== "string" || dataRoot.length === 0)
    throw new TypeError(
      "relational research desk journal requires its data root",
    );
  return createSemanticRecordJournal({
    root: resolve(dataRoot, "journal"),
    objectKind: OBJECT_KIND,
  });
}

export function recordResearchRecord({
  dataRoot,
  actor,
  settlement,
  category,
  recordedAt,
  record,
}) {
  return journal(dataRoot).record({
    category,
    recordedAt,
    record,
    charge: { support: true, refutation: false },
    relation:
      settlement === undefined
        ? undefined
        : {
            subject: actor,
            predicate: "urn:emsenn:witness-journal:settlement-account",
            object: settlement,
          },
  });
}

export function queryResearchRecords(category, { dataRoot } = {}) {
  return journal(dataRoot)
    .query({ category })
    .map((entry) => entry.record);
}
