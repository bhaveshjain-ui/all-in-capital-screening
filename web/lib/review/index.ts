// Human review: accept or correct each criterion with a one-line reason, then record the final decision.
// Corrections never rewrite the model's scoring: they are layered on top, so both are always visible and the
// result can be recomputed. Nothing here decides an outcome; the reviewer's decision is recorded as theirs.

import { CRITERIA, DEFAULT_PARAMS, type CriterionId } from "../framework/config";
import type { Evaluation } from "../framework/score";
import {
  AcceptInputSchema, CorrectionInputSchema, DecisionInputSchema,
  type Application, type AuditEntry, type Correction, type CorrectionInput, type Review,
} from "../schemas";
import { buildEvaluation } from "../scoring/run";

export class ReviewError extends Error {}

const nowIso = () => new Date().toISOString();
const who = (by?: string) => by?.trim() || "unnamed reviewer";

export function addAudit(app: Application, type: AuditEntry["type"], by: string, detail: string): Application {
  return { ...app, audit: [...(app.audit ?? []), { at: nowIso(), type, by, detail }] };
}

const emptyReview = (): Review => ({ corrections: [], accepted: [] });

export interface EffectiveCriterion {
  status: CorrectionInput["status"];
  score: number | null;
  correction?: Correction;
}

/** The model's scoring with the reviewer's latest correction for each criterion laid over it. */
export function effectiveCriteria(app: Application): Record<CriterionId, EffectiveCriterion> {
  const sc = app.scoring;
  if (!sc) throw new ReviewError("Score the application first.");
  const out = {} as Record<CriterionId, EffectiveCriterion>;
  for (const c of CRITERIA) {
    const base = sc.criteria[c.id];
    const latest = [...(app.review?.corrections ?? [])].reverse().find((x) => x.criterion === c.id);
    out[c.id] = latest
      ? { status: latest.corrected.status, score: latest.corrected.score, correction: latest }
      : { status: base.status, score: base.score };
  }
  return out;
}

/** The result recomputed in code after corrections. Same rules and thresholds as the model's scoring. */
export function effectiveEvaluation(app: Application): Evaluation {
  const sc = app.scoring;
  if (!sc) throw new ReviewError("Score the application first.");
  const eff = effectiveCriteria(app);
  const criteria = Object.fromEntries(
    (Object.keys(eff) as CriterionId[]).map((id) => [id, { ...sc.criteria[id], status: eff[id].status, score: eff[id].score }]),
  ) as typeof sc.criteria;
  return buildEvaluation(app, criteria, sc.businessTypes.types, sc.d2.value, sc.paramsUsed, sc.weightsUsed);
}

export function correctCriterion(app: Application, raw: unknown): Application {
  const sc = app.scoring;
  if (!sc) throw new ReviewError("Score the application first.");
  const parsed = CorrectionInputSchema.safeParse(raw);
  if (!parsed.success) throw new ReviewError(parsed.error.issues.map((i) => i.message).join(" "));
  const input = parsed.data;
  const p = sc.paramsUsed ?? DEFAULT_PARAMS;

  const needsScore = input.status === "scored" || input.status === "stated_absence";
  if (needsScore && input.score === null) throw new ReviewError("A scored criterion needs a score.");
  if (!needsScore && input.score !== null) throw new ReviewError("Unknown and not-applicable criteria carry no score: missing information is never scored.");
  if (input.score !== null && input.score > p.unverifiedCap && !input.verification) {
    throw new ReviewError(`A score above ${p.unverifiedCap} needs a note on how it was independently verified.`);
  }
  if (input.criterion === "A3" && input.status === "stated_absence" && input.score !== null && input.score > p.statedAbsenceCapA3) {
    throw new ReviewError(`A3: a stated absence of a key metric is capped at ${p.statedAbsenceCapA3}.`);
  }

  const current = effectiveCriteria(app)[input.criterion];
  if (current.status === input.status && current.score === input.score) {
    throw new ReviewError("That is the same as the current score. Use Accept instead.");
  }

  const by = who(input.by);
  const correction: Correction = {
    id: crypto.randomUUID(),
    criterion: input.criterion,
    at: nowIso(),
    by,
    reason: input.reason,
    verification: input.verification || undefined,
    original: { status: current.status, score: current.score },
    corrected: { status: input.status, score: input.score },
    tags: { businessTypes: sc.businessTypes.types, sector: app.extraction.result?.company.sector_selected ?? undefined },
  };
  const review: Review = app.review ?? emptyReview();
  const next: Application = {
    ...app,
    review: {
      ...review,
      corrections: [...review.corrections, correction],
      accepted: review.accepted.filter((c) => c !== input.criterion),
    },
  };
  const fmt = (e: { status: string; score: number | null }) => (e.score === null ? e.status : `${e.score} (${e.status})`);
  return addAudit(next, "criterion_corrected", by, `${input.criterion}: ${fmt(correction.original)} -> ${fmt(correction.corrected)}. ${input.reason}`);
}

export function acceptCriteria(app: Application, raw: unknown): Application {
  if (!app.scoring) throw new ReviewError("Score the application first.");
  const parsed = AcceptInputSchema.safeParse(raw);
  if (!parsed.success) throw new ReviewError("Choose the criteria to accept.");
  const by = who(parsed.data.by);
  const review: Review = app.review ?? emptyReview();
  const accepted = Array.from(new Set([...review.accepted, ...parsed.data.criteria]));
  const next: Application = { ...app, review: { ...review, accepted } };
  return addAudit(next, "criterion_accepted", by, `Accepted ${parsed.data.criteria.join(", ")} as scored.`);
}

export function recordDecision(app: Application, raw: unknown): Application {
  if (!app.scoring) throw new ReviewError("Score the application first.");
  const parsed = DecisionInputSchema.safeParse(raw);
  if (!parsed.success) throw new ReviewError(parsed.error.issues.map((i) => i.message).join(" "));
  const by = who(parsed.data.by);
  const systemLean = effectiveEvaluation(app).lean;
  const review: Review = app.review ?? emptyReview();
  const decision = {
    value: parsed.data.value, reason: parsed.data.reason, by, at: nowIso(),
    systemLean, agreedWithSystem: parsed.data.value === systemLean,
  };
  const next: Application = { ...app, review: { ...review, decision } };
  return addAudit(next, "decision_recorded", by, `Decision: ${decision.value} (the system suggested: ${systemLean}). ${decision.reason}`);
}

/** When an application is scored again, keep the earlier review but start fresh against the new scores. */
export function archiveReviewForRescore(app: Application): Application {
  const r = app.review;
  if (!r || (r.corrections.length === 0 && r.accepted.length === 0 && !r.decision)) return { ...app, review: undefined };
  const next: Application = { ...app, review: undefined, archivedReviews: [...(app.archivedReviews ?? []), r] };
  return addAudit(next, "review_archived", "system", `Scored again: ${r.corrections.length} correction(s)${r.decision ? " and a decision" : ""} from the earlier scoring were archived.`);
}
