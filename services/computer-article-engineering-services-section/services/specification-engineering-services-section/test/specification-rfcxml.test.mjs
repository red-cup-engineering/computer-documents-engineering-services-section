import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSpecificationRecord } from "../src/specification.mjs";
import { renderSpecificationRfcXml } from "../src/specification-rfcxml.mjs";

function record(overrides = {}) {
  return {
    identity: { id: "example-protocol", title: "Example Protocol", seat: "example", carrier: "lib/example.md", "date-created": "2026-09-27", authors: ["emsenn"], version: "0.1.0", stability: "draft", status: "draft" },
    whatThisIs: "The example protocol moves one message.",
    topics: [
      { heading: "Messages", body: "A message is small.\n\n{{clause:bounded}}\n\n### Encoding\n\nIt uses {{standard:json}}.", clauses: [{ id: "bounded", keyword: "MUST", actor: "A sender", statement: "send at most 256 KiB", backedBy: ["sen-activity.mjs"] }] },
      { heading: "Security Considerations", body: "Messages are signed.", clauses: [] },
      { heading: "IANA Considerations", body: "This document has no IANA actions.", clauses: [] },
    ],
    implementations: [{ context: "House code", body: "`sen-activity.mjs` enforces it." }],
    openQuestions: [{ question: "Whether to allow batches.", blockedBy: "a measured need." }],
    laws: [],
    standards: [{ id: "json", authority: "IETF", revision: "RFC 8259", locator: "https://www.rfc-editor.org/rfc/rfc8259", applicability: "encoding", statement: "JSON text" }],
    rfc: {
      docName: "draft-example-protocol-00", category: "info", submissionType: "independent", ipr: "trust200902",
      abstract: "This document specifies an example protocol.",
      authors: [{ fullname: "Example Author", initials: "E.", surname: "Author", organization: "561 Group", email: "author@example.org" }],
      references: { normative: [{ anchor: "RFC8259", standard: "json", title: "The JavaScript Object Notation (JSON) Data Interchange Format", target: "https://www.rfc-editor.org/info/rfc8259", authors: [{ fullname: "T. Bray" }], date: { year: "2017", month: "December" }, seriesInfo: [{ name: "RFC", value: "8259" }] }], informative: [] },
    },
    provenance: { derivedFrom: ["test"], derivedAt: "2026-09-27T00:00:00Z", derivedBy: "test" },
    ...overrides,
  };
}

test("the rfc block validates against the house schema", () => {
  const { valid, issues } = validateSpecificationRecord(record());
  assert.equal(valid, true, JSON.stringify(issues));
});

test("renders an RFCXML v3 Internet-Draft with BCP 14 clauses, xrefs and required sections", () => {
  const xml = renderSpecificationRfcXml(record());
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/u);
  assert.match(xml, /<rfc [^>]*docName="draft-example-protocol-00"[^>]*version="3"/u);
  assert.match(xml, /<seriesInfo name="Internet-Draft" value="draft-example-protocol-00"\/>/u);
  assert.match(xml, /<t anchor="bounded">A sender <bcp14>MUST<\/bcp14> send at most 256 KiB\.<\/t>/u);
  assert.match(xml, /JSON text <xref target="RFC8259"\/>/u);
  assert.match(xml, /<section anchor="messages-encoding"><name>Encoding<\/name>/u);
  assert.match(xml, /<reference anchor="RFC2119"/u);
  assert.match(xml, /<reference anchor="RFC8174"/u);
  assert.match(xml, /<section anchor="implementation-status">/u);
  assert.match(xml, /<reference anchor="RFC7942"/u);
  assert.match(xml, /<tt>sen-activity\.mjs<\/tt>/u);
  assert.match(xml, /<section anchor="open-issues">/u);
  assert.ok(xml.indexOf("security-considerations") > xml.indexOf("implementation-status"), "Security Considerations closes the middle");
});

test("refuses a draft without Security Considerations", () => {
  const base = record();
  assert.throws(() => renderSpecificationRfcXml({ ...base, topics: base.topics.filter((topic) => topic.heading !== "Security Considerations") }), /Security Considerations/u);
});

test("refuses a defined clause that no body places", () => {
  const base = record();
  const topics = base.topics.map((topic) => topic.heading === "Messages" ? { ...topic, body: "A message is small." } : topic);
  assert.throws(() => renderSpecificationRfcXml({ ...base, topics, standards: [] , rfc: { ...base.rfc, references: { normative: [], informative: [] } } }), /clause "bounded"/u);
});
