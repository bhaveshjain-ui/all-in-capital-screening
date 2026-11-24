import { NextResponse } from "next/server";
import { extractApplication } from "@/lib/extract";
import { getLlm } from "@/lib/llm/gemini";
import { InvalidModelOutputError, MissingConfigError } from "@/lib/llm";
import { addAudit } from "@/lib/review";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const app = await store.get(id);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  let llm;
  try {
    llm = getLlm();
  } catch (e) {
    if (e instanceof MissingConfigError) {
      return NextResponse.json(
        { error: `${e.variable} is not set. Add it to the environment and try again.` },
        { status: 503 },
      );
    }
    throw e;
  }

  try {
    const updated = await extractApplication(app, llm);
    await store.save(addAudit(updated, "extraction_run", "system", `Claims extracted with ${llm.model}: ${updated.extraction.result?.claims.length ?? 0} claims, ${updated.conflicts.length} deck-form conflicts, ${updated.recompute.filter((r) => !r.match).length} figures not matching.`));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof InvalidModelOutputError ? e.message : `Extraction failed: ${(e as Error).message}`;
    await store.save({ ...app, extraction: { ...app.extraction, status: "error", error: message, model: llm.model } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
