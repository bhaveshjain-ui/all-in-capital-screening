// Code-side checks on the model's scoring output. The model proposes scores and quotes; this code refuses
// anything that breaks the framework's rules or quotes text that is not in the documents.

import { CRITERIA, DEFAULT_PARAMS, type CriterionId, type FrameworkParams } from "../framework/config";
import type { Application, Evidence, ScoreOutput } from "../schemas";

/** Lower-case letters and digits only: robust to PDF line breaks, hyphenation and quote styles. */
export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const MIN_QUOTE = 12; // squashed characters; stops trivial matches such as "yes"

function overlaps(haystack: string, needle: string) {
  return haystack.includes(needle) || (haystack.length >= MIN_QUOTE && needle.includes(haystack));
}

/** Is this piece of evidence really in the documents, the recomputation table, the conflicts or the research? */
export function evidenceSupported(app: Application, e: Evidence): boolean {
  const q = squash(e.quote);
  if (q.length < MIN_QUOTE) return false;
  switch (e.source) {
    case "deck":
    case "form": {
      const f = app.files.find((x) => x.kind === e.source);
      return !!f && squash(f.text).includes(q);
    }
    case "research":
      return (app.research?.findings ?? []).some((f) => overlaps(squash(f.statement), q));
    case "recompute":
      return app.recompute.some((r) => overlaps(squash(r.label), q) || overlaps(squash(`${r.label}${r.note ?? ""}`), q));
    case "conflict":
      return app.conflicts.some((c) =>
        [c.label, c.field, c.deck.quote, c.form.quote].some((t) => overlaps(squash(t), q)),
      );
  }
}

const short = (s: string) => (s.length > 70 ? `${s.slice(0, 70)}…` : s);

export function validateScoring(
  app: Application,
  out: ScoreOutput,
  params: FrameworkParams = DEFAULT_PARAMS,
): string[] {
  const problems: string[] = [];
  const checkEvidence = (label: string, evidence: Evidence[]) => {
    for (const e of evidence) {
      if (!evidenceSupported(app, e)) {
        problems.push(`${label}: the quote is not in the ${e.source} text: "${short(e.quote)}". Copy quotes exactly from the text provided.`);
      }
    }
  };

  for (const c of CRITERIA) {
    const r = out.criteria[c.id as CriterionId];
    const id = c.id;
    if (r.status === "scored" || r.status === "stated_absence") {
      if (r.score === null || r.score < 0 || r.score > 10) problems.push(`${id}: a scored criterion needs a score from 0 to 10.`);
      else if (r.score > params.unverifiedCap) problems.push(`${id}: ${r.score} is above ${params.unverifiedCap}, the maximum when nothing is independently verified.`);
      if (id === "A3" && r.status === "stated_absence" && r.score !== null && r.score > params.statedAbsenceCapA3) {
        problems.push(`A3: a stated absence of a key metric is capped at ${params.statedAbsenceCapA3}.`);
      }
      if (!r.class) problems.push(`${id}: say how reliable the evidence is (class S-c, S-u, P or X).`);
      if (r.evidence.length === 0) problems.push(`${id}: a scored criterion needs at least one quote as evidence.`);
      checkEvidence(id, r.evidence);
    } else if (r.status === "unknown") {
      if (r.score !== null) problems.push(`${id}: an unknown criterion must have no score; missing information is never scored.`);
      if (!r.missing?.trim()) problems.push(`${id}: say what is missing.`);
      if (!r.cost?.trim()) problems.push(`${id}: say what the absence stops us judging.`);
    } else {
      if (r.score !== null) problems.push(`${id}: a not-applicable criterion must have no score.`);
      if (!r.reasoning.trim()) problems.push(`${id}: say why the criterion does not apply.`);
    }
  }

  if (out.d2.value === "triggered" || out.d2.value === "possible") {
    if (out.d2.evidence.length === 0) problems.push("D2: flagging possible rule dependence needs a quote as evidence.");
    checkEvidence("D2", out.d2.evidence);
  }
  return problems;
}
