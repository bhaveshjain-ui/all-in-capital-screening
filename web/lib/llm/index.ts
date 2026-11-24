import type { ZodType } from "zod";

/** Thrown when a required environment variable is missing; the API turns it into a clear 503. */
export class MissingConfigError extends Error {
  constructor(public variable: string) {
    super(`${variable} is not set.`);
  }
}

/** Thrown when the model's output is not valid JSON or does not match the schema. Never repaired silently. */
export class InvalidModelOutputError extends Error {}

export interface GroundedAnswer {
  text: string;
  /** Pages the search actually returned. The model never supplies URLs itself. */
  sources: { url: string; title: string }[];
}

export interface Llm {
  model: string;
  /** Ask for JSON and validate it against the schema. */
  json<T>(prompt: string, schema: ZodType<T>): Promise<T>;
  /** Answer using live web search, returning the pages the search used. */
  grounded?(prompt: string): Promise<GroundedAnswer>;
}
