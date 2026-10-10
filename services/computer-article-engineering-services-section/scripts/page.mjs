/**
 * page - schema-addressed content record for non-article page and note material.
 *
 * The record is schema-only and imports no host adapter. Front-matter properties
 * pass through under `frontMatter`, with body markdown held as `body`.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const nonEmptyStringSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: nonEmptyStringSchema };

export const PageSchema = {
  $id: "metroplat/page",
  title: "Page",
  description: "A schema-addressed content record for non-article pages and vault notes with body markdown.",
  type: "object",
  required: ["title", "slug", "path", "body", "frontMatter"],
  additionalProperties: false,
  properties: {
    title: nonEmptyStringSchema,
    slug: nonEmptyStringSchema,
    path: nonEmptyStringSchema,
    url: nonEmptyStringSchema,
    section: nonEmptyStringSchema,
    date: nonEmptyStringSchema,
    tags: stringSequenceSchema,
    frontMatter: { type: "object" },
    body: { type: "string" },
  },
};

export const pageContract = schemaFrom(PageSchema);
