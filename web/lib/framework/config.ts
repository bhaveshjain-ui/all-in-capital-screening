// Framework configuration. Source of truth: docs/scoring_framework.md (v1, provisional).
// Every number here is a partner-set parameter, not a fixed rule. Change values here
// (later: from the Settings page) rather than in the scoring code.

export type CriterionId =
  | "A1" | "A2" | "A3" | "A4" | "A5"
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6";

export interface CriterionDef {
  id: CriterionId;
  block: "founder" | "path";
  name: string;
  weight: number;
  /** Memos (of 12) that name this criterion as a reason; the basis of the weight. */
  memoCount: number;
  rationale: string;
}

export const CRITERIA: CriterionDef[] = [
  { id: "A1", block: "founder", name: "Founder–market fit", weight: 22, memoCount: 5,
    rationale: "Named as a reason in 5 of 12 memos; public interview calls it the core test." },
  { id: "B1", block: "path", name: "Customer evidence and traction", weight: 18, memoCount: 4,
    rationale: "Named in 4 of 12 memos (Petalry, Unbox, AeroDrop, Prepnest)." },
  { id: "A2", block: "founder", name: "Founder owns the central risk", weight: 13, memoCount: 3,
    rationale: "Named in 3 of 12 memos; thesis rates it High, so this may be too low." },
  { id: "A3", block: "founder", name: "Commercial fluency", weight: 9, memoCount: 2,
    rationale: "Named in 2 of 12 memos (Petalry, Giva)." },
  { id: "B3", block: "path", name: "Regulatory and dependency path", weight: 9, memoCount: 2,
    rationale: "Named in 2 of 12 memos (AeroDrop, Coinlane)." },
  { id: "B4", block: "path", name: "Capital need against the ask", weight: 9, memoCount: 2,
    rationale: "Named in 2 of 12 memos (ePlane, HopBox)." },
  { id: "A4", block: "founder", name: "Team and commitment", weight: 4, memoCount: 0,
    rationale: "Floor of 1 point: documented in the thesis, no memo cites it as the reason." },
  { id: "A5", block: "founder", name: "Candour and consistency", weight: 4, memoCount: 0,
    rationale: "Floor of 1 point: an intake proxy only." },
  { id: "B2", block: "path", name: "Unit economics and margin path", weight: 4, memoCount: 0,
    rationale: "Floor of 1 point: secondary in two memos." },
  { id: "B5", block: "path", name: "Why now", weight: 4, memoCount: 0,
    rationale: "Floor of 1 point: public wording only, absent from all 12 memos." },
  { id: "B6", block: "path", name: "Competition and defensibility honesty", weight: 4, memoCount: 1,
    rationale: "Named in 1 of 12 memos (Prepnest)." },
];

export type BusinessType =
  | "consumer" | "lending" | "deeptech" | "network" | "regdep" | "other";

/** Key criteria beyond A1 and A2, by business type (assumption in the framework: partners to confirm). */
export const KEY_EXTRA: Record<BusinessType, CriterionId[]> = {
  consumer: ["A3", "B1"],
  lending: ["A3", "B3"],
  deeptech: ["B1", "B3"],
  network: ["B2", "B4"],
  regdep: ["B3"],
  other: ["B1", "B2"],
};

export interface FrameworkParams {
  /** Take a call needs a weighted score at or above this. */
  takeThreshold: number;
  /** Pass needs a weighted score at or below this (with enough coverage). */
  passThreshold: number;
  /** Minimum coverage (percent of applicable weight that is scored) for Take a call or Pass. */
  coverageMin: number;
  /** Take a call needs the owns-the-central-risk score to be at least this. */
  a2Min: number;
  /** Scores within this distance of a threshold go to Further research. 0 = off (partner decision). */
  borderlineBand: number;
  /** Maximum score without independent verification. */
  unverifiedCap: number;
  /** Cap for A3 when a key metric is stated as absent. */
  statedAbsenceCapA3: number;
}

export const DEFAULT_PARAMS: FrameworkParams = {
  takeThreshold: 7.0,
  passThreshold: 4.0,
  coverageMin: 75,
  a2Min: 5,
  borderlineBand: 0,
  unverifiedCap: 8,
  statedAbsenceCapA3: 4,
};

export function weightsOf(criteria: CriterionDef[] = CRITERIA): Record<CriterionId, number> {
  return Object.fromEntries(criteria.map((c) => [c.id, c.weight])) as Record<CriterionId, number>;
}
