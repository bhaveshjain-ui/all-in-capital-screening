import { NextResponse } from "next/server";
import { CalError } from "@/lib/calendar/cal";
import { draftInvitation, EmailStateError } from "@/lib/email/draft";
import { InvalidModelOutputError, MissingConfigError } from "@/lib/llm";
import { getLlm } from "@/lib/llm/gemini";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Draft an invitation with the model. Nothing is sent; the draft starts with no recipient. */
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
    await store.save(await draftInvitation(app, llm, by));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EmailStateError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof CalError) return NextResponse.json({ error: e.message }, { status: 502 });
    const message = e instanceof InvalidModelOutputError ? e.message : `Drafting failed: ${(e as Error).message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
