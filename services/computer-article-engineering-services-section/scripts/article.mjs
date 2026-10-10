/**
 * article - schema-addressed content record for published article material.
 *
 * The record is schema-only and imports no host adapter. Front-matter properties
 * come from Koios article markdown, with body markdown held as `body`.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const nonEmptyStringSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: nonEmptyStringSchema };

const cslDateSchema = {
  anyOf: [
    nonEmptyStringSchema,
    { type: "integer" },
    {
      type: "object",
      required: ["date-parts"],
      additionalProperties: false,
      properties: {
        "date-parts": {
          type: "array",
          items: { type: "array", items: { type: "integer" }, minItems: 1 },
          minItems: 1,
        },
      },
    },
  ],
};

const cslReferenceSchema = {
  type: "object",
  required: ["id", "type", "title", "URL"],
  additionalProperties: false,
  properties: {
    id: nonEmptyStringSchema,
    type: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    URL: nonEmptyStringSchema,
    "container-title": nonEmptyStringSchema,
    issued: cslDateSchema,
  },
};

const internalLinkGuidanceSchema = {
  type: "object",
  required: ["targetSlug", "targetPath", "targetHeadline", "matchedTerms", "confidence", "markdownLink", "writingGuidance"],
  additionalProperties: false,
  properties: {
    targetSlug: nonEmptyStringSchema,
    targetPath: nonEmptyStringSchema,
    targetHeadline: nonEmptyStringSchema,
    matchedTerms: stringSequenceSchema,
    confidence: { type: "number", minimum: 0 },
    markdownLink: nonEmptyStringSchema,
    writingGuidance: nonEmptyStringSchema,
  },
};

const articleSourceSchema = {
  type: "object",
  required: ["url"],
  additionalProperties: false,
  properties: {
    url: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    source: nonEmptyStringSchema,
    author: nonEmptyStringSchema,
    published: nonEmptyStringSchema,
    observed: nonEmptyStringSchema,
    adapter: nonEmptyStringSchema,
    wire: nonEmptyStringSchema,
    citation: nonEmptyStringSchema,
  },
};

const articleEditorialGateSchema = {
  type: "object",
  required: ["gate", "charge", "evidence"],
  additionalProperties: false,
  properties: {
    gate: nonEmptyStringSchema,
    charge: nonEmptyStringSchema,
    evidence: nonEmptyStringSchema,
    reviewedAt: nonEmptyStringSchema,
    reviewer: nonEmptyStringSchema,
  },
};

const articleCorrectionSchema = {
  type: "object",
  required: ["code", "message", "severity"],
  additionalProperties: false,
  properties: {
    code: nonEmptyStringSchema,
    message: nonEmptyStringSchema,
    severity: { anyOf: [{ const: "error" }, { const: "warning" }, { const: "note" }] },
    gate: nonEmptyStringSchema,
    href: nonEmptyStringSchema,
  },
};

const koiosArticleMetaSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    seo_term: nonEmptyStringSchema,
    tweet: nonEmptyStringSchema,
    beat: nonEmptyStringSchema,
    gates_clear: { type: "boolean" },
    standards_reviewed_at: nonEmptyStringSchema,
    draft_internal_link_guidance: { type: "array", items: internalLinkGuidanceSchema },
    original_permalink: nonEmptyStringSchema,
    headline: nonEmptyStringSchema,
    source_cycle_warnings: stringSequenceSchema,
    source_cycle_repair_href: nonEmptyStringSchema,
  },
};

export const ArticleSchema = {
  $id: "metroplat/article",
  title: "Article",
  description: "A schema-addressed content record for Koios-style published article front matter plus body markdown.",
  type: "object",
  required: ["title", "slug", "author", "date", "draft", "body"],
  additionalProperties: false,
  properties: {
    title: nonEmptyStringSchema,
    slug: nonEmptyStringSchema,
    path: nonEmptyStringSchema,
    url: nonEmptyStringSchema,
    canonicalUrl: nonEmptyStringSchema,
    author: nonEmptyStringSchema,
    date: nonEmptyStringSchema,
    updated: nonEmptyStringSchema,
    draft: { type: "boolean" },
    section: nonEmptyStringSchema,
    beat: nonEmptyStringSchema,
    seoTerm: nonEmptyStringSchema,
    excerpt: nonEmptyStringSchema,
    metaDescription: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    keywords: stringSequenceSchema,
    categories: stringSequenceSchema,
    tags: stringSequenceSchema,
    sources: { type: "array", items: articleSourceSchema },
    editorialGates: { type: "array", items: articleEditorialGateSchema },
    corrections: { type: "array", items: articleCorrectionSchema },
    sourceCycleWarnings: stringSequenceSchema,
    standardsHref: nonEmptyStringSchema,
    standardsJsonHref: nonEmptyStringSchema,
    publicHref: nonEmptyStringSchema,
    sourceCycleRepairHref: nonEmptyStringSchema,
    koios: koiosArticleMetaSchema,
    references: { type: "array", items: cslReferenceSchema },
    citations: { type: "array", items: cslReferenceSchema },
    license: nonEmptyStringSchema,
    license_url: nonEmptyStringSchema,
    syndication_rights: nonEmptyStringSchema,
    body: { type: "string" },
  },
};

export const articleContract = schemaFrom(ArticleSchema);

const DEFAULT_MINIMUM_WORDS = 450;
const ONE_CLICK_REPAIR_CODES = new Set(["missing-license", "missing-license-url", "missing-syndication-rights"]);

function clean(value) {
  const text = value?.trim();
  return text === undefined || text === "" ? undefined : text;
}

function words(value) {
  return Object.freeze(value.trim().split(/\s+/u).filter(Boolean));
}

function articleDescription(article) {
  return clean(article.metaDescription)
    ?? clean(article.description)
    ?? clean(article.excerpt)
    ?? clean(article.summary)
    ?? clean(article.koios?.tweet);
}

function articleSeoTerm(article) {
  return clean(article.seoTerm) ?? clean(article.koios?.seo_term) ?? clean(article.keywords?.[0]);
}

function firstParagraph(body) {
  return body.replace(/\r\n?/gu, "\n").split(/\n\s*\n/u).map((chunk) => chunk.trim()).find(Boolean) ?? "";
}

function h2Text(body) {
  return body.replace(/\r\n?/gu, "\n").split("\n").filter((line) => /^##\s+\S/u.test(line)).join("\n");
}

function includesTerm(text, term) {
  return text.toLocaleLowerCase().includes(term.toLocaleLowerCase());
}

function finding(severity, gate, code, message) {
  return Object.freeze({ severity, gate, code, message });
}

function hasBlockingEditorialGate(article) {
  return (article.editorialGates ?? []).some((gate) => {
    const charge = gate.charge.toLocaleLowerCase();
    return charge === "hold" || charge === "block" || charge === "error" || charge === "fail";
  });
}

function articleReferenceCount(article) {
  return (article.references?.length ?? 0) + (article.citations?.length ?? 0);
}

function articleSourceCount(article) {
  return article.sources?.length ?? articleReferenceCount(article);
}

function sourceCycleWarnings(article) {
  return Object.freeze([
    ...(article.sourceCycleWarnings ?? []),
    ...(article.koios?.source_cycle_warnings ?? []),
  ]);
}

/** Count publishable body words using the article body, not rendered HTML. */
export function articleWordCount(article) {
  return words(article.body).length;
}

/** Review one Article content record against publication packaging gates derived from the old farm/mill surface. */
export function reviewArticleForPublication(article, policy = {}) {
  const minimumWords = policy.minimumWords ?? DEFAULT_MINIMUM_WORDS;
  const findings = [];
  const wordCount = articleWordCount(article);
  if (wordCount < minimumWords) {
    findings.push(finding("error", "copy-edited", "body-too-short", `A publishable article needs at least ${minimumWords} words; found ${wordCount}.`));
  }

  const description = articleDescription(article);
  if (description === undefined) findings.push(finding("error", "standards-cleared", "missing-description", "A publishable article needs a summary, description, excerpt, or meta description."));

  const seoTerm = articleSeoTerm(article);
  if (seoTerm === undefined) {
    findings.push(finding("error", "standards-cleared", "missing-seo-term", "A publishable article needs an SEO term or keyword."));
  } else {
    if (policy.requireSeoTermInFirstParagraph !== false && !includesTerm(firstParagraph(article.body), seoTerm)) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-first-paragraph", "The SEO term must appear in the first paragraph."));
    }
    if (policy.requireSeoTermInH2 !== false && !includesTerm(h2Text(article.body), seoTerm)) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-h2", "The SEO term must appear in a level-two heading."));
    }
  }

  if (articleReferenceCount(article) === 0 && articleSourceCount(article) === 0) {
    findings.push(finding("error", "standards-cleared", "missing-sources", "A publishable article needs references, citations, or source records."));
  }
  if (clean(article.license) === undefined) findings.push(finding("error", "standards-cleared", "missing-license", "A publishable article needs an explicit license."));
  if (clean(article.license_url) === undefined) findings.push(finding("error", "standards-cleared", "missing-license-url", "Machine-readable syndication works better with a license_url."));
  if (clean(article.syndication_rights) === undefined) findings.push(finding("error", "standards-cleared", "missing-syndication-rights", "A publishable article needs syndication rights metadata."));
  if ((article.tags ?? []).length === 0) findings.push(finding("warning", "standards-cleared", "missing-tags", "A publishable article should carry tags."));
  if ((article.categories ?? []).length === 0) findings.push(finding("warning", "standards-cleared", "missing-categories", "A publishable article should carry categories."));

  for (const correction of article.corrections ?? []) {
    if (correction.severity === "note") continue;
    findings.push(finding(correction.severity, correction.gate ?? "standards-cleared", correction.code, correction.message));
  }

  for (const warning of sourceCycleWarnings(article)) {
    findings.push(finding("warning", "source-cycle", "source-cycle-warning", warning));
  }

  return Object.freeze(findings);
}

function publicationDistance(findings, missingWords) {
  const errors = findings.filter((item) => item.severity === "error").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  return Number((errors * 10 + warnings * 2 + missingWords / 100).toFixed(2));
}

function statusFor(article, findings) {
  const errors = findings.filter((item) => item.severity === "error");
  if (hasBlockingEditorialGate(article)) return "editorial-hold";
  if (errors.length === 0) return article.draft ? "ready-to-publish" : "published-standards-clear";
  if (errors.every((item) => ONE_CLICK_REPAIR_CODES.has(item.code))) return "one-click-repair";
  return "copy-edit-required";
}

function href(article, property, fallback) {
  return clean(article[property]) ?? fallback.replace(":slug", encodeURIComponent(article.slug));
}

function nextAction(candidate) {
  switch (candidate.status) {
    case "published-standards-clear":
      return { nextAction: "inspect-public", nextActionLabel: "Public article", nextActionHref: candidate.publicHref };
    case "ready-to-publish":
      return { nextAction: "publish", nextActionLabel: "Publish", nextActionHref: candidate.standardsHref };
    case "editorial-hold":
      return { nextAction: "review-hold", nextActionLabel: "Review hold", nextActionHref: candidate.standardsHref };
    case "one-click-repair":
      return { nextAction: "apply-standards-defaults", nextActionLabel: "Apply standards defaults", nextActionHref: candidate.standardsHref };
    case "copy-edit-required":
      return { nextAction: "repair-copy", nextActionLabel: "Repair copy", nextActionHref: candidate.sourceCycleRepairHref ?? candidate.standardsHref };
  }
}

/** Project one Article content record into a content-mill-style publication candidate reading. */
export function articlePublicationCandidate(article, policy = {}) {
  const findings = reviewArticleForPublication(article, policy);
  const wordCount = articleWordCount(article);
  const missingWords = Math.max(0, (policy.minimumWords ?? DEFAULT_MINIMUM_WORDS) - wordCount);
  const errorCount = findings.filter((item) => item.severity === "error").length;
  const warningCount = findings.filter((item) => item.severity === "warning").length;
  const standardsHref = href(article, "standardsHref", "/operators/manuscripts/:slug/standards.html");
  const sourceCycleRepairHref = clean(article.sourceCycleRepairHref) ?? clean(article.koios?.source_cycle_repair_href);
  const candidateBase = {
    slug: article.slug,
    title: article.title,
    status: statusFor(article, findings),
    publicationDistance: publicationDistance(findings, missingWords),
    standardsHref,
    standardsJsonHref: href(article, "standardsJsonHref", "/operators/manuscripts/:slug/standards"),
    publicHref: href(article, "publicHref", article.url ?? article.canonicalUrl ?? "/posts/:slug"),
    editorialHold: hasBlockingEditorialGate(article),
    ...(sourceCycleRepairHref === undefined ? {} : { sourceCycleRepairHref, sourceCycleRepairJsonHref: `${sourceCycleRepairHref}.json` }),
  };
  const action = nextAction(candidateBase);
  return Object.freeze({
    ...candidateBase,
    ...action,
    sourceCycleWarnings: sourceCycleWarnings(article),
    wordCount,
    missingWords,
    referenceCount: articleReferenceCount(article),
    sourceCount: articleSourceCount(article),
    errorCount,
    warningCount,
    findingCodes: Object.freeze(findings.map((item) => item.code)),
    note: findings[0]?.message ?? (article.draft ? "Draft is standards clear and ready for publication." : "Published article is standards clear."),
  });
}

/** Aggregate Article content records into the old mill's operator-facing publication-candidate report shape. */
export function articlePublicationReport(
  articles,
  options = {},
) {
  const candidates = Object.freeze(articles.map((article) => articlePublicationCandidate(article, options))
    .sort((left, right) => right.publicationDistance - left.publicationDistance || left.slug.localeCompare(right.slug)));
  return Object.freeze({
    kind: "metroplat.article.publication-candidates",
    generatedAt: options.generatedAt ?? new Date(0).toISOString(),
    draftCount: articles.filter((article) => article.draft).length,
    publishableDraftCount: candidates.filter((candidate) => candidate.status === "ready-to-publish").length,
    publishedCount: candidates.filter((candidate) => candidate.status === "published-standards-clear").length,
    editorialHoldCount: candidates.filter((candidate) => candidate.status === "editorial-hold").length,
    oneClickRepairCount: candidates.filter((candidate) => candidate.status === "one-click-repair").length,
    copyEditRequiredCount: candidates.filter((candidate) => candidate.status === "copy-edit-required").length,
    candidates,
    policy: Object.freeze([
      `minimumWords=${options.minimumWords ?? DEFAULT_MINIMUM_WORDS}`,
      "requires description, source evidence, license, syndication rights, SEO term in first paragraph, and SEO term in H2",
      "blocking editorial gates force editorial-hold before copy repair",
    ]),
  });
}
