import { catalogNodeNotes } from "../src/note-resources.mjs";

/** Catalog dated note carriers below one caller-admitted actuator-node root. */
export async function catalogNodeNotesAction(input = {}) { return catalogNodeNotes(input); }

export const operation = Object.freeze({ name: "catalog-node-notes", description: "Catalog dated note carriers below one caller-admitted actuator-node root.", operation: catalogNodeNotesAction });
