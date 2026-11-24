import { NextResponse } from "next/server";
import { recordDecision, ReviewError } from "@/lib/review";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Send the review details as JSON." }, { status: 400 });
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    await store.save(recordDecision(app, body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ReviewError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
