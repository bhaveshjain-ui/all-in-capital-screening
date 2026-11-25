import { NextResponse } from "next/server";
import { MarkError, setMemoryMark } from "@/lib/memory/marks";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** Marks a retrieved past correction as useful or not useful on this application. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Send the mark as JSON." }, { status: 400 });
  const store = getStore();
  let app;
  try {
    app = await store.get(id);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  try {
    const others = (await store.all()).filter((a) => a.id !== app!.id);
    await store.save(setMemoryMark(app, others, body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MarkError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
