import type { Llm } from "./llm";
import { findConflicts } from "./conflicts";
import { buildExtractPrompt } from "./prompts/extract";
import { recomputeAll } from "./recompute";
import { ExtractionSchema, type Application } from "./schemas";

/**
 * Run claim extraction for an application. The model only reads and quotes; recomputation and the
 * deck-versus-form comparison are done by code. Errors are thrown, never papered over.
 */
export async function extractApplication(app: Application, llm: Llm): Promise<Application> {
  if (app.files.length === 0) throw new Error("This application has no files.");
  const result = await llm.json(buildExtractPrompt(app.files), ExtractionSchema);
  return {
    ...app,
    extraction: {
      status: "done",
      model: llm.model,
      extractedAt: new Date().toISOString(),
      result,
    },
    recompute: recomputeAll(result.figures),
    conflicts: findConflicts(result.claims),
  };
}
