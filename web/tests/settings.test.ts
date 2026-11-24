import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CRITERIA, DEFAULT_PARAMS } from "../lib/framework/config";
import { applySettingsChange, currentValues, FRAMEWORK_DEFAULTS, SettingsError } from "../lib/settings";
import { agreement, runBacktest, runTrial, thresholdGrid, weightSensitivity, liveDecisions } from "../lib/evaluation";
import { FileStore } from "../lib/store/file";

const base = () => {
  const d = FRAMEWORK_DEFAULTS();
  return { params: { ...d.params }, weights: { ...d.weights }, reason: "Partners agreed on a new bar", by: "Test" };
};

describe("settings", () => {
  it("starts at the framework values", () => {
    expect(currentValues(null).params.takeThreshold).toBe(DEFAULT_PARAMS.takeThreshold);
    expect(Object.values(currentValues(null).weights).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("applies a valid change and records history", () => {
    const i = base();
    i.params.takeThreshold = 6.5;
    const doc = applySettingsChange(null, i);
    expect(doc.current.params.takeThreshold).toBe(6.5);
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].changes[0]).toContain("7 -> 6.5");
    expect(doc.history[0].by).toBe("Test");
  });
  it("rejects weights that do not sum to 100", () => {
    const i = base();
    i.weights.A1 += 1;
    expect(() => applySettingsChange(null, i)).toThrow(/100/);
  });
  it("rejects take <= pass, a short reason, no change and an excessive A3 cap", () => {
    let i = base(); i.params.takeThreshold = 4; expect(() => applySettingsChange(null, i)).toThrow(SettingsError);
    i = base(); i.reason = "short"; expect(() => applySettingsChange(null, i)).toThrow();
    expect(() => applySettingsChange(null, base())).toThrow(/Nothing changed/);
    i = base(); i.params.statedAbsenceCapA3 = 9; i.params.unverifiedCap = 8; expect(() => applySettingsChange(null, i)).toThrow(/cap/i);
  });
  it("rejects non-integer weights", () => {
    const i = base(); i.weights.A1 = 22.5; i.weights.B1 = 17.5;
    expect(() => applySettingsChange(null, i)).toThrow();
  });
});

describe("evaluation", () => {
  const v = FRAMEWORK_DEFAULTS();
  it("agreement rule", () => {
    expect(agreement("Invested", "Take a call")).toBe("agree");
    expect(agreement("Invested", "Further research required")).toBe("soft");
    expect(agreement("Invested", "Pass")).toBe("hard");
    expect(agreement("Passed", "Pass")).toBe("agree");
    expect(agreement("Passed", "Take a call")).toBe("hard");
  });
  it("backtest reproduces the reported result at the starting values", () => {
    const b = runBacktest(v);
    expect(b.rows).toHaveLength(12);
    expect(b.tally).toEqual({ agree: 5, soft: 6, hard: 1 });
    expect(b.leans["Take a call"]).toBe(0);
    expect(b.rows.find((r) => r.agreement === "hard")?.name).toMatch(/eplane/i);
  });
  it("trial reproduces the stability figures", () => {
    const t = runTrial(v);
    expect(t.rows).toHaveLength(10);
    expect(t.leanAgreement).toBe(9);
    expect(t.meanAbsDiff).toBeCloseTo(0.27, 1);
    expect(t.spearman).toBeCloseTo(0.82, 1);
  });
  it("lowering the take threshold produces Take a call results", () => {
    const low = { ...v, params: { ...v.params, takeThreshold: 5, passThreshold: 3 } };
    expect(runBacktest(low).leans["Take a call"]).toBeGreaterThan(0);
  });
  it("threshold grid has 20 cells and weight sensitivity runs", () => {
    expect(thresholdGrid(v)).toHaveLength(20);
    expect(Array.isArray(weightSensitivity(v))).toBe(true);
  });
  it("live decisions with no data", () => {
    expect(liveDecisions([])).toMatchObject({ scored: 0, decided: 0, agreed: 0 });
  });
  it("bundled eval data equals the root data folder", () => {
    const root = join(__dirname, "..", "..", "data");
    const pairs: [string, string][] = [["backtest", "backtest"], ["trial_scoring", "trial"], ["trial_scoring/pass2", "trial2"]];
    for (const [src, dst] of pairs) {
      const sd = join(root, src);
      if (!existsSync(sd)) continue;
      const bundled = readdirSync(join(__dirname, "..", "data", "eval", dst)).filter((f) => f.endsWith(".json"));
      expect(bundled.length).toBeGreaterThan(0);
      for (const f of bundled) {
        if (existsSync(join(sd, f))) expect(readFileSync(join(__dirname, "..", "data", "eval", dst, f), "utf8")).toBe(readFileSync(join(sd, f), "utf8"));
      }
    }
  });
});

describe("settings store", () => {
  it("round-trips through the file store", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const store = new FileStore(mkdtempSync(join(tmpdir(), "aic-")));
    expect(await store.getSettings()).toBeNull();
    const i = base(); i.params.coverageMin = 70;
    const doc = applySettingsChange(null, i);
    await store.saveSettings(doc);
    expect((await store.getSettings())!.current.params.coverageMin).toBe(70);
  });
});
void CRITERIA;
