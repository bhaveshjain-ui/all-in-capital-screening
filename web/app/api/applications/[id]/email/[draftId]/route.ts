import { NextResponse } from "next/server";
import { EmailStateError } from "@/lib/email/draft";
import { editDraft } from "@/lib/email/send";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** Edit a draft's recipient, subject or message. Editing after approval cancels the approval. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Send the draft details as JSON." }, { status: 400 });
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    await store.save(editDraft(app, draftId, body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EmailStateError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
