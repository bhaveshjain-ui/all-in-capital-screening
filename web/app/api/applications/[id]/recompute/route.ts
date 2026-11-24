import { NextResponse } from "next/server";
import { addAudit } from "@/lib/review";
import { recomputeWithSettings, ScoringStateError } from "@/lib/scoring/run";
import { currentValues } from "@/lib/settings";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** Apply the saved settings to an existing result. No model call: the model's scores are not touched. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { by?: unknown };
  const by = typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 60) : "unnamed reviewer";
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    const v = currentValues(await store.getSettings());
    const next = recomputeWithSettings(app, v.params, v.weights);
    await store.save(addAudit(next, "settings_applied", by, `Result recomputed with the saved settings: ${next.scoring!.evaluation.lean}, score ${next.scoring!.evaluation.score?.toFixed(2) ?? "none"}.`));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ScoringStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
