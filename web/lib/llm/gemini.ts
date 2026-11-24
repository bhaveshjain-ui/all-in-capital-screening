import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { InvalidModelOutputError, MissingConfigError, type GroundedAnswer, type Llm } from "./index";

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

/**
 * Gemini behind the Llm interface. NOT yet exercised against the live API (no key was available when
 * this was written): the model name comes from GEMINI_MODEL and must be confirmed with the first key.
 */
export class GeminiLlm implements Llm {
  private ai: GoogleGenAI;
  constructor(apiKey: string, public model: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Google Search grounding. Structured JSON output is not combined with the search tool, so this returns
   * plain text plus the pages the search used; a second, tool-free call structures the text.
   */
  async grounded(prompt: string): Promise<GroundedAnswer> {
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0 },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks.flatMap((c) => (c.web?.uri ? [{ url: c.web.uri, title: c.web.title ?? "" }] : []));
    return { text: res.text ?? "", sources };
  }

  async json<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const res = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    const text = res.text;
    if (!text) throw new InvalidModelOutputError("The model returned no text.");
    let raw: unknown;
    try {
      raw = parseJson(text);
    } catch {
      throw new InvalidModelOutputError("The model's reply was not valid JSON.");
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new InvalidModelOutputError(`The model's reply did not match the expected structure: ${issues}`);
    }
    return parsed.data;
  }
}

export function getLlm(): Llm {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!key) throw new MissingConfigError("GEMINI_API_KEY");
  if (!model) throw new MissingConfigError("GEMINI_MODEL");
  return new GeminiLlm(key, model);
}
