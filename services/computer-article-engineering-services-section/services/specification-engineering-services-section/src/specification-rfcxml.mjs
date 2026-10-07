/**
 * The Internet-Draft rendering of a prose Specification record: RFCXML
 * version 3 (RFC 7991), the vocabulary the IETF submission tool accepts
 * directly. It is a second projection of the same record the house Markdown
 * carrier renders (`renderSpecificationMarkdown`), and it reads topic bodies
 * through the same Markdown block and inline projections the HTML renderer
 * uses.
 *
 * What the house format and an RFC disagree on is settled toward the venue:
 * - `What this is` becomes the Introduction; `Implementations` becomes the
 *   Implementation Status section RFC 7942 defines for drafts; `Open
 *   questions` becomes an Open Issues appendix.
 * - A clause renders as the sentence "<actor> <bcp14>KEYWORD</bcp14>
 *   <statement>." Its house backing and test are traceability for the
 *   Group, not text for the IETF, so they stay in the record; a clause alone
 *   in its paragraph gives that paragraph the clause id as its anchor.
 * - BCP 14 boilerplate is the exact RFC 8174 text, and RFC 2119 and RFC 8174
 *   join the normative references whenever a clause exists.
 * - Security Considerations and IANA Considerations are required sections
 *   (RFC 7322, RFC 8126): a record without topics so headed is refused.
 */
import { comment, document, element, text } from "@red-cup-engineering/xml-document-rendering-service/core";
import { projectMarkdownBlocks } from "@red-cup-engineering/markdown-engineering-services-section/project-markdown-blocks";
import { projectMarkdownInline } from "@red-cup-engineering/markdown-engineering-services-section/project-markdown-inline";

const PLACEHOLDER = /\{\{(clause|law|standard):([a-z0-9-]+)\}\}/gu;
const SENTINEL = /(clause|law|standard):([a-z0-9-]+)/gu;
const REQUIRED_TOPICS = Object.freeze(["Security Considerations", "IANA Considerations"]);
const MONTHS = Object.freeze(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);

const BCP14_REFERENCES = Object.freeze([
  Object.freeze({
    anchor: "RFC2119",
    title: "Key words for use in RFCs to Indicate Requirement Levels",
    target: "https://www.rfc-editor.org/info/rfc2119",
    authors: [{ fullname: "S. Bradner", initials: "S.", surname: "Bradner" }],
    date: { year: "1997", month: "March" },
    seriesInfo: [{ name: "BCP", value: "14" }, { name: "RFC", value: "2119" }, { name: "DOI", value: "10.17487/RFC2119" }],
  }),
  Object.freeze({
    anchor: "RFC8174",
    title: "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words",
    target: "https://www.rfc-editor.org/info/rfc8174",
    authors: [{ fullname: "B. Leiba", initials: "B.", surname: "Leiba" }],
    date: { year: "2017", month: "May" },
    seriesInfo: [{ name: "BCP", value: "14" }, { name: "RFC", value: "8174" }, { name: "DOI", value: "10.17487/RFC8174" }],
  }),
]);

function anchorOf(heading) {
  const slug = heading.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  return /^[a-z]/u.test(slug) ? slug : `section-${slug}`;
}

/** RFCXML inline markup for the element names `projectMarkdownInline` emits. */
function rfcInlineElement(name, attributes, children = []) {
  if (name === "a") return element("eref", { target: attributes.href }, children);
  if (name === "code") return element("tt", {}, children);
  if (name === "em" || name === "strong") return element(name, {}, children);
  if (name === "img") return text(attributes.alt ?? "");
  return { kind: "fragment", children };
}

function flatten(nodes) {
  return nodes.flatMap((node) => {
    if (node.kind === "fragment") return flatten(node.children);
    if (node.kind === "element") return [{ ...node, children: flatten(node.children) }];
    return [node];
  });
}

function clauseNodes(clause) {
  const statement = /[.!?]$/u.test(clause.statement) ? clause.statement : `${clause.statement}.`;
  return [text(`${clause.actor} `), element("bcp14", {}, [clause.keyword]), text(` ${statement}`)];
}

function lawOrStandardNodes(entry, referencesByStandard) {
  const reference = referencesByStandard.get(entry.id);
  if (reference !== undefined) return [text(`${entry.statement} `), element("xref", { target: reference.anchor })];
  const locator = /^https?:\/\//u.test(entry.locator) ? element("eref", { target: entry.locator }) : text(entry.locator);
  return [text(`${entry.statement} (${entry.authority} ${entry.revision}, `), locator, text(")")];
}

function expandSentinels(nodes, context) {
  return nodes.flatMap((node) => {
    if (node.kind === "element") return [{ ...node, children: expandSentinels(node.children, context) }];
    if (node.kind !== "text" || !node.value.includes("")) return [node];
    const out = [];
    let cursor = 0;
    for (const match of node.value.matchAll(SENTINEL)) {
      if (match.index > cursor) out.push(text(node.value.slice(cursor, match.index)));
      const [, kind, id] = match;
      const entry = context[kind].get(id);
      if (entry === undefined) throw new TypeError(`specification: body references undefined ${kind} "${id}"`);
      context.seen[kind].add(id);
      out.push(...(kind === "clause" ? clauseNodes(entry) : lawOrStandardNodes(entry, context.referencesByStandard)));
      cursor = match.index + match[0].length;
    }
    if (cursor < node.value.length) out.push(text(node.value.slice(cursor)));
    return out;
  });
}

function inline(markdown, context) {
  const nodes = projectMarkdownInline(markdown, { text, element: rfcInlineElement });
  return expandSentinels(flatten([...nodes]), context);
}

function soleClauseAnchor(markdown) {
  const match = /^clause:([a-z0-9-]+)$/u.exec(markdown.trim());
  return match === null ? undefined : match[1];
}

function blockNodes(blocks, context) {
  return blocks.flatMap((block) => {
    switch (block.kind) {
      case "paragraph":
        return [element("t", { anchor: soleClauseAnchor(block.text) }, inline(block.text, context))];
      case "list":
        return [element(block.ordered ? "ol" : "ul", block.start === null ? {} : { start: String(Number(block.start)) }, block.items.map((item) => element("li", {}, blockNodes(item.blocks, context))))];
      case "code":
        return [element("sourcecode", block.info === null ? {} : { type: block.info }, [block.code])];
      case "table":
        return [element("table", {}, [
          element("thead", {}, [element("tr", {}, block.headers.map((cell) => element("th", {}, inline(cell, context))))]),
          element("tbody", {}, block.rows.map((row) => element("tr", {}, row.map((cell) => element("td", {}, inline(cell, context)))))),
        ])];
      case "quote":
        return [element("blockquote", {}, blockNodes(block.blocks, context))];
      case "callout":
        return [element("aside", {}, [element("t", {}, [element("strong", {}, inline(block.title ?? block.type, context))]), ...blockNodes(block.blocks, context)])];
      case "rule":
        return [];
      default:
        throw new TypeError(`specification: no RFCXML rendering for Markdown block kind ${block.kind}`);
    }
  });
}

/** Nest a body's blocks under its own headings, as RFCXML subsections. */
function sectionNodes(blocks, context, anchorPrefix) {
  const out = [];
  let index = 0;
  while (index < blocks.length && blocks[index].kind !== "heading") out.push(...blockNodes([blocks[index++]], context));
  while (index < blocks.length) {
    const heading = blocks[index++];
    const inner = [];
    while (index < blocks.length && !(blocks[index].kind === "heading" && blocks[index].level <= heading.level)) inner.push(blocks[index++]);
    const anchor = `${anchorPrefix}-${anchorOf(heading.text)}`;
    out.push(element("section", { anchor }, [element("name", {}, inline(heading.text, context)), ...sectionNodes(inner, context, anchor)]));
  }
  return out;
}

function markdownWithSentinels(markdown) {
  return markdown.replace(PLACEHOLDER, (_, kind, id) => `${kind}:${id}`);
}

function section(heading, anchor, markdown, context) {
  const blocks = projectMarkdownBlocks(markdownWithSentinels(markdown));
  return element("section", { anchor }, [element("name", {}, [heading]), ...sectionNodes(blocks, context, anchor)]);
}

function authorNode(author) {
  const address = author.email === undefined && author.uri === undefined ? null : element("address", {}, [
    author.email === undefined ? null : element("email", {}, [author.email]),
    author.uri === undefined ? null : element("uri", {}, [author.uri]),
  ]);
  return element("author", { fullname: author.fullname, initials: author.initials, surname: author.surname }, [
    author.organization === undefined ? null : element("organization", {}, [author.organization]),
    address,
  ]);
}

function referenceNode(reference) {
  const date = reference.date ?? {};
  return element("reference", { anchor: reference.anchor, target: reference.target }, [
    element("front", {}, [
      element("title", {}, [reference.title]),
      ...reference.authors.map(authorNode),
      element("date", { year: date.year, month: date.month, day: date.day }),
    ]),
    ...(reference.seriesInfo ?? []).map((info) => element("seriesInfo", { name: info.name, value: info.value })),
  ]);
}

function draftDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return element("date", { year, month: MONTHS[Number(month) - 1], day: String(Number(day)) });
}

function requireEveryEntryReferenced(kind, byId, seen) {
  for (const id of byId.keys()) {
    if (!seen.has(id)) throw new TypeError(`specification: ${kind} "${id}" is defined but never referenced inline by a {{${kind}:${id}}} placeholder`);
  }
}

/**
 * Render a validated prose Specification record that carries an `rfc` block
 * as an RFCXML v3 Internet-Draft.
 * @param {object} record a Specification record validated against the house schema
 * @returns {string} the RFCXML document, with an XML declaration and a trailing newline
 * @throws {TypeError} when the record has no `rfc` block, is not the prose profile, lacks a
 *   Security Considerations or IANA Considerations topic, needs an `rfc.abbrev` for a title over
 *   40 characters, references an undefined clause/law/standard, or defines one it never places
 */
export function renderSpecificationRfcXml(record) {
  const profile = record.identity.profile ?? "prose";
  if (profile !== "prose") throw new TypeError(`specification: renderSpecificationRfcXml only renders the "prose" profile, got "${profile}"`);
  const rfc = record.rfc;
  if (rfc === undefined) throw new TypeError("specification: an RFCXML rendering needs the record's rfc block (docName, category, submissionType, ipr, abstract, authors, references)");
  for (const heading of REQUIRED_TOPICS) {
    if (!record.topics.some((topic) => topic.heading === heading)) throw new TypeError(`specification: an Internet-Draft needs a "${heading}" topic`);
  }
  if (record.identity.title.length > 40 && rfc.abbrev === undefined) throw new TypeError("specification: a title over 40 characters needs rfc.abbrev for the running header");

  const clauses = new Map(record.topics.flatMap((topic) => topic.clauses.map((clause) => [clause.id, clause])));
  const allReferences = [...rfc.references.normative, ...rfc.references.informative];
  const context = {
    clause: clauses,
    law: new Map(record.laws.map((law) => [law.id, law])),
    standard: new Map(record.standards.map((standard) => [standard.id, standard])),
    referencesByStandard: new Map(allReferences.filter((reference) => reference.standard !== undefined).map((reference) => [reference.standard, reference])),
    seen: { clause: new Set(), law: new Set(), standard: new Set() },
  };

  const normative = [...rfc.references.normative];
  const anchors = new Set(allReferences.map((reference) => reference.anchor));
  if (clauses.size > 0) {
    for (const reference of BCP14_REFERENCES) if (!anchors.has(reference.anchor)) normative.push(reference);
  }

  const front = element("front", {}, [
    element("title", { abbrev: rfc.abbrev }, [record.identity.title]),
    element("seriesInfo", { name: "Internet-Draft", value: rfc.docName }),
    ...rfc.authors.map(authorNode),
    draftDate(rfc.date ?? record.identity["date-created"]),
    rfc.area === undefined ? null : element("area", {}, [rfc.area]),
    rfc.workgroup === undefined ? null : element("workgroup", {}, [rfc.workgroup]),
    ...(rfc.keywords ?? []).map((keyword) => element("keyword", {}, [keyword])),
    element("abstract", {}, blockNodes(projectMarkdownBlocks(rfc.abstract), context)),
  ]);

  const middle = [section("Introduction", "introduction", record.whatThisIs, context)];
  if (clauses.size > 0) {
    middle.push(element("section", { anchor: "conventions-and-definitions" }, [
      element("name", {}, ["Conventions and Definitions"]),
      element("t", {}, [
        "The key words ",
        ...["MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", "OPTIONAL"].flatMap((word, index, all) => [
          "\"", element("bcp14", {}, [word]), `"${index === all.length - 1 ? "" : index === all.length - 2 ? ", and " : ", "}`,
        ]),
        " in this document are to be interpreted as described in BCP 14 ",
        element("xref", { target: "RFC2119" }), " ", element("xref", { target: "RFC8174" }),
        " when, and only when, they appear in all capitals, as shown here.",
      ]),
    ]));
  }
  const closing = [];
  for (const topic of record.topics) {
    const rendered = section(topic.heading, anchorOf(topic.heading), topic.body, context);
    (REQUIRED_TOPICS.includes(topic.heading) ? closing : middle).push(rendered);
  }
  if (record.implementations.length > 0) {
    middle.push(element("section", { anchor: "implementation-status" }, [
      element("name", {}, ["Implementation Status"]),
      element("t", {}, ["This section records the status of known implementations of the protocol defined by this specification at the time of posting of this Internet-Draft, and is based on a proposal described in ", element("xref", { target: "RFC7942" }), ". It is to be removed before publication as an RFC."]),
      ...record.implementations.map((implementation) => {
        const anchor = `implementation-${anchorOf(implementation.context)}`;
        return element("section", { anchor }, [element("name", {}, [implementation.context]), ...sectionNodes(projectMarkdownBlocks(markdownWithSentinels(implementation.body)), context, anchor)]);
      }),
    ]));
  }
  middle.push(...closing);

  requireEveryEntryReferenced("clause", context.clause, context.seen.clause);
  requireEveryEntryReferenced("law", context.law, context.seen.law);
  requireEveryEntryReferenced("standard", context.standard, context.seen.standard);

  const informative = [...rfc.references.informative];
  if (record.implementations.length > 0 && !allReferences.some((reference) => reference.anchor === "RFC7942")) {
    informative.push({
      anchor: "RFC7942",
      title: "Improving Awareness of Running Code: The Implementation Status Section",
      target: "https://www.rfc-editor.org/info/rfc7942",
      authors: [{ fullname: "Y. Sheffer", initials: "Y.", surname: "Sheffer" }, { fullname: "A. Farrel", initials: "A.", surname: "Farrel" }],
      date: { year: "2016", month: "July" },
      seriesInfo: [{ name: "BCP", value: "205" }, { name: "RFC", value: "7942" }, { name: "DOI", value: "10.17487/RFC7942" }],
    });
  }
  const back = [element("references", { anchor: "references" }, [
    element("name", {}, ["References"]),
    element("references", { anchor: "normative-references" }, [element("name", {}, ["Normative References"]), ...normative.map(referenceNode)]),
    element("references", { anchor: "informative-references" }, [element("name", {}, ["Informative References"]), ...informative.map(referenceNode)]),
  ])];
  if (record.openQuestions.length > 0) {
    back.push(element("section", { anchor: "open-issues" }, [
      element("name", {}, ["Open Issues"]),
      element("t", {}, ["Each issue below would become a requirement once the dependency named with it is resolved. This appendix is to be removed before publication as an RFC."]),
      element("ul", {}, record.openQuestions.map((question) => element("li", {}, [element("t", {}, [...inline(question.question, context), ` Resolution is blocked by: ${question.blockedBy}`])]))),
    ]));
  }

  const root = element("rfc", {
    "xmlns:xi": "http://www.w3.org/2001/XInclude",
    category: rfc.category,
    docName: rfc.docName,
    ipr: rfc.ipr,
    submissionType: rfc.submissionType,
    consensus: rfc.consensus === undefined ? undefined : String(rfc.consensus),
    "xml:lang": "en",
    version: "3",
  }, [
    comment(` Rendered from the house Specification record ${record.identity.id} ${record.identity.version} by specification-rfcxml; edit the record, not this file. `),
    front,
    element("middle", {}, middle),
    element("back", {}, back),
  ]);
  return document(root, { declaration: true });
}
