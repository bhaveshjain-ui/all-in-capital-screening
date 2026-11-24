import { NextResponse } from "next/server";
import { applySettingsChange, currentValues, SettingsError } from "@/lib/settings";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const doc = await getStore().getSettings();
  return NextResponse.json({ current: currentValues(doc), history: doc?.history ?? [] });
}

/** Save a change to the partner-set parameters. A reason is required and the change is kept in the history. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Send the settings as JSON." }, { status: 400 });
  const store = getStore();
  try {
    const next = applySettingsChange(await store.getSettings(), body);
    await store.saveSettings(next);
    return NextResponse.json({ ok: true, current: next.current });
  } catch (e) {
    if (e instanceof SettingsError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
