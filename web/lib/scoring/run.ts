import { CRITERIA, DEFAULT_PARAMS, weightsOf, type BusinessType, type CriterionId, type FrameworkParams } from "../framework/config";
import { evaluate, type D1Flag } from "../framework/score";
import { InvalidModelOutputError, type Llm } from "../llm";
import { buildScorePrompt } from "../prompts/score";
import type { MemoryMatch } from "../memory";
import {
  ScoreOutputSchema,
  type Application, type CriterionScoreRecord, type PortfolioResult, type ScoreOutput, type Scoring,
} from "../schemas";
import { validateScoring } from "./validate";

export class ScoringStateError extends Error {}

export const MAX_ATTEMPTS = 2;

/** The portfolio flag comes from the research step's overlap check, never from the scoring model. */
export function d1From(app: Application): { flag: D1Flag; checks: PortfolioResult["checks"] } {
  const checks = app.research?.portfolio?.checks ?? [];
  const flag: D1Flag = checks.some((c) => c.overlap === "likely") ? "likely" : checks.length ? "possible" : "none";
  return { flag, checks };
}

function toRecords(out: ScoreOutput): Record<CriterionId, CriterionScoreRecord> {
  const rec = {} as Record<CriterionId, CriterionScoreRecord>;
  for (const c of CRITERIA) {
    const r = out.criteria[c.id];
    rec[c.id] = {
      status: r.status,
      score: r.status === "unknown" || r.status === "na" ? null : r.score,
      class: r.status === "unknown" || r.status === "na" ? null : (r.class ?? null),
      evidence: r.evidence,
      reasoning: r.reasoning,
      missing: r.missing ?? undefined,
      cost: r.cost ?? undefined,
    };
  }
  return rec;
}

export function buildEvaluation(
  app: Application,
  criteria: Scoring["criteria"],
  types: BusinessType[],
  d2: Scoring["d2"]["value"],
  params: FrameworkParams,
  weights: Record<CriterionId, number> = weightsOf(CRITERIA),
) {
  return evaluate(
    {
      criteria: Object.fromEntries(
        (Object.keys(criteria) as CriterionId[]).map((id) => [id, { status: criteria[id].status, score: criteria[id].score }]),
      ) as Record<CriterionId, { status: Scoring["criteria"][CriterionId]["status"]; score: number | null }>,
      businessTypes: types,
      d1: d1From(app).flag,
      d2,
    },
    params,
    weights,
  );
}

/**
 * Score an application. The model returns evidence-backed per-criterion results; code checks every rule and
 * every quote (one retry with the problems listed), then computes the score, coverage and lean.
 */
export async function scoreApplication(
  app: Application,
  llm: Llm,
  params: FrameworkParams = DEFAULT_PARAMS,
  precedent: MemoryMatch[] = [],
  weights: Record<CriterionId, number> = weightsOf(CRITERIA),
): Promise<Application> {
  if (app.extraction.status !== "done" || !app.extraction.result) {
    throw new ScoringStateError("Extract the claims first.");
  }
  if (!app.research?.portfolio) {
    throw new ScoringStateError("Run the research step first: scoring needs the portfolio check.");
  }

  let feedback: string | undefined;
  let lastProblems: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let out: ScoreOutput | null = null;
    try {
      out = await llm.json(buildScorePrompt(app, feedback, precedent), ScoreOutputSchema);
    } catch (e) {
      if (!(e instanceof InvalidModelOutputError)) throw e;
      lastProblems = [e.message];
    }
    if (out) {
      lastProblems = validateScoring(app, out, params);
      if (lastProblems.length === 0) {
        const criteria = toRecords(out);
        const types = out.business_types.types as BusinessType[];
        const d2 = { value: out.d2.value, reason: out.d2.reason, evidence: out.d2.evidence };
        const d1 = d1From(app);
        return {
          ...app,
          scoring: {
            model: llm.model,
            scoredAt: new Date().toISOString(),
            attempts: attempt,
            businessTypes: { types, reason: out.business_types.reason },
            criteria,
            d1: { flag: d1.flag, checks: d1.checks },
            d2,
            evaluation: buildEvaluation(app, criteria, types, d2.value, params, weights),
            paramsUsed: params,
            weightsUsed: weights,
            memoryUsed: precedent.map((m) => ({ correctionId: m.correction.id, company: m.company, criterion: m.correction.criterion })),
          },
        };
      }
    }
    feedback = lastProblems.map((p) => `- ${p}`).join("\n");
  }
  throw new InvalidModelOutputError(
    `The scoring answer failed the checks after ${MAX_ATTEMPTS} attempts:\n${lastProblems.slice(0, 8).join("\n")}`,
  );
}

/** Reviewer override of the business types: recompute the result without calling the model again. */
export function applyBusinessTypes(app: Application, types: BusinessType[]): Application {
  const s = app.scoring;
  if (!s) throw new ScoringStateError("Score the application first.");
  if (types.length < 1 || types.length > 2) throw new ScoringStateError("Choose one or two business types.");
  return {
    ...app,
    scoring: {
      ...s,
      businessTypes: { ...s.businessTypes, types, overriddenAt: new Date().toISOString() },
      evaluation: buildEvaluation(app, s.criteria, types, s.d2.value, s.paramsUsed, s.weightsUsed),
    },
  };
}

/** Apply saved settings to an existing result without calling the model. The model's scores are untouched. */
export function recomputeWithSettings(app: Application, params: FrameworkParams, weights: Record<CriterionId, number>): Application {
  const s = app.scoring;
  if (!s) throw new ScoringStateError("Score the application first.");
  return {
    ...app,
    scoring: {
      ...s,
      paramsUsed: params,
      weightsUsed: weights,
      evaluation: buildEvaluation(app, s.criteria, s.businessTypes.types, s.d2.value, params, weights),
    },
  };
}
