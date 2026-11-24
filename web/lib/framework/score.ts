// Deterministic scoring engine. Mirrors the rules in docs/scoring_framework.md.
// The model never computes a total or a lean: it only returns per-criterion evidence,
// and this code turns that into a score, coverage and a suggested lean.

import {
  CRITERIA, DEFAULT_PARAMS, KEY_EXTRA, weightsOf,
  type BusinessType, type CriterionId, type FrameworkParams,
} from "./config";

export type Status = "scored" | "unknown" | "stated_absence" | "na";
export type Lean = "Take a call" | "Further research required" | "Pass";
export type D1Flag = "none" | "possible" | "likely";
export type D2Value = "triggered" | "possible" | "not_triggered" | "unknown";

export interface CriterionResult {
  status: Status;
  score: number | null;
}

export interface EvaluationInput {
  criteria: Record<CriterionId, CriterionResult>;
  businessTypes: BusinessType[];
  d1?: D1Flag;
  d2?: D2Value;
}

export interface Evaluation {
  score: number | null;
  /** Percent of total weight that is scored. */
  coverageRaw: number;
  /** Percent of applicable weight (N/A removed) that is scored. */
  coverageAdjusted: number;
  keyCriteria: CriterionId[];
  keyMissing: CriterionId[];
  a2: number | null;
  d1: D1Flag;
  d2: D2Value;
  lean: Lean;
  /** Lean before the portfolio-conflict override. */
  leanWithoutD1: Lean;
  reasons: string[];
}

const isScored = (r: CriterionResult) =>
  (r.status === "scored" || r.status === "stated_absence") && r.score !== null;

export function evaluate(
  input: EvaluationInput,
  params: FrameworkParams = DEFAULT_PARAMS,
  weights: Record<CriterionId, number> = weightsOf(CRITERIA),
): Evaluation {
  const ids = Object.keys(weights) as CriterionId[];
  const totalWeight = ids.reduce((s, id) => s + weights[id], 0);

  let scoredWeight = 0, weighted = 0, naWeight = 0;
  for (const id of ids) {
    const r = input.criteria[id];
    if (isScored(r)) {
      scoredWeight += weights[id];
      weighted += weights[id] * (r.score as number);
    } else if (r.status === "na") {
      naWeight += weights[id];
    }
  }

  const score = scoredWeight > 0 ? weighted / scoredWeight : null;
  const coverageRaw = (100 * scoredWeight) / totalWeight;
  const applicable = totalWeight - naWeight;
  const coverageAdjusted = applicable > 0 ? (100 * scoredWeight) / applicable : 0;

  const keyCriteria: CriterionId[] = ["A1", "A2"];
  for (const t of input.businessTypes) {
    for (const id of KEY_EXTRA[t]) if (!keyCriteria.includes(id)) keyCriteria.push(id);
  }
  const keyMissing = keyCriteria.filter(
    (id) => !isScored(input.criteria[id]) && input.criteria[id].status !== "na",
  );

  const a2 = isScored(input.criteria.A2) ? (input.criteria.A2.score as number) : null;
  const d1: D1Flag = input.d1 ?? "none";
  const d2: D2Value = input.d2 ?? "unknown";
  const reasons: string[] = [];

  let lean: Lean = "Further research required";
  const band = params.borderlineBand;

  if (d2 === "triggered") {
    lean = "Pass";
    reasons.push("Business appears to exist only if rules change favourably (D2 triggered).");
  } else if (score !== null && coverageAdjusted >= params.coverageMin && score <= params.passThreshold) {
    lean = "Pass";
    reasons.push(`Score ${score.toFixed(2)} at or below ${params.passThreshold} with coverage ${coverageAdjusted.toFixed(0)}%.`);
  } else if (
    score !== null && score >= params.takeThreshold && coverageAdjusted >= params.coverageMin &&
    keyMissing.length === 0 && a2 !== null && a2 >= params.a2Min && d2 !== "possible"
  ) {
    lean = "Take a call";
    reasons.push(`Score ${score.toFixed(2)} at or above ${params.takeThreshold}, key criteria scored, owns-the-risk ${a2}.`);
  } else {
    if (score === null) reasons.push("No criterion could be scored.");
    else {
      if (coverageAdjusted < params.coverageMin) reasons.push(`Coverage ${coverageAdjusted.toFixed(0)}% is below ${params.coverageMin}%.`);
      if (keyMissing.length) reasons.push(`Key criteria not scored: ${keyMissing.join(", ")}.`);
      if (score > params.passThreshold && score < params.takeThreshold) reasons.push(`Score ${score.toFixed(2)} sits between the Pass and Take-a-call thresholds.`);
      if (score >= params.takeThreshold && a2 !== null && a2 < params.a2Min) reasons.push(`Owns-the-risk score ${a2} is below ${params.a2Min}.`);
      if (d2 === "possible") reasons.push("Possible rule dependence (D2) is unresolved.");
    }
  }

  // Optional borderline band (a partner decision; off when 0).
  if (band > 0 && score !== null) {
    const nearTake = score >= params.takeThreshold - band && score < params.takeThreshold + band;
    const nearPass = score <= params.passThreshold + band && score > params.passThreshold - band;
    if ((lean === "Take a call" && nearTake) || (lean === "Pass" && nearPass && d2 !== "triggered")) {
      lean = "Further research required";
      reasons.push(`Score is within ${band} of a threshold, so it goes to research.`);
    }
  }

  const leanWithoutD1 = lean;
  if (d1 !== "none" && !(lean === "Pass" && d2 === "triggered")) {
    if (lean !== "Further research required") reasons.push(`Possible overlap with a portfolio company (${d1}); partner conversation first.`);
    lean = "Further research required";
  }

  return { score, coverageRaw, coverageAdjusted, keyCriteria, keyMissing, a2, d1, d2, lean, leanWithoutD1, reasons };
}
