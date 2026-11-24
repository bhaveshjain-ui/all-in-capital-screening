import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { extractPdfText } from "../lib/pdf";
import { InvalidModelOutputError, type Llm } from "../lib/llm";
import { CRITERIA, type CriterionId } from "../lib/framework/config";
import { evidenceSupported, squash, validateScoring } from "../lib/scoring/validate";
import { applyBusinessTypes, d1From, scoreApplication, ScoringStateError } from "../lib/scoring/run";
import { buildScorePrompt } from "../lib/prompts/score";
import type { Application, ScoreOutput } from "../lib/schemas";

const here = path.dirname(fileURLToPath(import.meta.url));
const pdf = (n: string) => new Uint8Array(fs.readFileSync(path.resolve(here, "../../data/applications", n)));

const DECK = "Traction: INR 16.5 L in October. 90-day repeat, August cohort 38%. Claims like 'natural' and 'high- fibre' are used loosely.";
const FORM = "We have not measured acquisition cost yet. Blended CAC INR 340. Founders 82%, angels 18%.";

const baseApp = (): Application => ({
  id: "11111111-2222-3333-4444-555555555555", name: "Demo", createdAt: new Date().toISOString(),
  files: [
    { kind: "deck", filename: "d.pdf", pages: 1, text: DECK },
    { kind: "form", filename: "f.pdf", pages: 1, text: FORM },
  ],
  extraction: {
    status: "done", model: "fixture", extractedAt: new Date().toISOString(),
    result: { company: { name: "Demo", founders: [] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } },
  },
  recompute: [{ kind: "product", label: "TAM = 38M households x INR 2,400", claimed: 1, computed: 2, match: false, relDiff: 1, source: "deck", location: "deck page 6" }],
  conflicts: [{ field: "customers_paying", label: "Paying customers", kind: "numeric", deck: { value: 31, location: "deck page 4", quote: "31 paying CA firms" }, form: { value: 24, location: "form page 1", quote: "24 paying CA firms" } }],
  research: {
    status: "done", model: "fixture", plannedAt: new Date().toISOString(), questions: [], completed: [],
    findings: [{ questionId: "q1", statement: "Several Indian vendors sell call intelligence.", status: "found", sources: [] }],
    portfolio: { checkedAt: new Date().toISOString(), checks: [], mentions: [], note: "incomplete" },
    errors: [],
  },
});

const crit = (over: Record<string, unknown> = {}) => ({
  status: "scored", score: 6, class: "S-u",
  evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }],
  reasoning: "ok", missing: null, cost: null, ...over,
});
const goodOutput = (): ScoreOutput => ({
  business_types: { types: ["consumer"], reason: "packaged food brand" },
  criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, crit()])) as unknown as ScoreOutput["criteria"],
  d2: { value: "not_triggered", reason: "no dependence", evidence: [] },
});

function fixture(replies: unknown[]): Llm & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    model: "fixture", prompts,
    async json<T>(prompt: string, schema: ZodType<T>) {
      prompts.push(prompt);
      const r = schema.safeParse(replies.shift());
      if (!r.success) throw new InvalidModelOutputError("fixture reply did not match the schema");
      return r.data;
    },
  };
}

describe("quote checking", () => {
  it("squashes to letters and digits", () => {
    expect(squash("High- fibre!")).toBe("highfibre");
  });
  it("accepts quotes despite PDF line breaks, hyphenation and quote styles", () => {
    const app = baseApp();
    expect(evidenceSupported(app, { source: "deck", quote: "Claims like “natural” and ‘high-fibre’ are used loosely" })).toBe(true);
  });
  it("rejects a quote that is not in that document, or is too short", () => {
    const app = baseApp();
    expect(evidenceSupported(app, { source: "form", quote: "Traction: INR 16.5 L in October" })).toBe(false);
    expect(evidenceSupported(app, { source: "deck", quote: "Yes" })).toBe(false);
    expect(evidenceSupported(app, { source: "deck", quote: "The founders have ten years of experience" })).toBe(false);
  });
  it("checks research, recompute and conflict evidence against what the code holds", () => {
    const app = baseApp();
    expect(evidenceSupported(app, { source: "research", quote: "Several Indian vendors sell call intelligence." })).toBe(true);
    expect(evidenceSupported(app, { source: "research", quote: "A vendor that was never found anywhere" })).toBe(false);
    expect(evidenceSupported(app, { source: "recompute", quote: "TAM = 38M households x INR 2,400" })).toBe(true);
    expect(evidenceSupported(app, { source: "conflict", quote: "Paying customers" })).toBe(true);
  });
  it("works on a real application deck read from PDF", async () => {
    const t = await extractPdfText(pdf("GrainKind_Deck.pdf"));
    const app = baseApp();
    app.files[0] = { kind: "deck", filename: "GrainKind_Deck.pdf", pages: t.pages, text: t.text };
    expect(evidenceSupported(app, { source: "deck", quote: "Claims like 'natural' and 'high-fibre' are used loosely" })).toBe(true);
    expect(evidenceSupported(app, { source: "deck", quote: "Cohort data tracked Yes" })).toBe(true);
  });
});

describe("framework rules enforced in code", () => {
  const withCrit = (id: CriterionId, c: unknown) => {
    const o = goodOutput();
    (o.criteria as Record<string, unknown>)[id] = c;
    return o;
  };
  it("accepts a well-formed answer", () => {
    expect(validateScoring(baseApp(), goodOutput())).toEqual([]);
  });
  it("rejects a score above 8", () => {
    expect(validateScoring(baseApp(), withCrit("A1", crit({ score: 9 }))).join()).toMatch(/above 8/);
  });
  it("caps a stated absence on A3 at 4", () => {
    expect(validateScoring(baseApp(), withCrit("A3", crit({ status: "stated_absence", score: 6 }))).join()).toMatch(/capped at 4/);
    expect(validateScoring(baseApp(), withCrit("A3", crit({ status: "stated_absence", score: 3, evidence: [{ source: "form", quote: "We have not measured acquisition cost yet" }] })))).toEqual([]);
  });
  it("never allows a score on an unknown criterion, and demands what is missing", () => {
    const p = validateScoring(baseApp(), withCrit("B5", crit({ status: "unknown", score: 5, evidence: [] }))).join();
    expect(p).toMatch(/no score/);
    expect(p).toMatch(/what is missing/);
    expect(p).toMatch(/stops us judging/);
  });
  it("needs evidence and a class for a scored criterion", () => {
    const p = validateScoring(baseApp(), withCrit("B1", crit({ evidence: [], class: null }))).join();
    expect(p).toMatch(/at least one quote/);
    expect(p).toMatch(/class/);
  });
  it("rejects invented quotes", () => {
    const p = validateScoring(baseApp(), withCrit("A4", crit({ evidence: [{ source: "deck", quote: "Both founders are full-time since 2024" }] }))).join();
    expect(p).toMatch(/not in the deck text/);
  });
  it("needs a quote when flagging rule dependence", () => {
    const o = goodOutput();
    o.d2 = { value: "possible", reason: "regulatory risk", evidence: [] };
    expect(validateScoring(baseApp(), o).join()).toMatch(/D2/);
  });
});

describe("scoring run", () => {
  it("computes the score and lean in code from the model's evidence", async () => {
    const out = await scoreApplication(baseApp(), fixture([goodOutput()]));
    const s = out.scoring!;
    expect(s.attempts).toBe(1);
    expect(s.evaluation.score).toBeCloseTo(6, 5);
    expect(s.evaluation.lean).toBe("Further research required");
    expect(s.businessTypes.types).toEqual(["consumer"]);
  });
  it("retries once with the problems listed, then accepts a corrected answer", async () => {
    const bad = goodOutput();
    (bad.criteria as Record<string, unknown>).A1 = crit({ evidence: [{ source: "deck", quote: "an invented sentence that is not there" }] });
    const llm = fixture([bad, goodOutput()]);
    const out = await scoreApplication(baseApp(), llm);
    expect(out.scoring!.attempts).toBe(2);
    expect(llm.prompts[1]).toMatch(/REJECTED BY CODE/);
    expect(llm.prompts[1]).toMatch(/invented sentence/);
  });
  it("fails loudly after two bad answers, never repairing silently", async () => {
    const bad = goodOutput();
    (bad.criteria as Record<string, unknown>).A1 = crit({ score: 10 });
    await expect(scoreApplication(baseApp(), fixture([bad, bad]))).rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("needs extraction and the portfolio check first", async () => {
    const a = baseApp(); a.extraction = { status: "not_run" };
    await expect(scoreApplication(a, fixture([]))).rejects.toBeInstanceOf(ScoringStateError);
    const b = baseApp(); b.research = undefined;
    await expect(scoreApplication(b, fixture([]))).rejects.toBeInstanceOf(ScoringStateError);
  });
  it("derives the portfolio flag from the research check, not from the model", async () => {
    const a = baseApp();
    a.research!.portfolio!.checks = [{ company: "MeetRecord", overlap: "likely", reason: "same function" }];
    expect(d1From(a).flag).toBe("likely");
    const out = await scoreApplication(a, fixture([goodOutput()]));
    expect(out.scoring!.d1.flag).toBe("likely");
    expect(out.scoring!.evaluation.lean).toBe("Further research required");
  });
  it("includes the rubric, the quotes rule and the research in the prompt", () => {
    const p = buildScorePrompt(baseApp());
    expect(p).toMatch(/NEVER for missing information/);
    expect(p).toMatch(/Copy|copy the words EXACTLY/);
    expect(p).toMatch(/Several Indian vendors/);
    expect(p).toMatch(/DOES NOT MATCH/);
  });
  it("lets a reviewer change the business types and recomputes without the model", async () => {
    const out = await scoreApplication(baseApp(), fixture([goodOutput()]));
    const changed = applyBusinessTypes(out, ["lending", "network"]);
    expect(changed.scoring!.businessTypes.overriddenAt).toBeTruthy();
    expect(changed.scoring!.evaluation.keyCriteria).toEqual(expect.arrayContaining(["A1", "A2", "A3", "B3", "B2", "B4"]));
    expect(() => applyBusinessTypes(out, [])).toThrow(ScoringStateError);
    expect(() => applyBusinessTypes(baseApp(), ["other"])).toThrow(ScoringStateError);
  });
});
