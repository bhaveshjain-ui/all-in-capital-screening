import { NextResponse } from "next/server";
import { EmailStateError } from "@/lib/email/draft";
import { getSender, sendDraft, sendMode } from "@/lib/email/send";
import { MissingConfigError } from "@/lib/llm";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Sends an approved draft. In test mode (the default) nothing leaves the system. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { by?: unknown };
  const by = typeof body.by === "string" ? body.by.slice(0, 60) : undefined;
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const mode = sendMode();
  let sender;
  try {
    sender = getSender(mode);
  } catch (e) {
    if (e instanceof MissingConfigError) {
      return NextResponse.json({ error: `${e.variable} is not set. Live sending needs it; or use test mode.` }, { status: 503 });
    }
    throw e;
  }

  try {
    const result = await sendDraft(app, draftId, by, { mode, ...sender, allApps: await store.all() });
    await store.save(result.app);
    if (!result.ok) return NextResponse.json({ error: `Sending failed: ${result.error}` }, { status: 502 });
    return NextResponse.json({ ok: true, mode });
  } catch (e) {
    if (e instanceof EmailStateError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
