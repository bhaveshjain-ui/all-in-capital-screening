import type { Application, ResearchQuestion, SourceRef } from "../schemas";
import { PORTFOLIO } from "../research/portfolio";

/** What the research steps may know about an application: the stated facts, not the reviewer's views. */
export function applicantSummary(app: Application): string {
  const r = app.extraction.result;
  if (!r) return `Company: ${app.name}`;
  const c = r.company;
  const claim = (f: string) => r.claims.filter((x) => x.field === f).map((x) => `${x.value} (${x.source})`).join("; ");
  return [
    `Company: ${c.name}`,
    c.one_liner && `What it does: ${c.one_liner}`,
    c.sector_selected && `Sector selected: ${c.sector_selected}`,
    c.stage_selected && `Stage: ${c.stage_selected}`,
    c.location && `Location: ${c.location}`,
    claim("competitors_claim") && `Stated about competition: ${claim("competitors_claim")}`,
    claim("regulatory_status") && `Stated regulatory status: ${claim("regulatory_status")}`,
    claim("funding_of_credit") && `Stated funding of credit: ${claim("funding_of_credit")}`,
  ].filter(Boolean).join("\n");
}

export function buildPlanPrompt(app: Application): string {
  const risks = (app.extraction.result?.claims ?? [])
    .filter((c) => /risk|regulat|compet|depend/i.test(`${c.field} ${c.label}`))
    .map((c) => `- ${c.label}: ${c.value} (${c.source}, "${c.quote}")`)
    .join("\n");
  return `You plan public-web research on an early-stage Indian startup that has applied to a venture fund. A reviewer will read the findings next to the application. You do not evaluate the company.

APPLICANT (as stated by the applicant)
${applicantSummary(app)}
${risks ? `\nSTATED RISKS, DEPENDENCIES AND COMPETITION CLAIMS\n${risks}\n` : ""}
Write between 3 and 6 research questions, each answerable from public sources, covering:
1. "competition": who else sells this in India (named companies, not categories).
2. "claim_check": for each statement the applicant makes about competition (for example "no direct competitors", "no India-first player"), a question that tests it. Set claim_field to the field name if there is one.
3. "regulation": rules or partner dependencies that the applicant names or that clearly apply to this kind of business in India (licences, central-bank rules, registration, consent rules). Name the specific rule area.
4. "identity": one question asking whether a publicly known company with this name and this product exists. A name match is not proof of identity; the question is only to surface possible confusion.
Do not ask about the founders as people. Do not ask for opinions. Keep each question specific.

Return only JSON:
{ "questions": [ { "id": "q1", "type": "competition"|"claim_check"|"regulation"|"market"|"identity", "question": string, "why": string, "claim_field": string|null } ] }`;
}

export function buildSearchPrompt(app: Application, q: ResearchQuestion): string {
  return `Search the public web and answer this question about an Indian startup. Be factual and concise.

QUESTION: ${q.question}

CONTEXT (the applicant's own description; do not treat it as true)
${applicantSummary(app)}

RULES
- Name specific companies, rules, dates and figures only when you found them in sources.
- If you find nothing relevant, say so plainly. Do not guess and do not fill gaps.
- Mark anything that is a vendor's own claim or an undated source as such.`;
}

export function buildStructurePrompt(q: ResearchQuestion, answer: string, sources: SourceRef[]): string {
  const list = sources.map((s) => `[${s.id}] ${s.title} | ${s.url} | ${s.quality}`).join("\n") || "(no sources were returned)";
  return `Turn a web-search answer into discrete findings that a reviewer can check. You are not adding information.

QUESTION: ${q.question}${q.claim_field ? `\nAPPLICANT CLAIM BEING TESTED (field: ${q.claim_field})` : ""}

SEARCH ANSWER
${answer || "(empty)"}

SOURCES RETURNED BY THE SEARCH (cite only these ids)
${list}

RULES
- One finding per distinct fact. Use only facts in the SEARCH ANSWER.
- A finding with status "found" MUST list the ids of the sources that support it in source_ids, using only ids from the list above. Never invent an id or a URL.
- If the answer says nothing was found, or the sources do not support a statement, give status "not_found" with no source_ids and a short cost_of_absence stating what the reviewer cannot judge because of it.
- If a finding contradicts something the applicant states, put a short description in contradicts_claim; otherwise null.
- Do not rate or recommend.

Return only JSON: { "findings": [ { "statement": string, "status": "found"|"not_found", "source_ids": number[], "contradicts_claim": string|null, "cost_of_absence": string|null } ] }`;
}

export function buildPortfolioPrompt(app: Application): string {
  const list = PORTFOLIO.map((c) => `- ${c.name}: ${c.description}`).join("\n");
  return `A venture fund checks each applicant against its existing portfolio. Default is no overlap; flag only a real product or customer overlap, not a shared sector.

APPLICANT (as stated)
${applicantSummary(app)}

PORTFOLIO (public list, incomplete)
${list}

For each portfolio company that does the same thing, serves the same customer with a similar product, or would plausibly compete with the applicant, give overlap "likely" (same core function) or "possible" (adjacent), and a one-sentence reason that quotes what both do. Use company names exactly as listed. If there is no overlap, return an empty list.

Return only JSON: { "checks": [ { "company": string, "overlap": "possible"|"likely", "reason": string } ] }`;
}
