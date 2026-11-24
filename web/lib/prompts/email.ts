import type { Application } from "../schemas";
import type { Slot } from "../email/slots";

export function buildEmailPrompt(app: Application, slots: Slot[], attendees: string[], feedback?: string): string {
  const c = app.extraction.result?.company;
  const founders = (c?.founders ?? []).map((f) => f.name).filter(Boolean);
  return `You draft a short plain-text email from a venture fund, All In Capital (Mumbai), inviting the founders of an early-stage company to a first conversation. A person will read and edit the draft before anything is sent.

COMPANY: ${c?.name ?? app.name}
${c?.one_liner ? `WHAT IT DOES (their own words): ${c.one_liner}\n` : ""}FOUNDERS TO ADDRESS: ${founders.length ? founders.join(", ") : "(names not known: open with a plain greeting)"}
PEOPLE FROM THE FUND ON THE CALL: ${attendees.join(" and ")}

PROPOSED SLOTS (copy each line exactly as written, one per line; each call is 30 minutes)
${slots.map((s) => `- ${s.label}`).join("\n")}

RULES
- Warm, brief and plain: at most about 150 words.
- Thank them for applying, say we would like a 30-minute conversation, and offer the slots above exactly as written. Ask them to reply with the slot that suits them, or to suggest another time if none do.
- Do NOT mention any assessment, score, rating, review result, concern, portfolio company or conflict. Do not say what we think of the company.
- Do NOT promise or imply an investment, a term sheet or a decision. A conversation is only a conversation.
- No links, no attachments, no phone numbers.
- Sign off as "The All In Capital team".
${feedback ? `\nYOUR PREVIOUS DRAFT WAS REJECTED BY CODE FOR THESE REASONS. Fix every one:\n${feedback}\n` : ""}
Return only JSON: { "subject": string, "body": string }`;
}
