import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, type EvaluationInput, type Lean } from "../lib/framework/score";
import type { BusinessType, CriterionId } from "../lib/framework/config";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = (...p: string[]) => path.resolve(here, "../../data", ...p);

function load(files: string[]): any[] {
  return files.flatMap((f) => JSON.parse(fs.readFileSync(data(f), "utf8")));
}

function toInput(c: any, types: BusinessType[]): EvaluationInput {
  const criteria = {} as EvaluationInput["criteria"];
  for (const id of Object.keys(c.criteria) as CriterionId[]) {
    criteria[id] = { status: c.criteria[id].status, score: c.criteria[id].score ?? null };
  }
  return {
    criteria,
    businessTypes: types,
    d1: c.D1?.flag ?? "none",
    d2: c.D2?.value ?? "unknown",
  };
}

// Expected values are the numbers already reported by the Python scripts used for the
// backtest and the trial scoring (docs/backtest_report.md, docs/trial_scoring_report.md).
const BACKTEST_TYPES: Record<string, BusinessType[]> = {
  "ePlane": ["deeptech"], "Petalry": ["consumer"], "Unbox Robotics": ["deeptech"],
  "HopBox": ["network"], "Wint Wealth": ["other"], "CampusCredit": ["lending"],
  "Giva": ["consumer"], "AeroDrop": ["deeptech"], "SuperK": ["network"],
  "Coinlane": ["regdep"], "Jai Kisan": ["lending"], "Prepnest": ["other"],
};
const BACKTEST_EXPECT: Record<string, [number, Lean]> = {
  "ePlane": [3.81, "Pass"], "Petalry": [3.17, "Pass"], "Unbox Robotics": [5.73, "Further research required"],
  "HopBox": [3.18, "Pass"], "Wint Wealth": [5.05, "Further research required"],
  "CampusCredit": [1.70, "Further research required"], "Giva": [5.23, "Further research required"],
  "AeroDrop": [2.48, "Pass"], "SuperK": [4.31, "Further research required"], "Coinlane": [2.97, "Pass"],
  "Jai Kisan": [5.53, "Further research required"], "Prepnest": [2.62, "Pass"],
};

const APP_TYPES: Record<string, BusinessType[]> = {
  CAPilot: ["other"], CareCorner: ["network"], EarnWise: ["lending"], GrainKind: ["consumer"],
  Pumpwise: ["deeptech"], RentRoute: ["regdep"], Settlr: ["lending"],
  StockSathi: ["network", "lending"], Talkbook: ["other"], Yatrika: ["other"],
};
const PASS1_EXPECT: Record<string, [number, Lean]> = {
  CAPilot: [4.83, "Further research required"], CareCorner: [5.64, "Further research required"],
  EarnWise: [3.15, "Pass"], GrainKind: [6.32, "Further research required"],
  Pumpwise: [5.57, "Further research required"], RentRoute: [4.30, "Further research required"],
  Settlr: [4.51, "Further research required"], StockSathi: [5.19, "Further research required"],
  Talkbook: [5.00, "Further research required"], Yatrika: [5.08, "Further research required"],
};
const PASS2_EXPECT: Record<string, [number, Lean]> = {
  CAPilot: [4.74, "Further research required"], CareCorner: [5.46, "Further research required"],
  EarnWise: [3.29, "Pass"], GrainKind: [6.24, "Further research required"],
  Pumpwise: [5.79, "Further research required"], RentRoute: [3.97, "Pass"],
  Settlr: [5.29, "Further research required"], StockSathi: [4.75, "Further research required"],
  Talkbook: [5.23, "Further research required"], Yatrika: [4.88, "Further research required"],
};

function check(cases: any[], types: Record<string, BusinessType[]>, expected: Record<string, [number, Lean]>, key: "case" | "app") {
  for (const c of cases) {
    const name = c[key];
    const [s, lean] = expected[name];
    const r = evaluate(toInput(c, types[name]));
    expect(r.score, name).not.toBeNull();
    expect(Math.abs((r.score as number) - s), `${name} score ${r.score}`).toBeLessThan(0.006);
    expect(r.lean, name).toBe(lean);
  }
  expect(cases.length).toBe(Object.keys(expected).length);
}

describe("scoring engine reproduces the reported results", () => {
  it("backtest: 12 memo companies", () => {
    const cases = load(["backtest/results_1.json", "backtest/results_2.json", "backtest/results_3.json", "backtest/results_4.json"]);
    check(cases, BACKTEST_TYPES, BACKTEST_EXPECT, "case");
  });
  it("trial pass 1: 10 applications", () => {
    const cases = load(["trial_scoring/apps_1.json", "trial_scoring/apps_2.json", "trial_scoring/apps_3.json", "trial_scoring/apps_4.json", "trial_scoring/apps_5.json"]);
    check(cases, APP_TYPES, PASS1_EXPECT, "app");
  });
  it("trial pass 2: 10 applications", () => {
    const cases = load(["trial_scoring/pass2/apps2_1.json", "trial_scoring/pass2/apps2_2.json", "trial_scoring/pass2/apps2_3.json", "trial_scoring/pass2/apps2_4.json", "trial_scoring/pass2/apps2_5.json"]);
    check(cases, APP_TYPES, PASS2_EXPECT, "app");
  });
});

describe("rules", () => {
  const base = (over: Partial<Record<CriterionId, number | null>> = {}): EvaluationInput => {
    const ids: CriterionId[] = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6"];
    const criteria = {} as EvaluationInput["criteria"];
    for (const id of ids) {
      const v: number | null = id in over ? (over[id] as number | null) : 8;
      criteria[id] = v === null ? { status: "unknown", score: null } : { status: "scored", score: v };
    }
    return { criteria, businessTypes: ["other"], d1: "none", d2: "not_triggered" };
  };

  it("takes a call when everything is strong and key criteria are scored", () => {
    expect(evaluate(base()).lean).toBe("Take a call");
  });
  it("never scores missing information as negative: unknown is left out of the average", () => {
    const r = evaluate(base({ B5: null }));
    expect(r.score).toBeCloseTo(8, 5);
    expect(r.coverageAdjusted).toBeCloseTo(96, 0);
  });
  it("blocks Take a call when a key criterion is unknown", () => {
    const r = evaluate(base({ B1: null }));
    expect(r.keyMissing).toContain("B1");
    expect(r.lean).toBe("Further research required");
  });
  it("blocks Take a call when owns-the-risk is weak", () => {
    expect(evaluate(base({ A2: 4 })).lean).toBe("Further research required");
  });
  it("a portfolio conflict sends the application to research", () => {
    const r = evaluate({ ...base(), d1: "likely" });
    expect(r.lean).toBe("Further research required");
    expect(r.leanWithoutD1).toBe("Take a call");
  });
  it("D2 triggered gives Pass for partner confirmation", () => {
    expect(evaluate({ ...base(), d2: "triggered" }).lean).toBe("Pass");
  });
  it("a thin file cannot be a Pass", () => {
    const ids: CriterionId[] = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6"];
    const input = base();
    for (const id of ids) if (id !== "A2" && id !== "A5") input.criteria[id] = { status: "unknown", score: null };
    input.criteria.A2 = { status: "scored", score: 1 };
    input.criteria.A5 = { status: "scored", score: 1 };
    const r = evaluate(input);
    expect(r.score).toBeCloseTo(1, 5);
    expect(r.coverageAdjusted).toBeLessThan(75);
    expect(r.lean).toBe("Further research required");
  });
  it("the borderline band routes near-threshold scores to research (off by default)", () => {
    const input = base();
    for (const id of Object.keys(input.criteria) as CriterionId[]) input.criteria[id] = { status: "scored", score: 7.2 };
    expect(evaluate(input).lean).toBe("Take a call");
    expect(evaluate(input, { ...{ takeThreshold: 7, passThreshold: 4, coverageMin: 75, a2Min: 5, unverifiedCap: 8, statedAbsenceCapA3: 4 }, borderlineBand: 0.5 }).lean).toBe("Further research required");
  });
});
