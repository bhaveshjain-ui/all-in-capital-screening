// Learning from reviewers' edits. When a reviewer rewrites a drafted invitation and approves the result, the
// before-and-after is kept on the draft. The next drafts are shown a couple of those as wording preferences.
// It is precedent, not a rule: the model is told to take the style only, never names or facts, and every
// code check on the draft still applies.

import type { Application } from "../schemas";

export interface EditExample {
  appId: string;
  draftId: string;
  company: string;
  subjectBefore: string;
  subjectAfter: string;
  before: string;
  after: string;
  at: string;
}

const APPROVED = new Set(["approved", "sent", "test_logged"]);
export const MAX_EXAMPLES = 2;

/** The most recent edits from other applications, taking only the version a person approved. */
export function editExamples(apps: Application[], excludeAppId: string, limit = MAX_EXAMPLES): EditExample[] {
  const out: EditExample[] = [];
  for (const a of apps) {
    if (a.id === excludeAppId) continue;
    for (const d of a.emails ?? []) {
      if (!d.original || !APPROVED.has(d.status)) continue;
      const changed = d.body.trim() !== d.original.body.trim() || d.subject.trim() !== d.original.subject.trim();
      if (!changed) continue;
      out.push({
        appId: a.id, draftId: d.id, company: a.extraction.result?.company.name || a.name,
        subjectBefore: d.original.subject.trim(), subjectAfter: d.subject.trim(),
        before: d.original.body.trim(), after: d.body.trim(),
        at: d.approvedAt ?? d.editedAt ?? d.createdAt,
      });
    }
  }
  return out.sort((x, y) => Date.parse(y.at) - Date.parse(x.at)).slice(0, limit);
}
