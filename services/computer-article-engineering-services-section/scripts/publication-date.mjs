import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/u;

export function publicationDateReadout(candidates) {
  const observed = candidates
    .map((candidate) => Object.freeze({ source: candidate.source, value: candidate.value?.trim() }))
    .filter((candidate) => candidate.value !== undefined && candidate.value !== "");
  if (observed.length === 0) return readout("unknown", undefined, ["publication-date:absent"]);

  const valid = observed.filter((candidate) => DATE_LIKE.test(candidate.value));
  const invalid = observed.filter((candidate) => !DATE_LIKE.test(candidate.value));
  const distinctValid = [...new Set(valid.map((candidate) => candidate.value))];

  if (valid.length === 0) {
    return readout("denied", undefined, invalid.map((candidate) => `${candidate.source}:invalid:${candidate.value}`));
  }
  if (invalid.length > 0 || distinctValid.length > 1) {
    return readout("contested", undefined, [
      ...valid.map((candidate) => `${candidate.source}:date:${candidate.value}`),
      ...invalid.map((candidate) => `${candidate.source}:invalid:${candidate.value}`),
    ]);
  }
  return readout("held", distinctValid[0], valid.map((candidate) => `${candidate.source}:date:${candidate.value}`));
}

/** A publication-date readout: its reading (named in the extremal family where it is decided) as a
 *  knowledge-family point, the date when one holds, and the evidence strings. */
function readout(reading, date, evidence) {
  return Object.freeze({
    kind: "metroplat.web.publication-date.readout",
    reading: readingAs("knowledge", reading),
    ...(date === undefined ? {} : { date }),
    evidence: Object.freeze([...evidence]),
  });
}
