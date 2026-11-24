import { NextResponse } from "next/server";
import { EmailStateError } from "@/lib/email/draft";
import { approveDraft, sendMode } from "@/lib/email/send";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

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
  try {
    await store.save(approveDraft(app, draftId, by, sendMode()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EmailStateError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
