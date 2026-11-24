import { NextResponse } from "next/server";
import { extractPdfText, PdfError } from "@/lib/pdf";
import { getStore } from "@/lib/store";
import type { Application, StoredFile } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getStore().list());
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Enter the company name." }, { status: 400 });

  const files: StoredFile[] = [];
  for (const kind of ["deck", "form"] as const) {
    const f = form.get(kind);
    if (!(f instanceof File) || f.size === 0) continue;
    try {
      const { pages, text } = await extractPdfText(new Uint8Array(await f.arrayBuffer()));
      files.push({ kind, filename: f.name.slice(0, 200), pages, text });
    } catch (e) {
      const msg = e instanceof PdfError ? e.message : "The file could not be processed.";
      return NextResponse.json({ error: `${kind === "deck" ? "Deck" : "Form"}: ${msg}` }, { status: 400 });
    }
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Upload at least one PDF (the deck, the form, or both)." }, { status: 400 });
  }

  const app: Application = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    files,
    extraction: { status: "not_run" },
    recompute: [],
    conflicts: [],
  };
  await getStore().save(app);
  return NextResponse.json({ id: app.id }, { status: 201 });
}
