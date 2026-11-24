import { NextResponse } from "next/server";
import { InvalidModelOutputError, MissingConfigError } from "@/lib/llm";
import { getLlm } from "@/lib/llm/gemini";
import { ResearchStateError, runQuestion } from "@/lib/research/run";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { index?: unknown };
  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0) return NextResponse.json({ error: "Give the question number." }, { status: 400 });

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
    const updated = await runQuestion(app, index, llm);
    await store.save(updated);
    return NextResponse.json({ ok: true, done: updated.research!.status === "done" });
  } catch (e) {
    if (e instanceof ResearchStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    const message = e instanceof InvalidModelOutputError ? e.message : `Research step failed: ${(e as Error).message}`;
    const q = app.research?.questions[index];
    if (app.research && q) {
      await store.save({
        ...app,
        research: {
          ...app.research,
          errors: [...app.research.errors.filter((x) => x.questionId !== q.id), { questionId: q.id, message }],
        },
      });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
