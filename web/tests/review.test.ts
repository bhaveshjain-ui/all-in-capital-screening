import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import { CRITERIA } from "../lib/framework/config";
import { InvalidModelOutputError, type Llm } from "../lib/llm";
import {
  acceptCriteria, archiveReviewForRescore, correctCriterion, effectiveCriteria, effectiveEvaluation,
  recordDecision, ReviewError,
} from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import type { Application } from "../lib/schemas";

const NL = String.fromCharCode(10);

async function scoredApp(): Promise<Application> {
  const app: Application = {
    id: "11111111-2222-3333-4444-555555555555", name: "Demo", createdAt: new Date().toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Traction: INR 16.5 L in October. Blended CAC INR 340." }],
    extraction: {
      status: "done", model: "fixture", extractedAt: new Date().toISOString(),
      result: { company: { name: "Demo", sector_selected: "Consumer brands", founders: [] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } },
    },
    recompute: [], conflicts: [],
    research: {
      status: "done", model: "fixture", plannedAt: new Date().toISOString(), questions: [], completed: [], findings: [],
      portfolio: { checkedAt: new Date().toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [],
    },
  };
  const crit = (status: string, score: number | null) =>
    status === "unknown"
      ? { status, score: null, class: null, evidence: [], reasoning: "not mentioned", missing: "no figure", cost: "cannot judge" }
      : { status, score, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null };
  const base: Record<string, [string, number | null]> = {
    A1: ["scored", 6], A2: ["scored", 6], A3: ["scored", 6], A4: ["scored", 6], A5: ["scored", 6],
    B1: ["scored", 5], B2: ["unknown", null], B3: ["scored", 6], B4: ["scored", 6], B5: ["unknown", null], B6: ["scored", 6],
  };
  const out = {
    business_types: { types: ["consumer"], reason: "food brand" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, crit(...base[c.id])])),
    d2: { value: "not_triggered", reason: "none", evidence: [] },
  };
  const llm: Llm = {
    model: "fixture",
    async json<T>(_p: string, schema: ZodType<T>) {
      const r = schema.safeParse(out);
      if (!r.success) throw new InvalidModelOutputError("bad fixture");
      return r.data;
    },
  };
  return scoreApplication(app, llm);
}

const fix = (over: Record<string, unknown> = {}) => ({
  criterion: "B1", status: "scored", score: 7, reason: "the cohort sheet shows repeat is 38 percent", by: "Riya", ...over,
});

describe("corrections", () => {
  it("layer over the model's scoring and change the result, leaving the model's record intact", async () => {
    const app = await scoredApp();
    const before = effectiveEvaluation(app);
    const after = correctCriterion(app, fix());
    const ev = effectiveEvaluation(after);
    expect(ev.score!).toBeGreaterThan(before.score!);
    expect(after.scoring!.criteria.B1.score).toBe(5); // the model's score is untouched
    expect(effectiveCriteria(after).B1).toMatchObject({ score: 7, status: "scored" });
    expect(effectiveCriteria(after).B1.correction?.original).toEqual({ status: "scored", score: 5 });
  });
  it("uses the latest correction and records tags and an audit entry", async () => {
    let app = await scoredApp();
    app = correctCriterion(app, fix({ score: 7 }));
    app = correctCriterion(app, fix({ score: 8, reason: "second look: three cohorts all above 30 percent" }));
    expect(effectiveCriteria(app).B1.score).toBe(8);
    const last = app.review!.corrections.at(-1)!;
    expect(last.tags).toEqual({ businessTypes: ["consumer"], sector: "Consumer brands" });
    expect(last.original).toEqual({ status: "scored", score: 7 });
    expect(app.audit!.map((a) => a.type)).toEqual(["criterion_corrected", "criterion_corrected"]);
    expect(app.audit![0].by).toBe("Riya");
  });
  it("can turn a score into unknown, which then drops out of the average and coverage", async () => {
    const app = await scoredApp();
    const before = effectiveEvaluation(app);
    const after = correctCriterion(app, fix({ criterion: "B6", status: "unknown", score: null, reason: "the competitor claim cannot be tested" }));
    expect(effectiveEvaluation(after).coverageAdjusted).toBeLessThan(before.coverageAdjusted);
  });
  it("requires a real one-line reason", async () => {
    const app = await scoredApp();
    expect(() => correctCriterion(app, fix({ reason: "ok" }))).toThrow(ReviewError);
    expect(() => correctCriterion(app, fix({ reason: `line one is long enough${NL}and a second line` }))).toThrow(/one line/);
  });
  it("refuses a no-op, a score on an unknown criterion, and a scored criterion without a score", async () => {
    const app = await scoredApp();
    expect(() => correctCriterion(app, fix({ score: 5 }))).toThrow(/same as the current/);
    expect(() => correctCriterion(app, fix({ criterion: "B2", status: "unknown", score: 4 }))).toThrow(/never scored/);
    expect(() => correctCriterion(app, fix({ score: null }))).toThrow(/needs a score/);
    expect(() => correctCriterion(app, fix({ criterion: "ZZ" }))).toThrow(ReviewError);
  });
  it("requires a verification note above 8, and keeps the A3 stated-absence cap", async () => {
    const app = await scoredApp();
    expect(() => correctCriterion(app, fix({ score: 9 }))).toThrow(/independently verified/);
    const ok = correctCriterion(app, fix({ score: 9, verification: "cohort sheet seen and checked" }));
    expect(effectiveCriteria(ok).B1.score).toBe(9);
    expect(() => correctCriterion(app, fix({ criterion: "A3", status: "stated_absence", score: 6 }))).toThrow(/capped/);
  });
  it("needs a scored application", async () => {
    const app = await scoredApp();
    expect(() => correctCriterion({ ...app, scoring: undefined }, fix())).toThrow(ReviewError);
    expect(() => effectiveEvaluation({ ...app, scoring: undefined })).toThrow(ReviewError);
  });
});

describe("accepting, deciding and re-scoring", () => {
  it("accepting records the criteria; correcting afterwards clears the acceptance", async () => {
    let app = await scoredApp();
    app = acceptCriteria(app, { criteria: ["A1", "B1"], by: "Kushal" });
    expect(app.review!.accepted).toEqual(["A1", "B1"]);
    app = correctCriterion(app, fix());
    expect(app.review!.accepted).toEqual(["A1"]);
    expect(() => acceptCriteria(app, { criteria: [] })).toThrow(ReviewError);
  });
  it("records the decision as the reviewer's, with agreement against the system's current suggestion", async () => {
    const app = await scoredApp();
    const lean = effectiveEvaluation(app).lean;
    const agree = recordDecision(app, { value: lean, reason: "agree with the read after checking the cohort sheet", by: "Kushal" });
    expect(agree.review!.decision).toMatchObject({ value: lean, by: "Kushal", systemLean: lean, agreedWithSystem: true });
    const other = recordDecision(app, { value: "Pass", reason: "founder conflicts matter more than the score", by: "Kushal" });
    expect(other.review!.decision!.agreedWithSystem).toBe(false);
    expect(other.audit!.at(-1)!.detail).toMatch(/system suggested/);
    expect(() => recordDecision(app, { value: "Pass", reason: "no" })).toThrow(ReviewError);
    expect(() => recordDecision(app, { value: "Maybe", reason: "not a real outcome value" })).toThrow(ReviewError);
  });
  it("names an unnamed reviewer plainly, since there is no login", async () => {
    const app = correctCriterion(await scoredApp(), fix({ by: undefined }));
    expect(app.review!.corrections[0].by).toBe("unnamed reviewer");
  });
  it("archives the review when the application is scored again, and keeps the record", async () => {
    let app = await scoredApp();
    app = correctCriterion(app, fix());
    app = recordDecision(app, { value: "Pass", reason: "not enough evidence on repeat", by: "Kushal" });
    const re = archiveReviewForRescore(app);
    expect(re.review).toBeUndefined();
    expect(re.archivedReviews).toHaveLength(1);
    expect(re.archivedReviews![0].corrections).toHaveLength(1);
    expect(re.audit!.at(-1)!.type).toBe("review_archived");
    const untouched = archiveReviewForRescore(await scoredApp());
    expect(untouched.archivedReviews).toBeUndefined();
  });
});
