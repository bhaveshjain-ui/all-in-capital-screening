import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { extractPdfText, PdfError } from "../lib/pdf";
import { recomputeAll, unitSlipNote } from "../lib/recompute";
import { findConflicts } from "../lib/conflicts";
import { extractApplication } from "../lib/extract";
import { FileStore } from "../lib/store/file";
import { ExtractionSchema, type Application, type Claim, type Figures } from "../lib/schemas";
import { InvalidModelOutputError, type Llm } from "../lib/llm";

const here = path.dirname(fileURLToPath(import.meta.url));
const pdf = (n: string) => new Uint8Array(fs.readFileSync(path.resolve(here, "../../data/applications", n)));

describe("PDF intake on the real applications", () => {
  it("reads the GrainKind deck page by page", async () => {
    const r = await extractPdfText(pdf("GrainKind_Deck.pdf"));
    expect(r.pages).toBe(10);
    expect(r.text).toContain("=== PAGE 1 ===");
    expect(r.text).toContain("Millet-based breakfast");
    expect(r.text).toContain("90-day repeat");
  });
  it("reads the form, including the form-only facts", async () => {
    const r = await extractPdfText(pdf("EarnWise_Form.pdf"));
    expect(r.text).toContain("A co-founder left in July 2026");
    expect(r.text).toContain("agreement in principle");
  });
  it("reads all 20 application PDFs", async () => {
    const files = fs.readdirSync(path.resolve(here, "../../data/applications")).filter((f) => f.endsWith(".pdf"));
    expect(files.length).toBe(20);
    for (const f of files) {
      const r = await extractPdfText(pdf(f));
      expect(r.pages, f).toBeGreaterThan(0);
      expect(r.text.length, f).toBeGreaterThan(500);
    }
  });
  it("rejects non-PDF, empty and oversized files", async () => {
    await expect(extractPdfText(new TextEncoder().encode("hello world, not a pdf"))).rejects.toBeInstanceOf(PdfError);
    await expect(extractPdfText(new Uint8Array(0))).rejects.toBeInstanceOf(PdfError);
    await expect(extractPdfText(new Uint8Array(5 * 1024 * 1024))).rejects.toBeInstanceOf(PdfError);
  });
});

const where = { source: "deck" as const, location: "deck page 6" };

describe("recomputation catches the slips found in the applications", () => {
  const figs = (over: Partial<Figures>): Figures => ({ products: [], sums: [], quotients: [], paybacks: [], ...over });

  it("GrainKind TAM stated 10x too high", () => {
    const [r] = recomputeAll(figs({ products: [{ label: "TAM", claimed: 91200e7, factors: [38e6, 2400], ...where }] }));
    expect(r.match).toBe(false);
    expect(r.computed).toBeCloseTo(9120e7, 0);
    expect(r.note).toMatch(/10x/);
  });
  it("EarnWise TAM stated 10x too low", () => {
    const [r] = recomputeAll(figs({ products: [{ label: "TAM", claimed: 14400e7, factors: [10e6, 12000, 12], ...where }] }));
    expect(r.match).toBe(false);
    expect(r.note).toMatch(/1\/10/);
  });
  it("Settlr payback of 7 months does not follow from its own inputs", () => {
    const [r] = recomputeAll(figs({ paybacks: [{ label: "Payback", claimed_months: 7, cac_inr: 14500, monthly_revenue_per_customer_inr: 6800, gross_margin_pct: 58, ...where }] }));
    expect(r.match).toBe(false);
    expect(r.computed).toBeCloseTo(3.68, 1);
  });
  it("accepts ordinary rounding", () => {
    const rs = recomputeAll(figs({
      products: [{ label: "ARR", claimed: 940000, factors: [78000, 12], ...where }],
      quotients: [{ label: "CAC", claimed: 2860, numerator: 40000, denominator: 14, ...where }],
      sums: [{ label: "Channel shares", claimed: 100, parts: [45, 25, 20, 10], ...where }],
    }));
    expect(rs.every((r) => r.match)).toBe(true);
  });
  it("does not divide by zero", () => {
    const [r] = recomputeAll(figs({ quotients: [{ label: "x", claimed: 5, numerator: 10, denominator: 0, ...where }] }));
    expect(r.match).toBe(false);
    expect(r.note).toMatch(/zero/);
  });
  it("only flags clean powers of ten as unit slips", () => {
    expect(unitSlipNote(5, 3)).toBeUndefined();
    expect(unitSlipNote(30, 3)).toMatch(/10x/);
  });
});

describe("deck-versus-form comparison", () => {
  const c = (field: string, source: "deck" | "form", value: string | number, label = field): Claim => ({
    field, label, value, source, location: `${source} page 1`, quote: String(value),
  });

  it("flags the CAPilot customer-count conflict and nothing that agrees", () => {
    const out = findConflicts([
      c("customers_paying", "deck", 31), c("customers_paying", "form", 24),
      c("mrr_inr", "deck", 78000), c("mrr_inr", "form", 78000),
    ]);
    expect(out.map((x) => x.field)).toEqual(["customers_paying"]);
    expect(out[0].kind).toBe("numeric");
  });
  it("lets small rounding differences through", () => {
    expect(findConflicts([c("cac_inr", "deck", 340), c("cac_inr", "form", 337)])).toHaveLength(0);
  });
  it("flags differing text for a reviewer to read", () => {
    const out = findConflicts([c("team_size", "deck", "Team of 12"), c("team_size", "form", "5")]);
    expect(out[0].kind).toBe("text");
  });
  it("ignores a field that only appears in one document", () => {
    expect(findConflicts([c("a", "deck", 1), c("b", "form", 2)])).toHaveLength(0);
  });
});

describe("extraction orchestration (fixture model, no network)", () => {
  const app: Application = {
    id: "11111111-2222-3333-4444-555555555555", name: "Demo", createdAt: new Date().toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "deck text" }, { kind: "form", filename: "f.pdf", pages: 1, text: "form text" }],
    extraction: { status: "not_run" }, recompute: [], conflicts: [],
  };
  const canned = {
    company: { name: "Demo", founders: [] },
    claims: [
      { field: "customers_paying", label: "Paying customers", value: 31, source: "deck", location: "deck page 4", quote: "31 paying CA firms" },
      { field: "customers_paying", label: "Paying customers", value: 24, source: "form", location: "form page 1", quote: "24 paying CA firms" },
    ],
    figures: { products: [{ label: "TAM", claimed: 1000, factors: [10, 10], source: "deck", location: "deck page 6" }] },
  };
  const llmReturning = (value: unknown): Llm => ({
    model: "fixture",
    async json<T>(_p: string, schema: z.ZodType<T>) {
      const r = schema.safeParse(value);
      if (!r.success) throw new InvalidModelOutputError("bad shape");
      return r.data;
    },
  });

  it("stores claims, recomputation and conflicts from a valid reply", async () => {
    const out = await extractApplication(app, llmReturning(canned));
    expect(out.extraction.status).toBe("done");
    expect(out.conflicts).toHaveLength(1);
    expect(out.recompute[0].match).toBe(false);
    expect(ExtractionSchema.safeParse(out.extraction.result).success).toBe(true);
  });
  it("rejects an invalid reply instead of repairing it", async () => {
    await expect(extractApplication(app, llmReturning({ company: {} }))).rejects.toBeInstanceOf(InvalidModelOutputError);
  });
});

describe("file store", () => {
  it("saves, reads and lists applications and rejects unsafe ids", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aic-store-"));
    const store = new FileStore(dir);
    const app: Application = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Demo", createdAt: new Date().toISOString(),
      files: [], extraction: { status: "not_run" }, recompute: [], conflicts: [],
    };
    await store.save(app);
    expect((await store.get(app.id))?.name).toBe("Demo");
    expect((await store.list())[0].id).toBe(app.id);
    expect(await store.get("ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee")).toBeNull();
    await expect(store.get("../etc/passwd")).rejects.toThrow();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
