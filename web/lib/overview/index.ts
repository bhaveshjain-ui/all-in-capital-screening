// The dashboard in plain terms: how many applications, and for each one what a person has to do next.
// Nothing here decides anything; it only reads where each application has got to.

import type { Application } from "../schemas";

export interface NextStep {
  appId: string;
  company: string;
  /** What a person should do next, in a few words. */
  action: string;
  href: string;
  /** Pipeline position, 1 to 5, for ordering and the progress dots. */
  stage: 1 | 2 | 3 | 4 | 5;
}

const DONE_STATUSES = new Set(["sent", "test_logged"]);

/** Null when the application needs nothing more from a person. */
export function nextStep(a: Application): NextStep | null {
  const base = { appId: a.id, company: a.extraction.result?.company.name || a.name };
  const here = `/applications/${a.id}`;
  if (a.extraction.status !== "done") return { ...base, action: "Read the claims in the documents", href: here, stage: 1 };
  if (!a.research) return { ...base, action: "Run the research", href: here, stage: 2 };
  if (!a.scoring) return { ...base, action: "Run the scoring", href: here, stage: 3 };
  const decision = a.review?.decision;
  if (!decision) return { ...base, action: "Review the scores and record your decision", href: `${here}#review`, stage: 4 };
  if (decision.value !== "Take a call") return null;
  const emails = a.emails ?? [];
  if (emails.length === 0) return { ...base, action: "Draft the invitation", href: `${here}#invite`, stage: 5 };
  if (emails.some((e) => e.status === "draft" || e.status === "approved" || e.status === "failed")) {
    return { ...base, action: "Review and send the invitation", href: "/emails", stage: 5 };
  }
  const sent = emails.filter((e) => DONE_STATUSES.has(e.status));
  if (sent.length > 0 && !sent.some((e) => e.booking)) return { ...base, action: "Book a time once they reply", href: "/emails?tab=sent", stage: 5 };
  return null;
}

export interface Overview {
  total: number;
  waitingDecision: number;
  emailsToReview: number;
  invitationsSent: number;
  next: NextStep[];
}

export function overview(apps: Application[]): Overview {
  const next = apps.map(nextStep).filter((n): n is NextStep => n !== null);
  const emails = apps.flatMap((a) => a.emails ?? []);
  return {
    total: apps.length,
    waitingDecision: apps.filter((a) => a.scoring && !a.review?.decision).length,
    emailsToReview: emails.filter((e) => e.status === "draft" || e.status === "approved" || e.status === "failed").length,
    invitationsSent: emails.filter((e) => DONE_STATUSES.has(e.status)).length,
    // Furthest along first: those are closest to a finished outcome.
    next: next.sort((x, y) => y.stage - x.stage),
  };
}
