import { CRITERIA, type BusinessType, type CriterionId, type FrameworkParams } from "../framework/config";
import { evaluate, type EvaluationInput, type Lean } from "../framework/score";
import type { Application } from "../schemas";
import type { SettingsValues } from "../settings";
import {
  APP_TYPES, BACKTEST_DECISIONS, BACKTEST_RAW, BACKTEST_TYPES, TRIAL_PASS1_RAW, TRIAL_PASS2_RAW, type RawCase,
} from "./datasets";

export type Agreement = "agree" | "soft" | "hard";

function toInput(c: RawCase, types: BusinessType[]): EvaluationInput {
  const criteria = {} as EvaluationInput["criteria"];
  for (const id of Object.keys(c.criteria) as CriterionId[]) {
    criteria[id] = { status: c.criteria[id].status as EvaluationInput["criteria"][CriterionId]["status"], score: c.criteria[id].score ?? null };
  }
  return {
    criteria, businessTypes: types,
    d1: (c.D1?.flag ?? "none") as EvaluationInput["d1"],
    d2: (c.D2?.value ?? "unknown") as EvaluationInput["d2"],
  };
}

/** The agreement rule fixed before the backtest was run (docs/backtest_protocol.md). */
export function agreement(decision: "Invested" | "Passed", lean: Lean): Agreement {
  if (decision === "Invested") return lean === "Take a call" ? "agree" : lean === "Further research required" ? "soft" : "hard";
  return lean === "Pass" ? "agree" : lean === "Further research required" ? "soft" : "hard";
}

export interface BacktestRow {
  name: string;
  fund: "Invested" | "Passed";
  score: number | null;
  coverage: number;
  lean: Lean;
  agreement: Agreement;
}

export interface BacktestResult {
  rows: BacktestRow[];
  tally: Record<Agreement, number>;
  leans: Record<Lean, number>;
  /** Pairs (of 36) where the invested company outscored the passed one. */
  investedAbovePassed: number;
  minInvested: number;
  maxPassed: number;
}

export function runBacktest(v: SettingsValues): BacktestResult {
  const rows: BacktestRow[] = BACKTEST_RAW.map((c) => {
    const name = c.case as string;
    const ev = evaluate(toInput(c, BACKTEST_TYPES[name]), v.params, v.weights);
    const fund = BACKTEST_DECISIONS[name];
    return { name, fund, score: ev.score, coverage: ev.coverageAdjusted, lean: ev.lean, agreement: agreement(fund, ev.lean) };
  });
  const tally: Record<Agreement, number> = { agree: 0, soft: 0, hard: 0 };
  const leans: Record<Lean, number> = { "Take a call": 0, "Further research required": 0, Pass: 0 };
  for (const r of rows) { tally[r.agreement]++; leans[r.lean]++; }
  const inv = rows.filter((r) => r.fund === "Invested").map((r) => r.score ?? 0);
  const pas = rows.filter((r) => r.fund === "Passed").map((r) => r.score ?? 0);
  let pairs = 0;
  for (const a of inv) for (const b of pas) if (a > b) pairs++;
  return { rows, tally, leans, investedAbovePassed: pairs, minInvested: Math.min(...inv), maxPassed: Math.max(...pas) };
}

export interface TrialRow {
  name: string;
  score1: number | null; score2: number | null;
  lean1: Lean; lean2: Lean;
  coverage1: number; coverage2: number;
}

export interface TrialResult {
  rows: TrialRow[];
  leanAgreement: number;
  meanAbsDiff: number;
  spearman: number;
  leans1: Record<Lean, number>;
  leans2: Record<Lean, number>;
}

function spearman(a: number[], b: number[]): number {
  const ranks = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(v.length);
    order.forEach(([, i], rank) => { r[i] = rank + 1; });
    return r;
  };
  const ra = ranks(a), rb = ranks(b), n = a.length;
  const d2 = ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function runTrial(v: SettingsValues): TrialResult {
  const second = new Map(TRIAL_PASS2_RAW.map((c) => [c.app as string, c]));
  const rows: TrialRow[] = TRIAL_PASS1_RAW.map((c) => {
    const name = c.app as string;
    const e1 = evaluate(toInput(c, APP_TYPES[name]), v.params, v.weights);
    const e2 = evaluate(toInput(second.get(name)!, APP_TYPES[name]), v.params, v.weights);
    return { name, score1: e1.score, score2: e2.score, lean1: e1.lean, lean2: e2.lean, coverage1: e1.coverageAdjusted, coverage2: e2.coverageAdjusted };
  });
  const count = (key: "lean1" | "lean2") => {
    const m: Record<Lean, number> = { "Take a call": 0, "Further research required": 0, Pass: 0 };
    rows.forEach((r) => m[r[key]]++);
    return m;
  };
  const s1 = rows.map((r) => r.score1 ?? 0), s2 = rows.map((r) => r.score2 ?? 0);
  return {
    rows,
    leanAgreement: rows.filter((r) => r.lean1 === r.lean2).length,
    meanAbsDiff: s1.reduce((s, x, i) => s + Math.abs(x - s2[i]), 0) / rows.length,
    spearman: spearman(s1, s2),
    leans1: count("lean1"), leans2: count("lean2"),
  };
}

export interface GridCell { take: number; pass: number; agree: number; soft: number; hard: number; takes: number }

/** Backtest agreement for a grid of thresholds, with everything else as saved. */
export function thresholdGrid(v: SettingsValues, takes = [6, 6.5, 7, 7.5], passes = [3, 3.5, 4, 4.5, 5]): GridCell[] {
  const cells: GridCell[] = [];
  for (const take of takes) {
    for (const pass of passes) {
      const params: FrameworkParams = { ...v.params, takeThreshold: take, passThreshold: pass };
      const r = runBacktest({ ...v, params });
      cells.push({ take, pass, agree: r.tally.agree, soft: r.tally.soft, hard: r.tally.hard, takes: r.leans["Take a call"] });
    }
  }
  return cells;
}

export interface Flip { criterion: CriterionId; delta: number; set: string; name: string; from: Lean; to: Lean }

/** Which recommendations change if one weight moves by a point (renormalised to 100). */
export function weightSensitivity(v: SettingsValues): Flip[] {
  const base = {
    back: runBacktest(v).rows.map((r) => r.lean),
    trial: runTrial(v).rows.map((r) => [r.lean1, r.lean2] as const),
  };
  const flips: Flip[] = [];
  for (const c of CRITERIA) {
    for (const delta of [-1, 1]) {
      const w = { ...v.weights, [c.id]: Math.max(0, v.weights[c.id] + delta) };
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      const scaled = Object.fromEntries(Object.entries(w).map(([k, x]) => [k, (x * 100) / total])) as Record<CriterionId, number>;
      const alt: SettingsValues = { ...v, weights: scaled };
      const b = runBacktest(alt).rows;
      b.forEach((r, i) => { if (r.lean !== base.back[i]) flips.push({ criterion: c.id, delta, set: "backtest", name: r.name, from: base.back[i], to: r.lean }); });
      const t = runTrial(alt).rows;
      t.forEach((r, i) => {
        if (r.lean1 !== base.trial[i][0]) flips.push({ criterion: c.id, delta, set: "trial pass 1", name: r.name, from: base.trial[i][0], to: r.lean1 });
        if (r.lean2 !== base.trial[i][1]) flips.push({ criterion: c.id, delta, set: "trial pass 2", name: r.name, from: base.trial[i][1], to: r.lean2 });
      });
    }
  }
  return flips;
}

export interface LiveDecisionSummary {
  scored: number;
  decided: number;
  agreed: number;
  rows: { name: string; decision: string; systemLean: string; agreed: boolean; by: string; at: string }[];
}

/** Real decisions recorded in the app: how often reviewers agreed with the suggestion. */
export function liveDecisions(apps: Application[]): LiveDecisionSummary {
  const rows = apps
    .filter((a) => a.review?.decision)
    .map((a) => {
      const d = a.review!.decision!;
      return { name: a.name, decision: d.value, systemLean: d.systemLean, agreed: d.agreedWithSystem, by: d.by, at: d.at };
    });
  return { scored: apps.filter((a) => a.scoring).length, decided: rows.length, agreed: rows.filter((r) => r.agreed).length, rows };
}
