import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ZodType } from "zod";
import { CRITERIA, type BusinessType, type CriterionId } from "../lib/framework/config";
import { InvalidModelOutputError, type Llm } from "../lib/llm";
import { memoryFor, similarCorrections, toView } from "../lib/memory";
import { buildScorePrompt } from "../lib/prompts/score";
import { correctCriterion } from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import { FileStore } from "../lib/store/file";
import type { Application } from "../lib/schemas";

let counter = 0;
async function scored(name: string, types: BusinessType[], sector: string, modelScores: Partial<Record<CriterionId, number>> = {}): Promise<Application> {
  const id = `00000000-0000-0000-0000-${String(++counter).padStart(12, "0")}`;
  const app: Application = {
    id, name, createdAt: new Date(2026, 10, counter).toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Traction: INR 16.5 L in October. We have not measured acquisition cost yet." }],
    extraction: {
      status: "done", model: "fixture", extractedAt: new Date().toISOString(),
      result: { company: { name, sector_selected: sector, founders: [] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } },
    },
    recompute: [], conflicts: [],
    research: {
      status: "done", model: "fixture", plannedAt: new Date().toISOString(), questions: [], completed: [], findings: [],
      portfolio: { checkedAt: new Date().toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [],
    },
  };
  const out = {
    business_types: { types, reason: "fixture" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, {
      status: "scored", score: modelScores[c.id] ?? 5, class: "S-u",
      evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null,
    }])),
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

const correct = (app: Application, criterion: CriterionId, score: number, reason: string, by = "Riya") =>
  correctCriterion(app, { criterion, status: "scored", score, reason, by });

describe("correction memory", () => {
  it("shows a past correction on a similar company for the same criterion, with the reasons", async () => {
    const past = correct(await scored("PastCo", ["consumer"], "Consumer brands"), "A3", 7, "cohort sheet in the form proves the repeat numbers");
    const target = await scored("NewCo", ["consumer"], "Consumer brands");
    const m = similarCorrections(target, [past], "A3");
    expect(m).toHaveLength(1);
    expect(m[0].company).toBe("PastCo");
    expect(m[0].reasons.join(" ")).toMatch(/same business type \(consumer\)/);
    expect(m[0].reasons.join(" ")).toMatch(/same sector/);
    expect(m[0].reasons.join(" ")).toMatch(/model also gave 5/);
    expect(similarCorrections(target, [past], "B1")).toHaveLength(0); // other criterion
  });
  it("never matches the application against itself", async () => {
    const a = correct(await scored("Solo", ["consumer"], "x"), "A3", 7, "a reason that is long enough here");
    expect(similarCorrections(a, [a], "A3")).toHaveLength(0);
  });
  it("ignores companies that are not similar", async () => {
    const past = correct(await scored("LenderCo", ["lending"], "Fintech", { A3: 2 }), "A3", 4, "loss data supplied separately by the applicant");
    const target = await scored("FoodCo", ["consumer"], "Consumer brands", { A3: 7 });
    expect(similarCorrections(target, [past], "A3")).toHaveLength(0);
  });
  it("uses only the latest correction per criterion within a review", async () => {
    let past = await scored("PastCo", ["consumer"], "Consumer brands");
    past = correct(past, "B1", 7, "first look at the traction numbers shown");
    past = correct(past, "B1", 8, "second look: three cohorts all above thirty percent");
    const m = similarCorrections(await scored("NewCo", ["consumer"], "Consumer brands"), [past], "B1");
    expect(m).toHaveLength(1);
    expect(m[0].correction.corrected.score).toBe(8);
  });
  it("includes corrections from an earlier scoring, marked as such", async () => {
    const past = await scored("PastCo", ["consumer"], "Consumer brands");
    const withReview = correct(past, "A2", 3, "applicant delegates the credit risk to a partner");
    const archived: Application = { ...withReview, review: undefined, archivedReviews: [withReview.review!] };
    const m = similarCorrections(await scored("NewCo", ["consumer"], "Consumer brands"), [archived], "A2");
    expect(m).toHaveLength(1);
    expect(m[0].archived).toBe(true);
    expect(toView(m[0]).company).toMatch(/earlier scoring/);
  });
  it("ranks closer matches first and respects the limit", async () => {
    const target = await scored("NewCo", ["consumer"], "Consumer brands", { A3: 5 });
    const near = correct(await scored("Near", ["consumer"], "Consumer brands", { A3: 5 }), "A3", 7, "near match with the same sector and score");
    const far = correct(await scored("Far", ["consumer", "lending"], "Fintech", { A3: 8 }), "A3", 6, "shares only the business type with this one");
    const m = similarCorrections(target, [far, near], "A3");
    expect(m.map((x) => x.company)).toEqual(["Near", "Far"]);
    expect(similarCorrections(target, [far, near], "A3", 1)).toHaveLength(1);
  });
  it("returns a plain, serialisable view for the page", async () => {
    const past = correct(await scored("PastCo", ["consumer"], "Consumer brands"), "A3", 7, "cohort sheet in the form proves the repeat numbers");
    const [m] = similarCorrections(await scored("NewCo", ["consumer"], "Consumer brands"), [past], "A3");
    expect(toView(m)).toMatchObject({ company: "PastCo", by: "Riya", original: "5 (scored)", corrected: "7 (scored)" });
    expect(() => JSON.stringify(toView(m))).not.toThrow();
  });
  it("covers every criterion and needs a scored target", async () => {
    const target = await scored("NewCo", ["consumer"], "Consumer brands");
    expect(Object.keys(memoryFor(target, [])).sort()).toEqual(CRITERIA.map((c) => c.id).sort());
    expect(similarCorrections({ ...target, scoring: undefined }, [], "A1")).toEqual([]);
  });
});

describe("precedent in scoring", () => {
  it("is added to the prompt only when given, with the warning that it is not a rule", async () => {
    const past = correct(await scored("PastCo", ["consumer"], "Consumer brands"), "A3", 7, "cohort sheet in the form proves the repeat numbers");
    const target = await scored("NewCo", ["consumer"], "Consumer brands");
    const matches = similarCorrections(target, [past], "A3");
    expect(buildScorePrompt(target)).not.toMatch(/PAST REVIEWER CORRECTIONS/);
    const p = buildScorePrompt(target, undefined, matches);
    expect(p).toMatch(/PAST REVIEWER CORRECTIONS ON SIMILAR COMPANIES \(precedent, not rules\)/);
    expect(p).toMatch(/must still come from THIS application/);
    expect(p).toMatch(/cohort sheet in the form proves the repeat numbers/);
  });
  it("records which corrections were shown, and nothing when none were", async () => {
    const past = correct(await scored("PastCo", ["consumer"], "Consumer brands"), "A3", 7, "cohort sheet in the form proves the repeat numbers");
    const target = await scored("NewCo", ["consumer"], "Consumer brands");
    expect(target.scoring!.memoryUsed).toEqual([]);
    const matches = similarCorrections(target, [past], "A3");
    const llm: Llm = {
      model: "fixture",
      async json<T>(_p: string, schema: ZodType<T>) {
        const r = schema.safeParse({
          business_types: { types: ["consumer"], reason: "fixture" },
          criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, { status: "scored", score: 5, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null }])),
          d2: { value: "not_triggered", reason: "none", evidence: [] },
        });
        if (!r.success) throw new InvalidModelOutputError("bad");
        return r.data;
      },
    };
    const again = await scoreApplication(target, llm, undefined, matches);
    expect(again.scoring!.memoryUsed).toEqual([{ correctionId: matches[0].correction.id, company: "PastCo", criterion: "A3" }]);
    // precedent changes nothing about the rules: the same checks and the same maths apply
    expect(again.scoring!.evaluation.score).toBeCloseTo(5, 5);
  });
});

describe("store access across applications", () => {
  it("returns every application in full, newest first", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aic-all-"));
    const store = new FileStore(dir);
    const a = await scored("A", ["consumer"], "x");
    const b = await scored("B", ["consumer"], "x");
    await store.save(a);
    await store.save(b);
    const all = await store.all();
    expect(all.map((x) => x.name)).toEqual(["B", "A"]);
    expect(all[0].scoring).toBeDefined();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
