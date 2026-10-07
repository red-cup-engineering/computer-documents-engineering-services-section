/** BCP 14 normative-requirement reading for Markdown specifications. */
import { addressTextDocument, artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { document, element } from "@red-cup-engineering/xml-document-rendering-service/core";

export const BCP14_KEYWORDS = Object.freeze([
  "MUST NOT",
  "SHALL NOT",
  "SHOULD NOT",
  "NOT RECOMMENDED",
  "MUST",
  "REQUIRED",
  "SHALL",
  "SHOULD",
  "RECOMMENDED",
  "MAY",
  "OPTIONAL",
]);

const KEYWORD_PATTERN = new RegExp(`\\b(${BCP14_KEYWORDS.join("|")})\\b`, "gu");

function requirementLevel(keyword) {
  if (keyword === "MUST NOT" || keyword === "SHALL NOT") return "prohibition";
  if (keyword === "SHOULD NOT" || keyword === "NOT RECOMMENDED") return "discouragement";
  if (keyword === "SHOULD" || keyword === "RECOMMENDED") return "recommendation";
  if (keyword === "MAY" || keyword === "OPTIONAL") return "optional";
  return "absolute";
}

function sectionAtLine(structure, line) {
  return [...structure.headings].reverse().find((heading) => heading.line <= line && heading.endLine >= line)?.title;
}

function fenceAfter(line, fence) {
  const match = line.match(/^[ \t]*(`{3,}|~{3,})/u);
  if (match === null) return fence;
  const marker = match[1][0];
  const length = match[1].length;
  if (fence === undefined) return Object.freeze({ marker, length });
  if (fence.marker === marker && length >= fence.length) return undefined;
  return fence;
}

function proseForRequirementScan(line) {
  return line.replace(/`[^`\n]*`/gu, "");
}

function bcp14DeclarationLine(line) {
  return /\bkey words?\b/iu.test(line) && /\binterpreted\b/iu.test(line) && /\bRFC\s*(?:2119|8174)\b/iu.test(line);
}

/** Read only uppercase BCP 14 words as normative keywords, per RFC 8174. */
export function specificationReadout(text) {
  const structure = readMarkdownStructure(text);
  const requirements = [];
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  let fence;
  for (const [offset, lineText] of lines.entries()) {
    const nextFence = fenceAfter(lineText, fence);
    if (fence !== undefined || nextFence !== undefined) {
      fence = nextFence;
      continue;
    }
    if (bcp14DeclarationLine(lineText)) continue;
    const prose = proseForRequirementScan(lineText);
    KEYWORD_PATTERN.lastIndex = 0;
    for (const match of prose.matchAll(KEYWORD_PATTERN)) {
      const keyword = match[1];
      const line = offset + 1;
      const textValue = lineText.trim();
      requirements.push(Object.freeze({
        id: artifactId({ keyword, line, text: textValue }),
        keyword,
        level: requirementLevel(keyword),
        line,
        ...(sectionAtLine(structure, line) === undefined ? {} : { section: sectionAtLine(structure, line) }),
        text: textValue,
      }));
    }
  }
  const rfc2119 = /\bRFC\s*2119\b/iu.test(text);
  const rfc8174 = /\bRFC\s*8174\b/iu.test(text);
  const issues = [];
  if (requirements.length > 0 && !rfc2119) issues.push(Object.freeze({
    rule: "bcp14-boilerplate-missing-rfc2119",
    severity: "warning",
    message: "uppercase BCP 14 keywords are present but RFC 2119 is not named",
  }));
  if (requirements.length > 0 && !rfc8174) issues.push(Object.freeze({
    rule: "bcp14-boilerplate-missing-rfc8174",
    severity: "warning",
    message: "uppercase BCP 14 keywords are present but RFC 8174 is not named",
  }));
  const title = structure.headings.find((heading) => heading.level === 1)?.title;
  return Object.freeze({
    kind: "metroplat.specification.readout",
    source: addressTextDocument(text).ref,
    ...(title === undefined ? {} : { title }),
    bcp14: Object.freeze({ rfc2119, rfc8174, requirements: Object.freeze(requirements) }),
    issues: Object.freeze(issues),
  });
}

/**
 * Project the normative requirement index to a small XML interchange form.
 * This is the first structured-source boundary shared by future xml2rfc-like
 * and xml2arc42 projections; Markdown remains the canonical authored file.
 */
export function specificationRequirementsXml(readout) {
  return document(element("specification-requirements", {
    source: readout.source,
    "bcp14-rfc2119": String(readout.bcp14.rfc2119),
    "bcp14-rfc8174": String(readout.bcp14.rfc8174),
  }, readout.bcp14.requirements.map((requirement) => element("requirement", {
    id: requirement.id,
    keyword: requirement.keyword,
    level: requirement.level,
    line: requirement.line,
    section: requirement.section,
  }, [requirement.text]))), { declaration: true });
}
