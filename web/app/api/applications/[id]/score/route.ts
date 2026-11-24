import { NextResponse } from "next/server";
import { InvalidModelOutputError, MissingConfigError } from "@/lib/llm";
import { getLlm } from "@/lib/llm/gemini";
import { applyBusinessTypes, ScoringStateError, scoreApplication } from "@/lib/scoring/run";
import { BUSINESS_TYPES } from "@/lib/schemas";
import type { BusinessType } from "@/lib/framework/config";
import { addAudit, archiveReviewForRescore } from "@/lib/review";
import { memoryFor } from "@/lib/memory";
import { currentValues } from "@/lib/settings";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Run scoring (calls the model; up to two attempts). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { useMemory?: unknown };
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
    // Past corrections on similar companies are used only on request, and only once the business types are
    // known (from an earlier scoring). They are shown to the model as precedent, never applied as rules.
    let precedent: ReturnType<typeof memoryFor>[keyof ReturnType<typeof memoryFor>] = [];
    if (body.useMemory === true && app.scoring) {
      const others = (await store.all()).filter((a) => a.id !== app.id);
      precedent = Object.values(memoryFor(app, others, 2)).flat().sort((a, b) => b.score - a.score).slice(0, 8);
    }
    const settings = currentValues(await store.getSettings());
    const scored = await scoreApplication(archiveReviewForRescore(app), llm, settings.params, precedent, settings.weights);
    const updated = addAudit(scored, "scoring_run", "system", `Scored with ${llm.model} in ${scored.scoring!.attempts} attempt(s): ${scored.scoring!.evaluation.lean}.${precedent.length ? ` ${precedent.length} past correction(s) on similar companies were shown to the model as precedent.` : ""}`);
    await store.save(updated);
    return NextResponse.json({ ok: true, lean: updated.scoring!.evaluation.lean });
  } catch (e) {
    if (e instanceof ScoringStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    const message = e instanceof InvalidModelOutputError ? e.message : `Scoring failed: ${(e as Error).message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Reviewer override of the business types: recomputes the result in code, no model call. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { businessTypes?: unknown };
  const types = body.businessTypes;
  if (!Array.isArray(types) || !types.every((t) => (BUSINESS_TYPES as readonly string[]).includes(t as string))) {
    return NextResponse.json({ error: "Choose business types from the list." }, { status: 400 });
  }
  const store = getStore();
  const app = await store.get(id);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    const updated = addAudit(applyBusinessTypes(app, types as BusinessType[]), "business_types_changed", "reviewer", `Business types set to ${(types as string[]).join(", ")}.`);
    await store.save(updated);
    return NextResponse.json({ ok: true, lean: updated.scoring!.evaluation.lean });
  } catch (e) {
    if (e instanceof ScoringStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
