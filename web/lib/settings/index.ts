// Partner-set parameters (weights and thresholds) with a change history. The framework's values are only a
// starting position; every change needs a reason and is kept. Saved settings apply to NEW scoring runs and to
// "recompute" on an existing result. They never silently rewrite a result that was already produced.

import { z } from "zod";
import { CRITERIA, DEFAULT_PARAMS, weightsOf, type CriterionId, type FrameworkParams } from "../framework/config";

export interface SettingsValues {
  params: FrameworkParams;
  weights: Record<CriterionId, number>;
}

export interface SettingsChange {
  id: string;
  at: string;
  by: string;
  reason: string;
  /** Human-readable list of what changed. */
  changes: string[];
  before: SettingsValues;
  after: SettingsValues;
}

export interface SettingsDoc {
  current: SettingsValues;
  history: SettingsChange[];
}

export class SettingsError extends Error {}

export const FRAMEWORK_DEFAULTS = (): SettingsValues => ({ params: { ...DEFAULT_PARAMS }, weights: { ...weightsOf(CRITERIA) } });

export function currentValues(doc: SettingsDoc | null): SettingsValues {
  return doc ? doc.current : FRAMEWORK_DEFAULTS();
}

const ids = CRITERIA.map((c) => c.id) as [CriterionId, ...CriterionId[]];
const w = z.number().int().min(0).max(100);

const ParamsSchema = z.object({
  takeThreshold: z.number().min(0).max(10),
  passThreshold: z.number().min(0).max(10),
  coverageMin: z.number().min(0).max(100),
  a2Min: z.number().min(0).max(10),
  borderlineBand: z.number().min(0).max(3),
  unverifiedCap: z.number().min(0).max(10),
  statedAbsenceCapA3: z.number().min(0).max(10),
});

export const SettingsInputSchema = z.object({
  params: ParamsSchema,
  weights: z.object(Object.fromEntries(ids.map((id) => [id, w])) as Record<CriterionId, typeof w>),
  reason: z.string().trim().min(10, "Say why in at least a short sentence.").max(400),
  by: z.string().trim().max(60).optional(),
});

const LABELS: Record<string, string> = {
  takeThreshold: "Take-a-call threshold", passThreshold: "Pass threshold", coverageMin: "Minimum coverage (%)",
  a2Min: "Owns-the-risk minimum", borderlineBand: "Borderline band", unverifiedCap: "Cap without verification",
  statedAbsenceCapA3: "Cap on a stated absence (A3)",
};

export function diffSettings(before: SettingsValues, after: SettingsValues): string[] {
  const out: string[] = [];
  for (const k of Object.keys(LABELS) as (keyof FrameworkParams)[]) {
    if (before.params[k] !== after.params[k]) out.push(`${LABELS[k]}: ${before.params[k]} -> ${after.params[k]}`);
  }
  for (const c of CRITERIA) {
    if (before.weights[c.id] !== after.weights[c.id]) out.push(`Weight ${c.id} ${c.name}: ${before.weights[c.id]} -> ${after.weights[c.id]}`);
  }
  return out;
}

/** Validate a proposed change and add it to the history. Throws SettingsError with a plain message. */
export function applySettingsChange(doc: SettingsDoc | null, raw: unknown, now = new Date()): SettingsDoc {
  const parsed = SettingsInputSchema.safeParse(raw);
  if (!parsed.success) throw new SettingsError(parsed.error.issues.map((i) => i.message).join(" "));
  const { params, weights, reason, by } = parsed.data;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total !== 100) throw new SettingsError(`The weights add up to ${total}; they must add up to exactly 100.`);
  if (params.takeThreshold <= params.passThreshold) throw new SettingsError("The take-a-call threshold must be higher than the pass threshold.");
  if (params.statedAbsenceCapA3 > params.unverifiedCap) throw new SettingsError("The A3 stated-absence cap cannot exceed the cap without verification.");

  const before = currentValues(doc);
  const after: SettingsValues = { params, weights };
  const changes = diffSettings(before, after);
  if (changes.length === 0) throw new SettingsError("Nothing changed.");

  const entry: SettingsChange = {
    id: crypto.randomUUID(), at: now.toISOString(), by: by?.trim() || "unnamed reviewer", reason, changes, before, after,
  };
  return { current: after, history: [...(doc?.history ?? []), entry] };
}

export function sameSettings(a: SettingsValues, b: SettingsValues): boolean {
  return diffSettings(a, b).length === 0;
}
