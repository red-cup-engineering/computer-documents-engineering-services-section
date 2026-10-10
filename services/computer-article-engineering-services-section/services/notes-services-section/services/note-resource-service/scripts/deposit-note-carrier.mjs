import { depositNoteCarrier } from "../src/note-resources.mjs";

/** Deposit one typed note carrier below one caller-admitted actuator-node root. */
export async function depositNoteCarrierAction(input = {}) { return depositNoteCarrier(input); }

export const operation = Object.freeze({ name: "deposit-note-carrier", description: "Deposit one typed note carrier below one caller-admitted actuator-node root.", operation: depositNoteCarrierAction });
