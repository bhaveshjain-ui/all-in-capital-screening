import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const app = await getStore().get(id);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
}
