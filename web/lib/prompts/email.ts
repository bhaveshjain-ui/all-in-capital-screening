import type { Application } from "../schemas";
import type { Slot } from "../email/slots";
import type { EditExample } from "../email/precedent";

/** How much of the deck's opening the model may read to write something specific to this company. */
const DECK_EXCERPT_CHARS = 1800;

const clip = (t: string) => (t.length > 1500 ? `${t.slice(0, 1500)}…` : t);

export function buildEmailPrompt(app: Application, slots: Slot[], attendees: string[], feedback?: string, examples: EditExample[] = []): string {
  const c = app.extraction.result?.company;
  const founders = (c?.founders ?? []).filter((f) => f.name);
  const deck = app.files.find((f) => f.kind === "deck")?.text.slice(0, DECK_EXCERPT_CHARS);
  const facts = [
    c?.one_liner && `What it does (their own words): ${c.one_liner}`,
    c?.sector_selected && `Sector they selected: ${c.sector_selected}`,
    c?.stage_selected && `Stage: ${c.stage_selected}`,
    c?.location && `Based in: ${c.location}`,
  ].filter(Boolean);
  return `You draft a short plain-text email from a venture fund, All In Capital (Mumbai), inviting the founders of an early-stage company to a first conversation. A person will read and edit the draft before anything is sent. The email must be written for THIS company, not a template: it should be clear to the founders that someone read their application.

COMPANY: ${c?.name ?? app.name}
${facts.join("\n")}
FOUNDERS TO ADDRESS: ${founders.length ? founders.map((f) => `${f.name}${f.role ? ` (${f.role})` : ""}`).join(", ") : "(names not known: open with a plain greeting)"}
PEOPLE FROM THE FUND ON THE CALL: ${attendees.join(" and ")}

THEIR OWN APPLICATION, opening of the deck (the only material you may draw specifics from)
"""
${deck ?? "(no deck was uploaded)"}
"""

PROPOSED SLOTS (copy each line exactly as written, one per line; each call is 30 minutes)
${slots.map((s) => `- ${s.label}`).join("\n")}

${examples.length ? `HOW OUR REVIEWERS HAVE REWRITTEN EARLIER DRAFTS (wording preferences only)
${examples.map((x, i) => `Example ${i + 1}\nThe model wrote:\n"""\n${clip(x.before)}\n"""\nThe reviewer approved:\n"""\n${clip(x.after)}\n"""`).join("\n\n")}

Take only the style the reviewers prefer (tone, length, phrasing, sign-off). These examples are about other companies: never copy their names, facts or the company-specific sentence, and every rule below still applies.
` : ""}
RULES
- Warm, brief and plain: at most about 170 words. Address the founders by first name.
- Thank them for applying, say we would like a 30-minute conversation, and offer the slots above exactly as written. Ask them to reply with the slot that suits them, or to suggest another time if none do.
- Make it specific to this company with exactly ONE sentence that says what they are building, for whom, or where, in neutral words, using only what their own application says above. Example of the style: "We read that you are building millet-based breakfast foods for urban families." Do not add any detail that is not in their application.
- That sentence must contain no numbers and must not praise or judge. Do not use words such as impressive, exciting, promising, strong, great, interesting or compelling.
- Do NOT quote any figure from the application (revenue, users, margins, market size, the ask, valuation).
- Do NOT mention any assessment, score, rating, review result, concern, portfolio company or conflict. Do not say what we think of the company or hint at what we want to discuss.
- Do NOT promise or imply an investment, a term sheet or a decision. A conversation is only a conversation.
- No links, no attachments, no phone numbers.
- Sign off as "The All In Capital team".
${feedback ? `\nYOUR PREVIOUS DRAFT WAS REJECTED BY CODE FOR THESE REASONS. Fix every one:\n${feedback}\n` : ""}
Return only JSON:
{
  "subject": string,
  "body": string,
  "personal_detail": {
    "sentence": string,   // the company-specific sentence, copied EXACTLY as it appears in the body
    "quote": string,      // the exact words from their deck or form that this sentence is based on, copied exactly
    "source": "deck" | "form"
  }
}`;
}
