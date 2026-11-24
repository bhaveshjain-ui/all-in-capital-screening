// Per-step evals: "The score says something is wrong. Evals say where."
// Five pipeline steps, each with the question its eval asks, a target, and a measured result. A result is
// only shown when it was really measured from this project's own data; otherwise the step says it has not
// been measured and what it needs. Targets are taken from the course slide and are provisional until the
// partners set their own. Nothing here is invented: a missing measurement is "not measured yet", never a number.

import { runBacktest } from "../evaluation";
import { memoryFor } from "../memory";
import { squash } from "../scoring/validate";
import type { SettingsValues } from "../settings";
import type { Application } from "../schemas";

export type StepId = "extract" | "portfolio" | "score" | "corrections" | "email";

export interface StepDef {
  id: StepId;
  n: number;
  name: string;
  /** The question the eval asks. */
  question: string;
  /** Percent; provisional (from the course slide). */
  target: number;
}

export const STEPS: StepDef[] = [
  { id: "extract", n: 1, name: "Extract background", question: "Did it find the right facts?", target: 90 },
  { id: "portfolio", n: 2, name: "Portfolio conflicts", question: "Did it flag overlaps (past investments)?", target: 90 },
  { id: "score", n: 3, name: "Score application", question: "Does the call match the fund's rubrics?", target: 83 },
  { id: "corrections", n: 4, name: "Pick corrections", question: "Did it retrieve relevant past notes?", target: 90 },
  { id: "email", n: 5, name: "Draft email", question: "Does it clear the voice checks and email-drafting rubrics?", target: 90 },
];

export type StepStatus = "met" | "below" | "unmeasured";

export interface StepResult {
  id: StepId;
  /** Percent, or null when not measured. */
  measured: number | null;
  /** Sample size behind the number. */
  n: number;
  /** Exactly what was measured, including what it does not cover. */
  basis: string;
  /** What is needed to measure it (or to measure it properly). */
  needs: string | null;
  /** Extra figures worth showing next to the headline number. */
  extra?: string;
}

export function statusOf(r: StepResult, target: number): StepStatus {
  if (r.measured === null) return "unmeasured";
  return r.measured >= target ? "met" : "below";
}

const pct = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);

// ---- Step 1: extraction -------------------------------------------------------------------------------

/** Precision proxy only: the share of extracted claims whose quote really appears in the source document. */
export function measureExtraction(apps: Application[]): StepResult {
  let claims = 0;
  let grounded = 0;
  let appsWith = 0;
  for (const a of apps) {
    const res = a.extraction.result;
    if (!res) continue;
    appsWith++;
    for (const c of res.claims) {
      const file = a.files.find((f) => f.kind === c.source);
      const q = squash(c.quote ?? "");
      if (q.length < 6) continue;
      claims++;
      if (file && squash(file.text).includes(q)) grounded++;
    }
  }
  return {
    id: "extract",
    measured: pct(grounded, claims),
    n: claims,
    basis: claims
      ? `Share of ${claims} extracted claims (${appsWith} application${appsWith === 1 ? "" : "s"}) whose quote appears in the deck or form. This catches invented facts; it does not catch facts the model missed.`
      : "No extracted application yet.",
    needs: "A checked list of the right facts for a few applications (founders, ask, stage, key figures), to measure what was missed as well as what was invented.",
  };
}

// ---- Step 2: portfolio conflicts ----------------------------------------------------------------------

export function measurePortfolio(): StepResult {
  return {
    id: "portfolio",
    measured: null,
    n: 0,
    basis: "Not measured.",
    needs: "The fund's full portfolio list with aliases (the built-in list of 32 companies is known to be incomplete), plus applications with known overlaps to test against. Until then a low result here would reflect the missing list, not the model.",
  };
}

// ---- Step 3: scoring against the fund's own decisions -------------------------------------------------

export function measureScore(v: SettingsValues): StepResult {
  const b = runBacktest(v);
  const total = b.rows.length;
  return {
    id: "score",
    measured: pct(b.tally.agree, total),
    n: total,
    basis: `Backtest on ${total} past memos, strict: the suggestion matches the fund's actual decision. A "Further research required" where the fund invested or passed counts as a miss here.`,
    needs: null,
    extra: `${b.tally.soft} soft (research where the fund decided), ${b.tally.hard} hard (opposite). Counting soft as a match would give ${pct(b.tally.agree + b.tally.soft, total)}%. The partners have not said which definition applies.`,
  };
}

// ---- Step 4: retrieving past notes ---------------------------------------------------------------------

export function measureCorrections(apps: Application[]): StepResult {
  let corrections = 0;
  for (const a of apps) corrections += (a.review?.corrections.length ?? 0) + (a.archivedReviews ?? []).reduce((n, r) => n + r.corrections.length, 0);
  return {
    id: "corrections",
    measured: null,
    n: corrections,
    basis: corrections
      ? `${corrections} correction${corrections === 1 ? "" : "s"} stored, but whether the right ones are retrieved has not been judged.`
      : "No corrections stored yet.",
    needs: "A set of past corrections that reviewers mark as relevant or not when they are shown on a new application. The correction memory already shows them; add a one-click \"useful / not useful\" to measure retrieval.",
  };
}

// ---- Step 5: email drafting ---------------------------------------------------------------------------

export function measureEmail(apps: Application[]): StepResult {
  const drafts = apps.flatMap((a) => a.emails ?? []);
  const tracked = drafts.filter((d) => typeof d.attempts === "number");
  const first = tracked.filter((d) => d.attempts === 1).length;
  const edited = drafts.filter((d) => d.editedAt).length;
  return {
    id: "email",
    measured: pct(first, tracked.length),
    n: tracked.length,
    basis: tracked.length
      ? `Share of ${tracked.length} draft${tracked.length === 1 ? "" : "s"} that passed every code check (all slots exact, "30-minute", no assessment, no promise, no links) on the first attempt.`
      : "No draft with a recorded attempt count yet.",
    needs: "A voice rubric from the partners (tone, length, sign-off). Today the checks are about safety and correctness, not style.",
    extra: drafts.length ? `${edited} of ${drafts.length} draft${drafts.length === 1 ? "" : "s"} ${edited === 1 ? "was" : "were"} edited by a reviewer before sending.` : undefined,
  };
}

export function measureAll(apps: Application[], v: SettingsValues): StepResult[] {
  return [measureExtraction(apps), measurePortfolio(), measureScore(v), measureCorrections(apps), measureEmail(apps)];
}

// ---- The feedback loop --------------------------------------------------------------------------------

export interface LoopStage {
  key: "signal" | "capture" | "store" | "retrieve" | "apply" | "act";
  name: string;
  slide: string;
  /** What this project does for the stage. */
  built: string;
  count: number;
  countLabel: string;
  /** Honest gap, if any. */
  gap: string | null;
}

export function feedbackLoop(apps: Application[]): LoopStage[] {
  const corrections = apps.reduce((n, a) => n + (a.review?.corrections.length ?? 0) + (a.archivedReviews ?? []).reduce((m, r) => m + r.corrections.length, 0), 0);
  const decisions = apps.filter((a) => a.review?.decision).length;
  const edits = apps.reduce((n, a) => n + (a.audit ?? []).filter((e) => e.type === "email_edited").length, 0);
  const scored = apps.filter((a) => a.scoring);
  const withPrecedent = scored.filter((a) => {
    const m = memoryFor(a, apps.filter((o) => o.id !== a.id));
    return Object.values(m).some((x) => x.length > 0);
  }).length;
  const applied = scored.filter((a) => (a.scoring?.memoryUsed?.length ?? 0) > 0).length;
  const drafts = apps.reduce((n, a) => n + (a.emails?.length ?? 0), 0);
  return [
    { key: "signal", name: "Signal", slide: "Observes outcomes and receives feedback from the environment.",
      built: "A reviewer corrects a score, accepts it, records a decision, or edits a drafted email.",
      count: corrections + decisions + edits, countLabel: "signals so far (corrections, decisions, email edits)", gap: null },
    { key: "capture", name: "Capture", slide: "Relevant data and observations are collected.",
      built: "Each correction keeps the criterion, original and corrected score, a one-line reason, who, when, and tags (business type, sector).",
      count: corrections, countLabel: "corrections captured with a reason",
      gap: "Email edits are logged as a fact only. The text the reviewer changed is not kept as a lesson." },
    { key: "store", name: "Store", slide: "Collected data is indexed, organised and committed to memory.",
      built: "Applications, corrections, decisions and the audit log are kept in the database, with corrections tagged for lookup.",
      count: apps.length, countLabel: "applications in the store", gap: null },
    { key: "retrieve", name: "Retrieve", slide: "Relevant past learnings are accessed from memory.",
      built: "Past corrections on similar companies (same business type, sector, similar model score) are shown next to each criterion.",
      count: withPrecedent, countLabel: "scored applications with at least one similar past correction",
      gap: "Retrieval is rule-based similarity and its accuracy has not been measured (step 4 above)." },
    { key: "apply", name: "Apply", slide: "Learnings are integrated to refine subsequent actions.",
      built: "A reviewer can re-score with the similar corrections shown to the model as precedent. It is never applied automatically, because the partners said written rules become checklists.",
      count: applied, countLabel: "scorings that used past corrections",
      gap: "Corrections are not yet fed into email drafting or extraction." },
    { key: "act", name: "Act", slide: "System performs an action or produces an output.",
      built: "The system scores applications and drafts invitations; a person decides and sends.",
      count: scored.length + drafts, countLabel: "outputs produced (scores and email drafts)", gap: null },
  ];
}
