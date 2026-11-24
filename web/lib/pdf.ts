import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to about 4.5 MB.

export class PdfError extends Error {}

export interface PdfText {
  pages: number;
  text: string;
}

/** Extract text page by page. Rejects anything that is not a PDF or has no text layer. */
export async function extractPdfText(bytes: Uint8Array): Promise<PdfText> {
  if (bytes.byteLength === 0) throw new PdfError("The file is empty.");
  if (bytes.byteLength > MAX_PDF_BYTES) throw new PdfError("The file is larger than 4 MB.");
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== "%PDF-") throw new PdfError("The file is not a PDF.");

  let pageTexts: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const res = await extractText(pdf, { mergePages: false });
    pageTexts = res.text as string[];
  } catch (e) {
    throw new PdfError(`The PDF could not be read: ${(e as Error).message}`);
  }

  const text = pageTexts
    .map((t, i) => `=== PAGE ${i + 1} ===\n${t.replace(/[ \t]+/g, " ").trim()}`)
    .join("\n\n");
  if (pageTexts.join("").trim().length < 20) {
    throw new PdfError("The PDF has no readable text (it may be scanned images).");
  }
  return { pages: pageTexts.length, text };
}
