import { NextResponse } from "next/server";
import { InvalidModelOutputError, MissingConfigError } from "@/lib/llm";
import { getLlm } from "@/lib/llm/gemini";
import { planResearch, ResearchStateError } from "@/lib/research/run";
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
      return NextResponse.json({ error: `${e.variable} is not set. Add it to the environment and try again.` }, { status: 503 });
    }
    throw e;
  }

  try {
    const updated = await planResearch(app, llm);
    await store.save(addAudit(updated, "research_planned", "system", `Research planned with ${llm.model}: ${updated.research!.questions.length} questions; portfolio overlaps flagged: ${updated.research!.portfolio!.checks.length}.`));
    return NextResponse.json({ questions: updated.research!.questions.length });
  } catch (e) {
    if (e instanceof ResearchStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    const message = e instanceof InvalidModelOutputError ? e.message : `Planning failed: ${(e as Error).message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
