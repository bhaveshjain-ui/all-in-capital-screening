import { NextResponse } from "next/server";
import { findContact, hunterKey, HunterError } from "@/lib/contacts/hunter";
import { MissingConfigError } from "@/lib/llm";
import { addAudit } from "@/lib/review";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

async function load(id: string) {
  try {
    return await getStore().get(id);
  } catch {
    return "bad" as const;
  }
}

/** Looks the contact up on Hunter. This spends Hunter credits, so it only runs when a reviewer asks. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { by?: unknown };
  const by = typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 60) : "unnamed reviewer";
  const app = await load(id);
  if (app === "bad") return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.extraction.status !== "done") return NextResponse.json({ error: "Read the documents first: the founders' names come from them." }, { status: 409 });

  let key: string;
  try {
    key = hunterKey();
  } catch (e) {
    if (e instanceof MissingConfigError) return NextResponse.json({ error: `${e.variable} is not set. Add it to the environment and try again.` }, { status: 503 });
    throw e;
  }
  try {
    const contact = await findContact(app, key);
    const detail =
      contact.status === "found" ? `Contact search on ${contact.domain}: ${contact.candidates.length} address(es) found${contact.chosenEmail ? `, ${contact.chosenEmail} selected` : ""}.`
      : `Contact search: ${contact.note}`;
    await getStore().save(addAudit({ ...app, contact }, "contact_searched", by, detail));
    return NextResponse.json({ ok: true, status: contact.status });
  } catch (e) {
    if (e instanceof HunterError) return NextResponse.json({ error: e.message }, { status: 502 });
    throw e;
  }
}

/** Picks which found address to use, or records one typed by the reviewer. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; by?: unknown };
  const by = typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 60) : "unnamed reviewer";
  const app = await load(id);
  if (app === "bad") return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!app.contact || !app.contact.candidates.some((c) => c.email === email)) {
    return NextResponse.json({ error: "Choose one of the addresses that were found." }, { status: 422 });
  }
  await getStore().save(addAudit({ ...app, contact: { ...app.contact, chosenEmail: email } }, "contact_chosen", by, `Contact address set to ${email}.`));
  return NextResponse.json({ ok: true });
}
