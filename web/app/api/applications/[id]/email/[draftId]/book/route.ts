import { NextResponse } from "next/server";
import { bookSlot } from "@/lib/email/book";
import { EmailStateError } from "@/lib/email/draft";
import { sendMode } from "@/lib/email/send";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Books the slot the applicant chose. In test mode (the default) nothing is booked. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { by?: unknown; startIso?: unknown };
  const by = typeof body.by === "string" ? body.by.slice(0, 60) : undefined;
  if (typeof body.startIso !== "string") return NextResponse.json({ error: "Choose one of the offered times." }, { status: 400 });
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    await store.save(await bookSlot(app, draftId, body.startIso, by, { mode: sendMode() }));
    return NextResponse.json({ ok: true, mode: sendMode() });
  } catch (e) {
    if (e instanceof EmailStateError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
