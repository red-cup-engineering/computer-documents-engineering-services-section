import { resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

export const JOURNAL_OBJECT_KIND = "mathematics-research.journal-record";
const categoryCoordinate = (category) => `record:${category}`;
const journal = (dataRoot) => createSemanticRecordJournal({ root: resolve(dataRoot), objectKind: JOURNAL_OBJECT_KIND });

export function recordJournal(dataRoot, category, recordedAt, record) {
  return journal(dataRoot).record({
    category: categoryCoordinate(category), record, recordedAt,
    charge: { support: true, refutation: false },
  });
}

export function journalRecords(dataRoot, category) {
  return journal(dataRoot).query({ category: categoryCoordinate(category) }).map(({ record }) => record);
}
