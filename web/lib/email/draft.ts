import { InvalidModelOutputError, type Llm } from "../llm";
import { buildEmailPrompt } from "../prompts/email";
import { addAudit } from "../review";
import { squash } from "../scoring/validate";
import { EmailDraftOutputSchema, type Application, type EmailDraft, type EmailPersonalDetail } from "../schemas";
import { calConfig, eventTypeFor, fetchCalSlots, CalError } from "../calendar/cal";
import { attendeesFor, proposeSlots, type Slot } from "./slots";

export class EmailStateError extends Error {}

/** Words that would leak the fund's assessment, or promise something it has not decided. */
const LEAKS = /\b(score|scored|weighted|coverage|portfolio|conflict of interest|red flag)\b|take a call|further research required|our assessment|our review/i;
/** Praise or judgement: an invitation must not hint at what the fund thinks. */
const PRAISE = /\b(impressive|impressed|exciting|excited|promising|compelling|fascinating|remarkable|great traction|strong traction|stood out)\b/i;
/** Money and market figures from the application do not belong in the email. */
const FIGURES = /(\bINR\b|₹|\bRs\.?\s?\d|\b\d[\d,.]*\s?(crore|cr|lakh|lac|l|k|m|mn|bn)\b|\b\d+(\.\d+)?\s?%)/i;
const PROMISES = /\b(term sheet|we will invest|we plan to invest|we are going to invest|offer you funding|guarantee)\b/i;

/** Problems with a drafted email; an empty list means it passed. */
export function validateDraft(subject: string, body: string, slots: Slot[], personal?: { app: Application; detail: EmailPersonalDetail }): string[] {
  const problems: string[] = [];
  for (const s of slots) {
    if (!body.includes(s.label)) problems.push(`The body must offer this slot exactly as written: "${s.label}".`);
  }
  if (!/30[- ]minute/i.test(body)) problems.push('Say that the call is 30 minutes ("30-minute").');
  if (LEAKS.test(subject) || LEAKS.test(body)) problems.push("Do not mention any score, assessment, portfolio, conflict or lean.");
  if (PROMISES.test(subject) || PROMISES.test(body)) problems.push("Do not promise or imply an investment or a term sheet.");
  if (/https?:\/\/|www\./i.test(body)) problems.push("Do not include links.");
  if (PRAISE.test(subject) || PRAISE.test(body)) problems.push("Do not praise or judge the company (no \"impressive\", \"exciting\", \"promising\" and similar).");
  // Slot lines carry dates and times; remove them before looking for figures.
  const withoutSlots = slots.reduce((t, s) => t.split(s.label).join(""), `${subject}\n${body}`).replace(/30[- ]minute/gi, "");
  if (FIGURES.test(withoutSlots)) problems.push("Do not quote any figure (money, users, percentages, market size) from the application.");
  if (personal) problems.push(...checkPersonalisation(body, personal.app, personal.detail));
  return problems;
}

/** The company-specific sentence must really be in the email and rest on words really in the application. */
export function checkPersonalisation(body: string, app: Application, d: EmailPersonalDetail): string[] {
  const problems: string[] = [];
  if (!body.includes(d.sentence)) problems.push("personal_detail.sentence must be copied exactly from the body.");
  if (/\d/.test(d.sentence)) problems.push("The company-specific sentence must contain no numbers.");
  const q = squash(d.quote);
  const file = app.files.find((f) => f.kind === d.source);
  if (q.length < 12) problems.push("personal_detail.quote is too short to check.");
  else if (!file || !squash(file.text).includes(q)) problems.push(`personal_detail.quote must be copied exactly from the applicant's ${d.source}; those words were not found there.`);
  return problems;
}

export const MAX_DRAFT_ATTEMPTS = 2;

/** Only a recorded human decision of "Take a call" allows an invitation to be drafted. */
export function requireTakeACall(app: Application) {
  if (app.review?.decision?.value !== "Take a call") {
    throw new EmailStateError('An invitation can be drafted only after a reviewer records the outcome "Take a call".');
  }
}

/** Free slots from Cal.com when it is set up, otherwise the fixed Tuesday/Thursday rule. */
export async function chooseSlots(attendees: string[], now: Date, fetchSlots = fetchCalSlots): Promise<{ slots: Slot[]; source: "cal.com" | "fixed rule" }> {
  const cfg = calConfig();
  if (!cfg) return { slots: proposeSlots(now), source: "fixed rule" };
  const slots = await fetchSlots(cfg, eventTypeFor(cfg, attendees.includes("Aditya")), now);
  if (slots.length === 0) throw new CalError("Cal.com shows no free Tuesday or Thursday afternoon slots in the next three weeks. Open up availability in Cal.com and try again.");
  return { slots, source: "cal.com" };
}

export async function draftInvitation(app: Application, llm: Llm, by: string, now = new Date(), fetchSlots = fetchCalSlots): Promise<Application> {
  if (!app.scoring) throw new EmailStateError("Score the application first.");
  requireTakeACall(app);

  const attendees = attendeesFor(app.scoring.businessTypes.types);
  const { slots, source } = await chooseSlots(attendees, now, fetchSlots);

  let feedback: string | undefined;
  let problems: string[] = [];
  for (let attempt = 1; attempt <= MAX_DRAFT_ATTEMPTS; attempt++) {
    try {
      const out = await llm.json(buildEmailPrompt(app, slots, attendees, feedback), EmailDraftOutputSchema);
      problems = validateDraft(out.subject, out.body, slots, { app, detail: out.personal_detail });
      if (problems.length === 0) {
        const draft: EmailDraft = {
          id: crypto.randomUUID(), status: "draft", to: "", subject: out.subject.trim(), body: out.body.trim(),
          slots, attendees, slotSource: source, attempts: attempt, personalisation: out.personal_detail, model: llm.model, createdAt: now.toISOString(), createdBy: by,
        };
        return addAudit(
          { ...app, emails: [...(app.emails ?? []), draft] },
          "email_drafted", by,
          `Invitation drafted with ${llm.model} (${slots.length} slots from ${source}, attendees: ${attendees.join(", ")}). Not sent.`,
        );
      }
    } catch (e) {
      if (!(e instanceof InvalidModelOutputError)) throw e;
      problems = [e.message];
    }
    feedback = problems.map((p) => `- ${p}`).join("\n");
  }
  throw new InvalidModelOutputError(`The draft failed the checks after ${MAX_DRAFT_ATTEMPTS} attempts:\n${problems.join("\n")}`);
}
